const Community = require('../models/Community.model')
const Message = require('../models/Message.model')
const User = require('../models/User.model')
const { sendSuccess, sendError } = require('../utils/responseHelper')

// GET /api/community/suggestions
const getSuggestions = async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId)
    if (!user) return sendError(res, 'User not found', 404)

    // Find communities user is NOT a member of
    const suggestions = await Community.find({
      members: { $nin: [userId] },
      visibility: 'public'
    })
      .populate('createdBy', 'name department')
      .populate('members', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return sendSuccess(res, { suggestions }, 'Suggestions fetched successfully')
  } catch (error) {
    console.error('Get suggestions error:', error.message)
    return sendError(res, 'Failed to fetch suggestions', 500)
  }
}

// GET /api/community/dm/:userId
const getDMConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id
    const otherUserId = req.params.userId
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    const messages = await Message.find({
      isPrivate: true,
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name registerNumber department')
      .populate('recipientId', 'name registerNumber department')
      .lean()

    // Mark messages as read
    await Message.updateMany(
      {
        isPrivate: true,
        senderId: otherUserId,
        recipientId: currentUserId,
        isRead: false
      },
      { isRead: true }
    )

    const total = await Message.countDocuments({
      isPrivate: true,
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId }
      ]
    })

    return sendSuccess(
      res,
      {
        messages: messages.reverse(),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'DM conversation fetched successfully'
    )
  } catch (error) {
    console.error('Get DM conversation error:', error.message)
    return sendError(res, 'Failed to fetch DM conversation', 500)
  }
}

// POST /api/community/dm/:userId
const sendDM = async (req, res) => {
  try {
    const senderId = req.user._id
    const recipientId = req.params.userId
    const { content, messageType = 'text' } = req.body

    if (!content && messageType === 'text') {
      return sendError(res, 'Message content is required', 400)
    }

    const recipient = await User.findById(recipientId)
    if (!recipient) {
      return sendError(res, 'Recipient not found', 404)
    }

    const message = await Message.create({
      senderId,
      recipientId,
      content,
      messageType,
      isPrivate: true
    })

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name registerNumber department')
      .populate('recipientId', 'name registerNumber department')
      .lean()

    return sendSuccess(
      res,
      { message: populatedMessage },
      'DM sent successfully',
      201
    )
  } catch (error) {
    console.error('Send DM error:', error.message)
    return sendError(res, 'Failed to send DM', 500)
  }
}

// GET /api/community
const getCommunities = async (req, res) => {
  try {
    const userId = req.user._id

    const communities = await Community.find({
      members: userId
    })
      .populate('createdBy', 'name')
      .populate('members', 'name department')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean()

    // Get last message and unread count for each community
    const communitiesWithMeta = await Promise.all(
      communities.map(async (community) => {
        const lastMessage = await Message.findOne({
          communityId: community._id
        })
          .sort({ createdAt: -1 })
          .populate('senderId', 'name')
          .lean()

        const unreadCount = await Message.countDocuments({
          communityId: community._id,
          senderId: { $ne: userId },
          isRead: false
        })

        return {
          ...community,
          lastMessage,
          unreadCount
        }
      })
    )

    return sendSuccess(
      res,
      { communities: communitiesWithMeta },
      'Communities fetched successfully'
    )
  } catch (error) {
    console.error('Get communities error:', error.message)
    return sendError(res, 'Failed to fetch communities', 500)
  }
}

// POST /api/community
const createCommunity = async (req, res) => {
  try {
    const userId = req.user._id
    const { name, description, category, visibility, companyName } = req.body

    if (!name) {
      return sendError(res, 'Community name is required', 400)
    }

    const community = await Community.create({
      name,
      description: description || '',
      category: category || 'general',
      visibility: visibility || 'public',
      companyName: companyName || null,
      createdBy: userId,
      members: [userId],
      admins: [userId]
    })

    const populatedCommunity = await Community.findById(community._id)
      .populate('createdBy', 'name')
      .populate('members', 'name department')
      .lean()

    return sendSuccess(
      res,
      { community: populatedCommunity },
      'Community created successfully',
      201
    )
  } catch (error) {
    console.error('Create community error:', error.message)
    return sendError(res, 'Failed to create community', 500)
  }
}

// GET /api/community/:id
const getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('createdBy', 'name registerNumber department')
      .populate('members', 'name registerNumber department')
      .populate('admins', 'name registerNumber')
      .populate({
        path: 'pinnedMessages',
        populate: { path: 'senderId', select: 'name' }
      })
      .lean()

    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    return sendSuccess(res, { community }, 'Community fetched successfully')
  } catch (error) {
    console.error('Get community by id error:', error.message)
    return sendError(res, 'Failed to fetch community', 500)
  }
}

