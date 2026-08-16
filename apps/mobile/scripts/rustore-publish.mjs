#!/usr/bin/env node
/**
 * Публикация APK в RuStore. EAS submit туда не умеет — только App Store и Google Play.
 *
 * Зачем: RuStore — основной канал Android в России, а там до сих пор 1.1.1,
 * хотя 1.2.x собрана давно.
 *
 * Ключи берём из окружения (в репозиторий не кладём):
 *   RUSTORE_KEY_ID       — идентификатор ключа из консоли RuStore
 *   RUSTORE_PRIVATE_KEY  — приватный RSA-ключ в base64 (одной строкой, оттуда же)
 *
 * Запуск:
 *   node scripts/rustore-publish.mjs ./app.apk
 *   node scripts/rustore-publish.mjs ./app.apk --priority 3   # ускоренная модерация 0..5
 *   node scripts/rustore-publish.mjs ./app.apk --dry-run      # только авторизация
 *
 * Последовательность (проверена по документации RuStore, не по памяти):
 *   1. POST /public/auth                                        → JWE-токен, живёт 900 с
 *   2. POST /public/v1/application/{pkg}/version                → versionId черновика
 *   3. POST /public/v1/application/{pkg}/version/{id}/apk       → загрузка файла
 *   4. POST /public/v1/application/{pkg}/version/{id}/commit    → отправка на модерацию
 */

import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import { basename } from "node:path";

const HOST = "https://public-api.rustore.ru";
const PACKAGE = "ru.uletnayaparkovka.app";

const args = process.argv.slice(2);
const apkPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const priority = Number(args[args.indexOf("--priority") + 1]) || 0;

if (!apkPath && !dryRun) {
  console.error("Укажите путь к APK: node scripts/rustore-publish.mjs ./app.apk");
  process.exit(1);
}

const KEY_ID = process.env.RUSTORE_KEY_ID;
const PRIVATE_KEY = process.env.RUSTORE_PRIVATE_KEY;
if (!KEY_ID || !PRIVATE_KEY) {
  console.error(
    "Нет ключей. Возьмите их в консоли RuStore (Настройки → Ключи доступа) и задайте:\n" +
      "  RUSTORE_KEY_ID=...\n  RUSTORE_PRIVATE_KEY=<приватный ключ в base64>"
  );
  process.exit(1);
}

/** Приводим base64-ключ из консоли к PEM, который понимает node:crypto. */
function toPem(b64) {
  const clean = b64.replace(/\s+/g, "");
  if (clean.includes("BEGIN")) return b64; // уже PEM
  const body = clean.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
}

/** Подпись: SHA512withRSA по строке (keyId + timestamp), результат в base64. */
function sign(keyId, timestamp) {
  const s = createSign("RSA-SHA512");
  s.update(keyId + timestamp);
  s.end();
  return s.sign(toPem(PRIVATE_KEY), "base64");
}

async function call(path, { method = "POST", token, body, headers = {} } = {}) {
  const res = await fetch(HOST + path, {
    method,
    headers: { ...(token ? { "Public-Token": token } : {}), ...headers },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path}: не JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.code === "error") {
    throw new Error(`${path}: ${json.message ?? `HTTP ${res.status}`}`);
  }
  return json;
}

async function main() {
  // Подпись живёт минуту — берём время прямо перед запросом.
  const timestamp = new Date().toISOString();
  const auth = await call("/public/auth", {
    body: JSON.stringify({ keyId: KEY_ID, timestamp, signature: sign(KEY_ID, timestamp) }),
    headers: { "Content-Type": "application/json" },
  });
  const token = auth.body?.jwe ?? auth.jwe;
  if (!token) throw new Error("токен не пришёл: " + JSON.stringify(auth).slice(0, 200));
  console.log("✓ авторизация, токен получен");

  if (dryRun) {
    console.log("--dry-run: дальше не идём");
    return;
  }

  const apk = await readFile(apkPath);
  console.log(`  файл: ${basename(apkPath)}, ${(apk.length / 1048576).toFixed(1)} МБ`);

  // Черновик у приложения может быть только ОДИН. Если предыдущий висит
  // незавершённым, RuStore ответит ошибкой — его надо снять в консоли.
  const draft = await call(`/public/v1/application/${PACKAGE}/version`, {
    token,
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
  });
  const versionId = draft.body?.versionId ?? draft.body;
  console.log("✓ черновик создан, versionId =", versionId);

  const form = new FormData();
  form.append("file", new Blob([apk]), basename(apkPath));
  await call(`/public/v1/application/${PACKAGE}/version/${versionId}/apk?isMainApk=true`, {
    token,
    body: form,
  });
  console.log("✓ APK загружен");

  await call(
    `/public/v1/application/${PACKAGE}/version/${versionId}/commit?priorityUpdate=${priority}`,
    { token }
  );
  console.log("✓ отправлено на модерацию. Статус — в консоли RuStore.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
