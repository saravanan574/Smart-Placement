const Opportunity = require('../models/Opportunity.model')
const Notification = require('../models/Notification.model')
const User = require('../models/User.model')
const { sendSuccess, sendError } = require('../utils/responseHelper')
const mlService = require('../services/mlIntegration.service')
const notificationService = require('../services/notification.service')

// GET /api/opportunities/stats
const getOpportunityStats = async (req, res) => {
  try {
    const userId = req.user._id

    const total = await Opportunity.countDocuments({ userId })
    const eligible = await Opportunity.countDocuments({
      userId,
      'eligibilityResult.isEligible': true
    })
    const applied = await Opportunity.countDocuments({ userId, isOptedIn: true })
    const shortlisted = await Opportunity.countDocuments({ userId, isShortlisted: true })

    const now = new Date()
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const deadlinesThisWeek = await Opportunity.countDocuments({
      userId,
      deadline: { $gte: now, $lte: weekFromNow },
      'eligibilityResult.isEligible': true,
      isOptedIn: false
    })

    return sendSuccess(
      res,
      { total, eligible, applied, shortlisted, deadlinesThisWeek },
      'Opportunity stats fetched successfully'
    )
  } catch (error) {
    console.error('Get opportunity stats error:', error.message)
    return sendError(res, 'Failed to fetch opportunity stats', 500)
  }
}

// GET /api/opportunities/deadlines
// Returns eligible + NOT opted in opportunities with deadlines — sorted by deadline asc
const getDeadlines = async (req, res) => {
  try {
    const userId = req.user._id

    const filter = {
      userId,
      deadline: { $ne: null },
      'eligibilityResult.isEligible': true,
      isOptedIn: false
    }

    // Optional: include expired deadlines
    if (req.query.includeExpired !== 'true') {
      filter.deadline.$gte = new Date()
    }

    // Search
    if (req.query.search) {
      filter.$or = [
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { jobRole: { $regex: req.query.search, $options: 'i' } }
      ]
    }

    // Type filter
    if (req.query.type && req.query.type !== 'all') {
      filter.jobType = req.query.type
    }

    const opportunities = await Opportunity.find(filter)
      .sort({ deadline: 1 })
      .populate('emailId', 'messageId subject date from')
      .lean()

    return sendSuccess(res, { opportunities }, 'Deadlines fetched successfully')
  } catch (error) {
    console.error('Get deadlines error:', error.message)
    return sendError(res, 'Failed to fetch deadlines', 500)
  }
}

// GET /api/opportunities/recommended
const getRecommended = async (req, res) => {
  try {
    const userId = req.user._id

    const opportunities = await Opportunity.find({ userId, isRecommended: true })
      .sort({ matchScore: -1, createdAt: -1 })
      .populate('emailId', 'messageId subject date from')
      .lean()

    return sendSuccess(res, { opportunities }, 'Recommended opportunities fetched successfully')
  } catch (error) {
    console.error('Get recommended error:', error.message)
    return sendError(res, 'Failed to fetch recommended opportunities', 500)
  }
}

// GET /api/opportunities
const getOpportunities = async (req, res) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = { userId }

    // Status filter
    if (req.query.filter) {
      switch (req.query.filter) {
        case 'eligible':
          filter['eligibilityResult.isEligible'] = true
          break
        case 'recommended':
          filter.isRecommended = true
          break
        case 'applied':
          filter.isOptedIn = true
          break
        default:
          break
      }
    }

    // isOptedIn filter (Applied page)
    if (req.query.isOptedIn !== undefined) {
      filter.isOptedIn = req.query.isOptedIn === 'true'
    }

    // isShortlisted filter (Shortlisted page)
    if (req.query.isShortlisted !== undefined) {
      filter.isShortlisted = req.query.isShortlisted === 'true'
    }

    // Job type filter
    if (req.query.type && req.query.type !== 'all') {
      filter.jobType = req.query.type
    }

    // Company type filter — new
    if (req.query.companyType && req.query.companyType !== 'all') {
      filter.companyType = req.query.companyType
    }

    // Dream company filter — new
    if (req.query.isDreamCompany === 'true') {
      filter.isDreamCompany = true
    }

    // No bond filter — new
    if (req.query.noBond === 'true') {
      filter.$or = [
        { bondYears: null },
        { bondYears: { $exists: false } }
      ]
    }

    // Apply suggestion filter — new
    if (req.query.suggestion && req.query.suggestion !== 'all') {
      filter.applySuggestion = req.query.suggestion
    }

    // Search
    if (req.query.search) {
      filter.$or = [
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { jobRole: { $regex: req.query.search, $options: 'i' } }
      ]
    }

    // Sort
    let sortOption = { createdAt: -1 }
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'deadline':
          sortOption = { deadline: 1 }
          break
        case 'matchScore':
          sortOption = { matchScore: -1 }
          break
        case 'salary':
          sortOption = { salary: -1 }
          break
        default:
          sortOption = { createdAt: -1 }
      }
    }

    const total = await Opportunity.countDocuments(filter)
    const opportunities = await Opportunity.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('emailId', 'messageId subject date from snippet textBody')
      .lean()

    return sendSuccess(
      res,
      {
        opportunities,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
      },
      'Opportunities fetched successfully'
    )
  } catch (error) {
    console.error('Get opportunities error:', error.message)
    return sendError(res, 'Failed to fetch opportunities', 500)
  }
}

