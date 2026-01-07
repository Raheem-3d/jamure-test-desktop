# Component Library (React + Tailwind)

All components follow accessible patterns (focus states, aria labels) and use tokenized classes.

## Buttons
- Variants: primary, secondary, ghost, outline, destructive.
- Sizes: sm, md, lg.
- Props: `onClick`, `loading`, `icon`, `disabled`, `aria-label`.
- Classes: `btn`, `btn-primary`, `btn-outline`, or Tailwind `bg-primary text-primary-foreground hover:bg-primary/90`.

## Badge
- Variants: neutral, success, warning, danger, info.
- Usage: status indicators (Trial, Active, Suspended, Invoicing issue).

## Input / Combobox
- Global Search uses a combobox with async suggestions, keyboard navigation, and `aria-activedescendant`.

## Table
- Features: sticky header, resizable columns, sortable headers, row selection (checkbox), bulk action toolbar.
- Empty state: icon + message + CTA.

## Tabs
- For Organization detail (Overview, Members, Billing & Plans, Settings, Usage & Logs).

## Drawer / Modal
- Modal for destructive confirmation (requires typed org ID) and impersonation confirmation.
- Drawer as alternative for Organization quick view.

## Toast
- Success, error, info; auto-dismiss with `aria-live="polite"`.

## Skeleton
- Used for table loads and graphs.

## Sidebar
- Collapsible with tooltips; maintains focus visibility when reduced to icons.

## Header Menus
- Notification dropdown grouped by category with mark-as-read and clear-all.

## Impersonation Banner
- Fixed top banner when impersonating: “Impersonating {org} — Exit”. Always visible until exit.

## Forms
- Organization form: name, domain, primaryEmail, plan, feature flags, custom domains.
- Invite user form: email, role selection.

## Graphs
- Line/Bar charts for analytics; color from `--chart-*` tokens.

---

## Example JSX Signatures

```tsx
// Button
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = 'primary', size = 'md', icon, loading, children, ...rest }: ButtonProps) {
  // map variant/size to classes per tokens
}

// DataTable (simplified)
export type Column<T> = {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: number | string;
}

export function DataTable<T>({ columns, rows, onSort, selectable, onSelectionChange }: {
  columns: Column<T>[];
  rows: T[];
  onSort?: (colId: string, dir: 'asc' | 'desc') => void;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}) { /* ... */ }

// ImpersonationBanner
export function ImpersonationBanner({ orgName, onExit }: { orgName: string; onExit: () => void }) {
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-50 bg-warning/20 backdrop-blur border-b border-warning/40 text-warning-foreground">
      <div className="mx-auto max-w-screen-2xl px-4 py-2 flex items-center justify-between">
        <span className="font-medium">Impersonating {orgName}</span>
        <button className="text-sm underline" onClick={onExit}>Exit</button>
      </div>
    </div>
  )
}
```

## Accessibility Notes
- All interactive components have visible focus. Modals trap focus.
- Tables expose selected row count to screen readers and provide labels for row actions.
- Icons include `aria-hidden="true"` unless conveying status.
