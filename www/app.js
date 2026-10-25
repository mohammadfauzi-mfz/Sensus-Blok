const KAT=['Normal','Sisip','Pokok Gajah','Buah Aborsi','Kerdil Genetik','Double Tone','Abnormal lain'];
const HAMA=['Ulat Api','Ulat Kantong','Tikus','Kumbang Tanduk','Rayap','Ganoderma','Busuk Pangkal Batang','Lainnya (ketik)'];
const TYPES={
  pokok:{n:'Sensus Pokok',f:[
    {k:'kat',l:'Kategori Pokok',t:'sel',o:KAT},
    {k:'ket',l:'Keterangan abnormal lain',t:'text',w:['kat','Abnormal lain']}]},
  bbc:{n:'Sensus BBC',f:[
    {k:'jjg',l:'Jumlah Janjang',t:'num'},
    {k:'jantan',l:'Ada Bunga Jantan?',t:'yn'}]},
  verif:{n:'Verifikasi BBC',f:[
    {k:'bbc1',l:'Tulisan Janjang BBC1 di Pokok',t:'bbc'},
    {k:'bbc2',l:'Tulisan Janjang BBC2 di Pokok',t:'bbc'},
    {k:'bbc3',l:'Tulisan Janjang BBC3 di Pokok',t:'bbc'},
    {k:'hitung',l:'Janjang Hitung Verifikasi',t:'num'}]},
  hama:{n:'Sensus Hama dan Penyakit',f:[{k:'jml',l:'Jumlah',t:'num'}]}
};
const MENU=[['pokok','1. Sensus Pokok'],['bbc','2. Sensus BBC'],['verif','3. Verifikasi BBC'],['hama','4. Sensus Hama dan Penyakit'],['custom','5. Lainnya (Tambah Sensus Custom)']];
const HL={tgl:'Tanggal Sensus',estate:'Estate',afd:'Afdeling',blok:'Blok',baris:'Baris',arah:'Arah Masuk',petugas:'Nama Petugas Sensus'};

const $=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const S=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const GPS_MAX=15;   // GPS dianggap terkunci (siap) bila akurasi ≤ 15 m
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const slug=x=>String(x).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const ONL=['osm','esri','google'];
let rekSel=0,setSub='umum',mapAfter=null,mapsList=[],lastInfo={n:0,ph:0,pts:[]},hdg=null,compOK=false,hdgT=0,mapT=0,nativeInfo=null,updInfo=null,crashNote='',legRaw=[],layers=[],LLy=null,LMm=null,meas={mode:null,kind:'dist',pts:[],find:null},pending=null,hint='',pvT=0,onl=false,mapErr='',LM=null,LL=null,userL=null,mapRec=null,mv=null,ref={lat:0,lon:0},mf={map:'',gt:'roadmap',off:{},hide:{},jenis:'',by:'jenis',blok:'',tgl:'',ph:true,me:true},gU=[],draft=null,galData=[],gf={f:'all',q:''},lxRaw=null,lxK=+LS('luxk',1)||1,stk=[],va=null,sessions=LS('sessions',[]),customs=LS('customs',[]),hdr=LS('hdr',{}),view='home',cur=null,pg=null,run=null,fdef=null,sel={type:'pokok',jenis:HAMA[0],cid:''};
const plug=n=>{const C=window.Capacitor;if(!C)return null;return(C.Plugins&&C.Plugins[n])||(C.registerPlugin?C.registerPlugin(n):null)};
const un=s=>s.def.u||'Pokok',ul=s=>un(s).toLowerCase(),lab=f=>f.l+(f.s?` (${f.s})`:'');
const title=s=>s.def.n+(s.extra?' – '+s.extra:'');
const hinfo=s=>{const h=s.h;return `Tanggal: ${h.tgl}\nEstate: ${h.estate}\nAfdeling: ${h.afd}\nBlok: ${h.blok}\nBaris: ${h.baris}\nArah Masuk: ${h.arah}\nPetugas: ${h.petugas}`};

/* ---------- GPS ---------- */
function gpsInit(){
  Promise.resolve().then(()=>plug('Geolocation').requestPermissions()).catch(()=>{}).then(()=>{
    navigator.geolocation.watchPosition(
      p=>{cur={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy};if(!compOK&&p.coords.heading!=null&&!isNaN(p.coords.heading)&&p.coords.speed>1.2)compSet(p.coords.heading);gpsUi();liveUpdate()},
      e=>{cur=null;gpsUi(e.message)},
      {enableHighAccuracy:true,maximumAge:0,timeout:20000});
  });
}
function gpsUi(err){
  const ok=cur&&cur.acc<=GPS_MAX,el=$('#gps');
  if(el){
    el.className='chip '+(ok?'ok':'bad');
    el.textContent=cur?`GPS ±${cur.acc.toFixed(1)} m ${ok?'✓ siap':`(tunggu ≤ ${GPS_MAX} m)`}`:(err?'GPS error: '+err:'Mencari GPS…');
  }
  const m=$('#mulai');if(m)m.disabled=!ok;
  if(view=='map'&&LM)userDraw();
  slUi();
}
function coUi(){
  const el=$('#co');if(!el)return;
  const html=(pg&&pg.lat!==''?`📍 ${(+pg.lat).toFixed(6)}, ${(+pg.lon).toFixed(6)} (±${(+pg.acc).toFixed(1)} m)`:'📍 Koordinat belum tersedia')+'<br>'+(pg&&pg.lux!==''&&pg.lux!=null?`☀ ${pg.lux} lux`:'☀ Lux belum tersedia')+'<br>'+(pg&&pg.hdg!=null?`🧭 Arah hadap ${pg.hdg}° ${card8(pg.hdg)}`:'🧭 Kompas belum tersedia');
  if(el._h!==html){el._h=html;el.innerHTML=html}
}

/* ---------- Layout & navigasi ---------- */
const PT=()=>LS('pt','PT. Bima Palma Nugraha');
const GEAR='<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
const INFO='<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
function show(t,sub,html,o={}){
  const top=['home','gal','map','hist','rekap'].includes(view);
  $('#hd').innerHTML=(o.back?`<button onclick="history.back()">←</button>`:'')+`<h1>${E(top?'SENSUS BLOK':t)}<small>${E(top?PT():sub||'')}</small></h1>`+(view=='about'||view=='run'?'':`<button class="ib" onclick="go('settings')" aria-label="Pengaturan">${GEAR}</button><button class="ib" onclick="go('about')" aria-label="Informasi">${INFO}</button>`);
  gU.forEach(u=>URL.revokeObjectURL(u));gU=[];
  const ap=$('#app');ap.innerHTML=html;ap.className=o.flush?'flush':'';
  const b=$('#bar');b.style.display=o.bar?'flex':'none';b.style.pointerEvents='';b.innerHTML=o.bar||'';
  document.body.style.paddingBottom=o.bar?'90px':'20px';document.body.style.overflow=o.flush?'hidden':'';
  scrollTo(0,0);
}
function go(v,a,np){
  if(view=='home'&&$('#h_estate'))readHdr();
  if(!np){stk.push([view,va]);history.pushState({},'')}
  if(LM&&v!='map'){try{LM.remove()}catch(e){}LM=null;userL=null;LMm=null;LLy=null}
  view=v;va=a;
  ({home,run:runPage,rekap:rekapView,hist:histView,custom:customView,about:aboutView,edit:editView,gal:galView,photo:photoView,map:mapView,settings:settingsView})[v](a);
}
onpopstate=()=>{
  if(!stk.length)return;
  if(view=='run'&&!confirm('Keluar dari halaman sensus? '+un(run)+' yang sudah di-Next tetap tersimpan dan bisa dilanjutkan dari Riwayat.')){history.pushState({},'');return}
  const [v,a]=stk.pop();go(v,a,true);
};

/* ---------- Beranda ---------- */
function readHdr(){
  const h={};for(const k in HL)h[k]=($('#h_'+k).value||'').trim();
  hdr=h;S('hdr',{...h,tgl:undefined});return h;
}
function home(){
  const h=hdr;
  show('','',`${tabs('home')}<div id="bn">${banners()}</div>
  <div class="card"><div class="chips"><span id="gps" class="chip bad">Mencari GPS…</span><span id="lux" class="chip bad">☀ …</span><span id="hdgT" class="chip bad">🧭 …</span></div>
  <details style="margin-top:8px"><summary class="m">Kalibrasi lux</summary><div id="lk" class="m"></div>
  <label>Isi lux dari alat ukur referensi (dekatkan sensor HP ke alat)</label><input id="lref" type="number" inputmode="decimal" placeholder="mis. 500">
  <div class="row"><button class="b" onclick="calLux()">Kalibrasi</button><button class="b gray" onclick="resetLux()">Reset</button></div></details></div>
  <div class="card">${Object.entries(HL).map(([k,l])=>`<label${k=='tgl'?' style="margin-top:0"':''}>${l}</label><input id="h_${k}" type="${k=='tgl'?'date':'text'}" value="${E(h[k]||(k=='tgl'?today():''))}">`).join('')}</div>
  <div class="card"><b>Pilihan Menu</b>
  ${MENU.map(([v,l])=>`<label class="opt"><input type="radio" name="menu" ${sel.type==v?'checked':''} onchange="sel.type='${v}';ex()"> ${l}</label>`).join('')}
  <div id="ex"></div></div>`,
  {bar:`<button id="mulai" class="b" disabled onclick="mulai()">MULAI</button>`});
  ex();gpsUi();luxUi();compUi();
}
function ex(){
  const el=$('#ex');
  if(sel.type=='hama'){
    el.innerHTML=`<label>Jenis Hama / Penyakit</label><select onchange="sel.jenis=this.value;ex()">${HAMA.map(o=>`<option ${o==sel.jenis?'selected':''}>${o}</option>`).join('')}</select>${sel.jenis==HAMA[HAMA.length-1]?'<input id="jx" placeholder="Ketik jenis hama / penyakit" style="margin-top:8px">':''}`;
  }else if(sel.type=='custom'){
    el.innerHTML=(customs.length?`<label>Pilih Sensus Custom</label><select onchange="sel.cid=this.value">${customs.map(c=>`<option value="${c.id}" ${c.id==sel.cid?'selected':''}>${E(c.n)}</option>`).join('')}</select>`:'<p class="m">Belum ada sensus custom.</p>')+`<div class="row"><button class="b gray" onclick="go('custom')">Kelola / Tambah Sensus Custom</button></div>`;
  }else el.innerHTML='';
}
function mulai(){
  const h=readHdr(),miss=Object.keys(HL).filter(k=>!h[k]).map(k=>HL[k]);
  if(miss.length)return alert('Lengkapi dulu: '+miss.join(', '));
  let def,extra='';
  if(sel.type=='custom'){def=customs.find(x=>x.id==sel.cid)||customs[0];if(!def)return alert('Buat sensus custom dulu.')}
  else def=TYPES[sel.type];
  if(sel.type=='hama'){extra=sel.jenis==HAMA[HAMA.length-1]?$('#jx').value.trim():sel.jenis;if(!extra)return alert('Ketik jenis hama / penyakit.')}
  const s={id:Date.now(),type:sel.type,def:{n:def.n,f:def.f,u:def.u},h,extra,recs:[],done:false};
  sessions.unshift(s);S('sessions',sessions);go('run',s.id);
}

/* ---------- Form generik ---------- */
function formHTML(def,d={}){
  fdef=def;
  return def.f.map(f=>{
    const v=d[f.k];let h='';
    if(f.t=='num')h=`<label>${E(lab(f))}</label><input type="number" inputmode="numeric" min="0" name="${f.k}" value="${E(v??'')}" placeholder="0">`;
    else if(f.t=='text')h=`<label>${E(f.l)}</label><input name="${f.k}" value="${E(v??'')}">`;
    else if(f.t=='bbc')h=`<label>${E(f.l)}</label><input type="number" inputmode="numeric" min="0" name="${f.k}" value="${E(v??'')}" placeholder="0"><label class="opt"><input type="checkbox" name="${f.k}_nf" ${d[f.k+'_nf']?'checked':''}> Tidak ditemukan</label>`;
    else{
      const os=f.t=='yn'?['Ya','Tidak']:f.o,cv=v??(f.t=='yn'?'Tidak':os[0]);
      h=`<label>${E(f.l)}</label>`+os.map(o=>`<label class="opt"><input type="radio" name="${f.k}" value="${E(o)}" ${o==cv?'checked':''} onchange="vis()"> ${E(o)}</label>`).join('');
    }
    return `<div id="w_${f.k}">${h}</div>`;
  }).join('');
}
function vis(){
  for(const f of fdef.f)if(f.w){
    const c=document.querySelector(`input[name="${f.w[0]}"]:checked`);
    $('#w_'+f.k).style.display=c&&c.value==f.w[1]?'':'none';
  }
}
function readForm(def){
  const d={},q=n=>document.querySelector(`[name="${n}"]`);
  for(const f of def.f){
    if(f.t=='sel'||f.t=='yn'){const c=document.querySelector(`input[name="${f.k}"]:checked`);d[f.k]=c?c.value:''}
    else if(f.t=='bbc'){d[f.k]=q(f.k).value===''?0:+q(f.k).value;d[f.k+'_nf']=q(f.k+'_nf').checked}
    else if(f.t=='num')d[f.k]=q(f.k).value===''?0:+q(f.k).value;
    else d[f.k]=(f.w&&d[f.w[0]]!==f.w[1])?'':q(f.k).value.trim();
  }
  return d;
}

/* ---------- Halaman sensus (1 halaman = 1 pokok) ---------- */
function runPage(id){
  if(id)run=find(id);
  const s=run,n=nextNo(s);
  pg=cur?{...cur}:{lat:'',lon:'',acc:''};pg.lux=luxVal();pg.hdg=hdg==null?null:Math.round(hdg);draft=null;
  show(title(s),`Blok ${s.h.blok} · ${s.h.petugas}`,`
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">${E(un(s))} No. ${n}</h2><button class="b" style="background:#f57c00;padding:6px 10px;font-size:12px;width:auto;flex:none;min-height:0;${s.recs.length?'':'opacity:.4'}" ${s.recs.length?'':'disabled'} onclick="backRec()">↶ ${E(un(s))} sebelumnya</button></div>
  <div id="co" class="m"></div>
  <div class="m" style="margin-top:4px">Koordinat &amp; lux terus diperbarui. Nilai akhir diambil saat menekan NEXT / FINISH.</div>
  ${formHTML(s.def,prefill||{})}</div>
  <div class="card"><b>Foto ${E(un(s))}</b>
  <div class="row"><button id="fbtn" class="b" onclick="ambilFoto()">📷 Ambil Foto</button></div>
  <canvas id="pv" class="pv" style="display:none"></canvas>
  <label>Keterangan foto</label><input id="ket" placeholder="Keterangan foto (opsional)" oninput="pvUpdate()"></div>`,
  {back:1,bar:`<button class="b" style="background:var(--r)" onclick="fin()">FINISH</button><button class="b" onclick="nxt()">NEXT ▶</button>`});
  prefill=null;coUi();vis();
}
let prefill=null;
async function backRec(){
  const s=run;if(!s||!s.recs.length)return;
  const r=s.recs.reduce((a,b)=>(+b.no>+a.no?b:a)),no=r.no;
  if(!confirm(`Kembali ke ${un(s)} No. ${no}?\n\nData dan foto ${un(s)} No. ${no} akan DIHAPUS, lalu Anda mengisi ulang (isian lama ditampilkan kembali, foto harus diambil ulang).`))return;
  lock();
  prefill=r.d||null;
  s.recs=s.recs.filter(x=>x!==r);S('sessions',sessions);
  try{await pDel(s.id+'_'+no)}catch(e){logE('back','foto gagal dihapus: '+(e&&e.message||e))}
  galData=galData.filter(x=>x.id!=s.id+'_'+no);
  runPage();
}
const cb=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));
const lock=()=>{$('#bar').style.pointerEvents='none'};
function liveUpdate(){
  if(view!='run'||!pg)return;
  const lx=luxVal();
  pg={lat:cur?cur.lat:pg.lat,lon:cur?cur.lon:pg.lon,acc:cur?cur.acc:pg.acc,lux:lx===''?pg.lux:lx,hdg:hdg==null?pg.hdg:Math.round(hdg)};
  coUi();
  if(draft&&!pvT)pvT=setTimeout(()=>{pvT=0;pvUpdate()},2500);
}
async function saveCur(){
  liveUpdate();const g={...pg};
  const s=run,no=nextNo(s),ket=($('#ket')||{value:''}).value.trim(),d=readForm(s.def);
  s.recs.push({no,lat:g.lat,lon:g.lon,acc:g.acc,lux:g.lux,hdg:g.hdg==null?null:g.hdg,t:new Date().toISOString(),d});
  S('sessions',sessions);
  if(!draft)return;
  const c=wm(draft.base,wmLines(s,no,ket,draft.t,g,s.recs.length)),k=320/Math.max(c.width,c.height),tc=document.createElement('canvas');
  tc.width=Math.round(c.width*k);tc.height=Math.round(c.height*k);tc.getContext('2d').drawImage(c,0,0,tc.width,tc.height);
  const blob=await cb(c,.85),th=await cb(tc,.7),h=s.h;
  await pPut({id:s.id+'_'+no,sid:s.id,no,t:draft.t.toISOString(),tgl:h.tgl,jenis:title(s),unit:un(s),lat:g.lat,lon:g.lon,lux:g.lux,hdg:g.hdg==null?null:g.hdg,estate:h.estate,afd:h.afd,blok:h.blok,baris:h.baris,arah:h.arah,petugas:h.petugas,ket,blob,th});
}
let _ac=null;
function fb(){   // umpan balik NEXT: getar + bunyi "tut"
  try{const N=PM();if(N)N.buzz({ms:40}).catch(()=>{try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}});else navigator.vibrate&&navigator.vibrate(40)}catch(e){}
  try{
    const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
    _ac=_ac||new A();if(_ac.state=='suspended')_ac.resume();
    const o=_ac.createOscillator(),g=_ac.createGain(),t=_ac.currentTime;
    o.type='square';o.frequency.value=1500;g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);
    o.connect(g);g.connect(_ac.destination);o.start(t);o.stop(t+.1);
  }catch(e){}
}
async function nxt(){fb();lock();try{await saveCur()}catch(e){alert('Foto gagal disimpan: '+(e&&e.message||e))}runPage()}
function ask3(msg){
  return new Promise(res=>{
    const o=document.createElement('div');o.className='ov';
    o.innerHTML=`<div class="dlg"><p>${E(msg)}</p><div class="dbt"><button class="b gray" data-v="cancel">Cancel</button><button class="b" data-v="save">Ya, simpan juga yang sedang tampil</button><button class="b" style="background:var(--r)" data-v="skip">Ya, jangan simpan yang sedang tampil</button></div></div>`;
    o.onclick=e=>{const v=e.target.dataset&&e.target.dataset.v;if(v){o.remove();res(v)}};
    document.body.appendChild(o);
  });
}
async function fin(){
  const c=await ask3(`Selesaikan sensus? ${un(run)} No. ${nextNo(run)} sedang tampil.`);
  if(c=='cancel')return;
  lock();
  if(c=='save'){try{await saveCur()}catch(e){alert('Foto gagal disimpan: '+(e&&e.message||e))}}
  if(!run.recs.length){sessions=sessions.filter(x=>x!==run);S('sessions',sessions);stk.pop();go('home',0,true);return}
  run.done=true;S('sessions',sessions);go('rekap','one:'+run.id,true);
}

/* ---------- Rekap ---------- */
function rekapVerif(s){
  const n=s.recs.length,r2=x=>Math.round(x*100)/100,v=(r,k)=>+r.d[k]||0;
  const vt=s.recs.reduce((a,r)=>a+v(r,'hitung'),0),vp=n?vt/n:0,R=[['Jumlah '+ul(s),n]];
  const B=[1,2,3].map(k=>{const f=s.recs.filter(r=>!r.d['bbc'+k+'_nf']),t=f.reduce((a,r)=>a+v(r,'bbc'+k),0);return{k,t,c:f.length,p:f.length?t/f.length:0}});
  R.push(['Total JJG','']);B.forEach(b=>R.push(['BBC'+b.k,b.t]));R.push(['Verifikasi',vt]);
  R.push(['JJG/PKK','']);B.forEach(b=>R.push(['BBC'+b.k,b.c?r2(b.p):'-']));R.push(['Verifikasi',r2(vp)]);
  R.push(['Komparasi Vs Verifikasi','']);B.forEach(b=>R.push(['BBC'+b.k,b.p?Math.round(vp/b.p*100)+'%':'-']));
  return R;
}
function rekapLines(s){
  const R=rekapBase(s),v=s.recs.map(r=>r.lux).filter(x=>x!==''&&x!=null&&!isNaN(x));
  if(v.length)R.push(['Rata-rata Lux',Math.round(v.reduce((a,b)=>a+ +b,0)/v.length)]);
  return R;
}
function rekapBase(s){
  if(s.type=='verif')return rekapVerif(s);
  const n=s.recs.length,R=[['Jumlah '+ul(s),n]];
  const p=(a,b)=>b?(a/b*100).toFixed(1)+'%':'-',r2=x=>Math.round(x*100)/100;
  for(const f of s.def.f){
    const v=s.recs.map(r=>r.d[f.k]);
    if(f.t=='num'){const t=v.reduce((a,b)=>a+(+b||0),0);R.push(['Total '+lab(f),r2(t)],['Rata-rata/'+ul(s)+' '+lab(f),n?r2(t/n):0])}
    else if(f.t=='sel')for(const o of f.o){const c=v.filter(x=>x==o).length;R.push([o,`${c} (${p(c,n)})`])}
    else if(f.t=='yn'){const c=v.filter(x=>x=='Ya').length;R.push([f.l+' = Ya',`${c} (${p(c,n)})`])}
  }
  return R;
}
const waText=s=>`*REKAP ${title(s).toUpperCase()}*\n${PT()}\n${hinfo(s)}\n*Volume disensus: ${s.recs.length} ${ul(s)}*\n`+rekapLines(s).map(([l,v])=>v===''?`\n*${l}*`:`${l}: ${v}`).join('\n');
const summ=(s,r)=>s.def.f.map(f=>f.t=='bbc'&&r.d[f.k+'_nf']?'tdk ditemukan':r.d[f.k]).filter(v=>v!==''&&v!==undefined).join(' · ');
/* ---------- Rekap gabungan: pilih jenis sensus + blok (+ filter lain), sesi yang cocok digabung ---------- */
const nk=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
const uniq=a=>[...new Set(a.map(x=>String(x==null?'':x).trim()).filter(Boolean))];
const ftg=s=>s.ftgl||s.h.tgl;                    // tanggal aman untuk nama berkas
const rekF={jenis:'',blok:'',dari:'',sampai:'',petugas:'',baris:'',arah:'',estate:'',afd:''};
let rekEx={},rekOne=0,rekAll=false;
const REKX=[['petugas','Petugas'],['baris','Baris'],['arah','Arah masuk'],['estate','Estate'],['afd','Afdeling']];
function mergeSessions(list,key){
  const f=list[0],recs=[];
  list.forEach(s=>s.recs.forEach(r=>recs.push(Object.assign({},r,{_s:s}))));   // salinan: data asli tidak dimodifikasi
  const tg=uniq(list.map(s=>s.h.tgl)).sort(),j=(k,sep)=>{const m=new Map();list.forEach(s=>{const v=String(s.h[k]||'').trim();if(v&&!m.has(nk(v)))m.set(nk(v),v)});return[...m.values()].join(sep||', ')};
  return{id:key,ids:list.map(s=>s.id),n:list.length,type:f.type,def:f.def,extra:f.extra,done:list.every(s=>s.done),list,recs,
    h:{...f.h,tgl:tg.length>1?tg[0]+' s.d. '+tg[tg.length-1]:(tg[0]||''),estate:j('estate',' / '),afd:j('afd',' / '),blok:j('blok'),baris:j('baris'),arah:j('arah'),petugas:j('petugas')},
    ftgl:tg.length>1?tg[0]+'_sd_'+tg[tg.length-1]:(tg[0]||'')};
}
function rekapSel(){
  const all=sessions.slice().sort((a,b)=>a.id-b.id),jn=uniq(all.map(title));
  if(!jn.includes(rekF.jenis))rekF.jenis=jn[0]||'';
  const base=all.filter(s=>title(s)==rekF.jenis);
  const ok=s=>(!rekF.blok||nk(s.h.blok)==nk(rekF.blok))&&(!rekF.dari||s.h.tgl>=rekF.dari)&&(!rekF.sampai||s.h.tgl<=rekF.sampai)&&REKX.every(([k])=>!rekF[k]||nk(s.h[k])==nk(rekF[k]));
  const match=base.filter(ok),use=match.filter(s=>!rekEx[s.id]);
  const opt=k=>{const m=new Map();base.forEach(s=>{const v=String(s.h[k]||'').trim();if(v&&!m.has(nk(v)))m.set(nk(v),v)});return[...m.values()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))};
  return{jn,base,match,use,opt};
}
const find=id=>{
  if(typeof id=='string'&&id.startsWith('g:')){const u=rekapSel().use;return u.length?mergeSessions(u,id):null}
  return sessions.find(s=>s.id==id);
};
function rekSet(k,v){
  rekF[k]=v;rekEx={};rekAll=false;
  if(k=='jenis')Object.keys(rekF).forEach(x=>{if(x!='jenis')rekF[x]=''});
  rekapView();
}
function rekReset(){const j=rekF.jenis;Object.keys(rekF).forEach(x=>rekF[x]='');rekF.jenis=j;rekEx={};rekAll=false;rekapView()}
function rekTog(id){rekEx[id]=!rekEx[id];rekapView()}
function lihat(id){rekAll=false;go('rekap','one:'+id,true)}
function rekapView(key){
  const single=typeof key=='string'&&key.startsWith('one:');
  rekOne=single?+key.slice(4):0;
  if(!sessions.length){show('','',`${tabs('map')}${subtabs(single?'hist':'rekap')}<p class="m">Belum ada data sensus.</p>`);return}
  const SEL=single?null:rekapSel();
  let g;
  if(single){g=sessions.find(x=>x.id==rekOne);if(!g){rekOne=0;return rekapView()}}
  else g=SEL.use.length?mergeSessions(SEL.use,'g:cur'):null;
  const LIM=100,sel1=(k,lbl,cur,opts)=>`<label>${lbl}</label><select onchange="rekSet('${k}',this.value)"><option value="">Semua</option>${opts.map(o=>`<option value="${E(o)}" ${nk(o)==nk(cur)?'selected':''}>${E(o)}</option>`).join('')}</select>`;
  let head='';
  if(single)head=`<div class="card"><div class="row" style="margin-top:0"><button class="b gray" onclick="subTab('hist')">← Kembali ke Riwayat</button></div><div class="m" style="margin-top:6px">Menampilkan satu sesi sensus saja.</div></div>`;
  else{
    const act=['dari','sampai',...REKX.map(x=>x[0])].some(k=>rekF[k]);
    head=`<div class="card"><label style="margin-top:0">Jenis sensus</label><select onchange="rekSet('jenis',this.value)">${SEL.jn.map(j=>`<option value="${E(j)}" ${j==rekF.jenis?'selected':''}>${E(j)}</option>`).join('')}</select>
    ${sel1('blok','Blok',rekF.blok,SEL.opt('blok'))}
    <details style="margin-top:8px" ${act?'open':''}><summary class="m">Filter lainnya${act?' (aktif)':''}</summary>
    <label>Tanggal dari</label><input type="date" value="${E(rekF.dari)}" onchange="rekSet('dari',this.value)">
    <label>Tanggal sampai</label><input type="date" value="${E(rekF.sampai)}" onchange="rekSet('sampai',this.value)">
    ${REKX.map(([k,l])=>sel1(k,l,rekF[k],SEL.opt(k))).join('')}</details>
    <div class="row"><button class="b gray" onclick="rekReset()">Reset filter</button></div></div>
    <div class="card"><b>Sesi yang direkap (${SEL.use.length} dari ${SEL.match.length} sesi cocok)</b><div class="m">Hilangkan centang untuk mengeluarkan sesi tertentu dari rekap.</div>
    ${SEL.match.map(x=>`<label class="opt"><input type="checkbox" ${rekEx[x.id]?'':'checked'} onchange="rekTog(${x.id})"> ${E(x.h.tgl)} · Blok ${E(x.h.blok)} · Baris ${E(x.h.baris)} · ${E(x.h.petugas)} · ${x.recs.length} ${E(ul(x))}${x.done?'':' · belum selesai'}</label>`).join('')||'<p class="m">Tidak ada sesi yang cocok dengan filter.</p>'}</div>`;
  }
  if(!g){show('','',`${tabs('map')}${subtabs('rekap')}${head}`);return}
  const q=single?String(g.id):`'${g.id}'`,shown=rekAll?g.recs:g.recs.slice(-LIM),rk=single?`'one:${g.id}'`:'';
  show('','',`${tabs('map')}${subtabs(single?'hist':'rekap')}${head}
  <div class="card"><b>${E(title(g))}</b>${g.n>1?`<div class="m">Gabungan ${g.n} sesi sensus</div>`:''}
  <div class="m" style="margin-top:4px"><b>Volume disensus: ${g.recs.length} ${E(ul(g))}</b></div><div class="m">${E(hinfo(g))}</div>
  <table>${rekapLines(g).map(([l,v])=>v===''?`<tr><td colspan="2"><b>${E(l)}</b></td></tr>`:`<tr><td>${E(l)}</td><td class="r">${E(v)}</td></tr>`).join('')}</table></div>
  <div class="card"><div class="row" style="margin-top:0"><button class="b" onclick="shareXlsx(${q})">📊 Share Excel + Foto (WA)</button></div>
  <div class="row"><button class="b" onclick="shareReport(${q})">📤 Share Laporan + Peta Tracking (WA)</button></div>
  <div class="row"><button class="b gray" onclick="shareTxt(${q})">Share Rekap (WA Text)</button><button class="b" onclick="shareCSV(${q})">Share CSV (WA)</button></div>
  <div class="row"><button class="b gray" onclick="shareData(${JSON.stringify(g.ids||[g.id])})">Share Data Tim (.json)</button><button class="b gray" onclick="exportDlg('s'+${q})">🗺 Export GIS</button></div></div>
  <div class="card"><b>Koreksi Data</b>${!rekAll&&g.recs.length>LIM?`<div class="m">Menampilkan ${LIM} data terakhir dari ${g.recs.length}.</div><div class="row"><button class="b gray" onclick="rekAll=true;rekapView(${rk})">Tampilkan semua</button></div>`:''}${shown.map(r=>`<div class="item"><span><b>${E(un(g))} ${r.no}</b>${g.n>1?' · '+E(r._s.h.tgl):''} · ${E(summ(g,r))}</span><button class="b" onclick="go('edit','${(r._s||g).id}:${r.no}')">Koreksi</button></div>`).join('')||'<p class="m">Belum ada data.</p>'}</div>`);
}
const nextNo=s=>s.recs.reduce((m,r)=>Math.max(m,+r.no||0),0)+1,recBy=(s,no)=>s.recs.find(r=>r.no==no);
function editView(a){
  const [id,no]=a.split(':'),s=find(id),r=recBy(s,no);
  show('Koreksi '+un(s)+' '+no,title(s),`<div class="card"><div class="m">📍 ${(+r.lat).toFixed(6)}, ${(+r.lon).toFixed(6)}</div>${formHTML(s.def,r.d)}</div>`,
  {back:1,bar:`<button class="b gray" onclick="history.back()">BATAL</button><button class="b" style="background:var(--r)" onclick="delRec('${s.id}',${no})">HAPUS ${E(un(s).toUpperCase())}</button><button class="b" onclick="saveEdit('${s.id}',${no})">SIMPAN</button>`});
  vis();
}
function saveEdit(id,no){
  const s=find(id);recBy(s,no).d=readForm(s.def);S('sessions',sessions);
  history.back();
}
async function delRec(id,no){
  const s=find(id);if(!s||!recBy(s,no))return;
  if(!confirm(`HAPUS ${un(s).toUpperCase()} No. ${no}?\n\nData ${ul(s)} ini beserta fotonya akan dihapus permanen dan TIDAK BISA dikembalikan.\nNomor ${ul(s)} lain tidak berubah.`))return;
  s.recs=s.recs.filter(r=>r.no!=no);S('sessions',sessions);
  try{await pDel(s.id+'_'+no)}catch(e){logE('hapus','foto gagal dihapus: '+(e&&e.message||e))}
  galData=galData.filter(x=>x.id!=s.id+'_'+no);
  history.back();
}

