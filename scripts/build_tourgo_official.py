# scripts/build_tourgo_official.py
# Full-stack documentation generator for TourGo
# Preserves 100% of NU Baliwag branding, cover page layout, running header/footer,
# callout boxes, and tables, while replacing all content with 100% TourGo features
# and replacing screenshots with clean blank placeholders.

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

SOURCE_DOCX = "Barkadash_Final_Project_Documentation.docx"
TARGET_DOCX = "TourGo_Official_Final_Documentation.docx"

def build():
    print(f"Loading {SOURCE_DOCX}...")
    doc = docx.Document(SOURCE_DOCX)

    # -------------------------------------------------------------
    # 1. Update Running Header
    # -------------------------------------------------------------
    for sec_idx, section in enumerate(doc.sections):
        if sec_idx > 0:
            hp = section.header.paragraphs[0]
            if len(hp.runs) >= 2:
                hp.runs[0].text = "TourGo"
                hp.runs[1].text = " – A Collaborative Group Travel Planning and Coordination Platform"
            elif len(hp.runs) == 1:
                hp.runs[0].text = "TourGo – A Collaborative Group Travel Planning and Coordination Platform"

    # -------------------------------------------------------------
    # 2. Cover Page
    # -------------------------------------------------------------
    # P6: Title
    p6 = doc.paragraphs[6]
    p6.text = "TourGo – A Collaborative Group Travel Planning, Destination Discovery, and Itinerary Coordination Platform"
    for r in p6.runs:
        r.bold = True
        r.font.size = Pt(17)
        r.font.color.rgb = RGBColor(0x2E, 0x75, 0xB6)

    # P9: Prepared by
    p9 = doc.paragraphs[9]
    p9.text = "Harry Sevilla"
    for r in p9.runs:
        r.font.size = Pt(11)

    # P12: Subject
    p12 = doc.paragraphs[12]
    p12.text = "Mobile Application Development"

    # P14: Submitted to
    p14 = doc.paragraphs[14]
    p14.text = "Prof. Paul John D. Cabance"

    # P16: Date
    p16 = doc.paragraphs[16]
    p16.text = "October 2026"

    # -------------------------------------------------------------
    # 3. Chapter 1: Project Overview
    # -------------------------------------------------------------
    # P45: Introduction
    doc.paragraphs[45].text = (
        'The project entitled "TourGo – A Collaborative Group Travel Planning, Destination Discovery, and Itinerary Coordination Platform" '
        'is a full-stack cross-platform mobile application developed for groups of friends, families, and travel companions to collaboratively '
        'plan, organize, and coordinate group journeys. It unites Philippine destination discovery, trip hosting and joining via unique '
        'alphanumeric invite codes, day-by-day collaborative itinerary planning, Google Gemini AI-powered day schedules, interactive group '
        'decision polling, real-time group chat, shared expense splitting and balance ledgers, and branded mobile push notifications into a '
        'single, cohesive platform. By consolidating these capabilities, TourGo eliminates the chaos of juggling fragmented chat threads, '
        'spreadsheets, navigation maps, and budgeting tools.'
    )

    # P48: General Objective
    doc.paragraphs[48].text = (
        'To develop a collaborative, real-time mobile travel application that streamlines group trip planning, interactive decision-making, '
        'and financial coordination from initial discovery to active travel.'
    )

    # P50 - P54: Specific Objectives
    doc.paragraphs[50].text = "1. To enable frictionless trip creation and joining using 6-character alphanumeric join codes with responsive native input controls."
    doc.paragraphs[51].text = "2. To provide an interactive destination exploration engine with Philippine tourist spots, province guides, weather forecasts, and travel estimates."
    doc.paragraphs[52].text = "3. To deliver collaborative day-by-day itinerary management with chronological activity scheduling and Google Gemini AI day-plan generation."
    doc.paragraphs[53].text = "4. To streamline group consensus through interactive group polls with synchronized real-time vote tallies."
    doc.paragraphs[54].text = "5. To provide a shared financial ledger that calculates equal and custom expense splits, tracking payer balances and debt settlements."
    
    # Check if there is p55 / Scope intro
    doc.paragraphs[56].text = "The application encompasses the following core functional modules:"
    doc.paragraphs[57].text = "• Authentication and Profiles – Secure email/password login and registration via Supabase Auth, personalized traveler preferences (budget, travel style, pacing), and light/dark theme support."
    doc.paragraphs[58].text = "• Explore & Destination Discovery – Interactive Philippine map and province directory, curated tourist spots, free places, weather forecasts, category filters, and travel cost/time estimations."
    doc.paragraphs[59].text = "• Trip Hosting and Enrollment – Create trips with destination, travel dates, and cover photos; auto-generate 6-character alphanumeric join codes; responsive join screen with native tap-to-focus keyboard."
    doc.paragraphs[60].text = "• Collaborative Day-by-Day Itinerary – Day-by-day activity timelines with timestamps, notes, and activity tags; one-tap Google Gemini AI day itinerary generator tailored to user preferences."
    doc.paragraphs[61].text = "• Real-Time Group Communication – Instant group messaging powered by Supabase Realtime WebSockets, pinned organizer announcements, and group packing checklists."
    doc.paragraphs[62].text = "• Interactive Decision-Making Polls – Create and vote on multiple-choice group polls (places, dates, activities) with live vote counters and organizer management."
    doc.paragraphs[63].text = "• Shared Expense Ledger & Bill Splitting – Log group expenses, assign payers, split costs equally or custom per member, and view real-time net settlement balances."
    doc.paragraphs[64].text = "• Real-Device Push & In-App Activity Notifications – Branded native push notifications and in-app toast banners with the official TourGo icon and #028BEB theme."
    doc.paragraphs[65].text = "• Community Travel Feed – Public travel feed to share itineraries, travel stories, photos, like counters, comments, and travel inspiration."
    doc.paragraphs[66].text = "• Organizer Controls & Cascade Deletion – Comprehensive trip management allowing organizers to edit trip details, manage members, and cleanly delete trips with foreign key cascade cleanup."

    # P68 - P72: Limitations
    doc.paragraphs[68].text = "• Internet connectivity is required for real-time cloud data synchronization and Supabase WebSockets channels."
    doc.paragraphs[69].text = "• Dependent on third-party API service limits and quotas (Google Gemini AI and OpenStreetMap public servers)."
    doc.paragraphs[70].text = "• No direct fiat banking or payment gateway transactions; expense splitting and balances are for coordination and accounting records only."
    doc.paragraphs[71].text = "• Weather forecasts and travel estimates are approximate reference calculations based on open-source public providers."
    doc.paragraphs[72].text = "• Device notifications require user permission and network connectivity for push delivery."

    # -------------------------------------------------------------
    # 4. Chapter 2: System Analysis and Design
    # -------------------------------------------------------------
    # P77: System Description
    doc.paragraphs[77].text = (
        'TourGo provides a comprehensive, modern mobile solution for group travel planning and coordination. Users authenticate '
        'via email and password, customize their travel style and preferences, and access an intuitive home dashboard. A user can '
        'either host a new trip—specifying destination and travel dates to generate a unique 6-character join code—or join an active '
        'trip using an organizer\'s code. Inside the trip hub, members collaboratively curate a day-by-day itinerary, generate smart '
        'multi-stop itineraries with Google Gemini AI, vote on key group decisions in real-time polls, chat via live messaging, and '
        'manage packing lists. While traveling, members log shared expenses to maintain an automated balance sheet showing who owes whom. '
        'Activity updates, itinerary changes, and poll additions trigger instant push notifications and in-app toast banners featuring '
        'the TourGo app icon. After trips, travelers can share itineraries and stories to the public Community Feed. All data is securely '
        'persisted in Supabase (PostgreSQL, Auth, Storage, and Realtime).'
    )

    # P80: Callout Box (System Flow)
    doc.paragraphs[80].text = (
        'Start → Login (Email/Password) → Explore / Host / Join Trip (Join Code) → Collaborative Itinerary & AI Day Plan → '
        'Group Polls & Live Chat → Expense Logging & Bill Splitting → Push Alerts & Community Feed → End'
    )
    for r in doc.paragraphs[80].runs:
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    # P81: Detailed Flow
    doc.paragraphs[81].text = (
        'Detailed flow: The user registers or signs in using their email and password; their profile and travel preferences are loaded. '
        'The user can explore Philippine destinations or choose to host a new trip (specifying title, destination, dates, and cover photo '
        'to receive an auto-generated 6-character join code) or join an existing trip by entering a valid code. Group members collaboratively '
        'add day-by-day itinerary stops or invoke Google Gemini AI to synthesize a customized day schedule. Members vote on group activities '
        'or dates through synchronized real-time polls and communicate in the live group chat. During the trip, members log shared expenses, '
        'with the system calculating equal or custom splits and tracking who owes whom. Trip updates trigger native device push notifications '
        'and in-app toast banners displaying the TourGo app icon. At trip completion, travelers share their stories and photos to the public community feed.'
    )

    # P85: Actor
    doc.paragraphs[85].text = (
        'User – the primary actor. Registered users can explore spots, host or join trips, vote on polls, build itineraries, chat, '
        'log expenses, and post to the community feed. The creator of a trip becomes its Organizer, gaining administrative privileges '
        'such as editing trip metadata, pinning announcements, and performing cascade trip deletion.'
    )

    # P87 - P95: Use Cases
    doc.paragraphs[87].text = "• Login / Register – authenticate via Supabase Auth and manage user profile and travel preferences."
    doc.paragraphs[88].text = "• Destination Discovery – search Philippine provinces, tourist spots, free places, and weather forecasts."
    doc.paragraphs[89].text = "• Host / Join Trip – create a new trip with an auto-generated 6-character join code or join using an active code."
    doc.paragraphs[90].text = "• Collaborative Itinerary & AI Planner – create day stops with chronological times and invoke Gemini AI day-plan generation."
    doc.paragraphs[91].text = "• Group Polls & Voting – create multiple-choice polls and vote with real-time synchronized tallies."
    doc.paragraphs[92].text = "• Group Chat & Announcements – chat via live WebSockets and review pinned announcements."
    doc.paragraphs[93].text = "• Checklist & Packing Management – assign and check off collaborative travel items and packing lists."
    doc.paragraphs[94].text = "• Shared Expenses & Bill Splitting – record shared purchases, calculate equal/custom splits, and track debt settlements."
    doc.paragraphs[95].text = "• Community Travel Feed – browse public travel stories, view photo reels, like posts, and post trip recaps."

    # P99: ERD Overview
    doc.paragraphs[99].text = (
        'Entities: Profiles, Trips, Trip Members, Polls and Poll Votes, Itinerary Items, Expenses, Expense Splits, and Community Posts. '
        'A Profile can host or join many Trips through Trip Members. Each Trip contains multiple Itinerary Items scheduled by day, '
        'interactive Polls that receive member Votes, Shared Expenses with calculated member Splits, and public travel stories '
        'published to Community Posts.'
    )

    # -------------------------------------------------------------
    # 5. Database Tables (Tables 0 - 8)
    # -------------------------------------------------------------
    print("Updating database tables...")
    # Table 0: profiles
    t0_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "User ID (linked to Supabase Auth)"),
        ("email", "Text", "User email address"),
        ("full_name", "Text", "Display name of the user"),
        ("avatar_url", "Text", "Profile picture / avatar URL"),
        ("travel_preferences", "JSONB", "Traveler preferences (budget, style, pace, dietary)"),
    ]
    for r_i, row in enumerate(doc.tables[0].rows):
        for c_i, val in enumerate(t0_data[r_i]):
            row.cells[c_i].text = val

    # Table 1: trips
    t1_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique trip ID"),
        ("title", "Text", "Trip title / name"),
        ("destination", "Text", "Destination name / province"),
        ("start_date / end_date", "Date", "Trip schedule date range"),
        ("code", "Text (Unique)", "6-character alphanumeric join code"),
        ("image_url", "Text", "Cover image URL"),
        ("created_by", "UUID (FK)", "Organizer user ID (profiles.id)"),
    ]
    for r_i, row in enumerate(doc.tables[1].rows):
        for c_i, val in enumerate(t1_data[r_i]):
            row.cells[c_i].text = val

    # Table 2: trip_members
    doc.paragraphs[105].text = "Table: trip_members"
    t2_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique membership ID"),
        ("trip_id", "UUID (FK)", "Trip joined (trips.id)"),
        ("user_id", "UUID (FK)", "Member user ID (profiles.id)"),
        ("role", "Text", "organizer / member"),
        ("joined_at", "Timestamp", "Timestamp when user joined trip"),
        ("status", "Text", "active / archived"),
    ]
    for r_i, row in enumerate(doc.tables[2].rows):
        for c_i, val in enumerate(t2_data[r_i]):
            row.cells[c_i].text = val

    # Table 3: polls
    doc.paragraphs[107].text = "Table: polls"
    t3_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique poll ID"),
        ("trip_id", "UUID (FK)", "Trip of the poll (trips.id)"),
        ("question", "Text", "Poll question or topic"),
        ("is_closed", "Boolean", "Active or closed status"),
        ("created_by", "UUID (FK)", "Member who created the poll"),
        ("created_at", "Timestamp", "Creation timestamp"),
    ]
    for r_i, row in enumerate(doc.tables[3].rows):
        for c_i, val in enumerate(t3_data[r_i]):
            row.cells[c_i].text = val

    # Table 4: poll_votes
    doc.paragraphs[109].text = "Table: poll_votes"
    t4_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique vote ID"),
        ("poll_id", "UUID (FK)", "Associated poll (polls.id)"),
        ("user_id", "UUID (FK)", "Member who voted (profiles.id)"),
    ]
    for r_i, row in enumerate(doc.tables[4].rows):
        for c_i, val in enumerate(t4_data[r_i]):
            row.cells[c_i].text = val

    # Table 5: itinerary_items
    doc.paragraphs[111].text = "Table: itinerary_items"
    t5_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique itinerary item ID"),
        ("trip_id", "UUID (FK)", "Trip of the item (trips.id)"),
        ("day_number", "Integer", "Scheduled day number of the trip"),
        ("title", "Text", "Activity or stop name"),
        ("time", "Text", "Scheduled time (e.g. 09:00 AM)"),
        ("category", "Text", "ACTIVITY / FOOD / TRANSPORT / SIGHTSEEING"),
        ("location", "Text", "Location name or coordinates"),
        ("notes", "Text", "Reminders, tips, or activity notes"),
    ]
    for r_i, row in enumerate(doc.tables[5].rows):
        for c_i, val in enumerate(t5_data[r_i]):
            row.cells[c_i].text = val

    # Table 6: expenses
    doc.paragraphs[113].text = "Table: expenses"
    t6_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique expense ID"),
        ("trip_id", "UUID (FK)", "Trip of the expense (trips.id)"),
        ("paid_by", "UUID (FK)", "Member who paid (profiles.id)"),
        ("title", "Text", "Expense title / description"),
        ("amount", "Numeric", "Total expense amount"),
        ("currency", "Text", "Currency code (PHP, USD, etc.)"),
        ("category", "Text", "Food, Accommodation, Transport, Activities, Misc"),
        ("split_type", "Text", "equal / custom"),
    ]
    for r_i, row in enumerate(doc.tables[6].rows):
        for c_i, val in enumerate(t6_data[r_i]):
            row.cells[c_i].text = val

    # Table 7: expense_splits
    doc.paragraphs[115].text = "Table: expense_splits"
    t7_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique split ID"),
        ("expense_id", "UUID (FK)", "Associated expense (expenses.id)"),
        ("user_id", "UUID (FK)", "Member sharing the expense (profiles.id)"),
        ("amount_owed", "Numeric", "Calculated amount owed"),
        ("is_paid", "Boolean", "Settlement status (true if settled)"),
        ("settled_at", "Timestamp", "Settlement timestamp"),
    ]
    for r_i, row in enumerate(doc.tables[7].rows):
        for c_i, val in enumerate(t7_data[r_i]):
            row.cells[c_i].text = val

    # Table 8: community_posts
    doc.paragraphs[117].text = "Table: community_posts"
    t8_data = [
        ("Field", "Type", "Description"),
        ("id", "UUID (PK)", "Unique post ID"),
        ("user_id", "UUID (FK)", "Author of the post (profiles.id)"),
        ("title / content", "Text", "Post title and travel narrative"),
        ("destination", "Text", "Featured destination name"),
        ("image_urls", "Text[]", "Array of photo URLs"),
        ("likes_count", "Integer", "Number of likes"),
    ]
    for r_i, row in enumerate(doc.tables[8].rows):
        for c_i, val in enumerate(t8_data[r_i]):
            row.cells[c_i].text = val

    # -------------------------------------------------------------
    # 6. User Interface Descriptions & Figure Replacement
    # -------------------------------------------------------------
    doc.paragraphs[120].text = "The application features an intuitive, modern user interface with light and dark themes. The core screens, shown with placeholder frames below, include:"
    doc.paragraphs[121].text = "• Trip Planning and Member Hub – host/join trip, 6-character join code, member roster, organizer controls, and cascade trip deletion"
    doc.paragraphs[122].text = "• Interactive Destination Discovery – Philippine map, tourist spots, free places, weather forecasts, and category filters"
    doc.paragraphs[123].text = "• AI-Powered Itinerary Assistant – Google Gemini AI integration generating smart multi-stop day schedules"
    doc.paragraphs[124].text = "• Day-by-Day Collaborative Itinerary – chronological timelines, stop times, location coordinates, notes, and checklist"
    doc.paragraphs[125].text = "• Real-Time Group Chat & Voting Polls – live group chat messaging and interactive multi-option decision polls"
    doc.paragraphs[126].text = "• Shared Trip Expenses & Bill Splitting – itemized expense ledger, equal/custom split breakdowns, and settle-up balances"
    doc.paragraphs[127].text = "• Community Travel Feed & Traveler Profile – public travel feed, stories, photos, like counters, and traveler preference profile"
    doc.paragraphs[128].text = "• Branded Push Notifications – native OS banners and in-app toasts with TourGo App Icon and brand theme"

    # Replace figure images with clean placeholder graphics
    print("Inserting blank screenshot placeholders...")
    fig_map = [
        (130, 131, 1, "Figure 1. Trip Planning and Member Hub"),
        (132, 133, 2, "Figure 2. Interactive Destination Discovery & Explore Page"),
        (134, 135, 3, "Figure 3. AI-Powered Itinerary Planning (Google Gemini AI)"),
        (136, 137, 4, "Figure 4. Day-by-Day Collaborative Itinerary"),
        (138, 139, 5, "Figure 5. Real-Time Group Chat & Voting Polls Hub"),
        (140, 141, 6, "Figure 6. Shared Trip Expenses & Bill Splitting"),
        (142, 143, 7, "Figure 7. Community Travel Feed & Traveler Profile"),
    ]

    for p_img_idx, p_cap_idx, fig_num, caption in fig_map:
        # Clear image paragraph and insert clean placeholder
        p_img = doc.paragraphs[p_img_idx]
        p_img.text = ""
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p_img.add_run()
        run.add_picture(f"assets/placeholders/fig_{fig_num}_placeholder.png", width=Inches(5.5))
        
        # Caption
        p_cap = doc.paragraphs[p_cap_idx]
        p_cap.text = caption
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p_cap.runs:
            r.bold = True
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # -------------------------------------------------------------
    # 7. Chapter 3: System Development
    # -------------------------------------------------------------
    # Tools
    doc.paragraphs[149].text = "• Antigravity IDE – AI-assisted agentic code editor used for full-stack mobile development and git workflow"
    doc.paragraphs[150].text = "• Android Studio – Android emulators and native SDK build tooling"
    doc.paragraphs[151].text = "• React Native (Expo SDK 52) – cross-platform framework delivering native mobile performance"
    doc.paragraphs[152].text = "• Supabase – cloud backend infrastructure (PostgreSQL database, Auth, Storage, and Realtime WebSockets)"
    doc.paragraphs[153].text = "• External APIs & Services – Google Gemini AI API, OpenStreetMap / Photon geocoding, and Expo Push Notifications API"

    # Hardware
    doc.paragraphs[155].text = "• Development PC/Workstation – multi-core development environment running Node.js and Expo CLI"
    doc.paragraphs[156].text = "• Physical Android & iPhone Devices – tested on real smartphones for native push notifications, soft keyboard behavior, and touch responsiveness"

    # Process
    doc.paragraphs[159].text = (
        'System requirements were identified by analyzing common challenges in group travel coordination, such as fragmented chat threads, '
        'disorganized schedules, bill-splitting disputes, and difficult consensus-gathering. Functional and non-functional requirements were established accordingly.'
    )
    doc.paragraphs[161].text = (
        'The system flow, use case architecture, database schema, and mobile UI were designed first. Design priorities included seamless '
        'tab-based navigation, clean light and dark themes, fast real-time synchronization, and intuitive controls suited for mobile touchscreens.'
    )
    doc.paragraphs[163].text = (
        'The application was built using React Native (Expo SDK 52) with TypeScript and Supabase as the backend. Core modules implemented '
        'include authentication, trip hosting and code joining, day-by-day itinerary management, Google Gemini AI day-plan generation, '
        'real-time group chat, multi-option decision polls, expense ledger and bill splitting, branded real-device push notifications, '
        'and a community travel feed.'
    )
    doc.paragraphs[165].text = (
        'The application underwent comprehensive functional testing on physical Android and iOS mobile devices. Test scenarios and test cases '
        'were prepared and executed for all core modules (authentication, trip management, AI planning, chat, polls, expense ledger, and push '
        'notifications) to ensure robust performance.'
    )

    # -------------------------------------------------------------
    # 8. Chapter 4: Results and Testing
    # -------------------------------------------------------------
    doc.paragraphs[170].text = "Feature 1: Trip Hosting, Joining, and Management"
    doc.paragraphs[172].text = (
        'Allows a user to host a new trip with destination, travel dates, and cover photo, generating an automatic 6-character alphanumeric join code. '
        'Other travelers can join instantly via the Join Trip screen featuring responsive tap-to-focus text input. Organizers have administrative controls '
        'including editing details and cascade trip deletion.'
    )
    doc.paragraphs[173].text = "Feature 2: Interactive Philippine Destination Discovery"
    doc.paragraphs[175].text = (
        'Provides an interactive explore hub featuring curated Philippine tourist destinations, province directories, free places, '
        'real-time weather forecasts, category filters, and travel cost/time estimations.'
    )
    doc.paragraphs[176].text = "Feature 3: Day-by-Day Collaborative Itinerary and AI Planner"
    doc.paragraphs[178].text = (
        'Enables members to build chronological daily itineraries with timestamps, location coordinates, notes, and activity tags. '
        'Includes one-tap Google Gemini AI integration to automatically synthesize comprehensive multi-stop day plans tailored to user preferences.'
    )
    doc.paragraphs[179].text = "Feature 4: Real-Time Group Chat, Polls, and Coordination"
    doc.paragraphs[181].text = (
        'Facilitates real-time group collaboration through instant messaging powered by Supabase Realtime WebSockets, interactive multi-option '
        'decision polls with live vote tallies, pinned organizer announcements, and shared packing checklists.'
    )
    doc.paragraphs[182].text = "Feature 5: Shared Expenses and Bill Splitting"
    doc.paragraphs[184].text = (
        'Maintains an itemized expense ledger recording group purchases, assigning payers, calculating equal or custom splits among members, '
        'and tracking net debt balances for transparent settlement.'
    )
    doc.paragraphs[185].text = "Feature 6: Branded Push Notifications and Community Travel Feed"
    doc.paragraphs[187].text = (
        'Delivers native push notifications and in-app toast banners branded with the official TourGo icon and #028BEB theme for real-time trip alerts. '
        'Includes a community travel feed where travelers can publish stories, photos, and like posts.'
    )

    # P190: Functional Testing Intro
    doc.paragraphs[190].text = (
        'The following test scenarios and test cases were executed for the core features of the application '
        '(Authentication, Trip Creation & Joining, Collaborative Itinerary, Google Gemini AI Planner, Group Polls, '
        'Real-Time Chat, Shared Expenses, and Push Notifications):'
    )

    # Table 9: Test Scenarios
    t9 = doc.tables[9]
    t9_data = [
        ("Scenario ID", "Description"),
        ("TS-AUTH-01", "Verify that a registered user can log in using valid email credentials and access the TourGo dashboard."),
        ("TS-TRIP-01", "Verify that a user can create/host a new trip with title, destination, dates, and receive an auto-generated alphanumeric join code."),
        ("TS-TRIP-02", "Verify that a user can join an existing trip by entering a code in the Join Trip screen with responsive soft keyboard focus."),
        ("TS-TRIP-03", "Verify that an organizer can delete a trip with native confirmation prompt and cascading child record cleanup."),
        ("TS-EXPL-01", "Verify that a user can browse Philippine destinations, view weather forecasts, and filter by travel categories."),
        ("TS-ITIN-01", "Verify that a trip member can add a day-by-day itinerary stop with activity time, location details, and notes."),
        ("TS-AI-01", "Verify that a user can generate a personalized multi-stop day itinerary using the integrated Google Gemini AI travel planner."),
        ("TS-POLL-01", "Verify that members can create and vote on group decision polls with synchronized live vote tallies."),
        ("TS-CHAT-01", "Verify that group members can send and receive real-time messages within the group chat hub."),
        ("TS-EXP-01", "Verify that a member can log an expense with amount, category, and split breakdown among group members."),
        ("TS-NOTIF-01", "Verify that real-device push notifications and in-app toast banners trigger with the official TourGo icon upon trip updates."),
    ]
    for r_i, row in enumerate(t9.rows):
        for c_i, val in enumerate(t9_data[r_i]):
            row.cells[c_i].text = val

    # Table 10: Test Cases
    t10 = doc.tables[10]
    t10_data = [
        ("Test Case", "Expected Result", "Status"),
        ("Login With Email & Password", "User Authenticated & Dashboard Loaded", "Passed"),
        ("Host / Create New Trip", "Trip Created with Alphanumeric Join Code", "Passed"),
        ("Join Trip via Alphanumeric Code", "Member Enrolled in Trip & Redirected", "Passed"),
        ("Organizer Delete Trip", "Trip Removed with Cascade Foreign Key Cleanup", "Passed"),
        ("Browse Philippine Destinations", "Spots, Weather & Route Estimates Displayed", "Passed"),
        ("Add Day-by-Day Itinerary Stop", "Stop Saved Under Target Day with Coordinates", "Passed"),
        ("Google Gemini AI Day Plan", "Smart Multi-Stop Itinerary Generated", "Passed"),
        ("Create & Vote on Group Poll", "Poll Active with Synchronized Live Counts", "Passed"),
        ("Send Real-Time Chat Message", "Message Broadcast via Supabase Realtime", "Passed"),
        ("Log Expense & Split Bill", "Expense Saved and Member Balances Calculated", "Passed"),
        ("Receive Activity Push Notification", "Push Banner Displays TourGo App Icon & Title", "Passed"),
    ]
    for r_i, row in enumerate(t10.rows):
        for c_i, val in enumerate(t10_data[r_i]):
            row.cells[c_i].text = val

    # Evaluation
    doc.paragraphs[198].text = "• All-in-one platform unifying trip hosting, AI planning, chat, polls, expense splitting, and community feed"
    doc.paragraphs[199].text = "• Real-time cloud synchronization powered by Supabase WebSockets and PostgreSQL"
    doc.paragraphs[200].text = "• Transparent expense splitting with automated balance tracking and settlement calculations"
    doc.paragraphs[201].text = "• Integrated Google Gemini AI travel assistant accelerating personalized day itinerary generation"
    doc.paragraphs[203].text = "• Active internet connectivity required for real-time cloud features and API requests"
    doc.paragraphs[204].text = "• Third-party API quotas apply to Google Gemini AI and OpenStreetMap public tile servers"
    doc.paragraphs[205].text = "• No fiat banking integration; expense ledger serves as a collaborative accounting log"

    # -------------------------------------------------------------
    # 9. Chapter 5: Conclusion and Recommendations
    # -------------------------------------------------------------
    doc.paragraphs[209].text = (
        'The project successfully developed TourGo, a robust and collaborative mobile travel platform that provides groups with an '
        'all-in-one environment to plan, coordinate, and enjoy trips together. Core features were fully implemented and validated on physical '
        'devices: trip hosting and code joining, destination discovery, collaborative day-by-day itineraries, Google Gemini AI day-plan '
        'assistance, real-time group chat, interactive voting polls, shared expense splitting, branded mobile push notifications, and community '
        'travel sharing. The project demonstrated the effective integration of cross-platform mobile development, cloud backend synchronization, '
        'and artificial intelligence into a cohesive travel utility.'
    )
    doc.paragraphs[211].text = "• Implement offline-first caching with automatic background synchronization when reconnecting to the internet."
    doc.paragraphs[212].text = "• Incorporate biometric authentication (Fingerprint / Face ID) for faster and more secure mobile sign-in."
    doc.paragraphs[213].text = "• Integrate direct Philippine airline and bus transport APIs for automated ticket and booking imports, plus exportable PDF itinerary summaries."

    # Save to TARGET_DOCX
    print(f"Saving to {TARGET_DOCX}...")
    doc.save(TARGET_DOCX)
    print(f"Document successfully generated: {TARGET_DOCX}")

    # Also try to save to TourGo_Final_Project_Documentation_NU_v2.docx as backup
    backup_path = "TourGo_Final_Project_Documentation_NU_v2.docx"
    doc.save(backup_path)
    print(f"Saved backup: {backup_path}")

if __name__ == "__main__":
    build()
