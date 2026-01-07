# API Contract (Admin)

Base path: `/api/admin`
Auth: Super admin only (see middleware notes). All responses JSON. Errors use `{ error: { code, message } }`.

## Organizations

GET /api/admin/organizations?query=&plan=&trialStatus=&billingStatus=&limit=&cursor=&sort=createdAt&dir=desc
- Query by name, domain, adminEmail, id.
- Returns paginated list.

Response 200:
```json
{
  "items": [
    {
      "id": "org_123",
      "name": "Acme Inc",
      "domain": "acme.com",
      "adminEmails": ["owner@acme.com"],
      "plan": "PRO",
      "trial": { "start": "2025-11-01T00:00:00Z", "endsAt": "2025-11-15T00:00:00Z", "daysLeft": 7 },
      "billingStatus": "PAID|PAST_DUE|NONE",
      "suspended": false,
      "createdAt": "2025-10-01T12:00:00Z"
    }
  ],
  "nextCursor": null
}
```

GET /api/admin/organizations/:id
- Returns detail with members, settings summary, billing.

POST /api/admin/organizations
- Body: `{ name, domain?, primaryEmail, plan? }`
- Creates org; sets trialStart=now, trialEndsAt=now+14 days; logs activity.

PATCH /api/admin/organizations/:id
- Body: partial update; logs activity with diff `details`.

DELETE /api/admin/organizations/:id
- Requires `reason` string; hard or soft delete per env; logs activity.

POST /api/admin/organizations/:id/impersonate
- Starts impersonation; returns token or session redirect link; logs activity.

## Audit Logs

GET /api/admin/audit-logs?actorId=&orgId=&action=&from=&to=&limit=&cursor=
- Response:
```json
{ "items": [{
  "id": "log_1",
  "timestamp": "2025-11-08T10:00:00Z",
  "actorId": "user_1",
  "actorEmail": "super@admin.io",
  "action": "ORG_UPDATE",
  "targetOrgId": "org_123",
  "reason": "Support request",
  "details": { "before": {"suspended": false }, "after": {"suspended": true } }
}], "nextCursor": null }
```

## Trials

GET /api/admin/trials?expiringInDays=7
- Lists orgs in trial with days left.

POST /api/admin/organizations/:id/extend-trial
- Body: `{ days: number }` (1–30). Returns updated trialEnd.

POST /api/admin/organizations/:id/convert-trial
- Converts trial to paid plan; logs activity.

## Users

GET /api/admin/users?orgId=&email=&role=&limit=&cursor=

PATCH /api/admin/users/:id
- Body: `{ role?: Role, suspended?: boolean }` (super admin can edit any user).

## Settings

GET /api/admin/settings
- Returns permissions, SUPERADMINS list (emails), rate limit config.

PATCH /api/admin/settings
- Update selected settings; server validates SUPERADMINS domain policies.

## Error Model
- 400: `{ error: { code: "INVALID_INPUT", message: "..." } }`
- 401: `{ error: { code: "UNAUTHORIZED", message: "..." } }`
- 403: `{ error: { code: "FORBIDDEN", message: "..." } }`
- 404: `{ error: { code: "NOT_FOUND", message: "..." } }`
- 409: `{ error: { code: "CONFLICT", message: "..." } }`
- 500: `{ error: { code: "INTERNAL", message: "..." } }`

## Notes
- Sorting accepts: `name`, `createdAt`, `trialEndsAt`, `billingStatus`.
- All write endpoints must create audit log entries including `actorId`, `actorEmail`, `action`, `targetOrgId`, `timestamp`, `reason`.
- Billing CTA is only active when `billingAvailable = now >= trialEndsAt`.
