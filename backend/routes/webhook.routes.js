const express = require('express')
const router = express.Router()
const { handleGmailPush } = require('../controllers/webhook.controller')

// ---------------------------------------------------------------------------
// POST /api/webhook/gmail
//
// Receives push notifications from Google Cloud Pub/Sub.
// NO auth middleware — Google calls this directly.
// Security handled inside handleGmailPush via GMAIL_WEBHOOK_SECRET.
// ---------------------------------------------------------------------------
router.post('/gmail', handleGmailPush)

module.exports = router