"""Generate iOS App Store screenshots 1284x2778 (iPhone 6.7")."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

W, H = 1284, 2778

# Brand colors
BLUE_DARK = (15, 36, 64)
BLUE_MID = (31, 85, 127)
BLUE_LIGHT = (51, 130, 184)
YELLOW = (255, 210, 0)
WHITE = (255, 255, 255)
GRAY = (240, 243, 247)
TEXT_PRIMARY = (28, 36, 52)
TEXT_SECONDARY = (110, 120, 135)
SUCCESS = (40, 167, 102)
DANGER_BG = (255, 235, 230)
SUCCESS_BG = (230, 248, 240)

FB = "C:/Windows/Fonts/arialbd.ttf"
FR = "C:/Windows/Fonts/arial.ttf"


def f(size, bold=True):
    return ImageFont.truetype(FB if bold else FR, size)


def status_bar(img, dark=False):
    """iOS status bar — time, signal, battery."""
    d = ImageDraw.Draw(img)
    fg = WHITE if dark else TEXT_PRIMARY
    # Time
    d.text((96, 50), "9:41", fill=fg, font=f(48, True))
    # Right cluster — signal + wifi + battery
    bx = W - 280
    # signal bars
    for i in range(4):
        h = 12 + i * 6
        d.rounded_rectangle([bx + i * 14, 70 - h, bx + i * 14 + 10, 70], radius=2, fill=fg)
    # wifi (3 arcs)
    wx = bx + 70
    for i, r in enumerate([10, 20, 30]):
        d.arc([wx - r, 65 - r, wx + r, 65 + r], start=210, end=330, fill=fg, width=4)
    d.ellipse([wx - 4, 61, wx + 4, 69], fill=fg)
    # battery
    btx = W - 130
    d.rounded_rectangle([btx, 48, btx + 78, 80], radius=6, outline=fg, width=3)
    d.rectangle([btx + 80, 56, btx + 86, 72], fill=fg)
    d.rounded_rectangle([btx + 4, 52, btx + 70, 76], radius=3, fill=fg)


def home_indicator(img):
    """iOS bottom home indicator bar."""
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W / 2 - 130, H - 30, W / 2 + 130, H - 18], radius=6, fill=(180, 180, 180))


def gradient_bg(c1, c2):
    img = Image.new("RGB", (W, H), c1)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    return img


def caption(img, line1, line2=None):
    """Marketing caption at top of screenshot — bold text on solid bg."""
    d = ImageDraw.Draw(img)
    # gradient header strip
    head_h = 500
    grad = Image.new("RGB", (W, head_h), BLUE_DARK)
    gd = ImageDraw.Draw(grad)
    for y in range(head_h):
        t = y / head_h
        c1, c2 = BLUE_MID, BLUE_DARK
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        gd.line([(0, y), (W, y)], fill=(r, g, b))
    img.paste(grad, (0, 0))
    status_bar(img, dark=True)
    # accent stripe
    d.rectangle([0, head_h, W, head_h + 8], fill=YELLOW)
    # title text
    fn = f(86, True)
    bbox = d.textbbox((0, 0), line1, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, 180), line1, fill=WHITE, font=fn)
    if line2:
        fn2 = f(68, True)
        bbox2 = d.textbbox((0, 0), line2, font=fn2)
        tw2 = bbox2[2] - bbox2[0]
        d.text((W / 2 - tw2 / 2, 310), line2, fill=YELLOW, font=fn2)


def mini_plane(d, cx, cy, size, color):
    """Small airplane polygon used as inline icon (no emoji needed)."""
    s = size / 50
    layer = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    lx, ly = size * 1.5, size * 1.5
    pd.polygon([
        (lx - 7 * s, ly), (lx - 6 * s, ly - 1.5 * s),
        (lx + 5 * s, ly - 1.5 * s), (lx + 7 * s, ly),
        (lx + 5 * s, ly + 1.5 * s), (lx - 6 * s, ly + 1.5 * s),
    ], fill=color)
    pd.polygon([(lx - 2 * s, ly + 1.4 * s), (lx + 2 * s, ly + 1.4 * s), (lx, ly + 5 * s)], fill=color)
    pd.polygon([(lx - 5 * s, ly - 1.4 * s), (lx - 3 * s, ly - 1.4 * s), (lx - 4 * s, ly - 4 * s)], fill=color)
    rot = layer.rotate(-35, resample=Image.BICUBIC, center=(lx, ly))
    return rot, (lx - size * 1.5, ly - size * 1.5)


def paste_plane(img, cx, cy, size, color):
    rot, _ = mini_plane(None, 0, 0, size, color)
    img.paste(rot, (int(cx - rot.width / 2), int(cy - rot.height / 2)), rot)


def card(d, x, y, w, h, fill=WHITE, shadow=True, radius=32):
    if shadow:
        sh = Image.new("RGBA", (int(w + 60), int(h + 60)), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle([30, 30, w + 30, h + 30], radius=radius, fill=(0, 0, 0, 40))
        sh = sh.filter(ImageFilter.GaussianBlur(15))
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill)


# ──────────────────────────────────────────────────────────────────
# SCREEN 1: Welcome / Brand hero
def screen_welcome():
    img = gradient_bg(BLUE_MID, BLUE_DARK)
    d = ImageDraw.Draw(img)
    status_bar(img, dark=True)

    # Glow
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([-200, -200, W + 200, 800], fill=(80, 140, 200, 80))
    overlay = overlay.filter(ImageFilter.GaussianBlur(120))
    img.paste(overlay, (0, 0), overlay)

    # Big icon center
    icon_size = 360
    icon_x = (W - icon_size) // 2
    icon_y = 600
    # rounded background
    d.rounded_rectangle([icon_x, icon_y, icon_x + icon_size, icon_y + icon_size],
                        radius=80, fill=YELLOW)
    # plane silhouette
    cx = icon_x + icon_size / 2
    cy = icon_y + icon_size * 0.42
    s = icon_size / 50
    plane_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plane_layer)
    pd.polygon([
        (cx - 7 * s, cy), (cx - 6 * s, cy - 1.5 * s),
        (cx + 5 * s, cy - 1.5 * s), (cx + 7 * s, cy),
        (cx + 5 * s, cy + 1.5 * s), (cx - 6 * s, cy + 1.5 * s),
    ], fill=BLUE_DARK)
    pd.polygon([(cx - 2 * s, cy + 1.4 * s), (cx + 2 * s, cy + 1.4 * s), (cx, cy + 5 * s)], fill=BLUE_DARK)
    pd.polygon([(cx - 5 * s, cy - 1.4 * s), (cx - 3 * s, cy - 1.4 * s), (cx - 4 * s, cy - 4 * s)], fill=BLUE_DARK)
    plane_layer = plane_layer.rotate(-35, resample=Image.BICUBIC, center=(cx, cy))
    img.paste(plane_layer, (0, 0), plane_layer)
    # УП below plane
    fmono = f(int(icon_size * 0.22), True)
    text = "УП"
    bbox = d.textbbox((0, 0), text, font=fmono)
    tw = bbox[2] - bbox[0]
    d.text((cx - tw / 2, icon_y + icon_size * 0.66), text, fill=BLUE_DARK, font=fmono)

    # Title below
    title = "Улётная парковка"
    fn = f(110, True)
    bbox = d.textbbox((0, 0), title, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, 1180), title, fill=WHITE, font=fn)

    subtitle = "Парковка у аэропортов Москвы"
    fn2 = f(56, False)
    bbox = d.textbbox((0, 0), subtitle, font=fn2)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, 1330), subtitle, fill=GRAY, font=fn2)

    # 3 bullet features
    items = [
        ("От 150 ₽", "в сутки"),
        ("Бесплатный", "трансфер 24/7"),
        ("Круглосуточная", "охрана"),
    ]
    y = 1600
    for top, bot in items:
        # yellow dot
        d.ellipse([200, y + 30, 250, y + 80], fill=YELLOW)
        d.text((300, y), top, fill=WHITE, font=f(58, True))
        d.text((300, y + 70), bot, fill=GRAY, font=f(48, False))
        y += 180

    # CTA button
    btn_y = H - 350
    d.rounded_rectangle([100, btn_y, W - 100, btn_y + 130], radius=24, fill=YELLOW)
    btn_text = "Начать"
    fn_btn = f(58, True)
    bbox = d.textbbox((0, 0), btn_text, font=fn_btn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, btn_y + 38), btn_text, fill=BLUE_DARK, font=fn_btn)

    home_indicator(img)
    img.save(os.path.join(OUT, "01-welcome.jpg"), "JPEG", quality=92)
    print("01-welcome.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 2: Login with legal links (the RuStore fix)
def screen_login():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Вход за 1 минуту", "Только по SMS")
    d = ImageDraw.Draw(img)

    # Content area
    y0 = 620
    # eyebrow
    d.text((96, y0), "ВХОД ПО ТЕЛЕФОНУ", fill=BLUE_MID, font=f(36, True))
    # title
    d.text((96, y0 + 70), "Введите номер", fill=TEXT_PRIMARY, font=f(82, True))
    d.text((96, y0 + 160), "телефона", fill=TEXT_PRIMARY, font=f(82, True))
    # lede
    d.text((96, y0 + 290), "Отправим SMS с кодом подтверждения", fill=TEXT_SECONDARY, font=f(40, False))

    # Input field
    inp_y = y0 + 400
    d.rounded_rectangle([96, inp_y, W - 96, inp_y + 130], radius=20, fill=GRAY, outline=(200, 210, 220), width=2)
    d.text((130, inp_y + 36), "+7 999 123 45 67", fill=TEXT_PRIMARY, font=f(56, False))

    # Primary button
    btn_y = inp_y + 200
    d.rounded_rectangle([96, btn_y, W - 96, btn_y + 130], radius=20, fill=BLUE_MID)
    btn = "Получить код"
    fn = f(56, True)
    bbox = d.textbbox((0, 0), btn, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, btn_y + 35), btn, fill=WHITE, font=fn)

    # Legal links section (the fix RuStore wanted)
    leg_y = btn_y + 230
    d.text((W / 2, leg_y), "", font=f(40))
    legal_intro = "Нажимая «Получить код», вы соглашаетесь"
    legal_intro2 = "с условиями использования сервиса."
    fl = f(36, False)
    for line in [legal_intro, legal_intro2]:
        bbox = d.textbbox((0, 0), line, font=fl)
        tw = bbox[2] - bbox[0]
        d.text((W / 2 - tw / 2, leg_y), line, fill=TEXT_SECONDARY, font=fl)
        leg_y += 50

    # 3 clickable links — underlined, blue
    leg_y += 30
    fll = f(40, True)
    for link in ["Пользовательское соглашение",
                 "Политика обработки персональных данных",
                 "Правила пользования сервисом"]:
        bbox = d.textbbox((0, 0), link, font=fll)
        tw = bbox[2] - bbox[0]
        d.text((W / 2 - tw / 2, leg_y), link, fill=BLUE_MID, font=fll)
        # underline
        d.line([W / 2 - tw / 2, leg_y + 52, W / 2 + tw / 2, leg_y + 52], fill=BLUE_MID, width=2)
        leg_y += 90

    home_indicator(img)
    img.save(os.path.join(OUT, "02-login.jpg"), "JPEG", quality=92)
    print("02-login.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 3: Airport selection
def screen_airports():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Выберите парковку", "Шереметьево")
    d = ImageDraw.Draw(img)

    y = 620
    # 2 cards (Шереметьево + Ночёвка)
    cards = [
        ("Парковка Шереметьево", "От 150 ₽ / сутки", "Бесплатный трансфер до терминалов B / C / D / F"),
        ("Ночёвка в Шереметьево", "От 500 ₽ / 6 часов", "Кровать, душ, Wi-Fi — отдохнуть перед рейсом"),
    ]
    for title, price, desc in cards:
        h = 480
        card(d, 80, y, W - 160, h, shadow=False)
        d.rounded_rectangle([80, y, W - 160, y + h], radius=32, fill=WHITE,
                            outline=(225, 230, 238), width=3)
        # icon bar
        d.rounded_rectangle([108, y + 36, 220, y + 148], radius=20, fill=BLUE_MID)
        paste_plane(img, 164, y + 92, 70, YELLOW + (255,))
        # title
        d.text((260, y + 50), title, fill=TEXT_PRIMARY, font=f(54, True))
        # price
        d.text((260, y + 130), price, fill=BLUE_MID, font=f(46, True))
        # divider
        d.line([108, y + 220, W - 188, y + 220], fill=(225, 230, 238), width=2)
        # desc
        words = desc.split(" ")
        line_w = ""
        ly = y + 250
        for w in words:
            test = (line_w + " " + w).strip()
            if d.textlength(test, font=f(38, False)) > W - 240:
                d.text((108, ly), line_w, fill=TEXT_SECONDARY, font=f(38, False))
                ly += 50
                line_w = w
            else:
                line_w = test
        if line_w:
            d.text((108, ly), line_w, fill=TEXT_SECONDARY, font=f(38, False))
        # CTA inside card
        cta_y = y + h - 130
        d.rounded_rectangle([108, cta_y, W - 188, cta_y + 90], radius=18, fill=YELLOW)
        btn = "Забронировать"
        bbox = d.textbbox((0, 0), btn, font=f(46, True))
        tw = bbox[2] - bbox[0]
        d.text((W / 2 - tw / 2, cta_y + 22), btn, fill=BLUE_DARK, font=f(46, True))

        y += h + 60

    home_indicator(img)
    img.save(os.path.join(OUT, "03-airports.jpg"), "JPEG", quality=92)
    print("03-airports.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 4: Booking dates & price
def screen_booking():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Бронируйте за минуту", "Без звонков")
    d = ImageDraw.Draw(img)

    y = 620
    # Section: airport
    d.text((96, y), "АЭРОПОРТ", fill=TEXT_SECONDARY, font=f(32, True))
    d.rounded_rectangle([96, y + 50, W - 96, y + 200], radius=24, fill=GRAY)
    paste_plane(img, 160, y + 125, 40, BLUE_MID + (255,))
    d.text((220, y + 96), "Шереметьево SVO", fill=TEXT_PRIMARY, font=f(56, True))

    y += 280
    # Section: dates
    d.text((96, y), "ДАТЫ", fill=TEXT_SECONDARY, font=f(32, True))
    d.rounded_rectangle([96, y + 50, (W - 192) / 2 + 96 - 10, y + 200], radius=24, fill=GRAY)
    d.text((130, y + 80), "Заезд", fill=TEXT_SECONDARY, font=f(34, False))
    d.text((130, y + 124), "12 декабря", fill=TEXT_PRIMARY, font=f(50, True))
    d.rounded_rectangle([(W - 192) / 2 + 96 + 10, y + 50, W - 96, y + 200], radius=24, fill=GRAY)
    d.text(((W - 192) / 2 + 130, y + 80), "Выезд", fill=TEXT_SECONDARY, font=f(34, False))
    d.text(((W - 192) / 2 + 130, y + 124), "19 декабря", fill=TEXT_PRIMARY, font=f(50, True))

    y += 280
    # Section: tariff
    d.text((96, y), "ТАРИФ", fill=TEXT_SECONDARY, font=f(32, True))
    options = [
        ("Эконом", "150 ₽/сут", True),
        ("Крытая", "250 ₽/сут", False),
        ("VIP под крышей", "350 ₽/сут", False),
    ]
    y += 60
    for name, price, active in options:
        bg = (255, 248, 200) if active else GRAY
        d.rounded_rectangle([96, y, W - 96, y + 140], radius=24, fill=bg,
                            outline=YELLOW if active else (220, 225, 232),
                            width=3 if active else 2)
        d.text((130, y + 30), name, fill=TEXT_PRIMARY, font=f(46, True))
        d.text((130, y + 82), price, fill=BLUE_MID, font=f(36, False))
        if active:
            # check mark
            d.ellipse([W - 200, y + 38, W - 140, y + 98], fill=YELLOW)
            d.text((W - 184, y + 46), "v", fill=WHITE, font=f(54, True))
        y += 165

    y += 30
    # Total
    d.rounded_rectangle([96, y, W - 96, y + 180], radius=24, fill=BLUE_DARK)
    d.text((130, y + 30), "Итого за 7 ночей", fill=GRAY, font=f(40, False))
    d.text((130, y + 80), "1 050 ₽", fill=YELLOW, font=f(80, True))

    # CTA
    btn_y = y + 230
    d.rounded_rectangle([96, btn_y, W - 96, btn_y + 130], radius=24, fill=YELLOW)
    btn = "Забронировать"
    fn = f(56, True)
    bbox = d.textbbox((0, 0), btn, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, btn_y + 35), btn, fill=BLUE_DARK, font=fn)

    home_indicator(img)
    img.save(os.path.join(OUT, "04-booking.jpg"), "JPEG", quality=92)
    print("04-booking.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 5: Booking confirmation
def screen_confirmed():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Бронь подтверждена", "Машина в безопасности")
    d = ImageDraw.Draw(img)

    # Success badge — circle + hand-drawn checkmark
    bx = W / 2
    by = 720
    d.ellipse([bx - 130, by - 130, bx + 130, by + 130], fill=SUCCESS)
    # Checkmark — two thick lines forming ✓
    cm = [(bx - 60, by + 5), (bx - 15, by + 55), (bx + 70, by - 50)]
    d.line([cm[0], cm[1]], fill=WHITE, width=16)
    d.line([cm[1], cm[2]], fill=WHITE, width=16)
    # Smooth ends
    for p in cm:
        d.ellipse([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8], fill=WHITE)

    # Title
    title = "Бронь №2026-3812"
    fn = f(64, True)
    bbox = d.textbbox((0, 0), title, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, by + 180), title, fill=TEXT_PRIMARY, font=fn)

    sub = "Парковка Шереметьево"
    fn = f(46, False)
    bbox = d.textbbox((0, 0), sub, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, by + 280), sub, fill=TEXT_SECONDARY, font=fn)

    # Details card
    cy = by + 400
    ch = 770
    d.rounded_rectangle([80, cy, W - 80, cy + ch], radius=32, fill=GRAY)
    fields = [
        ("Заезд", "12 декабря, 18:00"),
        ("Выезд", "19 декабря, 14:00"),
        ("Тариф", "Эконом, 7 ночей"),
        ("Авто", "BMW X5, А123БВ77"),
        ("Сумма", "1 050 ₽ — оплачено"),
    ]
    fy = cy + 50
    for i, (label, value) in enumerate(fields):
        d.text((120, fy), label, fill=TEXT_SECONDARY, font=f(36, False))
        d.text((120, fy + 56), value, fill=TEXT_PRIMARY, font=f(48, True))
        if i < len(fields) - 1:
            d.line([120, fy + 130, W - 200, fy + 130], fill=(225, 230, 238), width=2)
        fy += 144

    # Buttons
    bt_y = cy + ch + 50
    d.rounded_rectangle([96, bt_y, W - 96, bt_y + 130], radius=24, fill=BLUE_MID)
    btn = "Скачать пропуск"
    fn = f(50, True)
    bbox = d.textbbox((0, 0), btn, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, bt_y + 38), btn, fill=WHITE, font=fn)

    bt_y += 170
    d.rounded_rectangle([96, bt_y, W - 96, bt_y + 130], radius=24, fill=WHITE,
                        outline=BLUE_MID, width=3)
    btn = "Заказать трансфер"
    bbox = d.textbbox((0, 0), btn, font=fn)
    tw = bbox[2] - bbox[0]
    d.text((W / 2 - tw / 2, bt_y + 38), btn, fill=BLUE_MID, font=fn)

    home_indicator(img)
    img.save(os.path.join(OUT, "05-confirmed.jpg"), "JPEG", quality=92)
    print("05-confirmed.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 6: My bookings list
def screen_bookings():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Мои поездки", "Всё в одном месте")
    d = ImageDraw.Draw(img)

    bookings = [
        ("12 — 19 дек 2026", "Парковка Шереметьево", "Эконом • 1 050 ₽", "Активна", SUCCESS),
        ("3 — 5 ноя 2026", "Парковка Шереметьево", "Крытая • 500 ₽", "Завершена", TEXT_SECONDARY),
        ("18 — 22 сен 2026", "Ночёвка Шереметьево", "Стандарт • 2 000 ₽", "Завершена", TEXT_SECONDARY),
        ("4 — 11 авг 2026", "Парковка Шереметьево", "VIP • 2 450 ₽", "Завершена", TEXT_SECONDARY),
    ]
    y = 640
    for date, name, tariff, status, color in bookings:
        h = 330
        d.rounded_rectangle([80, y, W - 80, y + h], radius=28, fill=GRAY)
        # Status pill (top-right)
        sw = d.textlength(status, font=f(32, True))
        pill_x2 = W - 110
        pill_x1 = pill_x2 - sw - 50
        d.rounded_rectangle([pill_x1, y + 30, pill_x2, y + 90], radius=20, fill=color)
        d.text((pill_x1 + 25, y + 42), status, fill=WHITE, font=f(32, True))
        # Content
        d.text((120, y + 35), date, fill=TEXT_SECONDARY, font=f(34, False))
        d.text((120, y + 88), name, fill=TEXT_PRIMARY, font=f(50, True))
        d.text((120, y + 162), tariff, fill=BLUE_MID, font=f(38, False))
        # Action chevron — full width
        link_txt = "Подробнее"
        ltw = d.textlength(link_txt, font=f(36, True))
        link_x = W - 110 - ltw - 50
        d.text((link_x, y + 240), link_txt, fill=BLUE_MID, font=f(36, True))
        # Right arrow drawn manually
        ax = link_x + ltw + 20
        ay = y + 258
        d.polygon([(ax, ay - 12), (ax + 22, ay), (ax, ay + 12)], fill=BLUE_MID)
        d.line([ax - 16, ay, ax + 18, ay], fill=BLUE_MID, width=4)
        y += h + 35

    home_indicator(img)
    img.save(os.path.join(OUT, "06-bookings.jpg"), "JPEG", quality=92)
    print("06-bookings.jpg")


# ──────────────────────────────────────────────────────────────────
# SCREEN 7: Loyalty / profile
def screen_loyalty():
    img = Image.new("RGB", (W, H), WHITE)
    caption(img, "Лояльность", "Возвращаем до 10 %")
    d = ImageDraw.Draw(img)

    # Loyalty card
    cy = 640
    ch = 480
    grad_card = Image.new("RGB", (W - 160, ch), BLUE_MID)
    gcd = ImageDraw.Draw(grad_card)
    for yy in range(ch):
        t = yy / ch
        r = int(BLUE_MID[0] * (1 - t) + BLUE_DARK[0] * t)
        g = int(BLUE_MID[1] * (1 - t) + BLUE_DARK[1] * t)
        b = int(BLUE_MID[2] * (1 - t) + BLUE_DARK[2] * t)
        gcd.line([(0, yy), (W - 160, yy)], fill=(r, g, b))
    mask = Image.new("L", (W - 160, ch), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, W - 160, ch], radius=36, fill=255)
    img.paste(grad_card, (80, cy), mask)

    d.text((130, cy + 50), "ВАШ УРОВЕНЬ", fill=GRAY, font=f(36, True))
    d.text((130, cy + 110), "Золотой", fill=YELLOW, font=f(90, True))
    d.text((130, cy + 220), "Бонусов на счёте", fill=GRAY, font=f(36, False))
    d.text((130, cy + 280), "1 250 ₽", fill=WHITE, font=f(100, True))
    # Progress bar to next level
    d.text((130, cy + 410), "До платинового: 750 ₽", fill=GRAY, font=f(30, False))

    # Benefits
    by = cy + ch + 60
    d.text((96, by), "ВАШИ ПРИВИЛЕГИИ", fill=TEXT_SECONDARY, font=f(34, True))
    perks = [
        ("10 %", "возврата с каждой поездки"),
        ("Бесплатно", "увеличение брони до 24 часов"),
        ("Приоритет", "трансфер без ожидания"),
        ("Подарок", "1 ночёвка в год бесплатно"),
    ]
    py = by + 80
    for top, bot in perks:
        d.rounded_rectangle([80, py, W - 80, py + 160], radius=24, fill=GRAY)
        d.ellipse([110, py + 40, 200, py + 130], fill=YELLOW)
        d.text((230, py + 30), top, fill=BLUE_MID, font=f(52, True))
        d.text((230, py + 95), bot, fill=TEXT_PRIMARY, font=f(38, False))
        py += 200

    home_indicator(img)
    img.save(os.path.join(OUT, "07-loyalty.jpg"), "JPEG", quality=92)
    print("07-loyalty.jpg")


if __name__ == "__main__":
    screen_welcome()
    screen_login()
    screen_airports()
    screen_booking()
    screen_confirmed()
    screen_bookings()
    screen_loyalty()
    print(f"\n7 screenshots saved to: {OUT}")
