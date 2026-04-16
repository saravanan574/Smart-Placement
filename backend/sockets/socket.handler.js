const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const Community = require('../models/Community.model')
const Message = require('../models/Message.model')
const Notification = require('../models/Notification.model')

// ---------------------------------------------------------------------------
// In-memory tracking
// ---------------------------------------------------------------------------

// userId → Set of socketIds (one user can have multiple tabs open)
const onlineUsers = new Map()

// socketId → userId (reverse lookup for disconnect)
const socketUserMap = new Map()

// communityId → Set of userIds currently viewing
const communityViewers = new Map()

// socketId → { userId, communityId } (for typing cleanup on disconnect)
const typingMap = new Map()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const addOnlineUser = (userId, socketId) => {
  const id = userId.toString()
  if (!onlineUsers.has(id)) onlineUsers.set(id, new Set())
  onlineUsers.get(id).add(socketId)
  socketUserMap.set(socketId, id)
}

const removeOnlineUser = (socketId) => {
  const userId = socketUserMap.get(socketId)
  if (!userId) return null
  socketUserMap.delete(socketId)
  const sockets = onlineUsers.get(userId)
  if (sockets) {
    sockets.delete(socketId)
    if (sockets.size === 0) onlineUsers.delete(userId)
  }
  return userId
}

const isOnline = (userId) => onlineUsers.has(userId.toString())

const getSocketIdsForUser = (userId) => {
  return [...(onlineUsers.get(userId.toString()) || [])]
}

// ---------------------------------------------------------------------------
// JWT Auth middleware for socket connections
// ---------------------------------------------------------------------------

const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication token missing'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select(
      '_id name loginEmail profilePicture'
    )

    if (!user) {
      return next(new Error('User not found'))
    }

    socket.userId = user._id.toString()
    socket.user = {
      _id: user._id,
      name: user.name,
      loginEmail: user.loginEmail,
      profilePicture: user.profilePicture || null
    }

    next()
  } catch (error) {
    console.error('Socket auth error:', error.message)
    next(new Error('Invalid or expired token'))
  }
}

// ---------------------------------------------------------------------------
// Main socket handler — called once per connection
// ---------------------------------------------------------------------------

