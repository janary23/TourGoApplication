# scripts/generate_placeholders.py
import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('assets/placeholders', exist_ok=True)

FIGURES = [
    (1, "Trip Planning and Member Hub", "Trip Creation, 6-Character Join Code & Member Management"),
    (2, "Interactive Destination Discovery & Explore", "Philippine Map, Top Tourist Spots, Weather & Category Filters"),
    (3, "AI-Powered Itinerary Planning (Gemini AI)", "Smart Day-Plan Generator Customized to Travel Preferences"),
    (4, "Collaborative Day-by-Day Itinerary", "Chronological Timeline, Stop Coordinates, Tags & Checklist"),
    (5, "Real-Time Group Chat & Interactive Polls", "Live Group Chat Messages & Synchronized Decision-Making Polls"),
    (6, "Shared Trip Expenses & Bill Splitting", "Itemized Expense Ledger, Equal/Custom Split & Settle-Up Balances"),
    (7, "Community Travel Feed & Traveler Profile", "Public Travel Stories, Photo Reel & Traveler Preference Settings"),
]

def create_placeholder(fig_num, title, subtitle):
    width = 1200
    height = 680
    
    # Background: clean modern light-neutral slate
    img = Image.new('RGB', (width, height), color=(248, 250, 252)) # #f8fafc
    draw = ImageDraw.Draw(img)
    
    # Draw subtle dashed/inner border
    border_color = (203, 213, 225) # #cbd5e1
    brand_blue = (2, 139, 235)     # #028BEB TourGo Blue
    slate_dark = (30, 41, 59)      # #1e293b
    slate_muted = (100, 116, 139)  # #64748b
    
    # Outer frame
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=border_color, width=3)
    
    # Dashed inner box
    dash_len = 16
    gap_len = 10
    top, bottom, left, right = 40, height - 40, 40, width - 40
    
    # Top & bottom dashed lines
    x = left
    while x < right:
        x_end = min(x + dash_len, right)
        draw.line([(x, top), (x_end, top)], fill=border_color, width=2)
        draw.line([(x, bottom), (x_end, bottom)], fill=border_color, width=2)
        x += dash_len + gap_len
        
    # Left & right dashed lines
    y = top
    while y < bottom:
        y_end = min(y + dash_len, bottom)
        draw.line([(left, y), (left, y_end)], fill=border_color, width=2)
        draw.line([(right, y), (right, y_end)], fill=border_color, width=2)
        y += dash_len + gap_len

    # Camera / Image icon in center top
    cx = width // 2
    cy = 200
    # Outer camera body
    draw.rounded_rectangle([(cx - 70, cy - 45), (cx + 70, cy + 45)], radius=12, outline=brand_blue, width=4)
    # Camera lens circle
    draw.ellipse([(cx - 28, cy - 28), (cx + 28, cy + 28)], outline=brand_blue, width=4)
    # Flash dot
    draw.ellipse([(cx + 40, cy - 30), (cx + 48, cy - 22)], fill=brand_blue)
    # Top shutter notch
    draw.rectangle([(cx - 25, cy - 58), (cx + 5, cy - 45)], fill=brand_blue)

    # Text rendering using default font with custom scaling
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_title = ImageFont.truetype("arialbd.ttf", 40)
        font_sub = ImageFont.truetype("arial.ttf", 26)
        font_hint = ImageFont.truetype("ariali.ttf", 22)
    except:
        font_large = font_title = font_sub = font_hint = ImageFont.load_default()

    # Draw Text
    tag_text = "[ SCREENSHOT PLACEHOLDER ]"
    w_tag = draw.textlength(tag_text, font=font_large) if hasattr(draw, 'textlength') else 300
    draw.text((cx - w_tag // 2, 290), tag_text, fill=brand_blue, font=font_large)

    fig_text = f"Figure {fig_num}: {title}"
    w_title = draw.textlength(fig_text, font=font_title) if hasattr(draw, 'textlength') else 400
    draw.text((cx - w_title // 2, 355), fig_text, fill=slate_dark, font=font_title)

    w_sub = draw.textlength(subtitle, font=font_sub) if hasattr(draw, 'textlength') else 400
    draw.text((cx - w_sub // 2, 420), subtitle, fill=slate_muted, font=font_sub)

    hint_text = "To insert your screenshot: Right-click image in Word -> 'Change Picture' -> 'This Device...'"
    w_hint = draw.textlength(hint_text, font=font_hint) if hasattr(draw, 'textlength') else 500
    draw.text((cx - w_hint // 2, 530), hint_text, fill=(148, 163, 184), font=font_hint)

    out_path = f"assets/placeholders/fig_{fig_num}_placeholder.png"
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

for fig_num, title, subtitle in FIGURES:
    create_placeholder(fig_num, title, subtitle)

print("All placeholder images generated successfully!")
