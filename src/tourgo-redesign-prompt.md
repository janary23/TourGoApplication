TourGo full UI redesign

Redesign the entire TourGo app. Use the ui-ux-pro-max plugin skill for every design decision: design system generation, domain searches, stack guidelines, and its pre-delivery checklist. Use the plugin's design-system skill for the token architecture.

Treat the skill's output as input, not the final answer. If a recommendation matches anything in "Hard rules" below, reject it, say why, and search again.

The problem

The app works, but it reads as generic AI output with no identity. It uses one bright blue on everything, identical rounded cards, icons in tinted squares, all-caps section labels, gradient banners, and photos that don't match the place.

Screenshots of the current app are in design-audit/before/. Look at every one before doing anything else.

What TourGo is

Design from this, not from a generic travel template.

Product: A group trip planner for travel in the Philippines. Users create or join a trip with a code, build a day-by-day itinerary, split expenses, share a checklist, post announcements, and chat. Afterwards they keep a memories scrapbook.
Users: Filipino students, barkadas, families, and school or org field trips. They are mostly on phones, often outdoors in bright sun, and sometimes on weak mobile data.
Voice: Friendly and plain. Keep the light Taglish the app already uses ("Biglaang trip?"), and keep it consistent everywhere.
Mascot: Agilito, the bird character. Keep him, but give him one clear job (for example, trip-prep guide and empty states). He should not be scattered across screens as decoration.
Logo: Keep the TourGo mark. Its winding route line is a brand asset you can build on.
Goal

Build one cohesive, premium-quality design system and apply it to every screen, so the app feels like a single polished product kit. It should look specific to Philippine group travel, not like Klook, Airbnb, or any other app.

Hard rules: remove these generic patterns
One saturated blue used for brand, buttons, links, chips, active tabs, and icons. Build a real palette with distinct roles.
All-caps, letter-spaced labels above sections ("SEE YOUR SCHEDULE HERE", "UP NEXT", "TRIP INFO"). Use sentence-case headings, and only where a heading actually helps.
Icons inside pale tinted squares or circles on every row, stat, and tile.
Everything as identical white rounded cards with the same radius, border, and soft grey shadow, including cards nested inside cards.
Decorative gradient banners, glassmorphism overlays on photos, sparkle and lightning icons used as decoration, and rainbow-tinted stat icons.
These text formats:
Meta strings joined with middle dots ("★ 4.5 • Bantayan Island")
Em-dash labels ("1 of 4 — Trip Type")
"→" appended to button or link text
Pill shapes on everything: chips, badges, and a floating bottom nav with a blue active pill.
Tabs inside tabs inside filter chips (the Checklist screen).
Repeated dashed "+ Add" boxes as empty states.
Generic marketing copy and system jargon, such as "Plan, explore, and recall your journeys", "Get ready for an amazing trip", "Workspace Room", and "modules".
Default fonts (Inter, Poppins, Outfit, Montserrat, Plus Jakarta Sans), unless you can justify the choice for this specific brief.
The other common generated looks:
Cream background with a serif display font and terracotta accent
Near-black background with an acid-green accent
Purple or pink "AI" gradients
Issues visible in the screenshots (fix all of them)

Home

The "Best of the Philippines" hero has no image, only a grey gradient.
The Recommended cards reuse the same beach photo.
Each card subtitle repeats the place name.
The mascot avatar beside the search bar has no purpose.

Trips

The featured Baliwag trip shows a US desert photo.
The calendar and weather cards are cramped.

Trip home

The Baguio trip also shows the desert and van photo.
A "?" avatar appears in Updates.
"See all" collides with the floating action button.
The progress bar shows "0%" with no guidance.

Activity

Icons don't match event types (a megaphone is used for itinerary items).
The mascot floats over feed items.
The filter chips give no hint that they scroll.

Create trip

Step 3: the destination suggestion tiles render empty.
Step 3: the traveler count +/− buttons are clipped off-screen.
Step 4: trip names have inconsistent casing ("vacation Trip", "vacation to Baguio City").
Step 4: the summary says "1 modules active".

Join trip

The case-insensitive note is repeated twice.

Itinerary

Four identical empty day boxes.
"Baguio City" is repeated on every day and again in the header.

