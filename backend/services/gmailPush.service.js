const { google } = require('googleapis')
const User = require('../models/User.model')
const gmailOAuth = require('./gmailOAuth.service')

// ---------------------------------------------------------------------------
// Gmail Push Notifications via Google Cloud Pub/Sub
//
// How it works:
//  1. setupWatch(userId)     — subscribe a user's Gmail inbox to a Pub/Sub topic
//  2. When new email arrives — Google sends HTTP POST to /api/webhook/gmail
//  3. webhook.controller.js  — decodes notification, calls getNewEmailsByHistory()
//  4. getNewEmailsByHistory() — fetches only emails since last historyId
//  5. renewWatchForAllUsers() — cron job, called daily, renews expiring subscriptions
//
// Gmail Watch expires every 7 days — must renew before expiry
// ---------------------------------------------------------------------------

const PUBSUB_TOPIC = process.env.GOOGLE_PUBSUB_TOPIC
// e.g. projects/YOUR_PROJECT_ID/topics/gmail-push

// ---------------------------------------------------------------------------
// getOAuthClient — build authenticated OAuth2 client for a user
// ---------------------------------------------------------------------------
const getOAuthClient = async (userId) => {
  const user = await User.findById(userId).select(
    '+googleAccount.accessToken +googleAccount.refreshToken'
  )
  if (!user || !user.googleAccount?.isConnected) {
    throw new Error('User Gmail not connected')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token:  user.googleAccount.accessToken,
    refresh_token: user.googleAccount.refreshToken
  })

  // Auto-refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await User.findByIdAndUpdate(userId, {
        'googleAccount.accessToken': tokens.access_token
      })
    }
  })

  return { oauth2Client, user }
}

// ---------------------------------------------------------------------------
// setupWatch — subscribe user's Gmail to Pub/Sub topic
// Called:
//   1. After student connects Gmail (auth.controller.js)
//   2. By renewWatchForAllUsers() every 7 days
// ---------------------------------------------------------------------------
const setupWatch = async (userId) => {
  try {
    if (!PUBSUB_TOPIC) {
      console.warn('GOOGLE_PUBSUB_TOPIC not set — Gmail push sync disabled')
      return null
    }

    const { oauth2Client, user } = await getOAuthClient(userId)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName:  PUBSUB_TOPIC,
        labelIds:   ['INBOX'],
        labelFilterAction: 'include'
      }
    })

    const watchData = response.data
    // watchData.historyId — current historyId at time of watch setup
    // watchData.expiration — Unix timestamp in ms when watch expires

    const expiryDate = new Date(parseInt(watchData.expiration))

    // Save historyId and expiry to user record
    await User.findByIdAndUpdate(userId, {
      gmailHistoryId:    watchData.historyId,
      gmailWatchExpiry:  expiryDate
    })

    console.log(`Gmail Watch setup for user ${userId} — expires ${expiryDate.toISOString()}`)
    return watchData

  } catch (error) {
    console.error(`setupWatch error for user ${userId}:`, error.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// getNewEmailsByHistory — fetch emails received AFTER a given historyId
// Called by webhook.controller.js on every push notification
// Returns array of email message objects (same shape as gmailOAuth.service)
// ---------------------------------------------------------------------------
const getNewEmailsByHistory = async (userId, startHistoryId) => {
  try {
    const { oauth2Client, user } = await getOAuthClient(userId)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Fetch history since startHistoryId
    let historyResponse
    try {
      historyResponse = await gmail.users.history.list({
        userId:        'me',
        startHistoryId,
        historyTypes:  ['messageAdded'],
        labelId:       'INBOX'
      })
    } catch (historyError) {
      // historyId too old (> 30 days) — fall back to standard sync
      console.warn(`historyId expired for user ${userId} — will do standard sync`)
      return { emails: [], newHistoryId: null, needsFullSync: true }
    }

    const historyItems = historyResponse.data.history || []
    const newHistoryId = historyResponse.data.historyId || startHistoryId

    if (historyItems.length === 0) {
      // Update historyId even if no new messages
      await User.findByIdAndUpdate(userId, { gmailHistoryId: newHistoryId })
      return { emails: [], newHistoryId, needsFullSync: false }
    }

    // Collect all new message IDs from history
    const newMessageIds = new Set()
    for (const item of historyItems) {
      for (const msg of (item.messagesAdded || [])) {
        if (msg.message?.id) {
          newMessageIds.add(msg.message.id)
        }
      }
    }

    // Fetch full message details for each new message
    const emails = []
    for (const messageId of newMessageIds) {
      try {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id:     messageId,
          format: 'full'
        })

        const parsed = parseGmailMessage(msgResponse.data)
        if (parsed) emails.push(parsed)

      } catch (msgError) {
        console.error(`Failed to fetch message ${messageId}:`, msgError.message)
        continue
      }
    }

    // Update historyId AFTER successful processing — never before
    await User.findByIdAndUpdate(userId, { gmailHistoryId: newHistoryId })

    return { emails, newHistoryId, needsFullSync: false }

  } catch (error) {
    console.error(`getNewEmailsByHistory error for user ${userId}:`, error.message)
    return { emails: [], newHistoryId: null, needsFullSync: false }
  }
}

