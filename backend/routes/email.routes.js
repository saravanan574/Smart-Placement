const express = require('express')
const router = express.Router()
const  protect  = require('../middleware/auth.middleware')
const {
  syncEmails,
  getEmailStats,
  clearEmails,
  getEmails,
  getEmailById,
  reprocessEmail
} = require('../controllers/email.controller')

// All routes are protected
router.use(protect)

// Specific routes before /:id
router.get('/sync', syncEmails)
router.get('/stats', getEmailStats)
router.delete('/clear', clearEmails)

// General routes
router.get('/', getEmails)

// Dynamic routes last
router.get('/:id', getEmailById)
router.post('/:id/reprocess', reprocessEmail)

module.exports = router