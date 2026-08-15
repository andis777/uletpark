import type { ReactNode } from "react";
import { getClientFromCookie } from "@/lib/cabinet-auth";
import { LogoutButton } from "./LogoutButton";

/**
 * Общая шапка и подвал для кабинета.
 * Кабинет живёт на другом домене (api.…), поэтому все ссылки на сайт — абсолютные.
 * Без этого кабинет был тупиком: войдя, человек не мог вернуться на сайт.
 */
const SITE = "https://uletnayaparkovka.ru";

const NAV: [string, string][] = [
  ["Главная", "/"],
  ["Парковка с трансфером", "/transfer"],
  ["Улётная ночёвка", "/uletnaya-nochevka"],
  ["Оплата парковки", "/oplata"],
  ["Схема проезда", "/sxema-proezda"],
  ["Наши парковки", "/foto-parkinga"],
  ["О нас", "/o-nas"],
];

const FOOT_LINKS: [string, string][] = [
  ["Публичная оферта", "/publichnaya-oferta"],
  ["Политика обработки данных", "/politika-obrabotki-personalnyx-dannyx"],
  ["Политика конфиденциальности", "/politika-konfidencialnosti"],
  ["Вопрос-ответ", "/vopros-otvet"],
  ["Отзывы", "/otzyvy"],
  ["СМИ о нас", "/smi-o-nas"],
];

const CSS = `
.ulk-shell{min-height:100vh;display:flex;flex-direction:column;background:#f4f7f7;
  font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#14303f}
.ulk-head{background:#0f3b5d;color:#fff}
.ulk-head-in{max-width:1180px;margin:0 auto;padding:14px 16px;display:flex;
  align-items:center;gap:16px;flex-wrap:wrap}
.ulk-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;margin-right:auto}
.ulk-mark{width:36px;height:36px;border-radius:50%;border:2px solid #3FB8AF;display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#3FB8AF;flex:none}
.ulk-brand-t{font-size:15px;font-weight:800;letter-spacing:.5px;line-height:1.1}
.ulk-brand-s{font-size:11px;color:#bfd6e4;margin-top:2px}
.ulk-nav{display:flex;gap:18px;flex-wrap:wrap}
.ulk-nav a{color:#dbe8f0;text-decoration:none;font-size:13.5px;white-space:nowrap}
.ulk-nav a:hover{color:#fff;text-decoration:underline}
.ulk-right{display:flex;align-items:center;gap:12px}
.ulk-phone{color:#fff;font-weight:700;font-size:14.5px;text-decoration:none;white-space:nowrap}
.ulk-main{flex:1}
.ulk-foot{background:#0f3b5d;color:#bfd6e4;margin-top:32px}
.ulk-foot-in{max-width:1180px;margin:0 auto;padding:26px 16px;display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
.ulk-foot h3{color:#fff;font-size:13px;margin:0 0 10px;font-weight:700}
.ulk-foot a{color:#bfd6e4;text-decoration:none;font-size:13px;display:block;margin-bottom:7px}
.ulk-foot a:hover{color:#fff;text-decoration:underline}
.ulk-foot-big{color:#fff;font-size:19px;font-weight:800;text-decoration:none;display:block}
.ulk-copy{border-top:1px solid rgba(255,255,255,.14);text-align:center;padding:14px 16px;font-size:12px}
@media(max-width:900px){
  .ulk-nav{order:3;width:100%;gap:12px}
  .ulk-nav a{font-size:13px}
  .ulk-brand{margin-right:0}
  .ulk-right{margin-left:auto}
}
`;

export default async function CabinetLayout({ children }: { children: ReactNode }) {
  // Кнопку «Выйти» показываем только тем, кто вошёл: на странице входа она бессмысленна.
  const session = await getClientFromCookie();

  return (
    <div className="ulk-shell">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="ulk-head">
        <div className="ulk-head-in">
          <a className="ulk-brand" href={SITE}>
            <span className="ulk-mark">Р</span>
            <span>
              <span className="ulk-brand-t">УЛЁТНАЯ ПАРКОВКА</span>
              <span className="ulk-brand-s">личный кабинет</span>
            </span>
          </a>

          <nav className="ulk-nav">
            {NAV.map(([label, href]) => (
              <a key={href} href={SITE + href}>{label}</a>
            ))}
          </nav>

          <div className="ulk-right">
            <a className="ulk-phone" href="tel:+79099148881">+7 (909) 914-88-81</a>
            {session && <LogoutButton />}
          </div>
        </div>
      </header>

      <main className="ulk-main">{children}</main>

      <footer className="ulk-foot">
        <div className="ulk-foot-in">
          <div>
            <h3>Остались вопросы?</h3>
            <a className="ulk-foot-big" href="tel:+79099148881">+7 (909) 914-88-81</a>
            <a href="mailto:uletnayaparkovka@gmail.com">uletnayaparkovka@gmail.com</a>
            <a href={`${SITE}/`}>Круглосуточно, без выходных</a>
          </div>
          <div>
            <h3>Парковка</h3>
            <a href={`${SITE}/`}>Главная</a>
            <a href={`${SITE}/transfer`}>Парковка с трансфером</a>
            <a href={`${SITE}/uletnaya-nochevka`}>Улётная ночёвка</a>
            <a href={`${SITE}/oplata`}>Оплата парковки</a>
            <a href={`${SITE}/foto-parkinga`}>Фото парковок</a>
          </div>
          <div>
            <h3>Документы</h3>
            {FOOT_LINKS.map(([label, href]) => (
              <a key={href} href={SITE + href}>{label}</a>
            ))}
          </div>
          <div>
            <h3>Связь</h3>
            <a href="https://t.me/uletpark_bot">Telegram</a>
            <a href="https://wa.link/1841kh">WhatsApp</a>
            <a href="https://yandex.ru/maps/org/ulyotnaya_parkovka/64527453581/reviews/">
              Отзывы на Яндекс.Картах
            </a>
          </div>
        </div>
        <div className="ulk-copy">2016—2026 © Улётная парковка. Все права защищены.</div>
      </footer>
    </div>
  );
}
