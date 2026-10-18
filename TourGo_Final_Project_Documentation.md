# ADVANCE MOBILE APPLICATION DEVELOPMENT
## FINAL PROJECT DOCUMENTATION

### PROJECT TITLE:
# **TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform**

**Prepared by:** Harry Sevilla  
**Subject:** Mobile Application Development (CTELEC4L)  
**Section:** ITE 231  
**Submitted to:** Prof. Paul John D. Cabance  
**Date Submitted:** October 2026  

---

## TABLE OF CONTENTS

- [CHAPTER 1 – PROJECT OVERVIEW](#chapter-1--project-overview)
  - [Introduction](#introduction)
  - [Project Objectives](#project-objectives)
  - [Scope of the Project](#scope-of-the-project)
  - [Limitations](#limitations)
- [CHAPTER 2 – SYSTEM ANALYSIS AND DESIGN](#chapter-2--system-analysis-and-design)
  - [System Description](#system-description)
  - [System Flow](#system-flow)
  - [Use Case Diagram](#use-case-diagram)
  - [Database Design](#database-design)
  - [User Interface Design](#user-interface-design)
- [CHAPTER 3 – SYSTEM DEVELOPMENT](#chapter-3--system-development)
  - [Tools and Technologies Used](#tools-and-technologies-used)
  - [Development Process](#development-process)
- [CHAPTER 4 – RESULTS AND TESTING](#chapter-4--results-and-testing)
  - [System Features](#system-features)
  - [Functional Testing](#functional-testing)
  - [Evaluation](#evaluation)
- [CHAPTER 5 – CONCLUSION AND RECOMMENDATIONS](#chapter-5--conclusion-and-recommendations)
  - [Conclusion](#conclusion)
  - [Recommendations](#recommendations)

---

## CHAPTER 1 – PROJECT OVERVIEW

### Introduction
The project entitled **"TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform"** is a cross-platform mobile application developed to resolve the disorganization, safety uncertainties, and logistics headaches commonly encountered by Filipino travel groups and *barkadas*. In traditional group trips, coordination is scattered across disjointed platforms—chat apps where decisions are buried, messy spreadsheets for expense splitting, and personal navigation tools. This fragmented workflow often causes itinerary disagreements, awkward bill collection, and genuine safety concerns when members drift apart in unfamiliar travel destinations.

TourGo integrates every phase of group travel into a unified, responsive mobile ecosystem. It features an intelligent day-by-day itinerary builder supported by Google Gemini AI, collaborative group polls with real-time tallies, an itemized expense ledger with automated split calculations, and an interactive Guardian Mode safety system. Guardian Mode provides organizers with configurable geofenced safe-zone perimeters (measured in meters) and real-time live member radar tracking. Furthermore, TourGo features native high-priority push notifications and in-app heads-up banners on real physical devices, ensuring that members receive instant updates whenever itineraries change or group activities occur. When the journey ends, TourGo converts the experience into an interactive community feed post and a Facebook-style expandable photo scrapbook.

### Project Objectives

#### General Objective
To design, develop, test, and implement an all-in-one collaborative mobile application and real-time safety coordination platform that empowers Filipino travel groups and barkadas to seamlessly plan itineraries, track shared finances, maintain live group safety, and commemorate their travel journeys within a synchronized mobile experience.

#### Specific Objectives
1. **Streamlined Group Access**: To implement an authentication and trip hosting system utilizing unique 6-character invite codes and Supabase role-based security (Organizer vs. Member).
2. **Collaborative Itinerary Builder**: To develop a day-by-day itinerary creator with time slot tagging, sequential accuracy-checked route mapping, free keyless landmark discovery, and Google Gemini AI day-plan generation.
3. **Guardian Safety Geofencing**: To build an interactive Guardian Mode safety radar featuring organizer-configurable geofenced safe zones (in meters) and automated perimeter-drift alerts.
4. **Real-Device Push Notifications**: To configure native Android high-importance notification channels and Supabase Realtime listeners that trigger instant heads-up notification banners on physical mobile devices.
5. **Transparent Financial Coordination**: To establish an itemized shared expense ledger with automated split calculation, debtor/creditor balance visibility, and payment settlement tracking.
6. **Logistics & Decision Polling**: To provide organizer-run destination/activity polls with live vote tallies, shared trip document repositories, and categorized group/personal packing checklists.
7. **Community & Scrapbook Memories**: To develop a social community feed and an auto-generated visual scrapbook with full-screen Facebook-style photo lightbox expansion.

### Scope of the Project
The application provides the following core features:
- **User Authentication & Profile Onboarding**: Email/password authentication via Supabase Auth, personalized traveler preferences onboarding, avatar selection, and dark/light theme switching.
- **Trip Hosting & Joining**: One-tap trip creation generating a unique 6-character join code, participant role assignment, and multi-trip switching.
- **Day-by-Day Itinerary & AI Planner**: Structured scheduling with transport/food/activity tags, free keyless POI discovery (Wikipedia, OpenStreetMap, Photon), and Google Gemini AI itinerary generation.
- **Guardian Safety Radar & Geofencing**: Organizer-configurable safe zone radius (meters) rendered as a real-radius perimeter circle on interactive Leaflet maps with live member location tracking and perimeter-drift warnings.
- **Real-Device Push Notifications**: Native notification permissions, Expo push token storage in Supabase, Android high-priority channel (`trip-updates`), and in-app drop-down toast banners displaying the TourGo logo.
- **Group Logistics (Polls & Checklists)**: Destination and activity polling with live vote counters, assignable group tasks, and private personal packing checklists.
- **Shared Expense Ledger**: Itemized travel expenses, split calculation (solo vs. equally shared), and payment settlement logging.
- **Community Feed & Media Lightbox**: Unified single-card itinerary posts, multi-photo galleries with pinch-to-zoom Facebook-style lightbox expansion, and post-trip scrapbook generation.

### Limitations
- **Network Connectivity Requirement**: The mobile app requires an active internet connection to synchronize realtime database changes, chat messages, and push notifications with Supabase.
- **Hardware Location Permission**: Guardian Mode live tracking requires GPS hardware and explicit foreground/background user permissions on the traveler's mobile device.
- **Third-Party API Free Tier Limits**: AI itinerary generation and free geocoding services depend on Google Gemini and OpenStreetMap public server quotas.
- **Coordination-Only Financial Ledger**: The shared expense module calculates debts and verifies payment submissions, but does not process monetary transactions or integrate fiat banking gateways.

---

## CHAPTER 2 – SYSTEM ANALYSIS AND DESIGN

### System Description
TourGo provides a structured end-to-end travel experience. A user registers and customizes their travel preferences during onboarding. On the main dashboard, the user is greeted by an animated soaring Philippine Eagle mascot that guides their travel journey. The user can either host a trip—generating a 6-character invite code—or join an existing trip by entering a code provided by their barkada organizer.

Once inside the trip workspace, members collaborate across dedicated tabs. Organizers create polls to decide destinations, while members build a synchronized day-by-day itinerary. Travelers can ask the integrated Google Gemini AI engine to synthesize a custom schedule tailored to their group size and interests. During active travel, the organizer enables Guardian Mode on an interactive Leaflet map, establishing a geofenced safe-zone circle around the base camp. If a member wanders outside this perimeter, or whenever someone adds an itinerary stop, logs an expense, or posts a message, the system fires native push notifications directly to members' devices. At trip completion, the journey is archived into a scrapbook and shared to the community feed.

### System Flow
**Start → Login / Registration → Mascot Dashboard → Host Trip (6-Char Code) / Join Trip → Collaborative Planning (Itinerary, AI Planner, Polls, Checklists) → Active Travel & Guardian Safety (Geofenced Radar, Push Notifications, Group Chat) → Post-Trip Scrapbook & Community Feed → End**

### Use Case Diagram

#### Actors:
- **Trip Organizer (Host)**: Creates trips, configures geofenced radius, manages member roles, publishes announcements, creates polls, and finalizes itineraries.
- **Trip Member (Barkada)**: Joins trips via code, votes in polls, checks off checklist items, logs shared expenses, shares live GPS location, and comments on community posts.

| Use Case ID | Title | Functional Description |
|:---|:---|:---|
| **UC-01** | Authenticate User | User registers and signs in via Supabase Auth with persistent session storage. |
| **UC-02** | Host / Join Trip | Organizer creates a trip with 6-char code; travelers enter code to join group. |
| **UC-03** | Build Itinerary | Members collaborate on day-by-day activities with time slots and POI coordinates. |
| **UC-04** | AI Day-Plan Assistant | Travelers request automated itinerary suggestions powered by Google Gemini. |
| **UC-05** | Guardian Safety Mode | Organizer sets geofenced radius in meters; system tracks members and alerts on perimeter drift. |
| **UC-06** | Real-Time Push Alerts | Triggers heads-up native notifications and in-app toast banners on trip updates. |
| **UC-07** | Decision Polling | Organizers launch polls; members submit votes with live synchronized tallies. |
| **UC-08** | Shared Expense Splitting | Users record expenses; system computes per-member splits and tracks settlement status. |
| **UC-09** | Community Feed & Lightbox | Users publish trip recaps as unified cards and view photos in Facebook-style lightbox. |

### Database Design

#### ERD Overview
The database architecture is designed in Supabase (PostgreSQL 15). A `profile` can organize or join multiple `trips` through `trip_members`. Each trip has child relations for `itinerary_items`, `polls`, `expenses`, `checklist_items`, and `chat_messages`. The `community_posts` table connects finished itineraries with public community feeds.

#### Table: `profiles`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | User identifier linked directly to Supabase `auth.users(id)` |
| `full_name` | Text | Full display name of the traveler |
| `avatar_url` | Text | Public storage URL for user profile picture |
| `email` | Text | User email address used for login and notifications |
| `push_token` | Text | Registered Expo Push Token for real-device system notifications |
| `preferences` | JSONB | User travel preferences (pace, budget, interests) |
| `created_at` | Timestamptz | Account creation timestamp |

#### Table: `trips`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique trip identifier |
| `title` | Text | Descriptive title of the trip (e.g., 'El Nido Barkada Getaway') |
| `destination` | Text | Primary destination name or municipality |
| `invite_code` | Text (Unique) | 6-character alphanumeric code for group joining |
| `start_date` | Date | Trip starting date |
| `end_date` | Date | Trip ending date |
| `cover_image` | Text | Cover photo URL for trip header and scrapbook |
| `guardian_radius` | Integer | Configurable geofence radius in meters (e.g., 500m, 1000m) |
| `dest_lat / dest_lng` | Numeric | Geographic coordinates of the trip destination base camp |
| `created_by` | UUID (FK) | Host user ID referencing `profiles.id` |

#### Table: `trip_members`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique membership record ID |
| `trip_id` | UUID (FK) | Trip joined referencing `trips.id` |
| `user_id` | UUID (FK) | Member user ID referencing `profiles.id` |
| `role` | Text | Role designation ('organizer' or 'member') |
| `last_lat / last_lng` | Numeric | Live GPS coordinates shared for Guardian Radar |
| `last_location_time` | Timestamptz | Timestamp of most recent location update |
| `joined_at` | Timestamptz | Timestamp when the user joined the trip |

#### Table: `itinerary_items`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique itinerary stop identifier |
| `trip_id` | UUID (FK) | Associated trip referencing `trips.id` |
| `day_number` | Integer | Trip itinerary day (e.g., Day 1, Day 2) |
| `title` | Text | Name of the attraction, stop, or activity |
| `time` | Text | Scheduled time (e.g., '09:00 AM') |
| `tag` | Text | Activity category (TRANSPORT, ACTIVITY, FOOD, MEETUP) |
| `latitude / longitude`| Numeric | Verified geographic coordinates of the stop |
| `cost` | Numeric | Estimated budget allocation for the activity |
| `created_by` | UUID (FK) | Member who logged the stop |

#### Table: `expenses`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique expense transaction identifier |
| `trip_id` | UUID (FK) | Associated trip referencing `trips.id` |
| `payer_id` | UUID (FK) | User who paid the bill referencing `profiles.id` |
| `title` | Text | Expense title (e.g., 'Van Rental', 'Seafood Dinner') |
| `amount` | Numeric | Total monetary amount paid in PHP |
| `category` | Text | Expense category (Food, Transport, Lodging, Activity) |
| `split_mode` | Text | Split mode ('equal', 'custom', or 'solo') |
| `created_at` | Timestamptz | Timestamp when expense was recorded |

#### Table: `community_posts`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique community post identifier |
| `trip_id` | UUID (FK) | Optional referenced trip for itinerary posts |
| `author_id` | UUID (FK) | Author user ID referencing `profiles.id` |
| `author_name` | Text | Display name of the author |
| `destination` | Text | Featured destination name |
| `caption` | Text | Post caption and travel tips |
| `media_urls` | JSONB | Array of photo and video URLs |
| `itinerary_data` | JSONB | Day-by-day stops for 1-click adoption by other travelers |
| `likes_count` | Integer | Total like engagement count |
| `created_at` | Timestamptz | Post publication timestamp |

### User Interface Design
- **Figure 1. Authentication & Walkthrough Onboarding**: Features email/password authentication, password recovery, and an illustrated step-by-step feature walkthrough.
- **Figure 2. Home Dashboard & Animated Eagle Mascot**: Displays upcoming trips, quick actions, and an animated Philippine Eagle mascot that gracefully enters and soars across the dashboard.
- **Figure 3. Trip Creation & 6-Character Join Code**: Enables hosts to set destinations and dates while generating shareable 6-character join codes.
- **Figure 4. Day-by-Day Itinerary Builder & AI Assistant**: Shows chronological day plans with categorized badges and an interactive Google Gemini AI day-plan generator.
- **Figure 5. Guardian Safety Mode & Geofenced Radar Map**: Interactive Leaflet map showing the trip destination, live member pins, and a semi-transparent geofence perimeter circle.
- **Figure 6. Group Collaboration (Polls, Announcements & Chat)**: Synchronized decision polls with real-time percentage bars, pinned announcements, and live group messaging.
- **Figure 7. Shared Expense Ledger & Cost Splitting**: Itemized ledger displaying total spend, individual contributions, and an automated settle-up breakdown.
- **Figure 8. Real-Device Push Notifications & In-App Toast**: Android high-priority heads-up banners with the TourGo app icon and an animated top drop-down banner.
- **Figure 9. Community Feed & Facebook-Style Media Lightbox**: Unified single-card itinerary posts with expandable photo strips and full-screen pinch-to-zoom media lightbox modal.

---

## CHAPTER 3 – SYSTEM DEVELOPMENT

### Tools and Technologies Used

#### Software Technologies
- **Antigravity IDE**: Advanced AI-powered agentic coding IDE utilized for continuous pair programming, architectural design, automated testing, and git version control.
- **React Native & Expo SDK 52**: High-performance cross-platform mobile development framework delivering native 60fps animations and direct hardware access.
- **TypeScript**: Strictly-typed superset of JavaScript providing robust type safety, compile-time error checking, and clear data models across all services.
- **Supabase Backend-as-a-Service**: PostgreSQL 15 relational database, Supabase Auth for session tokens, Storage buckets for photos, and WebSocket Realtime subscriptions.
- **Expo Notifications**: Native push notification framework handling permission requests, device tokens, Android notification channels, and immediate heads-up alerts.
- **Leaflet.js & OpenStreetMap / Esri**: Interactive mapping engine loaded inside React Native WebView, rendering real-radius geofence circles, member pins, and multi-layer basemaps.
- **Google Gemini Generative AI API**: AI travel model synthesizing personalized multi-day itineraries based on traveler preferences.

#### Hardware Requirements
- **Development Workstation**: Windows 11 PC equipped with multi-core processor, 16GB RAM, and Node.js LTS environment.
- **Physical Mobile Testing Devices**: Android 14/15 smartphones and iOS devices used to validate real-device push notifications, GPS background permissions, and native camera image capture.

### Development Process
The development of TourGo followed an iterative Agile development methodology divided into four structured phases:
1. **Phase 1: Requirements Gathering & User Research**: Analyzed real-world group travel pain points among Filipino barkadas—unresolved voting disputes, lost companions in remote travel spots, and awkward manual bill collection.
2. **Phase 2: Architectural & Schema Design**: Designed the normalized Supabase database schema, Row-Level Security policies, and visual component hierarchy.
3. **Phase 3: Core Implementation & Feature Sprints**: Constructed the core modules in React Native/Expo: authentication, join codes, itinerary builder, Guardian geofencing, expense ledger, and real-device push notification listeners.
4. **Phase 4: Hardware Testing & Optimization**: Executed real-device physical testing on Android and iOS hardware to confirm push notification channel reliability, heads-up banner display, smooth mascot flight animations, and photo lightbox touch gestures.

---

## CHAPTER 4 – RESULTS AND TESTING

### System Features
- **Feature 1: User Onboarding & Animated Eagle Mascot**: Allows users to register securely, customize travel preferences, and view an animated Philippine Eagle soaring gracefully on the home dashboard.
- **Feature 2: Trip Hosting & 6-Character Join Code**: Enables organizers to create trips and generate instant 6-character invite codes for seamless member onboarding.
- **Feature 3: Collaborative Itinerary & AI Generator**: Supports day-by-day activity planning with time badges, free keyless POI discovery, and Google Gemini AI itinerary generation.
- **Feature 4: Guardian Safety Geofenced Radar**: Provides live GPS member location tracking on an interactive Leaflet map within a configurable geofenced safe-zone circle.
- **Feature 5: Real-Device Push Notifications**: Triggers native heads-up banners with the TourGo app icon and an animated in-app drop-down toast whenever trip updates occur.
- **Feature 6: Decision Polling & Packing Checklists**: Allows organizers to launch polls with real-time vote percentage bars and track shared group tasks alongside private personal checklists.
- **Feature 7: Shared Expenses & Automated Settle-Up**: Records travel bills, calculates per-person debt obligations, and tracks payment settlement verification between debtors and creditors.
- **Feature 8: Community Feed & Media Lightbox**: Publishes trips as unified itinerary cards with expandable photo thumbnails and full-screen Facebook-style lightbox viewing.

### Functional Testing

#### Test Scenarios
| Scenario ID | Description |
|:---|:---|
| **TS-AUTH-01** | Verify that a traveler can register and sign in with valid credentials, persisting authentication tokens across app restarts. |
| **TS-TRIP-01** | Verify that an organizer can create a trip and obtain an auto-generated unique 6-character join code. |
| **TS-TRIP-02** | Verify that a traveler can join an existing trip by entering a valid 6-character code and be assigned the 'member' role. |
| **TS-ITIN-01** | Verify that a member can add, edit, and reorder an itinerary stop under a specific trip day. |
| **TS-AI-01** | Verify that the Google Gemini AI assistant synthesizes a valid multi-stop day itinerary based on user prompts. |
| **TS-GUARD-01** | Verify that Guardian Mode renders an accurate circular geofence polygon matching the configured radius in meters. |
| **TS-GUARD-02** | Verify that the system detects when a member's GPS coordinates drift outside the geofenced perimeter. |
| **TS-NOTIF-01** | Verify that adding an itinerary stop or activity triggers a native heads-up push notification banner with the TourGo icon on real devices. |
| **TS-EXP-01** | Verify that logging an expense automatically divides costs and updates debtor/creditor balances. |
| **TS-COMM-01** | Verify that tapping an itinerary photo in the community feed opens the full-screen Facebook-style lightbox modal. |

#### Test Cases Execution Matrix
| Test Case ID | Test Case Title | Expected & Actual Result | Status |
|:---|:---|:---|:---:|
| **TC-01** | User Login With Valid Credentials | User access granted; navigated to Home dashboard with eagle mascot | **Passed** |
| **TC-02** | Create Trip With Destination & Dates | Trip record created with unique 6-character join code | **Passed** |
| **TC-03** | Join Trip Using 6-Character Code | User added to trip member list with role 'member' | **Passed** |
| **TC-04** | Add Itinerary Stop (Day 1, 09:00 AM) | Stop saved to database and rendered chronologically in day schedule | **Passed** |
| **TC-05** | Generate AI Day-Plan (Gemini) | Structured multi-stop day plan generated and populated into itinerary | **Passed** |
| **TC-06** | Set Guardian Radius (500 Meters) | Interactive map displays 500m geofence circle centered on destination | **Passed** |
| **TC-07** | Simulate Member Outside Geofence | System detects perimeter breach and flags member as outside safe zone | **Passed** |
| **TC-08** | Trigger Trip Activity Push Notification | Native heads-up banner with TourGo logo appears on physical device | **Passed** |
| **TC-09** | Submit Vote on Group Poll | Vote recorded and progress bar updates in real time for all members | **Passed** |
| **TC-10** | Log ₱5,000 Group Van Expense | Calculates equal splits (₱1,000/person for 5 members) in ledger | **Passed** |
| **TC-11** | Tap Itinerary Photo in Community Feed | Full-screen media lightbox modal opens with swipe and zoom gestures | **Passed** |

### Evaluation

#### System Strengths
- **All-in-One Travel Ecosystem**: Eliminates the need for multiple disparate apps by unifying planning, budgeting, polling, safety, and community sharing into a single client.
- **Integrated Guardian Safety Geofencing**: Protects travelers in unfamiliar destinations through real-time geofenced perimeter circles and outside-zone drift monitoring.
- **Zero Location API Overhead**: Employs open-source and keyless providers (OpenStreetMap, Photon, Leaflet, Wikipedia), eliminating recurring map tile and geocoding licensing costs.
- **Native Hardware Optimization**: Engineered with native Android high-priority notification channels, smooth eagle mascot animations, and hardware-accelerated photo lightboxes.

#### System Limitations
- **Connectivity Dependency**: Realtime database updates and live location sharing require continuous cellular or Wi-Fi data connectivity.
- **Non-Transactional Ledger**: The shared expense system computes and manages balances transparently but requires members to complete peer-to-peer payments outside the app.

---

## CHAPTER 5 – CONCLUSION AND RECOMMENDATIONS

### Conclusion
The TourGo project successfully fulfilled all requirements set forth for the Advance Mobile Application Development (CTELEC4L) final examination. The mobile application delivers a complete, cohesive, and production-ready platform tailored to the unique social dynamics of Filipino travel groups and barkadas.

Every critical subsystem—including secure authentication, trip hosting with 6-character join codes, day-by-day itinerary management with Google Gemini AI integration, Guardian Mode geofencing with perimeter-drift detection, real-device push notifications with branded icons, itemized expense splitting, and a rich community photo feed—was rigorously developed, tested, and verified on physical hardware. Through this project, advanced principles in mobile systems engineering, reactive UI design, cloud relational schema design, WebSocket realtime state management, and native hardware integration were successfully demonstrated.

### Recommendations
To further enhance TourGo for commercial deployment, the following future extensions are recommended:
1. **Offline Itinerary Caching & Sync**: Implement an offline-first SQLite cache so travelers in remote Philippine islands with no cellular reception can still review their itinerary schedules.
2. **Peer-to-Peer Bluetooth Mesh Radar**: Incorporate offline Bluetooth Low Energy (BLE) peer discovery to enable Guardian member tracking even when mobile data is unavailable during mountain hikes.
3. **Direct E-Wallet Payment Gateway**: Integrate GCash and Maya QR Ph payment APIs to enable one-tap automated debt settlement directly within the shared expense ledger.
4. **Multilingual Local Language Support**: Provide localized interfaces in Tagalog, Cebuano, and Ilocano to expand accessibility across diverse Philippine regional travel communities.
