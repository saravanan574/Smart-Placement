const Email        = require('../models/Email.model')
const Opportunity  = require('../models/Opportunity.model')
const Community    = require('../models/Community.model')
const Notification = require('../models/Notification.model')
const User         = require('../models/User.model')
const mlService    = require('./mlIntegration.service')

const VALID_CATEGORIES = [
  'internship', 'fulltime', 'interview', 'shortlist', 'rejection',
  'offer', 'deadline', 'assessment', 'training', 'general', 'unclassified'
]
const OPPORTUNITY_CATEGORIES = ['internship', 'fulltime']

const buildPreparationLinks = (name) => {
  if (!name) return []
  const clean   = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const encoded = encodeURIComponent(name)
  return [
    { title: `${name} - GeeksForGeeks`, url: `https://www.geeksforgeeks.org/company/${clean}/`,                                   type: 'geeksforgeeks' },
    { title: `${name} - LinkedIn`,      url: `https://www.linkedin.com/company/${clean}`,                                         type: 'linkedin'      },
    { title: `${name} - AmbitionBox`,   url: `https://www.ambitionbox.com/reviews/${clean}-reviews`,                              type: 'ambitionbox'   },
    { title: `${name} - YouTube`,       url: `https://www.youtube.com/results?search_query=${encoded}+interview+experience`,      type: 'youtube'       }
  ]
}

