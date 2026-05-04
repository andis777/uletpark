# App Store / Google Play — заполнение карточек приложения

## Apple App Store Connect

### Имя приложения (30 симв.)
```
Улётная парковка
```

### Subtitle (30 симв.)
```
Парковка у аэропортов Москвы
```

### Promotional text (170 симв.)
```
Парковка от 150 ₽ в сутки у Шереметьево, Домодедово и Внуково. Бесплатный трансфер 24/7, охрана, бонусные баллы за каждую бронь.
```

### Description (4000 симв., shown in App Store)
```
Бронируйте парковку у аэропортов Москвы прямо в приложении.

🛫 Три аэропорта в одном app
Шереметьево (SVO), Домодедово (DME), Внуково (VKO) — выбирайте удобную парковку и бронируйте за 30 секунд.

💰 От 150 ₽ в сутки
Самые низкие цены среди парковок с трансфером. Без скрытых платежей, фиксированная стоимость на любой срок — от 1 до 60+ дней.

🚐 Бесплатный трансфер 24/7
Машины комфорт-класса, время в пути 5-10 минут до любого терминала. Работаем круглосуточно, встречаем по прилёту в любое время.

🛡 Договор хранения
Заключаем юридический договор хранения с каждым клиентом — 100% гарантия сохранности автомобиля. Круглосуточная охрана, видеонаблюдение по периметру.

⭐ Программа лояльности
- Кешбэк 5% баллами с каждой брони
- Тиры Bronze / Silver / Gold с растущими привилегиями
- Реферальный код: 500 ₽ другу + 500 ₽ вам
- Списание баллов при следующей брони (1 балл = 1 ₽)

📱 Что вы получаете в приложении:
• Бронирование за 30 секунд
• История всех заказов с возможностью продлить или отменить
• Push-уведомления о статусе брони и готовности к выезду
• Карта лояльности с прогрессом до следующего тира
• Калькулятор стоимости в реальном времени
• Контакты колл-центра в один тап

🏢 О компании
«Улётная парковка» работает с 2016 года. Мы обслужили десятки тысяч клиентов и являемся одним из топ-5 операторов парковки у аэропортов Москвы (по версии vc.ru, DTF).

📞 Поддержка
+7 (909) 914-88-81 — Шереметьево
+7 (495) 796-39-74 — Домодедово
+7 (495) 999-52-74 — Внуково
24 часа в сутки, без выходных.

uletnayaparkovka.ru
```

### Keywords (100 симв., через запятую)
```
парковка,аэропорт,шереметьево,домодедово,внуково,трансфер,svo,dme,vko,стоянка,москва,авиа
```

### Support URL
```
https://uletnayaparkovka.ru/vopros-otvet
```

### Privacy Policy URL
```
https://uletnayaparkovka.ru/politika-konfidencialnosti
```

### Marketing URL
```
https://uletnayaparkovka.ru
```

### Category
- Primary: **Travel**
- Secondary: **Lifestyle**

### App Privacy (App Store Connect → App Privacy)

**Data Used to Track You:** None

**Data Linked to You:**
- Contact Info → Phone Number (для авторизации)
- Contact Info → Email (опционально)
- Identifiers → User ID (внутренний)
- Usage Data → Product Interaction (для нашей метрики, не передаётся третьим лицам)
- Diagnostics → Crash Data (Sentry)

**Data Not Linked to You:**
- Diagnostics → Performance Data (если включено)

В каждой категории — purpose: **App Functionality** + **Analytics**.

### Age Rating
**4+** (нет UGC, нет реклам, нет покупок in-app кроме функциональных)

---

## Google Play Console

### Title (50 симв.)
```
Улётная парковка — у аэропортов Москвы
```

### Short description (80 симв.)
```
Парковка от 150 ₽ у Шереметьево, Домодедово, Внуково. Трансфер 24/7. Кешбэк.
```

### Full description (4000 симв.)
*Скопировать description выше с минорными правками под ключевые слова Play Store*

### Tags / Categories
- App category: **Travel & Local**
- Tags: parking, airport, travel, transport

### Content rating
Заполнить через IARC questionnaire — должно получиться **Everyone / 3+**.

### Data safety
- Личные данные: телефон (обязательно), email (опционально)
- Использование: аутентификация, функциональность приложения
- Передача третьим лицам: Нет
- Шифрование при передаче: Да (HTTPS + JWT)
- Право удалить данные: Да (через колл-центр или письмом на uletnayaparkovka@gmail.com)

---

## Скриншоты (что подготовить дизайнеру)

### iPhone 6.9" (обязательно)
1. **Hero** — главный экран с калькулятором + надпись «От 150 ₽/сутки»
2. **Бронирование** — модал new booking с заполненной формой
3. **Список броней** — несколько карточек с разными статусами
4. **Лояльность** — карточка тира + реферальный код
5. **Детали брони** — статус, дата, кнопки продлить/отменить

### iPad 13" (опционально для iOS)
Те же 5, но в широком layout

### Android — phone screenshots (1080×1920+)
Те же 5

### Featured graphic (Google Play, 1024×500)
Брендированный баннер с логотипом + USP «От 150 ₽» + 3 иконки аэропортов

### App icon
- iOS: 1024×1024 PNG (без прозрачности, без скруглений — сторкорнерс автоматически)
- Android: adaptive icon — 432×432 foreground + 432×432 background

---

## Чек-лист перед отправкой в стор

- [ ] Bundle ID `ru.uletnayaparkovka.app` свободен / зарегистрирован в Apple Developer
- [ ] Apple Developer аккаунт активен ($99/год)
- [ ] Google Play Developer аккаунт активен ($25 разовый)
- [ ] Все скриншоты подготовлены
- [ ] Privacy Policy опубликована на uletnayaparkovka.ru/politika-konfidencialnosti
- [ ] Public-facing terms of use (если будут платежи)
- [ ] Demo-аккаунт для Apple Review (телефон + код доступа в формочке)
- [ ] Apple Sign In НЕ требуется (мы не используем third-party login)
- [ ] App тестировался на старом железе (iPhone 11, Android API 26)
- [ ] Push-уведомления работают (capability добавлен в Apple Developer Portal)
- [ ] Deep links на `uletnaya://` зарегистрированы в Universal Links
- [ ] Sentry DSN заведён в EAS env vars

---

## Как сабмитить через EAS

```bash
cd apps/mobile

# Build production
eas build --platform all --profile production

# После build — submit
eas submit --platform ios --latest
eas submit --platform android --latest
```

EAS Build делает CI на серверах Expo, не нужен локальный Xcode/Android Studio.
