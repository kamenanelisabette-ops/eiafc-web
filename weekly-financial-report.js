/* EIAFC — Suivi hebdomadaire et état financier des étudiants */
(function(){
 'use strict';
 const VIEW='weeklyFinancialReport', NAV='weeklyFinancialReportNav';
 const $=id=>document.getElementById(id);
 const escW=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const moneyW=n=>typeof fmt==='function'?fmt(Number(n||0)):new Intl.NumberFormat('fr-FR').format(Number(n||0))+' FCFA';
 const dateW=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
 const recordsW=()=>typeof currentRecords==='function'?currentRecords(db.payments):[];
 const studentsW=()=>typeof currentStudents==='function'?currentStudents():[];
 const allowedW=()=>typeof canSeeStudentFinance==='function'&&canSeeStudentFinance();
 const validW=p=>p&&p.deleted!==true&&p.status==='Validé'&&(typeof DEBT_PAYMENT_TYPES==='undefined'||DEBT_PAYMENT_TYPES.has(p.type));
 const studentForW=p=>studentsW().find(s=>String(s.matricule)===String(p.student));
 const dueW=s=>typeof studentDue==='function'?studentDue(s):Math.max(0,Number(s.tuition||0)-Number(s.discount||0));
 const paidW=s=>typeof studentDebtPaid==='function'?studentDebtPaid(s.matricule):0;
 const restW=s=>typeof studentRest==='function'?studentRest(s):Math.max(0,dueW(s)-paidW(s));
 const dateIn=(v,a,b)=>{const d=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=a&&d<=b};
 function defaultWeek(){const d=new Date(dateW()+'T12:00:00');const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const a=d.toISOString().slice(0,10);const e=new Date(d);e.setDate(e.getDate()+6);return[a,e.toISOString().slice(0,10)]}
 function createView(){
  if($(VIEW))return;
  const view=document.createElement('section');view.id=VIEW;view.className='view';
  view.innerHTML=`
   <div class="page-head"><div><h2>Suivi hebdomadaire des paiements</h2><p class="muted">Contrôle des encaissements par période et situation financière complète des étudiants.</p></div></div>
   <div class="card" style="margin-bottom:16px">
    <h3>1. Point hebdomadaire des encaissements</h3>
    <div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0">
     <label>Date de début<input type="date" id="wfrFrom"></label>
     <label>Date de fin<input type="date" id="wfrTo"></label>
     <label>Programme<select id="wfrProgram"><option value="">Tous les programmes</option></select></label>
     <label>Recherche étudiant<input id="wfrSearch" type="search" placeholder="Nom ou matricule"></label>
    </div>
    <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
     <button class="btn btn-primary" id="wfrApply">Appliquer les filtres</button>
     <button class="btn btn-secondary" id="wfrWeek">Cette semaine</button>
     <button class="btn btn-secondary" id="wfrExport">Exporter le point (CSV)</button>
     <button class="btn btn-secondary" id="wfrPrint">Imprimer / PDF</button>
    </div>
    <div id="wfrKpis" class="grid kpis" style="margin:14px 0"></div>
    <div class="table-wrap"><table id="wfrPayments" class="data-table"></table></div>
   </div>
   <div class="card">
    <h3>2. Situation financière de tous les étudiants</h3>
    <p class="muted">Montants calculés avec les règles de scolarité et les versements validés du logiciel.</p>
    <div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0">
     <label>Programme<select id="wfrAllProgram"><option value="">Tous les programmes</option></select></label>
     <label>Filière<input id="wfrTrack" placeholder="Filtrer par filière"></label>
     <label>Situation<select id="wfrStatus"><option value="">Toutes les situations</option><option value="paid">Soldé</option><option value="partial">Paiement partiel</option><option value="none">Aucun versement</option></select></label>
     <label>Recherche<input id="wfrAllSearch" type="search" placeholder="Nom ou matricule"></label>
    </div>
    <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
     <button class="btn btn-primary" id="wfrAllApply">Filtrer la liste</button>
     <button class="btn btn-secondary" id="wfrAllExport">Exporter la liste complète (CSV)</button>
     <button class="btn btn-secondary" id="wfrAllPrint">Imprimer / PDF</button>
    </div>
    <div id="wfrAllKpis" class="grid kpis" style="margin:12px 0"></div>
    <div class="table-wrap"><table id="wfrStudents" class="data-table"></table></div>
   </div>`;
  (document.querySelector('.main')||document.body).appendChild(view);
 }
 function ensureNav(){
  if($(NAV))return;
  const b=document.createElement('button');b.id=NAV;b.type='button';b.className='nav-btn';b.dataset.view=VIEW;b.innerHTML='📅 Point hebdomadaire';
  const anchor=$('dailyDetailedReportNav')||document.querySelector('.nav-btn[data-view="studentSettlement"]')||document.querySelector('.nav-btn[data-view="students"]');
  if(anchor)anchor.insertAdjacentElement('afterend',b);else document.querySelector('.sidebar')?.appendChild(b);
  b.addEventListener('click',()=>{
   if(!allowedW())return alert("Votre rôle ne permet pas de consulter les informations financières des étudiants.");
   document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
   document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
   b.classList.add('active');$(VIEW).classList.add('active');renderAll();
  });
 }
 function fillPrograms(){
  const opts=[...new Set(studentsW().map(s=>String(s.program||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  ['wfrProgram','wfrAllProgram'].forEach(id=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML='<option value="">Tous les programmes</option>'+opts.map(x=>'<option value="'+escW(x)+'">'+escW(x)+'</option>').join('');el.value=opts.includes(old)?old:''});
 }
 function weeklyRows(){
  const a=$('wfrFrom')?.value||'',b=$('wfrTo')?.value||'9999-12-31',program=$('wfrProgram')?.value||'',q=($('wfrSearch')?.value||'').trim().toLocaleLowerCase('fr');
  return recordsW().filter(p=>validW(p)&&dateIn(p.date,a,b)).map(p=>({p,s:studentForW(p)})).filter(x=>{
   if(program&&x.s?.program!==program)return false;
   if(q&&!String([x.s?.name,x.s?.matricule,x.p.student].join(' ')).toLocaleLowerCase('fr').includes(q))return false;
   return true;
  }).sort((x,y)=>String(x.p.date||'').localeCompare(String(y.p.date||''))||String(x.s?.name||'').localeCompare(String(y.s?.name||''),'fr'));
 }
 function renderWeekly(){
  const rows=weeklyRows(),total=rows.reduce((a,x)=>a+Number(x.p.amount||0),0),unique=new Set(rows.map(x=>x.p.student)).size;
  $('wfrKpis').innerHTML=[['Versements validés',rows.length],['Étudiants concernés',unique],['Total encaissé',moneyW(total)]].map(x=>'<div class="card kpi"><div class="label">'+x[0]+'</div><div class="value">'+x[1]+'</div></div>').join('');
  $('wfrPayments').innerHTML='<thead><tr><th>N°</th><th>Date</th><th>Étudiant</th><th>Matricule</th><th>Programme</th><th>Type de paiement</th><th>Mode</th><th>Référence</th><th class="money">Montant encaissé</th></tr></thead><tbody>'+
   (rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+escW(x.p.date||'—')+'</td><td><b>'+escW(x.s?.name||'Étudiant introuvable')+'</b></td><td>'+escW(x.p.student||'')+'</td><td>'+escW(x.s?.program||'—')+'</td><td>'+escW(x.p.type||'—')+'</td><td>'+escW(x.p.mode||'—')+'</td><td>'+escW(x.p.ref||'—')+'</td><td class="money">'+moneyW(x.p.amount)+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">Aucun versement validé pour cette période.</td></tr>')+'</tbody>';
 }
 function allRows(){
  const program=$('wfrAllProgram')?.value||'',track=($('wfrTrack')?.value||'').trim().toLocaleLowerCase('fr'),status=$('wfrStatus')?.value||'',q=($('wfrAllSearch')?.value||'').trim().toLocaleLowerCase('fr');
  return studentsW().filter(s=>s.deleted!==true&&s.status!=='Archivé').filter(s=>{
   if(program&&s.program!==program)return false;
   const t=typeof studentTrackValue==='function'?studentTrackValue(s):s.track||'';
   if(track&&!String(t).toLocaleLowerCase('fr').includes(track))return false;
   const paid=paidW(s),due=dueW(s),rest=restW(s),st=due<=0?'check':rest<=0.009?'paid':paid>0?'partial':'none';
   if(status&&st!==status)return false;
   if(q&&!String([s.name,s.matricule,s.program,t].join(' ')).toLocaleLowerCase('fr').includes(q))return false;
   return true;
  }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'));
 }
 function renderAllStudents(){
  const rows=allRows(),due=rows.reduce((n,s)=>n+dueW(s),0),paid=rows.reduce((n,s)=>n+paidW(s),0),rest=rows.reduce((n,s)=>n+restW(s),0);
  $('wfrAllKpis').innerHTML=[['Étudiants',rows.length],['Net à payer',moneyW(due)],['Déjà payé',moneyW(paid)],['Reste à payer',moneyW(rest)]].map(x=>'<div class="card kpi"><div class="label">'+x[0]+'</div><div class="value">'+x[1]+'</div></div>').join('');
  $('wfrStudents').innerHTML='<thead><tr><th>N° d’ordre</th><th>Matricule</th><th>Nom et prénoms</th><th>Programme / Filière</th><th class="money">Frais d’inscription</th><th class="money">Scolarité</th><th class="money">Réduction</th><th class="money">Net à payer</th><th class="money">Déjà payé</th><th class="money">Reste à payer</th></tr></thead><tbody>'+
   (rows.length?rows.map((s,i)=>'<tr><td>'+(i+1)+'</td><td>'+escW(s.matricule||'—')+'</td><td><b>'+escW(s.name||'—')+'</b></td><td>'+escW(s.program||'—')+' / '+escW(typeof studentTrackValue==='function'?studentTrackValue(s):s.track||'—')+'</td><td class="money">'+(Number(s.regFee||0)>0?moneyW(s.regFee):'—')+'</td><td class="money">'+moneyW(Number(s.tuition||0))+'</td><td class="money">'+moneyW(s.discount)+'</td><td class="money"><b>'+moneyW(dueW(s))+'</b></td><td class="money">'+moneyW(paidW(s))+'</td><td class="money"><b>'+moneyW(restW(s))+'</b></td></tr>').join(''):'<tr><td colspan="10" class="empty">Aucun étudiant pour ces filtres.</td></tr>')+'</tbody>';
 }
 function csvDownload(name,headers,rows){
  const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const content='\\ufeff'+[headers,...rows].map(r=>r.map(quote).join(';')).join('\\r\\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function exportWeekly(){const rows=weeklyRows();csvDownload('EIAFC_point_hebdomadaire.csv',['N°','Date','Étudiant','Matricule','Programme','Mode','Référence','Montant encaissé'],rows.map((x,i)=>[i+1,x.p.date,x.s?.name||'Étudiant introuvable',x.p.student,x.s?.program,x.p.mode,x.p.ref,x.p.amount]));}
 function exportAll(){const rows=allRows();csvDownload('EIAFC_situation_financiere_etudiants.csv',['N° ordre','Matricule','Nom','Programme','Filière','Frais d’inscription','Scolarité','Réduction','Net à payer','Déjà payé','Reste à payer'],rows.map((s,i)=>[i+1,s.matricule,s.name,s.program,typeof studentTrackValue==='function'?studentTrackValue(s):s.track,Number(s.regFee||0),Number(s.tuition||0),s.discount,dueW(s),paidW(s),restW(s)]));}
 function printTable(title,tableId,kpiId){const table=$(tableId);if(!table)return;const w=window.open('','_blank');if(!w)return alert('Autorisez les fenêtres contextuelles pour imprimer le rapport.');w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+escW(title)+'</title><style>@page{size:A4 landscape;margin:10mm}body{font:12px Arial;color:#17212b}h2{color:#12304a}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#edf2f7}.money{text-align:right}.kpis{margin:12px 0}</style></head><body><h2>EIAFC — '+escW(title)+'</h2><p>Année scolaire : '+escW(typeof activeYear==='function'?activeYear():'')+' | Édité le '+dateW()+'</p><div class="kpis">'+$(kpiId).innerHTML+'</div>'+table.outerHTML+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);}
 function renderAll(){if(!allowedW())return;fillPrograms();renderWeekly();renderAllStudents();}
 function init(){
  createView();ensureNav();const [a,b]=defaultWeek();$('wfrFrom').value=a;$('wfrTo').value=b;
  $('wfrApply').addEventListener('click',renderWeekly);$('wfrWeek').addEventListener('click',()=>{const d=defaultWeek();$('wfrFrom').value=d[0];$('wfrTo').value=d[1];renderWeekly()});
  $('wfrExport').addEventListener('click',exportWeekly);$('wfrPrint').addEventListener('click',()=>printTable('Point hebdomadaire','wfrPayments','wfrKpis'));
  $('wfrAllApply').addEventListener('click',renderAllStudents);$('wfrAllExport').addEventListener('click',exportAll);$('wfrAllPrint').addEventListener('click',()=>printTable('Situation financière des étudiants','wfrStudents','wfrAllKpis'));
  $('wfrAllSearch').addEventListener('input',renderAllStudents);$('wfrSearch').addEventListener('input',renderWeekly);
  $('wfrAllProgram').addEventListener('change',renderAllStudents);$('wfrProgram').addEventListener('change',renderWeekly);$('wfrStatus').addEventListener('change',renderAllStudents);$('wfrTrack').addEventListener('input',renderAllStudents);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.eiafcRenderWeeklyFinancialReport=renderAll;
})();