const initSocketHandler = (io) => {
  // Apply auth middleware to all socket connections
  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    const userId = socket.userId
    addOnlineUser(userId, socket.id)

    console.log(`Socket connected: ${socket.id} (user: ${userId})`)

    // Emit unread notification count on connect
    sendUnreadCount(socket)

    // -----------------------------------------------------------------------
    // COMMUNITY EVENTS
    // -----------------------------------------------------------------------

    // Join a community room
    socket.on('joinCommunity', async ({ communityId }) => {
      try {
        if (!communityId) return

        // Verify user is a member of this community
        const community = await Community.findById(communityId).select('members')
        if (!community) return

        const isMember = community.members.some(
          (m) => m.toString() === userId
        )
        if (!isMember) return

        const room = `community:${communityId}`
        socket.join(room)

        // Track viewer
        if (!communityViewers.has(communityId)) {
          communityViewers.set(communityId, new Set())
        }
        communityViewers.get(communityId).add(userId)

        // Notify others in room that this user is online
        socket.to(room).emit('userJoinedCommunity', {
          communityId,
          userId,
          name: socket.user.name
        })
      } catch (error) {
        console.error('joinCommunity error:', error.message)
      }
    })

    // Leave a community room
    socket.on('leaveCommunity', ({ communityId }) => {
      if (!communityId) return

      const room = `community:${communityId}`
      socket.leave(room)

      // Remove from viewers
      if (communityViewers.has(communityId)) {
        communityViewers.get(communityId).delete(userId)
        if (communityViewers.get(communityId).size === 0) {
          communityViewers.delete(communityId)
        }
      }

      // Stop typing if was typing
      handleStopTypingCleanup(socket, communityId, io)

      socket.to(room).emit('userLeftCommunity', {
        communityId,
        userId,
        name: socket.user.name
      })
    })

    // Send a message to a community
    // NOTE: actual DB save happens via HTTP — socket only broadcasts
    // Frontend calls communityAPI.sendTextMessage() → HTTP → controller saves →
    // controller calls io.to(room).emit('communityMessage', savedMessage)
    // This event is for real-time relay from backend controller (not client)

    // -----------------------------------------------------------------------
    // TYPING INDICATORS
    // -----------------------------------------------------------------------

    socket.on('typing', ({ communityId }) => {
      if (!communityId) return

      const room = `community:${communityId}`

      // Track typing state for cleanup on disconnect
      typingMap.set(socket.id, { userId, communityId })

      socket.to(room).emit('userTyping', {
        communityId,
        userId,
        name: socket.user.name
      })
    })

    socket.on('stopTyping', ({ communityId }) => {
      if (!communityId) return

      typingMap.delete(socket.id)

      const room = `community:${communityId}`
      socket.to(room).emit('userStoppedTyping', {
        communityId,
        userId
      })
    })

    // -----------------------------------------------------------------------
    // DIRECT MESSAGES
    // -----------------------------------------------------------------------

    // Real-time DM delivery
    // Called from community.controller.js after saving DM to DB
    // Usage: io.to(targetSocketId).emit('directMessage', messageData)
    // This is backend-emitted — no client event needed here

    // Client can also request DM delivery confirmation
    socket.on('dmSent', ({ targetUserId, message }) => {
      if (!targetUserId || !message) return

      // Deliver to all open sockets of target user
      const targetSocketIds = getSocketIdsForUser(targetUserId)
      targetSocketIds.forEach((sid) => {
        io.to(sid).emit('directMessage', {
          ...message,
          isNew: true
        })
      })
    })

    // -----------------------------------------------------------------------
    // NOTIFICATIONS
    // -----------------------------------------------------------------------

    // Reset unread notification count (called when user opens notification panel)
    socket.on('resetUnreadCount', async () => {
      try {
        await Notification.updateMany(
          { userId, isRead: false },
          { $set: { isRead: true } }
        )
        socket.emit('unreadNotificationCount', { count: 0 })
      } catch (error) {
        console.error('resetUnreadCount error:', error.message)
      }
    })

    // -----------------------------------------------------------------------
    // SYNC PROGRESS (emitted from email controller during sync)
    // Usage: io.to(userRoom).emit('syncProgress', { current, total, company })
    // userRoom = `user:${userId}`
    // -----------------------------------------------------------------------

    // Join personal room for sync progress and targeted notifications
    socket.join(`user:${userId}`)

    // -----------------------------------------------------------------------
    // DISCONNECT
    // -----------------------------------------------------------------------

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${userId})`)

      // Clean up typing indicators
      const typingState = typingMap.get(socket.id)
      if (typingState) {
        handleStopTypingCleanup(socket, typingState.communityId, io)
        typingMap.delete(socket.id)
      }

      // Remove from community viewers
      communityViewers.forEach((viewers, communityId) => {
        if (viewers.has(userId)) {
          // Check if user still has other sockets in this room
          const otherSockets = getSocketIdsForUser(userId).filter(
            (sid) => sid !== socket.id
          )
          const stillInRoom = otherSockets.some((sid) => {
            const s = io.sockets.sockets.get(sid)
            return s && s.rooms.has(`community:${communityId}`)
          })

          if (!stillInRoom) {
            viewers.delete(userId)
            if (viewers.size === 0) communityViewers.delete(communityId)

            socket.to(`community:${communityId}`).emit('userLeftCommunity', {
              communityId,
              userId,
              name: socket.user.name
            })
          }
        }
      })

      // Remove from online users
      removeOnlineUser(socket.id)
    })
  })
}

// ---------------------------------------------------------------------------
// Helper: stop typing cleanup (used on leaveCommunity and disconnect)
// ---------------------------------------------------------------------------

const handleStopTypingCleanup = (socket, communityId, io) => {
  if (!communityId) return
  const room = `community:${communityId}`
  socket.to(room).emit('userStoppedTyping', {
    communityId,
    userId: socket.userId
  })
}

// ---------------------------------------------------------------------------
// Helper: send unread notification count to a socket on connect
// ---------------------------------------------------------------------------

const sendUnreadCount = async (socket) => {
  try {
    const count = await Notification.countDocuments({
      userId: socket.userId,
      isRead: false
    })
    socket.emit('unreadNotificationCount', { count })
  } catch (error) {
    console.error('sendUnreadCount error:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Exported helpers — used by controllers to emit events
// ---------------------------------------------------------------------------

// Emit a new community message to all members of the room
// Called from community.controller.js after saving message
const emitCommunityMessage = (io, communityId, message) => {
  io.to(`community:${communityId}`).emit('communityMessage', message)
}

// Emit a DM to a specific user (all their open tabs)
// Called from community.controller.js after saving DM
const emitDirectMessage = (io, targetUserId, message) => {
  io.to(`user:${targetUserId}`).emit('directMessage', {
    ...message,
    isNew: true
  })
}

// Emit a notification to a specific user
// Called from any controller that creates a Notification document
const emitNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('newNotification', notification)
}

// Bump unread notification count for a user
// Called after creating a new Notification document
const incrementUnreadCount = async (io, userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    })
    io.to(`user:${userId}`).emit('unreadNotificationCount', { count })
  } catch (error) {
    console.error('incrementUnreadCount error:', error.message)
  }
}

// Emit sync progress to the user who triggered the sync
// Called from email.controller.js inside the sync loop
// Usage: emitSyncProgress(io, userId, { current: 3, total: 47, company: 'TCS' })
const emitSyncProgress = (io, userId, progress) => {
  io.to(`user:${userId}`).emit('syncProgress', progress)
}

// Check if a user is currently online
const checkOnline = (userId) => isOnline(userId)

module.exports = {
  initSocketHandler,
  emitCommunityMessage,
  emitDirectMessage,
  emitNotification,
  incrementUnreadCount,
  emitSyncProgress,
  checkOnline
}