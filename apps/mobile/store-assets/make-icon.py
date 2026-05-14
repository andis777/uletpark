"""Generate branded app icon 1024x1024 + adaptive Android variants.

Дизайн: классическая «P» — универсальный знак парковки.
Маленький самолёт сверху-слева как намёк на аэропорт.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
STORE_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(STORE_DIR, exist_ok=True)

SIZE = 1024

BLUE_DARK = (15, 36, 64)
BLUE_MID = (31, 85, 127)
BLUE_LIGHT = (51, 130, 184)
YELLOW = (255, 210, 0)
WHITE = (255, 255, 255)

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_BLACK = "C:/Windows/Fonts/ariblk.ttf"  # Arial Black — heavier

# Fallback to bold if Black not available
if not os.path.exists(FONT_BLACK):
    FONT_BLACK = FONT_BOLD


def gradient_bg(size, c1, c2):
    img = Image.new("RGB", (size, size), c1)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def airplane_horizontal(draw, cx, cy, scale, color):
    """Маленький самолёт, летящий горизонтально вправо."""
    s = scale
    # Корпус (вытянутый овал)
    draw.polygon([
        (cx - 10 * s, cy),
        (cx - 8 * s, cy - 1.5 * s),
        (cx + 6 * s, cy - 1.5 * s),
        (cx + 10 * s, cy),
        (cx + 6 * s, cy + 1.5 * s),
        (cx - 8 * s, cy + 1.5 * s),
    ], fill=color)
    # Крылья (треугольник снизу)
    draw.polygon([
        (cx - 3 * s, cy + 1.4 * s),
        (cx + 3 * s, cy + 1.4 * s),
        (cx - 1 * s, cy + 5 * s),
        (cx - 6 * s, cy + 5 * s),
    ], fill=color)
    # Хвостовое оперение
    draw.polygon([
        (cx - 8 * s, cy - 1.4 * s),
        (cx - 5 * s, cy - 1.4 * s),
        (cx - 8 * s, cy - 5 * s),
    ], fill=color)


def draw_icon(size):
    """Иконка: синий градиент + большая жёлтая P + самолётик."""
    img = gradient_bg(size, BLUE_MID, BLUE_DARK)

    # Мягкое свечение сверху
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([-size * 0.2, -size * 0.2, size * 0.6, size * 0.6], fill=(80, 140, 200, 60))
    overlay = overlay.filter(ImageFilter.GaussianBlur(size * 0.12))
    img.paste(overlay, (0, 0), overlay)

    d = ImageDraw.Draw(img)
    cx = size / 2
    cy = size * 0.52

    # Жёлтый круг-фон под P
    circle_r = int(size * 0.36)
    d.ellipse([cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r], fill=YELLOW)

    # Большая буква P в центре круга
    font_p = ImageFont.truetype(FONT_BLACK, int(size * 0.62))
    text = "P"
    bbox = d.textbbox((0, 0), text, font=font_p)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    # textbbox имеет offset — центрируем точнее
    offset_x = bbox[0]
    offset_y = bbox[1]
    d.text((cx - tw / 2 - offset_x, cy - th / 2 - offset_y), text, fill=BLUE_DARK, font=font_p)

    # Маленький самолёт в правом верхнем углу — намёк на аэропорт
    plane_cx = size * 0.82
    plane_cy = size * 0.18
    plane_scale = size / 150
    airplane_horizontal(d, plane_cx, plane_cy, plane_scale, WHITE)

    # Тонкая жёлтая полоса внизу — брендовый акцент
    bar_h = max(6, int(size * 0.014))
    bar_w = size * 0.42
    d.rounded_rectangle([
        cx - bar_w / 2, size * 0.93,
        cx + bar_w / 2, size * 0.93 + bar_h,
    ], radius=bar_h // 2, fill=YELLOW)

    return img


def apply_round_corners(img, radius_ratio=0.22):
    mask = Image.new("L", (img.width, img.width), 0)
    md = ImageDraw.Draw(mask)
    r = int(img.width * radius_ratio)
    md.rounded_rectangle([0, 0, img.width, img.width], radius=r, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


# 1. Main icon 1024x1024
icon = draw_icon(SIZE)
icon.save(os.path.join(OUT_DIR, "icon.png"), "PNG")
icon.save(os.path.join(STORE_DIR, "icon-1024.png"), "PNG")
print("icon.png (1024) saved")

# 2. Icon 512x512 (for stores that ask for it)
icon.resize((512, 512), Image.LANCZOS).save(os.path.join(STORE_DIR, "icon-512.png"), "PNG")
print("icon-512.png saved")

# 3. Android adaptive icon foreground (inner 66% safe area on transparent canvas)
adaptive_fg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
inner = draw_icon(int(SIZE * 0.66))
off = (SIZE - inner.width) // 2
adaptive_fg.paste(inner.convert("RGBA"), (off, off))
adaptive_fg.save(os.path.join(OUT_DIR, "adaptive-icon.png"), "PNG")
print("adaptive-icon.png saved")

# 4. Splash centered logo
splash = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
splash_inner = draw_icon(int(SIZE * 0.5))
sp_off = (SIZE - splash_inner.width) // 2
splash.paste(splash_inner.convert("RGBA"), (sp_off, sp_off))
splash.save(os.path.join(OUT_DIR, "splash-icon.png"), "PNG")
print("splash-icon.png saved")

# 5. Rounded preview (как выглядит на устройстве)
preview = apply_round_corners(icon.convert("RGBA"), radius_ratio=0.22)
preview.save(os.path.join(STORE_DIR, "icon-1024-rounded-preview.png"), "PNG")
print("icon-1024-rounded-preview.png saved")

print(f"\nIcons -> {OUT_DIR}")
print(f"Store-ready -> {STORE_DIR}")
