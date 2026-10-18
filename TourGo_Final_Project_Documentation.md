# ADVANCE MOBILE APPLICATION DEVELOPMENT
## FINAL PROJECT DOCUMENTATION

### PROJECT TITLE:
# **TourGo – A Collaborative Group Travel Planning, Destination Discovery, and Itinerary Coordination Platform**

**Prepared by:** Harry Sevilla  
**Subject:** Mobile Application Development (CTELEC4L)  
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
The project entitled **"TourGo – A Collaborative Group Travel Planning, Destination Discovery, and Itinerary Coordination Platform"** is a full-stack cross-platform mobile application developed for groups of friends, families, and travel companions to collaboratively plan, organize, and coordinate group journeys. It unites Philippine destination discovery, trip hosting and joining via unique alphanumeric invite codes, day-by-day collaborative itinerary planning, Google Gemini AI-powered day schedules, interactive group decision polling, real-time group chat, shared expense splitting and balance ledgers, and branded mobile push notifications into a single, cohesive platform. By consolidating these capabilities, TourGo eliminates the chaos of juggling fragmented chat threads, spreadsheets, navigation maps, and budgeting tools.

### Project Objectives

#### General Objective
To develop a collaborative, real-time mobile travel application that streamlines group trip planning, interactive decision-making, and financial coordination from initial discovery to active travel.

#### Specific Objectives
1. **Frictionless Trip Access**: To enable frictionless trip creation and joining using 6-character alphanumeric join codes with responsive native input controls.
2. **Interactive Destination Discovery**: To provide an interactive destination exploration engine with Philippine tourist spots, province guides, weather forecasts, and travel estimates.
3. **Collaborative Day-by-Day Itinerary & AI**: To deliver collaborative day-by-day itinerary management with chronological activity scheduling and Google Gemini AI day-plan generation.
4. **Interactive Group Polls**: To streamline group consensus through interactive group polls with synchronized real-time vote tallies.
5. **Shared Financial Ledger**: To provide a shared financial ledger that calculates equal and custom expense splits, tracking payer balances and debt settlements.
6. **Real-Time Group Coordination & Push Notifications**: To facilitate real-time group communication through Supabase Realtime chat and branded mobile push notifications displaying the official TourGo app icon.

### Scope of the Project
The application encompasses the following core functional modules:
- **Authentication and Profiles**: Secure email/password login and registration via Supabase Auth, personalized traveler preferences (budget, travel style, pacing), and light/dark theme support.
- **Explore & Destination Discovery**: Interactive Philippine map and province directory, curated tourist spots, free places, weather forecasts, category filters, and travel cost/time estimations.
- **Trip Hosting and Enrollment**: Create trips with destination, travel dates, and cover photos; auto-generate 6-character alphanumeric join codes; responsive join screen with native tap-to-focus keyboard.
- **Collaborative Day-by-Day Itinerary**: Day-by-day activity timelines with timestamps, notes, and activity tags; one-tap Google Gemini AI day itinerary generator tailored to user preferences.
- **Real-Time Group Communication**: Instant group messaging powered by Supabase Realtime WebSockets, pinned organizer announcements, and group packing checklists.
- **Interactive Decision-Making Polls**: Create and vote on multiple-choice group polls (places, dates, activities) with live vote counters and organizer management.
- **Shared Expense Ledger & Bill Splitting**: Log group expenses, assign payers, split costs equally or custom per member, and view real-time net settlement balances.
- **Real-Device Push & In-App Activity Notifications**: Branded native push notifications and in-app toast banners with the official TourGo icon and `#028BEB` theme.
- **Community Travel Feed**: Public travel feed to share itineraries, travel stories, photos, like counters, comments, and travel inspiration.
- **Organizer Controls & Cascade Deletion**: Comprehensive trip management allowing organizers to edit trip details, manage members, and cleanly delete trips with foreign key cascade cleanup.

### Limitations
- **Internet Connectivity Requirement**: The mobile application requires an active internet connection to synchronize realtime database changes, chat messages, and push notifications with Supabase.
- **Third-Party API Limits**: AI itinerary generation and free geocoding services depend on Google Gemini and OpenStreetMap public server quotas.
- **Coordination-Only Financial Ledger**: The shared expense module calculates debts and verifies payment submissions, but does not process direct monetary transactions or integrate fiat banking gateways.
- **Estimates for Reference Only**: Weather forecasts and travel estimates are approximate calculations based on open-source public providers.

---

## CHAPTER 2 – SYSTEM ANALYSIS AND DESIGN

