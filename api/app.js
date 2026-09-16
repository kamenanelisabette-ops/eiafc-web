const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    html = html
      .replace('const APP_VERSION="11.22.0";', 'const APP_VERSION="11.23.0";')
      .replace(/2026-09-14-v11-22-auto-update/g, '2026-09-16-v11-23-daily-report');

    const marker = '<script src="/daily-report.js?v=11.23.0"></script>';

    if (!html.includes(marker)) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', marker + '\n</body>');
      } else {
        html += '\n' + marker;
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.statusCode = 200;
    res.end(html);

  } catch (error) {
    console.error('EIAFC app wrapper error', error);

    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    res.end("EIAFC : impossible de charger l'application.");
  }
};
