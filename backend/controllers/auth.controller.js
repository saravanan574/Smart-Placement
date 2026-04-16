const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const { sendSuccess, sendError } = require('../utils/responseHelper')
const gmailOAuthService = require('../services/gmailOAuth.service')

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// POST /api/auth/register — unchanged
const register = async (req, res) => {
  try {
    const {
      name, registerNumber, loginEmail, personalEmail, password,
      phoneNumber, degree, department, batchYear, dateOfBirth,
      tenthPercentage, twelfthPercentage, currentCGPA,
      activeBacklogs, historyOfArrears, skills, customDetails
    } = req.body

    if (!name || !registerNumber || !loginEmail || !password) {
      return sendError(res, 'Name, register number, email and password are required', 400)
    }
    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', 400)
    }

    const existingEmail  = await User.findOne({ loginEmail: loginEmail.toLowerCase() })
    if (existingEmail)   return sendError(res, 'Email already registered', 400)

    const existingRegNum = await User.findOne({ registerNumber })
    if (existingRegNum)  return sendError(res, 'Register number already registered', 400)

    const user = await User.create({
      name,
      registerNumber,
      loginEmail:        loginEmail.toLowerCase(),
      personalEmail:     personalEmail ? personalEmail.toLowerCase() : null,
      password,
      phoneNumber:       phoneNumber ? phoneNumber.trim() : null,
      degree:            degree || null,
      department:        department || null,
      batchYear:         batchYear ? String(batchYear) : undefined,
      dateOfBirth:       dateOfBirth ? new Date(dateOfBirth) : undefined,
      tenthPercentage:   tenthPercentage   !== undefined ? Number(tenthPercentage)   : undefined,
      twelfthPercentage: twelfthPercentage !== undefined ? Number(twelfthPercentage) : undefined,
      currentCGPA:       currentCGPA       !== undefined ? Number(currentCGPA)       : undefined,
      activeBacklogs:    activeBacklogs    !== undefined ? Number(activeBacklogs)    : 0,
      historyOfArrears:  historyOfArrears  !== undefined ? Number(historyOfArrears)  : 0,
      skills:            skills       || [],
      customDetails:     customDetails || []
    })

    const token  = generateToken(user._id)
    const userObj = user.toObject()
    delete userObj.password

    return sendSuccess(res, { token, user: userObj }, 'Registration successful', 201)
  } catch (error) {
    console.error('Register error:', error.message)
    return sendError(res, error.message || 'Registration failed', 500)
  }
}

// POST /api/auth/login — unchanged
const login = async (req, res) => {
  try {
    const { loginEmail, password } = req.body

    if (!loginEmail || !password) {
      return sendError(res, 'Email and password are required', 400)
    }

    const user = await User.findOne({ loginEmail: loginEmail.toLowerCase() }).select('+password')
    if (!user) return sendError(res, 'Invalid email or password', 401)

    const isMatch = await user.comparePassword(password)
    if (!isMatch)  return sendError(res, 'Invalid email or password', 401)

    const token  = generateToken(user._id)
    const userObj = user.toObject()
    delete userObj.password

    return sendSuccess(res, { token, user: userObj }, 'Login successful')
  } catch (error) {
    console.error('Login error:', error.message)
    return sendError(res, 'Login failed', 500)
  }
}

// GET /api/auth/profile — unchanged
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)
    return sendSuccess(res, { user }, 'Profile fetched successfully')
  } catch (error) {
    console.error('Get profile error:', error.message)
    return sendError(res, 'Failed to fetch profile', 500)
  }
}

