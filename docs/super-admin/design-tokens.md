# Design Tokens

Canonical variables follow existing hsl(var(--token)) pattern. Light + Dark values chosen for AA contrast.

## Color Palette
| Token | Light (HEX) | Dark (HEX) | Purpose |
|-------|-------------|------------|---------|
| --color-primary | #2563EB | #3B82F6 | Primary actions, focus states |
| --color-accent | #06B6D4 | #06B6D4 | Secondary emphasis elements |
| --color-surface | #FFFFFF | #0B1220 | Main surfaces |
| --color-surface-alt | #F8FAFC | #111A2C | Secondary panels/cards |
| --color-border | #E2E8F0 | #1E293B | Dividers, component borders |
| --color-muted-text | #6B7280 | #9CA3AF | Secondary text |
| --color-danger | #EF4444 | #DC2626 | Destructive actions |
| --color-warning | #F59E0B | #D97706 | Caution messages |
| --color-success | #16A34A | #15803D | Positive outcomes |
| --color-info | #0EA5E9 | #0284C7 | Informational banners |
| --color-elevated-shadow | rgba(15,23,42,0.08) | rgba(0,0,0,0.45) | Card shadow/glow |

### CSS Variable Mapping (Extend existing :root)
```css
:root {
  --primary: 217 91% 54%; /* #2563EB */
  --primary-foreground: 0 0% 100%;
  --accent: 188 84% 47%; /* #06B6D4 */
  --accent-foreground: 0 0% 100%;
  --success: 142 72% 29%;
  --warning: 35 92% 51%;
  --danger: 0 84% 60%;
  --info: 199 89% 48%;
  --surface: 0 0% 100%;
  --surface-alt: 210 40% 98%;
  --border: 214 32% 91%;
  --muted-foreground: 217 15% 45%;
}
.dark {
  --primary: 217 92% 60%;
  --primary-foreground: 0 0% 100%;
  --accent: 188 84% 47%;
  --accent-foreground: 0 0% 100%;
  --success: 142 72% 36%;
  --warning: 35 92% 51%;
  --danger: 0 72% 50%;
  --info: 199 89% 48%;
  --surface: 222 47% 11%;
  --surface-alt: 220 40% 16%;
  --border: 217 33% 17%;
  --muted-foreground: 217 15% 65%;
}
```

### Tailwind Theme Extension Snippet
```ts
// tailwind.config.ts (append inside theme.extend)
colors: {
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--danger))',
  info: 'hsl(var(--info))',
  surface: 'hsl(var(--surface))',
  'surface-alt': 'hsl(var(--surface-alt))',
  muted: { DEFAULT: 'hsl(var(--muted-foreground))' }
},
boxShadow: {
  card: '0 2px 4px -1px var(--color-elevated-shadow), 0 4px 12px -2px var(--color-elevated-shadow)',
  glow: '0 0 0 1px hsl(var(--primary) / 0.4), 0 0 8px hsl(var(--primary) / 0.6)'
},
```

## Typography
- Font family: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif`
- Scale:
  - Display / H1: 28px / 700
  - H2: 22px / 600
  - H3: 18px / 600
  - Body: 16px / 400
  - Small: 14px / 400
  - Micro: 12px / 500

Utility classes mapping:
```html
<h1 class="text-2xl font-bold tracking-tight">Title</h1>
<p class="text-sm text-muted-foreground">Secondary text</p>
```

## Spacing
Base unit: 4px
| Name | Value | Tailwind |
|------|-------|----------|
| xs | 4px | p-1 / m-1 |
| sm | 8px | p-2 / m-2 |
| md | 12px | (custom) `spacing: {3: '0.75rem'}` |
| base | 16px | p-4 |
| lg | 24px | p-6 |
| xl | 32px | p-8 |
| 2xl | 48px | p-12 |
| 3xl | 64px | p-16 |

## Radii
- Global base: 8px (`--radius: 0.5rem`).
- Card: 12px (extend via `.rounded-xl`)
- Button: 8px (default)
- Tag/Pill: 9999px (`.rounded-full`)

## Elevation
Light theme shadows emphasize softness; dark uses subtle outer glows.
| Level | Light | Dark |
|-------|-------|------|
| 1 | 0 1px 2px rgba(0,0,0,0.06) | 0 0 0 1px rgba(255,255,255,0.05) |
| 2 | 0 2px 4px rgba(0,0,0,0.08) | 0 0 0 1px rgba(255,255,255,0.07), 0 2px 6px rgba(0,0,0,0.4) |
| 3 | 0 4px 12px rgba(0,0,0,0.12) | 0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px rgba(0,0,0,0.5) |

Usage via utilities:
```html
<div class="shadow-card dark:shadow-glow">...</div>
```

## Motion / Interaction Tokens
| Token | Value | Purpose |
|-------|-------|---------|
| --ease-standard | cubic-bezier(0.2, 0.8, 0.2, 1) | Generic UI transitions |
| --ease-entrance | cubic-bezier(0.34, 1.56, 0.64, 1) | Pop-in scaling |
| --duration-fast | 150ms | Hover/active feedback |
| --duration-medium | 250ms | Component transitions |
| --duration-slow | 400ms | Modal/overlay entrance |

## State / Semantic Tokens
| Token | Maps to |
|-------|---------|
| --state-hover | 4% overlay blend of primary/accent |
| --state-active | 8% overlay blend |
| --state-focus-ring | outline: 2px solid hsl(var(--primary)); outline-offset: 2px; |
| --state-selected-bg | hsl(var(--primary) / 0.08) |
| --state-danger-bg | hsl(var(--danger) / 0.16) |

## Accessibility Notes
- Minimum body text contrast: 4.5:1 against background.
- Focus styles must always be visible (avoid `outline: none`).
- Avoid relying solely on color for status: pair icons or labels (e.g., Trial, Active, Suspended).

## Theming Strategy
- Use `dark` class on `<html>` for dark mode toggling.
- Persist preference in user profile or localStorage fallback.
- Provide SSR-safe hydration: initial theme resolved server side.

---
These tokens underpin the component spec in `components.md`.
