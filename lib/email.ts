
import nodemailer from "nodemailer"
import { db } from "@/lib/db"

type EmailProvider = "SMTP" | "GMAIL_OAUTH2"

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  // Optional logging metadata
  logType?: "TRIAL_REMINDER" | "TRIAL_EXPIRED" | "PAYMENT_RECEIPT"
  userId?: string
  subscriptionId?: string | null
  scheduledFor?: Date | null
  metadata?: Record<string, any>
}

function resolveProvider(): EmailProvider {
  const hasOAuth = !!(
    process.env.GMAIL_OAUTH_CLIENT_ID &&
    process.env.GMAIL_OAUTH_CLIENT_SECRET &&
    process.env.GMAIL_OAUTH_REFRESH_TOKEN &&
    process.env.GMAIL_USER
  )
  if (hasOAuth) return "GMAIL_OAUTH2"
  return "SMTP"
}

function buildTransport(): nodemailer.Transporter {
  const provider = resolveProvider()
  if (provider === "GMAIL_OAUTH2") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
      },
    })
  }

  // Default: SMTP (works with Gmail App Passwords or any SMTP)
  const host = process.env.SMTP_HOST || "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    console.warn("SMTP_USER/SMTP_PASS not set. Email sending may fail.")
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  })
}

export const sendEmail = async ({ to, subject, html, logType, userId, subscriptionId, scheduledFor, metadata }: SendEmailParams) => {
  const transporter = buildTransport()
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || `Task Manager <no-reply@localhost>`

  const toList = Array.isArray(to) ? to.join(", ") : to

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toList,
      subject,
      html,
    })

    console.log(`✅ Message sent: ${info.messageId}`)

    // Optional: log email send
    if (logType && userId) {
      try {
        await db.emailLog.create({
          data: {
            userId,
            type: logType as any,
            subject,
            to: toList,
            scheduledFor: scheduledFor ?? null,
            sentAt: new Date(),
            metadata: metadata ? (metadata as any) : undefined,
            subscriptionId: subscriptionId ?? undefined,
          },
        })
      } catch (logErr) {
        console.error("⚠️ Failed to log email:", logErr)
      }
    }

    return info
  } catch (error) {
    console.error("❌ Error sending email:", error)
    throw error
  }
}