### System Description
TourGo provides a comprehensive, modern mobile solution for group travel planning and coordination. Users authenticate via email and password, customize their travel style and preferences, and access an intuitive home dashboard. A user can either host a new trip—specifying destination and travel dates to generate a unique 6-character join code—or join an active trip using an organizer's code.

Inside the trip hub, members collaboratively curate a day-by-day itinerary, generate smart multi-stop itineraries with Google Gemini AI, vote on key group decisions in real-time polls, chat via live messaging, and manage packing lists. While traveling, members log shared expenses to maintain an automated balance sheet showing who owes whom. Activity updates, itinerary changes, and poll additions trigger instant push notifications and in-app toast banners featuring the TourGo app icon. After trips, travelers can share itineraries and stories to the public Community Feed. All data is securely persisted in Supabase (PostgreSQL, Auth, Storage, and Realtime).

### System Flow

```
Start → Login (Email/Password) → Explore / Host / Join Trip (Join Code) → Collaborative Itinerary & AI Day Plan → Group Polls & Live Chat → Expense Logging & Bill Splitting → Push Alerts & Community Feed → End
```

**Detailed Flow**: The user registers or signs in using their email and password; their profile and travel preferences are loaded. The user can explore Philippine destinations or choose to host a new trip (specifying title, destination, dates, and cover photo to receive an auto-generated 6-character join code) or join an existing trip by entering a valid code. Group members collaboratively add day-by-day itinerary stops or invoke Google Gemini AI to synthesize a customized day schedule. Members vote on group activities or dates through synchronized real-time polls and communicate in the live group chat. During the trip, members log shared expenses, with the system calculating equal or custom splits and tracking who owes whom. Trip updates trigger native device push notifications and in-app toast banners displaying the TourGo app icon. At trip completion, travelers share their stories and photos to the public community feed.

### Use Case Diagram

#### Actors:
- **User (Traveler / Member)**: Registered user who can explore spots, host or join trips, vote on polls, build itineraries, chat, log expenses, and post to the community feed.
- **Organizer (Trip Host)**: The creator of a trip who gains administrative privileges such as editing trip metadata, pinning announcements, and performing cascade trip deletion.

| Use Case ID | Title | Functional Description |
|:---|:---|:---|
| **UC-01** | Authenticate User | Register and sign in via Supabase Auth with persistent session storage. |
| **UC-02** | Destination Discovery | Search Philippine provinces, tourist spots, free places, and weather forecasts. |
| **UC-03** | Host / Join Trip | Create a trip with an auto-generated 6-character join code or join using an active code. |
| **UC-04** | Collaborative Itinerary | Add/edit day stops with chronological times, coordinates, activity tags, and notes. |
| **UC-05** | Google Gemini AI Planner | Generate customized multi-stop day itineraries based on user travel preferences. |
| **UC-06** | Interactive Group Polls | Create multiple-choice polls and vote with real-time synchronized live tallies. |
| **UC-07** | Real-Time Group Chat | Send and receive instant messages via Supabase Realtime WebSockets. |
| **UC-08** | Group Packing Checklist | Assign and check off collaborative travel items and packing lists. |
| **UC-09** | Shared Expenses & Splitting | Record shared expenses, calculate equal/custom splits, and view debt balances. |
| **UC-10** | Push & In-App Notifications | Receive real-device push notifications and in-app toast banners with the TourGo icon. |
| **UC-11** | Community Travel Feed | Browse public travel stories, view photo reels, like posts, and post trip recaps. |
| **UC-12** | Organizer Trip Management | Update trip details, manage members, and cleanly delete trips with cascade cleanup. |

### Database Design

The application uses Supabase (PostgreSQL) for cloud data storage, authentication, and file storage.

#### Table: `profiles`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | User ID (linked to Supabase Auth) |
| `email` | Text | Registered email address |
| `full_name` | Text | Display name of the user |
| `avatar_url` | Text | Profile picture / avatar URL |
| `travel_preferences` | JSONB | Traveler preferences (budget, style, pace, dietary) |

#### Table: `trips`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique trip ID |
| `title` | Text | Trip title / name |
| `destination` | Text | Target destination name / province |
| `start_date` / `end_date` | Date | Trip schedule date range |
| `code` | Text (Unique) | 6-character alphanumeric join code |
| `image_url` | Text | Cover image URL |
| `created_by` | UUID (FK) | Organizer user ID (`profiles.id`) |

#### Table: `trip_members`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique membership record ID |
| `trip_id` | UUID (FK) | Trip joined (`trips.id`) |
| `user_id` | UUID (FK) | Member user ID (`profiles.id`) |
| `role` | Text | `organizer` / `member` |
| `joined_at` | Timestamp | Date and time joined |
| `status` | Text | `active` / `archived` |

