# High-Fidelity Mockup Specs (Light & Dark)

Describes structure, spacing, and visual treatment for required screens. Use these specs to build Figma frames (suggested widths: 1440 desktop, 768 tablet, 375 mobile).

## 1. Dashboard (Home)
Layout:
- 2-row header region: top global header (64px), content area starts below impersonation banner if present.
- KPI Card Grid: 3 columns (≥1200px) x 2 rows; gap 24px; card padding 20px.
- Activity Feed right column width ~360px.

KPI Card Anatomy:
- Icon (40px square, rounded 12px, background: primary/10).
- Label (small, muted text), Value (24px bold), Trend pill (▲ 12% vs last 30d).
- Light: shadow level 1; Dark: glow subtle border.

Quick Actions Bar:
- Horizontal at top of main content (Create Org, Invite User, Export CSV) – Buttons aligned right.

Dark Theme Differences:
- Card surface: `--surface-alt` (#111A2C), border `--border` (#1E293B), text high contrast.

## 2. Organizations List
Table Layout:
- Full-width; horizontal padding 24px.
- Header row sticky with subtle shadow (elevation 1).
- Row height: 56px.

Cells:
- Org Name: bold 500; includes small domain pill below name (12px text).
- Trial Status: badge; countdown (e.g. "7 days left"), if expired show red badge "Expired".
- Billing Status: icon + label (Paid / Past Due / None).
- Actions: icon buttons (View, Edit, Impersonate, Suspend, Delete) grouped.

Bulk Selection:
- Checkbox column at far left appears when any selection or multi-mode engaged.
- Bulk Bar appears above table: shows X selected + bulk action buttons.

Saved Filters:
- Horizontal list of filter chips above table; active chip has primary background.

Dark Theme Specifics:
- Row hover: background `--surface-alt` lighten/darken.
- Borders rely on semi-transparent white (1px) or `--border`.

## 3. Organization Detail – Members Tab
Header:
- Title + ID + status badges horizontally.
- Action buttons: Edit Settings, Impersonate, Suspend.

Tabs Under Header:
- 48px high; active tab has bottom 2px primary bar.

Members List:
- Table style; columns: Name, Email, Role (badge), Last Login, Actions.
- Invite User button top-right.
- Role change opens inline dropdown.

Dark Theme:
- Role badge foreground brightness maintained.

## 4. Organization Detail – Billing & Plans
Sections (stacked cards):
1. Current Plan Card: Plan name, renewal date, payment method summary.
2. Invoices Table: number, date, amount, status, download link.
3. Upgrade CTA area:
   - If trial active: banner "Trial: X days left" + disabled "Buy now" button replaced with "View Plans" (opens comparison modal).
   - If trial ended: Primary "Buy now" button enabled.

## 5. Audit Logs Screen
Filters Row:
- Date range picker, Actor combobox, Org combobox, Action multi-select.
- Apply / Reset buttons.

Log Table:
- Columns: Timestamp, Actor, Action, Target (Org/User ID), Reason, Metadata (expand icon).
- Expand row reveals JSON payload viewer (monospace, collapsible sections).

Dark Theme:
- JSON viewer background `--surface-alt` with 1px border.

## 6. Trials Page
- Summary banner: "24 trials active • 5 expiring in 7 days".
- Table columns: Org Name, Trial Start, Trial Ends, Days Left, Actions (Extend, Convert, Email).
- Extend trial modal: input for extra days (max 30) with validation.

## 7. Analytics Screen
Charts:
- Conversion Funnel: stacked horizontal bars (Trial → Active → Churned) with percentage labels.
- MRR/ARR Line Chart: dual line (MRR primary color, ARR accent). Hover tooltip displays date + values.
- Trial Conversion Rate Card: big percentage + sparkline.

Dark Theme:
- Grid lines lowered opacity (30%), axes text muted.
- Hover tooltip surface `--surface-alt` shadow level 2.

## Common Elements
### Impersonation Banner
- Height: 40px; background warning/20, border bottom warning/40; text medium weight.

### Confirmation Modal
- Title: "Confirm Deletion"
- Body: instructional text + input to type org ID.
- Disabled destroy button until exact match.

### Empty States
- Illustration placeholder (48px icon) + "No audit logs in this range" + secondary guidance.

### Loading States
- Skeleton bars (height 16px, radius 8px) for lists, animated shimmer.

### Focus States
- Outline 2px solid primary, offset 2px. For dark theme also apply subtle glow.

## Microinteractions
- Row hover: background transitions in 150ms.
- Sorting: icon rotates 180° with fade.
- Impersonate: on confirm, banner slides down (`transform translateY(-40px) -> 0` over 250ms ease-out).

## Color & Contrast Checks
- Primary text vs surface ≥ 7:1 (AA Large).
- Muted text vs surface ≥ 4.5:1.
- Danger badge white text on danger background ≥ 4.5:1.

---
Use this spec to guide pixel-level implementation. Component tokens defined in `design-tokens.md`.
