const User = require('../models/User.model')
const gmailPushService = require('../services/gmailPush.service')
const emailProcessingService = require('../services/emailProcessing.service')
const mlIntegrationService = require('../services/mlIntegration.service')

// ---------------------------------------------------------------------------
// POST /api/webhook/gmail
//
// Called by Google Cloud Pub/Sub when a new email arrives in any
// connected student's Gmail inbox.
//
// NO auth middleware on this route — Google calls it directly.
// Security: verified by GMAIL_WEBHOOK_SECRET in query param.
//
// Pub/Sub message format:
// {
//   "message": {
//     "data": "<base64 encoded JSON>",   ← { emailAddress, historyId }
//     "messageId": "...",
//     "publishTime": "..."
//   },
//   "subscription": "projects/.../subscriptions/..."
// }
// ---------------------------------------------------------------------------

const handleGmailPush = async (req, res) => {
  // Always respond 200 immediately — Pub/Sub retries if it gets non-2xx
  // We acknowledge first, then process asynchronously
  res.status(200).json({ received: true })

  try {
    // Verify webhook secret — basic security to reject non-Google calls
    const secret = req.query.secret || req.headers['x-webhook-secret']
    if (process.env.GMAIL_WEBHOOK_SECRET && secret !== process.env.GMAIL_WEBHOOK_SECRET) {
      console.warn('Webhook: invalid secret — request rejected')
      return
    }

    // Decode Pub/Sub message
    const message = req.body?.message
    if (!message || !message.data) {
      console.warn('Webhook: no message data in request body')
      return
    }

    let pushData
    try {
      const decoded = Buffer.from(message.data, 'base64').toString('utf-8')
      pushData = JSON.parse(decoded)
    } catch (decodeErr) {
      console.error('Webhook: failed to decode Pub/Sub message:', decodeErr.message)
      return
    }

    // pushData = { emailAddress: "student@gmail.com", historyId: "12345" }
    const { emailAddress, historyId: newHistoryId } = pushData

    if (!emailAddress || !newHistoryId) {
      console.warn('Webhook: missing emailAddress or historyId in push data')
      return
    }

    // Find the user who owns this Gmail address
    const user = await User.findOne({
      'googleAccount.email':       emailAddress,
      'googleAccount.isConnected': true
    })

    if (!user) {
      // Email not linked to any SPEI user — silently ignore
      return
    }

    const startHistoryId = user.gmailHistoryId || newHistoryId

    // Fetch only new emails since last processed historyId
    const { emails, needsFullSync } = await gmailPushService.getNewEmailsByHistory(
      user._id,
      startHistoryId
    )

    if (needsFullSync) {
      // historyId too old — schedule a full sync but don't block webhook response
      console.log(`Webhook: historyId expired for ${emailAddress} — triggering full sync`)
      triggerFullSyncAsync(user)
      return
    }

    if (!emails || emails.length === 0) {
      return
    }

    // Check ML service is up before processing
    const mlHealthy = await mlIntegrationService.checkMLHealth()
    if (!mlHealthy) {
      console.warn(`Webhook: ML service unavailable — skipping processing for ${emailAddress}`)
      return
    }

    // Get io from the app — used to emit syncProgress to frontend
    const io = req.app.get('io')

    // Process emails through the full pipeline (sequential, same as manual sync)
    const result = await emailProcessingService.saveEmails(emails, user, io)

    console.log(
      `Webhook: processed ${emails.length} new email(s) for ${emailAddress} — ` +
      `saved: ${result.saved}, shortlisted: ${result.shortlisted}`
    )

    // Emit sync complete to frontend via Socket.io
    if (io) {
      const { emitSyncProgress } = require('../sockets/socket.handler')
      emitSyncProgress(io, user._id.toString(), {
        current: emails.length,
        total:   emails.length,
        company: null,
        done:    true
      })
    }

  } catch (error) {
    // Never throw from webhook — Pub/Sub would retry endlessly
    console.error('Webhook handleGmailPush error:', error.message)
  }
}

// ---------------------------------------------------------------------------
// triggerFullSyncAsync — non-blocking full sync when historyId is stale
// Runs in background, does not block the webhook response
// ---------------------------------------------------------------------------
const triggerFullSyncAsync = async (user) => {
  try {
    const gmailOAuthService = require('../services/gmailOAuth.service')
    const mlIntegrationService = require('../services/mlIntegration.service')

    const mlHealthy = await mlIntegrationService.checkMLHealth()
    if (!mlHealthy) return

    const emails = await gmailOAuthService.fetchEmails(user._id)
    if (!emails || emails.length === 0) return

    await emailProcessingService.saveEmails(emails, user, null)
    console.log(`Full sync completed for ${user.googleAccount.email} — ${emails.length} emails processed`)
  } catch (err) {
    console.error('triggerFullSyncAsync error:', err.message)
  }
}

module.exports = { handleGmailPush }