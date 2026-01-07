import { describe, it, expect } from "vitest"
import { computeTrialWindow, getReminderScheduleUtc, getDaysLeft } from "../lib/subscription-utils"

describe("subscription-utils", () => {
  it("computes 14-day trial window anchored to IST", () => {
    const now = new Date("2025-01-01T12:00:00.000Z")
    const { trialStartUtc, trialEndUtc } = computeTrialWindow(now)
    const diffDays = Math.round((+trialEndUtc - +trialStartUtc) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(14)
  })

  it("produces expected reminder schedule count", () => {
    const end = new Date("2025-01-15T12:00:00.000Z")
    const schedule = getReminderScheduleUtc(end)
    expect(schedule.length).toBe(5)
  })

  it("days left should be >= 0", () => {
    const now = new Date()
    const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    expect(getDaysLeft(future, now)).toBeGreaterThanOrEqual(1)
  })
})
