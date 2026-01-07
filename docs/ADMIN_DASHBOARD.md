# Super Admin Dashboard - Phoenix v1.24.0 Inspired

A modern, responsive admin dashboard inspired by Phoenix v1.24.0 theme, built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (#4f46e5) - Main brand color, buttons, active states
- **Accent**: Blue-to-Cyan gradient (#2563eb → #06b6d4)
- **Neutral**: Gray scale for backgrounds, borders, text
- **Semantic**: Emerald (success), Red (danger), Amber (warning), Blue (info)

### Typography
- **Font Family**: System font stack (similar to Inter/Roboto)
- **Scale**: Compact spacing (8px grid system)
- **Weights**: Medium (500) for UI, Semibold (600) for headings, Bold (700) for emphasis

### Components
- **Shadows**: Subtle `shadow-sm` on cards, `shadow-xl` on modals
- **Borders**: Rounded corners (`rounded-lg` = 8px, `rounded-xl` = 12px)
- **Transitions**: All interactive elements have smooth hover/focus states
- **Icons**: Emoji-based for rapid prototyping (can be replaced with Lucide/Feather)

## 🏗️ Architecture

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│ Vertical Sidebar (260px)                            │
│ - Logo + Title                                      │
│ - Collapsible Multi-level Nav                      │
│ - Persistent expand state (localStorage)           │
│ - Footer (version)                                  │
├─────────────────────────────────────────────────────┤
│ Top Bar (56px)                                      │
│ - Search (with kbd shortcut hint)                  │
│ - Notifications dropdown (bell icon)               │
│ - Theme toggle (light/dark)                        │
│ - User menu dropdown (avatar)                      │
├─────────────────────────────────────────────────────┤
│ Main Content Area                                   │
│ - Dynamic route-based content                      │
│ - Responsive padding (p-4 lg:p-8)                  │
└─────────────────────────────────────────────────────┘
```

### File Structure
```
app/admin/
├── layout.tsx                 # Main admin shell
├── page.tsx                   # Dashboard (KPIs, charts, recent items)
├── organizations/
│   ├── page.tsx              # Orgs table (search, sort, status badges)
│   └── [orgId]/page.tsx      # Org detail (impersonate, actions)
├── trials/page.tsx           # Active trials (extend, convert forms)
├── audit-logs/page.tsx       # Activity log (filter by org)
├── analytics/page.tsx        # Platform metrics (conversion rate, MRR)
└── settings/page.tsx         # Super admin management

components/admin/
├── AdminTopBar.tsx           # Top navigation bar with dropdowns
├── CollapsibleNav.tsx        # Multi-level sidebar navigation
├── charts/
│   ├── ConversionFunnel.tsx  # Bar chart (Trial → Active → Expired)
│   └── NewOrgsTrend.tsx      # Area chart (30-day new orgs)
└── ui/
    ├── Button.tsx            # Variant button component
    └── Modal.tsx             # Radix-based modal dialog

lib/
└── admin-logger.ts           # Centralized activity logging utility

pages/api/admin/
├── organizations/
│   ├── [id]/
│   │   ├── impersonate.ts    # Start impersonation session
│   │   ├── extend-trial.ts   # Extend trial by N days
│   │   └── convert-trial.ts  # Convert trial to ACTIVE
│   └── export.ts             # CSV export of all orgs
├── impersonation/exit.ts     # End impersonation session
├── search.ts                 # Global org search
└── superadmins/toggle.ts     # Toggle User.isSuperAdmin flag
```

## 🚀 Features Implemented

### ✅ Core Dashboard
- [x] **KPI Cards**: Total orgs, new (30d), trials, expiring trials
- [x] **Charts**: Conversion funnel (Recharts bar), 30-day trend (area)
- [x] **Recent Lists**: Organizations and activity logs
- [x] **Quick Actions**: Gradient buttons for common tasks
- [x] **Dark Mode**: Full theme support with `next-themes`

### ✅ Sidebar Navigation
- [x] **Multi-level Collapsible**: Groups (Organizations, Activity) with children
- [x] **Active State**: Highlights current route + parent sections
- [x] **localStorage Persistence**: Remembers expanded sections across sessions
- [x] **Accessibility**: Focus rings, keyboard navigation
- [x] **Sticky Positioning**: Sidebar fixed during scroll

### ✅ Top Bar
- [x] **Search**: Global org search with keyboard shortcut hint (`/`)
- [x] **Notifications Dropdown**: Bell icon with badge, sample notifications
- [x] **User Menu**: Avatar with name/email, links to settings/dashboard/signout
- [x] **Theme Toggle**: Light/dark mode switcher
- [x] **Responsive**: Collapses gracefully on mobile

### ✅ Organizations Management
- [x] **Table View**: Search, sort (name/date), status badges
- [x] **Status Badges**: Color-coded (TRIAL=blue, ACTIVE=green, EXPIRED=gray, CANCELED=red)
- [x] **Actions**: Impersonate, View detail buttons
- [x] **Detail Page**: Org info, impersonate, force expire trial, announcements

### ✅ Trials Management
- [x] **Active Trials List**: Days left with urgency colors (≤7 days = red)
- [x] **Extend Trial**: Form to add 1-30 days, logs to ActivityLog
- [x] **Convert Trial**: One-click convert to ACTIVE, idempotent handling
- [x] **Sorting**: Ordered by trial end date (soonest first)

### ✅ Audit Logs
- [x] **Activity List**: All admin actions with timestamps
- [x] **Filtering**: By organization ID
- [x] **Metadata**: Shows userId, organizationId, action type
- [x] **Hover States**: Row highlights on hover

### ✅ Analytics
- [x] **Metric Cards**: Trials count, active count, conversion rate, MRR (30d)
- [x] **Icon Indicators**: Emoji icons for quick recognition
- [x] **Responsive Grid**: 2-4 columns based on screen size

### ✅ Settings
- [x] **SUPERADMINS List**: Shows .env-configured emails
- [x] **User Management**: Toggle isSuperAdmin flag via form
- [x] **Role Badges**: Purple badge for SUPER_ADMIN, gray for MEMBER

### ✅ Component Library
- [x] **Button**: 5 variants (primary, secondary, outline, ghost, danger), 3 sizes
- [x] **Modal**: Radix-based with animations, configurable size, footer support
- [x] **Badges**: Status badges with dark mode support
- [x] **Cards**: Consistent border, shadow, hover effects

### ✅ Utilities
- [x] **Admin Logger**: Centralized `logAdminAction()` helper
- [x] **Type Safety**: Full TypeScript coverage
- [x] **Accessibility**: ARIA labels, focus states, keyboard navigation

## 🎯 Usage

### Running the Dashboard

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Navigate to `/admin` with a SUPERADMIN account.

### SUPERADMIN Configuration

Add emails to `.env.local`:
```env
SUPERADMINS=admin@example.com,super@company.com
```

Or toggle via UI at `/admin/settings`.

### Impersonation Workflow

1. Go to `/admin/organizations`
2. Click "Impersonate" on any org row
3. Banner appears at top with "Exit Impersonation" button
4. All actions logged to ActivityLog with `impersonation: true`

### Trial Management

1. `/admin/trials` shows all TRIAL subscriptions
2. **Extend**: Add 1-30 days to trialEnd
3. **Convert**: Change status to ACTIVE (one-click)
4. Both actions log to ActivityLog with details

### Activity Logging

Use the centralized helper:

```typescript
import { logAdminAction, getAdminActorFromToken } from '@/lib/admin-logger'
import { getToken } from 'next-auth/jwt'

// In API route
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
const { id, email } = getAdminActorFromToken(token)

await logAdminAction({
  action: 'TRIAL_EXTEND',
  actorId: id,
  actorEmail: email,
  organizationId: 'org_123',
  details: { days: 7, previousEnd: '2024-01-01' },
})
```

## 📊 Charts Integration

Uses **Recharts** for data visualization:

- **ConversionFunnel**: Horizontal bar chart showing Trial → Active → Expired counts
- **NewOrgsTrend**: 30-day area chart with gradient fill

Both charts are client components (`"use client"`) with responsive containers.

## 🌙 Theme System

- Uses `next-themes` for light/dark mode
- CSS variables in `globals.css` for semantic colors
- `text-muted-foreground` for secondary text
- All components support dark mode via Tailwind `dark:` variants

## 🔒 Security

- **Route Guards**: All `/admin` routes check `isSuperAdmin()`
- **API Guards**: All `/api/admin/*` endpoints verify SUPERADMINS env
- **Session-based**: Uses NextAuth JWT tokens
- **Activity Logging**: Every admin action tracked with actor + details

## 🎨 Design Tokens Reference

| Token                  | Light Mode          | Dark Mode           | Usage                      |
|------------------------|---------------------|---------------------|----------------------------|
| Primary                | `#4f46e5` (indigo)  | `#4f46e5`           | Buttons, links, focus      |
| Accent                 | `#2563eb → #06b6d4` | Same                | Gradients, brand elements  |
| Background             | `#ffffff`           | `#0f172a`           | Page background            |
| Card BG                | `#ffffff`           | `#1e293b`           | Card surfaces              |
| Border                 | `#e5e7eb`           | `#334155`           | Dividers, table borders    |
| Text                   | `#111827`           | `#f1f5f9`           | Primary text               |
| Text Muted             | `#6b7280`           | `#94a3b8`           | Secondary text             |
| Success (emerald)      | `#10b981`           | `#34d399`           | ACTIVE status, positive    |
| Danger (red)           | `#ef4444`           | `#f87171`           | Errors, CANCELED           |
| Warning (amber)        | `#f59e0b`           | `#fbbf24`           | Impersonate, alerts        |
| Info (blue)            | `#3b82f6`           | `#60a5fa`           | TRIAL status               |

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (sm) - Hides sidebar, shows mobile menu toggle
- **Tablet**: 640px - 1024px (md/lg) - Sidebar visible, compact layout
- **Desktop**: > 1024px (lg/xl) - Full sidebar (260px) + content area

## ⚡ Performance

- **Server Components**: Dashboard, tables, org details render on server
- **Client Components**: Charts, dropdowns, collapsible nav use `"use client"`
- **Code Splitting**: Charts lazy-loaded (105kB for admin dashboard route)
- **Static Optimization**: Build output shows efficient chunking

## 🧪 Testing Recommendations

1. **Unit Tests**: Test `logAdminAction`, `isSuperAdmin` helpers
2. **Integration**: Test impersonation flow, trial extend/convert
3. **E2E**: Playwright tests for critical admin workflows
4. **Accessibility**: Lighthouse audit, keyboard navigation testing

## 📚 Future Enhancements

- [ ] Toast notifications (sonner integration)
- [ ] Bulk actions (select multiple orgs)
- [ ] Advanced audit log filters (date range, action type)
- [ ] CSV export with filters
- [ ] Permissions matrix (beyond SUPERADMIN boolean)
- [ ] Real-time notifications via WebSocket
- [ ] Dashboard customization (drag-drop widgets)
- [ ] Multi-tenancy support (org-scoped admins)

## 🤝 Contributing

1. Follow existing code style (Tailwind utilities, TypeScript strict mode)
2. Add new components to `components/admin/ui/` or `components/admin/`
3. Use admin logger for all mutations
4. Include dark mode support in all new UI
5. Test on mobile + desktop breakpoints

## 📄 License

Same as parent project.

---

**Built with ❤️ using Next.js 15 + React 19 + Tailwind CSS + Prisma + NextAuth**
