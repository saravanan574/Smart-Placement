const mongoose = require('mongoose')

const emailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messageId: { type: String, required: true},
    threadId: { type: String },
    subject: { type: String, required: true },
    from: {
      email: { type: String },
      name: { type: String }
    },
    to: [
      {
        email: { type: String },
        name: { type: String }
      }
    ],
    date: { type: Date, required: true, index: true },
    snippet: { type: String },
    textBody: { type: String },
    htmlBody: { type: String },
    attachments: [
      {
        filename: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        attachmentId: { type: String }
      }
    ],
    category: {
      type: String,
      enum: [
        'internship',
        'fulltime',
        'interview',
        'shortlist',
        'rejection',
        'offer',
        'deadline',
        'assessment',
        'training',
        'general',
        'unclassified'
      ],
      default: 'unclassified'
    },
    isPlacementRelated: { type: Boolean, default: false, index: true },
    isProcessed: { type: Boolean, default: false },
    processedAt: { type: Date },
    aiConfidence: { type: Number, min: 0, max: 1 },
    emailTypeExplanation: { type: String },
    extractedInfo: {
      companyName: { type: String },
      jobRole: { type: String },
      deadline: { type: Date },
      requiredSkills: [{ type: String }],
      minCGPA: { type: Number },
      minTenthPercent: { type: Number },
      minTwelfthPercent: { type: Number },
      maxBacklogs: { type: Number },
      departments: [{ type: String }]
    }
  },
  { timestamps: true }
)
emailSchema.index({messageId: 1, userId: 1 }, { unique: true})
const Email = mongoose.model('Email', emailSchema)

module.exports = Email