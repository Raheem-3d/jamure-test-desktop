# Layout & Navigation Spec

## App Shell
- Max width: 1440px (fluid).
- Grid: 12 columns, 24px gutters, 16px base spacing.
- Header height: 64px; Sidebar width: 280px (collapsed: 72px).

### Global Header
- Left: Product logo + badge “Super Admin”.
- Center: Global search input (Cmd/Ctrl + K) — search by org name, domain, admin email, ID.
- Right: Theme toggle, notifications menu, user avatar menu, quick actions (Impersonate, Create Org).

States:
- Search: type-ahead suggestions with entity badges (Org • User • Email • ID). Arrow keys to navigate; Enter to open.
- Notification categories: System Alerts, Billing Alerts. Clear-all per category.
- Quick actions menu is keyboard navigable.

### Left Navigation (collapsible)
- Sections: Dashboard, Organizations, Users, Billing, Trials, Audit Logs, Analytics, Settings.
- Active item: bold text, left rail indicator, higher contrast.
- Collapsed: show icons with tooltip-on-hover; expand on focus for keyboard.

### Content Area
- Uses card surfaces with consistent spacing.
- Page header contains title, context breadcrumbs, and actions.

## Page Templates

### Dashboard / Home
- KPI Cards (6-up):
  - Total organizations, Active this 30d, In trial (count), Trials expiring in 7 days, Annual revenue MTD, Conversion rate.
- Recent Activity Feed: org/user changes, errors, billing events.
- Quick Actions: Create Org, Invite User, Export CSV.

### Organizations List
- Table columns: Org name, Org ID, Admin email(s), Plan, Trial status (days left/expired), Billing status, Created date, Actions.
- Row actions: View, Edit, Impersonate, Toggle active/suspend, Delete.
- Features: column sorting, multi-select bulk actions (send email, change plan, cancel trial), saved filters, pagination/infinite scroll.

### Organization Detail
- Header: Org name, org ID, status badges (Trial X days left / Active / Suspended).
- Tabs: Overview, Members, Billing & Plans, Settings, Usage & Logs.
- Overview: contact info, created date, last login, active projects, usage graphs.
- Members: list users with role chips; actions: invite, edit role, remove.
- Billing & Plans: active plan, renewal date, payment method, invoices; "Show billing page" enabled only when `billingAvailable`.
- Settings: metadata, custom domains, feature flags.
- Danger Zone: suspend org, delete org (modal confirmation + typed org ID + audit reason optional).

### Audit Logs
- Filter by: date range, actor, org, action type; export CSV.

### Trials
- List of orgs in trial with start/end; actions to extend, convert, send email.

### Analytics
- Conversion funnel, MRR/ARR chart, churn, trial-to-paid conversion.

## Accessibility
- Keyboard: Tab order from header → sidebar → content. Skip-to-content link.
- Focus ring: `outline: 2px solid hsl(var(--primary)); outline-offset: 2px`.
- Table: headers use `<th scope="col">`, row selection has visible indicators, no reliance on color alone.

## Responsive Behavior
- ≤ 1024px: Sidebar collapses by default; header fits quick actions into overflow menu.
- ≤ 768px: Single-column content; table becomes stacked list with key attributes.
