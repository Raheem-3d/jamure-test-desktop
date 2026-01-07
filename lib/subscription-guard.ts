import { db } from "@/lib/db"

export type AccessStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "NO_SUBSCRIPTION"

export async function getAccessStatusByOrg(organizationId?: string | null): Promise<AccessStatus> {
  if (!organizationId) return "NO_SUBSCRIPTION"
  const sub = await db.subscription.findUnique({ where: { organizationId } })
  if (!sub) return "NO_SUBSCRIPTION"
  if (sub.status === "TRIAL") return "TRIAL"
  if (sub.status === "ACTIVE") return "ACTIVE"
  if (sub.status === "EXPIRED") return "EXPIRED"
  return "NO_SUBSCRIPTION"
}

export async function assertPaidOrTrialByOrg(organizationId?: string | null) {
  const status = await getAccessStatusByOrg(organizationId)
  if (status === "ACTIVE" || status === "TRIAL") return { ok: true as const, status }
  return { ok: false as const, status }
}
