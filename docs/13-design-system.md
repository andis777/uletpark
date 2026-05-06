# Design System — Улётная Mobile

Синхронизация бренда сайта uletnayaparkovka.ru с мобильным приложением.

---

## 1. Принципы

| Принцип | Что значит |
|---|---|
| **Графит сверху, светло снизу** | Каждый экран начинается тёмной шапкой `#2D3039`, тело — белое `#FFFFFF` |
| **Бирюза = действие** | `#3FB8AF` для CTA, активных вкладок, ссылок. Только так — ни заголовки, ни текст |
| **8pt grid** | Все отступы кратны 4: `spacing.xs..huge` |
| **Радиусы — мягкие** | Карточки 16, инпуты 12, капсулы 100. Никаких квадратов |
| **Тени — нежные** | На white surface едва заметные. Только на floating элементах (tab bar) — глубже |
| **Цифры выделены** | Баллы / цена / даты крупнее обычного, через `typography.numLg/numXl` (Manrope 200) |

---

## 2. Tokens (`apps/mobile/lib/theme.ts`)

### Цвета
```
Brand:    primary #3FB8AF · primaryDark #1A9A8E · primarySoft (12% alpha)
Surface:  graphite #2D3039 · surface #FFF · surfaceMuted #F4F5F7 · paper #F6F4F0
Text:     textPrimary #0A0B0D · textSecondary #5A6072 · textMuted #8A8FA0
States:   success / warning / danger / info — каждый с _Bg парой
Misc:     warmCta #FF6B4A · divider · border · shadow / shadowSoft
```

### Типографика
```
displayLg/Md/Sm   — для hero (Manrope 300)
h1/h2/h3          — заголовки разделов (Manrope 600)
bodyLg/Md/Sm      — текст (Inter 400)
label / caption   — лейблы (Inter 600/500)
overline          — раздел caps (Inter 700, letterSpacing 1.5)
numXl / numLg     — цифры (Manrope 200/300, hero / KPI)
```

### Spacing
```
xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48 · huge 64
```

### Radii
```
sm 8 · md 12 · lg 16 · xl 20 · xxl 28 · pill 100 · full 9999
```

### Shadows
```
none · card (subtle) · cardHover · floatingBar (deep) · primaryGlow (teal halo)
```

---

## 3. Components (`apps/mobile/components/`)

| Компонент | Использование |
|---|---|
| `<TabBar />` | Кастомный floating tab bar — анимированная активная капсула, тень снизу |
| `<Card variant="..." padding="..." onPress={...} />` | Унифицированная карточка: `default/muted/outlined/elevated/filled` |
| `<Pill label="..." tone="..." size="..." />` | Капсула-статус — `primary/success/warning/danger/muted/info`, `sm/md` |
| `<SectionHeader title="..." action={{...}} />` | Заголовок раздела с опциональной ссылкой справа |
| `<EmptyState icon="..." title="..." description="..." action={...} />` | Пустое состояние — иконка в кружке + заголовок + описание |
| `<ScreenHeader title eyebrow back rightAction />` | Графитовая шапка экрана со стрелкой "назад" |
| `<Button label onPress variant loading disabled />` | Кнопка `primary/secondary/danger` (был с MVP) |

---

## 4. Tab Bar — современный паттерн

**Floating + animated active pill** (а не классическая прижатая снизу полоса):

```
        ╭──────────────────────────╮
        │  ⌂      ▤      ★      ◐  │     ← floating bar
        │ Главная Брони Карта Профиль │       (с тенью внизу)
        ╰──────────────────────────╯

      где Главная — обведена бирюзовой капсулой
      и иконка/лейбл становятся белыми
```

Технически:
- `Animated.spring` на scale активной иконки (1.0 → 1.05)
- `Animated.timing` opacity бирюзовой капсулы (0 → 1, 200ms)
- `useSafeAreaInsets()` для iPhone home indicator
- Только 4 таба, без overflow (если будет 5+ — нужен scroll или dropdown)