/* ---------- CSV & Share WA ---------- */
function csv(s){
  const cols=['tanggal','estate','afdeling','blok','baris','arah_masuk','petugas','jenis_sensus','no_'+slug(un(s)),'latitude','longitude','akurasi_m','lux','arah_hadap','waktu'];
  const fk=[];for(const f of s.def.f){fk.push([f.k,slug(lab(f))]);if(f.t=='bbc')fk.push([f.k+'_nf',slug(f.l)+'_tdk_ditemukan'])}
  const q=x=>{x=String(x??'');return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
  const rows=[cols.concat(fk.map(x=>x[1]))].concat(s.recs.map(r=>
    [(r._s||s).h.tgl,(r._s||s).h.estate,(r._s||s).h.afd,(r._s||s).h.blok,(r._s||s).h.baris,(r._s||s).h.arah,(r._s||s).h.petugas,title(s),r.no,r.lat,r.lon,r.acc!==''?(+r.acc).toFixed(1):'',r.lux??'',r.hdg??'',r.t]
    .concat(fk.map(([k])=>{const v=r.d[k];return v===true?'Ya':v===false?'Tidak':v}))));
  return rows.map(r=>r.map(q).join(',')).join('\n');
}
async function shareTxt(id){
  const t=waText(find(id));
  try{await plug('Share').share({text:t,dialogTitle:'Bagikan Rekap'})}
  catch(e){if(!/cancel/i.test(e&&e.message||''))location.href='https://wa.me/?text='+encodeURIComponent(t)}
}
async function shareCSV(id){
  const s=find(id),name=`sensus_${slug(title(s))}_${slug(s.h.blok)}_${ftg(s)}.csv`;
  try{
    const r=await plug('Filesystem').writeFile({path:name,data:csv(s),directory:'CACHE',encoding:'utf8'});
    await sendFiles([r.uri],'', 'Bagikan CSV','text/csv');
  }catch(e){if(!/cancel/i.test(e&&e.message||''))alert('Gagal membagikan CSV: '+(e&&e.message||e))}
}


/* ---------- Excel (.xlsx) berisi rekap + data + foto, dibagikan lewat WA ---------- */
const xcol=i=>{let n=i,s='';do{s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)-1}while(n>=0);return s};
const xx=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',XR='http://schemas.openxmlformats.org/officeDocument/2006/relationships',XM='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
/* sheets: [{name,widths,rows:[[v | [v,gaya]]],heights:{barisIndex:pt},freeze:n,images:[{col,row,jpeg,w,h}]}]
   gaya: 0 biasa, 1 header, 2 teks (atas, bungkus), 3 tebal, 4 judul, 5 angka (atas) */
function xlsxBuild(sheets){
  const files=[],ct=[],wbS=[],wbR=[];let img=0,dn=0;
  const add=(n,t)=>files.push({name:n,data:u8(t)});
  sheets.forEach((sh,si)=>{
    const n=si+1,imgs=sh.images||[];
    let x=XH+`<worksheet xmlns="${XM}" xmlns:r="${XR}">`;
    if(sh.freeze)x+=`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    x+='<sheetFormatPr defaultRowHeight="15"/><cols>'+sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols><sheetData>';
    sh.rows.forEach((row,ri)=>{
      const ht=sh.heights&&sh.heights[ri];
      x+=`<row r="${ri+1}"${ht?` ht="${ht}" customHeight="1"`:''}>`;
      row.forEach((cell,ci)=>{
        let v=cell,st=0;if(Array.isArray(cell)){v=cell[0];st=cell[1]}
        if(v==null||v==='')return;
        const ref=xcol(ci)+(ri+1);
        if(typeof v=='number'&&isFinite(v))x+=`<c r="${ref}" s="${st}"><v>${v}</v></c>`;
        else x+=`<c r="${ref}" t="inlineStr" s="${st}"><is><t xml:space="preserve">${xx(v)}</t></is></c>`;
      });
      x+='</row>';
    });
    x+='</sheetData>'+(imgs.length?'<drawing r:id="rId1"/>':'')+'</worksheet>';
    add(`xl/worksheets/sheet${n}.xml`,x);
    ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    wbS.push(`<sheet name="${xx(sh.name.replace(/[\[\]\*\?\/\\:]/g,'-').slice(0,31))}" sheetId="${n}" r:id="rId${n}"/>`);
    wbR.push(`<Relationship Id="rId${n}" Type="${XR}/worksheet" Target="worksheets/sheet${n}.xml"/>`);
    if(imgs.length){
      const d=++dn;
      let dr=XH+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${XR}">`,
          rl=XH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
      imgs.forEach((im,k)=>{
        const m=++img,cx=Math.round(im.w*9525),cy=Math.round(im.h*9525);
        dr+=`<xdr:oneCellAnchor><xdr:from><xdr:col>${im.col}</xdr:col><xdr:colOff>38100</xdr:colOff><xdr:row>${im.row}</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k+2}" name="Gambar ${m}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${k+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
        rl+=`<Relationship Id="rId${k+1}" Type="${XR}/image" Target="../media/img${m}.jpg"/>`;
        files.push({name:`xl/media/img${m}.jpg`,data:im.jpeg});
      });
      add(`xl/drawings/drawing${d}.xml`,dr+'</xdr:wsDr>');
      add(`xl/drawings/_rels/drawing${d}.xml.rels`,rl+'</Relationships>');
      add(`xl/worksheets/_rels/sheet${n}.xml.rels`,XH+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${XR}/drawing" Target="../drawings/drawing${d}.xml"/></Relationships>`);
      ct.push(`<Override PartName="/xl/drawings/drawing${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
    }
  });
  const head=[];
  const ah=(n,t)=>head.push({name:n,data:u8(t)});
  ah('[Content_Types].xml',XH+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${ct.join('')}</Types>`);
  ah('_rels/.rels',XH+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${XR}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  ah('xl/workbook.xml',XH+`<workbook xmlns="${XM}" xmlns:r="${XR}"><sheets>${wbS.join('')}</sheets></workbook>`);
  ah('xl/_rels/workbook.xml.rels',XH+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbR.join('')}<Relationship Id="rId${sheets.length+1}" Type="${XR}/styles" Target="styles.xml"/></Relationships>`);
  ah('xl/styles.xml',XH+`<styleSheet xmlns="${XM}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  return zipMake(head.concat(files));
}
/* foto -> JPEG kecil untuk Excel (diproses satu per satu agar memori aman) */
async function xlPhoto(blob,maxSide,q,dispW,dispH){
  const bm=await createImageBitmap(blob),k=Math.min(1,maxSide/Math.max(bm.width,bm.height)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
  c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
  const asp=bm.width/bm.height;try{bm.close()}catch(e){}
  const b=await cb(c,q);c.width=0;
  if(!b)throw new Error('memori tidak cukup');
  let w=dispW,h=w/asp;if(h>dispH){h=dispH;w=h*asp}
  return{jpeg:new Uint8Array(await b.arrayBuffer()),w:Math.round(w),h:Math.round(h)};
}
function tabOf(s){
  const fk=[];
  for(const f of s.def.f){
    const nu=f.t=='num'||f.t=='bbc';
    fk.push([f.k,lab(f),nu]);
    if(f.t=='bbc')fk.push([f.k+'_nf',f.l+' tidak ditemukan',false]);
  }
  const cols=['Tanggal','Estate','Afdeling','Blok','Baris','Arah masuk','Petugas','Jenis sensus','No. '+un(s),'Latitude','Longitude','Akurasi (m)','Lux','Arah hadap (°)','Waktu'].concat(fk.map(x=>x[1]));
  const widths=[12,12,11,10,9,12,18,22,9,12,12,11,8,11,19].concat(fk.map(x=>Math.min(30,Math.max(12,x[1].length+3))));
  const nm=v=>{if(v===''||v==null)return '';const n=Number(v);return isFinite(n)?n:String(v)};
  const rows=s.recs.map(r=>{
    const h=(r._s||s).h;
    return [h.tgl,h.estate,h.afd,h.blok,h.baris,h.arah,h.petugas,title(s),r.no,nm(r.lat),nm(r.lon),r.acc!==''&&r.acc!=null?Math.round(+r.acc*10)/10:'',nm(r.lux),r.hdg==null?'':r.hdg,fmtDT(new Date(r.t))]
      .concat(fk.map(([k,,nu])=>{const v=r.d[k];return v===true?'Ya':v===false?'Tidak':nu?nm(v):(v==null?'':String(v))}));
  });
  return{cols,widths,rows};
}
async function writeBig(FS,path,bytes){
  const CH=3*262144;let uri=null;           // kelipatan 3 byte agar sambungan base64 sah
  for(let i=0;i<bytes.length;i+=CH){
    const b64=u8b64(bytes.subarray(i,i+CH));
    if(i==0)uri=(await FS.writeFile({path,data:b64,directory:'CACHE'})).uri;
    else await FS.appendFile({path,data:b64,directory:'CACHE'});
    await yieldUI();
  }
  return uri;
}
async function shareXlsx(id){
  const s=find(id),FS=plug('Filesystem'),SH=plug('Share');
  if(!s)return alert('Data rekap tidak ditemukan.');
  if(!FS||!SH)return alert('Fitur ini hanya tersedia di aplikasi Android.');
  try{
    busy('Menyiapkan data…');
    const sids=s.ids||[s.id],pm=new Map();
    for(const p of await pAll())if(sids.includes(p.sid))pm.set(p.sid+'_'+p.no,p);
    const T=tabOf(s),NC=T.cols.length+2,rows=[T.cols.map(c=>[c,1]).concat([['Keterangan foto',1],['Foto',1]])],heights={0:32},imgs=[],PW=240,PH=180;
    let done=0;const tot=s.recs.filter(r=>pm.has(((r._s||s).id)+'_'+r.no)).length,failed=[];
    for(let i=0;i<s.recs.length;i++){
      const r=s.recs[i],p=pm.get(((r._s||s).id)+'_'+r.no);
      const row=T.rows[i].map(v=>typeof v=='number'?[v,5]:[v,2]);
      row.push([p&&p.ket?p.ket:'',2],['',2]);
      if(p){
        busy(`Menyisipkan foto ${++done} dari ${tot}…`);
        try{
          const im=await xlPhoto(p.blob,560,.72,PW,PH);
          imgs.push({col:NC-1,row:i+1,jpeg:im.jpeg,w:im.w,h:im.h});
          heights[i+1]=Math.round(PH*.75+8);
        }catch(e){failed.push(r.no);logE('xlsx','foto '+r.no+' gagal: '+(e&&e.message||e))}
        await yieldUI();
      }
      rows.push(row);
    }
    /* sheet 1: ringkasan rekap (+ peta areal bila ada) */
    busy('Menyusun ringkasan…');
    const RW=[34,26,3],R=[[[`REKAP ${title(s).toUpperCase()}`,4]],[PT()],[]];
    hinfo(s).split('\n').forEach(l=>R.push([l]));
    R.push([]);
    for(const [l,v] of rekapLines(s))R.push(v===''?[[l,3]]:[l,[typeof v=='number'?v:String(v),5]]);
    if(s.n>1){R.push([]);R.push([['Sesi yang digabung',3]]);s.list.forEach(x=>R.push([`${x.h.tgl} · Baris ${x.h.baris} · ${x.h.petugas}`,`${x.recs.length} ${ul(x)}`]))}
    const rimgs=[];
    try{
      const mb=await areaBlob(s);
      if(mb){const im=await xlPhoto(mb,1000,.8,520,390);rimgs.push({col:3,row:1,jpeg:im.jpeg,w:im.w,h:im.h})}
    }catch(e){logE('xlsx','peta areal gagal: '+(e&&e.message||e))}
    busy('Membuat file Excel…');await yieldUI();
    const bytes=xlsxBuild([
      {name:'Rekap',widths:RW.concat([60]),rows:R,images:rimgs},
      {name:'Data',widths:T.widths.concat([30,34]),rows,heights,freeze:1,images:imgs}
    ]);
    const name=`sensus_${slug(title(s))}_${slug(s.h.blok)}_${ftg(s)}.xlsx`;
    busy('Menyiapkan berkas…');
    const uri=await writeBig(FS,name,bytes);
    busy();
    await sendFiles([uri],waText(s)+(failed.length?`\n(Foto ${failed.join(', ')} tidak dapat disisipkan)`:''),'Bagikan Excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Gagal membuat Excel: '+(e&&e.message||e))}
}

/* kirim berkas lewat Intent native (lampiran WhatsApp pasti ikut); cadangan: plugin Share */
async function sendFiles(uris,text,title,mime){
  logE('share',`${uris.length} berkas · ${mime} · ${uris.map(u=>String(u).split('/').pop()).join(', ')}`);
  const N=PM();
  if(N){
    try{await N.shareFiles({paths:uris,text:text||'',title:title||'Bagikan',mime});return}
    catch(e){logE('share','native gagal: '+(e&&e.message||e))}
  }
  await plug('Share').share({title,text,files:uris,dialogTitle:title});
}

/* ---------- Riwayat ---------- */
function histView(){
  show('','',`${tabs('map')}${subtabs('hist')}`+(sessions.length?sessions.map(s=>`<div class="card"><b>${E(title(s))}</b>
  <div class="m">${E(s.h.tgl)} · Blok ${E(s.h.blok)} · ${s.recs.length} ${ul(s)} · ${E(s.h.petugas)} · ${s.done?'Selesai':'Belum selesai'}</div>
  <div class="row"><button class="b" onclick="lihat(${s.id})">Lihat</button><button class="b gray" onclick="showOnMap(${s.id})">🗺 Peta</button>${s.done?'':`<button class="b" style="background:#f57c00" onclick="go('run',${s.id})">Lanjutkan</button>`}<button class="b" style="background:var(--r)" onclick="del(${s.id})">Hapus</button></div></div>`).join(''):'<p class="m">Belum ada data.</p>'));
}
function showOnMap(id){sessions.forEach(s=>{mf.off[s.id]=s.id!=id});mf.jenis='';mf.by='jenis';mf.hide={};mv=null;subTab('map')}
function del(id){
  if(!confirm('Hapus data sensus ini? Foto di Galeri tetap tersimpan. Tidak bisa dikembalikan.'))return;
  sessions=sessions.filter(s=>s.id!=id);S('sessions',sessions);histView();
}

/* ---------- Sensus custom ---------- */
const newCd=()=>({n:'',u:'Pokok',f:[{l:'',t:'num',x:''}]});
let cd=newCd();
const CT=[['num','Angka'],['text','Teks'],['yn','Ya / Tidak'],['sel','Pilihan (opsi sendiri)']];
function customView(){
  show('Sensus Custom','',`
  <div class="card"><b>Tambah Sensus Custom</b>
  <label>Nama Sensus</label><input value="${E(cd.n)}" oninput="cd.n=this.value" placeholder="mis. Sensus Pelepah">
  <label>Unit yang diukur (data dicatat per apa)</label><input value="${E(cd.u)}" oninput="cd.u=this.value" placeholder="mis. Pokok, Baris, Titik, Piringan">
  <div id="cf"></div>
  <div class="row"><button class="b gray" onclick="cd.f.push({l:'',t:'num',x:''});cfRows()">+ Tambah Kolom</button></div>
  <div class="row"><button class="b" onclick="saveCustom()">Simpan Sensus</button></div></div>
  <div class="card"><b>Sensus Custom Tersimpan</b>${customs.map(c=>`<div class="item"><span>${E(c.n)}<br><small class="m">per ${E(c.u||'Pokok')} · ${c.f.length} kolom</small></span><button class="b" style="background:var(--r)" onclick="delCustom(${c.id})">Hapus</button></div>`).join('')||'<p class="m">Belum ada.</p>'}</div>`,{back:1});
  cfRows();
}
function cfRows(){
  $('#cf').innerHTML=cd.f.map((f,i)=>`<div class="fr">
  <div style="display:flex;align-items:center"><b style="flex:1">Kolom ${i+1}</b>${cd.f.length>1?`<button class="b" style="background:var(--r);padding:6px 12px" onclick="cd.f.splice(${i},1);cfRows()">Hapus</button>`:''}</div>
  <input placeholder="Nama kolom (mis. Jumlah pelepah)" value="${E(f.l)}" oninput="cd.f[${i}].l=this.value" style="margin-top:6px">
  <select onchange="cd.f[${i}].t=this.value;cd.f[${i}].x='';cfRows()" style="margin-top:6px">${CT.map(([v,l])=>`<option value="${v}" ${f.t==v?'selected':''}>${l}</option>`).join('')}</select>
  ${f.t=='num'?`<input placeholder="Satuan ukur, opsional (mis. cm, kg, m)" value="${E(f.x)}" oninput="cd.f[${i}].x=this.value" style="margin-top:6px">`:''}
  ${f.t=='sel'?`<input placeholder="Opsi dipisah koma (mis. Baik, Sedang, Rusak)" value="${E(f.x)}" oninput="cd.f[${i}].x=this.value" style="margin-top:6px">`:''}</div>`).join('');
}
function saveCustom(){
  const n=cd.n.trim(),u=cd.u.trim()||'Pokok',fs=cd.f.filter(f=>f.l.trim());
  if(!n||!fs.length)return alert('Isi nama sensus dan minimal 1 kolom.');
  const opts=f=>f.x.split(',').map(z=>z.trim()).filter(Boolean);
  const bad=fs.find(f=>f.t=='sel'&&opts(f).length<2);
  if(bad)return alert(`Kolom "${bad.l}": isi minimal 2 opsi, dipisah koma.`);
  const f=fs.map((x,i)=>{const o={k:'f'+(i+1),l:x.l.trim(),t:x.t};if(x.t=='num'&&x.x.trim())o.s=x.x.trim();if(x.t=='sel')o.o=opts(x);return o});
  const c={id:Date.now(),n,u,f};customs.push(c);S('customs',customs);sel.cid=c.id;cd=newCd();customView();
}
function delCustom(id){
  if(!confirm('Hapus sensus custom ini? Data hasil sensus yang sudah ada tetap aman.'))return;
  customs=customs.filter(c=>c.id!=id);S('customs',customs);customView();
}

/* ---------- About ---------- */
function aboutView(){
  show('About Application','',`
  <div class="card center" style="padding:32px 16px">
    <h2>Create By Mohammad Fauzi</h2>
    <p>Contact Me for Suggestion &amp; Feedback</p>
    <a href="https://wa.me/6285252390543" aria-label="WhatsApp">
      <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#25D366"/><path d="M32 11C20.4 11 11 20.4 11 32c0 3.8 1 7.3 2.8 10.4L11 53l10.9-2.8A20.9 20.9 0 0 0 32 53c11.6 0 21-9.4 21-21S43.6 11 32 11z" fill="none" stroke="#fff" stroke-width="3"/><path d="M24 22c-1 3 1 8 6 12s9 6 12 5l2-4-5-3-3 2c-2-1-5-3-6-6l2-3-3-5z" fill="#fff"/></svg>
    </a>
  </div>
  <p class="m center" style="margin-top:40px">Versi Aplikasi 1.9</p>`,{back:1});
}

/* ---------- Tab ---------- */
const tabs=a=>`<div class="tabs">${[['home','Sensus'],['gal','Galeri'],['map','Peta']].map(([v,l])=>`<button class="${a==v?'on':''}" onclick="tab('${v}')">${l}</button>`).join('')}</div>`;
const subtabs=a=>`<div class="stabs">${[['map','Peta'],['hist','Riwayat'],['rekap','Rekap']].map(([v,l])=>`<button class="${a==v?'on':''}" onclick="subTab('${v}')">${l}</button>`).join('')}</div>`;
function subTab(v){if(v!=view)go(v,0,true)}
function tab(v){if(v==view)return;if(v=='home'){history.back();return}view=='home'?go(v):go(v,0,true)}

/* ---------- Lux meter ---------- */
const luxVal=()=>lxRaw==null?'':Math.round(lxRaw*lxK*(lxRaw*lxK<10?10:1))/(lxRaw*lxK<10?10:1);
function luxUi(err){
  const el=$('#lux');if(!el)return;
  const ok=lxRaw!=null;
  el.className='chip '+(ok?'ok':'bad');
  el.textContent=ok?`☀ ${luxVal()} lux`:(err||'Menunggu sensor…');
  const k=$('#lk');if(k)k.textContent=ok?`Mentah: ${Math.round(lxRaw)} lux · Faktor kalibrasi: ×${lxK.toFixed(3)}`:'';
}
function luxInit(){
  const P=plug('LightSensor');
  if(!P){luxUi('Sensor cahaya hanya tersedia di aplikasi');return}
  let lastL=null;
  P.start().then(()=>setInterval(async()=>{
    if(document.hidden)return;
    try{const r=await P.getLux(),v=r.available?r.lux:null;lxRaw=v;if(v!==lastL&&(v==null||lastL==null||Math.abs(v-lastL)>=Math.max(1,lastL*.03))){lastL=v;luxUi();liveUpdate()}}catch(e){}
  },1000)).catch(e=>luxUi((e&&e.message)||'Sensor cahaya tidak tersedia'));
}
function calLux(){
  const ref=parseFloat($('#lref').value);
  if(!(ref>0)||!(lxRaw>0))return alert('Isi lux referensi dan pastikan sensor membaca nilai lebih dari 0.');
  lxK=ref/lxRaw;S('luxk',lxK);luxUi();
}
function resetLux(){lxK=1;S('luxk',1);luxUi()}

/* ---------- Foto: penyimpanan (IndexedDB) ---------- */
const idb=new Promise((ok,no)=>{const r=indexedDB.open('sensus',4);r.onupgradeneeded=()=>{const d=r.result;['photos','maps','layers','tiles'].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'})})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=(st,m,f)=>idb.then(db=>new Promise((ok,no)=>{const t=db.transaction(st,m),r=f(t.objectStore(st));t.oncomplete=()=>ok(r.result);t.onerror=()=>no(t.error)}));
const pPut=r=>tx('photos','readwrite',s=>s.put(r)),pAll=()=>tx('photos','readonly',s=>s.getAll()),pDel=id=>tx('photos','readwrite',s=>s.delete(id));
const lPut=r=>tx('layers','readwrite',s=>s.put(r)),lAll=()=>tx('layers','readonly',s=>s.getAll()),lDel=id=>tx('layers','readwrite',s=>s.delete(id)),lKeys=()=>tx('layers','readonly',s=>s.getAllKeys());
const tGet=k=>tx('tiles','readonly',s=>s.get(k));
const tPutMany=l=>idb.then(db=>new Promise((ok,no)=>{const q=db.transaction('tiles','readwrite'),s=q.objectStore('tiles');l.forEach(r=>s.put(r));q.oncomplete=ok;q.onerror=()=>no(q.error)}));
const tDelMap=id=>idb.then(db=>new Promise((ok,no)=>{const q=db.transaction('tiles','readwrite');q.objectStore('tiles').delete(IDBKeyRange.bound(id+'|',id+'|\uffff'));q.oncomplete=ok;q.onerror=()=>no(q.error)}));
const mPut=r=>tx('maps','readwrite',s=>s.put(r)),mAll=()=>tx('maps','readonly',s=>s.getAll()),mDel=id=>tx('maps','readwrite',s=>s.delete(id));

/* ---------- Foto: ambil & watermark ---------- */
const p2=n=>String(n).padStart(2,'0');
const fmtDT=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const volLine=(s,vol)=>{
  const pr=sessions.filter(x=>x!==s&&title(x)==title(s)&&nk(x.h.blok)==nk(s.h.blok)).reduce((a,x)=>a+x.recs.length,0);
  return `Volume disensus: ${vol} ${ul(s)}`+(pr>0?` (total blok ${pr+vol})`:'');
};
const wmLines=(s,no,ket,t,g,vol)=>[fmtDT(t),title(s),`Blok ${s.h.blok} · Baris ${s.h.baris} · Arah ${s.h.arah}`,`${un(s)} ke-${no}`,volLine(s,vol==null?s.recs.length:vol),g&&g.lat!==''?`Koordinat: ${(+g.lat).toFixed(6)}, ${(+g.lon).toFixed(6)}`:'Koordinat: -',`Lux: ${g&&g.lux!==''&&g.lux!=null?g.lux:'-'}`].concat(g&&g.hdg!=null?['Arah hadap: '+g.hdg+'° '+card8(g.hdg)]:[]).concat(ket?['Ket: '+ket]:[]);
function wm(base,lines){
  const c=document.createElement('canvas');c.width=base.width;c.height=base.height;
  const x=c.getContext('2d');x.drawImage(base,0,0);
  const fs=Math.max(16,Math.round(c.width/38)),pad=Math.round(fs*.5),lh=Math.round(fs*1.3),maxW=c.width*.85;
  x.font=`600 ${fs}px sans-serif`;x.textBaseline='top';
  const out=[];
  for(const ln of lines){let cl='';for(const w of ln.split(' ')){const tt=cl?cl+' '+w:w;if(x.measureText(tt).width>maxW&&cl){out.push(cl);cl=w}else cl=tt}out.push(cl)}
  const w=Math.max(...out.map(l=>x.measureText(l).width))+pad*2,h=out.length*lh+pad*2-(lh-fs);
  const X=pad,Y=c.height-h-pad;
  x.fillStyle='rgba(0,0,0,.55)';x.fillRect(X,Y,w,h);
  x.fillStyle='#fff';out.forEach((l,i)=>x.fillText(l,X+pad,Y+pad+i*lh));
  return c;
}
async function snap(){
  const C=plug('Camera');
  if(C){
    try{const r=await C.getPhoto({quality:80,resultType:'dataUrl',source:'CAMERA',correctOrientation:true});return r.dataUrl}
    catch(e){if(!/cancel/i.test(e&&e.message||''))alert('Kamera gagal: '+(e&&e.message||e));return null}
  }
  return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.capture='environment';
    i.onchange=()=>{const f=i.files[0];if(!f)return res(null);const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f)};i.click()});
}
const loadImg=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
async function ambilFoto(){
  try{
    const u=await snap();if(!u)return;
    const i=await loadImg(u),k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement('canvas');
    c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);
    draft={base:c,t:new Date()};$('#fbtn').textContent='📷 Ulangi Foto';pvUpdate(true);
  }catch(e){alert('Foto gagal diproses: '+(e&&e.message||e))}
}
let pvKey='';
function pvUpdate(force){
  if(!draft)return;
  const lines=wmLines(run,nextNo(run),$('#ket').value.trim(),draft.t,pg,run.recs.length+1),key=lines.join('|');
  if(!force&&key===pvKey)return;pvKey=key;
  const c=wm(draft.base,lines),pv=$('#pv');
  pv.width=c.width;pv.height=c.height;pv.getContext('2d').drawImage(c,0,0);pv.style.display='block';
}

/* ---------- Galeri ---------- */
const GF=[['all','Semua'],['blok','Blok'],['jenis','Jenis Sensus'],['tgl','Tanggal'],['baris','Baris'],['arah','Arah Masuk'],['no','Nomor urut'],['estate','Estate'],['afd','Afdeling'],['petugas','Petugas'],['ket','Keterangan foto']];
async function galView(){
  try{galData=(await pAll()).sort((a,b)=>b.t.localeCompare(a.t))}catch(e){galData=[]}
  show('Galeri Foto','',`${tabs('gal')}
  <div class="card"><label style="margin-top:0">Cari berdasarkan</label>
  <select onchange="gf.f=this.value;gf.q='';const q=$('#gq');q.type=gf.f=='tgl'?'date':'text';q.value='';galGrid()">${GF.map(([k,l])=>`<option value="${k}" ${gf.f==k?'selected':''}>${l}</option>`).join('')}</select>
  <input id="gq" type="${gf.f=='tgl'?'date':'text'}" value="${E(gf.q)}" placeholder="Ketik kata kunci…" style="margin-top:8px" oninput="gf.q=this.value;galGrid()"></div>
  <div id="gc" class="m" style="margin-bottom:8px"></div><div id="gg" class="grid"></div>`);
  galGrid();
}
function galGrid(){
  gU.forEach(u=>URL.revokeObjectURL(u));gU=[];
  const q=gf.q.trim().toLowerCase();
  const list=galData.filter(p=>!q||(gf.f=='all'?[p.blok,p.jenis,p.tgl,p.baris,p.arah,p.estate,p.afd,p.petugas,(p.unit||'Pokok')+' '+p.no,p.ket].join(' '):String(p[gf.f]??'')).toLowerCase().includes(q));
  $('#gc').textContent=`${list.length} foto`+(list.length!=galData.length?` dari ${galData.length}`:'');
  $('#gg').innerHTML=list.map((p,i)=>`<div class="cell" onclick="go('photo','${p.id}')"><img data-i="${i}" alt=""><div class="cap"><b>Blok ${E(p.blok)} · ${E(p.unit||'Pokok')} ${p.no}</b><br>${E(p.jenis)}<br>${E(p.tgl)}</div></div>`).join('')||'<p class="m">Belum ada foto.</p>';
  document.querySelectorAll('#gg img').forEach(im=>{const u=URL.createObjectURL(list[im.dataset.i].th);gU.push(u);im.src=u});
}
/* zoom foto: cubit 2 jari, geser saat diperbesar, ketuk 2× untuk perbesar/kecilkan */
function pinchZoom(box,img){
  let s=1,x=0,y=0,d0=0,s0=1,last=0;const P=new Map();
  const ap=()=>{
    s=Math.min(6,Math.max(1,s));
    const mx=box.clientWidth*(s-1),my=box.clientHeight*(s-1);
    x=Math.min(0,Math.max(-mx,x));y=Math.min(0,Math.max(-my,y));
    if(s==1){x=0;y=0}
    img.style.transform=`translate(${x}px,${y}px) scale(${s})`;
  };
  const zoomAt=(cx,cy,ns)=>{ns=Math.min(6,Math.max(1,ns));x=cx-(cx-x)*ns/s;y=cy-(cy-y)*ns/s;s=ns;ap()};
  box.addEventListener('pointerdown',e=>{
    try{box.setPointerCapture(e.pointerId)}catch(_){}
    P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P.size==2){const [a,b]=[...P.values()];d0=Math.hypot(a.x-b.x,a.y-b.y);s0=s}
    else if(P.size==1){
      const t=Date.now();
      if(t-last<300){const r=box.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,s>1.2?1:2.5)}
      last=t;
    }
  });
  box.addEventListener('pointermove',e=>{
    const p=P.get(e.pointerId);if(!p)return;
    const r=box.getBoundingClientRect(),dx=e.clientX-p.x,dy=e.clientY-p.y;
    p.x=e.clientX;p.y=e.clientY;
    if(P.size==2){
      const [a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d0>0)zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,s0*d/d0);
    }else if(s>1){x+=dx;y+=dy;ap()}
  });
  const up=e=>{P.delete(e.pointerId);d0=0;if(P.size==1){s0=s}};
  box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
}
async function photoView(id){
  if(!galData.length)try{galData=await pAll()}catch(e){}
  const p=galData.find(x=>x.id==id);
  if(!p){alert('Foto tidak ditemukan.');history.back();return}
  show('Foto '+(p.unit||'Pokok')+' '+p.no,`Blok ${p.blok}`,`<div class="card"><div id="pbox" style="overflow:hidden;border-radius:8px;touch-action:none;background:#000"><img id="pimg" alt="" style="width:100%;display:block;transform-origin:0 0"></div><div class="m" style="font-size:12px">Cubit untuk zoom · ketuk 2× untuk perbesar/kecilkan</div>
  <div class="m" style="margin-top:8px">${E(p.jenis)}\nTanggal: ${E(p.tgl)} · ${E(fmtDT(new Date(p.t)))}\nEstate ${E(p.estate)} · Afdeling ${E(p.afd)} · Blok ${E(p.blok)}\nBaris ${E(p.baris)} · Arah ${E(p.arah)} · ${E(p.unit||'Pokok')} ${p.no}\nPetugas: ${E(p.petugas)}${p.ket?'\nKet: '+E(p.ket):''}</div>
  <div class="row"><button class="b" onclick="sharePhoto('${p.id}')">Share</button><button class="b" style="background:var(--r)" onclick="delPhoto('${p.id}')">Hapus</button></div></div>`,{back:1});
  const u=URL.createObjectURL(p.blob);gU.push(u);$('#pimg').src=u;pinchZoom($('#pbox'),$('#pimg'));
}
async function sharePhoto(id){
  const p=galData.find(x=>x.id==id);
  try{
    const b64=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(p.blob)});
    const name=`foto_${slug(p.blok)}_${slug(p.unit||'pokok')}${p.no}_${p.id}.jpg`,r=await plug('Filesystem').writeFile({path:name,data:b64,directory:'CACHE'});
    await sendFiles([r.uri],`${p.jenis} - Blok ${p.blok} - ${p.unit||'Pokok'} ${p.no}`,'Bagikan Foto','image/jpeg');
  }catch(e){if(!/cancel/i.test(e&&e.message||''))alert('Gagal membagikan foto: '+(e&&e.message||e))}
}
async function delPhoto(id){
  if(!confirm('Hapus foto ini? Tidak bisa dikembalikan.'))return;
  await pDel(id);galData=galData.filter(x=>x.id!=id);history.back();
}