// GET /api/community/:id/messages
const getCommunityMessages = async (req, res) => {
  try {
    const communityId = req.params.id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    const community = await Community.findById(communityId)
    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    const total = await Message.countDocuments({
      communityId,
      isPrivate: false
    })

    const messages = await Message.find({
      communityId,
      isPrivate: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name registerNumber department')
      .lean()

    // Mark messages as read
    await Message.updateMany(
      {
        communityId,
        senderId: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    )

    return sendSuccess(
      res,
      {
        messages: messages.reverse(),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Messages fetched successfully'
    )
  } catch (error) {
    console.error('Get community messages error:', error.message)
    return sendError(res, 'Failed to fetch messages', 500)
  }
}

// POST /api/community/:id/messages
const sendMessage = async (req, res) => {
  try {
    const communityId = req.params.id
    const senderId = req.user._id
    const { content, messageType = 'text' } = req.body

    const community = await Community.findById(communityId)
    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    // Check if user is a member
    const isMember = community.members.some(
      (m) => m.toString() === senderId.toString()
    )
    if (!isMember) {
      return sendError(res, 'You are not a member of this community', 403)
    }

    let fileUrl = null
    let fileName = null
    let fileMimeType = null
    let detectedType = messageType

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`
      fileName = req.file.originalname
      fileMimeType = req.file.mimetype
      detectedType = req.file.mimetype.startsWith('image/') ? 'image' : 'file'
    }

    if (!content && !fileUrl) {
      return sendError(res, 'Message content or file is required', 400)
    }

    const message = await Message.create({
      communityId,
      senderId,
      content: content || null,
      messageType: detectedType,
      fileUrl,
      fileName,
      fileMimeType,
      isPrivate: false
    })

    // Update community lastMessageAt
    community.lastMessageAt = new Date()
    await community.save()

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name registerNumber department')
      .lean()

    // Emit socket event to room
    if (req.app.get('io')) {
      req.app.get('io').to(communityId).emit('new_message', {
        message: populatedMessage,
        communityId
      })
    }

    return sendSuccess(
      res,
      { message: populatedMessage },
      'Message sent successfully',
      201
    )
  } catch (error) {
    console.error('Send message error:', error.message)
    return sendError(res, 'Failed to send message', 500)
  }
}

// POST /api/community/:id/join
const joinCommunity = async (req, res) => {
  try {
    const userId = req.user._id
    const community = await Community.findById(req.params.id)

    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    if (community.visibility === 'private') {
      return sendError(res, 'This community is private', 403)
    }

    const isMember = community.members.some(
      (m) => m.toString() === userId.toString()
    )
    if (isMember) {
      return sendError(res, 'Already a member of this community', 400)
    }

    community.members.push(userId)
    await community.save()

    const populatedCommunity = await Community.findById(community._id)
      .populate('createdBy', 'name')
      .populate('members', 'name department')
      .lean()

    return sendSuccess(
      res,
      { community: populatedCommunity },
      'Joined community successfully'
    )
  } catch (error) {
    console.error('Join community error:', error.message)
    return sendError(res, 'Failed to join community', 500)
  }
}

// POST /api/community/:id/leave
const leaveCommunity = async (req, res) => {
  try {
    const userId = req.user._id
    const community = await Community.findById(req.params.id)

    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    const isMember = community.members.some(
      (m) => m.toString() === userId.toString()
    )
    if (!isMember) {
      return sendError(res, 'You are not a member of this community', 400)
    }

    community.members = community.members.filter(
      (m) => m.toString() !== userId.toString()
    )
    community.admins = community.admins.filter(
      (a) => a.toString() !== userId.toString()
    )
    await community.save()

    return sendSuccess(res, {}, 'Left community successfully')
  } catch (error) {
    console.error('Leave community error:', error.message)
    return sendError(res, 'Failed to leave community', 500)
  }
}

// POST /api/community/:id/pin/:messageId
const pinMessage = async (req, res) => {
  try {
    const userId = req.user._id
    const { id: communityId, messageId } = req.params

    const community = await Community.findById(communityId)
    if (!community) {
      return sendError(res, 'Community not found', 404)
    }

    // Check if user is admin
    const isAdmin = community.admins.some(
      (a) => a.toString() === userId.toString()
    )
    if (!isAdmin) {
      return sendError(res, 'Only admins can pin messages', 403)
    }

    const message = await Message.findById(messageId)
    if (!message) {
      return sendError(res, 'Message not found', 404)
    }

    const alreadyPinned = community.pinnedMessages.some(
      (p) => p.toString() === messageId
    )
    if (alreadyPinned) {
      // Unpin if already pinned
      community.pinnedMessages = community.pinnedMessages.filter(
        (p) => p.toString() !== messageId
      )
      message.isPinned = false
    } else {
      community.pinnedMessages.push(messageId)
      message.isPinned = true
    }

    await community.save()
    await message.save()

    return sendSuccess(
      res,
      { isPinned: message.isPinned },
      message.isPinned ? 'Message pinned successfully' : 'Message unpinned successfully'
    )
  } catch (error) {
    console.error('Pin message error:', error.message)
    return sendError(res, 'Failed to pin message', 500)
  }
}

module.exports = {
  getSuggestions,
  getDMConversation,
  sendDM,
  getCommunities,
  createCommunity,
  getCommunityById,
  getCommunityMessages,
  sendMessage,
  joinCommunity,
  leaveCommunity,
  pinMessage
}