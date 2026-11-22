---
name: zus-gov-ui
description: Visual style for this project's UI - ZUS colour theming combined with the page structure of gov.pl and other Polish government portals (service tiles, full-width bands, "Ważne" notices, dark footer). Use when designing, building or reviewing any screen, component or theme token. Overrides the visual direction in polish-public-ui.
---

# ZUS × gov.pl interface style

Our app should look like it belongs to the Polish public-service family:
**ZUS colours** (institutional green, amber action, deep navy) laid out with
the **gov.pl page grammar** (flat white page, full-width bands, service tiles,
step lists, a full-width footer). It must still read as an independent
hackathon project.

This skill **replaces the "Visual direction" and "Starting theme" sections of
`polish-public-ui`**. Keep following that skill for component choice (shadcn/ui,
Tailwind 4), forms, interaction states, accessibility and verification.

## Brand boundary (non-negotiable)

- Never use the gov.pl wordmark, the white eagle, the phrase
  "Serwis Rzeczypospolitej Polskiej", or national red-white flag graphics.
- Show the product name "Zasiłkowy Przewodnik Przyszłego Rodzica" with our own
  plain square mark (see Header).
- Every page keeps the demo statement (header strip or footer):
  "Projekt demonstracyjny HackNation 2026 – nie jest serwisem ZUS ani gov.pl."
- Link to real zus.pl / gov.pl pages only as clearly labelled external sources.

## Colour tokens

Project approximations of the references, not official brand values. All are
defined in `app/app/globals.css` and mapped through `@theme inline`; never
write raw hex in components.

| Token (Tailwind) | Value | Use | Contrast |
| --- | --- | --- | --- |
| `background` | `#ffffff` | Page | – |
| `foreground` | `#171717` | Text, headings | 17.9:1 |
| `primary` | `#007c36` | Links, active nav, primary buttons, icons, overscroll | 5.3:1 on white |
| `primary-hover` | `#00652c` | Hover of green controls | 7.3:1 |
| `primary-soft` | `#e8f3ec` | Hero band, selected rows, icon tiles | green text 4.7:1 |
| `brand` | `#00993f` | Decorative only: tile accents | not for text |
| `action` | `#ffb34f` | The single most important CTA per screen | – |
| `action-hover` | `#f59f2a` | Hover of amber button | – |
| `action-foreground` | `#00416e` | Text on amber | 6.0:1 (5.0:1 on hover) |
| `navy` | `#00416e` | Help band, dark headers of tables | – |
| `navy-foreground` | `#ffffff` | Text on navy | 10.6:1 |
| `secondary` / `muted` | `#f3f4f3` | Alternating bands, quiet surfaces | – |
| `muted-foreground` | `#525252` | Supporting text | 7.8:1 |
| `border` | `#d9dedb` | Separators, tile outlines | – |
| `input` | `#737373` | Field boundaries | 4.7:1 |
| `ring` | `#005080` | Keyboard focus outline | – |
| `warning-soft` | `#fff4e0` | "Ważne" notice background | – |
| `destructive` | `#b42318` | Errors with text | – |

Rules: green = navigation and "go"; amber = **one** hero action per screen
(not every button); navy = help bands, primary green = footer. No gradients, no
glass, no decorative shadows. Shadow is allowed only as `hover:shadow-sm` on
tiles.

## Typography

- Font stack from the project (`Arial, Helvetica, system-ui`). Body 16px
  (18px in long reading text), line-height ~1.6.
- H1 `text-3xl sm:text-5xl font-bold leading-tight`, H2 `text-2xl sm:text-3xl
  font-bold`, H3 `text-lg font-bold`. Headings are near-black, not green.
- Section headings in gov.pl style may carry a short green bar:
  `before:block before:h-1 before:w-12 before:bg-brand before:mb-3`.
- Reading columns ≤ 70ch. Use semibold green inline links (`text-link`).

## Shape and spacing

- Corners 0–4px (`rounded-sm` at most). No pills.
- Container `shell` (max ~1152px). Vertical rhythm: bands `py-10 sm:py-14`,
  gaps 16/24/32px. Controls ≥ 44px tall.

## Page anatomy (gov.pl grammar)

Build pages from full-width **bands**, each with a `shell` inside:

1. **Demo strip** – `bg-secondary text-sm` one-liner with the demo statement.
2. **Header** – white, `border-b`; left: square
   green mark (`size-10 bg-primary` with white initials "ZP") + product name in
   bold; right: account links. Compact, no mega-menu.
3. **No breadcrumbs.** The project decided against them; panel pages rely on
   the tab bar and a "Wróć do…" link. Each sub-page opens with `PageBand`
   (`components/ui.tsx`): light-green band with H1, lead and page actions.
4. **Hero band** (home and section landing pages only) – `bg-primary-soft`,
   H1 + lead + one amber action + one outline action. Optional right column
   "Na skróty" list. No illustrations, no carousel.
5. **Service tiles** ("Załatw sprawę") – grid of tiles for top-level entry
   points only (2 cols on `sm`, 3 on `lg`). Each tile is a whole link:
   `group flex gap-4 border border-border bg-background p-5 border-t-4
   border-t-brand hover:border-primary hover:shadow-sm`; green outline Lucide
   icon in a `size-12 bg-primary-soft` square; bold title; one-line description; `ArrowRight` at the end. Inside a task, keep
   content as lists and sections, not tiles.
6. **Steps** ("Jak to działa") – ordered list, numbers in `size-10` green
   squares with white bold digits, title + one sentence.
7. **Key figures band** – `bg-secondary`; `dl` grid of big green numbers
   (`text-4xl font-bold text-primary`) with a short label. Values come from
   `app/lib/params.ts` – never hardcode a rate or duration.
8. **Notices** – info: `Notice` (green left border on `bg-secondary`);
   important: `border-l-4 border-action bg-warning-soft` with an `Info` icon
   and a bold "Ważne" label.
9. **Link lists** ("Na skróty", documents) – `divide-y border-y`, each row a
   link with title, optional meta in `text-muted-foreground`, `ChevronRight`
   at the end, row hover `bg-secondary`.
10. **Help band and footer** – use `bg-navy text-navy-foreground` for help
    bands and `bg-primary text-primary-foreground` for the footer. Footer links
    are white and semibold. Its columns collapse to one on phones and it
    carries the demo statement.

## Components

- Buttons: `variant="action"` (amber, navy text) for the hero CTA;
  `primary` (green) for step-forward actions in tasks; `outline` (green text,
  gray border) for secondary; `link` for tertiary. Labels are verbs in Polish:
  "Zaplanuj urlop", "Dalej", "Oblicz", "Pobierz wniosek".
- Icons: Lucide, `strokeWidth={1.75}`, green, `aria-hidden`. Never icon-only
  actions without a text label.
- Tables: header row `bg-navy text-navy-foreground` or `bg-secondary font-bold`;
  zebra rows not needed, `divide-y` is enough.
- Status labels: square `Chip`, never colour-only meaning.

## Do / don't

- Do: flat white surfaces, generous whitespace, one obvious next step,
  plain Polish, visible focus, green outline icons.
- Don't: marketing heroes with photos, cards with heavy shadows, coloured
  body text, more than one amber button in view, centred long text,
  carousels, dark mode.

## Reference implementation

`app/app/prezentacja/page.tsx` is the showcase of the home page in this style.
Copy its bands and tile/step/list patterns rather than inventing new ones.

## References

- [zus.pl](https://www.zus.pl/) – colour and tone reference.
- [gov.pl](https://www.gov.pl/) – page structure reference (bands, tiles,
  footer). Neither is an authority for this app's identity.
