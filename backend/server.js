require('dotenv').config()
const express = require('express')
const http    = require('http')
const socketIO = require('socket.io')
const cors   = require('cors')
const morgan = require('morgan')
const path   = require('path')
const fs     = require('fs')

const connectDB = require('./config/database')
const { initSocketHandler } = require('./sockets/socket.handler')

const settingsRoutes     = require('./routes/settings.routes')
const authRoutes         = require('./routes/auth.routes')
const emailRoutes        = require('./routes/email.routes')
const opportunityRoutes  = require('./routes/opportunity.routes')
const communityRoutes    = require('./routes/community.routes')
const notificationRoutes = require('./routes/notification.routes')
const webhookRoutes      = require('./routes/webhook.routes')

const app    = express()
const server = http.createServer(app)

const io = socketIO(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST'], credentials: true }
})
app.set('io', io)

connectDB()

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

const uploadsDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads')
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }) }
app.use('/uploads', express.static(uploadsDir))

// Webhook FIRST — no auth
app.use('/api/webhook', webhookRoutes)

app.use('/api/auth',          authRoutes)
app.use('/api/emails',        emailRoutes)
app.use('/api/opportunities', opportunityRoutes)
app.use('/api/community',     communityRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/settings',      settingsRoutes)

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'SPEI Backend is running', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development' })
})

app.use((req, res) => { res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }) })

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack)
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File size too large.' })
  if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(', ') })
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` })
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' })
  if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' })
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' })
})

initSocketHandler(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, async () => {
  console.log(`SPEI Backend running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`)
  console.log(`ML Service:  ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`)

  try {
    const { initWatchForAllUsers } = require('./services/gmailPush.service')
    await initWatchForAllUsers()
  } catch (err) {
    console.warn('Gmail Watch init warning:', err.message)
  }

  startCronJobs()
})

const startCronJobs = () => {
  // Deadline + round reminders — run every hour
  scheduleCron('0 * * * *', async () => {
    try {
      const { runDeadlineReminders, runRoundReminders } = require('./services/notification.service')
      await runDeadlineReminders()
      await runRoundReminders()
    } catch (err) { console.error('Reminder cron error:', err.message) }
  }, 'Deadline + Round reminders (hourly)')

  // Notification cleanup — run daily at 2AM
  scheduleCron('0 2 * * *', async () => {
    try {
      const { runNotificationCleanup } = require('./services/notification.service')
      await runNotificationCleanup()
    } catch (err) { console.error('Notification cleanup cron error:', err.message) }
  }, 'Notification cleanup (daily)')

  // Gmail Watch renewal — daily at 3AM
  scheduleCron('0 3 * * *', async () => {
    try {
      const { renewWatchForAllUsers } = require('./services/gmailPush.service')
      await renewWatchForAllUsers()
    } catch (err) { console.error('Gmail Watch renewal cron error:', err.message) }
  }, 'Gmail Watch renewal')
}

const scheduleCron = (cronExpression, task, name) => {
  try {
    const cron = require('node-cron')
    cron.schedule(cronExpression, task)
    console.log(`Cron scheduled: ${name} (${cronExpression})`)
  } catch (err) {
    console.warn(`node-cron not found — running "${name}" every hour instead`)
    setInterval(task, 60 * 60 * 1000)
  }
}

process.on('unhandledRejection', (err) => { console.error('Unhandled Promise Rejection:', err.message); server.close(() => process.exit(1)) })
process.on('uncaughtException',  (err) => { console.error('Uncaught Exception:', err.message); process.exit(1) })

module.exports = { app, server, io }