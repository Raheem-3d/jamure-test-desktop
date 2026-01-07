import { describe, it, expect } from "vitest"
import { hasPermission, DefaultRolePermissions } from "@/lib/permissions"

describe("permissions", () => {
  it("org admin has org edit", () => {
    expect(hasPermission("ORG_ADMIN", "ORG_EDIT")).toBe(true)
  })
  it("employee lacks org edit", () => {
    expect(hasPermission("EMPLOYEE", "ORG_EDIT")).toBe(false)
  })
  it("matrix covers roles", () => {
    expect(Object.keys(DefaultRolePermissions)).toEqual(["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EMPLOYEE", "ORG_MEMBER", "CLIENT"]) 
  })
})