#### Table: `polls`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique poll ID |
| `trip_id` | UUID (FK) | Trip of the poll (`trips.id`) |
| `question` | Text | Poll question or topic |
| `is_closed` | Boolean | Active or closed status |
| `created_by` | UUID (FK) | Member who created the poll |
| `created_at` | Timestamp | Creation timestamp |

#### Table: `poll_votes`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique vote ID |
| `poll_id` | UUID (FK) | Associated poll (`polls.id`) |
| `user_id` | UUID (FK) | Member who voted (`profiles.id`) |

#### Table: `itinerary_items`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique itinerary item ID |
| `trip_id` | UUID (FK) | Trip of the item (`trips.id`) |
| `day_number` | Integer | Scheduled day number of the trip |
| `title` | Text | Activity or stop name |
| `time` | Text | Scheduled time (e.g., 09:00 AM) |
| `category` | Text | `ACTIVITY` / `FOOD` / `TRANSPORT` / `SIGHTSEEING` |
| `location` | Text | Location name or coordinate string |
| `notes` | Text | Reminders, tips, or activity notes |

#### Table: `expenses`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique expense ID |
| `trip_id` | UUID (FK) | Trip of the expense (`trips.id`) |
| `paid_by` | UUID (FK) | Member who paid (`profiles.id`) |
| `title` | Text | Expense title / description |
| `amount` | Numeric | Total expense amount |
| `currency` | Text | Currency code (`PHP`, `USD`, etc.) |
| `category` | Text | Food, Accommodation, Transport, Activities, Misc |
| `split_type` | Text | `equal` / `custom` |

#### Table: `expense_splits`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique split ID |
| `expense_id` | UUID (FK) | Associated expense (`expenses.id`) |
| `user_id` | UUID (FK) | Member sharing the expense (`profiles.id`) |
| `amount_owed` | Numeric | Calculated amount owed |
| `is_paid` | Boolean | Settlement confirmation status |
| `settled_at` | Timestamp | Settlement timestamp |

#### Table: `community_posts`
| Field | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique post ID |
| `user_id` | UUID (FK) | Author of the post (`profiles.id`) |
| `title` / `content` | Text | Post title and travel narrative |
| `destination` | Text | Featured destination name |
| `image_urls` | Text[] | Array of uploaded photo links |
| `likes_count` | Integer | Engagement like counter |

---

### User Interface Design

The application features an intuitive, modern user interface with light and dark themes. The core screens, shown with placeholder frames below, include:
- **Trip Planning and Member Hub** – host/join trip, 6-character join code, member roster, organizer controls, and cascade trip deletion
- **Interactive Destination Discovery** – Philippine map, tourist spots, free places, weather forecasts, and category filters
- **AI-Powered Itinerary Assistant** – Google Gemini AI integration generating smart multi-stop day schedules
- **Day-by-Day Collaborative Itinerary** – chronological timelines, stop times, location coordinates, notes, and checklist
- **Real-Time Group Chat & Voting Polls** – live group chat messaging and interactive multi-option decision polls
- **Shared Trip Expenses & Bill Splitting** – itemized expense ledger, equal/custom split breakdowns, and settle-up balances
- **Community Travel Feed & Traveler Profile** – public travel feed, stories, photos, like counters, and traveler preference profile

---

#### Figure 1: Trip Planning and Member Hub
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│          Figure 1: Trip Planning and Member Hub        │
│    (Trip Creation, 6-Character Join Code & Members)    │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 1. Trip Planning and Member Hub*

---

#### Figure 2: Interactive Destination Discovery & Explore Page
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│ Figure 2: Interactive Destination Discovery & Explore  │
│   (Philippine Map, Top Tourist Spots & Weather Filter) │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 2. Interactive Destination Discovery & Explore Page*

---

#### Figure 3: AI-Powered Itinerary Planning (Google Gemini AI)
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│ Figure 3: AI-Powered Itinerary Planning (Gemini AI)    │
│    (Smart Day-Plan Generator Customized to Style)      │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 3. AI-Powered Itinerary Planning (Google Gemini AI)*

---

#### Figure 4: Day-by-Day Collaborative Itinerary
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│       Figure 4: Collaborative Day-by-Day Itinerary     │
│    (Chronological Timeline, Stop Coordinates & Tasks)  │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 4. Day-by-Day Collaborative Itinerary*

---

#### Figure 5: Real-Time Group Chat & Voting Polls Hub
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│    Figure 5: Real-Time Group Chat & Voting Polls Hub   │
│     (Live Group Messages & Synchronized Tallies)       │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 5. Real-Time Group Chat & Voting Polls Hub*

