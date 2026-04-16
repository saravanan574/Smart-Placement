const nodemailer = require('nodemailer')

let transporter = null
const getTransporter = () => {
  if (transporter) return transporter
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('MAIL_USER or MAIL_PASS not set — email notifications disabled')
    return null
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  })
  return transporter
}

const sendWhatsApp = async (phoneNumber, message) => {
  try {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return false
    if (!phoneNumber) return false
    const axios = require('axios')
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '')
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      { messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    )
    return true
  } catch (error) {
    console.error('WhatsApp notification error:', error.message)
    return false
  }
}

const sendEmail = async (to, subject, html) => {
  try {
    const t = getTransporter()
    if (!t) return false
    await t.sendMail({
      from: process.env.MAIL_FROM || `SPEI Notifications <${process.env.MAIL_USER}>`,
      to, subject, html
    })
    return true
  } catch (error) {
    console.error('sendEmail error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// NOTIFICATION DB HELPER — creates in-app notification with optional expiry
// keepForever = true for shortlist/offer/rejection (never delete)
// keepForever = false for deadline/optin (delete after 1 month or after event)
// ---------------------------------------------------------------------------
const createNotification = async (data, keepForever = false) => {
  try {
    const Notification = require('../models/Notification.model')
    const expiresAt = keepForever ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    return await Notification.create({ ...data, expiresAt })
  } catch (err) {
    console.error('createNotification error:', err.message)
  }
}

// ---------------------------------------------------------------------------
// SHORTLIST NOTIFICATION
// ---------------------------------------------------------------------------
const sendShortlistNotification = async (user, companyName, nextRoundType = null, nextRoundDate = null, detectionSource = null) => {
  try {
    const detectedVia = detectionSource ? `<p style="color:#6B7280;font-size:13px;">Detected via: <strong>${detectionSource}</strong></p>` : ''
    const nextRoundInfo = nextRoundType
      ? `<p style="color:#1F4E79;font-weight:600;">Next Step: ${nextRoundType}${nextRoundDate ? ` on ${new Date(nextRoundDate).toLocaleDateString('en-IN')}` : ''}</p>`
      : ''

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:#1F4E79;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">🎉 You're Shortlisted!</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#374151;">Congratulations! You have been <strong>shortlisted at ${companyName}</strong>.</p>
          ${detectedVia}
          ${nextRoundInfo}
          <p style="color:#374151;">Login to SPEI to track your progress and join the ${companyName} community.</p>
          <a href="${process.env.CORS_ORIGIN}/applied" style="display:inline-block;background:#1F4E79;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View in SPEI →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">This is an automated notification from SPEI.</p>
        </div>
      </div>`

    const emailTargets = [user.loginEmail]
    if (user.personalEmail) emailTargets.push(user.personalEmail)
    for (const emailTo of emailTargets) {
      await sendEmail(emailTo, `🎉 Shortlisted at ${companyName} — SPEI Alert`, html)
    }
    if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, `🎉 SPEI Alert: You are shortlisted at *${companyName}*!${nextRoundType ? `\nNext step: ${nextRoundType}` : ''}\n\nLogin to SPEI to view details.`)
    }
    return true
  } catch (error) {
    console.error('sendShortlistNotification error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// REJECTION NOTIFICATION
// ---------------------------------------------------------------------------
const sendRejectionNotification = async (user, companyName) => {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:#DC2626;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">Application Update</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#374151;">Your application at <strong>${companyName}</strong> was not successful at this stage.</p>
          <p style="color:#374151;">Don't be discouraged — keep applying! SPEI will continue monitoring for new opportunities.</p>
          <a href="${process.env.CORS_ORIGIN}/dashboard" style="display:inline-block;background:#2E75B6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Find More Opportunities →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">This is an automated notification from SPEI.</p>
        </div>
      </div>`

    const emailTargets = [user.loginEmail]
    if (user.personalEmail) emailTargets.push(user.personalEmail)
    for (const emailTo of emailTargets) {
      await sendEmail(emailTo, `Application Update: ${companyName} — SPEI`, html)
    }
    if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, `SPEI Update: Your application at *${companyName}* was not successful. Keep going — more opportunities await!\n\nLogin to SPEI to find new opportunities.`)
    }
    return true
  } catch (error) {
    console.error('sendRejectionNotification error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// ROUND REMINDER NOTIFICATION — sent before each scheduled round
// type: '1week' | '3days' | '1day' | '1hour'
// ---------------------------------------------------------------------------
const sendRoundReminder = async (user, companyName, roundType, roundDate, roundVenue, reminderType) => {
  try {
    const timeLabels = { '1week': '1 Week', '3days': '3 Days', '1day': 'Tomorrow', '1hour': '1 Hour' }
    const urgencyColors = { '1week': '#2E75B6', '3days': '#D97706', '1day': '#DC6803', '1hour': '#DC2626' }
    const label = timeLabels[reminderType] || reminderType
    const color = urgencyColors[reminderType] || '#1F4E79'
    const formattedDate = new Date(roundDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:${color};padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">⏰ Round Reminder — ${label} Away!</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#374151;">Your <strong>${roundType}</strong> round at <strong>${companyName}</strong> is <strong>${label} away</strong>.</p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#0369a1;"><strong>Company:</strong> ${companyName}</p>
            <p style="margin:4px 0 0;color:#0369a1;"><strong>Round:</strong> ${roundType}</p>
            <p style="margin:4px 0 0;color:#0369a1;"><strong>When:</strong> ${formattedDate}</p>
            ${roundVenue ? `<p style="margin:4px 0 0;color:#0369a1;"><strong>Where:</strong> ${roundVenue}</p>` : ''}
          </div>
          <p style="color:#374151;font-weight:600;">Preparation tips:</p>
          <ul style="color:#374151;">
            <li>Review the company's products and recent news</li>
            <li>Practice common interview questions</li>
            <li>Check your preparation links in SPEI</li>
          </ul>
          <a href="${process.env.CORS_ORIGIN}/applied" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View in SPEI →</a>
        </div>
      </div>`

    const emailTargets = [user.loginEmail]
    if (user.personalEmail) emailTargets.push(user.personalEmail)
    for (const emailTo of emailTargets) {
      await sendEmail(emailTo, `⏰ ${label} until ${roundType} at ${companyName} — SPEI Reminder`, html)
    }
    if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, `⏰ SPEI Reminder: Your *${roundType}* at *${companyName}* is *${label} away*!\n📅 ${formattedDate}${roundVenue ? `\n📍 ${roundVenue}` : ''}\n\nGood luck! Check SPEI for prep links.`)
    }
    return true
  } catch (error) {
    console.error('sendRoundReminder error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// OFFER NOTIFICATION — to student + placement cell
// ---------------------------------------------------------------------------
const sendOfferNotification = async (user, companyName, salary = null) => {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:#16A34A;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">🎊 Offer Received!</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#374151;">You have received an <strong>offer from ${companyName}</strong>!</p>
          ${salary ? `<p style="color:#16A34A;font-size:18px;font-weight:600;">💰 ${salary}</p>` : ''}
          <a href="${process.env.CORS_ORIGIN}/applied" style="display:inline-block;background:#16A34A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Offer in SPEI →</a>
        </div>
      </div>`

    const emailTargets = [user.loginEmail]
    if (user.personalEmail) emailTargets.push(user.personalEmail)
    for (const emailTo of emailTargets) {
      await sendEmail(emailTo, `🎊 Offer from ${companyName} — SPEI Alert`, html)
    }
    if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, `🎊 SPEI Alert: You received an offer from *${companyName}*!${salary ? `\nPackage: ${salary}` : ''}\n\nLogin to SPEI to view details.`)
    }

    // Notify placement cell
    if (process.env.MAIL_USER) {
      const placementHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#16A34A;">🎊 Placement Success — SPEI</h2>
          <p><strong>${user.name}</strong> (${user.loginEmail}, ${user.registerNumber || 'N/A'}) has received an offer from <strong>${companyName}</strong>.</p>
          ${salary ? `<p><strong>Package:</strong> ${salary}</p>` : ''}
          <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
          <p><strong>Batch:</strong> ${user.batchYear || 'N/A'}</p>
          <p style="color:#9ca3af;font-size:12px;">Automated notification from SPEI placement tracking system.</p>
        </div>`
      await sendEmail(process.env.MAIL_USER, `Placement Offer: ${user.name} — ${companyName}`, placementHtml)
    }

    return true
  } catch (error) {
    console.error('sendOfferNotification error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// DEADLINE NOTIFICATIONS
// Called: (1) immediately when deadline detected, (2) 1 day before, (3) 1 hour before
// ---------------------------------------------------------------------------
const sendDeadlineNotification = async (user, opportunity, type = 'detected') => {
  try {
    const labels = { detected: 'New Deadline Detected', '1day': 'Deadline Tomorrow!', '1hour': 'Deadline in 1 Hour!' }
    const colors = { detected: '#2E75B6', '1day': '#D97706', '1hour': '#DC2626' }
    const label = labels[type] || 'Deadline Reminder'
    const color = colors[type] || '#1F4E79'
    const deadline = new Date(opportunity.deadline)
    const formattedDeadline = deadline.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:${color};padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">⏰ ${label}</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#92400e;"><strong>Company:</strong> ${opportunity.companyName}</p>
            <p style="margin:4px 0 0;color:#92400e;"><strong>Role:</strong> ${opportunity.jobRole}</p>
            <p style="margin:4px 0 0;color:#92400e;"><strong>Deadline:</strong> ${formattedDeadline}</p>
            ${opportunity.salary ? `<p style="margin:4px 0 0;color:#92400e;"><strong>Salary:</strong> ${opportunity.salary}</p>` : ''}
          </div>
          ${opportunity.applyLink ? `<a href="${opportunity.applyLink}" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px;">Apply Now →</a>` : ''}
          <a href="${process.env.CORS_ORIGIN}/deadlines" style="display:inline-block;background:#1F4E79;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View in SPEI →</a>
        </div>
      </div>`

    const emailTargets = [user.loginEmail]
    if (user.personalEmail) emailTargets.push(user.personalEmail)
    for (const emailTo of emailTargets) {
      await sendEmail(emailTo, `⏰ ${label}: ${opportunity.companyName} — SPEI`, html)
    }
    if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, `⏰ SPEI: ${label} — *${opportunity.companyName}* (${opportunity.jobRole})\n📅 ${formattedDeadline}${opportunity.applyLink ? `\nApply: ${opportunity.applyLink}` : ''}`)
    }
    return true
  } catch (error) {
    console.error('sendDeadlineNotification error:', error.message)
    return false
  }
}

// Keep old name as alias for backward compatibility
const sendDeadlineReminder = (user, opportunity) => sendDeadlineNotification(user, opportunity, '1day')

// ---------------------------------------------------------------------------
// NEW OPPORTUNITY NOTIFICATION
// ---------------------------------------------------------------------------
const sendNewOpportunityNotification = async (user, companyName, jobRole, deadline = null) => {
  try {
    const deadlineText = deadline
      ? `<p style="color:#1e40af;margin:4px 0 0;"><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-IN')}</p>`
      : ''
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:#2E75B6;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">📋 New Opportunity</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="color:#374151;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#1e40af;"><strong>Company:</strong> ${companyName}</p>
            <p style="margin:4px 0 0;color:#1e40af;"><strong>Role:</strong> ${jobRole}</p>
            ${deadlineText}
          </div>
          <a href="${process.env.CORS_ORIGIN}/dashboard" style="display:inline-block;background:#2E75B6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Check Eligibility →</a>
        </div>
      </div>`
    await sendEmail(user.loginEmail, `📋 New Opportunity: ${companyName} — SPEI`, html)
    return true
  } catch (error) {
    console.error('sendNewOpportunityNotification error:', error.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// CRON: DEADLINE REMINDERS — run hourly, checks for 1day and 1hour windows
// ---------------------------------------------------------------------------
const runDeadlineReminders = async () => {
  try {
    const Opportunity = require('../models/Opportunity.model')
    const User        = require('../models/User.model')
    const Notification = require('../models/Notification.model')
    const now = new Date()

    // 1 day window: deadlines 23-25 hours from now
    const oneDayFrom  = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const oneDayTo    = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    // 1 hour window: deadlines 50-70 mins from now
    const oneHourFrom = new Date(now.getTime() + 50 * 60 * 1000)
    const oneHourTo   = new Date(now.getTime() + 70 * 60 * 1000)

    const oneDayOpps  = await Opportunity.find({ deadline: { $gte: oneDayFrom,  $lte: oneDayTo  }, 'eligibilityResult.isEligible': true, isOptedIn: false })
    const oneHourOpps = await Opportunity.find({ deadline: { $gte: oneHourFrom, $lte: oneHourTo }, 'eligibilityResult.isEligible': true, isOptedIn: false })

    for (const opp of oneDayOpps) {
      try {
        const user = await User.findById(opp.userId)
        if (!user) continue
        const alreadySent = await Notification.findOne({ userId: opp.userId, relatedOpportunityId: opp._id, title: { $regex: '1 day' } })
        if (!alreadySent) {
          await sendDeadlineNotification(user, opp, '1day')
          await createNotification({ userId: opp.userId, type: 'deadline', title: `Deadline in 1 day: ${opp.companyName}`, message: `Application deadline for ${opp.companyName} is tomorrow.`, relatedOpportunityId: opp._id, priority: 'high' }, false)
        }
      } catch (err) { console.error('1day deadline reminder error:', err.message) }
    }

    for (const opp of oneHourOpps) {
      try {
        const user = await User.findById(opp.userId)
        if (!user) continue
        const alreadySent = await Notification.findOne({ userId: opp.userId, relatedOpportunityId: opp._id, title: { $regex: '1 hour' } })
        if (!alreadySent) {
          await sendDeadlineNotification(user, opp, '1hour')
          await createNotification({ userId: opp.userId, type: 'deadline', title: `Deadline in 1 hour: ${opp.companyName}`, message: `Application deadline for ${opp.companyName} is in 1 hour!`, relatedOpportunityId: opp._id, priority: 'high' }, false)
        }
      } catch (err) { console.error('1hour deadline reminder error:', err.message) }
    }

    return oneDayOpps.length + oneHourOpps.length
  } catch (error) {
    console.error('runDeadlineReminders error:', error.message)
    return 0
  }
}

// ---------------------------------------------------------------------------
// CRON: ROUND REMINDERS — run hourly
// Checks opportunities with nextRoundDate and sends reminders at 1week/3days/1day/1hour
// ---------------------------------------------------------------------------
const runRoundReminders = async () => {
  try {
    const Opportunity  = require('../models/Opportunity.model')
    const User         = require('../models/User.model')
    const Notification = require('../models/Notification.model')
    const now = new Date()

    const windows = [
      { label: '1week',  from: now.getTime() + 6.5 * 24 * 60 * 60 * 1000,  to: now.getTime() + 7.5 * 24 * 60 * 60 * 1000  },
      { label: '3days',  from: now.getTime() + 2.5 * 24 * 60 * 60 * 1000,  to: now.getTime() + 3.5 * 24 * 60 * 60 * 1000  },
      { label: '1day',   from: now.getTime() + 23    * 60 * 60 * 1000,      to: now.getTime() + 25    * 60 * 60 * 1000     },
      { label: '1hour',  from: now.getTime() + 50    * 60 * 1000,           to: now.getTime() + 70    * 60 * 1000          }
    ]

    for (const window of windows) {
      const opps = await Opportunity.find({
        nextRoundDate: { $gte: new Date(window.from), $lte: new Date(window.to) },
        isShortlisted: true,
        applicationStatus: { $in: ['shortlisted', 'test_scheduled', 'interview_scheduled'] }
      })

      for (const opp of opps) {
        try {
          const user = await User.findById(opp.userId)
          if (!user) continue
          const alreadySent = await Notification.findOne({
            userId: opp.userId, relatedOpportunityId: opp._id,
            title: { $regex: `${window.label}.*${opp.companyName}` }
          })
          if (!alreadySent) {
            await sendRoundReminder(user, opp.companyName, opp.nextRoundType || 'Round', opp.nextRoundDate, opp.nextRoundVenue, window.label)
            await createNotification({
              userId: opp.userId, type: 'status_update',
              title: `${window.label} until ${opp.nextRoundType || 'Round'} at ${opp.companyName}`,
              message: `Your ${opp.nextRoundType || 'round'} at ${opp.companyName} is ${window.label} away. Prepare well!`,
              relatedOpportunityId: opp._id, priority: window.label === '1hour' || window.label === '1day' ? 'high' : 'medium'
            }, true) // keep round reminders forever
          }
        } catch (err) { console.error('Round reminder error:', err.message) }
      }
    }
  } catch (error) {
    console.error('runRoundReminders error:', error.message)
  }
}

// ---------------------------------------------------------------------------
// CRON: CLEANUP EXPIRED NOTIFICATIONS
// Deletes notifications where expiresAt < now
// ---------------------------------------------------------------------------
const runNotificationCleanup = async () => {
  try {
    const Notification = require('../models/Notification.model')
    const result = await Notification.deleteMany({
      expiresAt: { $ne: null, $lt: new Date() }
    })
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired notifications`)
    }
    return result.deletedCount
  } catch (error) {
    console.error('runNotificationCleanup error:', error.message)
    return 0
  }
}

module.exports = {
  sendEmail,
  sendShortlistNotification,
  sendRejectionNotification,
  sendRoundReminder,
  sendOfferNotification,
  sendDeadlineNotification,
  sendDeadlineReminder,          // backward compat alias
  sendNewOpportunityNotification,
  createNotification,
  runDeadlineReminders,
  runRoundReminders,
  runNotificationCleanup
}