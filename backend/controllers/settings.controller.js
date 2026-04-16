// ============================================================
// backend/controllers/settings.controller.js
// ============================================================
const User = require('../models/User.model')
const bcrypt = require('bcryptjs')
const { sendSuccess, sendError } = require('../utils/responseHelper')
const gmailPushService = require('../services/gmailPush.service')

// PUT /api/settings/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', 400)
    }
    if (newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters', 400)
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return sendError(res, 'User not found', 404)

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) return sendError(res, 'Current password is incorrect', 400)

    user.password = newPassword  // pre-save hook hashes it
    await user.save()

    return sendSuccess(res, {}, 'Password changed successfully')
  } catch (error) {
    console.error('changePassword error:', error.message)
    return sendError(res, 'Failed to change password', 500)
  }
}

// PUT /api/settings/contact
// Update personalEmail and/or whatsappNumber
const updateContact = async (req, res) => {
  try {
    const { personalEmail, whatsappNumber } = req.body
    const update = {}

    if (personalEmail !== undefined) {
      update.personalEmail = personalEmail ? personalEmail.toLowerCase().trim() : null
    }
    if (whatsappNumber !== undefined) {
      // Basic format: must start with + and have 10-15 digits
      if (whatsappNumber && !/^\+\d{10,15}$/.test(whatsappNumber.trim())) {
        return sendError(res, 'WhatsApp number must be in format +919876543210', 400)
      }
      update.whatsappNumber = whatsappNumber ? whatsappNumber.trim() : null
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select('-password')

    return sendSuccess(res, { user }, 'Contact details updated successfully')
  } catch (error) {
    console.error('updateContact error:', error.message)
    return sendError(res, 'Failed to update contact details', 500)
  }
}

// PUT /api/settings/notifications
// Update notifEmail, notifWhatsApp toggle flags
const updateNotifications = async (req, res) => {
  try {
    const {
      notifEmail,
      notifWhatsApp,
      // Per-event toggles stored in notifPreferences subdoc
      notifShortlist,
      notifOffer,
      notifDeadline,
      notifRejected,
      notifNewMatch
    } = req.body

    const update = {}
    if (notifEmail     !== undefined) update.notifEmail     = Boolean(notifEmail)
    if (notifWhatsApp  !== undefined) update.notifWhatsApp  = Boolean(notifWhatsApp)

    // Per-event prefs stored as a nested object
    const prefs = {}
    if (notifShortlist !== undefined) prefs['notifPreferences.shortlist'] = Boolean(notifShortlist)
    if (notifOffer     !== undefined) prefs['notifPreferences.offer']     = Boolean(notifOffer)
    if (notifDeadline  !== undefined) prefs['notifPreferences.deadline']  = Boolean(notifDeadline)
    if (notifRejected  !== undefined) prefs['notifPreferences.rejected']  = Boolean(notifRejected)
    if (notifNewMatch  !== undefined) prefs['notifPreferences.newMatch']  = Boolean(notifNewMatch)

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...update, ...prefs } },
      { new: true }
    ).select('-password')

    return sendSuccess(res, { user }, 'Notification preferences updated')
  } catch (error) {
    console.error('updateNotifications error:', error.message)
    return sendError(res, 'Failed to update notification preferences', 500)
  }
}

// POST /api/settings/gmail/disconnect
const disconnectGmail = async (req, res) => {
  try {
    // Stop active Gmail Watch first
    await gmailPushService.stopWatch(req.user._id)

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'googleAccount.isConnected':  false,
        'googleAccount.accessToken':  null,
        'googleAccount.refreshToken': null,
        'googleAccount.email':        null,
        'googleAccount.lastSyncedAt': null,
        gmailHistoryId:               null,
        gmailWatchExpiry:             null
      }
    })

    return sendSuccess(res, {}, 'Gmail disconnected successfully')
  } catch (error) {
    console.error('disconnectGmail error:', error.message)
    return sendError(res, 'Failed to disconnect Gmail', 500)
  }
}

// DELETE /api/settings/account
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return sendError(res, 'Password is required to delete account', 400)

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return sendError(res, 'User not found', 404)

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return sendError(res, 'Incorrect password', 400)

    // Stop Gmail Watch
    try { await gmailPushService.stopWatch(req.user._id) } catch (_) {}

    // Delete all user data
    const Email       = require('../models/Email.model')
    const Opportunity = require('../models/Opportunity.model')
    const Notification = require('../models/Notification.model')

    await Promise.all([
      Email.deleteMany({ userId: req.user._id }),
      Opportunity.deleteMany({ userId: req.user._id }),
      Notification.deleteMany({ userId: req.user._id }),
      User.findByIdAndDelete(req.user._id)
    ])

    return sendSuccess(res, {}, 'Account deleted successfully')
  } catch (error) {
    console.error('deleteAccount error:', error.message)
    return sendError(res, 'Failed to delete account', 500)
  }
}

// GET /api/settings — get current settings for the logged-in user
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'notifEmail notifWhatsApp whatsappNumber personalEmail notifPreferences googleAccount.isConnected googleAccount.email'
    )
    if (!user) return sendError(res, 'User not found', 404)

    return sendSuccess(res, {
      notifEmail:        user.notifEmail,
      notifWhatsApp:     user.notifWhatsApp,
      whatsappNumber:    user.whatsappNumber,
      personalEmail:     user.personalEmail,
      notifPreferences:  user.notifPreferences || {
        shortlist: true,
        offer:     true,
        deadline:  true,
        rejected:  true,
        newMatch:  false
      },
      gmail: {
        isConnected: user.googleAccount?.isConnected || false,
        email:       user.googleAccount?.email       || null
      }
    }, 'Settings fetched successfully')
  } catch (error) {
    console.error('getSettings error:', error.message)
    return sendError(res, 'Failed to fetch settings', 500)
  }
}

module.exports = {
  getSettings,
  changePassword,
  updateContact,
  updateNotifications,
  disconnectGmail,
  deleteAccount
}