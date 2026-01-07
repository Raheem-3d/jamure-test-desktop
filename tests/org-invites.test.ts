import { describe, it, expect, vi, beforeEach } from "vitest"

const emailLog: any[] = []
vi.mock("@/lib/db", () => ({
  db: {
    orgInvite: {
      create: vi.fn(async ({ data }) => ({ ...data, id: "invite_1" })),
    },
  },
}))
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { id: "user_1", role: "ORG_ADMIN", organizationId: "org_1" } })) }))
vi.mock("@/lib/permissions", () => ({ hasPermission: () => true }))
vi.mock("@/lib/org", () => ({ assertOrgAccess: async () => "org_1" }))
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async (x) => emailLog.push(x)) }))

import { POST } from "@/app/api/organization/invites/route"

describe("org invites", () => {
  beforeEach(() => { emailLog.length = 0 })
  it("creates invite and sends email", async () => {
    const req = new Request("http://localhost/api/organization/invites", { method: "POST", body: JSON.stringify({ email: "new@user.com", inviteRole: "EMPLOYEE" }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invite.email).toBe("new@user.com")
    expect(emailLog.length).toBe(1)
  })
})
