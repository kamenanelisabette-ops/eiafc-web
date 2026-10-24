const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    if (!/<html\b/i.test(html) || !/const APP_VERSION=["']\d+\.\d+\.\d+["']/.test(html)) {
      throw new Error('Index EIAFC invalide ou version absente');
    }

    // Fix the production login guard: it must be allowed to unhide the login overlay.
    // The old condition returned early whenever the overlay was hidden, preventing the fix.
    html = html.replace(
      "if(!overlay || !choice || overlay.classList.contains('hidden')) return;",
      "if(!overlay || !choice) return;"
    );

    // Keep the optional report script available without forcing an obsolete version.
    const marker = '<script src="/daily-report.js?v=11.23.0"></script>';
    if (!html.includes(marker)) {
      html = html.includes('</body>')
        ? html.replace('</body>', marker + '\n</body>')
        : html + '\n' + marker;
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
