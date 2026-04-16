const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'shortlist',
        'deadline',
        'new_opportunity',
        'community',
        'status_update'
      ],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null
    },
    relatedCommunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null
    },
    isRead: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    expiresAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
)

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = Notification