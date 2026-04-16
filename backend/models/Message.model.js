const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    content: { type: String },
    messageType: {
      type: String,
      enum: ['text', 'file', 'image'],
      default: 'text'
    },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileMimeType: { type: String, default: null },
    isPrivate: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false }
  },
  { timestamps: true }
)

const Message = mongoose.model('Message', messageSchema)

module.exports = Message