// GET /api/opportunities/:id
// Returns full opportunity with full email data for detail page
const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('emailId', 'messageId subject date from snippet textBody htmlBody attachments')
      .lean()

    if (!opportunity) {
      return sendError(res, 'Opportunity not found', 404)
    }

    return sendSuccess(res, { opportunity }, 'Opportunity fetched successfully')
  } catch (error) {
    console.error('Get opportunity by id error:', error.message)
    return sendError(res, 'Failed to fetch opportunity', 500)
  }
}

// PUT /api/opportunities/:id/optin
const optInOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!opportunity) {
      return sendError(res, 'Opportunity not found', 404)
    }

    opportunity.isOptedIn = true
    opportunity.applicationStatus = 'applied'
    await opportunity.save()

    await Notification.create({
      userId: req.user._id,
      type: 'status_update',
      title: `Applied to ${opportunity.companyName}`,
      message: `You have opted in for ${opportunity.jobRole} at ${opportunity.companyName}.`,
      relatedOpportunityId: opportunity._id,
      priority: 'low'
    })

    return sendSuccess(res, { opportunity }, 'Successfully opted in to opportunity')
  } catch (error) {
    console.error('Opt in opportunity error:', error.message)
    return sendError(res, 'Failed to opt in to opportunity', 500)
  }
}

// PUT /api/opportunities/:id/status
const updateOpportunityStatus = async (req, res) => {
  try {
    const { applicationStatus } = req.body

    const validStatuses = [
      'not_applied', 'applied', 'shortlisted', 'test_scheduled',
      'interview_scheduled', 'offered', 'rejected', 'accepted', 'declined'
    ]

    if (!applicationStatus || !validStatuses.includes(applicationStatus)) {
      return sendError(res, 'Invalid application status', 400)
    }

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!opportunity) {
      return sendError(res, 'Opportunity not found', 404)
    }

    opportunity.applicationStatus = applicationStatus
    if (req.body.roundHistory) opportunity.roundHistory = req.body.roundHistory
    if (req.body.nextRoundType)  opportunity.nextRoundType  = req.body.nextRoundType
    if (req.body.nextRoundDate)  opportunity.nextRoundDate  = new Date(req.body.nextRoundDate)
    if (req.body.nextRoundVenue) opportunity.nextRoundVenue = req.body.nextRoundVenue
    if (req.body.currentRound !== undefined) opportunity.currentRound = req.body.currentRound

    if (applicationStatus === 'shortlisted') {
      opportunity.isShortlisted = true
    }

    await opportunity.save()

    // Notifications + email alerts for important status changes
    const importantStatuses = ['shortlisted', 'offered', 'rejected', 'accepted']
    if (importantStatuses.includes(applicationStatus)) {
      const statusMessages = {
        shortlisted: `You have been shortlisted at ${opportunity.companyName}!`,
        offered: `You received an offer from ${opportunity.companyName}!`,
        rejected: `Application update from ${opportunity.companyName}.`,
        accepted: `You accepted the offer from ${opportunity.companyName}!`
      }

      await Notification.create({
        userId: req.user._id,
        type: 'status_update',
        title: `Status updated: ${applicationStatus.replace(/_/g, ' ').toUpperCase()}`,
        message: statusMessages[applicationStatus],
        relatedOpportunityId: opportunity._id,
        priority: applicationStatus === 'offered' || applicationStatus === 'shortlisted' ? 'high' : 'medium'
      })

      // Send email + WhatsApp notification for offer
      if (applicationStatus === 'offered') {
        try {
          const user = await User.findById(req.user._id)
          if (user) {
            await notificationService.sendOfferNotification(
              user,
              opportunity.companyName,
              opportunity.salary
            )
          }
        } catch (notifErr) {
          console.error('Offer notification error (non-fatal):', notifErr.message)
        }
      }
    }

    return sendSuccess(res, { opportunity }, 'Application status updated successfully')
  } catch (error) {
    console.error('Update opportunity status error:', error.message)
    return sendError(res, 'Failed to update application status', 500)
  }
}

