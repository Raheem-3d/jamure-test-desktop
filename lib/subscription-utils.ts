import { addDays, addYears, isAfter } from "date-fns"

export const IST_TZ = "Asia/Kolkata"
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+05:30, no DST

// Get current time as UTC Date corresponding to now in IST
export function getIstNowUtc(): Date {
  const nowUtc = new Date()
  // Anchor to IST clock then return UTC equivalent
  const istNowClock = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  return new Date(istNowClock.getTime() - IST_OFFSET_MS)
}

export function toIst(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS)
}

export function fromIstToUtc(dateInIst: Date): Date {
  return new Date(dateInIst.getTime() - IST_OFFSET_MS)
}

export function computeTrialWindow(nowUtc: Date): { trialStartUtc: Date; trialEndUtc: Date } {
  const trialStartIst = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  const trialEndIst = addDays(trialStartIst, 14)
  return {
    trialStartUtc: new Date(trialStartIst.getTime() - IST_OFFSET_MS),
    trialEndUtc: new Date(trialEndIst.getTime() - IST_OFFSET_MS),
  }
}

export function computeOneYearPeriodEnd(baseUtc: Date): Date {
  const istBase = new Date(baseUtc.getTime() + IST_OFFSET_MS)
  const endIst = addYears(istBase, 1)
  return new Date(endIst.getTime() - IST_OFFSET_MS)
}

// Reminder schedule relative to trial end
// Offsets (in hours): 7d, 3d, 1d, 12h before, and 0h (at expiry)
const OFFSETS_HOURS = [-7 * 24, -3 * 24, -24, -12, 0]

export function getReminderScheduleUtc(trialEndUtc: Date): Date[] {
  const trialEndIst = new Date(trialEndUtc.getTime() + IST_OFFSET_MS)
  return OFFSETS_HOURS.map((h) => {
    const scheduledIst = new Date(trialEndIst.getTime() + h * 60 * 60 * 1000)
    return new Date(scheduledIst.getTime() - IST_OFFSET_MS)
  })
}

export function getNextReminderUtc(trialEndUtc: Date, nowUtc: Date): Date | null {
  const schedule = getReminderScheduleUtc(trialEndUtc)
  const next = schedule.find((d) => isAfter(d, nowUtc))
  return next || null
}

export function getDaysLeft(trialEndUtc: Date, nowUtc: Date): number {
  const ms = trialEndUtc.getTime() - nowUtc.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
