/* EIAFC V11.23 — Bilan journalier détaillé
   Module ajouté sans modifier le noyau historique de l'application.
*/
(function EiafcDailyDetailedReport(){
  'use strict';
  const VIEW_ID='dailyDetailedReport';
  const NAV_ID='dailyDetailedReportNav';

  function hasCore(){
    return typeof db!=='undefined' && typeof currentRecords==='function';
  }
  function safe(fn,fallback){try{return fn()}catch(e){console.warn('EIAFC bilan journalier',e);return fallback}}
  function escD(v){
    if(typeof esc==='function')return esc(v);
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function fmtD(n){
    if(typeof fmt==='function')return fmt(Number(n||0));
    return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n||0))+' FCFA';
  }
  function todayD(){return typeof today==='function'?today():new Date().toISOString().slice(0,10)}
  function money(n){return Number(n||0)}
  function recs(arr){return hasCore()?currentRecords(arr||[]):(arr||[]).filter(x=>x&&x.deleted!==true)}
  function activeSchoolLabel(){return safe(()=>typeof schoolLabel==='function'?schoolLabel():'EIAFC','EIAFC')}
  function activeYearLabel(){return safe(()=>typeof activeYear==='function'?activeYear():'','')}
  function roleLabel(){return safe(()=>typeof roleName==='function'?roleName():'','')}
  function fullFinanceAccess(){
    return safe(()=>typeof isOwner==='function'&&isOwner(),false)||roleLabel()==='Comptable'||safe(()=>typeof can==='function'&&can('reports'),false);
  }
  function canSeeModule(){
    return safe(()=>typeof isOwner==='function'&&isOwner(),false)||safe(()=>typeof can==='function'&&(can('cash')||can('reports')),false);
  }
  function normalizeDate(v){return String(v||'').slice(0,10)}
  function createdDate(x){
    if(!x)return'';
    return normalizeDate(x.createdAt||x.created||x.time||'')||normalizeDate(x.date||'');
  }
  function createdTime(x){
    const raw=String(x?.createdAt||x?.time||'');
    if(!raw)return'—';
    const d=new Date(raw);if(Number.isNaN(d.getTime()))return'—';
    return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }
  function studentOf(mat){return safe(()=>typeof studentByMat==='function'?studentByMat(mat):(db.students||[]).find(s=>s.matricule===mat),null)}
  function poleOfProgram(program){return safe(()=>typeof poleName==='function'?poleName(program):String(program||''),String(program||''))}
  function modeChannel(mode){return safe(()=>typeof treasuryChannel==='function'?treasuryChannel(mode):String(mode||''),String(mode||''))}
  function currentStudentsD(){return safe(()=>typeof currentStudents==='function'?currentStudents():recs(db.students),[])}
  function allPaymentsD(){return recs(db.payments)}
  function validPaymentRows(date){return allPaymentsD().filter(p=>p.date===date&&p.status==='Validé')}
  function allOtherD(){return recs(db.other)}
  function validOtherRows(date){return allOtherD().filter(x=>x.date===date&&x.status==='Validé')}
  function expenseMovementsD(date){
    if(typeof expenseCashMovements==='function')return safe(()=>expenseCashMovements().filter(x=>x.date===date),[]);
    return recs(db.expenses).filter(x=>x.date===date&&x.status==='Validé').map(x=>({id:x.id,expenseId:x.id,date:x.date,amount:x.amount||x.totalAmount,mode:x.mode,ref:x.ref,status:x.status}));
  }
  function payrollRowsD(date){return typeof payrollPaid==='function'?safe(()=>payrollPaid().filter(x=>x.payDate===date),[]):[]}
  function loanRowsD(date){return recs(db.staffLoans).filter(x=>x.date===date&&x.status!=='Annulé')}
  function transferRowsD(date){return typeof validTransfers==='function'?safe(()=>validTransfers().filter(x=>x.date===date),[]):recs(db.transfers).filter(x=>x.date===date&&x.status!=='Annulé')}
  function closingRowsD(date){return recs(db.closings).filter(x=>x.date===date).sort((a,b)=>String(a.pole||'').localeCompare(String(b.pole||''),'fr'))}
  function studentCreatedDate(s){
    if(typeof enrollmentCreatedDate==='function')return safe(()=>enrollmentCreatedDate(s),createdDate(s));
    return createdDate(s);
  }
  function newStudentRows(date){
    return currentStudentsD().filter(s=>studentCreatedDate(s)===date).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  }
  function dayPaymentsByStudent(date){
    const m=new Map();validPaymentRows(date).forEach(p=>m.set(p.student,(m.get(p.student)||0)+money(p.amount)));return m;
  }
  function expenseParent(row){return safe(()=>recs(db.expenses).find(e=>String(e.id)===String(row.expenseId)),null)}
  function staffName(mat){return safe(()=>{const st=(db.staff||[]).find(s=>s.matricule===mat);return st?.name||mat||'—'},mat||'—')}
  function transferPoleText(tr){
    if(Array.isArray(tr?.poleBreakdown)&&tr.poleBreakdown.length)return tr.poleBreakdown.map(p=>`${p.pole}: ${fmtD(p.amount)}`).join(' • ');
    return tr?.pole||'—';
  }
  function supplyRowsD(date){
    if(typeof allSupplyReceiptEvents!=='function')return[];
    return safe(()=>allSupplyReceiptEvents().filter(x=>x.date===date&&(money(x.reams)!==0||money(x.markers)!==0)),[]);
  }

  function dayData(date){
    const students=newStudentRows(date),payments=allPaymentsD().filter(p=>p.date===date),validPays=payments.filter(p=>p.status==='Validé'),others=allOtherD().filter(x=>x.date===date),validOthers=others.filter(x=>x.status==='Validé');
    const expenses=expenseMovementsD(date),payroll=payrollRowsD(date),loans=loanRowsD(date),transfers=transferRowsD(date),closings=closingRowsD(date),supplies=supplyRowsD(date);
    const studentIn=validPays.reduce((z,x)=>z+money(x.amount),0),otherIn=validOthers.reduce((z,x)=>z+money(x.amount),0);
    const supplierOut=expenses.reduce((z,x)=>z+money(x.amount),0),salaryOut=payroll.reduce((z,x)=>z+money(x.net||x.amount),0),loanOut=loans.reduce((z,x)=>z+money(x.amount),0);
    const operatingOut=supplierOut+salaryOut+loanOut,totalIn=studentIn+otherIn,net=totalIn-operatingOut;
    return{date,students,payments,validPays,others,validOthers,expenses,payroll,loans,transfers,closings,supplies,studentIn,otherIn,totalIn,supplierOut,salaryOut,loanOut,operatingOut,net};
  }

  function modeBreakdown(d){
    const channels=['Espèces','Caisse Fondateur','Wave','MTN Mobile Money','Orange Money','Banque'];
    const map=new Map(channels.map(c=>[c,{channel:c,inflow:0,outflow:0,transferIn:0,transferOut:0}]));
    const get=c=>{c=modeChannel(c)||'Autre';if(!map.has(c))map.set(c,{channel:c,inflow:0,outflow:0,transferIn:0,transferOut:0});return map.get(c)};
    [...d.validPays,...d.validOthers].forEach(x=>get(x.mode).inflow+=money(x.amount));
    d.expenses.forEach(x=>get(x.mode).outflow+=money(x.amount));
    d.payroll.forEach(x=>get(x.mode).outflow+=money(x.net||x.amount));
    d.loans.forEach(x=>get(x.mode).outflow+=money(x.amount));
    d.transfers.forEach(x=>{get(x.to).transferIn+=money(x.amount);get(x.from).transferOut+=money(x.amount)});
    return [...map.values()].filter(x=>x.inflow||x.outflow||x.transferIn||x.transferOut).map(x=>({...x,net:x.inflow+x.transferIn-x.outflow-x.transferOut}));
  }
  function poleBreakdown(d){
    const m=new Map();
    const get=p=>{p=p||'Administration générale';if(!m.has(p))m.set(p,{pole:p,inflow:0,outflow:0,count:0});return m.get(p)};
    d.validPays.forEach(x=>{const st=studentOf(x.student),r=get(poleOfProgram(st?.program));r.inflow+=money(x.amount);r.count++});
    d.validOthers.forEach(x=>{const r=get(poleOfProgram(x.program||x.service));r.inflow+=money(x.amount)});
    d.expenses.forEach(x=>{const e=expenseParent(x),r=get(poleOfProgram(e?.program||e?.service));r.outflow+=money(x.amount)});
    d.payroll.forEach(x=>{const r=get(poleOfProgram(x.program||x.service));r.outflow+=money(x.net||x.amount)});
    d.loans.forEach(x=>{const r=get(poleOfProgram(x.program||x.service));r.outflow+=money(x.amount)});
    return [...m.values()].map(x=>({...x,net:x.inflow-x.outflow})).sort((a,b)=>String(a.pole).localeCompare(String(b.pole),'fr'));
  }

  function integrityChecks(d){
    const issues=[];
    const exact=new Map(),refs=new Map();
    d.payments.filter(p=>p.status==='Validé').forEach(p=>{
      const k=[p.student,p.date,p.ref,money(p.amount)].join('|');
      exact.set(k,(exact.get(k)||[]).concat(p));
      if(String(p.ref||'').trim())refs.set(String(p.ref).trim(),(refs.get(String(p.ref).trim())||[]).concat(p));
    });
    const exactDup=[...exact.values()].filter(v=>v.length>1);
    if(exactDup.length)issues.push({level:'bad',text:`${exactDup.length} doublon(s) exact(s) de paiement à contrôler.`});
    const shared=[...refs.entries()].filter(([,v])=>new Set(v.map(p=>p.student)).size>1);
    if(shared.length)issues.push({level:'warn',text:`${shared.length} référence(s) de paiement partagée(s) entre plusieurs étudiants : ${shared.map(([r])=>r).join(', ')}.`});
    const closeTimes=d.closings.map(c=>Date.parse(c.time||'')).filter(Number.isFinite);
    if(closeTimes.length){
      const firstClose=Math.min(...closeTimes);
      const post=d.payments.filter(p=>p.status==='Validé'&&Date.parse(p.createdAt||'')>firstClose);
      if(post.length)issues.push({level:'warn',text:`${post.length} paiement(s) daté(s) du ${d.date} ont été saisis après le début des clôtures de cette journée.`});
    }
    const diff=d.closings.reduce((z,c)=>z+Math.abs(money(c.difference)),0);
    if(diff>0.01)issues.push({level:'bad',text:`Écart(s) de clôture à contrôler : ${fmtD(diff)} au total en valeur absolue.`});
    if(!d.closings.length)issues.push({level:'info',text:'Journée non clôturée : le bilan reste provisoire.'});
    if(!issues.length)issues.push({level:'ok',text:'Aucune incohérence détectée pour cette journée.'});
    return issues;
  }

  function statusBadge(status){
    const cl=status==='Validé'?'valid':status==='Annulé'||status==='Rejeté'?'rejected':'pending';return `<span class="status ${cl}">${escD(status||'—')}</span>`;
  }
  function emptyRow(cols,msg){return `<tr><td colspan="${cols}" class="empty">${escD(msg)}</td></tr>`}
  function tableSection(title,subtitle,html){return `<div class="card djr-section"><div class="section-title"><div><h3>${title}</h3>${subtitle?`<span class="small">${subtitle}</span>`:''}</div></div><div class="table-wrap">${html}</div></div>`}

  function renderDailyDetailedReport(){
    const host=document.getElementById('dailyDetailedReportBody');if(!host||!hasCore())return;
    const date=document.getElementById('dailyDetailedReportDate')?.value||todayD(),d=dayData(date),paidMap=dayPaymentsByStudent(date),full=fullFinanceAccess();
    const modeRows=modeBreakdown(d),poleRows=poleBreakdown(d),checks=integrityChecks(d);
    const regOfficial=d.students.filter(s=>normalizeDate(s.date)===date).length;
    const pendingAmt=d.payments.filter(p=>p.status==='En attente').reduce((z,p)=>z+money(p.amount),0);
    const closingDiff=d.closings.reduce((z,c)=>z+money(c.difference),0);

    const kpis=[
      ['Étudiants saisis',d.students.length,`${regOfficial} inscription(s) datée(s) du jour`],
      ['Versements validés',fmtD(d.studentIn),`${d.validPays.length} paiement(s)`],
      ['Autres recettes',fmtD(d.otherIn),`${d.validOthers.length} opération(s)`],
      ['Total encaissements',fmtD(d.totalIn),'paiements + autres recettes'],
      ['Sorties opérationnelles',full?fmtD(d.operatingOut):'🔒 Masqué',full?'dépenses + salaires + avances':'réservé Fondateur / Comptable'],
      ['Flux net du jour',full?fmtD(d.net):'🔒 Masqué',full?'hors transferts internes':'réservé Fondateur / Comptable'],
      ['En attente',fmtD(pendingAmt),`${d.payments.filter(p=>p.status==='En attente').length} paiement(s)`],
      ['Écart clôture',d.closings.length?fmtD(closingDiff):'Journée ouverte',`${d.closings.length} clôture(s)`]
    ];

    const studentTable=`<table><thead><tr><th>Heure saisie</th><th>Matricule</th><th>Étudiant</th><th>Programme</th><th>Filière</th><th>Date inscription</th><th class="money">Versé ce jour</th><th>Agent</th></tr></thead><tbody>${d.students.length?d.students.map(s=>`<tr><td>${createdTime(s)}</td><td><b>${escD(s.matricule)}</b></td><td><b>${escD(s.name)}</b><br><span class="small">${escD(s.phone||'—')}</span></td><td>${escD(s.program||'—')}</td><td>${escD(s.track||'—')}</td><td>${escD(s.date||'—')}</td><td class="money"><b>${fmtD(paidMap.get(s.matricule)||0)}</b></td><td>${escD(s.createdBy||s.agent||'—')}</td></tr>`).join(''):emptyRow(8,'Aucun étudiant saisi ce jour.')}</tbody></table>`;

    const paymentTable=`<table><thead><tr><th>Heure</th><th>Reçu</th><th>Matricule</th><th>Étudiant</th><th>Programme</th><th>Type</th><th>Mode</th><th class="money">Montant</th><th>Référence</th><th>Agent</th><th>Statut</th></tr></thead><tbody>${d.payments.length?d.payments.slice().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))).map(p=>{const st=studentOf(p.student);return`<tr><td>${createdTime(p)}</td><td><b>${escD(p.receipt||'—')}</b></td><td>${escD(p.student||'—')}</td><td><b>${escD(st?.name||p.student||'—')}</b></td><td>${escD(st?.program||'—')}</td><td>${escD(p.type||'—')}</td><td>${escD(p.mode||'—')}</td><td class="money"><b>${fmtD(p.amount)}</b></td><td>${escD(p.ref||'—')}</td><td>${escD(p.agent||p.createdBy||'—')}</td><td>${statusBadge(p.status)}</td></tr>`}).join(''):emptyRow(11,'Aucun versement étudiant ce jour.')}</tbody></table>`;

    const modeTable=`<table><thead><tr><th>Canal</th><th class="money">Entrées</th><th class="money">Sorties</th><th class="money">Transferts reçus</th><th class="money">Transferts sortis</th><th class="money">Mouvement net</th></tr></thead><tbody>${modeRows.length?modeRows.map(x=>`<tr><td><b>${escD(x.channel)}</b></td><td class="money">${fmtD(x.inflow)}</td><td class="money">${full?fmtD(x.outflow):'🔒'}</td><td class="money">${fmtD(x.transferIn)}</td><td class="money">${fmtD(x.transferOut)}</td><td class="money"><b>${full?fmtD(x.net):'🔒'}</b></td></tr>`).join(''):emptyRow(6,'Aucun mouvement financier ce jour.')}</tbody></table>`;

    const poleTable=`<table><thead><tr><th>Pôle</th><th>Nb versements</th><th class="money">Encaissements</th><th class="money">Sorties</th><th class="money">Net</th></tr></thead><tbody>${poleRows.length?poleRows.map(x=>`<tr><td><b>${escD(x.pole)}</b></td><td>${x.count}</td><td class="money">${fmtD(x.inflow)}</td><td class="money">${full?fmtD(x.outflow):'🔒'}</td><td class="money"><b>${full?fmtD(x.net):'🔒'}</b></td></tr>`).join(''):emptyRow(5,'Aucun mouvement par pôle.')}</tbody></table>`;

    const otherTable=`<table><thead><tr><th>Heure</th><th>N°</th><th>Libellé</th><th>Programme</th><th>Mode</th><th class="money">Montant</th><th>Référence</th><th>Agent</th><th>Statut</th></tr></thead><tbody>${d.others.length?d.others.map(x=>`<tr><td>${createdTime(x)}</td><td>${escD(x.receipt||'—')}</td><td><b>${escD(x.label||x.type||'—')}</b></td><td>${escD(x.program||x.service||'—')}</td><td>${escD(x.mode||'—')}</td><td class="money"><b>${fmtD(x.amount)}</b></td><td>${escD(x.ref||'—')}</td><td>${escD(x.agent||'—')}</td><td>${statusBadge(x.status)}</td></tr>`).join(''):emptyRow(9,'Aucune autre recette ce jour.')}</tbody></table>`;

    const expenseRows=full?d.expenses.map(x=>{const e=expenseParent(x);return`<tr><td>${createdTime(x)}</td><td>${escD(x.id||x.expenseId||'—')}</td><td><b>${escD(e?.beneficiary||e?.label||e?.category||x.expenseId||'—')}</b></td><td>${escD(e?.program||e?.service||'—')}</td><td>${escD(x.mode||'—')}</td><td class="money"><b>${fmtD(x.amount)}</b></td><td>${escD(x.ref||'—')}</td><td>${escD(x.agent||e?.agent||'—')}</td></tr>`}).join(''):'';
    const expenseTable=`<table><thead><tr><th>Heure</th><th>N°</th><th>Dépense / bénéficiaire</th><th>Programme</th><th>Mode</th><th class="money">Montant payé</th><th>Référence</th><th>Agent</th></tr></thead><tbody>${full?(expenseRows||emptyRow(8,'Aucune dépense réglée ce jour.')):emptyRow(8,'Détail des dépenses réservé au Fondateur / Comptable.')}</tbody></table>`;

    const staffRows=[];
    if(full){
      d.payroll.forEach(x=>staffRows.push(`<tr><td>Salaire</td><td>${escD(x.id||'—')}</td><td><b>${escD(staffName(x.staff))}</b></td><td>${escD(x.mode||'—')}</td><td class="money"><b>${fmtD(x.net||x.amount)}</b></td><td>${escD(x.ref||'—')}</td></tr>`));
      d.loans.forEach(x=>staffRows.push(`<tr><td>${escD(x.type||'Avance / prêt')}</td><td>${escD(x.id||'—')}</td><td><b>${escD(staffName(x.staff))}</b></td><td>${escD(x.mode||'—')}</td><td class="money"><b>${fmtD(x.amount)}</b></td><td>${escD(x.ref||'—')}</td></tr>`));
    }
    const staffTable=`<table><thead><tr><th>Nature</th><th>N°</th><th>Personnel</th><th>Mode</th><th class="money">Montant</th><th>Référence</th></tr></thead><tbody>${full?(staffRows.join('')||emptyRow(6,'Aucun salaire, avance ou prêt décaissé ce jour.')):emptyRow(6,'Détail RH financier réservé au Fondateur / Comptable.')}</tbody></table>`;

    const transferTable=`<table><thead><tr><th>Heure</th><th>N°</th><th>Depuis</th><th>Vers</th><th>Pôle</th><th class="money">Montant</th><th>Référence</th><th>Nature</th><th>Agent</th></tr></thead><tbody>${d.transfers.length?d.transfers.map(x=>`<tr><td>${createdTime(x)}</td><td>${escD(x.id||'—')}</td><td>${escD(x.from||'—')}</td><td>${escD(x.to||'—')}</td><td>${escD(transferPoleText(x))}</td><td class="money"><b>${fmtD(x.amount)}</b></td><td>${escD(x.ref||'—')}</td><td>${escD(x.kind||'Transfert interne')}</td><td>${escD(x.agent||'—')}</td></tr>`).join(''):emptyRow(9,'Aucun transfert ce jour.')}</tbody></table>`;

    const closingTable=`<table><thead><tr><th>Pôle</th><th>N° clôture</th><th class="money">Entrées espèces</th><th class="money">Sorties espèces</th><th class="money">Disponible théorique</th><th class="money">Compté</th><th class="money">Remis / versé</th><th class="money">Reste</th><th class="money">Écart</th><th>Observation</th></tr></thead><tbody>${d.closings.length?d.closings.map(c=>`<tr><td><b>${escD(c.pole||'Clôture globale')}</b></td><td>${escD(c.id||'—')}</td><td class="money">${fmtD(c.cashIn)}</td><td class="money">${fmtD(c.cashOut)}</td><td class="money">${fmtD(c.availableBefore??c.theoretical)}</td><td class="money">${fmtD(c.countedBefore??c.actual)}</td><td class="money">${fmtD(c.remittanceAmount)}</td><td class="money">${fmtD(c.actual)}</td><td class="money"><b class="${Math.abs(money(c.difference))>.01?'djr-bad-text':'djr-ok-text'}">${fmtD(c.difference)}</b></td><td>${escD(c.note||'—')}</td></tr>`).join(''):emptyRow(10,'Aucune clôture enregistrée pour cette journée.')}</tbody></table>`;

    const supplyTable=`<table><thead><tr><th>Heure</th><th>Matricule</th><th>Étudiant</th><th>Programme</th><th>Rame(s)</th><th>Marqueur(s)</th><th>Agent</th><th>Observation</th></tr></thead><tbody>${d.supplies.length?d.supplies.map(x=>`<tr><td>${createdTime(x)}</td><td>${escD(x.student||'—')}</td><td><b>${escD(x.studentName||studentOf(x.student)?.name||'—')}</b></td><td>${escD(x.program||studentOf(x.student)?.program||'—')}</td><td>${money(x.reams)}</td><td>${money(x.markers)}</td><td>${escD(x.agent||'—')}</td><td>${escD(x.obs||'—')}</td></tr>`).join(''):emptyRow(8,'Aucune remise de fournitures ce jour.')}</tbody></table>`;

    host.innerHTML=`<div id="dailyDetailedReportPrintArea">
      <div class="card djr-head"><div><div class="djr-eyebrow">EIAFC • Bilan journalier détaillé</div><h2>${escD(activeSchoolLabel())}</h2><div class="small">Journée du <b>${escD(date)}</b> • Année ${escD(activeYearLabel())} • Généré le ${new Date().toLocaleString('fr-FR')}</div></div><div class="djr-state ${d.closings.length?'closed':'open'}">${d.closings.length?'Journée clôturée':'Journée ouverte'}</div></div>
      <div class="grid kpis djr-kpis">${kpis.map(x=>`<div class="card kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('')}</div>
      <div class="card djr-checks"><div class="section-title"><h3>🔎 Contrôle de cohérence</h3></div>${checks.map(x=>`<div class="djr-check ${x.level}">${x.level==='ok'?'✅':x.level==='bad'?'⛔':x.level==='warn'?'⚠️':'ℹ️'} ${escD(x.text)}</div>`).join('')}</div>
      <div class="djr-two">${tableSection('Répartition par canal','Entrées, sorties et transferts de la journée',modeTable)}${tableSection('Répartition par pôle','BTS, Formation qualifiante, Licence, Master…',poleTable)}</div>
      ${tableSection('🎓 Étudiants saisis pendant la journée',`${d.students.length} nouveau(x) dossier(s) • la colonne “Versé ce jour” reprend uniquement les paiements validés du ${date}`,studentTable)}
      ${tableSection('💳 Tous les versements étudiants',`${d.payments.length} saisie(s), dont ${d.validPays.length} validée(s)`,paymentTable)}
      ${tableSection('➕ Autres recettes','Recettes hors versements étudiants',otherTable)}
      ${tableSection('🧾 Dépenses réglées','Décaissements fournisseurs réellement payés pendant la journée',expenseTable)}
      ${tableSection('👔 Salaires, avances et prêts','Décaissements RH de la journée',staffTable)}
      ${tableSection('🔄 Transferts de trésorerie','Caisse, Fondateur, Banque et Mobile Money',transferTable)}
      ${tableSection('📦 Rames & marqueurs reçus','Remises de fournitures enregistrées pendant la journée',supplyTable)}
      ${tableSection('🔒 Clôture(s) de la journée','Montants comptés, remis et écarts constatés',closingTable)}
      <div class="djr-foot">Document de contrôle interne EIAFC • Les transferts internes sont séparés des recettes et dépenses pour éviter le double comptage.</div>
    </div>`;
  }

  function csvQuote(v){return `"${String(v??'').replace(/"/g,'""')}"`}
  function exportDailyDetailedCSV(){
    const date=document.getElementById('dailyDetailedReportDate')?.value||todayD(),d=dayData(date),rows=[];
    d.students.forEach(s=>rows.push(['INSCRIPTION',date,createdTime(s),s.matricule,s.name,s.program||'',s.track||'',0,'','',s.createdBy||'','Dossier étudiant saisi']));
    d.payments.forEach(p=>{const st=studentOf(p.student);rows.push(['PAIEMENT ETUDIANT',date,createdTime(p),p.receipt||'',st?.name||p.student,st?.program||'',p.type||'',money(p.amount),p.mode||'',p.ref||'',p.agent||'',p.status||''])});
    d.others.forEach(x=>rows.push(['AUTRE RECETTE',date,createdTime(x),x.receipt||'',x.label||x.type||'',x.program||x.service||'',x.type||'',money(x.amount),x.mode||'',x.ref||'',x.agent||'',x.status||'']));
    if(fullFinanceAccess()){
      d.expenses.forEach(x=>{const e=expenseParent(x);rows.push(['DEPENSE',date,createdTime(x),x.id||x.expenseId||'',e?.beneficiary||e?.label||e?.category||'',e?.program||e?.service||'',e?.category||'',-money(x.amount),x.mode||'',x.ref||'',x.agent||e?.agent||'','Payé'])});
      d.payroll.forEach(x=>rows.push(['SALAIRE',date,createdTime(x),x.id||'',staffName(x.staff),x.program||'',x.month||'',-money(x.net||x.amount),x.mode||'',x.ref||'',x.agent||'','Payé']));
      d.loans.forEach(x=>rows.push(['AVANCE/PRET',date,createdTime(x),x.id||'',staffName(x.staff),x.program||'',x.type||'',-money(x.amount),x.mode||'',x.ref||'',x.agent||'',x.status||'']));
    }
    d.transfers.forEach(x=>rows.push(['TRANSFERT',date,createdTime(x),x.id||'',`${x.from||''} -> ${x.to||''}`,x.pole||'',x.kind||'Transfert',money(x.amount),`${x.from||''} -> ${x.to||''}`,x.ref||'',x.agent||'',x.status||'']));
    const head=['Nature','Date','Heure','Numero','Etudiant_Beneficiaire','Programme','Detail','Montant_FCFA','Mode_Canal','Reference','Agent','Statut_Observation'];
    const csv='\ufeff'+[head,...rows].map(r=>r.map(csvQuote).join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EIAFC_Bilan_Journalier_${date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function printDailyDetailed(){
    const area=document.getElementById('dailyDetailedReportPrintArea');if(!area)return;
    const w=window.open('','_blank','noopener,noreferrer,width=1200,height=850');if(!w)return alert('Autorisez les fenêtres pop-up pour imprimer le bilan journalier.');
    const css=`body{font-family:Arial,sans-serif;color:#17212b;margin:18px}h2,h3{color:#12304a}h2{margin:3px 0}.card{border:1px solid #d9e1e8;border-radius:8px;padding:12px;margin:10px 0}.grid{display:grid;gap:8px}.kpis{grid-template-columns:repeat(4,1fr)}.kpi .label{font-size:10px;text-transform:uppercase;color:#667085}.kpi .value{font-size:17px;font-weight:800;color:#12304a}.small,.sub{font-size:10px;color:#667085}.djr-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.table-wrap{overflow:visible}table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #d9e1e8;padding:5px;text-align:left}th{background:#edf3f7}.money{text-align:right}.status{font-weight:700}.djr-head{display:flex;justify-content:space-between}.djr-state{font-weight:800}.djr-check{padding:5px;margin:4px 0;border:1px solid #ddd}.djr-foot{text-align:center;font-size:9px;margin-top:15px}@media print{.card{break-inside:avoid}.djr-section{break-inside:auto}table{break-inside:auto}tr{break-inside:avoid}.djr-two{break-inside:avoid}}`;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bilan journalier EIAFC</title><style>${css}</style></head><body>${area.outerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);w.document.close();
  }

  function setDateAndRender(date){const input=document.getElementById('dailyDetailedReportDate');if(input)input.value=date;renderDailyDetailedReport()}

  function injectUI(){
    if(document.getElementById(VIEW_ID))return;
    const view=document.createElement('section');view.id=VIEW_ID;view.className='view';view.innerHTML=`
      <div class="card djr-toolbar-card">
        <div class="section-title"><div><h3>📅 Bilan journalier détaillé</h3><span class="small">Toutes les opérations de la journée, les étudiants saisis et les montants versés.</span></div></div>
        <div class="toolbar"><label class="small"><b>Date du bilan</b></label><input type="date" id="dailyDetailedReportDate"><button class="btn btn-light" id="djrTodayBtn" type="button">Aujourd'hui</button><button class="btn btn-primary" id="djrRefreshBtn" type="button">Actualiser</button><button class="btn btn-light" id="djrPrintBtn" type="button">🖨 Imprimer / PDF</button><button class="btn btn-light" id="djrCsvBtn" type="button">⬇ Exporter CSV</button></div>
      </div><div id="dailyDetailedReportBody"></div>`;
    const main=document.querySelector('.main');if(main)main.appendChild(view);else document.body.appendChild(view);

    const nav=document.createElement('button');nav.id=NAV_ID;nav.type='button';nav.className='nav-btn';nav.dataset.view=VIEW_ID;nav.dataset.perm='cash';nav.innerHTML='📅 Bilan journalier';
    const anchor=document.querySelector('.nav-btn[data-view="closing"]')||document.querySelector('.nav-btn[data-view="cash"]')||document.querySelector('.nav-btn[data-view="reports"]');
    if(anchor)anchor.insertAdjacentElement('afterend',nav);else document.querySelector('.sidebar')?.appendChild(nav);

    nav.addEventListener('click',()=>{
      if(!canSeeModule())return alert('Votre rôle ne permet pas de consulter le bilan journalier financier.');
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
      nav.classList.add('active');view.classList.add('active');
      const t=document.getElementById('pageTitle');if(t)t.textContent='Bilan journalier détaillé';
      renderDailyDetailedReport();
    });
    document.getElementById('dailyDetailedReportDate').value=todayD();
    document.getElementById('djrTodayBtn').addEventListener('click',()=>setDateAndRender(todayD()));
    document.getElementById('djrRefreshBtn').addEventListener('click',renderDailyDetailedReport);
    document.getElementById('djrPrintBtn').addEventListener('click',printDailyDetailed);
    document.getElementById('djrCsvBtn').addEventListener('click',exportDailyDetailedCSV);
    document.getElementById('dailyDetailedReportDate').addEventListener('change',renderDailyDetailedReport);
    updateAccess();
  }

  function injectStyle(){
    if(document.getElementById('eiafc-daily-report-style'))return;
    const s=document.createElement('style');s.id='eiafc-daily-report-style';s.textContent=`
      #${VIEW_ID}{padding-bottom:40px}.djr-toolbar-card{border-left:5px solid var(--gold)}.djr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-left:5px solid var(--navy)}.djr-eyebrow{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--gold)}.djr-head h2{margin:5px 0;color:var(--navy)}.djr-state{padding:8px 12px;border-radius:999px;font-size:12px;font-weight:900;white-space:nowrap}.djr-state.closed{background:#e6f4ea;color:#166534}.djr-state.open{background:#fff4cc;color:#8a5b00}.djr-kpis{margin-top:14px}.djr-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.djr-section{margin-top:14px}.djr-section .table-wrap{max-height:480px}.djr-checks{margin-top:14px}.djr-check{padding:9px 11px;border-radius:9px;margin:7px 0;font-size:12px}.djr-check.ok{background:#e6f4ea;color:#166534;border:1px solid #b7dfc7}.djr-check.warn{background:#fff4cc;color:#8a5b00;border:1px solid #ead58b}.djr-check.bad{background:#fde8e7;color:#9b1c1c;border:1px solid #f3c6c2}.djr-check.info{background:#edf5ff;color:#1e40af;border:1px solid #bfdbfe}.djr-bad-text{color:var(--red)}.djr-ok-text{color:var(--green)}.djr-foot{text-align:center;color:var(--muted);font-size:11px;margin:18px 0}.djr-section table{min-width:1000px}@media(max-width:1000px){.djr-two{grid-template-columns:1fr}.djr-head{flex-direction:column}.djr-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.djr-kpis{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function updateAccess(){const n=document.getElementById(NAV_ID);if(n)n.classList.toggle('hidden',!canSeeModule())}

  injectStyle();injectUI();
  setInterval(updateAccess,2500);
  window.eiafcRenderDailyDetailedReport=renderDailyDetailedReport;
  window.eiafcExportDailyDetailedCSV=exportDailyDetailedCSV;
  window.eiafcPrintDailyDetailed=printDailyDetailed;
})();