// ---------------------------------------------------------------------------
// parseGmailMessage — extract structured data from raw Gmail API message
// Same shape as what gmailOAuth.service returns during manual sync
// ---------------------------------------------------------------------------
const parseGmailMessage = (message) => {
  try {
    const headers = message.payload?.headers || []

    const getHeader = (name) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    const subject  = getHeader('Subject')
    const from     = getHeader('From')
    const dateStr  = getHeader('Date')
    const to       = getHeader('To')
    const date     = dateStr ? new Date(dateStr) : new Date()

    // Extract body text
    let textBody = ''
    let htmlBody = ''
    let snippet  = message.snippet || ''

    const extractBody = (parts) => {
      if (!parts) return
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textBody += Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlBody += Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.parts) {
          extractBody(part.parts)
        }
      }
    }

    if (message.payload?.body?.data) {
      // Single-part message
      const bodyData = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
      if (message.payload.mimeType === 'text/html') {
        htmlBody = bodyData
      } else {
        textBody = bodyData
      }
    } else if (message.payload?.parts) {
      extractBody(message.payload.parts)
    }

    // Strip HTML tags for plain text fallback
    if (!textBody && htmlBody) {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    return {
      messageId: message.id,
      threadId:  message.threadId,
      subject,
      sender:    from,
      recipient: to,
      date,
      textBody:  textBody.trim(),
      htmlBody:  htmlBody.trim(),
      snippet,
      labelIds:  message.labelIds || [],
      attachments: []  // attachment handling kept in gmailOAuth.service for full sync
    }

  } catch (error) {
    console.error('parseGmailMessage error:', error.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// stopWatch — unsubscribe Gmail Watch for a user
// Called when student disconnects Gmail from Profile page
// ---------------------------------------------------------------------------
const stopWatch = async (userId) => {
  try {
    const { oauth2Client } = await getOAuthClient(userId)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    await gmail.users.stop({ userId: 'me' })

    await User.findByIdAndUpdate(userId, {
      gmailHistoryId:   null,
      gmailWatchExpiry: null
    })

    console.log(`Gmail Watch stopped for user ${userId}`)
  } catch (error) {
    // Not critical — watch expires anyway after 7 days
    console.error(`stopWatch error for user ${userId}:`, error.message)
  }
}

// ---------------------------------------------------------------------------
// renewWatchForAllUsers — called by cron job in server.js daily at 3 AM
// Finds users whose Watch expires within 24 hours and renews it
// ---------------------------------------------------------------------------
const renewWatchForAllUsers = async () => {
  try {
    if (!PUBSUB_TOPIC) return

    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Find users with Gmail connected whose Watch is expiring soon
    const usersToRenew = await User.find({
      'googleAccount.isConnected': true,
      $or: [
        { gmailWatchExpiry: { $lte: in24Hours } },  // expiring within 24h
        { gmailWatchExpiry: null }                   // never set up
      ]
    }).select('_id')

    console.log(`Renewing Gmail Watch for ${usersToRenew.length} users`)

    for (const user of usersToRenew) {
      await setupWatch(user._id)
    }

  } catch (error) {
    console.error('renewWatchForAllUsers error:', error.message)
  }
}

// ---------------------------------------------------------------------------
// initWatchForAllUsers — called once on server.js startup
// Ensures all connected users have an active Gmail Watch
// ---------------------------------------------------------------------------
const initWatchForAllUsers = async () => {
  try {
    if (!PUBSUB_TOPIC) {
      console.warn('GOOGLE_PUBSUB_TOPIC not set — skipping Gmail Watch init')
      return
    }

    const connectedUsers = await User.find({
      'googleAccount.isConnected': true
    }).select('_id gmailWatchExpiry')

    const now = new Date()
    let initiated = 0

    for (const user of connectedUsers) {
      // Only setup if Watch is missing or already expired
      if (!user.gmailWatchExpiry || user.gmailWatchExpiry <= now) {
        await setupWatch(user._id)
        initiated++
      }
    }

    if (initiated > 0) {
      console.log(`Gmail Watch initiated for ${initiated} users on startup`)
    }
  } catch (error) {
    console.error('initWatchForAllUsers error:', error.message)
  }
}

module.exports = {
  setupWatch,
  stopWatch,
  getNewEmailsByHistory,
  renewWatchForAllUsers,
  initWatchForAllUsers,
  parseGmailMessage
}