---

#### Figure 6: Shared Trip Expenses & Bill Splitting
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│      Figure 6: Shared Trip Expenses & Bill Splitting   │
│   (Itemized Expense Ledger, Splits & Settle Balances)  │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 6. Shared Trip Expenses & Bill Splitting*

---

#### Figure 7: Community Travel Feed & Traveler Profile
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│               [ SCREENSHOT PLACEHOLDER ]               │
│ Figure 7: Community Travel Feed & Traveler Profile     │
│     (Public Travel Stories, Photos & User Profile)     │
│                                                        │
└────────────────────────────────────────────────────────┘
```
*Figure 7. Community Travel Feed & Traveler Profile*

---

## CHAPTER 3 – SYSTEM DEVELOPMENT

### Tools and Technologies Used

#### Software
- **Antigravity IDE**: AI-assisted agentic code editor used for full-stack mobile development and git workflow.
- **Android Studio**: Android virtual devices (AVD) and native Android build tooling.
- **React Native (Expo SDK 52)**: Core cross-platform mobile development framework delivering native performance.
- **Supabase**: Cloud backend platform providing PostgreSQL database, Auth, Storage, and Realtime WebSockets.
- **External APIs & Services**: Google Gemini AI API, OpenStreetMap / Photon geocoding, and Expo Push Notifications API.

#### Hardware
- **Development PC/Workstation**: Multi-core development machine running Node.js, TypeScript, and Expo CLI.
- **Physical Android & iPhone Devices**: Tested on real smartphones for native push notifications, soft keyboard behavior, and touch responsiveness.

### Development Process

#### Requirements Gathering
System requirements were identified by analyzing common challenges in group travel coordination, such as fragmented chat threads, disorganized schedules, bill-splitting disputes, and difficult consensus-gathering. Functional and non-functional requirements were established accordingly.

#### Design
The system flow, use case architecture, database schema, and mobile UI were designed first. Design priorities included seamless tab-based navigation, clean light and dark themes, fast real-time synchronization, and intuitive controls suited for mobile touchscreens.

#### Development
The application was built using React Native (Expo SDK 52) with TypeScript and Supabase as the backend. Core modules implemented include authentication, trip hosting and code joining, day-by-day itinerary management, Google Gemini AI day-plan generation, real-time group chat, multi-option decision polls, expense ledger and bill splitting, branded real-device push notifications, and a community travel feed.

#### Testing
The application underwent comprehensive functional testing on physical Android and iOS mobile devices. Test scenarios and test cases were prepared and executed for all core modules (authentication, trip management, AI planning, chat, polls, expense ledger, and push notifications) to ensure robust performance.

---

## CHAPTER 4 – RESULTS AND TESTING

### System Features

#### Feature 1: Trip Hosting, Joining, and Management
Allows a user to host a new trip with destination, travel dates, and cover photo, generating an automatic 6-character alphanumeric join code. Other travelers can join instantly via the Join Trip screen featuring responsive tap-to-focus text input. Organizers have administrative controls including editing details and cascade trip deletion.

#### Feature 2: Interactive Philippine Destination Discovery
Provides an interactive explore hub featuring curated Philippine tourist destinations, province directories, free places, real-time weather forecasts, category filters, and travel cost/time estimations.

#### Feature 3: Day-by-Day Collaborative Itinerary and AI Planner
Enables members to build chronological daily itineraries with timestamps, location coordinates, notes, and activity tags. Includes one-tap Google Gemini AI integration to automatically synthesize comprehensive multi-stop day plans tailored to user preferences.

#### Feature 4: Real-Time Group Chat, Polls, and Coordination
Facilitates real-time group collaboration through instant messaging powered by Supabase Realtime WebSockets, interactive multi-option decision polls with live vote tallies, pinned organizer announcements, and shared packing checklists.

#### Feature 5: Shared Expenses and Bill Splitting
Maintains an itemized expense ledger recording group purchases, assigning payers, calculating equal or custom splits among members, and tracking net debt balances for transparent settlement.

#### Feature 6: Branded Push Notifications and Community Travel Feed
Delivers native push notifications and in-app toast banners branded with the official TourGo icon and `#028BEB` theme for real-time trip alerts. Includes a community travel feed where travelers can publish stories, photos, and like posts.

---

### Functional Testing

The following test scenarios and test cases were executed for the core features of the application (Authentication, Trip Creation & Joining, Collaborative Itinerary, Google Gemini AI Planner, Group Polls, Real-Time Chat, Shared Expenses, and Push Notifications):

