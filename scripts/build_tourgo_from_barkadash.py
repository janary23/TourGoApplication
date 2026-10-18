# scripts/build_tourgo_from_barkadash.py
# Clones Barkadash_Final_Project_Documentation.docx directly to preserve
# 100% of the visual formatting, margins, fonts, NU Baliwag logo,
# running header/footer, borders, callout box, and table designs,
# while replacing the content with TourGo.

import os
import zipfile
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import xml.etree.ElementTree as ET

SOURCE_DOCX = "Barkadash_Final_Project_Documentation.docx"
TARGET_DOCX = "TourGo_Final_Project_Documentation.docx"

def update_docx():
    print(f"Loading {SOURCE_DOCX}...")
    doc = docx.Document(SOURCE_DOCX)

    # 1. Update Title and Cover Page
    # P6 is Project Title
    p6 = doc.paragraphs[6]
    p6.text = "TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform"
    for r in p6.runs:
        r.bold = True
        r.font.size = Pt(18)
        r.font.color.rgb = RGBColor(0x2E, 0x75, 0xB6)

    # P9 is Prepared by
    p9 = doc.paragraphs[9]
    p9.text = "Harry Sevilla"
    for r in p9.runs:
        r.font.size = Pt(11)

    # 2. Update Chapter 1 Content
    # P45: Introduction
    doc.paragraphs[45].text = (
        'The project entitled "TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform" '
        'is a mobile application developed for Filipino friend groups (barkadas) to plan, organize, and coordinate trips together. '
        'It brings destination and date voting, a shared day-by-day itinerary, group expense splitting, real-time geofenced Guardian '
        'safety radar tracking, and Google Gemini AI travel planning into one platform, so groups no longer have to juggle multiple '
        'chat threads, spreadsheets, and navigation apps.'
    )

    # P48: General Objective
    doc.paragraphs[48].text = (
        'To develop a collaborative mobile application that helps barkadas plan, organize, and coordinate group trips efficiently and '
        'safely, from initial itinerary planning and on-trip geofenced safety tracking up to post-trip recaps and community sharing.'
    )

    # P50 - P54: Specific Objectives
    doc.paragraphs[50].text = "1. To streamline group decision-making through destination and date polling with live vote counters."
    doc.paragraphs[51].text = "2. To provide a shared, synchronized day-by-day itinerary with sequential accuracy-checked route mapping."
    doc.paragraphs[52].text = "3. To simplify shared travel expenses through itemized expense splitting and settlement tracking."
    doc.paragraphs[53].text = "4. To improve group safety and coordination through real-time Guardian Mode geofenced radar tracking and automated perimeter-drift alerts."
    doc.paragraphs[54].text = "5. To provide AI-assisted day-by-day travel itineraries and recommendations through Google Gemini AI integration."

    # P57 - P66: Scope of the Project
    doc.paragraphs[57].text = "• Authentication and Profiles (Email/password login, traveler preference onboarding, light/dark theme)"
    doc.paragraphs[58].text = "• Social & Trip Coordination (user profile search, real-device push notifications with TourGo icon)"
    doc.paragraphs[59].text = "• Trip Hosting and Joining (6-character invite codes and role-based permissions)"
    doc.paragraphs[60].text = "• Destination and Date Polling, with organizer lock"
    doc.paragraphs[61].text = "• Shared Itinerary and Route Mapping (with Leaflet.js, OpenStreetMap, and Photon discovery)"
    doc.paragraphs[62].text = "• Logistics Coordination (Group and personal packing checklists)"
    doc.paragraphs[63].text = "• Shared Expense Ledger and Settle Up (with receipt uploads and split calculations)"
    doc.paragraphs[64].text = "• Guardian Safety Mode (real-time geofenced safe-zone perimeter radar and live member tracking)"
    doc.paragraphs[65].text = "• Google Gemini AI Travel Assistant (smart day-plan generation)"
    doc.paragraphs[66].text = "• Community Feed and Media Lightbox (unified itinerary cards and Facebook-style expandable photo gallery)"

    # P68 - P72: Limitations
    doc.paragraphs[68].text = "• Internet connection required for real-time synchronization with Supabase"
    doc.paragraphs[69].text = "• Depends on third-party API quotas (Google Gemini AI and OpenStreetMap public servers)"
    doc.paragraphs[70].text = "• Guardian Safety Mode requires GPS and user location permissions; it is opt-in and trip-scoped"
    doc.paragraphs[71].text = "• No actual fiat payment processing or in-app booking; expense splitting and QR features are for coordination only"
    doc.paragraphs[72].text = "• Currency conversions and travel times are approximate and for reference only"

    # 3. Update Chapter 2 Content
    # P77: System Description
    doc.paragraphs[77].text = (
        'The application allows users to log in securely, customize their travel preferences, and be greeted by an animated soaring '
        'Philippine Eagle mascot on the home dashboard. A user can host a new trip—generating a 6-character invite code—or join an '
        'existing one using an invite code provided by their barkada organizer. Members propose and vote on destinations and dates, '
        'the organizer finalizes the tour, and the group builds a collaborative itinerary with optional Google Gemini AI suggestions. '
        'During the trip, members can log shared expenses, settle balances, view each other\'s live location on the Guardian geofenced '
        'radar map, and receive real-device push notifications whenever trip activities or itinerary changes occur. After the trip, '
        'an interactive scrapbook and community post can be published with expandable full-screen photos. All data is securely stored '
        'in Supabase (PostgreSQL, Auth, Storage, and Realtime) and synchronized across members\' devices.'
    )

    # P80: Callout Box (System Flow)
    doc.paragraphs[80].text = (
        'Start → Login (Email/Password) → Host / Join Trip (6-Char Code) → Vote → Lock Tour → '
        'Itinerary & AI Planner → Guardian Radar & Push Alerts → Trip Recap / Community → End'
    )
    for r in doc.paragraphs[80].runs:
        r.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    # P81: Detailed Flow
    doc.paragraphs[81].text = (
        'Detailed flow: The user registers or signs in using their credentials; the profile and travel preferences are loaded. '
        'The user chooses to host a new trip (enters title, destination, and dates, receiving a unique 6-character join code) or '
        'joins using a code from their organizer. Group members propose and vote on destination activities and dates. Once locked, '
        'members build a day-by-day itinerary or generate full schedules using Google Gemini AI. During the active trip, the organizer '
        'enables Guardian Mode with a configurable geofenced radius (in meters) to monitor member safety, while members log shared bills '
        'and receive real-device push notification alerts on every group update. At trip completion, a visual scrapbook is compiled '
        'and shared to the community feed with full-screen expandable photo lightbox support.'
    )

    # P85: Actor
    doc.paragraphs[85].text = (
        'User – the actor of the system. Any registered user can host or join a trip, vote, build itineraries, track expenses, '
        'and use group travel tools. The user who creates a trip becomes its organizer and gains safety geofencing controls, tour locking, '
        'and member management.'
    )

    # P87 - P95: Use Cases
    doc.paragraphs[87].text = "• Login / Register – sign in via Supabase Auth and manage traveler profile and preferences"
    doc.paragraphs[88].text = "• Host / Join Trip – create a trip with a 6-character invite code or join using an active code"
    doc.paragraphs[89].text = "• Manage Participants – invite members, manage permissions, and assign organizer/member roles"
    doc.paragraphs[90].text = "• Vote on Destination and Dates – propose candidate options and finalize the tour via organizer lock"
    doc.paragraphs[91].text = "• Manage Itinerary & AI Planner – add day stops, resolve coordinates, and generate AI day schedules"
    doc.paragraphs[92].text = "• Track Packing Checklists – manage assignable group tasks and private personal packing checklists"
    doc.paragraphs[93].text = "• Manage Expenses & Splitter – log expenses, calculate equal/solo splits, and record payment proofs"
    doc.paragraphs[94].text = "• Guardian Safety Radar & Push Notifications – view live member geofenced positions and receive instant alerts"
    doc.paragraphs[95].text = "• Community Feed & Lightbox – publish unified trip recap cards and view photos in Facebook-style lightbox"

    # Database Tables (Tables 1 - 9)
    # Table 1: profiles
    # Table 2: trips
    # Table 3: trip_participants -> Update description to TourGo
    # Table 4: trip_poll_options
    # Table 5: trip_poll_votes
    # Table 6: trip_itinerary_items
    # Table 7: expenses
    # Table 8: expense_settlements
    # Table 9: trip_recaps -> community posts / recaps

    # P121 - P128: UI Descriptions
    doc.paragraphs[121].text = "• Trip Planning and Management – host/join trip, switch trip, and trip details with 6-char code and member list"
    doc.paragraphs[122].text = "• Destination Polls and Voting – propose places or dates, vote with live tallies, and finalize the tour"
    doc.paragraphs[123].text = "• AI-Powered Itinerary Planning – Google Gemini AI assistant synthesizing personalized multi-stop day plans"
    doc.paragraphs[124].text = "• Itinerary Page – day-by-day plan with time tags, route geocoding, and interactive stop details"
    doc.paragraphs[125].text = "• Shared Trip Expenses – itemized expense ledger, cost splitter, and Settle Up payment verification"
    doc.paragraphs[126].text = "• Packing Checklists – group task assignments and personal packing checklist tracking"
    doc.paragraphs[127].text = "• Guardian Safety Radar – live interactive map with configurable geofenced radius and member GPS pins"
    doc.paragraphs[128].text = "• Community Feed & Media Lightbox – unified itinerary cards and Facebook-style expandable photo gallery"

    # 4. Update Chapter 3 Content
    # P149 - P153: Software
    doc.paragraphs[149].text = "• Antigravity – AI-assisted agentic code editor used for full-stack mobile development and git workflow"
    doc.paragraphs[150].text = "• Android Studio – Android virtual devices and native SDK build tooling"
    doc.paragraphs[151].text = "• React Native (Expo SDK 52) – core cross-platform framework delivering native performance"
    doc.paragraphs[152].text = "• Supabase – cloud backend infrastructure (PostgreSQL database, Auth, Storage, and Realtime WebSockets)"
    doc.paragraphs[153].text = "• External APIs & Services – Leaflet.js / OpenStreetMap, Google Gemini AI API, and Expo Push Notifications API"

    # P155 - P156: Hardware
    doc.paragraphs[155].text = "• Development PC/Workstation – multi-core development environment running Node.js and Expo CLI"
    doc.paragraphs[156].text = "• Physical Android & iPhone Devices – tested on physical hardware for native push notification and GPS verification"

    # P163: Development
    doc.paragraphs[163].text = (
        'The application was built using React Native (Expo SDK 52) with TypeScript and Supabase backend services. '
        'Core modules implemented include authentication, trip hosting with 6-character codes, polling, day-by-day itinerary builder, '
        'Google Gemini AI integration, Guardian Mode geofencing, expense ledger, real-device push notifications with TourGo branding, '
        'and a Facebook-style photo lightbox community feed.'
    )

    # 5. Update Chapter 4 Content
    # Features
    doc.paragraphs[172].text = (
        'Allows a user to host a trip with destination and date details. The system generates a unique 6-character invite code '
        'and designates the creator as organizer. Other members can join instantly by entering the code.'
    )
    doc.paragraphs[175].text = (
        'Members propose candidate destinations and dates, voting with live synchronized tallies. Organizers can lock the poll, '
        'finalizing the travel dates and opening itinerary planning.'
    )
    doc.paragraphs[178].text = (
        'Members build day-by-day schedules with chronological time tags and verified coordinates. Travelers can invoke Google Gemini AI '
        'to automatically generate comprehensive day schedules tailored to their preferences.'
    )
    doc.paragraphs[181].text = (
        'Members record travel expenses with category and split modes (equal or solo). The ledger calculates balances and enables '
        'debtors to submit payment proofs for creditor verification.'
    )
    doc.paragraphs[184].text = (
        'Provides an interactive Leaflet map centered on the destination with an organizer-configurable geofenced perimeter circle. '
        'Members share live GPS locations and the system alerts on perimeter drift. Integrates native heads-up push notifications with the TourGo icon.'
    )
    doc.paragraphs[187].text = (
        'After the trip, memories, photos, and ratings are published as a unified itinerary card on the community feed, featuring '
        'a Facebook-style full-screen media lightbox modal with swipe and pinch-to-zoom gestures.'
    )

    # Table 10: Test Scenarios
    t10 = doc.tables[9]
    t10_data = [
        ("TS-AUTH-01", "Verify that a registered traveler can log in using valid credentials and maintain persistent session storage."),
        ("TS-PLAN-01", "Verify that an organizer can create a trip and obtain an auto-generated unique 6-character invite code."),
        ("TS-PLAN-02", "Verify that a user can join an existing trip by entering a valid 6-character code."),
        ("TS-PLAN-03", "Verify that members can propose options and submit votes in the Destination & Date Poll."),
        ("TS-PLAN-04", "Verify that a member can add, edit, and reorder an itinerary stop with time tags under a specific trip day."),
        ("TS-PLAN-05", "Verify that Google Gemini AI synthesizes a structured day-plan populated directly into the itinerary."),
        ("TS-RADAR-01", "Verify that Guardian Mode renders an accurate circular geofence polygon matching the configured radius in meters."),
        ("TS-RADAR-02", "Verify that the Squad panel correctly displays a selected member's live status, distance, and geofence state."),
        ("TS-NOTIF-01", "Verify that adding an itinerary stop or activity triggers a native heads-up push notification banner on real devices."),
        ("TS-LEDGER-01", "Verify that a user can log an expense with category and equal/solo split mode into the trip ledger."),
        ("TS-COMM-01", "Verify that tapping an itinerary photo in the community feed opens the full-screen Facebook-style lightbox modal."),
    ]
    for i, (sc_id, desc) in enumerate(t10_data):
        if i + 1 < len(t10.rows):
            t10.rows[i + 1].cells[0].text = sc_id
            t10.rows[i + 1].cells[1].text = desc

    # Table 11: Test Cases
    t11 = doc.tables[10]
    t11_data = [
        ("Login With Valid Credentials", "User Access Granted (Home screen with eagle mascot opens)", "Passed"),
        ("Create Trip With Title & Dates", "Trip Created With 6-Character Invite Code", "Passed"),
        ("Join Trip With Valid Code", "User Added to Trip as Member", "Passed"),
        ("Propose and Vote in Poll", "Option Listed and Vote Counted With Live Tally", "Passed"),
        ("Add Itinerary Item (Day 1)", "Item Saved Under Day 1 With Coordinates and Tag", "Passed"),
        ("Generate AI Day-Plan (Gemini)", "Structured Multi-Stop Day Schedule Populated", "Passed"),
        ("Open Guardian Radar During Trip", "Interactive Map Displaying Geofenced Safe Zone", "Passed"),
        ("View Member in Guardian Panel", "Member's Live GPS Pin and Safety Status Displayed", "Passed"),
        ("Trigger Activity Push Alert", "Native Heads-Up Banner With TourGo App Icon Shown", "Passed"),
        ("Add Expense (Pinaluwal / Equal)", "Expense Saved and Member Debts Generated", "Passed"),
        ("Tap Itinerary Photo in Community", "Full-Screen Lightbox Modal Opens With Pinch-Zoom", "Passed"),
    ]
    for i, (tc, exp, st) in enumerate(t11_data):
        if i + 1 < len(t11.rows):
            t11.rows[i + 1].cells[0].text = tc
            t11.rows[i + 1].cells[1].text = exp
            t11.rows[i + 1].cells[2].text = st

    # P197 - P204: Evaluation
    doc.paragraphs[197].text = "• All-in-one collaborative platform unifying planning, budgeting, polling, safety, and community sharing"
    doc.paragraphs[198].text = "• Real-time synchronization across members via Supabase Realtime WebSockets"
    doc.paragraphs[199].text = "• Integrated Guardian Mode geofenced radar with perimeter-drift safety monitoring"
    doc.paragraphs[200].text = "• Zero-cost location architecture leveraging OpenStreetMap, Leaflet, and Photon geocoding"
    doc.paragraphs[202].text = "• Internet connectivity required for real-time cloud data synchronization"
    doc.paragraphs[203].text = "• No in-app fiat payment processing; settlement tracking is for coordination only"
    doc.paragraphs[204].text = "• Guardian Safety Radar requires hardware GPS and user device permissions"

    # 6. Update Chapter 5 Content
    # P209: Conclusion
    doc.paragraphs[209].text = (
        'The project successfully developed TourGo, a comprehensive collaborative mobile application and real-time safety coordination '
        'platform that gives barkadas a single place to plan, manage, and safely execute group trips. The core features were rigorously '
        'implemented and validated on physical hardware: trip hosting with 6-character join codes, destination and date polling, collaborative '
        'day-by-day itineraries with Google Gemini AI assistance, itemized expense splitting with settlement tracking, Guardian Mode geofenced '
        'radar safety tracking, real-device push notifications with TourGo branding, and a community feed with a Facebook-style photo lightbox. '
        'Through this project, practical mastery in cross-platform mobile engineering, cloud database design, third-party API integration, '
        'and modern UI/UX design was demonstrated in accordance with the CTELEC4L requirements.'
    )

    # P211 - P212: Recommendations
    doc.paragraphs[211].text = "• Implement offline SQLite caching to enable itinerary and document access in remote Philippine regions without cellular coverage."
    doc.paragraphs[212].text = "• Incorporate peer-to-peer Bluetooth Low Energy (BLE) mesh tracking for Guardian member tracking during off-grid mountain hikes."

    # Save to a temporary file first
    temp_target = "TourGo_Final_Project_Documentation_DirectClone.docx"
    doc.save(temp_target)
    print(f"Direct clone saved to {temp_target}")

    # Now update header2.xml directly in the zip to replace the running header text
    print("Updating header XML in zip...")
    target_file = TARGET_DOCX
    try:
        with zipfile.ZipFile(temp_target, 'r') as zin:
            with zipfile.ZipFile(target_file, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == "word/header2.xml":
                        text_content = content.decode('utf-8')
                        text_content = text_content.replace(
                            "Barkadash – A Collaborative Trip Planning Application",
                            "TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform"
                        ).replace(
                            "Barkadash",
                            "TourGo"
                        )
                        content = text_content.encode('utf-8')
                    zout.writestr(item, content)
        print(f"SUCCESS! {target_file} created with exact NU Baliwag logo, running header, callout box, and layout!")
    except PermissionError:
        target_file = "TourGo_Final_Project_Documentation_NU.docx"
        with zipfile.ZipFile(temp_target, 'r') as zin:
            with zipfile.ZipFile(target_file, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == "word/header2.xml":
                        text_content = content.decode('utf-8')
                        text_content = text_content.replace(
                            "Barkadash – A Collaborative Trip Planning Application",
                            "TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform"
                        ).replace(
                            "Barkadash",
                            "TourGo"
                        )
                        content = text_content.encode('utf-8')
                    zout.writestr(item, content)
        print(f"Word is currently locking '{TARGET_DOCX}'. Successfully created and saved to '{target_file}'!")

if __name__ == "__main__":
    update_docx()
