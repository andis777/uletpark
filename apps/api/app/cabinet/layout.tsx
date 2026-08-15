import type { ReactNode } from "react";
import { HEADER_HTML, FOOTER_HTML } from "./SiteChrome";

/**
 * Кабинет получает ту же шапку и подвал, что и uletnayaparkovka.ru/sheremetevo:
 * разметка взята с живой страницы (SiteChrome.ts), стили подключаются оттуда же.
 * Раньше кабинет был тупиком — из него нельзя было вернуться на сайт.
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
 * Тема вешает поведение в app.js, но он падает без модалок, которые лежат в теле
 * страницы сайта, а не в шапке. Поэтому — только бургер, ровно как в оригинале.
 */
const MENU_JS = `
(function(){
  var menu = document.querySelector('.header-menu');
  var open = document.querySelector('.mobile-menu-btn');
  var close = document.querySelector('.close-menu-li');
  if (!menu) return;
  if (open)  open.addEventListener('click',  function(){ menu.classList.add('active-menu'); });
  if (close) close.addEventListener('click', function(){ menu.classList.remove('active-menu'); });
  window.addEventListener('scroll', function(){ menu.classList.remove('active-menu'); });
})();
`;

// Кнопки модалок стали ссылками — возвращаем им вид кнопки. Плюс фон под содержимым
// кабинета: тема задаёт свой, а нам нужен светлый.
const FIXUP_CSS = `
a.callback-btn{display:inline-flex;align-items:center;justify-content:center;
  text-decoration:none;box-sizing:border-box;cursor:pointer}
a.callback-btn:hover{text-decoration:none}
.ulk-body{background:#f4f7f7;min-height:60vh}
.ulk-body h1,.ulk-body h2,.ulk-body p{margin:0}
`;

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {STYLES.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: FIXUP_CSS }} />

      <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
      <div className="ulk-body">{children}</div>
      <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />

      <script dangerouslySetInnerHTML={{ __html: MENU_JS }} />
    </>
  );
}
