const express = require('express')
const router = express.Router()
const  protect  = require('../middleware/auth.middleware')
const {
  getOpportunityStats,
  getDeadlines,
  getRecommended,
  getOpportunities,
  getOpportunityById,
  optInOpportunity,
  updateOpportunityStatus,
  rematchOne,
  rematchAll,addRound, 
  getAllEmails, 
  getSkillGap
} = require('../controllers/opportunity.controller')

// All routes protected
router.use(protect)

// ── Specific routes ALWAYS before /:id ──────────────────────────────────────
router.get('/stats', getOpportunityStats)
router.get('/deadlines', getDeadlines)
router.get('/recommended', getRecommended)
router.post('/rematch-all', rematchAll)   // called from Profile when skills/resume updated

// ── General list route ───────────────────────────────────────────────────────
router.get('/', getOpportunities)

// ── Dynamic routes LAST ──────────────────────────────────────────────────────
router.get('/:id', getOpportunityById)
router.put('/:id/optin', optInOpportunity)
router.put('/:id/status', updateOpportunityStatus)
router.put('/:id/rematch', rematchOne)    // rematch single opportunity

router.post('/:id/round', addRound)
router.get('/:id/all-emails', getAllEmails)
router.get('/analytics/skill-gap', getSkillGap)
module.exports = router