# scripts/generate_tourgo_docs.py
# Generates the complete TourGo Final Project Documentation (.docx and .md)
# following the exact structure and standards of Barkadash_Final_Project_Documentation.docx.

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_tourgo_document(output_path="TourGo_Final_Project_Documentation.docx"):
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles & Fonts
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # Primary colors
    COLOR_BRAND = RGBColor(0x02, 0x8B, 0xEB) # TourGo Blue #028BEB
    COLOR_DARK = RGBColor(0x0F, 0x17, 0x2A) # Slate 900
    COLOR_MUTED = RGBColor(0x64, 0x74, 0x8B) # Slate 500

    # ─────────────────────────────────────────────────────────────────────────────
    # TITLE / COVER PAGE
    # ─────────────────────────────────────────────────────────────────────────────
    p_header1 = doc.add_paragraph()
    p_header1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_h1 = p_header1.add_run("ADVANCE MOBILE APPLICATION DEVELOPMENT\nFINAL PROJECT DOCUMENTATION\n\n")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_DARK

    # Logo if available
    logo_path = os.path.join(os.getcwd(), "assets", "images", "TourGoLogo.png")
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.add_run().add_picture(logo_path, width=Inches(2.5))
        doc.add_paragraph()

    p_title_tag = doc.add_paragraph()
    p_title_tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_tag = p_title_tag.add_run("PROJECT TITLE")
    r_tag.font.size = Pt(12)
    r_tag.font.bold = True
    r_tag.font.color.rgb = COLOR_MUTED

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform")
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_BRAND

    doc.add_paragraph("\n\n")

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    runs_data = [
        ("Prepared by:\n", True, Pt(11)),
        ("Harry Sevilla\n\n", False, Pt(12)),
        ("Subject:\n", True, Pt(11)),
        ("Mobile Application Development (CTELEC4L)\n\n", False, Pt(12)),
        ("Section:\n", True, Pt(11)),
        ("ITE 231\n\n", False, Pt(12)),
        ("Submitted to:\n", True, Pt(11)),
        ("Prof. Paul John D. Cabance\n\n", False, Pt(12)),
        ("Date Submitted:\n", True, Pt(11)),
        ("October 2026\n", False, Pt(12)),
    ]
    for text, bold, size in runs_data:
        r = p_meta.add_run(text)
        r.bold = bold
        r.font.size = size
        r.font.color.rgb = COLOR_DARK

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # TABLE OF CONTENTS
    # ─────────────────────────────────────────────────────────────────────────────
    p_toc_head = doc.add_paragraph()
    r = p_toc_head.add_run("TABLE OF CONTENTS")
    r.font.size = Pt(16)
    r.font.bold = True
    r.font.color.rgb = COLOR_BRAND

    toc_items = [
        ("CHAPTER 1  –  PROJECT OVERVIEW", "3"),
        ("    Introduction", "3"),
        ("    Project Objectives", "3"),
        ("    Scope of the Project", "4"),
        ("    Limitations", "4"),
        ("CHAPTER 2  –  SYSTEM ANALYSIS AND DESIGN", "5"),
        ("    System Description", "5"),
        ("    System Flow", "5"),
        ("    Use Case Diagram", "6"),
        ("    Database Design", "7"),
        ("    User Interface Design", "10"),
        ("CHAPTER 3  –  SYSTEM DEVELOPMENT", "12"),
        ("    Tools and Technologies Used", "12"),
        ("    Development Process", "13"),
        ("CHAPTER 4  –  RESULTS AND TESTING", "14"),
        ("    System Features", "14"),
        ("    Functional Testing", "16"),
        ("    Evaluation", "18"),
        ("CHAPTER 5  –  CONCLUSION AND RECOMMENDATIONS", "19"),
        ("    Conclusion", "19"),
        ("    Recommendations", "19"),
    ]

    for item, page in toc_items:
        p_toc = doc.add_paragraph()
        p_toc.paragraph_format.space_after = Pt(4)
        r1 = p_toc.add_run(item)
        r1.font.size = Pt(10.5)
        if "CHAPTER" in item:
            r1.font.bold = True
            r1.font.color.rgb = COLOR_DARK
        else:
            r1.font.color.rgb = COLOR_MUTED
        
        # Leader dots
        dots_count = max(5, 75 - len(item))
        p_toc.add_run(" " + "." * dots_count + " ")
        r2 = p_toc.add_run(page)
        r2.font.bold = True
        r2.font.size = Pt(10.5)

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # HELPER FUNCTIONS FOR CHAPTERS
    # ─────────────────────────────────────────────────────────────────────────────
    def add_chapter_heading(num, title):
        p1 = doc.add_paragraph()
        p1.paragraph_format.space_before = Pt(18)
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(f"CHAPTER {num}")
        r1.font.size = Pt(13)
        r1.font.bold = True
        r1.font.color.rgb = COLOR_BRAND

        p2 = doc.add_paragraph()
        p2.paragraph_format.space_after = Pt(14)
        r2 = p2.add_run(title)
        r2.font.size = Pt(16)
        r2.font.bold = True
        r2.font.color.rgb = COLOR_DARK

    def add_section_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(title)
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = COLOR_DARK

    def add_sub_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(title)
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = COLOR_BRAND

    def add_body(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(text)
        r.font.size = Pt(11)

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix + ": ")
            r_bold.bold = True
            r_bold.font.color.rgb = COLOR_DARK
        r_text = p.add_run(text)
        r_text.font.size = Pt(10.5)

    def build_table(headers, rows, col_widths=None):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Header Row
        hdr_cells = table.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].text = header_text
            set_cell_background(hdr_cells[i], "028BEB")
            set_cell_margins(hdr_cells[i], top=140, bottom=140, left=160, right=160)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.bold = True
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        # Body Rows
        for r_idx, row_data in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells
            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, cell_value in enumerate(row_data):
                row_cells[c_idx].text = str(cell_value)
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.font.size = Pt(9.5)
                    r.font.color.rgb = COLOR_DARK

        # Column widths if specified
        if col_widths:
            for row in table.rows:
                for idx, w in enumerate(col_widths):
                    row.cells[idx].width = Inches(w)

        doc.add_paragraph() # Spacing below table

    # ─────────────────────────────────────────────────────────────────────────────
    # CHAPTER 1: PROJECT OVERVIEW
    # ─────────────────────────────────────────────────────────────────────────────
    add_chapter_heading("1", "PROJECT OVERVIEW")

    add_section_heading("Introduction")
    add_body(
        'The project entitled "TourGo – A Collaborative Group Travel Planning and Real-Time Safety Coordination Platform" '
        'is a cross-platform mobile application developed to resolve the disorganization, safety uncertainties, and logistics '
        'headaches commonly encountered by Filipino travel groups and barkadas. In traditional group trips, coordination is '
        'scattered across disjointed platforms—chat apps where decisions are buried, messy spreadsheets for expense splitting, '
        'and personal navigation tools. This fragmented workflow often causes itinerary disagreements, awkward bill collection, '
        'and genuine safety concerns when members drift apart in unfamiliar travel destinations.'
    )
    add_body(
        'TourGo integrates every phase of group travel into a unified, responsive mobile ecosystem. It features an intelligent '
        'day-by-day itinerary builder supported by Google Gemini AI, collaborative group polls with real-time tallies, an itemized '
        'expense ledger with automated split calculations, and an interactive Guardian Mode safety system. Guardian Mode provides '
        'organizers with configurable geofenced safe-zone perimeters (measured in meters) and real-time live member radar tracking. '
        'Furthermore, TourGo features native high-priority push notifications and in-app heads-up banners on real physical devices, '
        'ensuring that members receive instant updates whenever itineraries change or group activities occur. When the journey ends, '
        'TourGo converts the experience into an interactive community feed post and a Facebook-style expandable photo scrapbook.'
    )

    add_section_heading("Project Objectives")
    add_sub_heading("General Objective")
    add_body(
        'To design, develop, test, and implement an all-in-one collaborative mobile application and real-time safety coordination '
        'platform that empowers Filipino travel groups and barkadas to seamlessly plan itineraries, track shared finances, maintain '
        'live group safety, and commemorate their travel journeys within a synchronized mobile experience.'
    )

    add_sub_heading("Specific Objectives")
    add_bullet("1. Streamlined Group Access", "To implement an authentication and trip hosting system utilizing unique 6-character invite codes and Supabase role-based security (Organizer vs. Member).")
    add_bullet("2. Collaborative Itinerary Builder", "To develop a day-by-day itinerary creator with time slot tagging, sequential accuracy-checked route mapping, free keyless landmark discovery, and Google Gemini AI day-plan generation.")
    add_bullet("3. Guardian Safety Geofencing", "To build an interactive Guardian Mode safety radar featuring organizer-configurable geofenced safe zones (in meters) and automated perimeter-drift alerts.")
    add_bullet("4. Real-Device Push Notifications", "To configure native Android high-importance notification channels and Supabase Realtime listeners that trigger instant heads-up notification banners on physical mobile devices.")
    add_bullet("5. Transparent Financial Coordination", "To establish an itemized shared expense ledger with automated split calculation, debtor/creditor balance visibility, and payment settlement tracking.")
    add_bullet("6. Logistics & Decision Polling", "To provide organizer-run destination/activity polls with live vote tallies, shared trip document repositories, and categorized group/personal packing checklists.")
    add_bullet("7. Community & Scrapbook Memories", "To develop a social community feed and an auto-generated visual scrapbook with full-screen Facebook-style photo lightbox expansion.")

    add_section_heading("Scope of the Project")
    add_body("The TourGo mobile application encompasses the following modules and capabilities:")
    add_bullet("User Authentication & Profile Onboarding", "Email/password authentication via Supabase Auth, personalized traveler preferences onboarding, avatar selection, and dark/light theme switching.")
    add_bullet("Trip Hosting & Joining", "One-tap trip creation generating a unique 6-character join code, participant role assignment, and multi-trip switching.")
    add_bullet("Day-by-Day Itinerary & AI Planner", "Structured scheduling with transport/food/activity tags, free keyless POI discovery (Wikipedia, OpenStreetMap, Photon), and Google Gemini AI itinerary generation.")
    add_bullet("Guardian Safety Radar & Geofencing", "Organizer-configurable safe zone radius (meters) rendered as a real-radius perimeter circle on interactive Leaflet maps with live member location tracking and perimeter-drift warnings.")
    add_bullet("Real-Device Push Notifications", "Native notification permissions, Expo push token storage in Supabase, Android high-priority channel ('trip-updates'), and in-app drop-down toast banners displaying the TourGo logo.")
    add_bullet("Group Logistics (Polls & Checklists)", "Destination and activity polling with live vote counters, assignable group tasks, and private personal packing checklists.")
    add_bullet("Shared Expense Ledger", "Itemized travel expenses, split calculation (solo vs. equally shared), and payment settlement logging.")
    add_bullet("Community Feed & Media Lightbox", "Unified single-card itinerary posts, multi-photo galleries with pinch-to-zoom Facebook-style lightbox expansion, and post-trip scrapbook generation.")

    add_section_heading("Limitations")
    add_bullet("Network Connectivity Requirement", "The mobile app requires an active internet connection to synchronize realtime database changes, chat messages, and push notifications with Supabase.")
    add_bullet("Hardware Location Permission", "Guardian Mode live tracking requires GPS hardware and explicit foreground/background user permissions on the traveler's mobile device.")
    add_bullet("Third-Party API Free Tier Limits", "AI itinerary generation and free geocoding services depend on Google Gemini and OpenStreetMap public server quotas.")
    add_bullet("Coordination-Only Financial Ledger", "The shared expense module calculates debts and verifies payment submissions, but does not process monetary transactions or integrate fiat banking gateways.")

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # CHAPTER 2: SYSTEM ANALYSIS AND DESIGN
    # ─────────────────────────────────────────────────────────────────────────────
    add_chapter_heading("2", "SYSTEM ANALYSIS AND DESIGN")

    add_section_heading("System Description")
    add_body(
        'TourGo provides a structured end-to-end travel experience. A user registers and customizes their travel preferences '
        'during onboarding. On the main dashboard, the user is greeted by an animated soaring Philippine Eagle mascot that guides '
        'their travel journey. The user can either host a trip—generating a 6-character invite code—or join an existing trip by entering '
        'a code provided by their barkada organizer.'
    )
    add_body(
        'Once inside the trip workspace, members collaborate across dedicated tabs. Organizers create polls to decide destinations, '
        'while members build a synchronized day-by-day itinerary. Travelers can ask the integrated Google Gemini AI engine to '
        'synthesize a custom schedule tailored to their group size and interests. During active travel, the organizer enables Guardian '
        'Mode on an interactive Leaflet map, establishing a geofenced safe-zone circle around the base camp. If a member wanders outside '
        'this perimeter, or whenever someone adds an itinerary stop, logs an expense, or posts a message, the system fires native push '
        'notifications directly to members\' devices. At trip completion, the journey is archived into a scrapbook and shared to the community feed.'
    )

    add_section_heading("System Flow")
    add_body("The complete operational flow of TourGo progresses through six distinct stages:")
    add_body("Start → Login / Registration → Mascot Dashboard → Host Trip (6-Char Code) / Join Trip → Collaborative Planning (Itinerary, AI Planner, Polls, Checklists) → Active Travel & Guardian Safety (Geofenced Radar, Push Notifications, Group Chat) → Post-Trip Scrapbook & Community Feed → End")

    add_section_heading("Use Case Diagram")
    add_body("The system defines two primary operational roles:")
    add_bullet("Trip Organizer (Host)", "Creates the trip, generates invite codes, configures geofenced safe-zone radius, manages member roles, publishes announcements, creates polls, and finalizes itineraries.")
    add_bullet("Trip Member (Traveler)", "Joins trips using 6-character codes, participates in polls, adds and edits assigned itinerary items, checks off packing lists, logs expenses, shares live GPS location, and comments on community posts.")

    add_sub_heading("Core System Use Cases:")
    use_cases = [
        ("UC-01", "Authenticate User", "User registers and signs in via Supabase Auth with persistent session storage."),
        ("UC-02", "Host / Join Trip", "Organizer creates a trip with 6-char code; travelers enter code to join group."),
        ("UC-03", "Build Itinerary", "Members collaborate on day-by-day activities with time slots and POI coordinates."),
        ("UC-04", "AI Day-Plan Assistant", "Travelers request automated itinerary suggestions powered by Google Gemini."),
        ("UC-05", "Guardian Safety Mode", "Organizer sets geofenced radius in meters; system tracks members and alerts on perimeter drift."),
        ("UC-06", "Real-Time Push Alerts", "Triggers heads-up native notifications and in-app toast banners on trip updates."),
        ("UC-07", "Decision Polling", "Organizers launch polls; members submit votes with live synchronized tallies."),
        ("UC-08", "Shared Expense Splitting", "Users record expenses; system computes per-member splits and tracks settlement status."),
        ("UC-09", "Community Feed & Lightbox", "Users publish trip recaps as unified cards and view photos in Facebook-style lightbox."),
    ]
    build_table(["Use Case ID", "Title", "Functional Description"], use_cases, [1.2, 1.8, 3.5])

    add_section_heading("Database Design")
    add_body(
        'TourGo utilizes Supabase (PostgreSQL 15) with Row-Level Security (RLS) policies enforcing trip-scoped data protection. '
        'Below are the schemas for the core production tables:'
    )

    # Table 1: profiles
    add_sub_heading("Table: profiles")
    tbl_profiles = [
        ("id", "UUID (PK)", "User identifier linked directly to Supabase auth.users(id)"),
        ("full_name", "Text", "Full display name of the traveler"),
        ("avatar_url", "Text", "Public storage URL for user profile picture"),
        ("email", "Text", "User email address used for login and notifications"),
        ("push_token", "Text", "Registered Expo Push Token for real-device system notifications"),
        ("preferences", "JSONB", "User travel preferences (pace, budget, interests)"),
        ("created_at", "Timestamptz", "Account creation timestamp"),
    ]
    build_table(["Field", "Type", "Description"], tbl_profiles, [1.5, 1.5, 3.5])

    # Table 2: trips
    add_sub_heading("Table: trips")
    tbl_trips = [
        ("id", "UUID (PK)", "Unique trip identifier"),
        ("title", "Text", "Descriptive title of the trip (e.g., 'El Nido Barkada Getaway')"),
        ("destination", "Text", "Primary destination name or municipality"),
        ("invite_code", "Text (Unique)", "6-character alphanumeric code for group joining"),
        ("start_date", "Date", "Trip starting date"),
        ("end_date", "Date", "Trip ending date"),
        ("cover_image", "Text", "Cover photo URL for trip header and scrapbook"),
        ("guardian_radius", "Integer", "Configurable geofence radius in meters (e.g., 500m, 1000m)"),
        ("dest_lat / dest_lng", "Numeric", "Geographic coordinates of the trip destination base camp"),
        ("created_by", "UUID (FK)", "Host user ID referencing profiles.id"),
    ]
    build_table(["Field", "Type", "Description"], tbl_trips, [1.5, 1.5, 3.5])

    # Table 3: trip_members
    add_sub_heading("Table: trip_members")
    tbl_members = [
        ("id", "UUID (PK)", "Unique membership record ID"),
        ("trip_id", "UUID (FK)", "Trip joined referencing trips.id"),
        ("user_id", "UUID (FK)", "Member user ID referencing profiles.id"),
        ("role", "Text", "Role designation ('organizer' or 'member')"),
        ("last_lat / last_lng", "Numeric", "Live GPS coordinates shared for Guardian Radar"),
        ("last_location_time", "Timestamptz", "Timestamp of most recent location update"),
        ("joined_at", "Timestamptz", "Timestamp when the user joined the trip"),
    ]
    build_table(["Field", "Type", "Description"], tbl_members, [1.5, 1.5, 3.5])

    # Table 4: trip_poll_options
    add_sub_heading("Table: trip_poll_options")
    tbl_poll_options = [
        ("id", "UUID (PK)", "Unique poll option ID"),
        ("trip_id", "UUID (FK)", "Trip being polled referencing trips.id"),
        ("type", "Text", "Poll category ('destination', 'date', or 'activity')"),
        ("title", "Text", "Proposed option title or description"),
        ("created_by", "UUID (FK)", "Member who proposed the option referencing profiles.id"),
    ]
    build_table(["Field", "Type", "Description"], tbl_poll_options, [1.5, 1.5, 3.5])

    # Table 5: trip_poll_votes
    add_sub_heading("Table: trip_poll_votes")
    tbl_poll_votes = [
        ("id", "UUID (PK)", "Unique vote record ID"),
        ("option_id", "UUID (FK)", "Voted option referencing trip_poll_options.id"),
        ("user_id", "UUID (FK)", "Member who cast the vote referencing profiles.id"),
        ("created_at", "Timestamptz", "Timestamp when the vote was submitted"),
    ]
    build_table(["Field", "Type", "Description"], tbl_poll_votes, [1.5, 1.5, 3.5])

    # Table 6: itinerary_items
    add_sub_heading("Table: itinerary_items")
    tbl_itin = [
        ("id", "UUID (PK)", "Unique itinerary stop identifier"),
        ("trip_id", "UUID (FK)", "Associated trip referencing trips.id"),
        ("day_number", "Integer", "Trip itinerary day (e.g., Day 1, Day 2)"),
        ("title", "Text", "Name of the attraction, stop, or activity"),
        ("time", "Text", "Scheduled time (e.g., '09:00 AM')"),
        ("tag", "Text", "Activity category (TRANSPORT, ACTIVITY, FOOD, MEETUP)"),
        ("latitude / longitude", "Numeric", "Verified geographic coordinates of the stop"),
        ("cost", "Numeric", "Estimated budget allocation for the activity"),
        ("created_by", "UUID (FK)", "Member who logged the stop referencing profiles.id"),
    ]
    build_table(["Field", "Type", "Description"], tbl_itin, [1.5, 1.5, 3.5])

    # Table 7: expenses
    add_sub_heading("Table: expenses")
    tbl_exp = [
        ("id", "UUID (PK)", "Unique expense transaction identifier"),
        ("trip_id", "UUID (FK)", "Associated trip referencing trips.id"),
        ("payer_id", "UUID (FK)", "User who paid the bill referencing profiles.id"),
        ("title", "Text", "Expense title (e.g., 'Van Rental', 'Seafood Dinner')"),
        ("amount", "Numeric", "Total monetary amount paid in PHP"),
        ("category", "Text", "Expense category (Food, Transport, Lodging, Activity)"),
        ("split_mode", "Text", "Split mode ('equal', 'custom', or 'solo')"),
        ("created_at", "Timestamptz", "Timestamp when expense was recorded"),
    ]
    build_table(["Field", "Type", "Description"], tbl_exp, [1.5, 1.5, 3.5])

    # Table 8: expense_settlements
    add_sub_heading("Table: expense_settlements")
    tbl_settlements = [
        ("id", "UUID (PK)", "Unique settlement transaction ID"),
        ("trip_id", "UUID (FK)", "Associated trip referencing trips.id"),
        ("debtor_id", "UUID (FK)", "Member who owed and paid referencing profiles.id"),
        ("creditor_id", "UUID (FK)", "Member who received the payment referencing profiles.id"),
        ("amount", "Numeric", "Settled amount in PHP"),
        ("proof_url", "Text", "URL of payment proof receipt screenshot"),
        ("status", "Text", "Settlement status ('pending', 'verified', 'rejected')"),
    ]
    build_table(["Field", "Type", "Description"], tbl_settlements, [1.5, 1.5, 3.5])

    # Table 9: community_posts (Trip Recaps)
    add_sub_heading("Table: community_posts (Trip Recaps)")
    tbl_posts = [
        ("id", "UUID (PK)", "Unique community post / recap identifier"),
        ("trip_id", "UUID (FK)", "Optional referenced trip for itinerary posts referencing trips.id"),
        ("author_id", "UUID (FK)", "Author user ID referencing profiles.id"),
        ("author_name", "Text", "Display name of the author"),
        ("destination", "Text", "Featured destination name"),
        ("caption", "Text", "Post caption and travel tips"),
        ("media_urls", "JSONB", "Array of photo and video URLs"),
        ("itinerary_data", "JSONB", "Day-by-day stops for 1-click adoption by other travelers"),
        ("likes_count", "Integer", "Total like engagement count"),
        ("created_at", "Timestamptz", "Post publication timestamp"),
    ]
    build_table(["Field", "Type", "Description"], tbl_posts, [1.5, 1.5, 3.5])

    add_section_heading("User Interface Design")
    add_body(
        'TourGo features an ultra-modern, fluid mobile UI designed in accordance with clean ergonomic mobile guidelines. '
        'The interface supports both adaptive light and dark themes, high-contrast accessibility tokens, and interactive feedback.'
    )
    add_bullet("Figure 1. Authentication & Walkthrough Onboarding", "Features email/password authentication, password recovery, and an illustrated step-by-step feature walkthrough.")
    add_bullet("Figure 2. Home Dashboard & Animated Eagle Mascot", "Displays upcoming trips, quick actions, and an animated Philippine Eagle mascot that gracefully enters and soars across the dashboard.")
    add_bullet("Figure 3. Trip Creation & 6-Character Join Code", "Enables hosts to set destinations and dates while generating shareable 6-character join codes.")
    add_bullet("Figure 4. Day-by-Day Itinerary Builder & AI Assistant", "Shows chronological day plans with categorized badges and an interactive Google Gemini AI day-plan generator.")
    add_bullet("Figure 5. Guardian Safety Mode & Geofenced Radar Map", "Interactive Leaflet map showing the trip destination, live member pins, and a semi-transparent geofence perimeter circle.")
    add_bullet("Figure 6. Group Collaboration (Polls, Announcements & Chat)", "Synchronized decision polls with real-time percentage bars, pinned announcements, and live group messaging.")
    add_bullet("Figure 7. Shared Expense Ledger & Cost Splitting", "Itemized ledger displaying total spend, individual contributions, and an automated settle-up breakdown.")
    add_bullet("Figure 8. Real-Device Push Notifications & In-App Toast", "Android high-priority heads-up banners with the TourGo app icon and an animated top drop-down banner.")
    add_bullet("Figure 9. Community Feed & Facebook-Style Media Lightbox", "Unified single-card itinerary posts with expandable photo strips and full-screen pinch-to-zoom media lightbox modal.")

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # CHAPTER 3: SYSTEM DEVELOPMENT
    # ─────────────────────────────────────────────────────────────────────────────
    add_chapter_heading("3", "SYSTEM DEVELOPMENT")

    add_section_heading("Tools and Technologies Used")
    add_sub_heading("Software Technologies")
    add_bullet("Antigravity IDE", "Advanced AI-powered agentic coding IDE utilized for continuous pair programming, architectural design, automated testing, and git version control.")
    add_bullet("React Native & Expo SDK 52", "High-performance cross-platform mobile development framework delivering native 60fps animations and direct hardware access.")
    add_bullet("TypeScript", "Strictly-typed superset of JavaScript providing robust type safety, compile-time error checking, and clear data models across all services.")
    add_bullet("Supabase Backend-as-a-Service", "PostgreSQL 15 relational database, Supabase Auth for session tokens, Storage buckets for photos, and WebSocket Realtime subscriptions.")
    add_bullet("Expo Notifications", "Native push notification framework handling permission requests, device tokens, Android notification channels, and immediate heads-up alerts.")
    add_bullet("Leaflet.js & OpenStreetMap / Esri", "Interactive mapping engine loaded inside React Native WebView, rendering real-radius geofence circles, member pins, and multi-layer basemaps.")
    add_bullet("Google Gemini Generative AI API", "AI travel model synthesizing personalized multi-day itineraries based on traveler preferences.")

    add_sub_heading("Hardware Requirements")
    add_bullet("Development Workstation", "Windows 11 PC equipped with multi-core processor, 16GB RAM, and Node.js LTS environment.")
    add_bullet("Physical Mobile Testing Devices", "Android 14/15 smartphones and iOS devices used to validate real-device push notifications, GPS background permissions, and native camera image capture.")

    add_section_heading("Development Process")
    add_body("The development of TourGo followed an iterative Agile development methodology divided into four structured phases:")
    add_bullet("Phase 1: Requirements Gathering & User Research", "Analyzed real-world group travel pain points among Filipino barkadas—unresolved voting disputes, lost companions in remote travel spots, and awkward manual bill collection.")
    add_bullet("Phase 2: Architectural & Schema Design", "Designed the normalized Supabase database schema, Row-Level Security policies, and visual component hierarchy.")
    add_bullet("Phase 3: Core Implementation & Feature Sprints", "Constructed the core modules in React Native/Expo: authentication, join codes, itinerary builder, Guardian geofencing, expense ledger, and real-device push notification listeners.")
    add_bullet("Phase 4: Hardware Testing & Optimization", "Executed real-device physical testing on Android and iOS hardware to confirm push notification channel reliability, heads-up banner display, smooth mascot flight animations, and photo lightbox touch gestures.")

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # CHAPTER 4: RESULTS AND TESTING
    # ─────────────────────────────────────────────────────────────────────────────
    add_chapter_heading("4", "RESULTS AND TESTING")

    add_section_heading("System Features")
    features_list = [
        ("Feature 1: User Onboarding & Animated Eagle Mascot", "Allows users to register securely, customize travel preferences, and view an animated Philippine Eagle soaring gracefully on the home dashboard."),
        ("Feature 2: Trip Hosting & 6-Character Join Code", "Enables organizers to create trips and generate instant 6-character invite codes for seamless member onboarding."),
        ("Feature 3: Collaborative Itinerary & AI Generator", "Supports day-by-day activity planning with time badges, free keyless POI discovery, and Google Gemini AI itinerary generation."),
        ("Feature 4: Guardian Safety Geofenced Radar", "Provides live GPS member location tracking on an interactive Leaflet map within a configurable geofenced safe-zone circle."),
        ("Feature 5: Real-Device Push Notifications", "Triggers native heads-up banners with the TourGo app icon and an animated in-app drop-down toast whenever trip updates occur."),
        ("Feature 6: Decision Polling & Packing Checklists", "Allows organizers to launch polls with real-time vote percentage bars and track shared group tasks alongside private personal checklists."),
        ("Feature 7: Shared Expenses & Automated Settle-Up", "Records travel bills, calculates per-person debt obligations, and tracks payment settlement verification between debtors and creditors."),
        ("Feature 8: Community Feed & Media Lightbox", "Publishes trips as unified itinerary cards with expandable photo thumbnails and full-screen Facebook-style lightbox viewing."),
    ]
    for title, desc in features_list:
        add_sub_heading(title)
        add_body(desc)

    add_section_heading("Functional Testing")
    add_body(
        'Comprehensive black-box functional testing was executed on both simulated environments and physical Android devices. '
        'The following test scenarios and test cases demonstrate system stability and correctness across all core modules:'
    )

    add_sub_heading("Test Scenarios")
    scenarios = [
        ("TS-AUTH-01", "Verify that a traveler can register and sign in with valid credentials, persisting authentication tokens across app restarts."),
        ("TS-TRIP-01", "Verify that an organizer can create a trip and obtain an auto-generated unique 6-character join code."),
        ("TS-TRIP-02", "Verify that a traveler can join an existing trip by entering a valid 6-character code and be assigned the 'member' role."),
        ("TS-ITIN-01", "Verify that a member can add, edit, and reorder an itinerary stop under a specific trip day."),
        ("TS-AI-01", "Verify that the Google Gemini AI assistant synthesizes a valid multi-stop day itinerary based on user prompts."),
        ("TS-GUARD-01", "Verify that Guardian Mode renders an accurate circular geofence polygon matching the configured radius in meters."),
        ("TS-GUARD-02", "Verify that the system detects when a member's GPS coordinates drift outside the geofenced perimeter."),
        ("TS-NOTIF-01", "Verify that adding an itinerary stop or activity triggers a native heads-up push notification banner with the TourGo icon on real devices."),
        ("TS-EXP-01", "Verify that logging an expense automatically divides costs and updates debtor/creditor balances."),
        ("TS-COMM-01", "Verify that tapping an itinerary photo in the community feed opens the full-screen Facebook-style lightbox modal."),
    ]
    build_table(["Scenario ID", "Description"], scenarios, [1.5, 5.0])

    add_sub_heading("Test Cases Execution Matrix")
    test_cases = [
        ("TC-01", "User Login With Valid Credentials", "User access granted; navigated to Home dashboard with eagle mascot", "Passed"),
        ("TC-02", "Create Trip With Destination & Dates", "Trip record created with unique 6-character join code", "Passed"),
        ("TC-03", "Join Trip Using 6-Character Code", "User added to trip member list with role 'member'", "Passed"),
        ("TC-04", "Add Itinerary Stop (Day 1, 09:00 AM)", "Stop saved to database and rendered chronologically in day schedule", "Passed"),
        ("TC-05", "Generate AI Day-Plan (Gemini)", "Structured multi-stop day plan generated and populated into itinerary", "Passed"),
        ("TC-06", "Set Guardian Radius (500 Meters)", "Interactive map displays 500m geofence circle centered on destination", "Passed"),
        ("TC-07", "Simulate Member Outside Geofence", "System detects perimeter breach and flags member as outside safe zone", "Passed"),
        ("TC-08", "Trigger Trip Activity Push Notification", "Native heads-up banner with TourGo logo appears on physical device", "Passed"),
        ("TC-09", "Submit Vote on Group Poll", "Vote recorded and progress bar updates in real time for all members", "Passed"),
        ("TC-10", "Log P5,000 Group Van Expense", "Calculates equal splits (P1,000/person for 5 members) in ledger", "Passed"),
        ("TC-11", "Tap Itinerary Photo in Community Feed", "Full-screen media lightbox modal opens with swipe and zoom gestures", "Passed"),
    ]
    build_table(["Test Case ID", "Test Case Title", "Expected & Actual Result", "Status"], test_cases, [1.0, 2.3, 2.5, 0.7])

    add_section_heading("Evaluation")
    add_sub_heading("System Strengths")
    add_bullet("All-in-One Travel Ecosystem", "Eliminates the need for multiple disparate apps by unifying planning, budgeting, polling, safety, and community sharing into a single client.")
    add_bullet("Integrated Guardian Safety Geofencing", "Protects travelers in unfamiliar destinations through real-time geofenced perimeter circles and outside-zone drift monitoring.")
    add_bullet("Zero Location API Overhead", "Employs open-source and keyless providers (OpenStreetMap, Photon, Leaflet, Wikipedia), eliminating recurring map tile and geocoding licensing costs.")
    add_bullet("Native Hardware Optimization", "Engineered with native Android high-priority notification channels, smooth eagle mascot animations, and hardware-accelerated photo lightboxes.")

    add_sub_heading("System Limitations")
    add_bullet("Connectivity Dependency", "Realtime database updates and live location sharing require continuous cellular or Wi-Fi data connectivity.")
    add_bullet("Non-Transactional Ledger", "The shared expense system computes and manages balances transparently but requires members to complete peer-to-peer payments outside the app.")

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────────
    # CHAPTER 5: CONCLUSION AND RECOMMENDATIONS
    # ─────────────────────────────────────────────────────────────────────────────
    add_chapter_heading("5", "CONCLUSION AND RECOMMENDATIONS")

    add_section_heading("Conclusion")
    add_body(
        'The TourGo project successfully fulfilled all requirements set forth for the Advance Mobile Application Development '
        '(CTELEC4L) final examination. The mobile application delivers a complete, cohesive, and production-ready platform tailored '
        'to the unique social dynamics of Filipino travel groups and barkadas.'
    )
    add_body(
        'Every critical subsystem—including secure authentication, trip hosting with 6-character join codes, day-by-day itinerary '
        'management with Google Gemini AI integration, Guardian Mode geofencing with perimeter-drift detection, real-device push '
        'notifications with branded icons, itemized expense splitting, and a rich community photo feed—was rigorously developed, '
        'tested, and verified on physical hardware. Through this project, advanced principles in mobile systems engineering, reactive '
        'UI design, cloud relational schema design, WebSocket realtime state management, and native hardware integration were '
        'successfully demonstrated.'
    )

    add_section_heading("Recommendations")
    add_body("To further enhance TourGo for commercial deployment, the following future extensions are recommended:")
    add_bullet("1. Offline Itinerary Caching & Sync", "Implement an offline-first SQLite cache so travelers in remote Philippine islands with no cellular reception can still review their itinerary schedules.")
    add_bullet("2. Peer-to-Peer Bluetooth Mesh Radar", "Incorporate offline Bluetooth Low Energy (BLE) peer discovery to enable Guardian member tracking even when mobile data is unavailable during mountain hikes.")
    add_bullet("3. Direct E-Wallet Payment Gateway", "Integrate GCash and Maya QR Ph payment APIs to enable one-tap automated debt settlement directly within the shared expense ledger.")
    add_bullet("4. Multilingual Local Language Support", "Provide localized interfaces in Tagalog, Cebuano, and Ilocano to expand accessibility across diverse Philippine regional travel communities.")

    try:
        doc.save(output_path)
        print(f"Document successfully created and saved to: {output_path}")
    except PermissionError:
        fallback_path = output_path.replace(".docx", "_Updated.docx")
        doc.save(fallback_path)
        print(f"Notice: '{output_path}' is currently open in Microsoft Word. Saved to '{fallback_path}'. Close Word to overwrite.")

if __name__ == "__main__":
    create_tourgo_document()