/* ---------- Util berkas ---------- */
function pickFile(accept,cb){
  const i=document.createElement('input');i.type='file';i.accept=accept;i.style.display='none';
  i.onchange=()=>{const f=i.files[0];i.remove();if(f)cb(f)};
  document.body.appendChild(i);i.click();
}
function busy(m){
  let o=$('#busy');
  if(!m){if(o)o.remove();return}
  if(!o){o=document.createElement('div');o.id='busy';o.className='ov';document.body.appendChild(o)}
  o.innerHTML=`<div class="dlg">${E(m)}</div>`;
}
const toB64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(b)});
async function mkThumb(blob){
  const u=URL.createObjectURL(blob);
  try{const i=await loadImg(u),k=320/Math.max(i.width,i.height),c=document.createElement('canvas');
    c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);return await cb(c,.7)}
  finally{URL.revokeObjectURL(u)}
}

/* ---------- Export / import data tim ---------- */
async function shareData(ids){
  try{
    const out={app:'SensusBlok',v:1,sessions:sessions.filter(s=>ids.includes(s.id)),photos:[]};
    if(confirm('Sertakan foto di dalam file? (OK = sertakan, ukuran file bisa besar. Cancel = tanpa foto)')){
      busy('Menyiapkan foto…');
      for(const p of (await pAll()).filter(p=>ids.includes(p.sid))){const q={...p};q.blob=await toB64(p.blob);delete q.th;out.photos.push(q)}
      busy();
    }
    const name=`sensus_data_${today()}_${out.sessions.length}sesi.json`;
    const r=await plug('Filesystem').writeFile({path:name,data:JSON.stringify(out),directory:'CACHE',encoding:'utf8'});
    await sendFiles([r.uri],'','Bagikan Data Tim','application/json');
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Gagal membagikan data: '+(e&&e.message||e))}
}
function impData(){pickFile('*/*',impDataFile)}
async function impDataFile(f){
    try{
      busy('Mengimpor data…');
      const d=JSON.parse(await f.text());
      if(d.app!='SensusBlok'||!Array.isArray(d.sessions))throw new Error('File ini bukan data Sensus Blok.');
      let add=0,upd=0,skip=0,np=0;
      for(const s of d.sessions){
        const o=sessions.find(x=>x.id==s.id);
        if(!o){s.done=true;sessions.push(s);add++}
        else if(s.recs.length>o.recs.length){Object.assign(o,s,{done:true});upd++}
        else skip++;
      }
      sessions.sort((a,b)=>b.id-a.id);S('sessions',sessions);
      for(const p of d.photos||[]){const blob=await (await fetch('data:image/jpeg;base64,'+p.blob)).blob();await pPut({...p,blob,th:await mkThumb(blob)});np++}
      busy();alert(`Impor selesai: ${add} sesi baru, ${upd} diperbarui, ${skip} dilewati (sudah ada), ${np} foto.`);
      if(view=='hist')histView();
    }catch(e){busy();alert('Gagal impor: '+(e&&e.message||e))}
}

/* ---------- GeoPDF: parser struktur PDF (ISO 32000) ---------- */
const RX_REF=/(\d+)\s+(\d+)\s+R(?![A-Za-z])/y,RX_NUM=/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,RX_KW=/[A-Za-z]+/y,RX_DEL=/[\s()<>\[\]{}\/%]/;
function lat1(b){let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return s}
function pdfVal(s,pos){
  let i=pos;
  const skip=()=>{for(;i<s.length;i++){const c=s.charCodeAt(i);if(c==37){while(i<s.length&&s.charCodeAt(i)!=10&&s.charCodeAt(i)!=13)i++}else if(!(c==32||c==10||c==13||c==9||c==12||c==0))break}};
  const name=()=>{const st=++i;while(i<s.length&&!RX_DEL.test(s[i]))i++;return s.slice(st,i)};
  const val=()=>{
    skip();const c=s[i];
    if(c==='<'&&s[i+1]==='<'){i+=2;const d={};for(;;){skip();if(i>=s.length)return d;if(s[i]==='>'){i+=2;return d}if(s[i]!=='/'){i++;continue}const k=name();d[k]=val()}}
    if(c==='['){i++;const a=[];for(;;){skip();if(i>=s.length)return a;if(s[i]===']'){i++;return a}a.push(val())}}
    if(c==='/')return '/'+name();
    if(c==='('){let d=1,j=i+1;while(j<s.length&&d>0){const x=s[j];if(x==='\\')j++;else if(x==='(')d++;else if(x===')')d--;j++}const r=s.slice(i+1,j-1);i=j;return{str:r}}
    if(c==='<'){const j=s.indexOf('>',i),r=s.slice(i+1,j);i=j+1;return{str:r,hex:1}}
    RX_REF.lastIndex=i;let m=RX_REF.exec(s);if(m){i=RX_REF.lastIndex;return{ref:+m[1]}}
    RX_NUM.lastIndex=i;m=RX_NUM.exec(s);if(m){i=RX_NUM.lastIndex;return +m[0]}
    RX_KW.lastIndex=i;m=RX_KW.exec(s);if(m){i=RX_KW.lastIndex;return m[0]}
    i++;return null;
  };
  const v=val();return[v,i];
}
async function pdfObjs(s,b){
  const objs={},re=/(\d+)\s+(\d+)\s+obj\b/g,ostm=[];let m,cn=0;
  while((m=re.exec(s))){
    if(++cn%2500==0)await yieldUI();
    const [v,end]=pdfVal(s,re.lastIndex);objs[+m[1]]=v;
    if(v&&typeof v=='object'&&v.Type==='/ObjStm')ostm.push([v,end]);
  }
  for(const [d,end] of ostm){
    const a=s.indexOf('stream',end);if(a<0||a-end>10)continue;
    let st=a+6;if(b[st]==13)st++;if(b[st]==10)st++;
    const e=s.indexOf('endstream',st);if(e<0)continue;
    let en=e;if(b[en-1]==10)en--;if(b[en-1]==13)en--;
    let txt;
    try{txt=lat1(new Uint8Array(await new Response(new Blob([b.subarray(st,en)]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()))}catch(x){continue}
    if(typeof d.N!='number'||typeof d.First!='number')continue;
    const hd=txt.slice(0,d.First).trim().split(/\s+/).map(Number);
    for(let k=0;k<d.N;k++){if(!isNaN(hd[2*k]))objs[hd[2*k]]=pdfVal(txt,d.First+hd[2*k+1])[0]}
  }
  return objs;
}
function findGeo(objs){
  const R=v=>{for(let n=0;v&&typeof v=='object'&&v.ref!=null&&n<6;n++)v=objs[v.ref];return v};
  const nums=a=>{a=R(a);return Array.isArray(a)?a.map(x=>+R(x)).filter(x=>!isNaN(x)):null};
  const box=a=>a&&a.length>=4?a:null,out=[];
  for(const num in objs){
    const d=objs[num];if(!d||typeof d!='object'||Array.isArray(d)||d.str!==undefined)continue;
    if(d.VP!==undefined){                                   // ISO 32000 (Adobe / QGIS / ArcGIS / Avenza)
      let vp=R(d.VP);if(!Array.isArray(vp))vp=[vp];
      for(let it of vp){
        it=R(it);if(!it||typeof it!='object')continue;
        const me=R(it.Measure);if(!me||typeof me!='object')continue;
        const g=nums(me.GPTS),l=nums(me.LPTS)||nums(me.Bounds)||[0,0,0,1,1,1,1,0];
        if(!g||g.length<6||g.length!=l.length)continue;
        out.push({kind:'iso',page:+num,bbox:box(nums(it.BBox)),gpts:g,lpts:l,gcs:R(me.GCS)});
      }
    }
    if(d.LGIDict!==undefined){                               // OGC / TerraGo (LGIDict)
      let lg=R(d.LGIDict);if(!Array.isArray(lg))lg=[lg];
      for(let it of lg){
        it=R(it);if(!it||typeof it!='object')continue;
        const reg=R(it.Registration),pp=[],xy=[];
        if(Array.isArray(reg))for(const r0 of reg){const r=R(r0);if(Array.isArray(r)){const v=r.map(x=>+R(x));if(v.length>=4&&v.every(isFinite)){pp.push([v[0],v[1]]);xy.push([v[2],v[3]])}}}
        const ctm=nums(it.CTM),nl=nums(it.Neatline);let bb=null;
        if(nl&&nl.length>=4){const xs=nl.filter((_,i)=>i%2==0),ys=nl.filter((_,i)=>i%2==1);bb=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
        const pr=projFromLgi(R(it.Projection));
        if(pp.length>=3)out.push({kind:'lgi',page:+num,bbox:bb,reg:{pp,xy},...pr});
        else if(ctm&&ctm.length>=6)out.push({kind:'lgi',page:+num,bbox:bb,ctm,...pr});
      }
    }
  }
  return out;
}
async function parseGeo(buf){
  const b=new Uint8Array(buf),s=lat1(b),objs=await pdfObjs(s,b),list=findGeo(objs);
  const diag={objs:Object.keys(objs).length,gpts:s.indexOf('/GPTS')>=0,lgi:s.indexOf('/LGIDict')>=0,enc:s.indexOf('/Encrypt')>=0};
  list.forEach(v=>{v.area=v.bbox?Math.abs((v.bbox[2]-v.bbox[0])*(v.bbox[3]-v.bbox[1])):0;if(v.kind=='iso')v.proj=projFromGcs(v.gcs)});
  list.sort((x,y)=>y.area-x.area||(x.kind=='iso'?-1:1));
  return{list,diag,objs};
}
const diagMsg=d=>`objek PDF: ${d.objs}; data georeferensi ISO ${d.gpts?'terdeteksi tapi tidak terbaca':'tidak ada'}; OGC/LGIDict ${d.lgi?'terdeteksi tapi tidak terbaca':'tidak ada'}; terenkripsi: ${d.enc?'ya':'tidak'}`;

/* ---------- Proyeksi ---------- */
const RAD=Math.PI/180,WGS84={a:6378137,f:1/298.257223563};
function projFromGcs(g){
  if(!g||typeof g!='object')return null;
  let w=g.WKT&&g.WKT.str||'';
  if(g.WKT&&g.WKT.hex)w=w.replace(/\s/g,'').replace(/^FEFF/i,'').match(/../g).map(h=>String.fromCharCode(parseInt(h,16))).join('');
  w=w.replace(/\\(.)/g,'$1');
  const ep=+(g.EPSG||0);
  const par=(...ns)=>{for(const n of ns){const m=new RegExp('PARAMETER\\["'+n+'",\\s*([-+0-9.eE]+)','i').exec(w);if(m)return+m[1]}return null};
  if(/^\s*(PROJCS|PROJCRS|PROJECTEDCRS)/i.test(w)){
    const sp=/(?:SPHEROID|ELLIPSOID)\["[^"]*",\s*([0-9.]+),\s*([0-9.]+)/i.exec(w),a=sp?+sp[1]:WGS84.a,f=sp&&+sp[2]?1/+sp[2]:WGS84.f;
    const nm=(/^\s*(?:PROJCS|PROJCRS|PROJECTEDCRS)\["([^"]+)"/i.exec(w)||[])[1]||'';
    const mt=((/(?:PROJECTION|METHOD)\["([^"]+)"/i.exec(w)||[])[1]||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    let uf=1,um;const ur=/UNIT\["[^"]*",\s*([0-9.]+)/g;while((um=ur.exec(w)))uf=+um[1];
    if(Math.abs(uf-1)>1e-6)return{t:'none',name:(nm||mt)+' (satuan bukan meter)'};
    const o={a,f,name:nm||mt,
      lat0:par('latitude_of_origin','latitude_of_center','Latitude of natural origin','Latitude of false origin','Latitude of origin')||0,
      lon0:par('central_meridian','longitude_of_center','longitude_of_origin','Longitude of natural origin','Longitude of false origin','Longitude of origin')||0,
      fe:par('false_easting','False easting','Easting at false origin')||0,fn:par('false_northing','False northing','Northing at false origin')||0,
      sp1:par('standard_parallel_1','Latitude of 1st standard parallel'),sp2:par('standard_parallel_2','Latitude of 2nd standard parallel')};
    const k=par('scale_factor','Scale factor at natural origin','Scale factor at origin');
    if(/^(transversemercator|gausskruger|utm)/.test(mt))return{...o,t:'tm',k0:k==null?1:k};
    if(/(mercatorauxiliarysphere|pseudomercator|popularvisualisation)/.test(mt))return{...o,t:'merc',sphere:1,a:6378137,k0:1};
    if(/^mercator(1sp|variantb|varianta)?$/.test(mt))return{...o,t:'merc',k0:k==null?1:k};
    if(/^(lambertconformalconic|lambertconicconformal)/.test(mt)&&!/belgium|michigan|west/.test(mt))return{...o,t:'lcc',k0:o.sp2==null&&k!=null?k:1};
    if(/^albers/.test(mt))return{...o,t:'alb'};
    if(/^polyconic/.test(mt))return{...o,t:'poly'};
    if(/(equirectangular|equidistantcylindrical|platecarree)/.test(mt))return{...o,t:'eqc'};
    return{t:'none',name:nm||mt};
  }
  if(ep>=32601&&ep<=32660)return{t:'tm',...WGS84,lat0:0,lon0:-183+6*(ep-32600),k0:.9996,fe:5e5,fn:0,name:'UTM '+(ep-32600)+'N'};
  if(ep>=32701&&ep<=32760)return{t:'tm',...WGS84,lat0:0,lon0:-183+6*(ep-32700),k0:.9996,fe:5e5,fn:1e7,name:'UTM '+(ep-32700)+'S'};
  if(ep>=23830&&ep<=23845)return{t:'tm',...WGS84,lat0:0,lon0:94.5+3*(ep-23830),k0:.9999,fe:2e5,fn:1.5e6,name:'DGN95 TM-3 ('+ep+')'};
  if(ep==3857||ep==900913)return{t:'merc',sphere:1,a:6378137,lon0:0,fe:0,fn:0,k0:1,name:'Web Mercator'};
  return null;
}
function projFromLgi(pd){
  if(!pd||typeof pd!='object')return{proj:null,geo:true,pname:'tanpa proyeksi (dianggap lat/lon)'};
  const s=k=>{const v=pd[k];return v&&v.str!==undefined?v.str:v},n=k=>{const v=parseFloat(s(k));return isNaN(v)?null:v};
  const ty=String(s('ProjectionType')||'').toUpperCase();
  if(/^GE/.test(ty))return{proj:null,geo:true,pname:'geografis'};
  if(/^UT/.test(ty)&&n('Zone')){const z=n('Zone'),sh=/^S/i.test(String(s('Hemisphere')||''));return{proj:{t:'tm',...WGS84,lat0:0,lon0:-183+6*z,k0:.9996,fe:5e5,fn:sh?1e7:0,name:'UTM '+z+(sh?'S':'N')},geo:false}}
  const base={...WGS84,lat0:n('OriginLatitude')||0,lon0:n('CentralMeridian')||0,fe:n('FalseEasting')||0,fn:n('FalseNorthing')||0,sp1:n('StandardParallelOne'),sp2:n('StandardParallelTwo')};
  if(/^(TC|TM)/.test(ty))return{proj:{t:'tm',...base,k0:n('ScaleFactor')??1,name:'TM ('+ty+')'},geo:false};
  if(/^(LC|LE)/.test(ty))return{proj:{t:'lcc',...base,k0:1,name:'LCC ('+ty+')'},geo:false};
  if(/^(AC|AL|AE)/.test(ty))return{proj:{t:'alb',...base,name:'Albers ('+ty+')'},geo:false};
  return{proj:null,geo:false,bad:true,pname:'proyeksi OGC "'+(ty||'?')+'"'};
}
const ee=P=>Math.max(Math.sqrt(P.f*(2-P.f)),1e-9);
const mm=(e,ph)=>{const s=Math.sin(ph);return Math.cos(ph)/Math.sqrt(1-e*e*s*s)};
const tt=(e,ph)=>{const s=Math.sin(ph);return Math.tan(Math.PI/4-ph/2)/Math.pow((1-e*s)/(1+e*s),e/2)};
const qq=(e,ph)=>{const s=Math.sin(ph);return(1-e*e)*(s/(1-e*e*s*s)-(1/(2*e))*Math.log((1-e*s)/(1+e*s)))};
const dl=(lo,P)=>(((lo-P.lon0+540)%360)-180)*RAD;
function marc(P,m){const e2=P.f*(2-P.f);return P.a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*m-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*m)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*m)-(35*e2**3/3072)*Math.sin(6*m))}
function tmFwd(lo,la,P){
  const a=P.a,e2=P.f*(2-P.f),ep2=e2/(1-e2),phi=la*RAD,lam=dl(lo,P);
  const sn=Math.sin(phi),cs=Math.cos(phi),tn=Math.tan(phi),N=a/Math.sqrt(1-e2*sn*sn),T=tn*tn,C=ep2*cs*cs,A=lam*cs;
  return[P.fe+P.k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120),
         P.fn+P.k0*(marc(P,phi)-marc(P,P.lat0*RAD)+N*tn*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))];
}
function mercFwd(lo,la,P){
  const phi=la*RAD,lam=dl(lo,P);
  if(P.sphere)return[P.fe+P.a*lam,P.fn+P.a*Math.log(Math.tan(Math.PI/4+phi/2))];
  const e=ee(P),s=Math.sin(phi);
  return[P.fe+P.a*P.k0*lam,P.fn+P.a*P.k0*Math.log(Math.tan(Math.PI/4+phi/2)*Math.pow((1-e*s)/(1+e*s),e/2))];
}
function lccFwd(lo,la,P){
  const e=ee(P);
  if(P.n===undefined){
    const p0=P.lat0*RAD,p1=(P.sp1??P.lat0)*RAD,p2=(P.sp2??P.sp1??P.lat0)*RAD,m1=mm(e,p1),m2=mm(e,p2),t0=tt(e,p0),t1=tt(e,p1),t2=tt(e,p2);
    P.n=Math.abs(p1-p2)<1e-10?Math.sin(p1):(Math.log(m1)-Math.log(m2))/(Math.log(t1)-Math.log(t2));
    P.F=m1/(P.n*Math.pow(t1,P.n));P.r0=P.a*P.F*Math.pow(t0,P.n);
  }
  const r=P.a*P.F*Math.pow(tt(e,la*RAD),P.n),th=P.n*dl(lo,P),k=P.k0||1;
  return[P.fe+k*r*Math.sin(th),P.fn+k*(P.r0-r*Math.cos(th))];
}
function albFwd(lo,la,P){
  const e=ee(P);
  if(P.n===undefined){
    const p0=P.lat0*RAD,p1=(P.sp1??P.lat0)*RAD,p2=(P.sp2??P.sp1??P.lat0)*RAD,m1=mm(e,p1),m2=mm(e,p2),q0=qq(e,p0),q1=qq(e,p1),q2=qq(e,p2);
    P.n=Math.abs(p1-p2)<1e-10?Math.sin(p1):(m1*m1-m2*m2)/(q2-q1);P.C=m1*m1+P.n*q1;P.r0=P.a*Math.sqrt(P.C-P.n*q0)/P.n;
  }
  const r=P.a*Math.sqrt(P.C-P.n*qq(e,la*RAD))/P.n,th=P.n*dl(lo,P);
  return[P.fe+r*Math.sin(th),P.fn+P.r0-r*Math.cos(th)];
}
function polyFwd(lo,la,P){
  const ph=la*RAD,lam=dl(lo,P),M0=marc(P,P.lat0*RAD);
  if(Math.abs(ph)<1e-10)return[P.fe+P.a*lam,P.fn-M0];
  const e2=P.f*(2-P.f),s=Math.sin(ph),N=P.a/Math.sqrt(1-e2*s*s),E=lam*s,cot=1/Math.tan(ph);
  return[P.fe+N*cot*Math.sin(E),P.fn+marc(P,ph)-M0+N*cot*(1-Math.cos(E))];
}
const eqcFwd=(lo,la,P)=>[P.fe+P.a*dl(lo,P)*Math.cos((P.sp1||0)*RAD),P.fn+P.a*(la-(P.lat0||0))*RAD];
const FW={tm:tmFwd,merc:mercFwd,lcc:lccFwd,alb:albFwd,poly:polyFwd,eqc:eqcFwd};
const fwdP=(P,lo,la)=>P&&FW[P.t]?FW[P.t](lo,la,P):[lo,la];
function invP(P,X,Y,g){
  let lo=g[0],la=g[1];
  for(let i=0;i<10;i++){
    const f=fwdP(P,lo,la),h=1e-6,fl=fwdP(P,lo+h,la),fa=fwdP(P,lo,la+h),
          a=(fl[0]-f[0])/h,b=(fa[0]-f[0])/h,c=(fl[1]-f[1])/h,d=(fa[1]-f[1])/h,det=a*d-b*c,ex=X-f[0],ey=Y-f[1];
    lo+=(d*ex-b*ey)/det;la+=(-c*ex+a*ey)/det;
  }
  return[lo,la];
}
function gauss(A,b){
  const n=3,M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;[M[i],M[p]]=[M[p],M[i]];for(let r=i+1;r<n;r++){const f=M[r][i]/M[i][i];for(let c=i;c<=n;c++)M[r][c]-=f*M[i][c]}}
  const x=[0,0,0];for(let i=n-1;i>=0;i--){let s=M[i][n];for(let c=i+1;c<n;c++)s-=M[i][c]*x[c];x[i]=s/M[i][i]}return x;
}
function fitAffine(G,Q){
  const m=[G.reduce((a,g)=>a+g[0],0)/G.length,G.reduce((a,g)=>a+g[1],0)/G.length];
  const A=[[0,0,0],[0,0,0],[0,0,0]],b1=[0,0,0],b2=[0,0,0];
  G.forEach((g,i)=>{const r=[g[0]-m[0],g[1]-m[1],1];for(let j=0;j<3;j++){for(let k=0;k<3;k++)A[j][k]+=r[j]*r[k];b1[j]+=r[j]*Q[i][0];b2[j]+=r[j]*Q[i][1]}});
  const p=gauss(A,b1),q=gauss(A,b2);
  return [p[0],p[1],p[2]-p[0]*m[0]-p[1]*m[1],q[0],q[1],q[2]-q[0]*m[0]-q[1]*m[1]];
}
/* ---------- GeoPDF: render native (PdfRenderer di thread latar) — WebView tidak lagi membeku ---------- */
let _pm=null;const PM=()=>_pm||(_pm=plug('PdfMap'));
const fileUrl=p=>window.Capacitor.convertFileSrc('file://'+p);
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
async function fileBlob(path){const r=await fetch(fileUrl(path));if(!r.ok)throw new Error('Gagal membaca berkas sementara (HTTP '+r.status+').');return r.blob()}

