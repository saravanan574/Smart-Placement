const axios = require('axios')
const Opportunity = require('../models/Opportunity.model')
const User = require('../models/User.model')

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

// Analyze email using AI service
// Groq is called ONLY after rule-based keyword check passes in Python
// One email → one call → full extraction in single response
const analyzeEmail = async (text, subject, userProfile, attachments = []) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/analyze-email`,
      {
        text: text || '',
        subject: subject || '',
        attachments: attachments || [],
        user: {
          name: userProfile.name,
          registerNumber: userProfile.registerNumber,
          email: userProfile.loginEmail,
          personalEmail: userProfile.personalEmail || null,
          cgpa: userProfile.currentCGPA,
          tenthPercentage: userProfile.tenthPercentage,
          twelfthPercentage: userProfile.twelfthPercentage,
          activeBacklogs: userProfile.activeBacklogs,
          department: userProfile.department,
          degree: userProfile.degree || null,           // NEW — for eligibility in prompt
          skills: userProfile.skills || [],
          resumeText: userProfile.resumeText || null,   // NEW — for skill context in prompt
          customDetails: userProfile.customDetails || []
        }
      },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response.data
  } catch (error) {
    console.error('analyzeEmail error:', error.message)
    return { is_placement_related: false, category: 'unclassified' }
  }
}

// Check eligibility using AI service (pure Python logic, no AI)
const checkEligibility = async (userProfile, jobCriteria, emailText = '') => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/check-eligibility`,
      {
        user: {
          cgpa: userProfile.cgpa !== undefined ? userProfile.cgpa : userProfile.currentCGPA,
          tenthPercentage: userProfile.tenthPercentage,
          twelfthPercentage: userProfile.twelfthPercentage,
          activeBacklogs: userProfile.activeBacklogs,
          department: userProfile.department,
          degree: userProfile.degree || null
        },
        criteria: {
          minCGPA: jobCriteria.minCGPA,
          minTenthPercent: jobCriteria.minTenthPercent,
          minTwelfthPercent: jobCriteria.minTwelfthPercent,
          maxBacklogs: jobCriteria.maxBacklogs,
          departments: jobCriteria.departments || [],
          degreeRequired: jobCriteria.degreeRequired || null
        },
        emailText: emailText || ''  // ← for vague dept AI resolution
      },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response.data
  } catch (error) {
    console.error('checkEligibility error:', error.message)
    return {
      is_eligible: false,
      checks: {
        cgpa: { required: null, userValue: userProfile.currentCGPA, passed: false },
        tenth: { required: null, userValue: userProfile.tenthPercentage, passed: false },
        twelfth: { required: null, userValue: userProfile.twelfthPercentage, passed: false },
        backlog: { required: null, userValue: userProfile.activeBacklogs, passed: false },
        department: { required: [], userValue: userProfile.department, passed: false },
        degree: { required: null, userValue: userProfile.degree, passed: false }
      },
      failed_reasons: ['Eligibility service unavailable']
    }
  }
}

// Match skills using AI service (pure Python fuzzy + synonym, no AI)
const matchSkills = async (jobSkills, studentSkills) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/match-skills`,
      {
        jobSkills: jobSkills || [],
        studentSkills: studentSkills || []
      },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response.data
  } catch (error) {
    console.error('matchSkills error:', error.message)
    // Local fallback — basic string match
    const normalizedJob = (jobSkills || []).map((s) => s.toLowerCase())
    const normalizedStudent = (studentSkills || []).map((s) => s.toLowerCase())
    const matched = normalizedJob.filter((s) => normalizedStudent.includes(s))
    const missing = normalizedJob.filter((s) => !normalizedStudent.includes(s))
    return {
      match_score: normalizedJob.length
        ? Math.round((matched.length / normalizedJob.length) * 100)
        : 0,
      matched_skills: matched,
      missing_skills: missing
    }
  }
}

// Extract resume text by calling /extract-resume endpoint
// Called once when resume is uploaded — text stored in user.resumeText
// Never called again for same resume — avoids re-parsing cost
const extractResumeText = async (filePath) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/extract-resume`,
      { filePath },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.data && response.data.success) {
      return { text: response.data.text || '' }
    }
    return { text: '' }
  } catch (error) {
    console.error('extractResumeText error:', error.message)
    return { text: '' }
  }
}

// Re-run skill match for ALL opportunities of a user
// Called when user updates skills or uploads new resume from Profile page
// Only updates matchScore, matchedSkills, missingSkills, isRecommended
// Does NOT re-call Groq — only Python skill match endpoint
const rematchAllOpportunities = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const opportunities = await Opportunity.find({ userId })

    let rematched = 0

    for (const opp of opportunities) {
      try {
        // Get required skills from this opportunity
        const jobSkills = [
          ...(opp.matchedSkills || []),
          ...(opp.missingSkills || [])
        ]

        if (jobSkills.length === 0) continue

        const skillMatch = await matchSkills(jobSkills, user.skills || [])

        opp.matchScore = skillMatch.match_score || 0
        opp.matchedSkills = skillMatch.matched_skills || []
        opp.missingSkills = skillMatch.missing_skills || []
        opp.isRecommended =
          (opp.eligibilityResult?.isEligible || false) &&
          (jobSkills.length === 0 ? true : skillMatch.match_score >= 50)

        await opp.save()
        rematched++
      } catch (err) {
        console.error(`Rematch error for opp ${opp._id}:`, err.message)
        continue
      }
    }

    return { rematched, total: opportunities.length }
  } catch (error) {
    console.error('rematchAllOpportunities error:', error.message)
    throw error
  }
}

// Check ML service health
const checkMLHealth = async () => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 })
    return response.status === 200
  } catch (error) {
    console.error('ML health check failed:', error.message)
    return false
  }
}

module.exports = {
  analyzeEmail,
  checkEligibility,
  matchSkills,
  extractResumeText,
  rematchAllOpportunities,
  checkMLHealth
}