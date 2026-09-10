You are acting as an elite Principal Mobile Product Designer and Senior React Native / Expo Engineer. 

I need you to perform a complete, ground-up UI/UX redesign of the TourGo mobile application. TourGo is a specialized Philippine group travel planner for barkadas (friend groups), families, student orgs, and tour leaders.

The current implementation works functionally, but visually it suffers from generic "AI slop" (repetitive rounded white cards, one saturated blue sprayed everywhere, generic weather and calendar widgets, identical icons in pastel squares, stock templates, and lack of craft). We are completely throwing away the current visual design and rebuilding the entire visual layer from scratch to match the craft and quality of world-class apps like Wanderlog, Flighty, Tripsy, and Linear Mobile — while making it authentically tailored to Philippine group travel.

Activate and use all of your available skills: `ui-ux-pro-max`, `mobile-design`, `ui-design-system`, `frontend-design`, and `figma`.

---

### I. Hard Design Rules — Eradicate "AI Slop"
1. **No Monochromatic Blue Wash:** Do not use a single saturated blue for brand, buttons, active tabs, badges, icons, and links. Create a rich, curated palette with distinct functional roles (Route Brand, Deep Ink, Warm Paper/Sand backgrounds, Forest/Palm for confirmed states, Amber for pending, Signal Red strictly for alerts).
2. **No Generic Container Cards:** Stop wrapping every single row or section in identical rounded cards with grey drop shadows. Use architectural layout variety: flat editorial rows separated by fine hairlines, edge-to-edge photo surfaces with high-legibility scrims, and subtle tonal shifts.
3. **No Icons in Tinted Pastel Boxes:** Stop putting every leading icon inside a small pastel-colored square or circle. Let typography, iconography, and spatial hierarchy drive the layout.
4. **No Repeated Dashed "+ Add" Placeholders:** Empty states must be designed editorial moments with clear next actions, contextual illustrations, or Agilito (our mascot) guiding the user — never repetitive empty boxes.
5. **Philippine Typography & Glyphs:** The type system must handle `₱` (Philippine Peso U+20B1) and `ñ` flawlessly across all weights. Avoid generic AI fonts (no Inter, Poppins, or Montserrat). Use distinctive, premium typefaces (e.g. Sora for punchy display headings, Work Sans / Plus Jakarta / bespoke pairings for legible editorial text).
6. **High Sunlight & Outdoors Readability:** Designed for travelers on phones in bright Philippine sun: minimum 4.5:1 text contrast, at least 44×44pt touch targets, and resilient visual states.

---

### II. Bespoke Redesign of Core Widgets & Components
Redesign every widget from scratch so they look proprietary to TourGo, not like off-the-shelf templates:

1. **Bespoke Weather Widget:** 
   - Not just a temperature number in a generic box.
   - Tailored to Philippine tropical travel: shows rain probability, UV index, humidity, typhoon/storm warnings, and actionable packing tips (e.g., "Bring umbrella & sunblock for afternoon island hopping").
2. **Bespoke Calendar & Date Widget:**
   - Not a cookie-cutter mini-month grid.
   - A tactile travel-first calendar showing continuous multi-day trip spans, departure count-downs, day badges, and multi-member availability highlights.
3. **Active Trip Floating Day-Plan Widget:**
   - A sleek, dynamic travel companion pill/card showing the *current live stop*, upcoming ETA, and next meet-up checkpoint with quick roll-call access.
4. **Signature Route-Line Timeline:**
   - The winding route motif from the TourGo mark acts as a living spine running through the itinerary, connecting stops like beads on a journey, visually indicating progress as stops are completed.
5. **Custom Bottom Navigation Bar:**
   - Docked, clean, and tactile. Eliminate floating bubble capsules or generic active pills.

---

### III. Complete Feature Scope to Rebuild & Redesign

Ensure every single feature in TourGo is redesigned into this cohesive design system:

