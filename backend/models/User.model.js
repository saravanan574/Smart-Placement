const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    loginEmail: { type: String, required: true, unique: true, lowercase: true },
    personalEmail: { type: String, lowercase: true, default: null },
    password: { type: String, required: true, select: false, minlength: 8 },
    phoneNumber: { type: String, default: null, trim: true },

    // ── Academic — FREE-TYPE strings (no enum, any department/degree/spec) ─
    degree: {
      type: String,
      trim: true,
      default: null
      // Examples: B.E, B.Tech, M.Tech, MBA, MCA, Diploma, B.Sc, M.E, Ph.D
      // Student types freely — no dropdown restriction
    },
    department: {
      type: String,
      trim: true,
      default: null
      // Examples: CSE, IT, ECE, EEE, MECH, CIVIL, Chemical, Biotech, MBA
      // Student types freely — supports any department
    },
    specialization: {
      type: String,
      trim: true,
      default: null
      // Examples: VLSI Design, Structural Engineering, Data Science, Power Systems
      // Student types freely — no fixed list
    },
    batchYear: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    tenthPercentage: { type: Number, min: 0, max: 100, default: null },
    twelfthPercentage: { type: Number, min: 0, max: 100, default: null },
    currentCGPA: { type: Number, min: 0, max: 10, default: null },
    activeBacklogs: { type: Number, default: 0, min: 0 },
    historyOfArrears: { type: Number, default: 0, min: 0 },

    // ── Skills — FREE-TYPE tags ───────────────────────────────────────────
    skills: [{ type: String, trim: true }],
    // Student types and adds skills manually (tag input — press Enter to add)
    // Any skill from any domain: Python, VLSI, SolidWorks, STAAD Pro, Power BI, etc.

    resumeSkills: [{ type: String, trim: true }],
    // Auto-extracted from uploaded resume by Python /extract-resume endpoint
    // Shown as editable tags in Profile — student can add/remove after extraction
    // Merged with skills[] during skill matching for best coverage

    interestedRoles: [{ type: String, trim: true }],
    // Job roles student is interested in — FREE-TYPE tag input
    // Examples: SDE, Data Analyst, VLSI Engineer, Site Engineer, Product Manager
    // Used to boost skill match score when job role matches an interested role

    // ── Resume ───────────────────────────────────────────────────────────
    resumeUrl: { type: String, default: null },
    resumeText: { type: String, default: null },
    // Full extracted text from resume PDF/DOCX — stored for skill matching context

    // ── Profile & Custom ─────────────────────────────────────────────────
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    customDetails: [{ key: String, value: String }],
    // Flexible key-value pairs for any extra info (e.g. certifications, projects)

    // ── Google / Gmail ───────────────────────────────────────────────────
    googleAccount: {
      email: { type: String, default: null },
      accessToken: { type: String, select: false, default: null },
      refreshToken: { type: String, select: false, default: null },
      isConnected: { type: Boolean, default: false },
      lastSyncedAt: { type: Date, default: null }
    },
    gmailHistoryId: {
      type: String,
      default: null
      // Stores the last processed Gmail historyId for push sync
      // Updated after every successful push-triggered sync
      // Used by gmailPush.service.js to fetch only NEW emails since last sync
    },
    gmailWatchExpiry: {
      type: Date,
      default: null
      // Gmail Watch subscriptions expire every 7 days
      // Cron job in server.js checks this and calls setupWatch() to renew
    },

    // ── Notification Preferences ─────────────────────────────────────────
    notifEmail: {
      type: Boolean,
      default: true
      // Send email notifications for shortlists, offers, deadlines
    },
    notifWhatsApp: {
      type: Boolean,
      default: false
      // Send WhatsApp notifications via Meta Cloud API
    },
    whatsappNumber: {
      type: String,
      default: null,
      trim: true
      // Student's WhatsApp number with country code e.g. +919876543210
      // Required if notifWhatsApp is true
    },
    notifPreferences: {
          shortlist: { type: Boolean, default: true  },
          offer:     { type: Boolean, default: true  },
          deadline:  { type: Boolean, default: true  },
          rejected:  { type: Boolean, default: true  },
          newMatch:  { type: Boolean, default: false }
        }
  },
  { timestamps: true }
)

// ── Pre-save hook: hash password + calculate profile completion ─────────────
userSchema.pre('save', async function (next) {
  // Profile completion — 20 fields total
  // Includes original 16 + specialization, resumeSkills, interestedRoles, gmailConnected
  const fields = [
    this.name,
    this.registerNumber,
    this.loginEmail,
    this.personalEmail,
    this.phoneNumber,
    this.degree,
    this.department,
    this.specialization,
    this.batchYear,
    this.tenthPercentage !== undefined && this.tenthPercentage !== null ? this.tenthPercentage : null,
    this.twelfthPercentage !== undefined && this.twelfthPercentage !== null ? this.twelfthPercentage : null,
    this.currentCGPA !== undefined && this.currentCGPA !== null ? this.currentCGPA : null,
    this.skills && this.skills.length > 0 ? true : null,
    this.resumeUrl,
    this.resumeText,
    this.resumeSkills && this.resumeSkills.length > 0 ? true : null,
    this.interestedRoles && this.interestedRoles.length > 0 ? true : null,
    this.customDetails && this.customDetails.length > 0 ? true : null,
    this.googleAccount && this.googleAccount.isConnected ? true : null,
    this.whatsappNumber
  ]

  let filledCount = 0
  fields.forEach((field) => {
    if (field !== null && field !== undefined && field !== '') filledCount++
  })

  this.profileCompletion = Math.round((filledCount / 20) * 100)

  // Hash password only if modified
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// ── Instance method: compare password ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)
module.exports = User