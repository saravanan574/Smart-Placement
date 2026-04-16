const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const Message = require('../models/Message.model')
const Community = require('../models/Community.model')
const Notification = require('../models/Notification.model')

const initializeCommunitySocket = (io) => {
  // Middleware: verify JWT on every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await User.findById(decoded.id).select('-password')
      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      socket.userId = user._id.toString()
      socket.user = user
      next()
    } catch (error) {
      console.error('Socket auth error:', error.message)
      return next(new Error('Authentication error: Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId}`)

    // Join a community room
    socket.on('join_community', (communityId) => {
      try {
        if (!communityId) return
        socket.join(communityId)
        console.log(`User ${socket.userId} joined community room: ${communityId}`)
      } catch (error) {
        console.error('join_community error:', error.message)
      }
    })

    // Leave a community room
    socket.on('leave_community', (communityId) => {
      try {
        if (!communityId) return
        socket.leave(communityId)
        console.log(`User ${socket.userId} left community room: ${communityId}`)
      } catch (error) {
        console.error('leave_community error:', error.message)
      }
    })

    // Send a text message to a community
    socket.on(
      'send_message',
      async ({
        communityId,
        content,
        messageType = 'text',
        fileUrl = null,
        fileName = null
      }) => {
        try {
          if (!communityId) {
            socket.emit('error', { message: 'communityId is required' })
            return
          }

          if (!content && !fileUrl) {
            socket.emit('error', { message: 'Message content or file is required' })
            return
          }

          // Verify community exists and user is a member
          const community = await Community.findById(communityId)
          if (!community) {
            socket.emit('error', { message: 'Community not found' })
            return
          }

          const isMember = community.members.some(
            (m) => m.toString() === socket.userId
          )
          if (!isMember) {
            socket.emit('error', {
              message: 'You are not a member of this community'
            })
            return
          }

          // Save message to DB
          const message = await Message.create({
            communityId,
            senderId: socket.userId,
            content: content || null,
            messageType,
            fileUrl,
            fileName,
            isPrivate: false
          })

          // Update community lastMessageAt
          community.lastMessageAt = new Date()
          await community.save()

          // Populate sender details
          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name registerNumber department')
            .lean()

          // Broadcast to community room (excluding sender)
          socket.to(communityId).emit('new_message', {
            message: populatedMessage,
            communityId
          })

          // Confirm to sender
          socket.emit('message_sent', {
            message: populatedMessage,
            communityId
          })
        } catch (error) {
          console.error('send_message error:', error.message)
          socket.emit('error', { message: 'Failed to send message' })
        }
      }
    )

    // Send a direct message to another user
    socket.on(
      'send_dm',
      async ({
        recipientId,
        content,
        messageType = 'text',
        fileUrl = null,
        fileName = null
      }) => {
        try {
          if (!recipientId) {
            socket.emit('error', { message: 'recipientId is required' })
            return
          }

          if (!content && !fileUrl) {
            socket.emit('error', { message: 'Message content or file is required' })
            return
          }

          const recipient = await User.findById(recipientId)
          if (!recipient) {
            socket.emit('error', { message: 'Recipient not found' })
            return
          }

          // Save DM to DB
          const message = await Message.create({
            senderId: socket.userId,
            recipientId,
            content: content || null,
            messageType,
            fileUrl,
            fileName,
            isPrivate: true
          })

          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name registerNumber department')
            .populate('recipientId', 'name registerNumber department')
            .lean()

          // Find recipient's socket and emit new_dm event
          const recipientSockets = await io.fetchSockets()
          const recipientSocket = recipientSockets.find(
            (s) => s.userId === recipientId.toString()
          )

          if (recipientSocket) {
            recipientSocket.emit('new_dm', {
              message: populatedMessage
            })
          }

          // Confirm to sender
          socket.emit('dm_sent', {
            message: populatedMessage
          })
        } catch (error) {
          console.error('send_dm error:', error.message)
          socket.emit('error', { message: 'Failed to send DM' })
        }
      }
    )

    // Typing indicator
    socket.on('typing', ({ communityId }) => {
      try {
        if (!communityId) return

        // Emit to community room excluding sender
        socket.to(communityId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.name,
          communityId
        })
      } catch (error) {
        console.error('typing error:', error.message)
      }
    })

    // Stop typing indicator
    socket.on('stop_typing', ({ communityId }) => {
      try {
        if (!communityId) return
        socket.to(communityId).emit('user_stop_typing', {
          userId: socket.userId,
          communityId
        })
      } catch (error) {
        console.error('stop_typing error:', error.message)
      }
    })

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.userId} — reason: ${reason}`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error.message)
    })
  })
}

module.exports = initializeCommunitySocket