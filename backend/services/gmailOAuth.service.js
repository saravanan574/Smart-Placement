const { google } = require('googleapis')
const oauth2Client = require('../config/googleOAuth.config')
const User = require('../models/User.model')

// Get Gmail OAuth URL
const getAuthUrl = (userId) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: userId
  })

  return url
}

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error('Exchange code for tokens error:', error.message)
    throw new Error('Failed to exchange authorization code for tokens')
  }
}

// Save tokens to existing user (identified by userId from state param)
const saveTokensToUser = async (userId, tokens) => {
  try {
    // Get user email from Google
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    const user = await User.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    user.googleAccount.email = data.email
    user.googleAccount.accessToken = tokens.access_token
    user.googleAccount.refreshToken = tokens.refresh_token || user.googleAccount.refreshToken
    user.googleAccount.isConnected = true

    await user.save()

    return user
  } catch (error) {
    console.error('Save tokens to user error:', error.message)
    throw new Error('Failed to save Google tokens to user')
  }
}

// Get authenticated Gmail client for a user
const getAuthenticatedClient = async (userId) => {
  try {
    const user = await User.findById(userId).select(
      '+googleAccount.accessToken +googleAccount.refreshToken'
    )

    if (!user || !user.googleAccount.isConnected) {
      throw new Error('Gmail account not connected')
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    client.setCredentials({
      access_token: user.googleAccount.accessToken,
      refresh_token: user.googleAccount.refreshToken
    })

    // Handle token refresh
    client.on('tokens', async (newTokens) => {
      try {
        if (newTokens.access_token) {
          await User.findByIdAndUpdate(userId, {
            'googleAccount.accessToken': newTokens.access_token
          })
          console.log('Access token refreshed for user:', userId)
        }
        if (newTokens.refresh_token) {
          await User.findByIdAndUpdate(userId, {
            'googleAccount.refreshToken': newTokens.refresh_token
          })
        }
      } catch (err) {
        console.error('Token refresh save error:', err.message)
      }
    })

    return client
  } catch (error) {
    console.error('Get authenticated client error:', error.message)
    throw error
  }
}

// Parse a Gmail message into our Email model structure
const parseGmailMessage = (message, userId) => {
  try {
    const headers = message.payload.headers || []

    const getHeader = (name) => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase()
      )
      return header ? header.value : null
    }

    const subjectRaw = getHeader('Subject') || '(No Subject)'
    const fromRaw = getHeader('From') || ''
    const toRaw = getHeader('To') || ''
    const dateRaw = getHeader('Date')

    // Parse From header into {email, name}
    const parseEmailAddress = (raw) => {
      if (!raw) return { email: '', name: '' }
      const match = raw.match(/^(.*?)\s*<(.+?)>$/)
      if (match) {
        return {
          name: match[1].trim().replace(/^"|"$/g, ''),
          email: match[2].trim().toLowerCase()
        }
      }
      return { email: raw.trim().toLowerCase(), name: '' }
    }

    // Parse To header (can be multiple)
    const parseToAddresses = (raw) => {
      if (!raw) return []
      return raw.split(',').map((addr) => parseEmailAddress(addr.trim()))
    }

    // Recursively extract body parts
    const extractBody = (part, mimeType) => {
      if (!part) return null

      if (part.mimeType === mimeType && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }

      if (part.parts && part.parts.length > 0) {
        for (const subPart of part.parts) {
          const result = extractBody(subPart, mimeType)
          if (result) return result
        }
      }

      return null
    }

    // Recursively extract attachments
    const extractAttachments = (part, attachments = []) => {
      if (!part) return attachments

      if (part.filename && part.filename.length > 0) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body ? part.body.size || 0 : 0,
          attachmentId: part.body ? part.body.attachmentId || null : null
        })
      }

      if (part.parts && part.parts.length > 0) {
        for (const subPart of part.parts) {
          extractAttachments(subPart, attachments)
        }
      }

      return attachments
    }

    const textBody = extractBody(message.payload, 'text/plain')
    const htmlBody = extractBody(message.payload, 'text/html')
    const attachments = extractAttachments(message.payload)

    const parsedDate = dateRaw ? new Date(dateRaw) : new Date()
    const safeDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate

    return {
      userId,
      messageId: message.id,
      threadId: message.threadId || null,
      subject: subjectRaw,
      from: parseEmailAddress(fromRaw),
      to: parseToAddresses(toRaw),
      date: safeDate,
      snippet: message.snippet || null,
      textBody: textBody || null,
      htmlBody: htmlBody || null,
      attachments
    }
  } catch (error) {
    console.error('Parse Gmail message error:', error.message)
    return null
  }
}

// Fetch emails from Gmail
const fetchEmails = async (userId, maxResults = 50) => {
  try {
    const authClient = await getAuthenticatedClient(userId)
    const gmail = google.gmail({ version: 'v1', auth: authClient })

    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    // Build query based on last sync
    let query = ''
    if (!user.googleAccount.lastSyncedAt) {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const yyyy = ninetyDaysAgo.getFullYear()
      const mm = String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')
      const dd = String(ninetyDaysAgo.getDate()).padStart(2, '0')
      query = `after:${yyyy}/${mm}/${dd}`
    } else {
      const lastSync = new Date(user.googleAccount.lastSyncedAt)
      const yyyy = lastSync.getFullYear()
      const mm = String(lastSync.getMonth() + 1).padStart(2, '0')
      const dd = String(lastSync.getDate()).padStart(2, '0')
      query = `after:${yyyy}/${mm}/${dd}`
    }

    // List messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    })

    const messageList = listResponse.data.messages || []
    if (messageList.length === 0) {
      // Update lastSyncedAt even if no messages
      await User.findByIdAndUpdate(userId, {
        'googleAccount.lastSyncedAt': new Date()
      })
      return []
    }

    // Fetch full message details
    const parsedEmails = []
    for (const msg of messageList) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
        const parsed = parseGmailMessage(fullMessage.data, userId)
        if (parsed) {
          parsedEmails.push(parsed)
        }
      } catch (err) {
        console.error(`Failed to fetch message ${msg.id}:`, err.message)
        continue
      }
    }

    // Update lastSyncedAt
    await User.findByIdAndUpdate(userId, {
      'googleAccount.lastSyncedAt': new Date()
    })

    return parsedEmails
  } catch (error) {
    console.error('Fetch emails error:', error.message)
    throw error
  }
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  saveTokensToUser,
  getAuthenticatedClient,
  fetchEmails,
  parseGmailMessage
}