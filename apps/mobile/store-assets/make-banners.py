"""Generate promo banners 1920x1080 for RuStore / Google Play feature graphic."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "banners")
os.makedirs(OUT, exist_ok=True)

W, H = 1920, 1080

# Brand colors (from uletnayaparkovka.ru)
BLUE_DARK = (15, 36, 64)       # background top
BLUE_MID = (31, 85, 127)       # primary
BLUE_LIGHT = (51, 130, 184)    # accent
YELLOW = (255, 210, 0)         # CTA
WHITE = (255, 255, 255)
GRAY = (220, 224, 230)

# Cyrillic-supporting fonts on Windows
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/arial.ttf"


def gradient_bg(c1, c2):
    img = Image.new("RGB", (W, H), c1)
    top = Image.new("RGB", (W, 1), c1)
    bottom = Image.new("RGB", (W, 1), c2)
    for y in range(H):
        t = y / H
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        ImageDraw.Draw(img).line([(0, y), (W, y)], fill=(r, g, b))
    return img


def soft_circle(img, cx, cy, r, color, alpha=80):
    """Add a soft glowing circle (cloud-like accent)."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(120))
    img.paste(overlay, (0, 0), overlay)


def phone_mockup(draw, x, y, w, h, content_color=(245, 247, 250)):
    """Draw a stylized phone with rounded corners."""
    pad = 14
    # outer body
    draw.rounded_rectangle([x, y, x + w, y + h], radius=42, fill=(20, 24, 30), outline=(60, 70, 90), width=3)
    # screen
    draw.rounded_rectangle([x + pad, y + pad + 24, x + w - pad, y + h - pad - 14], radius=28, fill=content_color)
    # notch
    draw.rounded_rectangle([x + w / 2 - 60, y + pad + 6, x + w / 2 + 60, y + pad + 28], radius=10, fill=(20, 24, 30))


def draw_phone_screen(img, x, y, w, h, headline, lines, button_text):
    """Draw app UI mockup inside phone frame."""
    pad = 14
    sx, sy = x + pad, y + pad + 30
    sw, sh = w - 2 * pad, h - 2 * pad - 16

    od = ImageDraw.Draw(img)
    # app header
    od.rectangle([sx, sy, sx + sw, sy + 60], fill=BLUE_MID)
    f_logo = ImageFont.truetype(FONT_BOLD, 22)
    od.text((sx + 16, sy + 16), "Улётная парковка", fill=WHITE, font=f_logo)

    # hero image stub
    hero_y = sy + 70
    od.rectangle([sx + 12, hero_y, sx + sw - 12, hero_y + 140], fill=(190, 210, 230))
    f_caption = ImageFont.truetype(FONT_BOLD, 28)
    od.text((sx + 24, hero_y + 56), headline, fill=BLUE_DARK, font=f_caption)

    # info lines
    f_line = ImageFont.truetype(FONT_REG, 22)
    ly = hero_y + 170
    for line in lines:
        od.ellipse([sx + 16, ly + 6, sx + 28, ly + 18], fill=YELLOW)
        od.text((sx + 40, ly), line, fill=(40, 50, 70), font=f_line)
        ly += 50

    # CTA button
    btn_y = ly + 30
    od.rounded_rectangle([sx + 24, btn_y, sx + sw - 24, btn_y + 64], radius=14, fill=YELLOW)
    f_btn = ImageFont.truetype(FONT_BOLD, 28)
    tw = od.textlength(button_text, font=f_btn)
    od.text((sx + sw / 2 - tw / 2, btn_y + 16), button_text, fill=BLUE_DARK, font=f_btn)


def banner_1():
    """Main brand banner — logo + tagline + phone mockup."""
    img = gradient_bg(BLUE_DARK, BLUE_MID)
    soft_circle(img, 1500, 200, 250, BLUE_LIGHT, 130)
    soft_circle(img, 200, 900, 280, BLUE_LIGHT, 90)

    od = ImageDraw.Draw(img)

    # Yellow accent stripe
    od.rectangle([0, 0, 18, H], fill=YELLOW)

    # Title
    f_title = ImageFont.truetype(FONT_BOLD, 130)
    f_sub = ImageFont.truetype(FONT_REG, 52)
    f_small = ImageFont.truetype(FONT_BOLD, 38)

    od.text((100, 220), "Улётная", fill=WHITE, font=f_title)
    od.text((100, 360), "парковка", fill=YELLOW, font=f_title)

    od.text((100, 540), "Охраняемая парковка", fill=WHITE, font=f_sub)
    od.text((100, 600), "у аэропортов Москвы", fill=WHITE, font=f_sub)

    # bullets
    items = ["От 150 ₽ в сутки", "Бесплатный трансфер", "Круглосуточная охрана"]
    y = 720
    for it in items:
        od.ellipse([100, y + 12, 124, y + 36], fill=YELLOW)
        od.text((148, y), it, fill=GRAY, font=f_small)
        y += 60

    # Phone mockup on right
    phone_mockup(od, 1280, 110, 480, 860)
    draw_phone_screen(img, 1280, 110, 480, 860,
                      "Шереметьево",
                      ["От 150 ₽ / сутки", "Трансфер 24/7", "Охрана и видео"],
                      "Забронировать")

    img.save(os.path.join(OUT, "01-brand.jpg"), "JPEG", quality=92)
    print("01-brand.jpg saved")


