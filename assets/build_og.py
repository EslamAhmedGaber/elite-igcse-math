"""Render assets/og-image.png at 1200x630 using Pillow.

Run with the existing project venv:
    "C:/Users/Eslam/Documents/New project 5/classified_exam_problems/.venv/Scripts/python.exe" assets/build_og.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(__file__), "og-image.png")

NAVY = (18, 50, 74)
TEAL = (15, 118, 110)
GOLD = (244, 203, 97)
GOLD_DK = (187, 125, 35)
WHITE = (255, 255, 255)
WHITE_92 = (255, 255, 255, 235)
WHITE_78 = (255, 255, 255, 199)
WHITE_70 = (255, 255, 255, 178)


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", size, top)
    px = img.load()
    w, h = size
    for y in range(h):
        t = y / (h - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def diagonal_gradient(size, top_left, bottom_right):
    img = Image.new("RGB", size, top_left)
    px = img.load()
    w, h = size
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h - 2)
            r = int(top_left[0] + (bottom_right[0] - top_left[0]) * t)
            g = int(top_left[1] + (bottom_right[1] - top_left[1]) * t)
            b = int(top_left[2] + (bottom_right[2] - top_left[2]) * t)
            px[x, y] = (r, g, b)
    return img


def font(size, bold=False):
    candidates = []
    if bold:
        candidates += ["arialbd.ttf", "C:/Windows/Fonts/arialbd.ttf",
                       "segoeuib.ttf", "C:/Windows/Fonts/segoeuib.ttf"]
    else:
        candidates += ["arial.ttf", "C:/Windows/Fonts/arial.ttf",
                       "segoeui.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def main():
    img = diagonal_gradient((W, H), TEAL, NAVY).convert("RGBA")

    # subtle dot pattern
    dots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(dots)
    step = 32
    for y in range(0, H, step):
        for x in range(0, W, step):
            d.ellipse((x, y, x + 2, y + 2), fill=(255, 255, 255, 18))
    img = Image.alpha_composite(img, dots)

    draw = ImageDraw.Draw(img, "RGBA")

    # Edexcel badge
    badge_box = (80, 80, 80 + 220, 80 + 48)
    draw.rounded_rectangle(badge_box, radius=14, fill=GOLD)
    draw.text((80 + 110, 80 + 24), "EDEXCEL 4MA1", anchor="mm",
              font=font(18, bold=True), fill=NAVY)

    # Headline
    draw.text((80, 175), "Elite IGCSE", font=font(82, bold=True), fill=WHITE)
    draw.text((80, 265), "Mathematics", font=font(82, bold=True), fill=GOLD)

    # Subhead
    draw.text((80, 380), "974 classified past-paper questions  ·  214 Q20+ expertise problems",
              font=font(26, bold=False), fill=(255, 255, 255, 235))
    draw.text((80, 420), "1188 worked solutions. Practice by topic. Reach A* / 9.",
              font=font(22, bold=False), fill=(255, 255, 255, 199))

    # Teacher chip
    cy = 540
    draw.ellipse((80, cy - 36, 80 + 72, cy + 36), fill=GOLD)
    draw.text((80 + 36, cy), "E", anchor="mm", font=font(36, bold=True), fill=NAVY)
    draw.text((172, cy - 18), "Dr Eslam Ahmed", font=font(22, bold=True), fill=WHITE)
    draw.text((172, cy + 12), "Assistant Lecturer · Cairo University Faculty of Engineering",
              font=font(15, bold=False), fill=(255, 255, 255, 199))

    # Right-side price card — drawn on a separate transparent layer
    card_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card_layer, "RGBA")
    card = (870, 80, 1120, 550)
    cdraw.rounded_rectangle(card, radius=22,
                            fill=(255, 255, 255, 38),
                            outline=(255, 255, 255, 90), width=2)
    img = Image.alpha_composite(img, card_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    cx = (card[0] + card[2]) // 2
    draw.text((cx, 130), "FROM", anchor="mm", font=font(14, bold=True), fill=GOLD)
    draw.text((cx, 195), "$12", anchor="mm", font=font(64, bold=True), fill=WHITE)
    draw.text((cx, 235), "per session", anchor="mm", font=font(15, bold=False), fill=(255, 255, 255, 200))

    draw.line((card[0] + 40, 268, card[2] - 40, 268), fill=(255, 255, 255, 80), width=1)

    bullets = ["100% online", "Recorded sessions", "Max 5 per group", "First class free"]
    by = 300
    for b in bullets:
        draw.text((cx, by), b, anchor="mm", font=font(15, bold=True), fill=WHITE)
        by += 32

    draw.line((card[0] + 40, 440, card[2] - 40, 440), fill=(255, 255, 255, 80), width=1)

    # CTA
    cta = (card[0] + 30, 470, card[2] - 30, 514)
    draw.rounded_rectangle(cta, radius=22, fill=GOLD)
    draw.text(((cta[0] + cta[2]) // 2, (cta[1] + cta[3]) // 2),
              "ENROLL VIA WHATSAPP", anchor="mm", font=font(14, bold=True), fill=NAVY)
    draw.text((cx, 532), "+20 112 000 9622", anchor="mm",
              font=font(13, bold=False), fill=(255, 255, 255, 200))

    img.convert("RGB").save(OUT, "PNG", optimize=True)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()

