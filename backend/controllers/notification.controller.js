const Notification = require('../models/Notification.model')
const { sendSuccess, sendError } = require('../utils/responseHelper')

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const total = await Notification.countDocuments({ userId })
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    })

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOpportunityId', 'companyName jobRole applicationStatus')
      .populate('relatedCommunityId', 'name companyName')
      .lean()

    return sendSuccess(
      res,
      {
        notifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      },
      'Notifications fetched successfully'
    )
  } catch (error) {
    console.error('Get notifications error:', error.message)
    return sendError(res, 'Failed to fetch notifications', 500)
  }
}

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    )

    return sendSuccess(res, {}, 'All notifications marked as read')
  } catch (error) {
    console.error('Mark all as read error:', error.message)
    return sendError(res, 'Failed to mark notifications as read', 500)
  }
}

// PUT /api/notifications/:id/read
const markOneAsRead = async (req, res) => {
  try {
    const userId = req.user._id
    const notificationId = req.params.id

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    })

    if (!notification) {
      return sendError(res, 'Notification not found', 404)
    }

    notification.isRead = true
    await notification.save()

    return sendSuccess(
      res,
      { notification },
      'Notification marked as read'
    )
  } catch (error) {
    console.error('Mark one as read error:', error.message)
    return sendError(res, 'Failed to mark notification as read', 500)
  }
}

module.exports = {
  getNotifications,
  markAllAsRead,
  markOneAsRead
}