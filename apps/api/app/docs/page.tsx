/**
 * Swagger UI на /docs.
 * Загружается из CDN — без npm-зависимостей.
 * Spec берётся из /api/openapi.
 */

export const metadata = { title: "Улётная — API Docs" };

export default function DocsPage() {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Улётная — API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
    .topbar { background: #1F2430; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
    .topbar .brand { color: #3FB8AF; font-size: 12px; letter-spacing: 4px; text-transform: uppercase; }
    .topbar .title { color: #fff; font-size: 18px; font-weight: 300; }
    .topbar a { color: #FF6B4A; text-decoration: none; font-size: 13px; margin-left: auto; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { margin: 24px 0; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">Улётная парковка</div>
    <div class="title">API Docs</div>
    <a href="/api/openapi" target="_blank">openapi.json →</a>
    <a href="/admin">/admin</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        docExpansion: "list",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>
`.trim();

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