def banner_2():
    """Airports list — Sheremetyevo focus."""
    img = gradient_bg(BLUE_MID, BLUE_DARK)
    soft_circle(img, 1700, 800, 320, YELLOW, 50)

    od = ImageDraw.Draw(img)
    od.rectangle([0, 0, 18, H], fill=YELLOW)

    f_h = ImageFont.truetype(FONT_BOLD, 110)
    f_sub = ImageFont.truetype(FONT_REG, 48)
    f_b = ImageFont.truetype(FONT_BOLD, 44)
    f_t = ImageFont.truetype(FONT_BOLD, 60)

    od.text((100, 160), "Парковка", fill=WHITE, font=f_h)
    od.text((100, 280), "в Шереметьево", fill=YELLOW, font=f_h)
    od.text((100, 440), "Бронируйте прямо из приложения", fill=WHITE, font=f_sub)

    # 3 feature cards
    cards = [
        ("От 150 ₽", "в сутки"),
        ("4 минуты", "до терминала B"),
        ("24/7", "трансфер"),
    ]
    cx = 100
    cy = 600
    cw = 380
    ch = 280
    gap = 40
    for i, (top, bottom) in enumerate(cards):
        x = cx + i * (cw + gap)
        od.rounded_rectangle([x, cy, x + cw, cy + ch], radius=24, fill=WHITE)
        tw = od.textlength(top, font=f_t)
        od.text((x + cw / 2 - tw / 2, cy + 70), top, fill=BLUE_MID, font=f_t)
        bw = od.textlength(bottom, font=f_b)
        od.text((x + cw / 2 - bw / 2, cy + 160), bottom, fill=BLUE_DARK, font=f_b)

    img.save(os.path.join(OUT, "02-sheremetyevo.jpg"), "JPEG", quality=92)
    print("02-sheremetyevo.jpg saved")


def banner_3():
    """Booking flow with phone mockup."""
    img = gradient_bg(BLUE_DARK, (8, 20, 36))
    soft_circle(img, 400, 200, 280, BLUE_LIGHT, 80)
    soft_circle(img, 1500, 900, 320, BLUE_LIGHT, 80)

    od = ImageDraw.Draw(img)
    od.rectangle([0, 0, 18, H], fill=YELLOW)

    f_h = ImageFont.truetype(FONT_BOLD, 96)
    f_sub = ImageFont.truetype(FONT_REG, 42)
    f_step = ImageFont.truetype(FONT_BOLD, 38)
    f_stepn = ImageFont.truetype(FONT_BOLD, 80)

    od.text((100, 140), "Бронь за 1 минуту", fill=WHITE, font=f_h)
    od.text((100, 260), "Без звонков и очередей", fill=GRAY, font=f_sub)

    steps = [
        ("1", "Выберите аэропорт", "и даты"),
        ("2", "Получите цену", "и подтверждение"),
        ("3", "Приезжайте", "трансфер уже ждёт"),
    ]
    sy = 460
    for i, (num, title, sub) in enumerate(steps):
        y = sy + i * 170
        # number circle
        od.ellipse([110, y - 10, 230, y + 110], fill=YELLOW)
        nw = od.textlength(num, font=f_stepn)
        od.text((170 - nw / 2, y + 8), num, fill=BLUE_DARK, font=f_stepn)
        # text
        od.text((280, y + 8), title, fill=WHITE, font=f_step)
        od.text((280, y + 64), sub, fill=GRAY, font=f_sub)

    # Phone on right
    phone_mockup(od, 1290, 110, 470, 860)
    draw_phone_screen(img, 1290, 110, 470, 860,
                      "Бронирование",
                      ["12 — 19 декабря", "Эконом • 150 ₽/сут", "Итого: 1 050 ₽"],
                      "Подтвердить")

    img.save(os.path.join(OUT, "03-booking.jpg"), "JPEG", quality=92)
    print("03-booking.jpg saved")


def banner_4():
    """Pricing & benefits."""
    img = gradient_bg(BLUE_MID, BLUE_DARK)
    od = ImageDraw.Draw(img)
    od.rectangle([0, 0, 18, H], fill=YELLOW)

    f_h = ImageFont.truetype(FONT_BOLD, 104)
    f_price = ImageFont.truetype(FONT_BOLD, 220)
    f_sub = ImageFont.truetype(FONT_REG, 48)
    f_b = ImageFont.truetype(FONT_BOLD, 42)

    od.text((100, 140), "Честная цена", fill=WHITE, font=f_h)
    od.text((100, 270), "без скрытых платежей", fill=GRAY, font=f_sub)

    # huge price
    od.text((100, 420), "150₽", fill=YELLOW, font=f_price)
    od.text((130, 700), "в сутки", fill=WHITE, font=f_sub)

    # benefits column on right
    items = [
        "Бесплатный трансфер",
        "Круглосуточная охрана",
        "Видеонаблюдение",
        "Бесплатный Wi-Fi и кофе",
        "Помощь с багажом",
    ]
    bx = 1100
    by = 280
    for it in items:
        od.rounded_rectangle([bx - 10, by - 10, bx + 760, by + 60], radius=12, outline=BLUE_LIGHT, width=2)
        od.ellipse([bx + 10, by + 18, bx + 38, by + 46], fill=YELLOW)
        od.text((bx + 60, by + 10), it, fill=WHITE, font=f_b)
        by += 110

    img.save(os.path.join(OUT, "04-pricing.jpg"), "JPEG", quality=92)
    print("04-pricing.jpg saved")


if __name__ == "__main__":
    banner_1()
    banner_2()
    banner_3()
    banner_4()
    print(f"\nSaved to: {OUT}")
