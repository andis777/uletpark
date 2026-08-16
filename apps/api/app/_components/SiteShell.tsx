import type { ReactNode } from "react";
import { HEADER_HTML, FOOTER_HTML, COMPACT_CSS } from "./SiteChrome";

/**
 * Шапка и подвал uletnayaparkovka.ru вокруг страниц, которые живут на api-домене
 * (кабинет, партнёрам). Разметка снята с живой страницы — см. SiteChrome.ts.
 * Без этого страницы выглядели чужим сайтом и были тупиком: уйти было некуда.
 */
const SITE = "https://uletnayaparkovka.ru";
const THEME = `${SITE}/wp-content/themes/air1`;

// Только то, что нужно шапке и подвалу. Плагины (карусели, лайтбоксы, CF7) не тянем.
const STYLES = [
  `${THEME}/assets/css/bootstrap.min.css`,
  `${THEME}/assets/css/style.css?v=35`,
  `${THEME}/assets/css/font-awesome.min.css`,
  `${THEME}/page/assets/css/main.css?ver=6.5.8`,
  `${THEME}/page/assets/css/style.css?ver=6.5.8`,
];

/**
 * Тема вешает поведение в app.js, но он падает без модалок: они лежат в теле
 * страницы сайта, а не в шапке. Поэтому повторяем только нужное — бургер,
 * как в оригинале, и осмысленное действие для кнопок, которые открывали модалки.
 */
const MENU_JS = `
(function(){
  var menu = document.querySelector('.header-menu');
  if (menu) {
    var open = document.querySelector('.mobile-menu-btn');
    var close = document.querySelector('.close-menu-li');
    if (open)  open.addEventListener('click',  function(){ menu.classList.add('active-menu'); });
    if (close) close.addEventListener('click', function(){ menu.classList.remove('active-menu'); });
    window.addEventListener('scroll', function(){ menu.classList.remove('active-menu'); });
  }
  // Модалок тут нет — ведём туда, куда человек и хотел попасть.
  function go(sel, url){
    document.querySelectorAll(sel).forEach(function(b){
      b.addEventListener('click', function(){ window.location.href = url; });
    });
  }
  go('.callback-btn.check_bron', '/cabinet');
  go('.callback-btn.questions', 'tel:+79099148881');
  go('.callback-btn:not(.questions):not(.check_bron):not(.mobile-menu-btn)', 'tel:+79099148881');
})();
`;

// Фон под содержимым: тема задаёт свой, а нам нужен светлый.
const FIXUP_CSS = `
.ulk-body{background:#f4f7f7;min-height:60vh}
.ulk-body h1,.ulk-body h2,.ulk-body p{margin:0}
`;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      {STYLES.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: COMPACT_CSS + FIXUP_CSS }} />

      <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
      <div className="ulk-body">{children}</div>
      <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />

      <script dangerouslySetInnerHTML={{ __html: MENU_JS }} />
    </>
  );
}
