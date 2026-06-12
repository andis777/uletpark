// Сборка PDF из markdown через Chrome headless
// Запуск: node build-pdf.mjs <input.md> <output.pdf>
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { marked } from "marked";

const [, , inFile = "sprint-7-days.md", outFile = "sprint-7-days.pdf"] = process.argv;
const md = readFileSync(inFile, "utf8");

marked.setOptions({ breaks: false, gfm: true });
const body = marked.parse(md);

const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Улётная Парковка — 7-дневный спринт в ТОП-1</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
    @bottom-center {
      content: "Улётная Парковка · Стратегия · стр. " counter(page) " / " counter(pages);
      font-family: Inter, sans-serif;
      font-size: 9pt;
      color: #6b7280;
    }
  }
  @page :first { @bottom-center { content: ""; } }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Inter", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #1a1d24;
    font-size: 10.5pt;
    line-height: 1.55;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Cover page */
  .cover {
    page-break-after: always;
    height: 245mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20mm 0;
    background: linear-gradient(135deg, #0f1419 0%, #1a3a35 50%, #0f4d47 100%);
    color: #fff;
    margin: -18mm -16mm 0;
    padding-left: 25mm;
    padding-right: 25mm;
  }
  .cover .brand {
    font-size: 11pt;
    letter-spacing: 4px;
    color: #3FB8AF;
    font-weight: 700;
    text-transform: uppercase;
  }
  .cover h1 {
    font-size: 44pt;
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: -1px;
    margin: 60mm 0 5mm;
    color: #fff;
  }
  .cover .subtitle {
    font-size: 15pt;
    font-weight: 300;
    opacity: 0.85;
    max-width: 130mm;
    line-height: 1.4;
  }
  .cover .badge {
    display: inline-block;
    background: #3FB8AF;
    color: #0f1419;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 10mm;
  }
  .cover .meta {
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 8mm;
    font-size: 10pt;
    opacity: 0.75;
    line-height: 1.6;
  }
  .cover .meta strong { color: #3FB8AF; font-weight: 600; }

  /* Body content */
  .content {
    page-break-before: always;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #0f4d47;
    margin: 0 0 4mm;
    padding-bottom: 3mm;
    border-bottom: 3px solid #3FB8AF;
    page-break-after: avoid;
    page-break-before: always;
  }
  h1:first-of-type { page-break-before: avoid; }
  h2 {
    font-size: 15pt;
    font-weight: 700;
    color: #1a3a35;
    margin: 8mm 0 3mm;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: #2d3039;
    margin: 6mm 0 2mm;
    page-break-after: avoid;
  }
  p { margin: 0 0 3mm; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin-bottom: 1.5mm; }
  strong { color: #0f4d47; font-weight: 700; }
  em { color: #3FB8AF; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 6mm 0; }
  code {
    background: #f4f5f7;
    color: #c44569;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 9.5pt;
  }
  pre {
    background: #f4f5f7;
    padding: 4mm;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.4;
    border-left: 3px solid #3FB8AF;
  }
  pre code { background: none; color: #1a1d24; padding: 0; }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 4mm 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background: #0f4d47;
    color: #fff;
    text-align: left;
    padding: 3mm 4mm;
    font-weight: 600;
    font-size: 9.5pt;
  }
  td {
    padding: 2.5mm 4mm;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafbfc; }

  /* Blockquotes */
  blockquote {
    margin: 4mm 0;
    padding: 3mm 5mm;
    background: linear-gradient(90deg, rgba(63,184,175,0.08), transparent);
    border-left: 4px solid #3FB8AF;
    color: #1a3a35;
    font-style: italic;
  }

  /* Callout boxes from emoji headings */
  h1:has(+ p), h2:has(+ p) { break-after: avoid; }

  a { color: #0f4d47; text-decoration: none; border-bottom: 1px dotted #3FB8AF; }

  /* Print optimization */
  @media print {
    h1, h2, h3 { page-break-after: avoid; }
    table, pre, blockquote { page-break-inside: avoid; }
    li { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<section class="cover">
  <div>
    <div class="brand">✈ Улётная Парковка · Стратегия</div>
  </div>

  <div>
    <h1>7-дневный спринт в&nbsp;ТОП-1</h1>
    <div class="subtitle">
      Подробный план работ по выходу в&nbsp;лидеры рынка парковок у&nbsp;Шереметьево.
      Конкурентный анализ + поэтапная программа на&nbsp;7&nbsp;дней + foundation на&nbsp;60&nbsp;дней.
    </div>
    <div class="badge">Confidential · Action plan</div>
  </div>

  <div class="meta">
    <strong>Клиент:</strong> uletnayaparkovka.ru<br>
    <strong>Конкурент-эталон:</strong> parking24pitstop.ru<br>
    <strong>Дата:</strong> ${today}<br>
    <strong>Цель:</strong> Удвоить заявки за неделю, выйти в&nbsp;ТОП-3 Яндекса за&nbsp;60&nbsp;дней
  </div>
</section>

<section class="content">
${body}
</section>

</body>
</html>`;

const htmlPath = join(tmpdir(), `sprint-pdf-${Date.now()}.html`);
writeFileSync(htmlPath, html, "utf8");
console.log(`HTML: ${htmlPath}`);

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const out = resolve(outFile);

const r = spawnSync(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--no-pdf-header-footer",
  "--virtual-time-budget=10000",
  `--print-to-pdf=${out}`,
  `file:///${htmlPath.replace(/\\/g, "/")}`,
], { stdio: "inherit" });

if (r.status === 0) {
  console.log(`✓ PDF generated: ${out}`);
} else {
  console.error("✗ Chrome exited with", r.status);
  process.exit(r.status ?? 1);
}
