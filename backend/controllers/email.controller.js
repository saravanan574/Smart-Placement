const Email = require('../models/Email.model')
const User = require('../models/User.model')
const { sendSuccess, sendError } = require('../utils/responseHelper')
const gmailOAuthService = require('../services/gmailOAuth.service')
const emailProcessingService = require('../services/emailProcessing.service')
const mlIntegrationService = require('../services/mlIntegration.service')

// ---------------------------------------------------------------------------
// POST /api/emails/sync
// Manual sync — student clicks "Sync" button in dashboard
// UPDATED: now passes io to saveEmails so syncProgress emits to frontend
// ---------------------------------------------------------------------------
const syncEmails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    if (!user.googleAccount?.isConnected) {
      return sendError(res, 'Gmail account not connected', 400)
    }

    const mlHealthy = await mlIntegrationService.checkMLHealth()
    if (!mlHealthy) {
      return sendError(res, 'AI service is unavailable. Please try again later.', 503)
    }

    const fetchedEmails = await gmailOAuthService.fetchEmails(req.user._id)

    if (!fetchedEmails || fetchedEmails.length === 0) {
      return sendSuccess(
        res,
        { saved: 0, updated: 0, skipped: 0, shortlisted: 0, fetched: 0 },
        'No new emails found'
      )
    }

    // Get io from app — for real-time sync progress via Socket.io
    // Frontend listens to 'syncProgress' event and shows progress bar
    const io = req.app.get('io')

    const result = await emailProcessingService.saveEmails(fetchedEmails, user, io)

    // Emit sync complete event
    if (io) {
      const { emitSyncProgress } = require('../sockets/socket.handler')
      emitSyncProgress(io, user._id.toString(), {
        current: fetchedEmails.length,
        total:   fetchedEmails.length,
        company: null,
        done:    true
      })
    }

    return sendSuccess(
      res,
      {
        fetched:     fetchedEmails.length,
        saved:       result.saved,
        updated:     result.updated,
        skipped:     result.skipped,
        shortlisted: result.shortlisted
      },
      `Sync complete. ${result.saved} new placement emails found.`
    )
  } catch (error) {
    console.error('Sync emails error:', error.message)
    return sendError(res, error.message || 'Failed to sync emails', 500)
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/stats — unchanged
// ---------------------------------------------------------------------------
const getEmailStats = async (req, res) => {
  try {
    const userId = req.user._id

    const totalEmails     = await Email.countDocuments({ userId })
    const placementEmails = await Email.countDocuments({ userId, isPlacementRelated: true })

    const categoryCounts = await Email.aggregate([
      { $match: { userId, isPlacementRelated: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])

    const categories = {}
    categoryCounts.forEach((item) => { categories[item._id] = item.count })

    return sendSuccess(res, { totalEmails, placementEmails, categories }, 'Email stats fetched successfully')
  } catch (error) {
    console.error('Get email stats error:', error.message)
    return sendError(res, 'Failed to fetch email stats', 500)
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/emails/clear — unchanged
// ---------------------------------------------------------------------------
const clearEmails = async (req, res) => {
  try {
    const result = await emailProcessingService.clearUserData(req.user._id)
    return sendSuccess(res, result, 'All user data cleared successfully')
  } catch (error) {
    console.error('Clear emails error:', error.message)
    return sendError(res, 'Failed to clear emails', 500)
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails — unchanged
// ---------------------------------------------------------------------------
const getEmails = async (req, res) => {
  try {
    const userId = req.user._id
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 20
    const skip  = (page - 1) * limit

    const filter = { userId }
    if (req.query.category) filter.category = req.query.category
    if (req.query.isPlacementRelated !== undefined) {
      filter.isPlacementRelated = req.query.isPlacementRelated === 'true'
    }
    if (req.query.search) {
      filter.$or = [
        { subject:                       { $regex: req.query.search, $options: 'i' } },
        { 'from.name':                   { $regex: req.query.search, $options: 'i' } },
        { 'from.email':                  { $regex: req.query.search, $options: 'i' } },
        { 'extractedInfo.companyName':   { $regex: req.query.search, $options: 'i' } }
      ]
    }

    const total  = await Email.countDocuments(filter)
    const emails = await Email.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return sendSuccess(res, {
      emails,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    }, 'Emails fetched successfully')
  } catch (error) {
    console.error('Get emails error:', error.message)
    return sendError(res, 'Failed to fetch emails', 500)
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/:id — unchanged
// ---------------------------------------------------------------------------
const getEmailById = async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user._id })
    if (!email) return sendError(res, 'Email not found', 404)
    return sendSuccess(res, { email }, 'Email fetched successfully')
  } catch (error) {
    console.error('Get email by id error:', error.message)
    return sendError(res, 'Failed to fetch email', 500)
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/:id/reprocess — unchanged
// ---------------------------------------------------------------------------
const reprocessEmail = async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user._id })
    if (!email) return sendError(res, 'Email not found', 404)

    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    const analysis = await mlIntegrationService.analyzeEmail(
      email.textBody || email.snippet,
      email.subject,
      user,
      []
    )

    const VALID_CATEGORIES = [
      'internship', 'fulltime', 'interview', 'shortlist', 'rejection',
      'offer', 'deadline', 'assessment', 'training', 'general', 'unclassified'
    ]

    const safeCategory = VALID_CATEGORIES.includes(analysis.category)
      ? analysis.category : 'general'

    const safeDeadline = (() => {
      if (!analysis.deadline) return null
      const d = new Date(analysis.deadline)
      return isNaN(d.getTime()) ? null : d
    })()

    email.category             = safeCategory
    email.isPlacementRelated   = analysis.is_placement_related || false
    email.isProcessed          = true
    email.processedAt          = new Date()
    email.aiConfidence         = analysis.confidence              || null
    email.emailTypeExplanation = analysis.email_type_explanation  || null
    email.extractedInfo = {
      companyName:       analysis.company_name   || null,
      jobRole:           analysis.job_role        || null,
      deadline:          safeDeadline,
      requiredSkills:    analysis.required_skills || [],
      minCGPA:           analysis.min_cgpa        || null,
      minTenthPercent:   analysis.min_tenth       || null,
      minTwelfthPercent: analysis.min_twelfth     || null,
      maxBacklogs:       analysis.max_backlogs !== undefined ? analysis.max_backlogs : null,
      departments:       analysis.departments     || []
    }

    await email.save()
    return sendSuccess(res, { email, analysis }, 'Email reprocessed successfully')
  } catch (error) {
    console.error('Reprocess email error:', error.message)
    return sendError(res, 'Failed to reprocess email', 500)
  }
}

module.exports = {
  syncEmails,
  getEmailStats,
  clearEmails,
  getEmails,
  getEmailById,
  reprocessEmail
}