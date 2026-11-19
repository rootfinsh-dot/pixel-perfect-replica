# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** BATI DOC AI
**Generated:** 2026-11-19 16:01:24
**Category:** Construction/Architecture

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#64748B` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#94A3B8` | `--color-secondary` |
| On Secondary | `#0F172A` | `--color-on-secondary` |
| Accent/CTA | `#EA580C` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#334155` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#334155` | `--color-card-foreground` |
| Muted | `#EBF0F5` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#64748B` | `--color-ring` |

**Color Notes:** Industrial grey + safety orange [Accent adjusted from #F97316]

### Typography

- **Pairing:** Modern Professional — Sans + Sans
- **Heading Font:** Poppins
- **Body Font:** Open Sans
- **Mood:** professional, clean, corporate, approachable
- **Best For:** SaaS, corporate sites, business apps, professional services
- **Google Fonts:** [Poppins + Open Sans](https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing & Shadows (Tailwind v4)

The project defines no custom `--space-*` / `--shadow-*` tokens — keep Tailwind's default scale:

- **Spacing:** `gap-4`, `gap-6`, `p-4`, `space-y-4`, `inset-x-4`, `my-8`… (no custom tokens)
- **Radii:** `--radius → rounded`, `--radius-sm → rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` (mapped in `@theme` in `src/styles.css`)
- **Shadows** (default theme): `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
- **Colors** are `@theme`-mapped in `src/styles.css` (`--color-background → bg-background`, `bg-primary`, `text-muted-foreground`, `border-border`…); all color values are `oklch` in the CSS — never hardcode hex in components.

### Shadow Depths

(Dropped — the project has no `--shadow-*` tokens. Use Tailwind's default shadows: `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`.)

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #EA580C;
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #64748B;
  border: 2px solid #64748B;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #64748B;
  outline: none;
  box-shadow: 0 0 0 3px #64748B20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Hero-Centric Design

- **Conversion Strategy:** One primary CTA. Let the hero dominate the initial viewport without hiding the next content cue. Use a static hero and non-pulsing CTA when reduced motion is requested; provide video controls. Pause hero media offscreen/hidden and keep the final hero message and CTA static under reduced motion.
- **CTA Placement:** Hero dominant (center/bottom) + Sticky nav CTA
- **Section Order:** Full-bleed Hero (headline + visual) > Single value prop strip > Key benefit or proof > Primary CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ 2D-only layouts
- ❌ Poor image quality
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
