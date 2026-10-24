const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    if (!/<html\b/i.test(html) || !/const APP_VERSION=["']\d+\.\d+\.\d+["']/.test(html)) {
      throw new Error('Index EIAFC invalide ou version absente');
    }

    // Correct the production guard so a hidden overlay can be shown again.
    html = html.replace(
      "if(!overlay || !choice || overlay.classList.contains('hidden')) return;",
      "if(!overlay || !choice) return;"
    );

    // Make the sign-in choice reliable even if the original global-ID bindings
    // are unavailable in a browser. Use explicit DOM lookups only.
    const loginRepair = `<script id="eiafc-login-click-repair">
(function(){
  function openLogin(){
    var overlay=document.getElementById('loginOverlay');
    var choice=document.getElementById('authChoiceBox');
    var box=document.getElementById('loginBox');
    var signup=document.getElementById('signupBox');
    var student=document.getElementById('studentPortalLoginBox');
    var intro=document.getElementById('loginIntro');
    var boot=document.getElementById('bootStatus');
    if(!overlay || !box) return;
    overlay.classList.remove('hidden');
    overlay.style.display='flex';
    if(choice) choice.classList.add('hidden');
    if(signup) signup.classList.add('hidden');
    if(student) student.classList.add('hidden');
    box.classList.remove('hidden');
    box.style.display='block';
    if(intro) intro.textContent='Connectez-vous avec votre compte EIAFC pour accéder à votre espace de travail.';
    if(boot) boot.classList.add('hidden');
    var card=overlay.querySelector('.login-card');
    if(card) card.scrollTop=0;
    var username=document.getElementById('loginUsername');
    if(username) setTimeout(function(){try{username.focus()}catch(e){}},50);
  }
  window.showLoginForm=openLogin;
  // Capture the actual sign-in choice by its visible label, not only by
  // an inline onclick attribute that may be missing in the hosted page.
  document.addEventListener('click',function(event){
    var target=event.target;
    var choice=target && target.closest ? target.closest('#authChoiceBox') : null;
    if(!choice) return;
    var button=target.closest('button, [role="button"], [onclick]');
    if(!button || !/se connecter/i.test((button.innerText || button.textContent || '').replace(/\\s+/g,' '))) return;
    event.preventDefault();
    event.stopPropagation();
    openLogin();
  },true);
})();
</script>`;

    if (!html.includes('id="eiafc-login-click-repair"')) {
      html = html.includes('</body>')
        ? html.replace('</body>', loginRepair + '\\n</body>')
        : html + '\\n' + loginRepair;
    }

    // On the hosted Vercel site, a fresh browser must join the existing Cloud
    // workspace, not be sent toward the local-server setup. Keep auto-connection
    // intact when this browser already has Cloud credentials saved.
    const cloudEntryRepair = `<script id="eiafc-cloud-entry-repair">
(function(){
  function routeFreshHostedPost(){
    try {
      if (!String(location.hostname || "").endsWith(".vercel.app")) return;
      if (typeof db === "undefined" || !db || (db.users && db.users.length)) return;
      if (typeof loadCloudConfig === "function" && loadCloudConfig()) return;
      if (typeof showActivationKey === "function") showActivationKey();
    } catch (e) { console.warn("EIAFC Cloud entry", e); }
  }
  routeFreshHostedPost();
  setTimeout(routeFreshHostedPost, 250);
})();
</script>`;
    if (!html.includes('id="eiafc-cloud-entry-repair"')) {
      html = html.includes('</body>')
        ? html.replace('</body>', cloudEntryRepair + '\\n</body>')
        : html + '\\n' + cloudEntryRepair;
    }

    // Keep the report script available.
    const marker = '<script src="/daily-report.js?v=11.23.0"></script>';
    if (!html.includes(marker)) {
      html = html.includes('</body>')
        ? html.replace('</body>', marker + '\\n</body>')
        : html + '\\n' + marker;
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
