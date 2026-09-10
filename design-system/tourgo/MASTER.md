# TourGo Design System — Master File

> **LOGIC:** When building a specific screen, first check `design-system/tourgo/pages/[screen-name].md`.
> If that file exists, its rules **override** this Master file. Otherwise, follow the rules below.
>
> This file is the *documented rulebook*. The single **implemented** source of
> truth the app actually imports from is `src/components/ui/tokens.ts` +
> `src/context/ThemeContext.tsx` — if this file and the code ever disagree,
> the code is the bug, not this file.

---

**Project:** TourGo
**Direction:** A — "Route Line" (approved 2026-09-10, superseding the raw
`--design-system` generator run, which returned an "Aurora UI" gradient
style rejected for violating the Hard Rules — see `src/tourgo-redesign-prompt.md`)
**Category:** Group travel planner, Philippines, mobile-first (Expo / React
Native + react-native-web)
**Design Dials:** Variance 6/10 (Balanced/Modern) | Motion 4/10 (Standard,
one signature moment) | Density 5/10 (Standard)

---

## Design principle

One accent marks *interactive/selected*, never *which feature*. Every other
color has exactly one job. Flat surfaces separated by hairlines and spacing,
not stacked shadow-bearing cards. The logo's route line is a real, reused
motif — not a one-off illustration.

## Global Rules

### Color palette — Light

| Role | Hex | Token (`ThemeColors`) | Usage |
|---|---|---|---|
| Route Blue | `#0B7FD6` | `brand` | Brand mark, primary buttons, links, active tab/segment — **only** |
| Route Blue, tint | `#E7F2FC` | `brandLight` | Selected-row tint, quiet emphasis |
| Route Blue, pressed | `#0A6CB8` | `brandPressed` | Pressed state of brand fill |
| Ink | `#151A21` | `textPrimary` | Headings, body text |
| Ink, muted | `#5B6472` | `textSecondary` | Secondary/meta text |
| Paper | `#F7F5F1` | `bg` | App background — warm, not stark grey |
| Surface | `#FFFFFF` | `surface` | Cards, sheets, inputs |
| Hairline | `#E7E3DB` | `divider` | Row separators, card edges (never a boxed shadow) |
| Palm | `#256D4F` | `semantic.success` | Paid, done, confirmed |
| Palm, surface | `#E7F3ED` | `semantic.successSurface` | Success chip/badge fill |
| Amber | `#C97A2B` | `semantic.warning` | Pending, due, needs attention |
| Amber, surface | `#FBF0E1` | `semantic.warningSurface` | Warning chip/badge fill |
| Signal Red | `#B23B33` | `semantic.danger` | Destructive actions, overdue **only** — never decoration |
| Signal Red, surface | `#F8E7E5` | `semantic.dangerSurface` | Danger chip/badge fill |

### Color palette — Dark

