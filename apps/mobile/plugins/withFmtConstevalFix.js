/**
 * Config-plugin: чинит ошибку компиляции `fmt` на Xcode 26.
 *
 * Clang в Xcode 26 строже к `consteval`, из-за чего FMT_STRING-макросы в
 * библиотеке `fmt` (внутри React Native 0.76) не компилируются из исходников:
 *   "call to consteval function ... is not a constant expression".
 *
 * Решение (рекомендованное сообществом RN): собирать ТОЛЬКО под `fmt` по
 * стандарту C++17 — там consteval-ветка отключена (нужен C++20 `__cpp_consteval`),
 * и `fmt` падает обратно на runtime-валидацию строк формата. Остальные поды
 * остаются на C++20.
 *
 * Apple требует сборку на Xcode 26 SDK, поэтому откатить Xcode назад нельзя —
 * патчим Podfile.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "fmt consteval fix (Xcode 26)";
const SNIPPET = `
    # ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");

      if (contents.includes(MARKER)) return cfg; // идемпотентность

      if (!contents.includes("post_install do |installer|")) {
        throw new Error(
          "[withFmtConstevalFix] не найден блок `post_install do |installer|` в Podfile"
        );
      }

      contents = contents.replace(
        "post_install do |installer|\n",
        "post_install do |installer|\n" + SNIPPET
      );
      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
