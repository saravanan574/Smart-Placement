// ============================================================
// backend/routes/settings.routes.js
// ============================================================
const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth.middleware')
const {
  getSettings,
  changePassword,
  updateContact,
  updateNotifications,
  disconnectGmail,
  deleteAccount
} = require('../controllers/settings.controller')

// All routes protected by auth middleware
router.get('/',                    auth, getSettings)
router.put('/password',            auth, changePassword)
router.put('/contact',             auth, updateContact)
router.put('/notifications',       auth, updateNotifications)
router.post('/gmail/disconnect',   auth, disconnectGmail)
router.delete('/account',          auth, deleteAccount)

module.exports = router

// ============================================================
// ADD TO backend/models/User.model.js — inside userSchema
// Add this field after whatsappNumber:
// ============================================================
//
//   notifPreferences: {
//     shortlist: { type: Boolean, default: true  },
//     offer:     { type: Boolean, default: true  },
//     deadline:  { type: Boolean, default: true  },
//     rejected:  { type: Boolean, default: true  },
//     newMatch:  { type: Boolean, default: false }
//   }
//
// ============================================================
// ADD TO backend/server.js — inside API Routes section:
// ============================================================
//
//   const settingsRoutes = require('./routes/settings.routes')
//   app.use('/api/settings', settingsRoutes)
//
// ============================================================
// ADD TO frontend/src/services/api.js — inside exports:
// ============================================================
//
// export const settingsAPI = {
//   get:                 ()     => api.get('/settings'),
//   changePassword:      (data) => api.put('/settings/password', data),
//   updateContact:       (data) => api.put('/settings/contact', data),
//   updateNotifications: (data) => api.put('/settings/notifications', data),
//   disconnectGmail:     ()     => api.post('/settings/gmail/disconnect'),
//   deleteAccount:       (data) => api.delete('/settings/account', { data })
// }
//
// ============================================================