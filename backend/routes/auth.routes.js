const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const  protect  = require('../middleware/auth.middleware')
const {
  register,
  login,
  getProfile,
  updateProfile,
  uploadResume,
  getGoogleAuthUrl,
  handleGoogleCallback
} = require('../controllers/auth.controller')

// Multer storage config for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

// Public routes
router.post('/register', register)
router.post('/login', login)
router.get('/google/callback', handleGoogleCallback)

// Protected routes
router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)
router.post('/profile/resume', protect, upload.single('resume'), uploadResume)
router.get('/google/url', protect, getGoogleAuthUrl)

module.exports = router