Все экраны теперь имеют `paddingBottom: 100` чтобы контент не уходил под bar.

---

## 5. Паттерн экрана

```
┌───────────────────────────────┐  ScreenHeader (graphite)
│  ←   ✈ УЛЁТНАЯ      [правый]   │   • back arrow + label
│      Заголовок страницы        │   • eyebrow OVERLINE
│                                │   • h1 title (Manrope 300)
└───────────────────────────────┘
┌───────────────────────────────┐
│   Hero card (опционально)     │   • выходит поверх header'а
│   с margin-top: -36px         │     через отрицательный margin
└───────────────────────────────┘
                                    SectionHeader
   ОВЕРЛАЙН ЗАГОЛОВОК       Все →

   ┌─────────────────────────┐
   │  Card variant="elevated"│
   │  card content...        │
   └─────────────────────────┘
                                    paddingBottom: 100
```

---

## 6. Цветовая воронка использования

```
graphite ──── header / dark surfaces / contrast text
   │
   ▼
white ──────── основной фон body
   │
   ▼
surfaceMuted ─ карточки на белом, inputs (subtle)
   │
   ▼
divider ────── разделители (1px)

────────────────────────────────────
primary ───── CTA buttons / active states / accent lines
   │
   ▼
primarySoft ─ active tab pill / hover на teal элементах

────────────────────────────────────
success/warning/danger ─ только статусы (Pill), не CTA
warmCta ──── редкие особые акценты (опц., как референс)
```

**Не делать:** оранжевый/красный для обычной кнопки, бирюзовый для текста, графитовый для иконки на белом фоне.

---

## 7. Motion

Только в трёх местах:
1. **Tab bar** — переключение активного таба (200ms timing + spring)
2. **Card press** — `activeOpacity={0.85}` (мягкая обратная связь)
3. **Списки** — на больших экранах можно добавить `LayoutAnimation` при появлении (TODO)

Анимаций «ради анимаций» нет. Если что-то двигается — это передача состояния пользователю.

---

## 8. Иконки

Сейчас — emoji-fallback (`⌂ ▤ ★ ◐ ✈ 🅿️ 🛏️`). Это работает на web и native, **не требует библиотек**.

Для production native — рекомендация: установить `@expo/vector-icons` (Feather или Ionicons line-style) и заменить emoji на `<Feather name="home" />`. Но это уже Phase 2 — текущий emoji-set даёт 90% эффекта.

---

## 9. Что менять при следующих итерациях дизайна

- **Манипуляции на native**: добавить `react-native-reanimated` для skeleton-loaders, parallax, sheet-transitions
- **Иконки**: переход на vector — выше визуальный consistency
- **Anti-flicker**: на web `<View style={{ contain: "layout" }}>` для loyalty card
- **Skeleton states** вместо просто `ActivityIndicator` на bookings/loyalty
- **Pull-to-refresh** на главной (уже есть на bookings)
- **Haptics** на native — `expo-haptics` при tab switch / booking submit
- **Dark mode** — все токены готовы в шине (нужна лишь темная палитра графита и инверсия text)

---

## 10. Файлы

```
apps/mobile/
├── lib/theme.ts                  ← все токены: colors, typography, spacing, radii, shadows, motion, zIndex
├── components/
│   ├── TabBar.tsx                ← кастомный floating tab bar
│   ├── Button.tsx                ← кнопка (primary/secondary/danger)
│   ├── Card.tsx                  ← карточка (default/muted/outlined/elevated/filled)
│   ├── Pill.tsx                  ← капсула (primary/success/warning/danger/muted/info)
│   ├── SectionHeader.tsx         ← заголовок раздела + action link
│   ├── EmptyState.tsx            ← пустое состояние
│   └── ScreenHeader.tsx          ← графитовая шапка экрана
└── app/                          ← экраны используют только компоненты + токены, не raw цвета
```

Если нужно добавить новый цвет/радиус/spacing — **только через `theme.ts`**. Никакого hard-coded `#3FB8AF` в JSX.