Brand **lightens**, it does not hue-shift (matches the existing
`tourgo-design-system` rule: `#028BEB` → `#47ADF5` in dark). Route Blue
follows the same law: `#0B7FD6` → `#4FA3E8`. Filled brand CTAs keep the
light-mode fill value in both themes (a saturated block carrying white text
doesn't need to lighten). Semantic colors lighten enough to read on a dark
surface; surfaces separate by *value*, not by shadow (shadows are omitted in
dark — see Motion/Elevation below).

| Role | Hex | Token |
|---|---|---|
| Route Blue | `#4FA3E8` | `brand` |
| Route Blue, tint | `rgba(79,163,232,0.16)` | `brandLight` |
| Route Blue, pressed | `#78BBEF` | `brandPressed` |
| Route Blue, fill (unchanged) | `#0B7FD6` | `brandFill` |
| Ink (inverted) | `#F3F1EC` | `textPrimary` |
| Ink, muted | `#A6ADB8` | `textSecondary` |
| Paper (dark) | `#14171B` | `bg` |
| Surface | `#1C2026` | `surface` |
| Hairline | `#2A2F36` | `divider` |
| Palm | `#4ADE80` | `semantic.success` |
| Amber | `#FBBF24` | `semantic.warning` |
| Signal Red | `#FF6B6B` | `semantic.danger` |

**Deliberate exceptions that keep their own palette** (per existing
[[tourgo-design-system]] memory, still true under Direction A): Explore map
themes, user-selectable passport-stamp colors, weather condition icons,
`TripShareCard.tsx` (fixed-size share PNG, must not themeswap), onboarding
confetti.

### Typography

- **Heading font:** Sora (weights 600/700) — geometric, distinctive, not on
  the banned list (Inter/Poppins/Outfit/Montserrat/Plus Jakarta Sans).
- **Body font:** Work Sans (weights 400/500/600).
- **Verified against the shipped TTFs** (`fontTools` cmap check, all 8 Sora
  weights + all 24 Work Sans weights/italics): Work Sans has `₱` (U+20B1) and
  `ñ` at every weight. Sora has `ñ` but **no `₱` at any weight**. Sora is
  heading-only (screen/section/card titles — place and trip names, never a
  peso amount), so this is safe as shipped, with one exception already
  applied: the `display` token (large numerals/stat values, which do carry
  peso totals) is set to Work Sans Bold, not Sora, for exactly this reason.
  Any *new* token or ad-hoc style that puts a peso amount in a Sora weight
  would hit the same gap — check against this note before doing that.
- **Google Fonts:** `@expo-google-fonts/sora` (SemiBold, Bold),
  `@expo-google-fonts/work-sans` (Regular, Medium, SemiBold).

**Type scale** (mirrors the existing 16-token scale in `tokens.ts` by name —
implementation swaps `fontFamily` only, sizes/line-heights carry over except
where noted):

| Token | Size/Line | Weight | Family |
|---|---|---|---|
| `largeTitle` | 30/36 | Sora Bold | Sora |
| `display` | 24/30 | Work Sans Bold | Work Sans — not Sora; carries ₱ amounts, see glyph note above |
| `title` | 20/27 | Sora SemiBold | Sora |
| `titleSm` | 16/22 | Sora SemiBold | Sora |
| `headline` | 15/21 | Work Sans SemiBold | Work Sans |
| `body` | 14/21 | Work Sans Regular | Work Sans |
| `bodyStrong` | 14/20 | Work Sans SemiBold | Work Sans |
| `subhead` | 13/18 | Work Sans Regular | Work Sans |
| `emphasis` | 13/18 | Work Sans Medium | Work Sans |
| `footnote` | 12/16 | Work Sans Regular | Work Sans |
| `caption` | 11/15 | Work Sans Medium | Work Sans |
| `overline` | 11/14 | Work Sans SemiBold | Work Sans — **sentence case**, not letter-spaced all-caps (Hard Rule) |
| `micro` | 10/14 | Work Sans Medium | Work Sans |
| `microStrong` | 10/14 | Work Sans SemiBold | Work Sans |
| `label` | 12/16 | Work Sans Medium | Work Sans |
| `mono` | 15/20 | Work Sans SemiBold | Work Sans (tabular figures for amounts/counts) |

`overline`'s role changes under Direction A: it was previously rendered
uppercase with wide letter-spacing everywhere (the Hard Rule's "SEE YOUR
SCHEDULE HERE" pattern). It now renders in sentence case, and is used only
where a group header genuinely helps scanning — not above every section by
default.

### Spacing, radius, motion

Unchanged from the existing 4pt system in `tokens.ts` (`space`, `radius`) —
Direction A does not need a new scale, it needs different colors, type, and
restraint in how surfaces are used. Radius stays functional: `sm`/`md` for
inputs and rows, `lg`/`xl` reserved for sheets and the one hero surface per
screen — not applied identically to every card regardless of content.

**Elevation:** unchanged rule — flat + hairline in light, value-separation
only in dark, shadow reserved for things that truly float (sheets, the
active floating widget). No shadow-bearing card nested inside another
shadow-bearing card.

**Motion:** Standard tier (4/10). Press feedback stays mechanical (`scale
0.975`, existing `motion.pressScale`). The one signature animated moment
(brief's "at most one") is the **route-line draw-on** — see Signature
Element below — everything else gets simple fade/slide feedback, not a
fade-up on every section. All motion must resolve instantly under
`prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled`.

---

## Signature element — the Route Line

The logo's winding route line is a real, reused UI element, not a one-off
mark:

1. **Itinerary spine.** On the Itinerary screen, a vertical route line runs
   down the left edge; each day's stops are beads on that line. Replaces the
   four identical empty day boxes — the line itself communicates "day 1 of
   4," so days don't need to repeat the destination name as a heading.
2. **Trip progress.** The same line, compressed small, shows how far into
   the trip / checklist a group is — replaces bare "0%" text with a line that
   fills as stops are completed. Always paired with a plain-language line
   ("4 tasks to go"), never a number alone.
3. It only ever appears where it's tracking real progress through a
   sequence. It is not decoration on cards that aren't about sequence.

## Component specs (React Native / StyleSheet, resolved from `tokens.ts`)

### Button

```ts
// Primary
{ backgroundColor: colors.brandFill, borderRadius: radius.md, minHeight: 48,
  paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' }
// label: T.bodyStrong, color: '#FFFFFF' always (fixed fill, see brandFill rule)

// Secondary (outline)
{ borderWidth: hairline * 2, borderColor: colors.brand, backgroundColor: 'transparent',
  borderRadius: radius.md, minHeight: 48 }
// label color: colors.brand

// Destructive — Signal Red, used only for delete/leave/remove, never styled
// like a primary action
```

Every button names the exact action ("Create trip", "Join trip", "Add
task") and that name is unchanged through the flow it starts. No trailing
"→" appended to label text — an icon glyph carries direction, not a
character in the string.

### IconButton

44×44 minimum hit area (hitSlop makes up the difference on a visually
smaller glyph). Icon-only buttons always carry `accessibilityLabel`. No
tinted-square/circle background by default — the icon sits directly on the
surface; a tint fill is reserved for a genuine *selected* state, never
applied uniformly to every row's leading icon.

### TextField

Label above the field in `label` token (sentence case). Border `divider` at
rest, `brand` on focus, `semantic.danger` on error with the error message
below in `footnote` explaining what happened and how to fix it. Min height
48. Placeholder is example text, never the only label.

### Surface / Card variants

Three variants, chosen by content, not applied uniformly:
- **Flat row** — hairline separators, no card chrome. Default for lists.
- **Surface card** — `colors.surface`, `radius.lg`, used for one
  self-contained unit (a summary, a form section). No nested surface cards.
- **Photo card** — full-bleed image, gradient-free scrim (solid
  `rgba(21,26,33,0.55)` band, not a decorative gradient) sized to guarantee
  4.5:1 for the overlaid text, real place name once.

### ListRow

Leading icon or avatar (no forced tint square), title (`headline`),
optional subtitle (`subhead`), trailing value/chevron. 44pt min height.

### SegmentedControl

Replaces "tabs inside tabs inside filter chips." One level only — Checklist
becomes a single segmented control (Group tasks / What to bring), not
nested tab+chip+chip.

### Chip / Badge

Chip: selectable filter, one row, scroll affordance shown via a visible
partial next chip (not implied purely by touch). Badge: status only —
Palm/Amber/Signal Red per semantic role, sentence case text, sufficient
contrast pair (dark text on light surface fill, not white-on-photo without a
scrim).

### Avatar / AvatarStack

Circular, initials-fallback (never a bare "?" placeholder — see Trip
Updates issue in the audit). Stack overlaps at a fixed offset, max 3 visible
+ "+N" tile.

### Stepper (traveler count)

Full-width row with the numeral centered and +/− targets at each end,
44×44, inset from the container edge so they cannot clip off-screen (fixes
the Create Trip step 3 bug).

### ProgressBar

Route Blue fill on a hairline track. Always paired with the plain-language
line described under Signature Element — never shown bare.

### EmptyState / InlineEmpty

Unchanged from existing system (`EmptyState` for a whole screen,
`InlineEmpty` for one section) — copy always states the next action
("Add the first stop," not a bare dashed box), and repeated instances (e.g.
4 empty itinerary days) are visually quieter after the first so they don't
shout in unison.

### ScreenHeader / BottomNav

`NavBar`'s existing three-equal-slot rule continues. BottomNav: flat bar
(no floating blue pill), active tab marked by icon fill + Route Blue label,
5 items max.

### BottomSheet, Toast, Skeleton, PhotoWithFallback

- **BottomSheet:** reuses existing `Sheet` primitive; drag handle, safe-area
  bottom inset.
- **Toast:** reuses existing `Feedback.tsx` system — no new component.
- **Skeleton:** shimmer block sized to the real content it replaces (not a
  generic spinner), respects reduced motion (static pulse instead of
  shimmer sweep).
- **PhotoWithFallback:** tries the real matched photo; on missing/mismatched
  image, renders a designed fallback — place name over a route-line pattern
  tile in a palette-derived tone — never a random stock photo of a different
  place (fixes the Baliwag/Baguio desert-photo bug).

---

## Anti-patterns — Hard Rules (do not reintroduce)

- ❌ One saturated blue for brand + buttons + links + chips + tabs + icons
- ❌ All-caps, letter-spaced section labels
- ❌ Icons inside pale tinted squares/circles on every row
- ❌ Identical white rounded cards nested inside cards
- ❌ Decorative gradients, glassmorphism over photos, sparkle/lightning
  decoration, rainbow stat icons
- ❌ Middle-dot meta strings, em-dash labels, trailing "→" in button text
- ❌ Pills on everything; floating bottom nav with a blue active pill
- ❌ Tabs inside tabs inside filter chips
- ❌ Repeated dashed "+ Add" empty boxes
- ❌ "Plan, explore, and recall your journeys" / "modules" / "Workspace
  Room" style generic copy
- ❌ Poppins / Outfit / Plus Jakarta Sans / Inter / Montserrat

## Pre-Delivery Checklist

- [ ] No raw hex in any screen — everything resolves from `tokens.ts` /
      `ThemeColors`
- [ ] Every icon-only button has an `accessibilityLabel`
- [ ] Touch targets ≥ 44×44
- [ ] Text contrast ≥ 4.5:1, including text over photos
- [ ] Sentence case throughout; no letter-spaced all-caps labels
- [ ] Empty states name the next action
- [ ] Loading state uses a content-shaped skeleton, not a spinner alone
- [ ] Button label text is unchanged from the screen that starts the flow to
      the confirmation that ends it
- [ ] Reduced-motion alternative verified for the route-line animation
- [x] `₱` and `ñ` verified against the shipped font files (see Typography
      note) — `display` moved to Work Sans Bold for this reason