/* Kotak halaman (CropBox ∩ MediaBox), rotasi, dan indeks halaman dari struktur PDF — setara page.view / page.rotate pdf.js */
function pageGeom(objs,num){
  const R=v=>{for(let n=0;v&&typeof v=='object'&&v.ref!=null&&n<8;n++)v=objs[v.ref];return v};
  const nums=a=>{a=R(a);return Array.isArray(a)&&a.length>=4?a.slice(0,4).map(x=>+R(x)):null};
  const n4=b=>b&&b.every(isFinite)?[Math.min(b[0],b[2]),Math.min(b[1],b[3]),Math.max(b[0],b[2]),Math.max(b[1],b[3])]:null;
  let media=null,crop=null,rot=null,d=objs[num],guard=0;
  while(d&&typeof d=='object'&&!Array.isArray(d)&&guard++<24){
    if(!media)media=nums(d.MediaBox);
    if(!crop)crop=nums(d.CropBox);
    if(rot==null&&d.Rotate!==undefined){const r=+R(d.Rotate);if(!isNaN(r))rot=r}
    d=R(d.Parent);
  }
  let v=n4(media)||[0,0,612,792];const c=n4(crop);
  if(c){const x0=Math.max(v[0],c[0]),y0=Math.max(v[1],c[1]),x1=Math.min(v[2],c[2]),y1=Math.min(v[3],c[3]);if(x1>x0&&y1>y0)v=[x0,y0,x1,y1]}
  rot=(((Math.round((rot||0)/90)*90)%360)+360)%360;
  let idx=0;
  try{
    let cnt=0,found=-1;
    const walk=(ref,depth)=>{
      if(found>=0||depth>30)return;
      const key=ref&&ref.ref!=null?ref.ref:ref,o=objs[key];
      if(!o||typeof o!='object'||Array.isArray(o))return;
      if(o.Type==='/Pages'||o.Kids!==undefined){const kids=R(o.Kids);if(Array.isArray(kids))for(const k of kids){walk(k,depth+1);if(found>=0)return}}
      else{if(+key===num)found=cnt;cnt++}
    };
    for(const k of Object.keys(objs)){const o=objs[k];if(o&&typeof o=='object'&&!Array.isArray(o)&&o.Type==='/Pages'&&o.Parent===undefined){walk({ref:+k},0);if(found>=0)break}}
    if(found>=0)idx=found;
  }catch(e){}
  return{view:v,rot,idx};
}
/* titik halaman PDF -> piksel viewport pada skala 1 (identik dengan pdf.js) */
function vpFn(v,rot){
  const x0=v[0],y0=v[1],x1=v[2],y1=v[3];
  return rot==90?(x,y)=>[y-y0,x-x0]:rot==180?(x,y)=>[x1-x,y-y0]:rot==270?(x,y)=>[y1-y,x1-x]:(x,y)=>[x-x0,y1-y];
}

/* antrean render native: yang terakhir diminta dikerjakan dulu, tile yang sudah tidak terlihat dilewati */
const natQ=[];let natBusy=false;
function natRender(args,stale){return new Promise((ok,no)=>{natQ.push({args,stale,ok,no});natPump()})}
async function natPump(){
  if(natBusy)return;natBusy=true;
  try{
    while(natQ.length){
      const j=natQ.pop();
      if(j.stale&&j.stale()){j.ok(null);continue}
      try{j.ok(await PM().render(j.args))}catch(e){j.no(e)}
    }
  }finally{natBusy=false}
}
/* ---------- Peta tajam: wilayah yang terlihat dirender langsung dari PDF asli ---------- */
async function drawRegion(M,ctx,u0,v0,u1,v1,dx,dy,dw,dh,stale){
  const T=M.tl;if(!T||!T.nat)return;
  const cu0=Math.max(0,u0),cv0=Math.max(0,v0),cu1=Math.min(M.w,u1),cv1=Math.min(M.h,v1);
  if(cu1<=cu0||cv1<=cv0)return;
  const kx=dw/(u1-u0),ky=dh/(v1-v0),ow=Math.max(1,Math.min(2048,Math.round((cu1-cu0)*kx))),oh=Math.max(1,Math.min(2048,Math.round((cv1-cv0)*ky)));
  const r=await natRender({src:M.id,page:T.pg,kv:T.kv,ox:T.ox+cu0,oy:T.oy+cv0,rw:cu1-cu0,rh:cv1-cv0,ow,oh,q:82},stale);
  if(!r||!r.data)return;
  const im=await loadImg('data:image/jpeg;base64,'+r.data);
  ctx.drawImage(im,dx+(cu0-u0)*kx,dy+(cv0-v0)*ky,(cu1-cu0)*kx,(cv1-cv0)*ky);
}
let TileGL=null;
function tileLayerFor(M){
  const T=M.tl;
  if(!T||!T.nat)return L.layerGroup();
  if(!TileGL)TileGL=L.GridLayer.extend({
    createTile(c,done){
      const cv=document.createElement('canvas'),s=this.getTileSize(),b=this._tileCoordsToBounds(c),m=this.M;cv.width=s.x;cv.height=s.y;
      drawRegion(m,cv.getContext('2d'),b.getWest(),m.h-b.getNorth(),b.getEast(),m.h-b.getSouth(),0,0,s.x,s.y,()=>cv._dead).then(()=>done(null,cv),e=>done(e,cv));
      return cv;
    }
  });
  const mz=Math.min(2,Math.max(-T.L,Math.floor(Math.log2(T.r||1))+1));   // tile native hanya dipakai saat zoom lebih rapat dari gambar dasar
  const l=new TileGL({tileSize:512,minNativeZoom:mz,minZoom:mz,maxNativeZoom:2,noWrap:true,keepBuffer:1,updateWhenIdle:true});
  l.M=M;l.on('tileunload',e=>{e.tile._dead=true});
  return l;
}
function ppmOf(aff,proj,lat0){
  return proj?(Math.hypot(aff[0],aff[3])+Math.hypot(aff[1],aff[4]))/2:(Math.hypot(aff[1],aff[4])/110574+Math.hypot(aff[0],aff[3])/(111320*Math.cos(lat0*Math.PI/180)))/2;
}
async function renderGeoPdf(geo,name,prog){
  const id='m'+Date.now(),v=geo.list[0],N=PM();
  if(v.bad)throw new Error('Georeferensi ditemukan, tetapi memakai '+v.pname+' yang belum didukung. Gunakan georeferensi manual.');
  const pg=pageGeom(geo.objs,v.page),vp=vpFn(pg.view,pg.rot),sw0=pg.view[2]-pg.view[0],sh0=pg.view[3]-pg.view[1],
        sw=pg.rot%180?sh0:sw0,sh=pg.rot%180?sw0:sh0;
  prog&&prog('Membaca halaman PDF…');
  const info=await N.info({src:'tmp',page:pg.idx});
  if(Math.abs(info.w-sw)>3||Math.abs(info.h-sh)>3)throw new Error(`Ukuran halaman PDF (${Math.round(info.w)}×${Math.round(info.h)}) tidak cocok dengan data georeferensinya (${Math.round(sw)}×${Math.round(sh)}). Gunakan georeferensi manual.`);
  const Kv=Math.min(12,16000/Math.max(sw,sh));   // skala "penuh" (virtual): sebagai acuan koordinat & render tajam
  const bb=v.bbox||pg.view,x0=Math.min(bb[0],bb[2]),x1=Math.max(bb[0],bb[2]),y0=Math.min(bb[1],bb[3]),y1=Math.max(bb[1],bb[3]);
  const VW=Math.ceil(sw*Kv),VH=Math.ceil(sh*Kv),P=(x,y)=>{const q=vp(x,y);return[q[0]*Kv,q[1]*Kv]};
  let Pp=[],G=[],proj=null,pname='lat/lon',lat0=0,c0=[0,0];
  if(v.kind=='iso'){
    const g=v.gpts,l=v.lpts,n=g.length>>1;let la0=0,lo0=0;
    proj=v.proj&&v.proj.t!='none'?v.proj:null;
    pname=v.proj?(v.proj.t=='none'?v.proj.name+' (tidak didukung, pendekatan linear)':v.proj.name):'lat/lon';
    for(let k=0;k<n;k++){
      let la=g[2*k],lo=g[2*k+1];if(Math.abs(la)>90){const z=la;la=lo;lo=z}
      Pp.push([x0+l[2*k]*(x1-x0),y0+l[2*k+1]*(y1-y0)]);G.push(fwdP(proj,lo,la));la0+=la/n;lo0+=lo/n;
    }
    c0=[lo0,la0];lat0=la0;
  }else{
    proj=v.proj;pname=v.proj?v.proj.name:v.pname;
    if(v.reg){Pp=v.reg.pp;G=v.reg.xy}
    else{const [a,b,cc,d,e,f]=v.ctm;Pp=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];G=Pp.map(([x,y])=>[a*x+cc*y+e,b*x+d*y+f])}
    if(v.geo){
      G=G.map(([X,Y])=>Math.abs(Y)>90&&Math.abs(X)<=90?[Y,X]:[X,Y]);
      if(G.some(([X,Y])=>Math.abs(X)>360||Math.abs(Y)>90))throw new Error('Koordinat OGC tidak terbaca sebagai lintang/bujur. Gunakan georeferensi manual.');
      lat0=G.reduce((s,q)=>s+q[1],0)/G.length;c0=[G.reduce((s,q)=>s+q[0],0)/G.length,lat0];
    }else{c0=[proj.lon0||0,proj.lat0||0];lat0=proj.lat0||0}
  }
  const Q=Pp.map(([x,y])=>P(x,y)),cs=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([a,b])=>P(a,b));
  const cx0=Math.max(0,Math.floor(Math.min(...cs.map(q=>q[0])))),cx1=Math.min(VW,Math.ceil(Math.max(...cs.map(q=>q[0])))),
        cy0=Math.max(0,Math.floor(Math.min(...cs.map(q=>q[1])))),cy1=Math.min(VH,Math.ceil(Math.max(...cs.map(q=>q[1]))));
  const w=cx1-cx0,h=cy1-cy0;
  if(w<10||h<10)throw new Error('Area peta tidak valid.');
  const Q2=Q.map(q=>[q[0]-cx0,q[1]-cy0]),aff=fitAffine(G,Q2);
  if(aff.some(z=>!isFinite(z)))throw new Error('Titik georeferensi tidak valid (segaris / duplikat).');
  const err=Math.max(...G.map((q,i)=>Math.hypot(aff[0]*q[0]+aff[1]*q[1]+aff[2]-Q2[i][0],aff[3]*q[0]+aff[4]*q[1]+aff[5]-Q2[i][1])));
  if(err>0.02*Math.max(w,h))throw new Error('Georeferensi PDF tidak konsisten (galat '+Math.round(err)+' px). Gunakan georeferensi manual.');
  /* gambar dasar: satu kali render native ke JPEG (ukuran dibatasi sesuai memori HP), sisanya dirender per-wilayah saat zoom */
  let mi={memClass:256};try{mi=await N.memInfo()}catch(e){}
  const cap=mi.lowRam||mi.memClass<192?2600:mi.memClass<320?3600:4096;
  let blob=null,base=1,last=null;
  for(const B of [cap,Math.round(cap*.7),2048,1400]){
    base=Math.min(1,B/Math.max(w,h));
    const ow=Math.max(16,Math.round(w*base)),oh=Math.max(16,Math.round(h*base));
    prog&&prog('Merender peta '+ow+'×'+oh+' px…');
    try{
      const r=await N.render({src:'tmp',page:pg.idx,kv:Kv,ox:cx0,oy:cy0,rw:w,rh:h,ow,oh,q:86,out:'base_'+id+'.jpg'});
      blob=await fileBlob(r.path);last=null;break;
    }catch(e){last=e;logE('peta','render dasar '+B+' gagal: '+(e&&e.message||e))}
  }
  if(!blob)throw last||new Error('Gagal merender peta.');
  prog&&prog('Menyimpan peta…');
  await N.save({id});                                  // PDF asli disimpan untuk render tajam saat zoom
  const tl={nat:1,id,pg:pg.idx,kv:Kv,ox:cx0,oy:cy0,r:base,ts:512,L:Math.max(0,Math.ceil(Math.log2(Math.max(w,h)/512)))};
  const info2=`Georef: ${v.kind=='iso'?'ISO 32000':'OGC LGIDict'}, render native, resolusi penuh ${w}×${h} px, ${geo.list.length>1?'viewport terbesar dari '+geo.list.length+', ':''}halaman ${pg.idx+1}, ${pname}, galat ${err.toFixed(2)} px`;
  const det0=aff[0]*aff[4]-aff[1]*aff[3],vr=det0>0?1:0;   // peta nyata tidak pernah cermin: det > 0 berarti satu sumbu terbalik
  const raw={kind:v.kind,page:pg.idx+1,nvp:geo.list.length,view:pg.view,rot:pg.rot,bbox:bb,gpts:v.gpts||null,lpts:v.lpts||null,ctm:v.ctm||null,reg:v.reg||null,proj:pname,det:det0};
  return{id,name,blob,w,h,tl,aff:variantAff(aff,vr,w,h),aff0:[...aff],vr,raw,proj,c0,ppm:ppmOf(aff,proj,lat0),info:info2+(vr?' · orientasi cermin terdeteksi, otomatis dibalik vertikal':''),t:new Date().toISOString()};
}
function manualGeoref(canvas,name){
  return new Promise(async res=>{
    const w=canvas.width,h=canvas.height,blob=await cb(canvas,.85);
    if(!blob){alert('Gagal memproses gambar (memori tidak cukup).');return res(null)}
    const u=URL.createObjectURL(blob),pts=[],o=document.createElement('div');
    o.style.cssText='position:fixed;inset:0;z-index:70;background:#fff;display:flex;flex-direction:column';
    o.innerHTML=`<div style="background:var(--g);color:#fff;padding:calc(10px + env(safe-area-inset-top)) 12px 10px"><b>Georeferensi manual</b><div id="gmi" style="font-size:12px"></div></div><div id="gm" style="flex:1"></div><div class="dbt" style="padding:10px 12px calc(10px + env(safe-area-inset-bottom))"><button class="b gray" data-v="x">Batal</button><button class="b gray" data-v="u">Hapus titik terakhir</button><button class="b" data-v="ok">Selesai</button></div>`;
    document.body.appendChild(o);
    const m=L.map('gm',{crs:L.CRS.Simple,minZoom:-7,maxZoom:5,zoomSnap:.25,attributionControl:false});
    L.imageOverlay(u,[[0,0],[h,w]]).addTo(m);m.fitBounds([[0,0],[h,w]]);
    const lg=L.layerGroup().addTo(m),info=()=>{$('#gmi').textContent=`Ketuk lokasi yang koordinatnya Anda ketahui, lalu isi koordinatnya. Titik: ${pts.length} (minimal 3, sebar di sudut-sudut peta).`};
    const draw=()=>{lg.clearLayers();pts.forEach((p,i)=>L.circleMarker([h-p.v,p.u],{radius:9,color:'#fff',weight:2,fillColor:'#d32f2f',fillOpacity:1}).addTo(lg).bindTooltip(String(i+1),{permanent:true,direction:'right'}));info()};
    const done=r=>{m.remove();o.remove();URL.revokeObjectURL(u);res(r)};
    m.on('click',e=>{
      const s=prompt('Koordinat titik ini (lintang, bujur — derajat desimal).\nContoh: 0.746551, 117.415233\nKolom sudah berisi posisi GPS Anda saat ini; ganti sesuai titik yang diketuk.',cur?cur.lat.toFixed(6)+', '+cur.lon.toFixed(6):'');
      if(!s)return;
      const n=(s.match(/-?\d+(?:[.,]\d+)?/g)||[]).map(x=>+x.replace(',','.'));
      if(n.length<2||Math.abs(n[0])>90||Math.abs(n[1])>180)return alert('Format koordinat tidak valid.');
      pts.push({u:e.latlng.lng,v:h-e.latlng.lat,la:n[0],lo:n[1]});draw();
    });
    o.onclick=e=>{
      const k=e.target.dataset&&e.target.dataset.v;if(!k)return;
      if(k=='x')return done(null);
      if(k=='u'){pts.pop();return draw()}
      if(pts.length<3)return alert('Minimal 3 titik.');
      const G=pts.map(p=>[p.lo,p.la]),Q=pts.map(p=>[p.u,p.v]),aff=fitAffine(G,Q);
      if(aff.some(z=>!isFinite(z)))return alert('Titik tidak boleh segaris atau kembar. Tambah / ubah titik.');
      const err=Math.max(...G.map((q,i)=>Math.hypot(aff[0]*q[0]+aff[1]*q[1]+aff[2]-Q[i][0],aff[3]*q[0]+aff[4]*q[1]+aff[5]-Q[i][1])));
      const la0=pts.reduce((s,p)=>s+p.la,0)/pts.length,lo0=pts.reduce((s,p)=>s+p.lo,0)/pts.length;
      cb(canvas,.85).then(b2=>done({id:'m'+Date.now(),name,blob:b2,w,h,aff,aff0:[...aff],proj:null,c0:[lo0,la0],ppm:ppmOf(aff,null,la0),info:`Georef manual: ${pts.length} titik, galat ${err.toFixed(1)} px`,t:new Date().toISOString()}));
    };
    draw();
  });
}
async function pdfToCanvas(){
  const N=PM(),info=await N.info({src:'tmp',page:0}),kv=Math.min(12,4000/Math.max(info.w,info.h));
  const ow=Math.max(16,Math.round(info.w*kv)),oh=Math.max(16,Math.round(info.h*kv));
  const r=await N.render({src:'tmp',page:0,kv,ox:0,oy:0,rw:info.w*kv,rh:info.h*kv,ow,oh,q:88,out:'page_'+Date.now()+'.jpg'});
  const u=URL.createObjectURL(await fileBlob(r.path));let im;
  try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);
  return c;
}
async function impMap(){
  if(!PM())return alert('Impor peta hanya tersedia di aplikasi Android.');
  busy('Membuka berkas…');
  let f;try{f=await PM().pick()}catch(e){busy();return alert('Gagal membuka berkas: '+(e&&e.message||e))}
  if(!f||f.cancelled){busy();return}
  await impMapFile(f);
}
async function impMapFile(f){
  if(!window.L)return alert('Pustaka peta belum termuat.');
  const N=PM(),picked=true;
  try{
    const name=(f.name||'Peta').replace(/\.[^.]+$/,'')||'Peta';
    const isImg=/^image\//.test(f.mime||'')||/\.(jpe?g|png|webp|bmp)$/i.test(f.name||'');
    let rec=null;
    if(isImg){
      busy('Memuat gambar…');
      const u=URL.createObjectURL(await fileBlob(f.path));let im;
      try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}
      const k=Math.min(1,5000/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      busy();rec=await manualGeoref(c,name);
    }else{
      busy('Membaca georeferensi…');
      let geo;
      {const buf=await (await fetch(fileUrl(f.path))).arrayBuffer();geo=await parseGeo(buf)}
      if(geo.list.length)rec=await renderGeoPdf(geo,name,busy);
      else{
        busy();
        if(!confirm('Georeferensi bawaan PDF tidak terbaca ('+diagMsg(geo.diag)+').\n\nLanjut georeferensi manual? Anda menandai minimal 3 titik pada peta dan mengisi koordinatnya.'))return;
        busy('Merender halaman PDF…');
        const c=await pdfToCanvas();
        busy();rec=await manualGeoref(c,name);
      }
    }
    busy();if(!rec)return;
    await mPut(rec);mf.map=rec.id;mv=null;if(view=='settings')settingsView();else mapView();
  }catch(e){
    busy();logE('peta','impor gagal: '+(e&&e.message||e));
    alert('Gagal impor peta: '+(e&&e.message||e));
  }finally{
    if(picked)try{await N.cleanup()}catch(e){}
  }
}
async function delMap(){
  if(!confirm('Hapus peta ini dari aplikasi? Data sensus tidak terpengaruh.'))return;
  const id=mf.map;
  await mDel(id);await tDelMap(id).catch(()=>{});
  try{const N=PM();if(N)await N.remove({id})}catch(e){}
  mf.map='';mv=null;if(view=='settings')settingsView();else mapView();
}

