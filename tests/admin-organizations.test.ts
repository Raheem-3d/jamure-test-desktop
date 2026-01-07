import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      update: vi.fn(async (args) => ({ id: args.where.id, suspended: args.data.suspended })),
      findMany: vi.fn(async () => []),
    },
  },
}))

vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { email: "owner@example.com" } })) }))

import { PATCH } from "@/app/api/admin/organizations/route"

beforeEach(() => {
  process.env.SUPERADMINS = "owner@example.com"
})

describe("admin organizations", () => {
  it("suspends organization when superadmin", async () => {
    const req = new Request("http://localhost/api/admin/organizations", { method: "PATCH", body: JSON.stringify({ organizationId: "org_1", suspended: true }) })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.organization.suspended).toBe(true)
  })

  it("forbids non superadmin", async () => {
    process.env.SUPERADMINS = "someoneelse@example.com"
    const req = new Request("http://localhost/api/admin/organizations", { method: "PATCH", body: JSON.stringify({ organizationId: "org_1", suspended: true }) })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })
})
