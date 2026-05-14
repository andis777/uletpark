# Self-hosted GitHub Actions runner на 194.87.222.67

Переводим CI/CD с `ubuntu-latest` на собственный сервер. Эффект:

| | До (ubuntu-latest) | После (self-hosted) |
|---|---|---|
| Минуты Actions/месяц | сжигаем лимит | **0** |
| Время билда Docker | каждый раз с нуля | использует слоистый кэш |
| Запуск deploy от push до прода | ~80–120 сек | **~25–40 сек** |
| Точка отказа | GitHub + наш SSH | только наш сервер |

---

## Шаг 1 — установка runner'а на сервер (один раз)

### 1.1 Скопировать скрипт на сервер

С локалки:

```powershell
scp "G:\www2\Улетная парковка\mobile-platform\deploy\scripts\setup-self-hosted-runner.sh" root@194.87.222.67:/tmp/setup-runner.sh
```

Или прямо в SSH:

```bash
ssh root@194.87.222.67
curl -sL https://raw.githubusercontent.com/andis777/uletpark/main/deploy/scripts/setup-self-hosted-runner.sh \
  -o /tmp/setup-runner.sh
chmod +x /tmp/setup-runner.sh
```

### 1.2 Получить registration-token

В браузере открой:
```
https://github.com/andis777/uletpark/settings/actions/runners/new?arch=x64&os=linux
```

Скопируй токен из команды:
```
./config.sh --url https://github.com/... --token AABBCCDD...
                                                  ^^^^^^^^^ вот это
```

⚠️ Токен живёт **1 час** — не тяни.

### 1.3 Запустить установщик на сервере

```bash
sudo bash /tmp/setup-runner.sh AABBCCDD...
```

Скрипт:
- Установит curl/jq/docker
- Создаст user `github-runner`
- Поставит sudo NOPASSWD на `/usr/local/bin/uletnaya-deploy.sh`
- Скачает последний runner
- Зарегистрирует в репозитории с labels `self-hosted,prod,uletnaya,docker`
- Поставит systemd-сервис, запустит
- Создаст deploy-скрипт

### 1.4 Проверить

```bash
# На сервере
sudo systemctl status 'actions.runner.andis777-uletpark.*' --no-pager

# Или
sudo /opt/actions-runner/svc.sh status
```

В GitHub UI: https://github.com/andis777/uletpark/settings/actions/runners

Runner должен быть **Idle** (зелёный).

---

## Шаг 2 — миграция workflow (уже сделано в репо)

`.github/workflows/deploy.yml` уже использует:

```yaml
runs-on: [self-hosted, uletnaya]
```

После первого пуша на main — Actions автоматом возьмёт self-hosted runner вместо ubuntu-latest.

Старая ssh-version осталась как **`Deploy API (Fallback via SSH)`** workflow — запускается вручную через `gh workflow run` если runner лёг.

---

## Шаг 3 — cron-pull fallback (необязательно, но рекомендую)

Сервер сам себя пуллит каждые 2 минуты — даже если Actions полностью лежат.

```bash
ssh root@194.87.222.67

# Скопировать скрипт
sudo cp /opt/uletnaya/deploy/scripts/cron-pull.sh /usr/local/bin/uletnaya-cron-pull.sh
sudo chmod +x /usr/local/bin/uletnaya-cron-pull.sh
sudo touch /var/log/uletnaya-cron-pull.log

# Добавить в crontab
(sudo crontab -l 2>/dev/null | grep -v uletnaya-cron-pull; \
 echo "*/2 * * * * /usr/local/bin/uletnaya-cron-pull.sh") | sudo crontab -

# Проверить
sudo crontab -l | grep uletnaya
```

Логи: `tail -f /var/log/uletnaya-cron-pull.log`

---

## Диагностика

### Runner не подхватывает джобы
```bash
# На сервере
sudo systemctl restart 'actions.runner.andis777-uletpark.*'
sudo journalctl -u 'actions.runner.andis777-uletpark.*' -n 50
```

### Deploy скрипт падает
```bash
# Запустить руками
sudo /usr/local/bin/uletnaya-deploy.sh

# Логи последнего деплоя
sudo journalctl -t uletnaya-deploy -n 100 --no-pager
```

### Git pull не работает
Если `/opt/uletnaya` через HTTPS — проверь PAT/Deploy Key. Установщик подскажет если что-то не так.

Перейти на SSH:
```bash
sudo -u root ssh-keygen -t ed25519 -N "" -f /root/.ssh/github_deploy -C "uletnaya-deploy"
cat /root/.ssh/github_deploy.pub
# Добавить в https://github.com/andis777/uletpark/settings/keys

cd /opt/uletnaya
sudo git remote set-url origin git@github.com:andis777/uletpark.git
sudo ssh -T git@github.com
```

---

## Откат (если что-то сломается)

В Settings → Actions → Runners → нажать на runner → **Remove**

В deploy.yml вернуть `runs-on: ubuntu-latest` и использовать ssh-action как раньше:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          ...
```

Или просто триггерить `Deploy API (Fallback via SSH)` вручную:
```powershell
gh workflow run "Deploy API (Fallback via SSH)" -R andis777/uletpark
```

---

## Безопасность

✅ Runner работает от `github-runner`, не root
✅ sudo NOPASSWD только на `/usr/local/bin/uletnaya-deploy.sh` и docker
✅ Workflows только из приватного репо (нет fork PR)
✅ Старый SSH-ключ Actions можно отозвать после миграции (но я бы оставил как backup)

---

## Что дальше

После успешной миграции:
- Удалить `DEPLOY_SSH_KEY` secret? **Нет** — оставить для fallback-workflow
- Поставить второй runner на тот же сервер для параллельных билдов? Запустить `./config.sh` ещё раз с `--name uletnaya-2`
- Перенести `Deploy WWW`/`Harden Server`/`Add User SSH Key` на self-hosted? **Не нужно** — они редко используются, ubuntu-latest норм