// PUT /api/auth/profile
// UPDATED: now handles specialization, resumeSkills, interestedRoles
const updateProfile = async (req, res) => {
  try {
    const {
      personalEmail, phoneNumber, degree, department,
      specialization,       // NEW — free-type
      batchYear, dateOfBirth,
      tenthPercentage, twelfthPercentage, currentCGPA,
      activeBacklogs, historyOfArrears,
      skills,
      resumeSkills,         // NEW — editable auto-extracted skills from resume
      interestedRoles,      // NEW — free-type role tags
      customDetails
    } = req.body

    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    // String fields
    if (personalEmail  !== undefined) user.personalEmail  = personalEmail  ? personalEmail.toLowerCase() : null
    if (phoneNumber    !== undefined) user.phoneNumber    = phoneNumber    ? phoneNumber.trim() : null
    if (degree         !== undefined) user.degree         = degree         || null
    if (department     !== undefined) user.department     = department     || null
    if (specialization !== undefined) user.specialization = specialization || null  // NEW
    if (batchYear      !== undefined) user.batchYear      = batchYear      ? String(batchYear) : undefined

    if (dateOfBirth !== undefined) {
      const d = new Date(dateOfBirth)
      user.dateOfBirth = isNaN(d.getTime()) ? undefined : d
    }

    // Numeric fields
    if (tenthPercentage   !== undefined) user.tenthPercentage   = Number(tenthPercentage)
    if (twelfthPercentage !== undefined) user.twelfthPercentage = Number(twelfthPercentage)
    if (currentCGPA       !== undefined) user.currentCGPA       = Number(currentCGPA)
    if (activeBacklogs    !== undefined) user.activeBacklogs    = Number(activeBacklogs)
    if (historyOfArrears  !== undefined) user.historyOfArrears  = Number(historyOfArrears)

    // Array fields
    if (skills          !== undefined) user.skills          = skills          // manual skills
    if (resumeSkills    !== undefined) user.resumeSkills    = resumeSkills    // NEW — edited resume skills
    if (interestedRoles !== undefined) user.interestedRoles = interestedRoles // NEW — role targets
    if (customDetails   !== undefined) user.customDetails   = customDetails

    await user.save()
    return sendSuccess(res, { user }, 'Profile updated successfully')
  } catch (error) {
    console.error('Update profile error:', error.message)
    return sendError(res, 'Failed to update profile', 500)
  }
}

// POST /api/auth/profile/resume
// UPDATED: now saves resumeSkills[] extracted by Python alongside resumeText
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400)

    const user = await User.findById(req.user._id)
    if (!user) return sendError(res, 'User not found', 404)

    const resumeUrl  = `/uploads/${req.file.filename}`
    user.resumeUrl   = resumeUrl

    // Extract text AND skills from resume via Python /extract-resume
    // Pure file parsing — no Groq, no AI — just PyMuPDF/python-docx + keyword scan
    try {
      const mlService = require('../services/mlIntegration.service')
      const path      = require('path')
      const fullPath  = path.join(__dirname, '..', 'uploads', req.file.filename)

      const extractResult = await mlService.extractResumeText(fullPath)
      // extractResult = { text: "full resume text...", skills: ["python", "react", ...] }

      if (extractResult.text) {
        user.resumeText = extractResult.text
        // resumeText stores raw text — used by Groq in analyze-email for context
      }

      if (extractResult.skills && extractResult.skills.length > 0) {
        // resumeSkills[] — keyword-matched canonical skill names found in resume
        // Student sees these as editable tags in Profile → Resume Skills section
        // These are MERGED with user.skills[] during job matching (not replacing)
        // Student can delete false positives or add missed skills
        user.resumeSkills = extractResult.skills
      }

    } catch (extractErr) {
      // Non-fatal — resume still saved, just without extracted text/skills
      console.warn('Resume extraction failed (non-fatal):', extractErr.message)
    }

    await user.save()
    return sendSuccess(res, {
      user,
      resumeUrl,
      resumeSkillsCount: user.resumeSkills?.length || 0
    }, 'Resume uploaded successfully')

  } catch (error) {
    console.error('Upload resume error:', error.message)
    return sendError(res, 'Failed to upload resume', 500)
  }
}

// GET /api/auth/google/url — unchanged
const getGoogleAuthUrl = async (req, res) => {
  try {
    const url = gmailOAuthService.getAuthUrl(req.user._id.toString())
    return sendSuccess(res, { url }, 'Google auth URL generated')
  } catch (error) {
    console.error('Get Google auth URL error:', error.message)
    return sendError(res, 'Failed to generate Google auth URL', 500)
  }
}

// GET /api/auth/google/callback — unchanged
const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query

    if (!code)  return res.redirect(`${process.env.CORS_ORIGIN}/connect-gmail?error=no_code`)
    if (!state) return res.redirect(`${process.env.CORS_ORIGIN}/connect-gmail?error=no_state`)

    const tokens = await gmailOAuthService.exchangeCodeForTokens(code)
    await gmailOAuthService.saveTokensToUser(state, tokens)

    // Setup Gmail Watch for push notifications now that Gmail is connected
    try {
      const { setupWatch } = require('../services/gmailPush.service')
      await setupWatch(state) // state = userId
    } catch (watchErr) {
      // Non-fatal — manual sync still works without push
      console.warn('Gmail Watch setup failed (non-fatal):', watchErr.message)
    }

    return res.redirect(`${process.env.CORS_ORIGIN}/dashboard?gmail=connected`)
  } catch (error) {
    console.error('Google callback error:', error.message)
    return res.redirect(`${process.env.CORS_ORIGIN}/connect-gmail?error=callback_failed`)
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadResume,
  getGoogleAuthUrl,
  handleGoogleCallback
}