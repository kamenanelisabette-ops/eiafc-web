const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    if (!/<html\b/i.test(html) || !/const APP_VERSION=["']\d+\.\d+\.\d+["']/.test(html)) {
      throw new Error('Index EIAFC invalide ou version absente');
    }

    // Preserve the production auth guard from index.html. It must not reopen
    // a hidden login overlay after the user has entered the application.

    // Make the existing sign-in button call the repair function directly.
    html = html.replace(/onclick=["']showLoginForm\(\)["']/g, 'onclick="window.eiafcForceLogin()"');

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
    if(!overlay || !box) return false;
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
    return true;
  }
  window.showLoginForm=openLogin;
  window.eiafcForceLogin=openLogin;
  // Repair the exact existing account-login button and keep a delegated fallback.
  document.addEventListener('click',function(event){
    var target=event.target;
    if(!target || !target.closest) return;
    var button=target.closest('#authChoiceBox button[onclick*="showLoginForm"], #authChoiceBox button');
    if(!button) return;
    var label=(button.innerText || button.textContent || '').replace(/\\s+/g,' ').trim();
    if(!/se connecter/i.test(label) && !/showLoginForm/.test(button.getAttribute('onclick') || '')) return;
    if(openLogin()){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
})();
</script>`;

    if (!html.includes('id="eiafc-login-click-repair"')) {
      html = html.includes('</body>')
        ? html.replace('</body>', loginRepair + '\n</body>')
        : html + '\n' + loginRepair;
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
      // The hosted web portal authenticates through the secure API directly;
      // a new browser must not be routed to the local-server / activation-key setup.
      var overlay=document.getElementById('loginOverlay');
      var login=document.getElementById('loginBox');
      var choice=document.getElementById('authChoiceBox');
      var signup=document.getElementById('signupBox');
      var student=document.getElementById('studentPortalLoginBox');
      if(overlay && login){
        overlay.classList.remove('hidden');
        overlay.style.setProperty('display','flex','important');
        if(choice){choice.classList.add('hidden');choice.style.setProperty('display','none','important');}
        if(signup){signup.classList.add('hidden');signup.style.setProperty('display','none','important');}
        if(student){student.classList.add('hidden');student.style.setProperty('display','none','important');}
        login.classList.remove('hidden');
        login.style.setProperty('display','block','important');
        var intro=document.getElementById('loginIntro');
        if(intro)intro.textContent='Connectez-vous avec votre compte EIAFC pour accéder à votre espace de travail.';
      }
    } catch (e) { console.warn("EIAFC Cloud entry", e); }
  }
  routeFreshHostedPost();
  setTimeout(routeFreshHostedPost, 250);
})();
</script>`;
    if (!html.includes('id="eiafc-cloud-entry-repair"')) {
      html = html.includes('</body>')
        ? html.replace('</body>', cloudEntryRepair + '\n</body>')
        : html + '\n' + cloudEntryRepair;
    }

    // Final hosted-login guard: some startup scripts re-hide the login panel after
    // the earlier repair runs. Reveal the secure web-account form on initial load,
    // and only intercept "Se connecter" when the credential form is not visible.
    const hostedLoginGuard = `<script id="eiafc-hosted-login-guard">
(function(){
  function visible(el){
    if(!el) return false;
    var cs=window.getComputedStyle ? getComputedStyle(el) : null;
    return !el.classList.contains('hidden') && (!cs || (cs.display!=='none' && cs.visibility!=='hidden'));
  }
  function reveal(){
    try{
      if(!String(location.hostname||'').endsWith('.vercel.app')) return;
      var overlay=document.getElementById('loginOverlay');
      var login=document.getElementById('loginBox');
      if(!overlay || !login) return;
      var user=document.getElementById('loginUsername');
      var pass=document.getElementById('loginPassword');
      if(!user || !pass) return;
      overlay.classList.remove('hidden');
      overlay.style.setProperty('display','flex','important');
      login.classList.remove('hidden');
      login.style.setProperty('display','block','important');
      ['authChoiceBox','signupBox','studentPortalLoginBox'].forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.classList.add('hidden');el.style.setProperty('display','none','important');}
      });
      var intro=document.getElementById('loginIntro');
      if(intro) intro.textContent='Connectez-vous avec votre compte EIAFC pour accéder à votre espace de travail.';
    }catch(e){console.warn('EIAFC hosted login guard',e);}
  }
  window.eiafcForceLogin=reveal;
  document.addEventListener('click',function(event){
    var target=event.target;
    if(!target || !target.closest) return;
    var button=target.closest('button, [role="button"], a, input[type="button"], input[type="submit"]');
    if(!button) return;
    var label=(button.innerText||button.textContent||button.value||'').replace(/\\s+/g,' ').trim();
    if(!/se connecter/i.test(label)) return;
    var login=document.getElementById('loginBox');
    if(visible(login)) return; // Let the real login submission run when fields are already open.
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();
    reveal();
  },true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',reveal,{once:true});
  else reveal();
  setTimeout(reveal,100);
  setTimeout(reveal,500);
  setTimeout(reveal,1200);
})();
</script>`;
    if (!html.includes('id="eiafc-hosted-login-guard"')) {
      html = html.includes('</body>')
        ? html.replace('</body>', hostedLoginGuard + '\\n</body>')
        : html + '\\n' + hostedLoginGuard;
    }

    // Keep the report script available.
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
