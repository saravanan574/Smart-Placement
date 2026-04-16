const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const {
  getNotifications,
  markAllAsRead,
  markOneAsRead
} = require('../controllers/notification.controller')

// All routes are protected
router.use(protect)

// Specific routes before /:id
router.get('/', getNotifications)
router.put('/read-all', markAllAsRead)

// Dynamic routes last
router.put('/:id/read', markOneAsRead)

module.exports = router