1. **Home Dashboard:**
   - Active trip hero banner with countdown, live status, and destination imagery.
   - Bespoke Weather & Calendar travel widgets.
   - Quick Action bar: "Create Trip" & "Join Trip with Code".
   - Curated Philippine Discovery feed & weekend getaway recommendations.

2. **Philippine Explorer & 82-Province Interactive Map:**
   - Interactive SVG/Canvas map of the Philippine archipelago tracking provinces visited out of 82.
   - Digital Passport & province stamp collector with custom wax/ink stamp aesthetics.
   - Municipality & spot directory with rich category filtering (beaches, waterfalls, heritage, food trips).

3. **Trip Creation & Join Wizard:**
   - Multi-step frictionless wizard (Destination search, multi-day calendar span, barkada size counter with accessible steppers, budget estimates, travel pace).
   - Instant 6-character trip invite code generation and shareable invite card (with QR code and copy link).
   - Frictionless "Join Trip" screen with auto-focusing code entry cells.

4. **Active Trip Management Hub:**
   - **Trip Overview:** Header with trip dates, destination weather, member avatars, and quick-action shortcuts.
   - **Day-by-Day Itinerary:** Multi-day tabbed timeline with route-line spine, time blocks, transit notes (e.g., van hire, ferry times), location tags, and stop check-offs.
   - **Shared Expenses & Split:** Bill logging with currency in ₱, payer selection, split toggles (equal vs. custom), category breakdown, and an intuitive "Who Owes Whom" balance matrix with debt settlement actions.
   - **Dual Checklist:** Clean segmented view for "Group Preparation Tasks" (van rental, downpayments) with member assignments vs. personal "What to Bring" packing checklists.
   - **Barkada Hub:** Integrated trip group chat, pinned organizer announcements, democratic group voting polls (choosing restaurants, meet times), and roll-call attendance check-ins.
   - **Document Vault:** Organized storage for plane tickets, hotel vouchers, booking reference numbers, and emergency IDs.
   - **Safety Hub & Guardian Tracker:** Quick-dial directory for local emergency hotlines (PNP, coast guard, MDRRMO, nearest hospital), one-tap SOS broadcast, and guardian live check-in updates.
   - **Trip Scrapbook & Memories:** Post-trip photo gallery, visited stops recap, digital souvenir badges, and shareable trip summary card.

5. **Activity Feed & Notifications:**
   - Chronological audit log of barkada actions (expenses added, stops checked off, poll results, announcements).

6. **Traveler Profile & Travel Stats:**
   - Visited provinces counter (X / 82), past trips archive, wishlist spots, and offline cache settings.

---

### IV. Architecture & Execution Strategy
1. **Safety & Stability:** Do NOT alter database schemas, Supabase queries, authentication logic, or routing parameters. Update the UI and presentation layer exclusively.
2. **Design Tokens First:** Refactor or replace `tokens.ts` and `ThemeContext.tsx` with our new palette, typography scale, spacing units, and tactile micro-animation tokens.
3. **Atomic Primitives:** Build or update the shared UI kit (`Button`, `Card`, `TextField`, `SegmentedControl`, `Badge`, `AvatarStack`, `Skeleton`, `EmptyState`).
4. **Widget Rebuild:** Completely rewrite the Calendar widget, Weather widget, and Active Day-Plan widget.
5. **Screen-by-Screen Rollout:**
   - Phase 1: Home Dashboard & Tab Navigation.
   - Phase 2: Active Trip Hub (Overview, Itinerary, Expenses, Checklist).
   - Phase 3: Explorer Map & Passport Stamps.
   - Phase 4: Trip Creation, Join Flow, Safety Hub, and Scrapbook.
6. **Verification:** Test each screen for visual hierarchy, contrast, touch targets (≥44pt), dark/light mode parity, and zero layout overflows.

Please inspect the codebase, outline your design plan, and begin executing Phase 1 immediately.
