const mongoose = require('mongoose')

const opportunitySchema = new mongoose.Schema(
  {
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    companyName: { type: String, required: true },
    jobRole: { type: String, required: true },
    jobType: {
      type: String,
      enum: ['internship', 'fulltime', 'contract'],
      required: true
    },
    location: { type: String, default: null },
    salary: { type: String, default: null },
    deadline: { type: Date, index: true },
    jobDescription: { type: String, default: null },
    workMode: { type: String, default: null },
    batchYear: { type: String, default: null },
    applyLink: { type: String, default: null },

    // Company intelligence — new
    companyType: {
      type: String,
      enum: ['product', 'service', 'startup', 'MNC', null],
      default: null
    },
    companyDescription: { type: String, default: null },
    isDreamCompany: { type: Boolean, default: false },

    // Bond details — new
    bondYears: { type: Number, default: null },
    bondAmount: { type: String, default: null },

    // Degree requirement — new
    degreeRequired: { type: String, default: null },

    // Extended skills — new
    goodToHaveSkills: [{ type: String }],
    techStack: [{ type: String }],

    // Next round info — new (for shortlist/interview emails)
    nextRoundType: { type: String, default: null },
    nextRoundDate: { type: Date, default: null },
    nextRoundVenue: { type: String, default: null },

    // Shortlist matched field — new (which user field was found in email)
    matchedField: { type: String, default: null },

    eligibilityResult: {
      isEligible: { type: Boolean },
      cgpaCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      tenthCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      twelfthCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      backlogCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      departmentCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      // Degree check — new
      degreeCheck: {
        required: { type: mongoose.Schema.Types.Mixed },
        userValue: { type: mongoose.Schema.Types.Mixed },
        passed: { type: Boolean }
      },
      failedReasons: [{ type: String }]
    },
    matchScore: { type: Number, min: 0, max: 100, index: true },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    isRecommended: { type: Boolean, index: true },
    applySuggestion: {
      type: String,
      enum: ['apply', 'maybe', 'skip','meets all', null],
      default: null
    },
    
    applySuggestionReason: { type: String, default: null },
    applicationStatus: {
      type: String,
      enum: [
        'not_applied',
        'applied',
        'shortlisted',
        'test_scheduled',
        'interview_scheduled',
        'offered',
        'rejected',
        'accepted',
        'declined'
      ],
      default: 'not_applied'
    },
    isOptedIn: { type: Boolean, default: false },
    isShortlisted: { type: Boolean, default: false },
    shortlistNotified: { type: Boolean, default: false },
    roundDetailsMissing: { type: Boolean, default: false },
    allEmailIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
    companyEmailDomain: { type: String, default: null },
    roundHistory: [{
      roundType:   { type: String },
      roundDate:   { type: Date },
      venue:       { type: String },
      result:      { type: String, enum: ['passed', 'failed', 'pending'], default: 'pending' },
      notes:       { type: String },
      detectedAt:  { type: Date, default: Date.now },
      source:      { type: String, enum: ['email', 'manual'], default: 'email' }
    }],
    currentRound:     { type: Number, default: 0 },
    detectionSource:  { type: String, default: null },
    // preparationLinks MUST be array of objects — never [String]
    preparationLinks: [
      {
        title: { type: String },
        url: { type: String },
        type: { type: String }
      }
    ]
  },
  { timestamps: true }
)

const Opportunity = mongoose.model('Opportunity', opportunitySchema)
module.exports = Opportunity