#### Test Scenarios
| Scenario ID | Description |
|:---|:---|
| **TS-AUTH-01** | Verify that a registered user can log in using valid email credentials and access the TourGo dashboard. |
| **TS-TRIP-01** | Verify that a user can create/host a new trip with title, destination, dates, and receive an auto-generated alphanumeric join code. |
| **TS-TRIP-02** | Verify that a user can join an existing trip by entering a code in the Join Trip screen with responsive soft keyboard focus. |
| **TS-TRIP-03** | Verify that an organizer can delete a trip with native confirmation prompt and cascading child record cleanup. |
| **TS-EXPL-01** | Verify that a user can browse Philippine destinations, view weather forecasts, and filter by travel categories. |
| **TS-ITIN-01** | Verify that a trip member can add a day-by-day itinerary stop with activity time, location details, and notes. |
| **TS-AI-01** | Verify that a user can generate a personalized multi-stop day itinerary using the integrated Google Gemini AI travel planner. |
| **TS-POLL-01** | Verify that members can create and vote on group decision polls with synchronized live vote tallies. |
| **TS-CHAT-01** | Verify that group members can send and receive real-time messages within the group chat hub. |
| **TS-EXP-01** | Verify that a member can log an expense with amount, category, and split breakdown among group members. |
| **TS-NOTIF-01** | Verify that real-device push notifications and in-app toast banners trigger with the official TourGo icon upon trip updates. |

#### Test Cases
| Test Case | Expected Result | Status |
|:---|:---|:---|
| Login With Email & Password | User Authenticated & Dashboard Loaded | **Passed** |
| Host / Create New Trip | Trip Created with Alphanumeric Join Code | **Passed** |
| Join Trip via Alphanumeric Code | Member Enrolled in Trip & Redirected | **Passed** |
| Organizer Delete Trip | Trip Removed with Cascade Foreign Key Cleanup | **Passed** |
| Browse Philippine Destinations | Spots, Weather & Route Estimates Displayed | **Passed** |
| Add Day-by-Day Itinerary Stop | Stop Saved Under Target Day with Coordinates | **Passed** |
| Google Gemini AI Day Plan | Smart Multi-Stop Itinerary Generated | **Passed** |
| Create & Vote on Group Poll | Poll Active with Synchronized Live Counts | **Passed** |
| Send Real-Time Chat Message | Message Broadcast via Supabase Realtime | **Passed** |
| Log Expense & Split Bill | Expense Saved and Member Balances Calculated | **Passed** |
| Receive Activity Push Notification | Push Banner Displays TourGo App Icon & Title | **Passed** |

---

### Evaluation

#### Strengths
- **All-in-One Travel Ecosystem**: Unifies trip hosting, destination exploration, AI day planning, real-time chat, polls, expense splitting, and community feed into a single cohesive mobile application.
- **Real-Time Synchronization**: Instant data delivery powered by Supabase WebSockets for chat, votes, and itinerary updates.
- **Transparent Expense Management**: Automated calculations remove awkward financial conversations by showing itemized shares and net debt balances.
- **AI-Powered Planning**: Integration with Google Gemini AI provides fast, tailored multi-stop itineraries suited to traveler preferences.

#### Weaknesses & Limitations
- **Internet Dependency**: Active network connectivity is required for real-time cloud data synchronization and push notification triggers.
- **API Quota Restrictions**: Google Gemini AI and OpenStreetMap public servers have usage limits.
- **Non-Financial Settlement**: The app manages debt ledgers and records settlements, but does not execute fiat banking transactions.

---

## CHAPTER 5 – CONCLUSION AND RECOMMENDATIONS

### Conclusion
The project successfully developed TourGo, a robust and collaborative mobile travel platform that provides groups with an all-in-one environment to plan, coordinate, and enjoy trips together. Core features were fully implemented and validated on physical devices: trip hosting and code joining, destination discovery, collaborative day-by-day itineraries, Google Gemini AI day-plan assistance, real-time group chat, interactive voting polls, shared expense splitting, branded mobile push notifications, and community travel sharing. The project demonstrated the effective integration of cross-platform mobile development, cloud backend synchronization, and artificial intelligence into a cohesive travel utility.

### Recommendations
1. **Offline-First Synchronization**: Implement offline local data caching with automatic background synchronization when reconnecting to the internet.
2. **Biometric Authentication**: Incorporate Fingerprint and Face ID authentication for faster and more secure mobile sign-in.
3. **Transport Booking Integration**: Integrate direct Philippine airline and bus transport APIs for automated ticket and booking imports, plus exportable PDF itinerary summaries.
4. **Social Sharing**: Add exportable summary stories and Instagram Story sharing for completed trip memories.
