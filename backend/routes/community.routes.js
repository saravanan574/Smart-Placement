const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const  protect = require('../middleware/auth.middleware')
const {
  getSuggestions,
  getDMConversation,
  sendDM,
  getCommunities,
  createCommunity,
  getCommunityById,
  getCommunityMessages,
  sendMessage,
  joinCommunity,
  leaveCommunity,
  pinMessage
} = require('../controllers/community.controller')

// Multer storage config for file uploads in chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('File type not allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

// All routes are protected
router.use(protect)

// Specific routes before /:id
router.get('/suggestions', getSuggestions)
router.get('/dm/:userId', getDMConversation)
router.post('/dm/:userId', sendDM)

// General routes
router.get('/', getCommunities)
router.post('/', createCommunity)

// Dynamic routes last
router.get('/:id', getCommunityById)
router.get('/:id/messages', getCommunityMessages)
router.post('/:id/messages', upload.single('file'), sendMessage)
router.post('/:id/join', joinCommunity)
router.post('/:id/leave', leaveCommunity)
router.post('/:id/pin/:messageId', pinMessage)

module.exports = router