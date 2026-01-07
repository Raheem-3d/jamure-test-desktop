# Acceptance Tests Checklist

## Organization Creation & Trial Logic
- [ ] Creating new org sets `trialStart=now` and `trialEndsAt=now+14d`.
- [ ] Trial badge shows correct days left (boundary: day 0, day 13, day 14).
- [ ] After `trialEndsAt`, badge changes to Active (if converted) or Expired; billing CTA switches.

## Billing Access Rules
- [ ] Before trial end: Buy Now disabled; opens pre-billing modal.
- [ ] After trial end: Buy Now enabled and navigates to checkout.

## Super Admin Permissions
- [ ] Can list all organizations.
- [ ] Can edit any organization settings; verifies audit log entry.
- [ ] Can suspend an org; badge updates; audit log entry includes reason.
- [ ] Can delete org only after typed confirmation; audit log recorded.
- [ ] Can manage users (change role, remove) across any org; logs each action.

## Impersonation
- [ ] Starting impersonation sets banner and logs start.
- [ ] Actions during impersonation log with impersonation=true.
- [ ] Exiting impersonation removes banner and logs end.

## Audit Logs
- [ ] Filtering by date range returns subset.
- [ ] Export CSV produces file with correct columns.
- [ ] Log entries include required fields.

## Trials Page
- [ ] Expiring in 7 days filter accurate.
- [ ] Extend trial updates `trialEndsAt` and logs action.
- [ ] Convert trial updates plan and logs action.

## Analytics
- [ ] Conversion rate calculation correct (trial→paid / total trials). Edge case: zero trials.

## Theme Toggle
- [ ] Toggles and persists preference (SSR safe, hydration).
- [ ] Dark mode colors meet AA contrast.

## Destructive Modals
- [ ] Delete org requires typed ID; mismatched disables submit.
- [ ] Suspend org requires confirmation; accessible focus trap.

## Accessibility
- [ ] Keyboard navigation for header, sidebar, table rows.
- [ ] Focus ring visible on all interactive elements.
- [ ] ARIA attributes on search combobox and notifications list.

---
## Example Playwright Test Snippets
```ts
// Org Creation Trial
test('new org sets trial fields', async ({ page }) => {
  await page.goto('/admin/organizations/new');
  await page.fill('[name=name]', 'Test Org');
  await page.fill('[name=primaryEmail]', 'owner@test.org');
  await page.click('button:has-text("Create")');
  await expect(page.locator('.badge-trial')).toContainText('14 days left');
});

// Billing CTA
test('billing CTA disabled during trial', async ({ page }) => {
  await page.goto('/admin/organizations/org_123/billing');
  await expect(page.getByRole('button', { name: 'Buy now' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'View plans' })).toBeVisible();
});

// Impersonation
test('impersonation banner appears', async ({ page }) => {
  await page.goto('/admin/organizations/org_123');
  await page.click('button:has-text("Impersonate")');
  await page.click('button:has-text("Confirm")');
  await expect(page.getByText('Impersonating')).toBeVisible();
});
```