const autoCreateCommunity = async (companyName, userId) => {
  try {
    let community = await Community.findOne({ companyName: { $regex: new RegExp(companyName, 'i') }, isAutoCreated: true })
    if (community) {
      const isMember = community.members.some((m) => m.toString() === userId.toString())
      if (!isMember) { community.members.push(userId); await community.save() }
    } else {
      community = await Community.create({
        name: `${companyName} - Placement Discussion`,
        description: `Discussion group for students shortlisted at ${companyName}`,
        companyName, category: 'company', createdBy: userId,
        isAutoCreated: true, members: [userId], admins: [userId]
      })
    }
    return community
  } catch (error) {
    console.error('Auto create community error:', error.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// handleShortlist — auto opt-in, detection source from VALUE, round history
// ---------------------------------------------------------------------------
const handleShortlist = async (email, userProfile, analysis) => {
  try {
    const { createNotification, sendShortlistNotification } = require('./notification.service')
    const companyName = analysis.company_name

    // Build detection source — show VALUE not field key name
    let detectionSource = null
    if (analysis.matched_field) {
      const fieldMap = {
        'Register Number': userProfile.registerNumber,
        'Name':            userProfile.name,
        'College Email':   userProfile.loginEmail,
        'Personal Email':  userProfile.personalEmail,
        // backward compat lowercase keys
        'registerNumber':  userProfile.registerNumber,
        'name':            userProfile.name,
        'loginEmail':      userProfile.loginEmail,
        'personalEmail':   userProfile.personalEmail,
      }
      if (fieldMap[analysis.matched_field]) {
        detectionSource = `${analysis.matched_field}: ${fieldMap[analysis.matched_field]}`
      } else {
        // Custom field — find value by key
        const customField = (userProfile.customDetails || []).find(
          (cd) => cd.key === analysis.matched_field || cd.key?.toLowerCase() === analysis.matched_field?.toLowerCase()
        )
        detectionSource = customField ? `${customField.key}: ${customField.value}` : analysis.matched_field
      }
    }

    let opportunity = await Opportunity.findOne({
      userId:      userProfile._id,
      companyName: { $regex: new RegExp(companyName, 'i') }
    }).sort({ createdAt: -1 })

    const safeNextRoundDate = analysis.next_round_date
      ? (() => { const d = new Date(analysis.next_round_date); return isNaN(d.getTime()) ? null : d })()
      : null

    if (!opportunity) {
      // No registration email was ever received — auto-create
      opportunity = await Opportunity.create({
        emailId: email._id, userId: userProfile._id,
        companyName: companyName || 'Unknown Company',
        jobRole: analysis.job_role || 'Not Specified',
        jobType: 'fulltime',
        isOptedIn: true, isShortlisted: true, shortlistNotified: true,
        applicationStatus: 'shortlisted',
        matchedField: analysis.matched_field || null,
        detectionSource,
        currentRound: safeNextRoundDate ? 1 : 0,
        roundHistory: analysis.next_round_type ? [{
          roundType:  analysis.next_round_type,
          roundDate:  safeNextRoundDate,
          venue:      analysis.next_round_venue || null,
          result:     'pending', source: 'email', detectedAt: new Date()
        }] : [],
        nextRoundType:  analysis.next_round_type  || null,
        nextRoundDate:  safeNextRoundDate,
        nextRoundVenue: analysis.next_round_venue || null,
        eligibilityResult: { isEligible: true, failedReasons: [] },
        matchScore: 0, matchedSkills: [], missingSkills: [],
        preparationLinks: buildPreparationLinks(companyName)
      })
    } else {
      // Update existing
      opportunity.applicationStatus  = 'shortlisted'
      opportunity.isShortlisted      = true
      opportunity.shortlistNotified  = true
      opportunity.isOptedIn          = true  // auto opt-in
      opportunity.matchedField       = analysis.matched_field || opportunity.matchedField
      opportunity.detectionSource    = detectionSource || opportunity.detectionSource

      if (analysis.next_round_type && safeNextRoundDate) {
        const exists = opportunity.roundHistory?.some(
          (r) => r.roundType === analysis.next_round_type && r.roundDate?.toString() === safeNextRoundDate?.toString()
        )
        if (!exists) {
          if (!opportunity.roundHistory) opportunity.roundHistory = []
          opportunity.roundHistory.push({
            roundType:  analysis.next_round_type,
            roundDate:  safeNextRoundDate,
            venue:      analysis.next_round_venue || null,
            result:     'pending', source: 'email', detectedAt: new Date()
          })
          opportunity.currentRound = (opportunity.currentRound || 0) + 1
        }
        opportunity.nextRoundType  = analysis.next_round_type
        opportunity.nextRoundDate  = safeNextRoundDate
        opportunity.nextRoundVenue = analysis.next_round_venue || null
        // Set roundDetailsMissing if shortlisted but no round date/venue found
        if (!analysis.next_round_date && !analysis.next_round_venue) {
          opportunity.roundDetailsMissing = true
        }
      }
      await opportunity.save()
    }

    if (companyName) await autoCreateCommunity(companyName, userProfile._id)

    await createNotification({
      userId: userProfile._id, type: 'shortlist',
      title:  `🎉 Shortlisted at ${companyName}!`,
      message: `Shortlisted at ${companyName}.${detectionSource ? ` Detected via ${detectionSource}.` : ''} Join the community!`,
      relatedOpportunityId: opportunity._id, priority: 'high'
    }, true)

    await sendShortlistNotification(userProfile, companyName, analysis.next_round_type, analysis.next_round_date, detectionSource)

  } catch (error) {
    console.error('Handle shortlist error:', error.message)
  }
}

// ---------------------------------------------------------------------------
// createOpportunity — now passes emailText to check-eligibility for vague dept
// ---------------------------------------------------------------------------
const createOpportunity = async (email, userId, analysis, emailText = '') => {
  try {
    const user = await User.findById(userId)
    if (!user) return null

    const extractedInfo = email.extractedInfo
    const jobType = email.category === 'fulltime' ? 'fulltime' : 'internship'

    // Pass emailText so Python can resolve vague departments via AI
    const eligibilityResult = await mlService.checkEligibility(
      { cgpa: user.currentCGPA, tenthPercentage: user.tenthPercentage,
        twelfthPercentage: user.twelfthPercentage, activeBacklogs: user.activeBacklogs,
        department: user.department, degree: user.degree || null },
      { minCGPA: extractedInfo.minCGPA, minTenthPercent: extractedInfo.minTenthPercent,
        minTwelfthPercent: extractedInfo.minTwelfthPercent, maxBacklogs: extractedInfo.maxBacklogs,
        departments: extractedInfo.departments || [],degreeRequired: Array.isArray(analysis.degree_required)
        ? analysis.degree_required.join('/') 
        : (analysis.degree_required || null), },
      emailText   // ← NEW: passed through to resolve vague dept
    )

    const skillMatch = await mlService.matchSkills(
      extractedInfo.requiredSkills || [], user.skills || [],
      { resumeSkills: user.resumeSkills || [], interestedRoles: user.interestedRoles || [], jobRole: analysis.job_role || '' }
    )

    const safeNextRoundDate = analysis.next_round_date
      ? (() => { const d = new Date(analysis.next_round_date); return isNaN(d.getTime()) ? null : d })()
      : null

    const opportunityData = {
      emailId: email._id, userId,
      companyName: extractedInfo.companyName || 'Unknown Company',
      jobRole:     extractedInfo.jobRole     || 'Not Specified',
      jobType,
      location: analysis.location || null, salary: analysis.salary || null,
      deadline: extractedInfo.deadline || null, jobDescription: analysis.job_description || null,
      batchYear: analysis.batch_year ? String(analysis.batch_year) : null,
      workMode: analysis.work_mode || null, applyLink: analysis.apply_link || null,
      companyType: analysis.company_type || null, companyDescription: analysis.company_description || null,
      isDreamCompany: analysis.is_dream_company || false,
      bondYears: analysis.bond_years || null, bondAmount: analysis.bond_amount || null,
      degreeRequired: analysis.degree_required || null,
      goodToHaveSkills: analysis.good_to_have_skills || [], techStack: analysis.tech_stack || [],
      nextRoundType: null, nextRoundDate: null, nextRoundVenue: null,
      eligibilityResult: {
        isEligible: eligibilityResult.is_eligible,
        cgpaCheck:       eligibilityResult.checks?.cgpa       || { required: null, userValue: user.currentCGPA,       passed: true },
        tenthCheck:      eligibilityResult.checks?.tenth      || { required: null, userValue: user.tenthPercentage,   passed: true },
        twelfthCheck:    eligibilityResult.checks?.twelfth    || { required: null, userValue: user.twelfthPercentage, passed: true },
        backlogCheck:    eligibilityResult.checks?.backlog    || { required: null, userValue: user.activeBacklogs,    passed: true },
        departmentCheck: eligibilityResult.checks?.department || { required: [],   userValue: user.department,        passed: true },
        degreeCheck:     eligibilityResult.checks?.degree     || { required: null, userValue: user.degree,            passed: true },
        failedReasons:   eligibilityResult.failed_reasons     || []
      },
      matchScore:    skillMatch.match_score    || 0,
      matchedSkills: skillMatch.matched_skills || [],
      missingSkills: skillMatch.missing_skills || [],
      isRecommended: eligibilityResult.is_eligible &&
        ((extractedInfo.requiredSkills?.length === 0) ? true : skillMatch.match_score >= 50),
      applySuggestion:       analysis.apply_suggestion        || null,
      applySuggestionReason: analysis.apply_suggestion_reason || null,
      preparationLinks:      buildPreparationLinks(extractedInfo.companyName)
    }

    // Dedup: same company + user created in last 10 mins with different emailId
    const tenMinsAgo   = new Date(Date.now() - 10 * 60 * 1000)
    const companyRegex = new RegExp(`^${(extractedInfo.companyName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    const recentDup    = await Opportunity.findOne({ userId, companyName: companyRegex, createdAt: { $gte: tenMinsAgo } })
    if (recentDup && recentDup.emailId?.toString() !== email._id?.toString()) {
      console.log(`Dedup: skipping duplicate for ${extractedInfo.companyName}`)
      return recentDup
    }

    const opportunity = await Opportunity.findOneAndUpdate(
      { emailId: email._id, userId },
      { $set: opportunityData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    
    // Save company email domain and first email link
    if (opportunity) {
      const senderEmail = email.from?.email || ''
      const domain = senderEmail.includes('@') ? senderEmail.split('@')[1] : null
      await Opportunity.findByIdAndUpdate(opportunity._id, {
        companyEmailDomain: domain,
        $addToSet: { allEmailIds: email._id }
      })
    }
    // Immediate deadline notification when first detected
    if (opportunity.deadline) {
      try {
        const notifSvc = require('./notification.service')
        const alreadyNotified = await Notification.findOne({
          userId, relatedOpportunityId: opportunity._id, title: { $regex: 'New deadline' }
        })
        if (!alreadyNotified && opportunity.eligibilityResult?.isEligible === true) {
          await notifSvc.sendDeadlineNotification(user, opportunity, 'detected')
          await notifSvc.createNotification({
            userId, type: 'deadline',
            title: `New deadline: ${opportunity.companyName}`,
            message: `${opportunity.companyName} deadline: ${new Date(opportunity.deadline).toLocaleDateString('en-IN')}`,
            relatedOpportunityId: opportunity._id, priority: 'medium'
          }, false)
        }
      } catch (err) { console.error('Deadline notification error:', err.message) }
    }

    return opportunity
  } catch (error) {
    console.error('Create opportunity error:', error.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// SMART EMAIL PROCESSING — core logic
//
// For each incoming email:
// 1. Extract company name via Groq first
// 2. Check if we already have an email for this company + same threadId
// 3. If yes — determine what's new and update accordingly (or skip)
// 4. If no — process as new
//
// This handles:
// - "Kind attention" reminder → same company, same threadId → skip if nothing changed
// - Shortlist email → same company, different category → update status
// - Applied list email → check if student is in list → update accordingly
// ---------------------------------------------------------------------------

const determineEmailUpdate = (existingOpp, analysis, safeCategory) => {
  // Returns what needs to be updated, or null if nothing changed
  const updates = {}
  let hasUpdate = false

  // Check for new deadline
  if (analysis.deadline) {
    const newDeadline = new Date(analysis.deadline)
    if (!isNaN(newDeadline.getTime())) {
      const existingDeadline = existingOpp?.deadline ? new Date(existingOpp.deadline) : null
      if (!existingDeadline || Math.abs(newDeadline - existingDeadline) > 60000) {
        updates.deadline = newDeadline
        hasUpdate = true
      }
    }
  }

  // Check for new salary info
  if (analysis.salary && analysis.salary !== existingOpp?.salary) {
    updates.salary = analysis.salary
    hasUpdate = true
  }

  // Check for new location
  if (analysis.location && analysis.location !== existingOpp?.location) {
    updates.location = analysis.location
    hasUpdate = true
  }

  // Check for new round info
  if (analysis.next_round_type && analysis.next_round_type !== existingOpp?.nextRoundType) {
    updates.nextRoundType  = analysis.next_round_type
    updates.nextRoundVenue = analysis.next_round_venue || existingOpp?.nextRoundVenue
    if (analysis.next_round_date) {
      const d = new Date(analysis.next_round_date)
      if (!isNaN(d.getTime())) updates.nextRoundDate = d
    }
    hasUpdate = true
  }

  return hasUpdate ? updates : null
}

const saveEmails = async (emailsData, userProfile, io = null) => {
  let saved = 0, updated = 0, skipped = 0, shortlisted = 0
  const total  = emailsData.length
  const userId = userProfile._id.toString()

  for (let i = 0; i < emailsData.length; i++) {
    const emailData = emailsData[i]
    try {
      if (io) {
        const { emitSyncProgress } = require('../sockets/socket.handler')
        emitSyncProgress(io, userId, { current: i + 1, total, subject: emailData.subject || 'Reading email...', company: null })
      }

      // ── STEP 1: Check by messageId + userId (exact duplicate) ──────────────
      const existingByMessageId = await Email.findOne({
        messageId: emailData.messageId,
        userId:    userProfile._id
      })
      if (existingByMessageId) {
        // Exact same email already in DB — skip entirely
        skipped++
        continue
      }

      // ── STEP 2: Analyze email via AI ───────────────────────────────────────
      const emailText = emailData.textBody || emailData.snippet || ''
      const analysis  = await mlService.analyzeEmail(emailText, emailData.subject, userProfile, [])

      if (!analysis.is_placement_related) { skipped++; continue }

      if (io && analysis.company_name) {
        const { emitSyncProgress } = require('../sockets/socket.handler')
        emitSyncProgress(io, userId, { current: i + 1, total, subject: emailData.subject || '', company: analysis.company_name })
      }

      const safeCategory = VALID_CATEGORIES.includes(analysis.category) ? analysis.category : 'general'
      const safeDeadline = (() => {
        if (!analysis.deadline) return null
        const d = new Date(analysis.deadline)
        return isNaN(d.getTime()) ? null : d
      })()

      // ── STEP 3: Check for same company email by threadId ───────────────────
      // Gmail threads same conversation emails together
      // If we have this threadId + userId already, it's a reply/reminder in same thread
      let existingByThread = null
      if (emailData.threadId) {
        existingByThread = await Email.findOne({
          threadId: emailData.threadId,
          userId:   userProfile._id
        })
      }

      // ── STEP 4: Check for same company email by company name (recent 24h) ──
      // Catches "kind attention" reminders sent as separate emails
      let existingOpp = null
      if (analysis.company_name) {
        existingOpp = await Opportunity.findOne({
          userId,
          companyName: { $regex: new RegExp(`^${analysis.company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).sort({ createdAt: -1 })
      }

      const isReminderEmail = existingByThread || (
        existingOpp &&
        OPPORTUNITY_CATEGORIES.includes(safeCategory) &&
        OPPORTUNITY_CATEGORIES.includes(existingOpp.jobType === 'fulltime' ? 'fulltime' : 'internship')
      )

      // ── STEP 5: Decide what to do ──────────────────────────────────────────
      if (isReminderEmail && existingOpp) {
        // Same company email already exists
        // Check if anything new in this email
        const updates = determineEmailUpdate(existingOpp, analysis, safeCategory)

        if (!updates && OPPORTUNITY_CATEGORIES.includes(safeCategory)) {
          // Nothing new — reminder email, just update updatedAt so student knows
          await Opportunity.findByIdAndUpdate(existingOpp._id, { $set: { updatedAt: new Date() } })
          // Save the email record but mark as reminder
          await Email.create({
            ...emailData,
            userId:               userProfile._id,
            category:             safeCategory,
            isPlacementRelated:   true,
            isProcessed:          true,
            processedAt:          new Date(),
            aiConfidence:         analysis.confidence             || null,
            emailTypeExplanation: 'Reminder email — no new information',
            extractedInfo:        { companyName: analysis.company_name, jobRole: analysis.job_role, deadline: safeDeadline, requiredSkills: [], minCGPA: null, minTenthPercent: null, minTwelfthPercent: null, maxBacklogs: null, departments: [] }
          })
          skipped++
          continue
        }

        if (updates && existingOpp) {
          // New info found — update the opportunity
          await Opportunity.findByIdAndUpdate(existingOpp._id, { $set: updates })
          updated++
          console.log(`Updated opportunity for ${analysis.company_name} with:`, Object.keys(updates).join(', '))
        }
      }

      // ── STEP 6: Save email record ──────────────────────────────────────────
      const emailFields = {
        ...emailData,
        userId:               userProfile._id,
        category:             safeCategory,
        isPlacementRelated:   true,
        isProcessed:          true,
        processedAt:          new Date(),
        aiConfidence:         analysis.confidence             || null,
        emailTypeExplanation: analysis.email_type_explanation || null,
        extractedInfo: {
          companyName:       analysis.company_name   || null,
          jobRole:           analysis.job_role        || null,
          deadline:          safeDeadline,
          requiredSkills:    analysis.required_skills    || [],
          minCGPA:           analysis.min_cgpa           || null,
          minTenthPercent:   analysis.min_tenth          || null,
          minTwelfthPercent: analysis.min_twelfth        || null,
          maxBacklogs:       analysis.max_backlogs !== undefined ? analysis.max_backlogs : null,
          departments:       analysis.departments        || []
        }
      }

      const savedEmail = await Email.create(emailFields)
      if (!isReminderEmail) saved++

      // ── STEP 7: Create/update opportunity for job postings ─────────────────
      const shouldCreateOpportunity =
        OPPORTUNITY_CATEGORIES.includes(safeCategory) ||
        (safeCategory === 'general' && analysis.company_name &&
          (analysis.min_cgpa || (analysis.departments && analysis.departments.length > 0) || (analysis.required_skills && analysis.required_skills.length > 0)))

      if (shouldCreateOpportunity && !isReminderEmail) {
        await createOpportunity(savedEmail, userProfile._id, analysis, emailText)
        // Link this email to the existing company opportunity
        if (existingOpp) {
          await Opportunity.findByIdAndUpdate(existingOpp._id, {
            $addToSet: { allEmailIds: savedEmail._id }
          })
        }
      }

      // ── STEP 8: Shortlist detection ────────────────────────────────────────
      if (analysis.is_user_shortlisted && analysis.shortlist_confidence >= 0.75) {
        shortlisted++
        await handleShortlist(savedEmail, userProfile, analysis)
      }

      // ── STEP 9: Interview/assessment → update round info ───────────────────
      if (['interview', 'assessment'].includes(safeCategory) && analysis.company_name) {
        try {
          const relatedOpp = existingOpp || await Opportunity.findOne({
            userId, companyName: { $regex: new RegExp(analysis.company_name, 'i') }
          }).sort({ createdAt: -1 })

          if (relatedOpp) {
            const safeDate = analysis.next_round_date
              ? (() => { const d = new Date(analysis.next_round_date); return isNaN(d.getTime()) ? null : d })()
              : null

            if (analysis.next_round_type && safeDate) {
              const exists = relatedOpp.roundHistory?.some(
                (r) => r.roundType === analysis.next_round_type && r.roundDate?.toString() === safeDate?.toString()
              )
              if (!exists) {
                if (!relatedOpp.roundHistory) relatedOpp.roundHistory = []
                relatedOpp.roundHistory.push({ roundType: analysis.next_round_type, roundDate: safeDate, venue: analysis.next_round_venue || null, result: 'pending', source: 'email', detectedAt: new Date() })
                relatedOpp.currentRound = (relatedOpp.currentRound || 0) + 1
              }
            }
            if (analysis.next_round_type)  relatedOpp.nextRoundType  = analysis.next_round_type
            if (analysis.next_round_date) {
              const d = new Date(analysis.next_round_date)
              if (!isNaN(d.getTime())) relatedOpp.nextRoundDate = d
            }
            if (analysis.next_round_venue) relatedOpp.nextRoundVenue = analysis.next_round_venue
            relatedOpp.applicationStatus = safeCategory === 'interview' ? 'interview_scheduled' : 'test_scheduled'
            await relatedOpp.save()
          }
        } catch (err) { console.error('Update round info error:', err.message) }
      }

      // ── STEP 10: Offer/rejection ───────────────────────────────────────────
      if (['offer', 'rejection'].includes(safeCategory) && analysis.company_name) {
        try {
          const relatedOpp = existingOpp || await Opportunity.findOne({
            userId, companyName: { $regex: new RegExp(analysis.company_name, 'i') }
          }).sort({ createdAt: -1 })

          if (relatedOpp) {
            relatedOpp.applicationStatus = safeCategory === 'offer' ? 'offered' : 'rejected'
            await relatedOpp.save()

            const notifSvc = require('./notification.service')
            if (safeCategory === 'offer') {
              await notifSvc.createNotification({ userId, type: 'status_update', title: `🎉 Offer from ${analysis.company_name}!`, message: `You received an offer from ${analysis.company_name}!`, relatedOpportunityId: relatedOpp._id, priority: 'high' }, true)
              await notifSvc.sendOfferNotification(userProfile, analysis.company_name, relatedOpp.salary)
            }
            if (safeCategory === 'rejection') {
              await notifSvc.createNotification({ userId, type: 'status_update', title: `Application update: ${analysis.company_name}`, message: `Your application at ${analysis.company_name} was not successful.`, relatedOpportunityId: relatedOpp._id, priority: 'medium' }, true)
              await notifSvc.sendRejectionNotification(userProfile, analysis.company_name)
            }
          }
        } catch (err) { console.error('Update offer/rejection error:', err.message) }
      }

    } catch (err) {
      console.error('Error processing email:', err.message)
      continue
    }
  }

  return { saved, updated, skipped, shortlisted }
}

const getProcessingStats = async (userId) => {
  try {
    const totalEmails     = await Email.countDocuments({ userId })
    const placementEmails = await Email.countDocuments({ userId, isPlacementRelated: true })
    const categoryCounts  = await Email.aggregate([{ $match: { userId, isPlacementRelated: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }])
    const categories = {}
    categoryCounts.forEach((item) => { categories[item._id] = item.count })
    const totalOpportunities = await Opportunity.countDocuments({ userId })
    const eligible           = await Opportunity.countDocuments({ userId, 'eligibilityResult.isEligible': true })
    const recommended        = await Opportunity.countDocuments({ userId, isRecommended: true })
    const shortlisted        = await Opportunity.countDocuments({ userId, isShortlisted: true })
    return { totalEmails, placementEmails, categories, totalOpportunities, eligible, recommended, shortlisted }
  } catch (error) { console.error('Get processing stats error:', error.message); throw error }
}

const clearUserData = async (userId) => {
  try {
    const e = await Email.deleteMany({ userId })
    const o = await Opportunity.deleteMany({ userId })
    return { deletedEmails: e.deletedCount, deletedOpportunities: o.deletedCount }
  } catch (error) { console.error('Clear user data error:', error.message); throw error }
}

module.exports = { saveEmails, createOpportunity, handleShortlist, autoCreateCommunity, getProcessingStats, clearUserData }