Checklist

Three stacked levels of tabs and chips.
A desktop-style table header ("# TASK ASSIGNED") on a mobile screen.

Scrapbook

The "Completed" badge is unreadable over the photo.
The photo doesn't match Baliwag.
"0 stops visited" is shown as a headline stat.

Photos everywhere

Never show a photo of a different place.
If no matching image exists, use a designed fallback (place name plus a brand pattern), not random stock.
Constraints
UI layer only. Do not change business logic, API or Supabase calls, database schema, auth, routing, or state management. If a design change needs a data change, list it and ask me first.
Keep every feature and screen. You may merge, reorder, or simplify UI, but tell me what moved.
Detect the stack from the repo (package.json, app.json, pubspec.yaml). Don't assume.
One token file. All colors, type, spacing, radii, shadows, and motion come from a single theme or token file. No raw hex values or magic numbers in components.
Fonts must render ₱ and ñ correctly.
Accessibility and readability:
Text contrast of at least 4.5:1, including text on photos
Touch targets of at least 44×44
Labels on icon-only buttons
Safe areas respected
Text scaling without clipping
Reduced-motion preference respected
Readable in bright sunlight
Weak data: Use skeleton loaders, image placeholders, and appropriately sized images.
Motion: Give clear feedback on taps and state changes. Use at most one signature animated moment, and no fade-up on every section.
Copy:
Sentence case throughout.
Buttons name the exact action, and that name stays the same through the flow ("Create trip" leads to "Trip created").
Errors say what happened and how to fix it.
Empty states tell the user what to do next.
Git: Work on a new branch, redesign/ui-v2, and commit after each phase.
Process
Phase 1: Audit and direction (stop for approval)
Read every screenshot in design-audit/before/ and map each one to its screen file. List any screens in the code that aren't in the screenshots (Explore, Profile, and so on).
Detect the stack.
Run the ui-ux-pro-max design system generator for the whole app, starting with: "group travel planner Philippines mobile" --design-system -p "TourGo" --variance 6 --motion 4 --density 5 Then supplement with these searches:
--domain typography
--domain color
--domain ux (bottom navigation, multi-step form, empty state, text over images)
--domain icons
--stack <detected stack>
Propose 2 distinct design directions. For each, give:
5–6 named hex colors, each with its role
Typefaces with their roles, plus a type scale
A layout concept, with ASCII wireframes of Home and Trip home
One signature element grounded in TourGo's world. Examples: the logo's route line as the itinerary spine, or trip cards that read like boarding passes with the trip code as the ticket number.
How cards, list rows, headers, and bottom navigation will look
Check each direction against the Hard rules. Revise any part that would fit any generic travel app, and say what you changed.
Stop and wait for me to pick a direction.
Phase 2: Foundation
Persist the design system with --design-system --persist -p "TourGo" --output-dir <project root>.
Edit MASTER.md so it matches the direction I approved exactly.
Build the token file and these shared components:
Button, IconButton, TextField
Surface/Card variants, ListRow
SegmentedControl, Chip, Badge
Avatar and AvatarStack
Stepper, ProgressBar
EmptyState, ScreenHeader, BottomNav
BottomSheet, Toast, Skeleton
PhotoWithFallback
Commit.
Phase 3: Pilot screens (stop for review)
Redesign Home and Trip home only, using the new components.
If you can run the app and capture screenshots (for example, with Playwright on web), save them to design-audit/after/ and compare them with the before screenshots.
Commit.
Stop and wait for my feedback.
Phase 4: Roll out

Redesign the remaining screens in this order, with one commit per group:

Splash, Login, Sign up
Trips, Join trip, Create trip (all 4 steps)
Trip home sub-screens: Itinerary, Checklist (Group tasks and What to bring)
Activity, Scrapbook
Explore, Profile, and anything else found in Phase 1

Create a pages/<screen>.md override only when a screen truly needs to deviate from MASTER.md.

Phase 5: QA
Run the ui-ux-pro-max pre-delivery checklist (references/pro-rules.md) on every screen.
Confirm none of the following remain:
Old styles or raw hex values
Any pattern from the Hard rules
Action names that change partway through a flow
Lists without empty, loading, and error states
Report what you fixed and anything still open.