/* ---------- Peta ---------- */
const PAL=['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#00acc1','#f032e6','#9e9d24','#795548','#000075','#800000','#00695c'];
const RAMP=['#2e7d32','#9ccc65','#fdd835','#fb8c00','#d32f2f'];
const hx=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function rampC(t){const n=RAMP.length-1,x=Math.min(.9999,Math.max(0,t))*n,i=Math.floor(x),f=x-i,a=hx(RAMP[i]),b=hx(RAMP[i+1]);return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('')}
const r2=x=>Math.round(x*100)/100;
const detail=(s,r)=>s.def.f.map(f=>{const v=f.t=='bbc'&&r.d[f.k+'_nf']?'tidak ditemukan':r.d[f.k];return v===''||v==null?null:`${E(lab(f))}: ${E(v)}`}).filter(Boolean).join('<br>');
function xy(la,lo){
  if(onl)return L.latLng(la,lo);
  if(mapRec){const a=mapRec.aff,q=fwdP(mapRec.proj,lo,la);return L.latLng(mapRec.h-(a[3]*q[0]+a[4]*q[1]+a[5]),a[0]*q[0]+a[1]*q[1]+a[2])}
  return L.latLng((la-ref.lat)*110574,(lo-ref.lon)*111320*Math.cos(ref.lat*Math.PI/180));
}
function setRef(){
  for(const s of sessions)for(const r of s.recs){const la=parseFloat(r.lat),lo=parseFloat(r.lon);if(!isNaN(la)&&!isNaN(lo)){ref={lat:la,lon:lo};return}}
  if(cur)ref={lat:cur.lat,lon:cur.lon};
}
function mapPts(){
  const out=[];
  for(const s of sessions){
    if(mf.off[s.id]||mf.jenis&&title(s)!=mf.jenis||mf.blok&&s.h.blok!=mf.blok||mf.tgl&&s.h.tgl!=mf.tgl)continue;
    for(const r of s.recs){const la=parseFloat(r.lat),lo=parseFloat(r.lon);if(!isNaN(la)&&!isNaN(lo))out.push({s,r,la,lo})}
  }
  return out;
}
function numBins(pts,val,none){
  const nums=pts.map(val).filter(v=>v!==null).sort((a,b)=>a-b),dist=[...new Set(nums)];
  if(dist.length<=6)return{lab:p=>{const v=val(p);return v===null?none:String(v)},ord:dist.map(String).concat([none])};
  const n=5,min=nums[0],st=(nums[nums.length-1]-min)/n,B=i=>`${r2(min+i*st)}–${r2(min+(i+1)*st)}`;
  return{lab:p=>{const v=val(p);return v===null?none:B(Math.min(n-1,Math.floor((v-min)/st)))},ord:[0,1,2,3,4].map(B).concat([none])};
}
function colorize(pts){
  const gray='#9e9e9e';
  if(!pts.length)return{leg:[],color:()=>gray};
  let lab=p=>title(p.s),ord=null,none='';const by=mf.by;
  const f=mf.jenis&&!['jenis','blok','tgl','lux'].includes(by)?pts[0].s.def.f.find(x=>x.k==by):null;
  if(by=='blok')lab=p=>p.s.h.blok;
  else if(by=='tgl')lab=p=>p.s.h.tgl;
  else if(by=='lux'){none='Tidak ada';const nb=numBins(pts,p=>(p.r.lux===''||p.r.lux==null||isNaN(p.r.lux))?null:+p.r.lux,none);lab=nb.lab;ord=nb.ord}
  else if(f){
    if(f.t=='num'||f.t=='bbc'){none='Tidak ditemukan';const nb=numBins(pts,p=>f.t=='bbc'&&p.r.d[f.k+'_nf']?null:(+p.r.d[f.k]||0),none);lab=nb.lab;ord=nb.ord}
    else if(f.t=='sel'||f.t=='yn'){lab=p=>String(p.r.d[f.k]??'');ord=f.t=='yn'?['Ya','Tidak']:f.o}
    else lab=p=>p.r.d[f.k]?'Ada isi':'Kosong';
  }
  const cnt=new Map();pts.forEach(p=>{p.l=lab(p);cnt.set(p.l,(cnt.get(p.l)||0)+1)});
  const keys=ord?ord.filter(k=>cnt.has(k)).concat([...cnt.keys()].filter(k=>!ord.includes(k))):[...cnt.keys()].sort();
  const numeric=ord&&none!=='',nk=keys.filter(k=>k!==none),col={};
  keys.forEach((k,i)=>{col[k]=numeric?(k===none?gray:rampC(nk.length>1?nk.indexOf(k)/(nk.length-1):0)):(k===''?gray:PAL[i%PAL.length])});
  return{leg:keys.map(k=>[col[k],k||'(kosong)',cnt.get(k)]),raw:keys,color:p=>col[p.l]||gray};
}
function byOpts(){
  if(!$('#mby'))return;
  const o=[['jenis','Jenis sensus'],['blok','Blok'],['tgl','Tanggal'],['lux','Nilai lux']],s0=mf.jenis?sessions.find(s=>title(s)==mf.jenis):null;
  if(s0)s0.def.f.forEach(f=>o.push([f.k,'Detail: '+lab(f)]));
  $('#mby').innerHTML=o.map(([k,l])=>`<option value="${k}" ${mf.by==k?'selected':''}>${E(l)}</option>`).join('');
}
function mfSet(k,v){mf[k]=v;if(k=='jenis'){mf.by='jenis';byOpts()}if(k=='jenis'||k=='by')mf.hide={};drawPts(false)}
function legTog(i){const k=legRaw[i];mf.hide[k]=!mf.hide[k];drawPts(false)}
function clTog(id){mf.off[id]=!mf.off[id];drawPts(false);clCount()}
function clAll(on){sessions.forEach(s=>{mf.off[s.id]=!on});clUi();drawPts(false)}
function clCount(){const el=$('#clc');if(el)el.textContent=`${sessions.filter(s=>!mf.off[s.id]).length} dari ${sessions.length} sesi ditampilkan`}
function clUi(){
  const el=$('#cl');if(!el)return;
  el.innerHTML=sessions.map(s=>{const n=s.recs.filter(r=>!isNaN(parseFloat(r.lat))).length;return `<label class="opt" style="margin:4px 0;padding:8px"><input type="checkbox" ${mf.off[s.id]?'':'checked'} onchange="clTog(${s.id})"><span style="flex:1;font-size:13px"><b>${E(title(s))}</b><br>Blok ${E(s.h.blok)} · ${E(s.h.tgl)} · ${E(s.h.petugas)} · ${n} titik</span></label>`}).join('')||'<p class="m">Belum ada data sensus.</p>';
  clCount();
}
function popHTML(p){
  const s=p.s,r=p.r;
  return `<b>${E(title(s))}</b><br>${E(un(s))} ${r.no} · Blok ${E(s.h.blok)}<br>${E(s.h.tgl)} · ${E(s.h.petugas)}<br>${detail(s,r)}${r.lux!==''&&r.lux!=null?`<br>Lux: ${E(r.lux)}`:''}${r.hdg!=null?`<br>Arah hadap: ${r.hdg}° ${card8(r.hdg)}`:''}${cur?`<br><span class="m">Dari posisi saya: ${fmtD(hav([cur.lat,cur.lon],[p.la,p.lo]))} · ${brg([cur.lat,cur.lon],[p.la,p.lo])}</span>`:''}<div style="margin-top:6px"><button class="b" style="padding:6px 12px" onclick="go('edit','${s.id}:${r.no}')">Koreksi</button></div>`;
}
function photoPts(){
  const out=[];
  for(const ph of galData){
    if(mf.off[ph.sid]||mf.jenis&&ph.jenis!=mf.jenis||mf.blok&&ph.blok!=mf.blok||mf.tgl&&ph.tgl!=mf.tgl)continue;
    let la=ph.lat,lo=ph.lon;
    if(la==null||la===''){const s=find(ph.sid),r=s&&s.recs[ph.no-1];if(r){la=r.lat;lo=r.lon}}
    la=parseFloat(la);lo=parseFloat(lo);if(!isNaN(la)&&!isNaN(lo))out.push({ph,la,lo});
  }
  return out;
}
function drawPts(fit){
  if(!LM)return;
  LL.clearLayers();
  const pts=mapPts(),cz=colorize(pts),B=[];legRaw=cz.raw||[];
  pts.forEach(p=>{
    if(mf.hide[p.l])return;
    const ll=xy(p.la,p.lo);B.push(ll);
    L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:cz.color(p),fillOpacity:.95,bubblingMouseEvents:false}).addTo(LL).bindPopup(()=>popHTML(p));
  });
  let nph=0;
  if(mf.ph)photoPts().forEach(q=>{
    nph++;
    L.marker(xy(q.la,q.lo),{icon:L.divIcon({className:'',html:'<div class="ph">📷</div>',iconSize:[26,26],iconAnchor:[13,32]})}).addTo(LL)
     .bindPopup(()=>{const u=URL.createObjectURL(q.ph.th);gU.push(u);return `<img src="${u}" style="width:160px;border-radius:6px"><br>${E(q.ph.jenis)}<br>${E(q.ph.unit||'Pokok')} ${q.ph.no}${q.ph.ket?'<br>'+E(q.ph.ket):''}<div style="margin-top:6px"><button class="b" style="padding:6px 12px" onclick="go('photo','${q.ph.id}')">Buka foto</button></div>`});
  });
  const lh=(mapErr?`<div class="m" style="color:var(--r);margin-bottom:6px">${E(mapErr)}</div>`:'')+(cz.leg.map(([c,l,n],i)=>`<label class="opt" style="margin:4px 0;padding:6px 8px"><input type="checkbox" ${mf.hide[cz.raw[i]]?'':'checked'} onchange="legTog(${i})"><span class="dot" style="background:${c}"></span>${E(l)} <span class="m">(${n})</span></label>`).join('')||'<div class="m">Belum ada data bertitik koordinat untuk filter ini.</div>');
  const lg=$('#leg');if(lg)lg.innerHTML=lh;
  lastInfo={n:pts.length,ph:nph,pts};
  const lo=$('#lgo');if(lo){lo.innerHTML=cz.leg.slice(0,6).map(([c,l,n])=>`<div><span class="dot" style="background:${c}"></span>${E(l)} (${n})</div>`).join('');lo.style.display=cz.leg.length?'block':'none'}
  msUpdate();
  userDraw();
  if(fit){
    if(mv&&mv.id==mf.map)LM.setView(mv.c,mv.z,{animate:false});
    else if(mapRec)LM.fitBounds([[0,0],[mapRec.h,mapRec.w]]);
    else if(B.length>1)LM.fitBounds(L.latLngBounds(B).pad(.2),{maxZoom:onl?19:3});
    else if(B.length)LM.setView(B[0],onl?17:2);
    else LM.setView(cur?xy(cur.lat,cur.lon):(onl?[0.75,117.4]:[0,0]),cur?(onl?17:2):(onl?6:0));
  }
}
function mapInfo(pts){
  if(!mapRec)return'';
  const [a,b,c,d,e,f]=mapRec.aff,det=a*e-b*d,P=mapRec.proj,g0=mapRec.c0||[0,0];
  const cs=[[0,0],[mapRec.w,0],[mapRec.w,mapRec.h],[0,mapRec.h]].map(([u,v])=>{const X=(e*(u-c)-b*(v-f))/det,Y=(a*(v-f)-d*(u-c))/det;return P?invP(P,X,Y,g0):[X,Y]});
  const lo=cs.map(q=>q[0]),la=cs.map(q=>q[1]);
  const out=pts.filter(p=>{const q=xy(p.la,p.lo);return q.lng<0||q.lng>mapRec.w||q.lat<0||q.lat>mapRec.h}).length;
  return `<div class="m" style="margin-top:6px">Cakupan peta: lat ${Math.min(...la).toFixed(4)} s/d ${Math.max(...la).toFixed(4)}, lon ${Math.min(...lo).toFixed(4)} s/d ${Math.max(...lo).toFixed(4)}${mapRec.info?'\n'+E(mapRec.info):''}${mapRec.vr?'\nOrientasi: '+VN[mapRec.vr]:''}${out?`\n⚠ ${out} titik sensus berada di luar area peta ini`:''}</div>`;
}
function toMap(){if(mapRec)LM.fitBounds([[0,0],[mapRec.h,mapRec.w]]);else toPts()}
function toPts(){
  const B=mapPts().map(p=>xy(p.la,p.lo));
  if(B.length>1)LM.fitBounds(L.latLngBounds(B).pad(.2),{maxZoom:onl?19:3});
  else if(B.length)LM.setView(B[0],Math.max(LM.getZoom(),onl?17:1));
  else if(mapRec)LM.fitBounds([[0,0],[mapRec.h,mapRec.w]]);
}
function userDraw(){
  if(!LM)return;
  if(userL){LM.removeLayer(userL);userL=null}
  if(!mf.me||!cur)return;
  const ll=xy(cur.lat,cur.lon);
  userL=L.layerGroup([L.circle(ll,{radius:cur.acc*(mapRec?mapRec.ppm:1),color:'#1976d2',weight:1,fillOpacity:.12,interactive:false}),L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#1976d2',fillOpacity:1,interactive:false})].concat(hdg==null?[]:[arrowMk(ll)])).addTo(LM);
}
function toMe(){
  if(!cur)return alert('Posisi GPS belum tersedia.');
  LM.setView(xy(cur.lat,cur.lon),Math.max(LM.getZoom(),onl?17:1));
}
const VN=['Normal','Balik vertikal','Balik horizontal','Putar 180°'];
function variantAff(a,k,w,h){
  let [A,B,C,D,E2,F]=a;
  if(k&1){D=-D;E2=-E2;F=h-F}
  if(k&2){A=-A;B=-B;C=w-C}
  return[A,B,C,D,E2,F];
}
async function nextVariant(){
  if(!mapRec)return;
  if(!mapRec.aff0)mapRec.aff0=[...mapRec.aff];
  mapRec.vr=((mapRec.vr||0)+1)%4;
  mapRec.aff=variantAff(mapRec.aff0,mapRec.vr,mapRec.w,mapRec.h);
  await mPut(mapRec);if(view=='map')mapView();else if(view=='settings')settingsView();
}
function showText(txt,ttl){
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="dlg"><b>${E(ttl||'Info georeferensi')}</b><textarea readonly style="height:260px;font-size:11px;margin:8px 0">${E(txt)}</textarea><div class="dbt"><button class="b gray" data-v="x">Tutup</button><button class="b" data-v="c">Salin</button></div></div>`;
  o.onclick=e=>{
    const v=e.target.dataset&&e.target.dataset.v;
    if(v=='x')o.remove();
    if(v=='c'){try{navigator.clipboard.writeText(txt);e.target.textContent='Tersalin ✓'}catch(x){o.querySelector('textarea').select()}}
  };
  document.body.appendChild(o);
}
function geoInfo(){
  if(!mapRec)return;
  const a=mapRec.aff,det=a[0]*a[4]-a[1]*a[3],P=([u,v])=>{const g=geoAt(L.latLng(mapRec.h-v,u));return g[0].toFixed(6)+', '+g[1].toFixed(6)};
  const T=[`Peta: ${mapRec.name}`,`Ukuran gambar: ${mapRec.w} x ${mapRec.h} px`,`Info: ${mapRec.info||'-'}`,`Orientasi: ${VN[mapRec.vr||0]}`,
    `det affine: ${det.toExponential(3)} (${det<0?'normal':'CERMIN'})`,`aff: ${a.map(x=>+x.toPrecision(9)).join(', ')}`,
    `Kiri-atas  (lat,lon): ${P([0,0])}`,`Kanan-atas: ${P([mapRec.w,0])}`,`Kiri-bawah: ${P([0,mapRec.h])}`,`Kanan-bawah: ${P([mapRec.w,mapRec.h])}`,`Tengah: ${P([mapRec.w/2,mapRec.h/2])}`];
  if(cur)T.push(`Posisi GPS saya: ${cur.lat.toFixed(6)}, ${cur.lon.toFixed(6)} (±${cur.acc.toFixed(1)} m)`);
  if(mapRec.raw)T.push('RAW: '+JSON.stringify(mapRec.raw));
  showText(T.join('\n'));
}
async function regeoref(){
  if(!mapRec||!window.L)return;
  if(!confirm('Georeferensi ulang manual: tandai minimal 3 titik pada peta (sebar di sudut-sudut) lalu isi koordinatnya. Tips: koordinat bisa diambil dari peta lain yang sudah benar, cukup ketuk peta itu untuk melihat koordinatnya. Lanjutkan?'))return;
  busy('Memuat peta…');
  const u=URL.createObjectURL(mapRec.blob);let im;
  try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}
  const q=Math.min(1,3000/Math.max(mapRec.w,mapRec.h)),c=document.createElement('canvas');c.width=Math.round(mapRec.w*q);c.height=Math.round(mapRec.h*q);c.getContext('2d').drawImage(im,0,0,c.width,c.height);busy();
  const r=await manualGeoref(c,mapRec.name);
  if(!r)return;
  if(mapRec.tl){const k=1/q;r.aff=r.aff.map(z=>z*k);r.aff0=r.aff.slice();r.w=mapRec.w;r.h=mapRec.h;r.blob=mapRec.blob;r.tl=mapRec.tl;r.ppm=r.ppm*q;r.info=(r.info||'')+' (peta tajam)'}
  r.id=mapRec.id;await mPut(r);mv=null;mapView();
}
function calibMap(){
  if(!mapRec)return alert('Pilih peta GeoPDF dulu.');
  if(!cur)return alert('Posisi GPS belum tersedia.');
  hint='Kalibrasi geser: berdirilah di titik yang mudah dikenali pada peta, lalu ketuk lokasi itu di peta.';msUpdate();
  pending=async e=>{
    const g=xy(cur.lat,cur.lon);
    mapRec.aff[2]+=e.latlng.lng-g.lng;mapRec.aff[5]-=e.latlng.lat-g.lat;
    hint='';await mPut(mapRec);drawPts(false);measDraw();
  };
}
async function resetCalib(){
  if(!mapRec||!mapRec.aff0)return;
  mapRec.aff=variantAff(mapRec.aff0,mapRec.vr||0,mapRec.w,mapRec.h);await mPut(mapRec);drawPts(false);measDraw();
}
/* ---------- Alat ukur, jejak, koordinat ---------- */
const hav=(a,b)=>{const r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742016*Math.asin(Math.sqrt(h))};
const fmtD=m=>m<1000?m.toFixed(1)+' m':(m/1000).toFixed(3)+' km';
const fmtA=a=>`${a.toFixed(1)} m² · ${(a/10000).toFixed(3)} ha`;
function polyArea(p){
  const la0=p.reduce((s,q)=>s+q[0],0)/p.length,lo0=p.reduce((s,q)=>s+q[1],0)/p.length,kx=111320*Math.cos(la0*Math.PI/180),ky=110574;
  const P=p.map(q=>[(q[1]-lo0)*kx,(q[0]-la0)*ky]);let a=0;
  for(let i=0;i<P.length;i++){const j=(i+1)%P.length;a+=P[i][0]*P[j][1]-P[j][0]*P[i][1]}
  return Math.abs(a)/2;
}
function brg(a,b){
  const r=Math.PI/180,y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);
  const d=(Math.atan2(y,x)/r+360)%360;return Math.round(d)+'° '+['U','TL','T','TG','S','BD','B','BL'][Math.round(d/45)%8];
}
function geoAt(ll){
  if(onl)return[ll.lat,ll.lng];
  if(!mapRec)return[ref.lat+ll.lat/110574,ref.lon+ll.lng/(111320*Math.cos(ref.lat*Math.PI/180))];
  const [a,b,c,d,e,f]=mapRec.aff,det=a*e-b*d,u=ll.lng,v=mapRec.h-ll.lat,X=(e*(u-c)-b*(v-f))/det,Y=(a*(v-f)-d*(u-c))/det;
  return mapRec.proj?invP(mapRec.proj,X,Y,mapRec.c0||[0,0]).reverse():[Y,X];
}
function msUpdate(){
  const T0=hint||mapErr||'',hb=$('#hb');
  if(hb){hb.textContent=T0;hb.style.display=T0?'block':'none'}
  const el=$('#ms');if(!el)return;
  const bd=$('#bd'),ba=$('#ba');
  if(bd)bd.style.background=meas.mode=='dist'?'var(--g)':'';
  if(ba)ba.style.background=meas.mode=='area'?'var(--g)':'';
  const p=meas.pts,per=p.reduce((a,x,i)=>i?a+hav(p[i-1],x):0,0),T=[];
  if(meas.mode)T.push(`Mode ${meas.kind=='dist'?'jarak':'luas'} aktif: ketuk peta untuk menambah titik, atau tekan "📍+ GPS".`);
  if(meas.kind=='dist'&&p.length>1)T.push(`Jarak total: ${fmtD(per)} (${p.length} titik)`);
  if(meas.kind=='area'&&p.length>2)T.push(`Luas: ${fmtA(polyArea(p))}\nKeliling: ${fmtD(per+hav(p[p.length-1],p[0]))} (${p.length} titik)`);
  el.textContent=T.join('\n');
}
function measDraw(){
  if(!LM||!LMm)return;
  LMm.clearLayers();
  const p=meas.pts,ll=p.map(q=>xy(q[0],q[1]));
  if(ll.length>1){
    if(meas.kind=='area'&&ll.length>2)L.polygon(ll,{color:'#d81b60',weight:2,fillOpacity:.2,interactive:false}).addTo(LMm);
    else L.polyline(ll,{color:'#d81b60',weight:3,dashArray:'6 6',interactive:false}).addTo(LMm);
  }
  ll.forEach(x=>L.circleMarker(x,{radius:5,color:'#fff',weight:2,fillColor:'#d81b60',fillOpacity:1,interactive:false}).addTo(LMm));
  if(meas.find)L.circleMarker(xy(meas.find[0],meas.find[1]),{radius:9,color:'#fff',weight:3,fillColor:'#fbc02d',fillOpacity:1,bubblingMouseEvents:false}).addTo(LMm).bindPopup(meas.find[0].toFixed(6)+', '+meas.find[1].toFixed(6));
  msUpdate();
}
function measMode(m){meas.mode=meas.mode==m?null:m;meas.kind=m;hint='';pending=null;measDraw()}
function measUndo(){meas.pts.pop();measDraw()}
function measClear(){meas.pts=[];meas.mode=null;meas.find=null;hint='';pending=null;measDraw()}
function measGps(){
  if(!cur)return alert('Posisi GPS belum tersedia.');
  if(!meas.mode)meas.mode=meas.kind;
  meas.pts.push([cur.lat,cur.lon]);measDraw();
}
function goCoord(){
  const s=prompt('Cari koordinat: lintang,bujur (mis. 0.7466,117.4152)');if(!s)return;
  const m=s.split(/[,;\s]+/).filter(Boolean).map(Number);
  if(m.length<2||m.some(isNaN)||Math.abs(m[0])>90||Math.abs(m[1])>180)return alert('Format koordinat tidak valid.');
  meas.find=[m[0],m[1]];measDraw();LM.setView(xy(m[0],m[1]),onl?Math.max(LM.getZoom(),17):Math.max(LM.getZoom(),1));
}
function mapClick(e){
  if(pending){const f=pending;pending=null;f(e);return}
  if(meas.mode){meas.pts.push(geoAt(e.latlng));measDraw();return}
  const g=geoAt(e.latlng);
  L.popup().setLatLng(e.latlng).setContent(`<b>${g[0].toFixed(6)}, ${g[1].toFixed(6)}</b>${cur?`<br>${fmtD(hav([cur.lat,cur.lon],g))} dari posisi saya · ${brg([cur.lat,cur.lon],g)}`:''}`).openOn(LM);
}
function addScale(){
  if(onl){L.control.scale({imperial:false}).addTo(LM);return}
  if(!mapRec||!mapRec.ppm)return;
  const C=L.Control.extend({
    onAdd(){const d=L.DomUtil.create('div','scl');this._d=d;this._u();LM.on('zoomend',()=>this._u());return d},
    _u(){const mpp=1/(mapRec.ppm*Math.pow(2,LM.getZoom())),raw=90*mpp,p=Math.pow(10,Math.floor(Math.log10(raw))),n=[1,2,5,10].map(k=>k*p).filter(v=>v<=raw).pop()||p;this._d.style.width=(n/mpp)+'px';this._d.textContent=fmtD(n)}
  });
  new C({position:'bottomleft'}).addTo(LM);
}
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Gagal memuat pustaka online (cek koneksi internet).'));document.head.appendChild(s)})}
async function loadGoogle(){
  const key=LS('gkey','');
  if(!key)throw new Error('Isi API key Google Maps lalu tekan "Simpan key & muat".');
  if(!(window.google&&google.maps)){
    window.gm_authFailure=()=>{mapErr='API key Google Maps ditolak. Pastikan Maps JavaScript API aktif dan key tidak dibatasi / mengizinkan https://localhost/*.';if(view=='map'&&$('#leg'))drawPts(false)};
    await new Promise((ok,no)=>{window.__gmok=ok;const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&callback=__gmok';s.onerror=()=>no(new Error('Gagal memuat Google Maps (cek koneksi internet).'));document.head.appendChild(s)});
  }
  if(!(L.gridLayer&&L.gridLayer.googleMutant))await loadScript('https://unpkg.com/leaflet.gridlayer.googlemutant@latest/dist/Leaflet.GoogleMutant.js');
}
async function addOnline(){
  if(mf.map=='osm')L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© OpenStreetMap'}).addTo(LM);
  else if(mf.map=='esri')L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:18,attribution:'Esri World Imagery'}).addTo(LM);
  else{try{await loadGoogle();L.gridLayer.googleMutant({type:mf.gt||'roadmap',maxZoom:21}).addTo(LM)}catch(e){mapErr=e&&e.message||String(e)}}
}
const mapLabel=()=>mapRec?mapRec.name:onl?({osm:'OpenStreetMap',esri:'Satelit Esri',google:'Google Maps'}[mf.map]):'Tanpa peta';
const card8f=d=>['Utara','Timur Laut','Timur','Tenggara','Selatan','Barat Daya','Barat','Barat Laut'][Math.round((((d%360)+360)%360)/45)%8];
const utmCache={};
function utmStr(la,lo){
  const z=Math.floor((lo+180)/6)+1,sh=la<0,k=(sh?'S':'N')+z,P=utmCache[k]||(utmCache[k]=projFromGcs({EPSG:(sh?32700:32600)+z})),q=fwdP(P,lo,la);
  return `${z}${sh?'S':'N'} ${Math.round(q[0])} ${Math.round(q[1])}`;
}
function slUi(){
  const el=$('#sl');if(!el)return;
  el.innerHTML=cur?`Posisi saya: ${cur.lat.toFixed(6)},${cur.lon.toFixed(6)} (±${Math.round(cur.acc)} m) ${cur.acc<=GPS_MAX?'✓':'…'}<br>UTM: ${utmStr(cur.lat,cur.lon)}${hdg!=null?` · Arah: ${Math.round(hdg)}° ${card8f(hdg)}`:''}`:'Mencari GPS…';
}
function compRose(){
  const el=$('#crs');if(!el)return;
  el.innerHTML='<svg viewBox="0 0 60 60" width="58" height="58"><g id="crsG"><circle cx="30" cy="30" r="27" fill="#fffd" stroke="#2e7d32" stroke-width="2.5"/><text x="30" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#c62828">U</text><path d="M30 17 L35 31 L30 28 L25 31 Z" fill="#c62828"/><path d="M30 43 L35 31 L30 34 L25 31 Z" fill="#888"/></g><path d="M30 0 L26 6 L34 6 Z" fill="#1b1f1a"/></svg><div id="crsT" class="crst">–</div>';
  compUi();
}
function fitMapH(){
  const el=$('#mp');if(!el||!el.getBoundingClientRect)return;
  el.style.height=Math.max(240,innerHeight-el.getBoundingClientRect().top-78)+'px';
  if(LM)LM.invalidateSize();
}
window.addEventListener('resize',()=>{if(view=='map')fitMapH()});
async function pickMapDlg(){
  const o=[['','— Tanpa peta (hanya titik) —'],['osm','OpenStreetMap (online)'],['esri','Satelit Esri (online)'],['google','Google Maps (online, perlu API key)'],...mapsList.map(m=>[m.id,m.name])];
  const i=await pickOpt('Pilih peta dasar',o.map(x=>x[1]));if(i<0)return;
  if(o[i][0]=='google'&&!LS('gkey','')){alert('Isi API key Google Maps di Pengaturan → Peta.');return}
  mf.map=o[i][0];mv=null;mapView();
}
function lyfUi(){
  const el=$('#lyf');if(!el)return;
  el.innerHTML=layers.map(l=>`<label class="opt" style="margin:4px 0;padding:6px 8px"><input type="checkbox" ${l.show?'checked':''} onchange="lyTog('${l.id}')"><span class="dot" style="background:${l.color}"></span>${E(l.name)} <span class="m">(${l.feats.length})</span></label>`).join('')||'<p class="m">Belum ada layer (impor di Pengaturan → Peta).</p>';
}
function openFilter(){
  closeFilter();
  const o=document.createElement('div');o.className='ov sh';o.id='fsh';
  const uniq=a=>[...new Set(a)],opt=(a,v)=>`<option value="">Semua</option>`+a.map(x=>`<option ${x==v?'selected':''}>${E(x)}</option>`).join('');
  o.innerHTML=`<div class="dlg sheet"><div class="shh"><b style="font-size:17px">Filter Data</b><button class="b" style="padding:8px 18px" onclick="closeFilter()">Selesai</button></div>
  <div class="g2">
   <div><label>Jenis sensus</label><select onchange="mfSet('jenis',this.value)">${opt(uniq(sessions.map(title)),mf.jenis)}</select></div>
   <div><label>Warnai menurut</label><select id="mby" onchange="mfSet('by',this.value)"></select></div>
   <div><label>Blok</label><select onchange="mfSet('blok',this.value)">${opt(uniq(sessions.map(s=>s.h.blok)).sort(),mf.blok)}</select></div>
   <div><label>Tanggal</label><select onchange="mfSet('tgl',this.value)">${opt(uniq(sessions.map(s=>s.h.tgl)).sort().reverse(),mf.tgl)}</select></div></div>
  <label class="opt"><input type="checkbox" ${mf.ph?'checked':''} onchange="mfSet('ph',this.checked)"> Tampilkan foto</label>
  <label class="opt"><input type="checkbox" ${mf.me?'checked':''} onchange="mf.me=this.checked;userDraw()"> Tampilkan posisi saya</label>
  <details open style="margin-top:8px"><summary>Data sensus yang ditampilkan</summary><div class="row" style="margin-top:4px"><button class="b gray" style="padding:8px" onclick="clAll(1)">Pilih semua</button><button class="b gray" style="padding:8px" onclick="clAll(0)">Kosongkan</button></div><div id="cl" style="max-height:200px;overflow:auto;margin-top:6px"></div><div id="clc" class="m"></div></details>
  <details style="margin-top:8px"><summary>Kategori (legenda)</summary><div id="leg"></div></details>
  <details style="margin-top:8px"><summary>Layer vektor</summary><div id="lyf"></div></details></div>`;
  o.onclick=e=>{if(e.target==o)closeFilter()};
  document.body.appendChild(o);byOpts();clUi();lyfUi();drawPts(false);
}
function closeFilter(){const o=$('#fsh');if(o&&o.remove)o.remove()}
function measOpen(){
  const pn=$('#mtp');if(!pn)return;
  if(pn.style.display!='none'){pn.style.display='none';meas.mode=null;measDraw();return}
  pn.innerHTML=`<div class="row" style="margin-top:0"><button id="bd" class="b gray" onclick="measMode('dist')">📏 Jarak</button><button id="ba" class="b gray" onclick="measMode('area')">⬡ Luas</button><button class="b gray" onclick="measGps()">📍+ GPS</button></div><div class="row"><button class="b gray" onclick="measUndo()">↶ Urungkan</button><button class="b gray" onclick="measClear()">🗑 Hapus</button><button class="b" onclick="measOpen()">Selesai</button></div><div id="ms" class="m" style="margin-top:6px"></div>`;
  pn.style.display='block';if(!meas.mode)meas.mode=meas.kind;msUpdate();measDraw();
}
async function moreDlg(){
  const i=await pickOpt('Menu peta',['🔎 Cari koordinat','📤 Export GIS (KML, GPX, CSV, Shapefile…)','🔍 Zoom ke data sensus','🗺 Zoom ke seluruh peta','ℹ️ Info peta & cakupan']);
  if(i==0)goCoord();else if(i==1)exportDlg('map');else if(i==2)toPts();else if(i==3)toMap();else if(i==4)infoDlg();
}
function infoDlg(){
  showText(`${lastInfo.n} titik sensus · ${lastInfo.ph} foto${mapRec?'\n':''}${mapRec?mapInfo(lastInfo.pts).replace(/<[^>]+>/g,'').replace(/&amp;/g,'&'):''}${mapErr?'\n'+mapErr:''}`,'Info peta');
}
async function mapView(){
  if(LM){try{LM.remove()}catch(e){}LM=null;userL=null;LMm=null;LLy=null}
  pending=null;hint='';cmpEl=null;closeFilter();
  if(!window.L){show('','',tabs('map')+subtabs('map')+'<div class="card">Pustaka peta belum termuat. Pastikan APK dibuild dengan workflow terbaru.</div>');return}
  let maps=[];try{maps=await mAll();galData=await pAll();layers=await lAll()}catch(e){}
  mapsList=maps;mapRec=maps.find(m=>m.id==mf.map)||null;onl=ONL.includes(mf.map);mapErr='';
  if(!mapRec&&!onl)mf.map='';
  setRef();
  show('','',`${tabs('map')}${subtabs('map')}
  <button class="pill" onclick="pickMapDlg()">Peta: ${E(mapLabel())}</button>
  <div id="sl" class="sl">Mencari GPS…</div>
  <div id="mw" style="position:relative"><div id="mp" style="height:60vh;background:#e8ece6"></div>
   <div class="fab"><button onclick="LM&&LM.zoomIn()">+</button><button onclick="LM&&LM.zoomOut()">−</button><button onclick="toMe()">◎</button><button onclick="toPts()">⛶</button></div>
   <div id="crs" class="crs"></div><div id="hb" class="hb" style="display:none"></div><div id="lgo" class="lgo" onclick="openFilter()"></div></div>
  <div id="mtp" class="mtp" style="display:none"></div>`,
  {flush:1,bar:`<button class="o" onclick="openFilter()">🔍 Filter</button><button class="o" onclick="measOpen()">📏 Ukur</button><button class="o" onclick="toMe()">📍 Posisi</button><button class="o" onclick="moreDlg()">··· Lainnya</button>`});
  slUi();compRose();fitMapH();
  if(mapRec&&!(mapRec.blob instanceof Blob)){$('#mp').innerHTML='<div class="card">Gambar peta rusak. Hapus peta ini lalu impor ulang.</div>';return}
  try{
    LM=L.map('mp',onl?{minZoom:2,maxZoom:21,zoomSnap:.5,zoomControl:false,attributionControl:true,preferCanvas:true}:{crs:L.CRS.Simple,minZoom:-7,maxZoom:5,zoomSnap:.25,zoomControl:false,attributionControl:false,preferCanvas:true});
    LLy=L.layerGroup().addTo(LM);LL=L.layerGroup().addTo(LM);LMm=L.layerGroup().addTo(LM);
    if(mapRec){
      const u=URL.createObjectURL(mapRec.blob);gU.push(u);L.imageOverlay(u,[[0,0],[mapRec.h,mapRec.w]],{pane:'tilePane',zIndex:0}).addTo(LM);
      if(mapRec.tl)tileLayerFor(mapRec).addTo(LM);
    }
    if(onl)await addOnline();
    LM.on('click',mapClick);
    LM.on('zoomend',()=>{if(LM)LM.getContainer().classList.toggle('px',LM.getZoom()>0)});
    addScale();
    fitMapH();drawPts(true);drawLayers();measDraw();
    LM.on('moveend',()=>{if(LM)mv={id:mf.map,c:LM.getCenter(),z:LM.getZoom()}});
    if(mapAfter){const f=mapAfter;mapAfter=null;setTimeout(f,400)}
  }catch(e){logE('peta',e&&e.message||e);mapErr='Peta gagal ditampilkan: '+(e&&e.message||e);msUpdate()}
}

/* ---------- Backup & Restore ---------- */
const pKeys=()=>tx('photos','readonly',s=>s.getAllKeys()),mKeys=()=>tx('maps','readonly',s=>s.getAllKeys());
const bkInfo=()=>{
  const t=LS('lastBackup',null);
  if(!t)return sessions.length?'⚠ Belum pernah backup. Disarankan backup sebelum berpindah HP atau memasang ulang aplikasi.':'Belum ada data.';
  const d=Math.floor((Date.now()-new Date(t))/864e5);
  return 'Backup terakhir: '+fmtDT(new Date(t))+(d>=7?` ⚠ ${d} hari lalu`:'');
};
async function doBackup(){
  const FS=plug('Filesystem');
  if(!FS)return alert('Backup hanya tersedia di aplikasi Android.');
  try{
    const ph=await pAll(),mp=await mAll();
    let withPh=false;
    if(ph.length)withPh=confirm(`Sertakan ${ph.length} foto sensus di backup?\nOK = sertakan (file lebih besar)\nCancel = tanpa foto`);
    try{const l=await FS.readdir({path:'',directory:'CACHE'});for(const f of l.files||[]){const n=f.name||f;if(/\.sbk$/.test(n))await FS.deleteFile({path:n,directory:'CACHE'})}}catch(e){}
    const d=new Date(),name=`SensusBlok_backup_${today()}_${p2(d.getHours())}${p2(d.getMinutes())}.sbk`;
    const w=(o,first)=>FS[first?'writeFile':'appendFile']({path:name,data:JSON.stringify(o)+'\n',directory:'CACHE',encoding:'utf8'});
    busy('Menulis data sensus…');
    await w({t:'meta',app:'SensusBlok',v:1,at:d.toISOString(),sessions,customs,hdr:{...hdr,tgl:undefined},luxk:lxK,nm:mp.length,np:withPh?ph.length:0},true);
    let i=0;
    for(const m of mp){busy(`Menulis peta ${++i}/${mp.length}…`);await w({t:'map',m:{...m,blob:await toB64(m.blob)}})}
    for(const l of await lAll())await w({t:'layer',l});
    if(withPh){i=0;for(const q of ph){busy(`Menulis foto ${++i}/${ph.length}…`);const o={...q};o.blob=await toB64(q.blob);delete o.th;await w({t:'photo',p:o})}}
    const r=await FS.getUri({path:name,directory:'CACHE'});
    S('lastBackup',d.toISOString());busy();
    if(view=='settings')settingsView();
    await plug('Share').share({title:name,files:[r.uri],dialogTitle:'Simpan / kirim file backup'});
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Backup gagal: '+(e&&e.message||e))}
}
function doRestore(){pickFile('*/*',restoreFile)}
async function restoreFile(f){
    if(!confirm(`Restore dari "${f.name}"?\nData di file akan DIGABUNGKAN ke aplikasi ini; data yang sudah ada tidak dihapus.`))return;
    const st={s:0,u:0,c:0,m:0,p:0};let meta=false;
    try{
      busy('Membaca backup…');
      const haveL=new Set(await lKeys()),haveM=new Set(await mKeys()),haveP=new Set(await pKeys()),td=new TextDecoder('utf-8'),CH=4<<20,blobOf=async(b64)=>(await fetch('data:image/jpeg;base64,'+b64)).blob();
      const line=async s=>{
        if(!s.trim())return;
        const o=JSON.parse(s);
        if(o.t=='meta'){
          if(o.app!='SensusBlok')throw new Error('File ini bukan backup Sensus Blok.');
          meta=true;
          for(const x of o.sessions||[]){const y=sessions.find(z=>z.id==x.id);if(!y){sessions.push(x);st.s++}else if(x.recs.length>y.recs.length){Object.assign(y,x);st.u++}}
          sessions.sort((a,b)=>b.id-a.id);S('sessions',sessions);
          for(const c of o.customs||[])if(!customs.find(z=>z.id==c.id)){customs.push(c);st.c++}
          S('customs',customs);
          if(o.hdr&&!Object.keys(hdr).some(k=>k!='tgl'&&hdr[k])){hdr={...o.hdr};S('hdr',{...hdr,tgl:undefined})}
          if(lxK==1&&o.luxk&&o.luxk!=1){lxK=+o.luxk;S('luxk',lxK)}
        }else if(o.t=='map'){const m=o.m;if(!haveM.has(m.id)){m.blob=await blobOf(m.blob);delete m.tl;m.info=(m.info||'')+' · dipulihkan tanpa tile (impor ulang PDF untuk ketajaman penuh)';await mPut(m);haveM.add(m.id);st.m++}}
        else if(o.t=='layer'){const l=o.l;if(!haveL.has(l.id)){await lPut(l);haveL.add(l.id);st.l=(st.l||0)+1}}
        else if(o.t=='photo'){const q=o.p;if(!haveP.has(q.id)){const b=await blobOf(q.blob);q.blob=b;q.th=await mkThumb(b);await pPut(q);haveP.add(q.id);st.p++}}
      };
      let pos=0,buf='';
      while(pos<f.size){
        busy(`Memulihkan… ${Math.round(pos/f.size*100)}%`);
        buf+=td.decode(new Uint8Array(await f.slice(pos,pos+CH).arrayBuffer()),{stream:true});pos+=CH;
        const parts=buf.split('\n');buf=parts.pop();
        for(const s of parts)await line(s);
      }
      buf+=td.decode();await line(buf);
      if(!meta)throw new Error('File ini bukan backup Sensus Blok.');
      busy();alert(`Restore selesai: ${st.s} sesi baru, ${st.u} sesi diperbarui, ${st.c} sensus custom, ${st.m} peta, ${st.p} foto, ${st.l||0} layer.`);
      go('home',0,true);
    }catch(e){busy();alert('Restore gagal: '+((e instanceof SyntaxError)?'file rusak atau bukan backup Sensus Blok.':(e&&e.message||e)))}
}

/* ---------- Laporan WA: peta areal + kolase foto ---------- */
const pixM=(M,la,lo)=>{const q=fwdP(M.proj,lo,la),a=M.aff;return[a[0]*q[0]+a[1]*q[1]+a[2],a[3]*q[0]+a[4]*q[1]+a[5]]};
async function pickMapFor(pts){
  let maps=[];try{maps=await mAll()}catch(e){}
  const cov=m=>pts.filter(p=>{const q=pixM(m,p.la,p.lo);return q[0]>=0&&q[0]<=m.w&&q[1]>=0&&q[1]<=m.h}).length/pts.length;
  const pref=maps.find(m=>m.id==mf.map);
  if(pref&&cov(pref)>=.8)return pref;
  let best=null,bs=.8;
  for(const m of maps){const c=cov(m);if(c>=bs){bs=c;best=m}}
  return best;
}
const niceLen=raw=>{const p=Math.pow(10,Math.floor(Math.log10(raw)));return[1,2,5,10].map(k=>k*p).filter(v=>v<=raw).pop()||p};
async function areaBlob(s){
  const pts=s.recs.map(r=>({s:r._s||s,r,la:parseFloat(r.lat),lo:parseFloat(r.lon)})).filter(p=>!isNaN(p.la)&&!isNaN(p.lo));
  if(!pts.length)return null;
  const W=1400,H=1050,M=await pickMapFor(pts),c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d'),f0=s.def.f.find(z=>z.t=='sel'||z.t=='yn')||s.def.f.find(z=>z.t=='num'||z.t=='bbc'),keep={jenis:mf.jenis,by:mf.by};
  let cz;mf.jenis=title(s);mf.by=f0?f0.k:'jenis';try{cz=colorize(pts)}finally{mf.jenis=keep.jenis;mf.by=keep.by}
  let P,mpp;
  if(M){
    const q=pts.map(p=>pixM(M,p.la,p.lo)),us=q.map(a=>a[0]),vs=q.map(a=>a[1]),
          bu=Math.max(...us)-Math.min(...us),bv=Math.max(...vs)-Math.min(...vs),cu=(Math.max(...us)+Math.min(...us))/2,cv=(Math.max(...vs)+Math.min(...vs))/2,asp=W/H;
    let cw=Math.max(bu*1.4,bv*1.4*asp,Math.min(M.w,400)),ch=cw/asp;
    if(cw>M.w){cw=M.w;ch=cw/asp}
    if(ch>M.h){ch=M.h;cw=ch*asp}
    const sx=Math.min(Math.max(0,cu-cw/2),M.w-cw),sy=Math.min(Math.max(0,cv-ch/2),M.h-ch),k=W/cw;
    if(M.tl&&M.tl.nat)await drawRegion(M,x,sx,sy,sx+cw,sy+ch,0,0,W,H);
    else{const u=URL.createObjectURL(M.blob);let im;try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}const q0=im.width/M.w;x.drawImage(im,sx*q0,sy*q0,cw*q0,ch*q0,0,0,W,H)}
    P=i=>[(q[i][0]-sx)*k,(q[i][1]-sy)*k];mpp=1/((M.ppm||1)*k);
  }else{
    const la0=pts.reduce((a,p)=>a+p.la,0)/pts.length,lo0=pts.reduce((a,p)=>a+p.lo,0)/pts.length,kx=111320*Math.cos(la0*Math.PI/180),
          m=pts.map(p=>[(p.lo-lo0)*kx,(p.la-la0)*110574]),xs=m.map(a=>a[0]),ys=m.map(a=>a[1]),
          ext=Math.max(Math.max(...xs)-Math.min(...xs),(Math.max(...ys)-Math.min(...ys))*W/H,60),k=W*.7/ext,cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
    x.fillStyle='#eef2ec';x.fillRect(0,0,W,H);
    x.strokeStyle='#d5dcd2';x.lineWidth=1;const g=niceLen(120/k)*1;
    for(let gx=-W;gx<W*2;gx+=g*k){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,H);x.stroke()}
    for(let gy=-H;gy<H*2;gy+=g*k){x.beginPath();x.moveTo(0,gy);x.lineTo(W,gy);x.stroke()}
    P=i=>[W/2+(m[i][0]-cx)*k,H/2-(m[i][1]-cy)*k];mpp=1/k;
  }
  /* jejak tracking: garis menghubungkan titik sensus sesuai urutan jalan (per sesi) */
  x.lineJoin='round';x.lineCap='round';
  for(const [w,col] of [[9,'rgba(255,255,255,.95)'],[4,'#1565c0']]){
    x.lineWidth=w;x.strokeStyle=col;x.beginPath();
    pts.forEach((p,i)=>{const [px,py]=P(i);if(i>0&&pts[i-1].s===p.s){x.lineTo(px,py)}else x.moveTo(px,py)});
    x.stroke();
  }
  const lbl=pts.length<=80;
  x.textAlign='center';x.textBaseline='middle';
  pts.forEach((p,i)=>{
    const [px,py]=P(i);x.beginPath();x.arc(px,py,lbl?13:8,0,7);x.fillStyle=cz.color(p);x.fill();x.lineWidth=3;x.strokeStyle='#fff';x.stroke();
    if(lbl){x.font='bold 15px sans-serif';x.lineWidth=4;x.strokeStyle='rgba(0,0,0,.75)';x.strokeText(String(p.r.no),px,py-24);x.fillStyle='#fff';x.fillText(String(p.r.no),px,py-24)}
  });
  x.textAlign='left';
  x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,W,86);x.fillStyle='#fff';x.font='bold 32px sans-serif';
  x.fillText(`${title(s)} · Blok ${s.h.blok} · Baris ${s.h.baris}`,18,32);
  x.font='22px sans-serif';x.fillStyle='#d6e2d3';x.fillText(`Peta tracking · ${s.h.tgl} · ${s.h.petugas} · ${s.recs.length} ${ul(s)}${M?' · '+M.name:''}`,18,66);
  const leg=cz.leg.slice(0,10),lh=30,bh=leg.length*lh+54;
  if(leg.length){
    x.fillStyle='rgba(255,255,255,.88)';x.fillRect(14,H-bh-14,360,bh);x.fillStyle='#1b1f1a';x.font='bold 20px sans-serif';
    x.fillText('Legenda'+(f0?': '+lab(f0):''),26,H-bh+12);x.font='19px sans-serif';
    leg.forEach(([col,l,n],i)=>{const yy=H-bh+46+i*lh;x.fillStyle=col;x.beginPath();x.arc(36,yy,9,0,7);x.fill();x.fillStyle='#1b1f1a';x.fillText(`${String(l).slice(0,24)} (${n})`,54,yy)});
  }
  const nl=niceLen(W*.2*mpp),bw=nl/mpp;
  x.fillStyle='rgba(255,255,255,.88)';x.fillRect(W-bw-44,H-64,bw+30,50);x.strokeStyle='#1b1f1a';x.lineWidth=4;
  x.beginPath();x.moveTo(W-bw-30,H-38);x.lineTo(W-bw-30,H-26);x.lineTo(W-30,H-26);x.lineTo(W-30,H-38);x.stroke();
  x.fillStyle='#1b1f1a';x.font='bold 18px sans-serif';x.textAlign='center';x.fillText(fmtD(nl),W-30-bw/2,H-48);
  return cb(c,.88);
}
const samp=(a,k)=>a.length<=k?a:Array.from({length:k},(_,i)=>a[Math.round(i*(a.length-1)/Math.max(1,k-1))]);
async function collageBlobs(s,MAXP){
  MAXP=MAXP||36;const MAXP0=MAXP,sidl=s.ids||[s.id],all=(await pAll()).filter(q=>sidl.includes(q.sid)).sort((a,b)=>sidl.indexOf(a.sid)-sidl.indexOf(b.sid)||a.no-b.no),ph=samp(all,MAXP);
  if(!ph.length)return[];
  const out=[],PER=9,TW=560,TH=420,CAP=64,G=10,HD=84;
  for(let i0=0;i0<ph.length;i0+=PER){
    const grp=ph.slice(i0,i0+PER),n=grp.length,cl=n<=2?n:n<=4?2:3,rows=Math.ceil(n/cl);
    const c=document.createElement('canvas');c.width=cl*TW+(cl+1)*G;c.height=HD+rows*(TH+CAP)+(rows+1)*G;
    const x=c.getContext('2d');x.fillStyle='#1b1f1a';x.fillRect(0,0,c.width,c.height);
    x.textBaseline='middle';x.textAlign='left';x.fillStyle='#fff';x.font='bold 28px sans-serif';
    x.fillText(`${title(s)} · Blok ${s.h.blok} · ${s.h.tgl}`,G*2,32);
    x.font='20px sans-serif';x.fillStyle='#b9c4b5';
    x.fillText(`${all.length>MAXP?`${n} foto sampel dari ${all.length}`:`Foto ${i0+1}–${i0+n} dari ${all.length}`} · ${s.h.petugas}`,G*2,62);
    for(let k=0;k<n;k++){
      const q=grp[k],cx=G+(k%cl)*(TW+G),cy=HD+G+Math.floor(k/cl)*(TH+CAP+G),u=URL.createObjectURL(q.blob);
      let im;try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}
      const sc=Math.min(TW/im.width,TH/im.height),dw=im.width*sc,dh=im.height*sc;
      x.fillStyle='#000';x.fillRect(cx,cy,TW,TH);x.drawImage(im,cx+(TW-dw)/2,cy+(TH-dh)/2,dw,dh);
      x.fillStyle='#2e7d32';x.fillRect(cx,cy+TH,TW,CAP);
      x.fillStyle='#fff';x.font='bold 22px sans-serif';x.textAlign='left';
      x.fillText(`${q.unit||un(s)} ke-${q.no} · Blok ${q.blok} · Baris ${q.baris}`,cx+12,cy+TH+20);
      x.font='18px sans-serif';x.fillStyle='#d6e2d3';
      let sub=fmtDT(new Date(q.t))+(q.ket?' · '+q.ket:'');while(x.measureText(sub).width>TW-24&&sub.length>8)sub=sub.slice(0,-2);
      x.fillText(sub,cx+12,cy+TH+46);
      x.beginPath();x.arc(cx+32,cy+32,24,0,7);x.fillStyle='#d81b60';x.fill();x.lineWidth=3;x.strokeStyle='#fff';x.stroke();
      x.fillStyle='#fff';x.font='bold 24px sans-serif';x.textAlign='center';x.fillText(String(q.no),cx+32,cy+33);x.textAlign='left';
    }
    out.push(await cb(c,.85));
  }
  return out;
}
async function stackBlobs(bl){
  if(!bl.length)return null;
  if(bl.length==1)return bl[0];
  const ims=[];
  for(const b of bl){const u=URL.createObjectURL(b);try{ims.push(await loadImg(u))}finally{URL.revokeObjectURL(u)}}
  const W=Math.min(1720,Math.max(...ims.map(i=>i.width))),hs=ims.map(i=>Math.round(i.height*W/i.width)),c=document.createElement('canvas');
  c.width=W;c.height=hs.reduce((a,b)=>a+b,0);
  const x=c.getContext('2d');let y=0;ims.forEach((im,k)=>{x.drawImage(im,0,y,W,hs[k]);y+=hs[k]});
  const out=await cb(c,.86);c.width=0;return out;
}
async function shareReport(id){
  const s=find(id),FS=plug('Filesystem'),SH=plug('Share');
  if(!s)return alert('Data tidak ditemukan.');
  if(!FS||!SH)return alert('Fitur ini hanya tersedia di aplikasi Android.');
  try{
    const sidl=s.ids||[s.id],np=(await pAll()).filter(p=>sidl.includes(p.sid)).length;
    let withPh=false;
    if(np){const c=await pickOpt(`Lampiran laporan (${np} foto tersedia)`,['Peta tracking saja','Peta tracking + kolase maks 4 foto sampel (1 gambar)']);if(c<0)return;withPh=c==1}
    const files=[],tag=`${slug(title(s))}_${slug(s.h.blok)}_${ftg(s)}`,save=async(b,n)=>{const r=await FS.writeFile({path:n,data:await toB64(b),directory:'CACHE'});files.push(r.uri)};
    busy('Membuat peta tracking…');
    const mb=await areaBlob(s);
    if(withPh){
      busy('Membuat kolase foto sampel…');
      const cols=await collageBlobs(s,4);
      /* satu gambar saja (peta di atas, kolase di bawah): WhatsApp tidak andal menerima beberapa gambar + teks sekaligus */
      const one=await stackBlobs([mb,...cols].filter(Boolean));
      if(one)await save(one,`laporan_${tag}.jpg`);
    }else if(mb)await save(mb,`tracking_${tag}.jpg`);
    busy();
    if(!files.length)return shareTxt(id);
    await sendFiles(files,waText(s),'Bagikan laporan','image/*');
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Gagal membuat laporan: '+(e&&e.message||e))}
}

/* ---------- GIS: ZIP, Shapefile, KML, GPX, CSV, GeoJSON ---------- */
const xe=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const xd=s=>s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi,(m,e)=>e[0]=='#'?String.fromCodePoint(e[1].toLowerCase()=='x'?parseInt(e.slice(2),16):+e.slice(1)):({lt:'<',gt:'>',amp:'&',quot:'"',apos:"'"}[e.toLowerCase()]));
const u8=s=>new TextEncoder().encode(s);
function u8b64(a){let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}
const sliceBuf=u=>u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength);
const CRCT=(()=>{const q=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;q[n]=c>>>0}return q})();
const crc32=a=>{let c=0xFFFFFFFF;for(let i=0;i<a.length;i++)c=CRCT[(c^a[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zipMake(files){
  const parts=[],cd=[],dt=new Date(),dT=(dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()>>1),dD=((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate();let off=0;
  for(const f of files){
    const nm=u8(f.name),crc=crc32(f.data),sz=f.data.length,h=new DataView(new ArrayBuffer(30)),c=new DataView(new ArrayBuffer(46));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,dT,true);h.setUint16(12,dD,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,dT,true);c.setUint16(14,dD,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cd.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+sz;
  }
  const cs=cd.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  const all=[...parts,...cd,new Uint8Array(e.buffer)],out=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let q=0;for(const b of all){out.set(b,q);q+=b.length}
  return out;
}
async function zipRead(buf){
  const b=new Uint8Array(buf),dv=new DataView(buf);let e=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(dv.getUint32(i,true)==0x06054b50){e=i;break}
  if(e<0)throw new Error('Bukan berkas ZIP yang valid.');
  const n=dv.getUint16(e+10,true),out={};let p=dv.getUint32(e+16,true);
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!=0x02014b50)break;
    const me=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(b.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    if(name.endsWith('/'))continue;
    const st=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true),raw=b.subarray(st,st+cs);
    out[name]=me==0?raw:me==8?new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()):null;
  }
  return out;
}
const uniqName=(b,used,max)=>{let n=b.slice(0,max||60),i=1;while(used.has(n)){const s='_'+i++;n=b.slice(0,(max||60)-s.length)+s}used.add(n);return n};
const PRJ='GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
function shpBuild(type,geoms){
  const recs=[];let x0=1e300,y0=1e300,x1=-1e300,y1=-1e300;
  const ext=(x,y)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)};
  for(const g of geoms){
    if(type==1){const d=new DataView(new ArrayBuffer(20));d.setInt32(0,1,true);d.setFloat64(4,g[0],true);d.setFloat64(12,g[1],true);ext(g[0],g[1]);recs.push(new Uint8Array(d.buffer))}
    else{
      const parts=g.map(r=>{if(type==5){const f=r[0],l=r[r.length-1];if(f[0]!=l[0]||f[1]!=l[1])r=r.concat([f]);let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];if(a>0)r=r.slice().reverse()}return r}),np=parts.length,pts=parts.flat(),n=pts.length,d=new DataView(new ArrayBuffer(44+4*np+16*n));
      let a0=1e300,b0=1e300,a1=-1e300,b1=-1e300;pts.forEach(q=>{a0=Math.min(a0,q[0]);a1=Math.max(a1,q[0]);b0=Math.min(b0,q[1]);b1=Math.max(b1,q[1]);ext(q[0],q[1])});
      d.setInt32(0,type,true);d.setFloat64(4,a0,true);d.setFloat64(12,b0,true);d.setFloat64(20,a1,true);d.setFloat64(28,b1,true);d.setInt32(36,np,true);d.setInt32(40,n,true);
      let idx=0;parts.forEach((r,i)=>{d.setInt32(44+4*i,idx,true);idx+=r.length});
      let o=44+4*np;pts.forEach(q=>{d.setFloat64(o,q[0],true);d.setFloat64(o+8,q[1],true);o+=16});recs.push(new Uint8Array(d.buffer));
    }
  }
  const total=100+recs.reduce((a,r)=>a+8+r.length,0),shp=new DataView(new ArrayBuffer(total)),shx=new DataView(new ArrayBuffer(100+8*recs.length));
  for(const h of [shp,shx]){h.setInt32(0,9994,false);h.setInt32(28,1000,true);h.setInt32(32,type,true);if(recs.length){h.setFloat64(36,x0,true);h.setFloat64(44,y0,true);h.setFloat64(52,x1,true);h.setFloat64(60,y1,true)}}
  shp.setInt32(24,total/2,false);shx.setInt32(24,(100+8*recs.length)/2,false);
  let off=100;recs.forEach((r,i)=>{shp.setInt32(off,i+1,false);shp.setInt32(off+4,r.length/2,false);new Uint8Array(shp.buffer).set(r,off+8);shx.setInt32(100+8*i,off/2,false);shx.setInt32(104+8*i,r.length/2,false);off+=8+r.length});
  return{shp:new Uint8Array(shp.buffer),shx:new Uint8Array(shx.buffer)};
}
function dbfBuild(cols,rows){
  const nf=cols.length,hl=33+32*nf,rl=1+cols.reduce((a,c)=>a+c.len,0),buf=new Uint8Array(hl+rl*rows.length+1),dv=new DataView(buf.buffer),d=new Date();
  buf[0]=3;buf[1]=d.getFullYear()-1900;buf[2]=d.getMonth()+1;buf[3]=d.getDate();dv.setUint32(4,rows.length,true);dv.setUint16(8,hl,true);dv.setUint16(10,rl,true);
  cols.forEach((c,i)=>{const o=32+32*i;u8(c.n).forEach((b,k)=>{if(k<10)buf[o+k]=b});buf[o+11]=c.t.charCodeAt(0);buf[o+16]=c.len;buf[o+17]=c.dec||0});
  buf[32+32*nf]=0x0D;let p=hl;
  for(const r of rows){
    buf[p++]=0x20;
    cols.forEach((c,i)=>{
      const v=r[i];let by;
      if(c.t=='N'){let s=(v===''||v==null||isNaN(v))?'':(+v).toFixed(c.dec||0);if(s.length>c.len)s=s.slice(0,c.len);by=u8(s.padStart(c.len,' '))}
      else{by=u8(String(v??''));if(by.length>c.len){let k=c.len;while(k>0&&(by[k]&0xC0)==0x80)k--;by=by.subarray(0,k)}}
      buf.set(by,p);for(let k=by.length;k<c.len;k++)buf[p+k]=0x20;p+=c.len;
    });
  }
  buf[p]=0x1A;return buf;
}
const autoBy=s=>{const f=s.def.f.find(z=>z.t=='sel'||z.t=='yn')||s.def.f.find(z=>z.t=='num'||z.t=='bbc');return f?f.k:'jenis'};
function ptProps(p){
  const s=p.s,r=p.r,pr={layer:title(s),unit:un(s),no:r.no,blok:s.h.blok,baris:s.h.baris,arah_masuk:s.h.arah,tanggal:s.h.tgl,petugas:s.h.petugas,
    lux:r.lux===''||r.lux==null?null:+r.lux,akurasi_m:r.acc===''||r.acc==null?null:+(+r.acc).toFixed(1),arah_hadap:r.hdg==null?null:r.hdg};
  s.def.f.forEach(f=>{
    const k=slug(lab(f));
    if(f.t=='bbc'){const nf=!!r.d[f.k+'_nf'];pr[k]=nf?null:(+r.d[f.k]||0);pr[k+'_tdk_ditemukan']=nf?'Ya':'Tidak'}
    else if(f.t=='num')pr[k]=r.d[f.k]===''||r.d[f.k]==null?null:+r.d[f.k];
    else pr[k]=r.d[f.k]==null?'':String(r.d[f.k]);
  });
  return pr;
}
function gisData(scope){
  let pts,cz,ex=true,s0=null;
  if(scope=='map'){pts=mapPts();cz=colorize(pts);pts=pts.filter(q=>!mf.hide[q.l])}
  else{
    s0=find(scope.slice(1));ex=false;
    pts=s0.recs.map(r=>({s:r._s||s0,r,la:parseFloat(r.lat),lo:parseFloat(r.lon)})).filter(q=>!isNaN(q.la)&&!isNaN(q.lo));
    const k={jenis:mf.jenis,by:mf.by};mf.jenis=title(s0);mf.by=autoBy(s0);try{cz=colorize(pts)}finally{mf.jenis=k.jenis;mf.by=k.by}
  }
  const lines=[],polys=[];
  if(ex){
    if(meas.pts.length>2&&meas.kind=='area'){const A=polyArea(meas.pts);polys.push({name:'Area ukur',props:{layer:'area_ukur',luas_m2:+A.toFixed(1),luas_ha:+(A/1e4).toFixed(4)},rings:[meas.pts.concat([meas.pts[0]]).map(q=>[q[1],q[0]])]})}
    else if(meas.pts.length>1)lines.push({name:'Jarak ukur',props:{layer:'jarak_ukur',panjang_m:+meas.pts.reduce((a,x,i)=>i?a+hav(meas.pts[i-1],x):0,0).toFixed(1)},parts:[meas.pts.map(q=>[q[1],q[0]])]});
  }
  const base=scope=='map'?`sensus_peta_${today()}`:`sensus_${slug(title(s0))}_${slug(s0.h.blok)}_${ftg(s0)}`;
  return{pts,cz,lines,polys,base};
}
function toGeoJSON(D){
  const F=D.pts.map(q=>({type:'Feature',properties:{...ptProps(q),warna:D.cz.color(q)},geometry:{type:'Point',coordinates:[q.lo,q.la]}}));
  D.lines.forEach(l=>F.push({type:'Feature',properties:l.props,geometry:l.parts.length>1?{type:'MultiLineString',coordinates:l.parts.map(r=>r.map(x=>[x[0],x[1]]))}:{type:'LineString',coordinates:l.parts[0].map(x=>[x[0],x[1]])}}));
  D.polys.forEach(g=>F.push({type:'Feature',properties:g.props,geometry:{type:'Polygon',coordinates:g.rings}}));
  return JSON.stringify({type:'FeatureCollection',name:D.base,crs:{type:'name',properties:{name:'urn:ogc:def:crs:OGC:1.3:CRS84'}},features:F});
}
const kmlCol=h=>'ff'+h.slice(5,7)+h.slice(3,5)+h.slice(1,3);
function toKML(D){
  const cols=[...new Set(D.pts.map(q=>D.cz.color(q)))],co=a=>a.map(q=>q[0]+','+q[1]+',0').join(' ');
  let x=`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xe(D.base)}</name>\n`;
  cols.forEach(c=>{x+=`<Style id="c${c.slice(1)}"><IconStyle><color>${kmlCol(c)}</color><scale>0.9</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><LabelStyle><scale>0.7</scale></LabelStyle></Style>\n`});
  x+=`<Style id="trk"><LineStyle><color>ffa01b6a</color><width>3</width></LineStyle></Style><Style id="ukur"><LineStyle><color>ff5a1bd8</color><width>3</width></LineStyle><PolyStyle><color>405a1bd8</color></PolyStyle></Style>\n`;
  const by={};D.pts.forEach(q=>(by[title(q.s)]=by[title(q.s)]||[]).push(q));
  for(const k of Object.keys(by)){
    x+=`<Folder><name>${xe(k)}</name>\n`;
    by[k].forEach(q=>{const pr=ptProps(q);x+=`<Placemark><name>${xe(un(q.s)+' '+q.r.no)}</name><styleUrl>#c${D.cz.color(q).slice(1)}</styleUrl><ExtendedData>${Object.keys(pr).map(n=>pr[n]==null?'':`<Data name="${xe(n)}"><value>${xe(pr[n])}</value></Data>`).join('')}</ExtendedData><Point><coordinates>${q.lo},${q.la},0</coordinates></Point></Placemark>\n`});
    x+='</Folder>\n';
  }
  D.lines.forEach(l=>{x+=`<Placemark><name>${xe(l.name)}</name><styleUrl>#${l.name=='Jejak'?'trk':'ukur'}</styleUrl><MultiGeometry>${l.parts.map(r=>`<LineString><tessellate>1</tessellate><coordinates>${co(r)}</coordinates></LineString>`).join('')}</MultiGeometry></Placemark>\n`});
  D.polys.forEach(g=>{x+=`<Placemark><name>${xe(g.name)}</name><description>${xe('Luas '+fmtA(g.props.luas_m2))}</description><styleUrl>#ukur</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>${co(g.rings[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n`});
  return x+'</Document></kml>';
}
function toGPX(D){
  const iso=v=>{const d=new Date(v);return isNaN(d)?'':`<time>${d.toISOString()}</time>`};
  let x=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Sensus Blok" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xe(D.base)}</name></metadata>\n`;
  D.pts.forEach(q=>{const pr=ptProps(q);x+=`<wpt lat="${q.la}" lon="${q.lo}">${q.r.t?iso(q.r.t):''}<name>${xe(un(q.s)+' '+q.r.no)}</name><desc>${xe(Object.keys(pr).filter(k=>pr[k]!=null&&k!='layer').map(k=>k+'='+pr[k]).join('; '))}</desc><type>${xe(title(q.s))}</type></wpt>\n`});
  D.lines.forEach(l=>{x+=`<trk><name>${xe(l.name)}</name>${l.parts.map(r=>`<trkseg>${r.map(q=>`<trkpt lat="${q[1]}" lon="${q[0]}">${q[2]?iso(q[2]):''}</trkpt>`).join('')}</trkseg>`).join('')}</trk>\n`});
  D.polys.forEach(g=>{x+=`<trk><name>${xe(g.name)}</name><trkseg>${g.rings[0].map(q=>`<trkpt lat="${q[1]}" lon="${q[0]}"></trkpt>`).join('')}</trkseg></trk>\n`});
  return x+'</gpx>';
}
function toCSVall(D){
  const keys=[],P=D.pts.map(ptProps);P.forEach(pr=>Object.keys(pr).forEach(k=>{if(!keys.includes(k))keys.push(k)}));
  const q=v=>{v=String(v??'');return /[",\r\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  return [['latitude','longitude',...keys,'wkt'].join(',')].concat(D.pts.map((pt,i)=>[pt.la,pt.lo,...keys.map(k=>P[i][k]),`POINT (${pt.lo} ${pt.la})`].map(q).join(','))).join('\r\n')+'\r\n';
}
function shpFiles(D){
  const out=[],used=new Set(),add=(name,type,geoms,cols,rows)=>{if(!geoms.length)return;const s=shpBuild(type,geoms);out.push({name:name+'.shp',data:s.shp},{name:name+'.shx',data:s.shx},{name:name+'.dbf',data:dbfBuild(cols,rows)},{name:name+'.prj',data:u8(PRJ)},{name:name+'.cpg',data:u8('UTF-8')})};
  const by={};D.pts.forEach(q=>(by[title(q.s)]=by[title(q.s)]||[]).push(q));
  for(const k of Object.keys(by)){
    const a=by[k],P=a.map(ptProps),keys=Object.keys(P[0]).filter(z=>z!='layer'&&z!='unit'),used2=new Set(),cols=keys.map(z=>{
      const v=P.map(pr=>pr[z]),num=v.every(x=>x==null||x===''||typeof x=='number');
      const nm=uniqName(slug(z)||'f',used2,10);
      return num?{n:nm,t:'N',len:14,dec:v.some(x=>typeof x=='number'&&!Number.isInteger(x))?2:0}:{n:nm,t:'C',len:Math.min(254,Math.max(1,...v.map(x=>u8(String(x??'')).length)))};
    });
    add(uniqName(slug(k).slice(0,40)||'sensus',used),1,a.map(q=>[q.lo,q.la]),cols,P.map(pr=>keys.map(z=>pr[z])));
  }
  const ln=D.lines.filter(l=>l.props.layer=='jejak'),ln2=D.lines.filter(l=>l.props.layer!='jejak');
  [[ln,'jejak'],[ln2,'jarak_ukur']].forEach(([a,n])=>add(n,3,a.map(l=>l.parts.map(r=>r.map(x=>[x[0],x[1]]))),[{n:'panjang_m',t:'N',len:14,dec:1}],a.map(l=>[l.props.panjang_m])));
  add('area_ukur',5,D.polys.map(g=>g.rings),[{n:'luas_m2',t:'N',len:14,dec:1},{n:'luas_ha',t:'N',len:12,dec:4}],D.polys.map(g=>[g.props.luas_m2,g.props.luas_ha]));
  return out;
}
const EXF=[['GeoJSON (.geojson)','geojson'],['KML (.kml) — Google Earth, QGIS, ArcGIS','kml'],['GPX (.gpx) — GPS & aplikasi navigasi','gpx'],['CSV (.csv) — kolom latitude/longitude + WKT','csv'],['Shapefile (.zip) — ArcGIS & QGIS','shp'],['Semua format (satu ZIP)','all']];
function gisFile(D,fmt){
  const B=D.base;
  if(fmt=='geojson')return{name:B+'.geojson',text:toGeoJSON(D)};
  if(fmt=='kml')return{name:B+'.kml',text:toKML(D)};
  if(fmt=='gpx')return{name:B+'.gpx',text:toGPX(D)};
  if(fmt=='csv')return{name:B+'.csv',text:toCSVall(D)};
  const shp=shpFiles(D);
  if(fmt=='shp')return{name:B+'_shapefile.zip',bytes:zipMake(shp)};
  return{name:B+'_semua_format.zip',bytes:zipMake([{name:B+'.geojson',data:u8(toGeoJSON(D))},{name:B+'.kml',data:u8(toKML(D))},{name:B+'.gpx',data:u8(toGPX(D))},{name:B+'.csv',data:u8(toCSVall(D))},...shp.map(f=>({name:'shapefile/'+f.name,data:f.data}))]) };
}
function pickOpt(ttl,opts){
  return new Promise(res=>{
    const o=document.createElement('div');o.className='ov';
    o.innerHTML=`<div class="dlg"><p><b>${E(ttl)}</b></p>${opts.map((x,i)=>`<button class="b" style="width:100%;margin-top:8px;text-align:left" data-v="${i}">${E(x)}</button>`).join('')}<button class="b gray" style="width:100%;margin-top:12px" data-v="-1">Batal</button></div>`;
    o.onclick=e=>{const v=e.target.dataset&&e.target.dataset.v;if(v!=null&&v!==''){o.remove();res(+v)}};
    document.body.appendChild(o);
  });
}
async function exportDlg(scope){
  const i=await pickOpt('Export data GIS',EXF.map(x=>x[0]));if(i<0)return;
  try{
    const D=gisData(scope);
    if(!D.pts.length&&!D.lines.length&&!D.polys.length)return alert('Tidak ada data bertitik koordinat untuk diexport.');
    busy('Membuat berkas…');
    const f=gisFile(D,EXF[i][1]),FS=plug('Filesystem');
    if(!FS){busy();return alert('Export hanya tersedia di aplikasi Android.')}
    const r=await FS.writeFile(f.text!=null?{path:f.name,data:f.text,directory:'CACHE',encoding:'utf8'}:{path:f.name,data:u8b64(f.bytes),directory:'CACHE'});
    busy();
    await plug('Share').share({title:f.name,files:[r.uri],dialogTitle:'Bagikan '+f.name});
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Export gagal: '+(e&&e.message||e))}
}

/* ---------- Import layer vektor ---------- */
function xmlParse(s){
  const root={n:'#',a:{},c:[],t:''},st=[root],re=/<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;let m;
  while((m=re.exec(s))){
    if(m[1]!==undefined)st[st.length-1].t+=m[1];
    else if(m[3]!==undefined){
      const name=m[3].replace(/^.*:/,'');
      if(m[2]){if(st.length>1)st.pop()}
      else{const a={};m[4].replace(/([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,(_,k,v1,v2)=>{a[k.replace(/^.*:/,'')]=xd(v1!==undefined?v1:v2)});const n={n:name,a,c:[],t:''};st[st.length-1].c.push(n);if(!m[5])st.push(n)}
    }else if(m[6]!==undefined)st[st.length-1].t+=xd(m[6]);
  }
  return root;
}
const xall=(n,nm,r=[])=>{n.c.forEach(c=>{if(c.n==nm)r.push(c);xall(c,nm,r)});return r};
const xch=(n,nm)=>{const c=n.c.find(x=>x.n==nm);return c?c.t.trim():''};
const xco=t=>t.trim().split(/\s+/).map(z=>z.split(',').map(Number)).filter(a=>a.length>=2&&!isNaN(a[0])&&!isNaN(a[1])).map(a=>[a[0],a[1]]);
function kmlFeats(txt){
  const out=[];
  xall(xmlParse(txt),'Placemark').forEach(pm=>{
    const p={};const nm=xch(pm,'name'),ds=xch(pm,'description');if(nm)p.name=nm;if(ds)p.description=ds.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,300);
    xall(pm,'Data').forEach(d=>{p[d.a.name]=xch(d,'value')});xall(pm,'SimpleData').forEach(d=>{p[d.a.name]=d.t.trim()});
    xall(pm,'Point').forEach(g=>{const c=xco(xch(g,'coordinates'));if(c[0])out.push({k:'pt',c:c[0],p})});
    xall(pm,'LineString').forEach(g=>{const c=xco(xch(g,'coordinates'));if(c.length>1)out.push({k:'ln',c:[c],p})});
    xall(pm,'Polygon').forEach(g=>{const r=xall(g,'LinearRing').map(l=>xco(xch(l,'coordinates'))).filter(q=>q.length>2);if(r.length)out.push({k:'pg',c:r,p})});
  });
  return out;
}
function gpxFeats(txt){
  const root=xmlParse(txt),out=[],ll=q=>[+q.a.lon,+q.a.lat];
  xall(root,'wpt').forEach(w=>out.push({k:'pt',c:ll(w),p:{name:xch(w,'name'),desc:xch(w,'desc'),type:xch(w,'type'),time:xch(w,'time'),ele:xch(w,'ele')}}));
  xall(root,'trk').forEach(t=>{const parts=t.c.filter(c=>c.n=='trkseg').map(sg=>sg.c.filter(c=>c.n=='trkpt').map(ll)).filter(q=>q.length>1);if(parts.length)out.push({k:'ln',c:parts,p:{name:xch(t,'name'),type:'track'}})});
  xall(root,'rte').forEach(r=>{const q=r.c.filter(c=>c.n=='rtept').map(ll);if(q.length>1)out.push({k:'ln',c:[q],p:{name:xch(r,'name'),type:'route'}})});
  return out;
}
function gjFeats(j){
  const out=[],cl=r=>r.map(q=>[q[0],q[1]]);
  const add=(g,p)=>{
    if(!g)return;const t=g.type,c=g.coordinates;
    if(t=='Point')out.push({k:'pt',c:[c[0],c[1]],p});
    else if(t=='MultiPoint')c.forEach(q=>out.push({k:'pt',c:[q[0],q[1]],p}));
    else if(t=='LineString')out.push({k:'ln',c:[cl(c)],p});
    else if(t=='MultiLineString')out.push({k:'ln',c:c.map(cl),p});
    else if(t=='Polygon')out.push({k:'pg',c:c.map(cl),p});
    else if(t=='MultiPolygon')out.push({k:'pg',c:c.flatMap(pl=>pl.map(cl)),p});
    else if(t=='GeometryCollection')g.geometries.forEach(x=>add(x,p));
  };
  const fp=p=>{const o={};Object.keys(p||{}).forEach(k=>{const v=p[k];o[k]=v!==null&&typeof v=='object'?JSON.stringify(v):v});return o};
  if(j.type=='FeatureCollection')j.features.forEach(f=>add(f.geometry,fp(f.properties)));
  else if(j.type=='Feature')add(j.geometry,fp(j.properties));else add(j,{});
  return out;
}
function csvParse(txt){
  txt=txt.replace(/^\ufeff/,'');
  const first=txt.split(/\r?\n/,1)[0],d=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0],rows=[];
  let row=[],cu='',q=false;
  for(let i=0;i<txt.length;i++){
    const ch=txt[i];
    if(q){if(ch=='"'){if(txt[i+1]=='"'){cu+='"';i++}else q=false}else cu+=ch}
    else if(ch=='"')q=true;
    else if(ch==d){row.push(cu);cu=''}
    else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&txt[i+1]=='\n')i++;row.push(cu);cu='';if(row.some(x=>x!==''))rows.push(row);row=[]}
    else cu+=ch;
  }
  row.push(cu);if(row.some(x=>x!==''))rows.push(row);return rows;
}
function wktFeats(s,p){
  s=s.trim();const m=/^(MULTI)?(POINT|LINESTRING|POLYGON)\s*[ZM]*\s*\(/i.exec(s);if(!m)return[];
  const ty=m[2].toUpperCase(),gr=[...s.slice(m[0].length-1).matchAll(/\(([^()]+)\)/g)].map(g=>g[1].trim().split(/\s*,\s*/).map(z=>z.trim().split(/\s+/).map(Number).slice(0,2)).filter(a=>a.length==2&&!a.some(isNaN))).filter(g=>g.length);
  if(ty=='POINT')return gr.flat().map(c=>({k:'pt',c,p}));
  if(ty=='LINESTRING')return gr.length?[{k:'ln',c:gr,p}]:[];
  return gr.length?[{k:'pg',c:gr,p}]:[];
}
function csvFeats(txt){
  const R=csvParse(txt);if(R.length<2)throw new Error('CSV kosong.');
  const H=R[0].map(h=>h.trim()),L=H.map(h=>h.toLowerCase()),ix=re=>L.findIndex(h=>re.test(h));
  const ia=ix(/^(lat|latitude|lintang|y|ycoord|y_coord|northing)$/),io=ix(/^(lon|lng|long|longitude|bujur|x|xcoord|x_coord|easting)$/),iw=ix(/^(wkt|geom|geometry|the_geom)$/);
  if(iw<0&&(ia<0||io<0))throw new Error('Kolom koordinat tidak ditemukan. Gunakan nama kolom latitude/longitude (atau lat/lon, lintang/bujur, x/y) atau kolom WKT.');
  const out=[];
  R.slice(1).forEach(r=>{
    const p={};H.forEach((h,i)=>{if(i!=ia&&i!=io&&i!=iw){const v=(r[i]??'').trim();p[h]=v!==''&&!isNaN(v)&&/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(v)?+v:v}});
    if(iw>=0)out.push(...wktFeats(r[iw]||'',p));
    else{const la=parseFloat((r[ia]||'').replace(',','.')),lo=parseFloat((r[io]||'').replace(',','.'));if(!isNaN(la)&&!isNaN(lo))out.push({k:'pt',c:[lo,la],p})}
  });
  return out;
}
function shpRead(buf){
  const dv=new DataView(buf),len=buf.byteLength,out=[];let p=100;
  while(p+12<=len){
    const cl=dv.getInt32(p+4,false)*2,st=p+8;if(st+cl>len)break;
    const t=dv.getInt32(st,true),b=t%10;
    if(t==0)out.push(null);
    else if(b==1)out.push({k:'pt',c:[dv.getFloat64(st+4,true),dv.getFloat64(st+12,true)]});
    else if(b==8){const n=dv.getInt32(st+36,true),pts=[];for(let i=0;i<n;i++)pts.push([dv.getFloat64(st+40+16*i,true),dv.getFloat64(st+48+16*i,true)]);out.push({k:'mp',c:pts})}
    else if(b==3||b==5){
      const np=dv.getInt32(st+36,true),n=dv.getInt32(st+40,true),idx=[];
      for(let i=0;i<np;i++)idx.push(dv.getInt32(st+44+4*i,true));idx.push(n);
      const base=st+44+4*np,parts=[];
      for(let i=0;i<np;i++){const r=[];for(let j=idx[i];j<idx[i+1];j++)r.push([dv.getFloat64(base+16*j,true),dv.getFloat64(base+16*j+8,true)]);if(r.length)parts.push(r)}
      out.push(parts.length?{k:b==3?'ln':'pg',c:parts}:null);
    }else out.push(null);
    p=st+cl;
  }
  return out;
}
function dbfRead(buf,enc){
  const dv=new DataView(buf),b=new Uint8Array(buf),n=dv.getUint32(4,true),hl=dv.getUint16(8,true),rl=dv.getUint16(10,true);let td;
  try{td=new TextDecoder(enc||'utf-8')}catch(e){td=new TextDecoder('utf-8')}
  const cols=[];for(let o=32;o<hl-1&&b[o]!=0x0D;o+=32){let nm='';for(let k=0;k<11&&b[o+k];k++)nm+=String.fromCharCode(b[o+k]);cols.push({n:nm,t:String.fromCharCode(b[o+11]),len:b[o+16]})}
  const rows=[];
  for(let i=0;i<n;i++){
    const o=hl+i*rl;if(b[o]==0x2A){rows.push(null);continue}
    let q=o+1;const r={};
    cols.forEach(c=>{const s=td.decode(b.subarray(q,q+c.len)).trim();q+=c.len;r[c.n]=(c.t=='N'||c.t=='F')?(s===''||isNaN(s)?null:+s):c.t=='L'?/^[YyTt]/.test(s):s});
    rows.push(r);
  }
  return rows;
}
function reproj(feats,proj){
  let g=[proj.lon0||117,proj.fn>0?-1:1];
  const f=c=>{g=invP(proj,c[0],c[1],g);return g.slice()};
  feats.forEach(ft=>{ft.c=ft.k=='pt'?f(ft.c):ft.c.map(r=>r.map(f))});
}
const inRange=feats=>feats.every(f=>(f.k=='pt'?[f.c]:f.c.flat()).every(q=>Math.abs(q[0])<=180&&Math.abs(q[1])<=90));
function utmAsk(name){
  const s=prompt(`Koordinat "${name}" bukan lintang/bujur (derajat).\nMasukkan zona UTM data ini, mis. 50N atau 50S (Kalimantan Timur umumnya 50N/50S, Jawa 48S/49S). Kosongkan untuk membatalkan:`);
  const m=s&&/(\d{1,2})\s*([NSns])?/.exec(s);if(!m)return null;
  const z=+m[1];if(z<1||z>60)return null;return projFromGcs({EPSG:((m[2]||'N').toUpperCase()=='S'?32700:32600)+z});
}
function shapeLayer({shp,dbf,prj,cpg},name){
  const G=shpRead(shp),A=dbf?dbfRead(dbf,/1252|8859/i.test(cpg||'')?'windows-1252':'utf-8'):[],feats=[];
  G.forEach((g,i)=>{
    if(!g)return;const p=A[i];if(A.length&&p===null)return;const pr=p||{};
    if(g.k=='mp')g.c.forEach(c=>feats.push({k:'pt',c,p:pr}));else feats.push({...g,p:pr});
  });
  if(!inRange(feats)||(prj&&/PROJCS/i.test(prj))){
    let pj=prj&&/PROJCS/i.test(prj)?projFromGcs({WKT:{str:prj}}):null;
    if(!pj){if(inRange(feats))return{name,feats};pj=utmAsk(name)}
    if(!pj)throw new Error(`Layer "${name}" memakai proyeksi yang tidak dikenali. Ekspor ulang ke WGS84 (EPSG:4326) lalu impor lagi.`);
    reproj(feats,pj);
  }
  return{name,feats};
}
function readOne(ext,text,name){
  let feats;
  if(ext=='geojson'||ext=='json')feats=gjFeats(JSON.parse(text));
  else if(ext=='kml')feats=kmlFeats(text);
  else if(ext=='gpx')feats=gpxFeats(text);
  else if(ext=='csv'||ext=='txt'||ext=='tsv')feats=csvFeats(text);
  else throw new Error('Format .'+ext+' belum didukung. Gunakan SHP (ZIP), KML/KMZ, GPX, GeoJSON, atau CSV.');
  if(!feats.length)throw new Error(`Tidak ada objek geometri pada "${name}".`);
  if(!inRange(feats)){const pj=utmAsk(name);if(!pj)throw new Error(`Koordinat "${name}" di luar rentang lintang/bujur.`);reproj(feats,pj)}
  return{name,feats};
}
async function readZip(z,base){
  const out=[],names=Object.keys(z),dec=u=>new TextDecoder().decode(u);
  for(const sn of names.filter(n=>/\.shp$/i.test(n))){
    const b0=sn.replace(/\.shp$/i,''),get=e=>names.find(n=>n.toLowerCase()==(b0+'.'+e).toLowerCase());
    const d=get('dbf'),pr=get('prj'),cp=get('cpg');
    out.push(shapeLayer({shp:sliceBuf(z[sn]),dbf:d&&z[d]?sliceBuf(z[d]):null,prj:pr&&z[pr]?dec(z[pr]):null,cpg:cp&&z[cp]?dec(z[cp]):null},b0.split('/').pop()));
  }
  for(const n of names){const m=/\.(kml|geojson|json|gpx|csv)$/i.exec(n);if(m&&z[n])out.push(readOne(m[1].toLowerCase(),dec(z[n]),n.replace(/\.[^.]+$/,'').split('/').pop()))}
  if(!out.length)throw new Error(`ZIP "${base}" tidak berisi SHP, KML, GPX, GeoJSON, atau CSV.`);
  return out;
}
async function readLayerFiles(files){
  const res=[],by={};
  files.forEach(f=>{const m=/^(.*)\.([^.]+)$/.exec(f.name),b=m?m[1]:f.name,e=m?m[2].toLowerCase():'';(by[b]=by[b]||{})[e]=f});
  for(const b of Object.keys(by)){
    const e=by[b];
    if(e.shp){res.push(shapeLayer({shp:await e.shp.arrayBuffer(),dbf:e.dbf?await e.dbf.arrayBuffer():null,prj:e.prj?await e.prj.text():null,cpg:e.cpg?await e.cpg.text():null},b));continue}
    for(const ext of Object.keys(e)){
      if(['dbf','prj','cpg','shx','sbn','sbx','qpj','xml'].includes(ext))continue;
      if(ext=='zip'||ext=='kmz')res.push(...await readZip(await zipRead(await e[ext].arrayBuffer()),b));
      else res.push(readOne(ext,await e[ext].text(),b));
    }
  }
  return res;
}
function pickFiles(accept,cb2){
  const i=document.createElement('input');i.type='file';i.multiple=true;i.accept=accept;i.style.display='none';
  i.onchange=()=>{const f=[...i.files];i.remove();if(f.length)cb2(f)};document.body.appendChild(i);i.click();
}
function impLayers(){pickFiles('*/*',impLayerFiles)}
async function impLayerFiles(files){
    try{
      busy('Membaca layer…');
      const res=await readLayerFiles(files),guess=['name','nama','blok','block','id','label','kode','code'];let n=0;
      for(const r of res){
        const keys=Object.keys((r.feats.find(f=>f.p&&Object.keys(f.p).length)||{p:{}}).p),lbl=guess.map(g=>keys.find(k=>k.toLowerCase()==g)).find(Boolean)||'';
        await lPut({id:'l'+Date.now()+'_'+(n++),name:r.name,feats:r.feats,color:PAL[(layers.length+n)%PAL.length],show:true,label:lbl,t:new Date().toISOString()});
      }
      busy();
      if(view=='map')await mapView();else if(view=='settings')settingsView();
      alert(`${res.length} layer diimpor: ${res.map(r=>r.name+' ('+r.feats.length+' objek)').join(', ')}`);
    }catch(e){busy();alert('Impor layer gagal: '+(e&&e.message||e))}
}
function drawLayers(){
  if(!LM||!LLy)return;LLy.clearLayers();
  let nv=0;layers.forEach(l=>{if(l.show)l.feats.forEach(f=>{nv+=f.k=='pt'?1:f.c.reduce((a,r)=>a+r.length,0)})});
  const step=Math.max(1,Math.ceil(nv/120000)),sm=r=>step>1?r.filter((_,i)=>i%step==0||i==r.length-1):r;
  layers.forEach(l=>{
    if(!l.show)return;
    const many=l.feats.length>400,pop=f=>Object.keys(f.p||{}).slice(0,14).map(k=>`<b>${E(k)}</b>: ${E(f.p[k])}`).join('<br>')||'(tanpa atribut)';
    l.feats.forEach(f=>{
      let ly;
      if(f.k=='pt')ly=L.circleMarker(xy(f.c[1],f.c[0]),{radius:5,color:'#fff',weight:1.5,fillColor:l.color,fillOpacity:1,bubblingMouseEvents:false});
      else if(f.k=='ln')ly=L.polyline(f.c.map(r=>sm(r).map(q=>xy(q[1],q[0]))),{color:l.color,weight:2,bubblingMouseEvents:false});
      else ly=L.polygon(f.c.map(r=>sm(r).map(q=>xy(q[1],q[0]))),{color:l.color,weight:2,fillColor:l.color,fillOpacity:.12,bubblingMouseEvents:false});
      ly.addTo(LLy).bindPopup(()=>`<b>${E(l.name)}</b><br>${pop(f)}`);
      if(l.label&&!many&&f.p&&f.p[l.label]!=null&&f.p[l.label]!=='')ly.bindTooltip(String(f.p[l.label]),{permanent:true,direction:'center',className:'lyl'});
    });
  });
}
function lyUi(){
  const el=$('#ly');if(!el)return;
  el.innerHTML=layers.map(l=>{
    const keys=Object.keys((l.feats.find(f=>f.p&&Object.keys(f.p).length)||{p:{}}).p);
    return `<div class="fr"><label class="opt" style="margin:0 0 6px;padding:6px 8px"><input type="checkbox" ${l.show?'checked':''} onchange="lyTog('${l.id}')"><span class="dot" style="background:${l.color}"></span><span style="flex:1;font-size:13px"><b>${E(l.name)}</b> · ${l.feats.length} objek</span><button class="b" style="background:var(--r);padding:4px 10px" onclick="event.preventDefault();lyDel('${l.id}')">Hapus</button></label><select onchange="lyLab('${l.id}',this.value)"><option value="">(tanpa label)</option>${keys.map(k=>`<option ${l.label==k?'selected':''}>${E(k)}</option>`).join('')}</select></div>`;
  }).join('')||'<p class="m">Belum ada layer. Impor SHP (ZIP), KML/KMZ, GPX, GeoJSON, atau CSV.</p>';
}
async function lyTog(id){const l=layers.find(x=>x.id==id);l.show=!l.show;await lPut(l);drawLayers()}
async function lyLab(id,v){const l=layers.find(x=>x.id==id);l.label=v;await lPut(l);drawLayers()}
async function lyDel(id){if(!confirm('Hapus layer ini dari aplikasi?'))return;await lDel(id);layers=layers.filter(x=>x.id!=id);lyUi();drawLayers()}

/* ---------- Kompas / arah hadap ---------- */
const card8=d=>['U','TL','T','TG','S','BD','B','BL'][Math.round((((d%360)+360)%360)/45)%8];
const angd=(a,b)=>((a-b+540)%360)-180;
let cmpEl=null;
function compHead(al,be,ga){
  const r=Math.PI/180,a=al*r,b=be*r,g=ga*r,cA=Math.cos(a),sA=Math.sin(a),cB=Math.cos(b),sB=Math.sin(b),cG=Math.cos(g),sG=Math.sin(g);
  const rA=-cA*sG-sA*sB*cG,rB=-sA*sG+cA*sB*cG,rC=-cB*cG;
  if(Math.abs(rC)>.8)return(360-al)%360;
  let h=Math.atan(rA/rB);if(rB<0)h+=Math.PI;else if(rA<0)h+=2*Math.PI;
  return((h*180/Math.PI)%360+360)%360;
}
function compSet(h){
  h=(h+(+LS('decl',0)||0)+720)%360;
  hdg=hdg==null?h:(hdg+angd(h,hdg)*.3+360)%360;
  compUi();
}
function compInit(){
  const f=e=>{
    let h=null;
    if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;
    else if(e.alpha!=null&&(e.absolute||e.type=='deviceorientationabsolute'))h=compHead(e.alpha,e.beta||0,e.gamma||0);
    if(h==null||isNaN(h))return;
    const now=Date.now();if(now-hdgT<100)return;hdgT=now;compOK=true;compSet(h);
  };
  try{window.addEventListener('deviceorientationabsolute',f,true);if(!('ondeviceorientationabsolute' in window))window.addEventListener('deviceorientation',f,true)}catch(e){logE('kompas',e&&e.message||e)}
}
function arrowMk(ll){
  return L.marker(ll,{icon:L.divIcon({className:'',html:`<div style="width:90px;height:90px;transform:rotate(${hdg}deg)"><svg viewBox="0 0 90 90"><path d="M45 45 L22 5 A46 46 0 0 1 68 5 Z" fill="#1976d2" fill-opacity=".28" stroke="#1976d2" stroke-opacity=".45"/><path d="M45 12 L52 32 L45 28 L38 32 Z" fill="#1976d2" stroke="#fff" stroke-width="1.5"/></svg></div>`,iconSize:[90,90],iconAnchor:[45,45]}),interactive:false,keyboard:false});
}
function compUi(){
  if(hdg==null)return;
  const tx=$('#hdgT');if(tx){tx.className='chip ok';tx.textContent=`🧭 ${Math.round(hdg)}° ${card8(hdg)}`}
  const g=$('#crsG');if(g&&g.setAttribute)g.setAttribute('transform',`rotate(${-hdg} 30 30)`);
  const ct=$('#crsT');if(ct)ct.textContent=`${Math.round(hdg)}° ${card8(hdg)}`;
  slUi();
  if(view=='run')liveUpdate();
  if(view=='map'&&LM&&!mapT)mapT=setTimeout(()=>{mapT=0;userDraw()},250);
}
function declSave(){const v=parseFloat($('#dc').value);if(isNaN(v)||Math.abs(v)>30)return alert('Isi deklinasi antara -30 dan 30 derajat.');S('decl',v);alert('Deklinasi disimpan: '+v+'°')}

/* ---------- Log error & diagnosa ---------- */
const APPV='2.0',SN=()=>plug('SensusNative');
let applog=LS('applog',[]);
function logE(kind,msg){
  try{applog.push(`${new Date().toISOString()} [${kind}] ${view||''} | ${String(msg).slice(0,700)}`);if(applog.length>260)applog=applog.slice(-200);S('applog',applog)}catch(x){}
}
window.addEventListener('error',e=>logE('error',`${e.message} @${String(e.filename||'').split('/').pop()}:${e.lineno}:${e.colno}${e.error&&e.error.stack?' | '+String(e.error.stack).split('\n').slice(0,4).join(' ⏎ '):''}`));
window.addEventListener('unhandledrejection',e=>logE('promise',e.reason&&e.reason.stack?String(e.reason.stack).split('\n').slice(0,4).join(' ⏎ '):String(e.reason)));
{const _al=window.alert;window.alert=m=>{logE('alert',m);return _al.call(window,m)};const _ce=console.error;console.error=(...a)=>{logE('console',a.map(x=>{try{return x&&typeof x=='object'?JSON.stringify(x,Object.getOwnPropertyNames(x)):String(x)}catch(e){return String(x)}}).join(' '));_ce.apply(console,a)}}
function lifeInit(){
  const was=LS('run',0),seen=LS('seen',0),vs=LS('vis','');
  if(was)logE('prev-abnormal',`Sesi sebelumnya tidak tercatat keluar normal. Terakhir aktif ${seen?fmtDT(new Date(seen)):'?'} (status: ${vs||'?'}). Kemungkinan ditutup paksa atau dimatikan sistem.`);
  S('run',1);
  const hb=()=>{S('seen',Date.now());S('vis',document.hidden?'latar belakang':'depan')};hb();setInterval(hb,15000);
  document.addEventListener('visibilitychange',()=>{
    hb();logE('vis',document.hidden?'ke latar belakang':'kembali ke depan');
    if(!document.hidden){S('run',1);if(view=='settings')settingsView()}
  });
  window.addEventListener('pagehide',()=>{S('run',0)});
  logE('start',`Sensus Blok v${APPV} · ${navigator.userAgent.slice(0,140)}`);
}
async function buildLog(){
  const N=SN();let ni=nativeInfo,nl={crash:'',exits:''},nerr='';
  try{if(N){ni=await N.getInfo();nativeInfo=ni;nl=await N.readLog()}}catch(e){nerr='(gagal membaca data native: '+(e&&e.message||e)+')'}
  let st='?',bat='?';
  try{const e=await navigator.storage.estimate();st=`${(e.usage/1048576).toFixed(1)} MB dari ${(e.quota/1048576).toFixed(0)} MB`}catch(x){}
  try{const b=await navigator.getBattery();bat=`${Math.round(b.level*100)}%${b.charging?' (mengisi)':''}`}catch(x){}
  const cn=f=>f().then(a=>a.length).catch(()=>'?'),ph=await cn(pAll),mp=await cn(mAll),ly=await cn(lAll);
  const head=[`SENSUS BLOK — LOG DIAGNOSA`,`Waktu: ${new Date().toString()}`,
    `Versi aplikasi: ${APPV}${ni&&ni.versionCode?` (build ${ni.versionCode})`:''}`,
    `Perangkat: ${ni&&ni.model?ni.model+' · Android SDK '+ni.sdk:navigator.userAgent}`,
    ni&&ni.totalMem?`Memori: tersedia ${(ni.availMem/1048576).toFixed(0)} MB dari ${(ni.totalMem/1048576).toFixed(0)} MB${ni.lowMem?' · MEMORI RENDAH':''}`:'',
    `Penyimpanan aplikasi: ${st} · Baterai: ${bat}`,
    `Optimasi baterai dimatikan: ${ni&&ni.ignoringBattery!=null?(ni.ignoringBattery?'ya':'TIDAK (aplikasi berisiko dimatikan sistem)'):'?'}`,
    `Data: ${sessions.length} sesi, ${ph} foto, ${mp} peta, ${ly} layer`,
    `GPS: ${cur?'±'+cur.acc.toFixed(1)+' m':'tidak ada fix'} · Kompas: ${hdg==null?'tidak tersedia':Math.round(hdg)+'°'} · Lux: ${lxRaw==null?'tidak ada':Math.round(lxRaw)}`,
    `Backup terakhir: ${LS('lastBackup',null)||'belum pernah'}`].filter(Boolean).join('\n');
  return `${head}\n\n===== PROSES BERHENTI (Android 11+) =====\n${nl.exits||'(tidak ada / Android < 11)'}\n\n===== CRASH NATIVE =====\n${nl.crash||'(tidak ada)'}\n${nerr}\n\n===== LOG APLIKASI (terbaru di bawah) =====\n${applog.join('\n')||'(kosong)'}\n`;
}
async function logSend(){
  const FS=plug('Filesystem');
  try{
    busy('Menyusun log…');
    const txt=await buildLog(),name=`SensusBlok_log_${today()}_${p2(new Date().getHours())}${p2(new Date().getMinutes())}.txt`;
    if(!FS){busy();return showText(txt,'Log diagnosa')}
    const r=await FS.writeFile({path:name,data:txt,directory:'CACHE',encoding:'utf8'});
    busy();
    await plug('Share').share({title:name,text:'Log diagnosa Sensus Blok',files:[r.uri],dialogTitle:'Kirim log'});
  }catch(e){busy();if(!/cancel/i.test(e&&e.message||''))alert('Gagal mengirim log: '+(e&&e.message||e))}
}
async function logView(){busy('Menyusun log…');const x=await buildLog();busy();showText(x,'Log diagnosa')}
async function logClear(){
  if(!confirm('Hapus semua log?'))return;
  applog=[];S('applog',applog);const N=SN();if(N)try{await N.clearLog()}catch(e){}
  S('crashSeen',Date.now());crashNote='';alert('Log dihapus.');
}
async function crashCheck(){
  const N=SN();if(!N)return;
  try{
    const r=await N.readLog(),seen=+LS('crashSeen',0),bad=[];
    for(const m of String(r.crash||'').matchAll(/=== CRASH (\d+) \|/g))if(+m[1]>seen)bad.push('crash '+new Date(+m[1]).toLocaleString('id-ID'));
    for(const ln of String(r.exits||'').split('\n')){
      const m=/^(\d+) \| .*? \| reason=(\w+)/.exec(ln);
      if(m&&+m[1]>seen&&['CRASH','CRASH_NATIVE','ANR','LOW_MEMORY','EXCESSIVE_RESOURCE_USAGE','SIGNALED','INITIALIZATION_FAILURE','DEPENDENCY_DIED'].includes(m[2]))bad.push(m[2]+' '+new Date(+m[1]).toLocaleString('id-ID'));
    }
    if(bad.length){crashNote=`Terdeteksi ${bad.length} kejadian: ${[...new Set(bad)].slice(0,4).join('; ')}.`;logE('crash-check',crashNote)}
  }catch(e){logE('crash-check',e&&e.message||e)}
}
function crashDismiss(){S('crashSeen',Date.now());crashNote='';bnUi()}

/* ---------- Update otomatis (GitHub Releases) ---------- */
const REPO='__REPO__';
const repoSlug=()=>{const r=LS('repo','')||REPO;return /__/.test(r)?'':r};
function updSave(){const r=($('#rp')||{}).value,k=($('#tk')||{}).value;if(r!==undefined)S('repo',r.trim());if(k!==undefined)S('ghtok',k.trim())}
async function updCheck(manual){
  const repo=repoSlug(),tok=LS('ghtok','');
  if(!repo){if(manual)alert('Isi sumber update dengan format pemilik/nama-repository (mis. namaanda/sensus-blok).');return null}
  try{
    const r=await fetch(`https://api.github.com/repos/${repo}/releases/latest`,{headers:{Accept:'application/vnd.github+json',...(tok?{Authorization:'Bearer '+tok}:{})}});
    if(r.status==404){if(manual)alert('Belum ada rilis, atau repository privat (isi token akses).');return null}
    if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json(),n=+((/(\d+)\s*$/.exec(j.tag_name||'')||[])[1]||0),a=(j.assets||[]).find(x=>/\.apk$/i.test(x.name)),cv=nativeInfo&&+nativeInfo.versionCode||0;
    S('updChk',Date.now());
    updInfo={n,cur:cv,newer:!!a&&n>cv,name:j.name||j.tag_name,body:j.body||'',url:a?(tok?a.url:a.browser_download_url):''};
    return updInfo;
  }catch(e){logE('update',e&&e.message||e);if(manual)alert('Gagal memeriksa update: '+(e&&e.message||e));return null}
}
async function updCheckUi(){
  updSave();busy('Memeriksa pembaruan…');
  const r=await updCheck(true);busy();
  const el=$('#updS');if(!el)return;
  el.innerHTML=!r?'':r.newer?`<b>🔔 Versi baru tersedia: build ${r.n}</b> (terpasang: build ${r.cur||'?'})<br>${E((r.body||'').slice(0,300))}<div class="row"><button class="b" onclick="updGo()">Unduh &amp; pasang</button></div>`:`✅ Sudah versi terbaru (build ${r.cur||r.n}).`;
}
async function updGo(){
  const u=updInfo,N=SN();
  if(!u||!u.url)return;
  if(!N)return alert('Update hanya tersedia di aplikasi Android.');
  if(!confirm(`Unduh & pasang versi build ${u.n}?\n\n${(u.body||'').slice(0,400)}\n\nSetelah unduhan selesai, Android akan meminta konfirmasi pemasangan. Data Anda tetap aman.`))return;
  try{
    busy('Mengunduh… 0%');
    const poll=setInterval(async()=>{try{const s=await N.dlStatus();busy(s.total>0?`Mengunduh… ${Math.round(s.done/s.total*100)}% (${(s.done/1048576).toFixed(1)} MB)`:`Mengunduh… ${(s.done/1048576).toFixed(1)} MB`)}catch(e){}},500);
    try{await N.download({url:u.url,token:LS('ghtok','')})}finally{clearInterval(poll)}
    busy();logE('update','unduh selesai, memulai pemasangan build '+u.n);
    const r=await N.installApk();
    if(r&&r.needPermission)alert('Izinkan "Pasang aplikasi tidak dikenal" untuk Sensus Blok pada layar yang terbuka, lalu kembali ke aplikasi dan tekan "Unduh & pasang" lagi.');
  }catch(e){busy();logE('update',e&&e.message||e);alert('Update gagal: '+(e&&e.message||e))}
}

/* ---------- Baterai, jejak latar belakang, pemulihan ---------- */
/* ---------- Halaman Pengaturan & banner ---------- */
function banners(){
  let h='';
  if(crashNote)h+=`<div class="card" style="border-left:4px solid var(--r)"><b>⚠ Aplikasi sempat berhenti tidak normal</b><div class="m">${E(crashNote)}\nBuka Pengaturan → Kirim log agar penyebabnya bisa dianalisis.</div><div class="row"><button class="b" onclick="go('settings')">Buka Pengaturan</button><button class="b gray" onclick="crashDismiss()">Tutup</button></div></div>`;
  if(updInfo&&updInfo.newer)h+=`<div class="card" style="border-left:4px solid var(--g)"><b>🔔 Versi baru tersedia (build ${updInfo.n})</b><div class="m">${E((updInfo.body||'').slice(0,160))}</div><div class="row"><button class="b" onclick="updGo()">Unduh &amp; pasang</button><button class="b gray" onclick="updInfo=null;bnUi()">Nanti</button></div></div>`;
  const u=sessions.find(s=>!s.done);
  if(u)h+=`<div class="card" style="border-left:4px solid #f57c00"><b>Sensus belum selesai</b><div class="m">${E(title(u))} · Blok ${E(u.h.blok)} · ${u.recs.length} ${E(ul(u))} tersimpan</div><div class="row"><button class="b" style="background:#f57c00" onclick="go('run',${u.id})">Lanjutkan</button></div></div>`;
  if(nativeInfo&&nativeInfo.ignoringBattery===false&&!LS('batHintOff',0))h+=`<div class="card" style="border-left:4px solid #f57c00"><b>🔋 Optimasi baterai masih aktif</b><div class="m">Android dapat mematikan aplikasi di kebun saat layar mati. Matikan optimasi baterai agar sensus dan rekam jejak tidak terhenti.</div><div class="row"><button class="b" onclick="go('settings')">Atur sekarang</button><button class="b gray" onclick="S('batHintOff',1);bnUi()">Jangan tampilkan</button></div></div>`;
  return h;
}
function bnUi(){const el=$('#bn');if(el)el.innerHTML=banners()}
const OEM=[
 [/xiaomi|redmi|poco/i,'Xiaomi / Redmi / POCO','Info aplikasi → Penghemat baterai → pilih "Tanpa pembatasan". Aktifkan "Mulai otomatis". Di layar aplikasi terbaru, tarik kartu Sensus Blok lalu ketuk ikon gembok.'],
 [/oppo|realme|oneplus/i,'Oppo / Realme / OnePlus','Info aplikasi → Penggunaan baterai → izinkan aktivitas latar belakang dan "Izinkan mulai otomatis". Kunci aplikasi di layar aplikasi terbaru.'],
 [/vivo|iqoo/i,'Vivo / iQOO','Pengaturan → Baterai → Konsumsi daya latar belakang → pilih Sensus Blok → "Izinkan". Aktifkan juga izin "Mulai otomatis".'],
 [/samsung/i,'Samsung','Pengaturan → Baterai → Batas penggunaan latar belakang → hapus Sensus Blok dari "Aplikasi tidur" dan "Aplikasi tidur mendalam". Di Info aplikasi → Baterai pilih "Tidak dibatasi".'],
 [/infinix|tecno|itel|huawei|honor/i,'Infinix / Tecno / Huawei / Honor','Info aplikasi → Baterai → "Tidak dibatasi", dan di Pengelola/Peluncuran aplikasi matikan "Kelola otomatis" lalu aktifkan Mulai otomatis, Peluncuran sekunder, dan Jalankan di latar belakang.']];
async function settingsView(sub){
  if(typeof sub=='string')setSub=sub;
  let maps=[];try{maps=await mAll();layers=await lAll()}catch(e){}
  const ni=nativeInfo||{},ok=ni.ignoringBattery,brand=ni.brand||ni.model||'',oem=OEM.slice().sort((a,b)=>(b[0].test(brand)?1:0)-(a[0].test(brand)?1:0));
  const act=maps.find(m=>m.id==mf.map),SUBS=[['umum','Umum'],['peta','Peta'],['data','Data'],['sistem','Sistem']];
  let h='';
  if(setSub=='umum')h=`
  <div class="card"><b>🏢 Perusahaan</b><label>Nama perusahaan (tampil di header dan laporan)</label><input id="pt" value="${E(PT())}"><div class="row"><button class="b" onclick="ptSave()">Simpan</button></div></div>
  <div class="card"><b>🧭 Kompas</b><label>Deklinasi magnetik (°, positif = timur). Indonesia sekitar −1° hingga +2°</label><input id="dc" type="number" step="0.1" value="${E(LS('decl',0))}"><div class="row"><button class="b gray" onclick="declSave()">Simpan deklinasi</button></div></div>
  <div class="card"><b>⬇ Update aplikasi</b>
  <div class="m" style="margin-top:4px">Versi terpasang: ${APPV}${ni.versionCode?` · build ${ni.versionCode}`:''}</div>
  <div id="updS" class="m">${updInfo&&updInfo.newer?`<b>🔔 Versi baru tersedia: build ${updInfo.n}</b>`:''}</div>
  <label>Sumber update (GitHub: pemilik/nama-repository)</label><input id="rp" value="${E(repoSlug())}" placeholder="mis. namaanda/sensus-blok">
  <label>Token akses (hanya bila repository privat)</label><input id="tk" type="password" value="${E(LS('ghtok',''))}" placeholder="opsional">
  <div class="row"><button class="b" onclick="updCheckUi()">Cek pembaruan</button>${updInfo&&updInfo.newer?'<button class="b" style="background:#f57c00" onclick="updGo()">Unduh &amp; pasang</button>':''}</div>
  <div class="m" style="margin-top:6px">Diperiksa otomatis saat aplikasi dibuka (maks. 6 jam sekali). Pemasangan tetap meminta satu ketukan konfirmasi dari Android.</div></div>`;
  else if(setSub=='peta')h=`
  <div class="card"><b>🗺 Peta offline</b>
  <label>Peta aktif</label><select onchange="setActiveMap(this.value)"><option value="">— Tanpa peta —</option>${maps.map(m=>`<option value="${m.id}" ${m.id==mf.map?'selected':''}>${E(m.name)}</option>`).join('')}</select>
  <div class="m" style="margin-top:6px">${act?E(act.name)+' · '+act.w+'×'+act.h+' px · '+(act.tl&&act.tl.nat?'<b>tajam (dirender langsung dari PDF)</b>':'resolusi standar — impor ulang PDF untuk tampilan lebih tajam'):'Belum ada peta aktif.'}</div>
  <div class="row"><button class="b" onclick="impMap()">+ Impor GeoPDF / gambar</button><button class="b" style="background:var(--r)" onclick="delMap()">Hapus peta</button></div></div>
  <div class="card"><b>🎯 Georeferensi peta aktif</b>
  <div class="row" style="margin-top:6px"><button class="b gray" onclick="mapTool('calib')">Kalibrasi geser</button><button class="b gray" onclick="mapTool('reset')">Reset geser</button></div>
  <div class="row"><button class="b gray" onclick="mapTool('vr')">Orientasi: ${VN[act&&act.vr||0]}</button><button class="b gray" onclick="mapTool('info')">Info georef</button><button class="b gray" onclick="mapTool('regeo')">Georef ulang</button></div></div>
  <div class="card"><b>🌐 Google Maps (online)</b><label>API key</label><input id="gk" value="${E(LS('gkey',''))}" placeholder="AIza…"><label>Tipe peta</label><select onchange="mf.gt=this.value">${[['roadmap','Peta'],['satellite','Satelit'],['hybrid','Hybrid'],['terrain','Medan']].map(([v,l])=>`<option value="${v}" ${mf.gt==v?'selected':''}>${l}</option>`).join('')}</select><div class="row"><button class="b gray" onclick="S('gkey',$('#gk').value.trim());alert('Key disimpan. Pilih Google Maps pada tombol Peta di tab Peta.')">Simpan key</button></div></div>
  <div class="card"><b>📐 Layer vektor</b><div class="m">SHP (ZIP), KML/KMZ, GPX, GeoJSON, CSV — dari ArcGIS / QGIS</div><div class="row"><button class="b" onclick="impLayers()">+ Impor layer</button></div><div id="ly" style="margin-top:6px"></div></div>`;
  else if(setSub=='data')h=`
  <div class="card"><b>💾 Backup &amp; Restore</b><div class="m" style="margin:4px 0 8px">${E(bkInfo())}</div><div class="row" style="margin-top:0"><button class="b" onclick="doBackup()">Backup Semua Data</button><button class="b gray" onclick="doRestore()">Restore</button></div></div>
  <div class="card"><b>👥 Data tim</b><div class="m" style="margin:4px 0 8px">Kumpulkan data sensus dari beberapa HP ke satu HP.</div><div class="row" style="margin-top:0"><button class="b" onclick="impData()">Import Data Tim</button><button class="b gray" onclick="shareData(sessions.map(s=>s.id))">Export Semua</button></div></div>`;
  else h=`
  <div class="card"><b>🔋 Baterai &amp; kinerja</b>
  <div style="margin:6px 0"><span class="chip ${ok?'ok':'bad'}">${ok===undefined?'Hanya terdeteksi di aplikasi':ok?'✓ Optimasi baterai dimatikan':'✗ Optimasi baterai masih aktif'}</span></div>
  <div class="m">Agar GPS dan sensus tidak terhenti saat layar mati atau aplikasi di latar belakang:\n1. Matikan optimasi baterai untuk Sensus Blok.\n2. Izin lokasi: "Izinkan sepanjang waktu" atau "Saat aplikasi digunakan".\n3. Jangan "tutup paksa" aplikasi saat sensus berjalan; sensus yang terputus bisa dilanjutkan dari halaman Sensus.</div>
  <div class="row"><button class="b" onclick="SN()&&SN().requestIgnoreBattery()">Matikan optimasi baterai</button><button class="b gray" onclick="SN()&&SN().openBatterySettings()">Daftar optimasi</button></div>
  <div class="row"><button class="b gray" onclick="SN()&&SN().openAppSettings()">Info aplikasi &amp; izin</button></div>
  <details style="margin-top:8px"><summary>Panduan per merek HP</summary>${oem.map(o=>`<div class="m" style="margin-top:8px"><b>${o[1]}</b>${o[0].test(brand)?' ← HP Anda':''}\n${o[2]}</div>`).join('')}</details></div>
  <div class="card"><b>🧰 Log &amp; diagnosa</b><div class="m" style="margin-top:4px">Jika aplikasi berhenti sendiri atau bermasalah di kebun, kirim log ini ke pengembang. Isinya: catatan error, penyebab proses dimatikan Android, memori, baterai, dan status GPS.</div>
  <div class="row"><button class="b" onclick="logSend()">📤 Kirim log</button><button class="b gray" onclick="logView()">Lihat log</button><button class="b gray" onclick="logClear()">Hapus log</button></div></div>`;
  show('Pengaturan','Sensus Blok v'+APPV,`<div class="stabs" style="margin-top:-12px">${SUBS.map(([v,l])=>`<button class="${setSub==v?'on':''}" onclick="settingsView('${v}')">${l}</button>`).join('')}</div>`+h,{back:1});
  if(setSub=='peta')lyUi();
}
function ptSave(){const v=($('#pt').value||'').trim();if(!v)return alert('Nama perusahaan tidak boleh kosong.');S('pt',v);alert('Tersimpan.');settingsView()}
function setActiveMap(id){mf.map=id;mv=null;settingsView()}
async function useMapRec(){
  const id=mf.map;if(!id||ONL.includes(id)){alert('Pilih peta offline sebagai peta aktif lebih dulu.');return false}
  mapRec=(await mAll()).find(m=>m.id==id)||null;onl=false;if(!mapRec){alert('Peta tidak ditemukan.');return false}return true;
}
async function mapTool(k){
  if(!await useMapRec())return;
  if(k=='reset'){await resetCalib();alert('Geser kalibrasi direset.')}
  else if(k=='vr')await nextVariant();
  else if(k=='info')geoInfo();
  else{mapAfter=k=='calib'?calibMap:regeoref;go('map')}
}
/* ---------- Mulai (lanjutan) ---------- */
/* ---------- Berkas dari aplikasi lain (WhatsApp: Buka dengan / Bagikan) ---------- */
let openBusy=false;
async function openedFile(){
  const N=PM();if(!N||openBusy||view=='run')return;
  let f;try{f=await N.takeOpened()}catch(e){return}
  if(!f||!f.has)return;
  openBusy=true;
  try{
    const nm=f.name||'berkas',ext=((nm.match(/\.([^.]+)$/)||[])[1]||'').toLowerCase(),mime=f.mime||'';
    let kind=ext=='pdf'||mime=='application/pdf'?'pdf':/^image\//.test(mime)||/^(jpe?g|png|webp|bmp)$/.test(ext)?'img':ext=='sbk'?'sbk':ext=='json'?'json':'layer';
    let blob=null;
    if(kind=='layer'&&!/^(shp|zip|kmz|kml|gpx|geojson|csv|xml|dbf|prj|cpg)$/.test(ext)){   // ekstensi tidak dikenal: intip isi berkas
      blob=await fileBlob(f.path);const h=await blob.slice(0,300).text();
      if(h.includes('"t":"meta"'))kind='sbk';else if(h.includes('"app":"SensusBlok"'))kind='json';
    }
    const what={pdf:'peta GeoPDF',img:'gambar peta (georeferensi manual)',sbk:'backup Sensus Blok (digabungkan ke data saat ini)',json:'data tim Sensus Blok (digabungkan)',layer:'layer vektor GIS'}[kind];
    if(!confirm(`Buka "${nm}" di Sensus Blok sebagai ${what}?`)){await N.clearOpened();return}
    if(kind=='pdf'||kind=='img'){
      const r=await N.adopt();
      await impMapFile({path:r.path,name:nm,mime});
    }else{
      blob=blob||await fileBlob(f.path);
      const file=new File([blob],nm,{type:mime});
      if(kind=='sbk')await restoreFile(file);else if(kind=='json')await impDataFile(file);else await impLayerFiles([file]);
      await N.clearOpened();
    }
  }catch(e){busy();alert('Gagal membuka berkas: '+(e&&e.message||e))}
  finally{openBusy=false}
}
async function startup(){
  try{const N=PM();if(N&&N.addListener)N.addListener('fileOpened',()=>openedFile());document.addEventListener('visibilitychange',()=>{if(!document.hidden)openedFile()});openedFile()}catch(e){logE('open',e&&e.message||e)}
  try{const N=SN();if(N)nativeInfo=await N.getInfo()}catch(e){logE('native',e&&e.message||e)}
  await crashCheck();
  bnUi();
  setTimeout(async()=>{if(Date.now()-(+LS('updChk',0))>6*36e5){const r=await updCheck(false);if(r&&r.newer)bnUi()}},5000);
}
/* ---------- Mulai ---------- */
go('home',0,true);
gpsInit();
luxInit();
compInit();
lifeInit();
startup();