// PUT /api/opportunities/:id/rematch
// Re-run skill match for a single opportunity
const rematchOne = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!opportunity) {
      return sendError(res, 'Opportunity not found', 404)
    }

    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    // Reconstruct full job skills list from matched + missing
    const jobSkills = [
      ...(opportunity.matchedSkills || []),
      ...(opportunity.missingSkills || [])
    ]

    if (jobSkills.length === 0) {
      return sendSuccess(res, { opportunity }, 'No skills to rematch')
    }

    const skillMatch = await mlService.matchSkills(jobSkills, user.skills || [])

    opportunity.matchScore = skillMatch.match_score || 0
    opportunity.matchedSkills = skillMatch.matched_skills || []
    opportunity.missingSkills = skillMatch.missing_skills || []
    opportunity.isRecommended =
      (opportunity.eligibilityResult?.isEligible || false) &&
      (jobSkills.length === 0 ? true : skillMatch.match_score >= 50)

    await opportunity.save()

    return sendSuccess(res, { opportunity }, 'Skill match recalculated')
  } catch (error) {
    console.error('Rematch one error:', error.message)
    return sendError(res, 'Failed to rematch skills', 500)
  }
}

// POST /api/opportunities/rematch-all
// Re-run skill match for ALL opportunities of the user
// Called from Profile page when skills or resume is updated
const rematchAll = async (req, res) => {
  try {
    const result = await mlService.rematchAllOpportunities(req.user._id)
    return sendSuccess(
      res,
      { rematched: result.rematched, total: result.total },
      `Skill match recalculated for ${result.rematched} opportunities`
    )
  } catch (error) {
    console.error('Rematch all error:', error.message)
    return sendError(res, 'Failed to rematch all skills', 500)
  }
}

// POST /api/opportunities/:id/round
const addRound = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({ _id: req.params.id, userId: req.user._id })
    if (!opportunity) return sendError(res, 'Opportunity not found', 404)

    const { roundType, roundDate, roundTime, venue, result, notes } = req.body
    if (!roundType) return sendError(res, 'Round type is required', 400)

    const roundDateObj = roundDate ? new Date(`${roundDate}${roundTime ? ' ' + roundTime : ''}`) : null

    opportunity.roundHistory.push({
      roundType, roundDate: roundDateObj, venue: venue || null,
      result: result || 'pending', notes: notes || null,
      source: 'manual', detectedAt: new Date()
    })
    opportunity.currentRound = opportunity.roundHistory.length
    opportunity.nextRoundType = roundType
    opportunity.nextRoundDate = roundDateObj
    opportunity.nextRoundVenue = venue || null
    opportunity.roundDetailsMissing = false

    await opportunity.save()
    return sendSuccess(res, { opportunity }, 'Round added successfully')
  } catch (error) {
    console.error('Add round error:', error.message)
    return sendError(res, 'Failed to add round', 500)
  }
}

// GET /api/opportunities/:id/all-emails
const getAllEmails = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({ _id: req.params.id, userId: req.user._id })
    if (!opportunity) return sendError(res, 'Opportunity not found', 404)

    const Email = require('../models/Email.model')
    const emails = await Email.find({
      userId: req.user._id,
      'extractedInfo.companyName': { $regex: new RegExp(opportunity.companyName, 'i') }
    }).sort({ date: 1 }).select('messageId subject date from category snippet').lean()

    return sendSuccess(res, { emails }, 'Company emails fetched successfully')
  } catch (error) {
    console.error('Get all emails error:', error.message)
    return sendError(res, 'Failed to fetch company emails', 500)
  }
}

// GET /api/analytics/skill-gap  (mounted on opportunity router)
const getSkillGap = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    const opportunities = await Opportunity.find({
      userId: req.user._id,
      'eligibilityResult.isEligible': true
    }).select('matchedSkills missingSkills').lean()

    const skillFreq = {}
    opportunities.forEach(opp => {
      ;[...(opp.matchedSkills || []), ...(opp.missingSkills || [])].forEach(skill => {
        skillFreq[skill] = (skillFreq[skill] || 0) + 1
      })
    })

    const total = opportunities.length || 1
    const studentSkills = new Set([...(user.skills || []), ...(user.resumeSkills || [])].map(s => s.toLowerCase()))

    const topSkills = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({
        skill,
        percentage: Math.round((count / total) * 100),
        youHaveIt: studentSkills.has(skill.toLowerCase())
      }))

    const covered = topSkills.filter(s => s.youHaveIt).length
    const marketReadiness = Math.round((covered / (topSkills.length || 1)) * 100)

    return sendSuccess(res, { topSkills, marketReadiness, totalOpportunities: total }, 'Skill gap data fetched')
  } catch (error) {
    console.error('Skill gap error:', error.message)
    return sendError(res, 'Failed to fetch skill gap', 500)
  }
}

module.exports = {
  getOpportunityStats,
  getDeadlines,
  getRecommended,
  getOpportunities,
  getOpportunityById,
  optInOpportunity,
  updateOpportunityStatus,
  rematchOne,
  rematchAll,
  addRound, 
  getAllEmails, 
  getSkillGap
}