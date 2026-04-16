const mongoose = require('mongoose')

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    companyName: { type: String },
    category: {
      type: String,
      enum: ['general', 'company', 'study_group', 'mock_interview'],
      default: 'general'
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isAutoCreated: { type: Boolean, default: false },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }
    ],
    lastMessageAt: { type: Date }
  },
  { timestamps: true }
)

const Community = mongoose.model('Community', communitySchema)

module.exports = Community