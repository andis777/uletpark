/**
 * Config-plugin: объявляет видимость Я.Навигатора / Я.Карт для Android 11+ (API 30+).
 *
 * Начиная с Android 11, Linking.canOpenURL() возвращает false для внешних
 * схем, если они не перечислены в <queries> манифеста. Без этого кнопка
 * «Навигатор» всегда уходила бы в web-fallback. iOS-аналог —
 * LSApplicationQueriesSchemes в app.json (infoPlist).
 */
const { withAndroidManifest } = require("@expo/config-plugins");

const SCHEMES = ["yandexnavi", "yandexmaps"];

module.exports = function withYandexQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [];
    }

    // Один <queries> блок с intent-ами на каждую схему.
    const intents = SCHEMES.map((scheme) => ({
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      data: [{ $: { "android:scheme": scheme } }],
    }));

    manifest.queries.push({ intent: intents });

    return cfg;
  });
};
