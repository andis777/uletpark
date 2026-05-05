# Деплой через GitHub Actions — пошаговая инструкция

После настройки `git push origin main` автоматически:
1. SSH-конится в `/opt/uletnaya` на сервере
2. `git pull` свежего кода
3. `docker compose build api`
4. `docker compose up -d api`
5. Healthcheck `/api/health`
6. Telegram-уведомление (если настроен бот)

---

## Шаг 1. Создай приватный репозиторий на GitHub

1. Зайди на github.com → справа сверху **+** → **New repository**
2. **Repository name:** `uletnaya-platform` (или другое имя)
3. **Visibility:** Private (там секреты)
4. **НЕ инициализируй** README/gitignore/license — у нас уже всё есть
5. Жми «Create repository»

GitHub покажет команды для существующего репо — нам нужны вторые два:

```bash
git remote add origin git@github.com:ВАШ_USERNAME/uletnaya-platform.git
git branch -M main
git push -u origin main
```

---

## Шаг 2. Добавь публичный ключ как Deploy Key репозитория

В репозитории на GitHub:
**Settings → Deploy keys → Add deploy key**

| Поле | Значение |
|---|---|
| **Title** | `uletnaya-server` |
| **Key** | публичный ключ из файла `_deploy_tmp/DEPLOY_KEY_PRIVATE.txt` (последняя строка, начинается с `ssh-ed25519`) |
| **Allow write access** | ❌ не нужно (read-only хватит) |

Это даст серверу право `git pull` из приватного репо.

---

## Шаг 3. Добавь GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

Создать **5 секретов**:

| Имя | Значение | Откуда брать |
|---|---|---|
| `DEPLOY_HOST` | `194.87.222.67` | IP сервера |
| `DEPLOY_USER` | `root` | (или другой пользователь) |
| `DEPLOY_PORT` | `22` | |
| `DEPLOY_SSH_KEY` | **приватный ключ целиком** | из `_deploy_tmp/DEPLOY_KEY_PRIVATE.txt` (включая строки `-----BEGIN/END`) |
| `TELEGRAM_BOT_TOKEN` | (опц.) | для уведомлений о деплое |
| `TELEGRAM_CHAT_ID` | (опц.) | твой chat ID |

⚠ В `DEPLOY_SSH_KEY` копируй **весь блок** включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----` со всеми переносами строк.

---

## Шаг 4. Привяжи git репо на сервере к GitHub

Один раз. SSH на сервер:

```bash
ssh root@194.87.222.67

cd /opt/uletnaya

# 1. Проверь что deploy-key подхватывается:
ssh -T -i ~/.ssh/uletnaya_deploy git@github.com
# Должно ответить: Hi ВАШ_USERNAME/uletnaya-platform! You've successfully authenticated, but GitHub does not provide shell access.

# 2. Настрой git remote через SSH с этим ключом:
cat > ~/.ssh/config << 'EOF'
Host github-uletnaya
  HostName github.com
  User git
  IdentityFile ~/.ssh/uletnaya_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

git remote add origin git@github-uletnaya:ВАШ_USERNAME/uletnaya-platform.git
# (либо если remote уже есть: git remote set-url origin git@github-uletnaya:...)

# 3. Тестовый pull
git fetch origin
git reset --hard origin/main
ls -la
```

---

## Шаг 5. Запушь репозиторий с локальной машины

С твоей рабочей машины (Windows / Git Bash):

```bash
cd "G:/www2/Улетная парковка/mobile-platform"

# Если у тебя GitHub аккаунт настроен через SSH:
git remote add origin git@github.com:ВАШ_USERNAME/uletnaya-platform.git
git push -u origin main

# Если используешь HTTPS + Personal Access Token:
git remote add origin https://github.com/ВАШ_USERNAME/uletnaya-platform.git
git push -u origin main
# (запросит логин и password — pasti токен из github.com/settings/tokens)
```

---

## Шаг 6. Запусти первый авто-деплой

После пуша:

1. Открой репо на GitHub → вкладка **Actions**
2. Должен увидеть запущенный workflow «Deploy API»
3. Через 1-2 минуты — зелёная галочка
4. Проверка: `curl http://127.0.0.1:7982/api/health` (на сервере) должен вернуть `{"ok":true}`

Если упал — клик по job → читай логи. Самые частые причины:
- **`Permission denied (publickey)`** — приватный ключ скопирован не полностью / лишние пробелы в `DEPLOY_SSH_KEY` секрете
- **`fatal: not a git repository`** — на сервере не выполнен Шаг 4
- **`docker: command not found`** — пользователь не root и не в группе docker

---

## Альтернатива: ручной trigger

В UI GitHub Actions можно запустить workflow без push:

1. Actions → Deploy API → **Run workflow** → Branch: main → **Run workflow**

Удобно для:
- Перезапустить контейнер после ручных правок `.env.production`
- Развернуть после длительной паузы

---

## Что происходит при изменении схемы БД

Если редактируешь `packages/db/schema.ts` — **второй workflow** (`migrate.yml`) сам запустит `drizzle-kit push --force` через одноразовый node-контейнер. Безопасен для аддитивных изменений (новые таблицы/колонки). Для дроп-колонок и переименований — лучше делать миграции через `drizzle-kit generate` + ручной merge.

---

## Удаление deploy-key

Если деплой больше не нужен или ключ утёк:

```bash
# На сервере
sed -i '/uletnaya-github-deploy/d' ~/.ssh/authorized_keys
rm ~/.ssh/uletnaya_deploy*

# В GitHub
Settings → Deploy keys → удалить "uletnaya-server"
Settings → Secrets → удалить DEPLOY_SSH_KEY
```

---

## Чек-лист первого пуша

- [ ] Репозиторий создан в GitHub (private)
- [ ] Public key добавлен как Deploy key
- [ ] 5 секретов добавлены (DEPLOY_HOST, DEPLOY_USER, DEPLOY_PORT, DEPLOY_SSH_KEY + опц. Telegram)
- [ ] На сервере: `~/.ssh/config` создан, `git remote set-url origin git@github-uletnaya:...` выполнен
- [ ] `ssh -T -i ~/.ssh/uletnaya_deploy git@github.com` → успешно
- [ ] Локально `git push -u origin main` прошёл
- [ ] GitHub Actions → Deploy API → зелёный
- [ ] `curl http://127.0.0.1:7982/api/health` отвечает `{"ok":true}`
