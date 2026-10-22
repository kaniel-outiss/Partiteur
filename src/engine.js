/* ═══════════ 🎼 MOTEUR — Verovio (gravure + temps) → modèle de la pièce ═══════════
   Une seule source : le MusicXML de l'œuvre (importé tel quel, ou compilé depuis les jetons).
   Verovio grave, déplie les reprises (timemap) et donne les identifiants des notes ; on en tire SC :
   SC.staves, SC.parts, SC.meas (ordre de la partition), SC.perf (ordre de lecture, reprises dépliées), SC.ev (événements sonores). */
'use strict';
const VRV={tk:null,ready:null,src:null,srcKey:'',loadedKey:''};
VRV.init=function(){if(VRV.ready)return VRV.ready;VRV.ready=new Promise(function(ok,ko){
    const go=function(){try{VRV.tk=new verovio.toolkit();ok();}catch(e){ko(e);}};
    if(typeof verovio==='undefined'){ko(new Error('Verovio absent'));return;}
    if(window.VRV_OK)go();else window.VRV_CB.push(go);});return VRV.ready;};
/* — le MusicXML d'une œuvre — */
function workXML(W){if(W.xml)return {xml:W.xml,staves:null};const r=tokWorkToXML(W,{});return {xml:r.xml,staves:r.staves};}
/* clé du chant : sol 8 (ténor écrit) ↔ fa (hauteur réelle) — les hauteurs MusicXML sont réelles, seule la clé change */
function xmlVoiceClef(xml,vc){const doc=new DOMParser().parseFromString(xml,'application/xml');const parts=$$('part',doc);
  /* portée globale n → [partie, portée locale] */
  const loc={};let g=0;parts.forEach(function(p,pi){const st=p.querySelector('attributes staves');const n=st?+st.textContent:1;for(let k=1;k<=n;k++)loc[++g]=[pi,k];});
  Object.keys(vc).forEach(function(pid){const P=partById(pid);if(!P||!loc[P.staff])return;const L=loc[P.staff],part=parts[L[0]];
    $$('clef',part).forEach(function(c){const n=+(c.getAttribute('number')||'1');if(n!==L[1])return;const s=c.querySelector('sign'),l=c.querySelector('line');let o=c.querySelector('clef-octave-change');
      if(vc[pid]==='F'){s.textContent='F';if(l)l.textContent='4';if(o)o.remove();}
      else{s.textContent='G';if(l)l.textContent='2';if(vc[pid]==='G8'){if(!o){o=doc.createElement('clef-octave-change');c.appendChild(o);}o.textContent='-1';}else if(o)o.remove();}});});
  return new XMLSerializer().serializeToString(doc);}
/* — options de gravure — */
function vrvOpts(width,scale,extra){return Object.assign({pageWidth:Math.round(width*100/scale),pageHeight:60000,scale:scale,adjustPageHeight:true,breaks:'auto',
  footer:'none',header:'none',xmlIdSeed:7,pageMarginLeft:40,pageMarginRight:30,pageMarginTop:30,pageMarginBottom:20,spacingSystem:(typeof PN!=='undefined'&&PN.chords?16:10),/* place pour le chiffrage sous la portée */
  lyricSize:4.6,lyricTopMinMargin:3,justifyVertically:false},/* œuvres avec chœur ponctuel : on masque les portées vides d'un système */(typeof ST!=='undefined'&&ST.W&&ST.W.condense)?{condense:'encoded',condenseFirstPage:true,systemDivider:'none'}:{condense:'none'},extra||{});}
/* charge l'œuvre : modèle (non transposé) puis gravure (transposée) */
/* les chargements passent un par un (la bibliothèque calcule des tessitures en tâche de fond) ; probe = sans changer la pièce affichée */
VRV.lock=Promise.resolve();
function engineLoad(W,probe){const run=VRV.lock.then(function(){return VRV.init();}).then(function(){const tk=VRV.tk;const X=workXML(W);
    tk.setOptions(vrvOpts(1000,40,{transpose:''}));if(!tk.loadData(X.xml))throw new Error('partition illisible');
    const SC=buildModel(tk,W,X.staves);if(!probe)VRV.base=X.xml;VRV.loadedKey='';return SC;});
  VRV.lock=run.catch(function(){});return run;}
/* gravure SVG à la largeur voulue (transposition comprise) — renvoie le SVG */
function engineRender(width,scale){const tk=VRV.tk;const hid=(ST.hidden||[]).filter(function(n){return ST.SC.staves.some(function(S){return S.n===n;});});
  if(hid.length>=ST.SC.staves.length)hid.length=0;
  const key=ST.W.id+'|'+ST.tr+'|'+JSON.stringify(ST.voiceClef)+'|'+hid.join(',');const tr=trInterval(ST.SC.ks,ST.tr);
  if(VRV.loadedKey!==key){const vc=ST.voiceClef||{};const xml=Object.keys(vc).length?xmlVoiceClef(VRV.base,vc):VRV.base;
    if(hid.length||ST.W.condense){tk.setOptions(vrvOpts(width,scale,{transpose:''}));tk.loadData(xml);let mei=tk.getMEI({});if(hid.length)mei=meiHide(mei,hid);if(ST.W.condense)mei=mei.replace(/<scoreDef(?=[\s>])/,'<scoreDef optimize="true"');tk.setOptions(vrvOpts(width,scale,{transpose:tr}));tk.loadData(mei);}
    else{tk.setOptions(vrvOpts(width,scale,{transpose:tr}));tk.loadData(xml);}VRV.loadedKey=key;}
  else{tk.setOptions(vrvOpts(width,scale,{transpose:tr}));tk.redoLayout();}
  return tk.renderToSVG(1);}
/* portées masquées : retirées du MEI (les identifiants des autres notes ne bougent pas) ; les indications qui les visaient passent à la 1re portée visible */
function meiHide(mei,hid){const d=new DOMParser().parseFromString(mei,'application/xml');const H={};hid.forEach(function(n){H[n]=1;});
  $$('staffDef',d).forEach(function(s){if(H[+s.getAttribute('n')])s.remove();});
  $$('staffGrp',d).forEach(function(g){if(!$$('staffDef',g).length)g.remove();});
  const vis=$$('staffDef',d).map(function(s){return +s.getAttribute('n');}).sort(function(a,b){return a-b;});const first=vis[0];
  $$('staff',d).forEach(function(s){if(H[+s.getAttribute('n')])s.remove();});
  const ids={};Array.prototype.forEach.call(d.getElementsByTagName('*'),function(e){const x=e.getAttribute('xml:id');if(x)ids[x]=1;});
  $$('measure [staff]',d).forEach(function(e){const st=e.getAttribute('staff').split(/\s+/).map(Number).filter(function(n){return !H[n];});
    const ref=(e.getAttribute('startid')||'').slice(1),ref2=(e.getAttribute('endid')||'').slice(1);
    if((ref&&!ids[ref])||(ref2&&!ids[ref2])){e.remove();return;}
    if(st.length)e.setAttribute('staff',st.join(' '));else e.setAttribute('staff',String(first));});
  return new XMLSerializer().serializeToString(d);}
/* — analyse MEI + timemap — */
const VOCRX=/sopr|alt|ten|bass|bari|mezzo|contr|voice|voix|chant|canto|choir|ch(œ|oe)ur|chorus|solo|^\s*[satb]\.?\s*$|cavaradossi|tosca/i;
const VTWORDS=[['sopr','S','Soprano'],['mezzo','Mz','Mezzo'],['alt','A','Alto'],['contr','A','Alto'],['ten','T','Ténor'],['bari','Bar','Baryton'],['bass','B','Basse'],['basse','B','Basse']];
function vtOf(n){n=(n||'').toLowerCase();for(let i=0;i<VTWORDS.length;i++)if(n.indexOf(VTWORDS[i][0])>=0)return VTWORDS[i][1];const m=/^\s*([satb])\.?\s*$/i.exec(n);return m?m[1].toUpperCase():'';}
const VTNAME={S:'Soprano',Mz:'Mezzo',A:'Alto',T:'Ténor',Bar:'Baryton',B:'Basse'};
function buildModel(tk,W,hint){
  const mei=new DOMParser().parseFromString(tk.getMEI({}),'application/xml');
  const tm=tk.renderToTimemap({includeMeasures:true,includeRests:true});
  const SC={staves:[],parts:[],meas:[],perf:[],ev:[],notes:{},fermRests:[],marks:[],ks:0,minor:false,verses:1};
  /* tonalité */
  const kd=mei.querySelector('scoreDef keySig,staffDef keySig');if(kd){const s=kd.getAttribute('sig')||'0';SC.ks=s==='0'?0:(+s.slice(0,-1))*(s.slice(-1)==='f'?-1:1);if(kd.getAttribute('mode')==='minor')SC.minor=true;}
  else if(W.ks!=null)SC.ks=W.ks;if(W.mode==='minor')SC.minor=true;
  /* portées */
  const sd=$$('staffDef',mei);const seen={};
  sd.forEach(function(d){const n=+d.getAttribute('n');if(seen[n])return;seen[n]=1;const lab=function(el){const l=el&&Array.prototype.filter.call(el.children,function(c){return c.localName==='label';})[0];return l?l.textContent.trim():'';};
    const ab=function(el){const l=el&&Array.prototype.filter.call(el.children,function(c){return c.localName==='labelAbbr';})[0];return l?l.textContent.trim():'';};
    const grp=d.parentNode&&d.parentNode.localName==='staffGrp'?d.parentNode:null;const sib=grp?Array.prototype.filter.call(grp.children,function(c){return c.localName==='staffDef';}):[d];
    const cl=d.querySelector('clef');
    SC.staves.push({n:n,label:lab(d)||lab(grp)||'',abbr:ab(d)||ab(grp)||'',grpIdx:sib.indexOf(d),grpN:sib.length,clef:cl?cl.getAttribute('shape'):'G'});});
  SC.staves.sort(function(a,b){return a.n-b.n;});
  /* mesures, mètres, textes */
  const MI={};let meter=[4,4];
  const walker=mei.createTreeWalker(mei.documentElement,1,null);let node=walker.currentNode;
  while(node){const ln=node.localName;
    if(ln==='scoreDef'||ln==='staffDef'){if(node.getAttribute('meter.count'))meter=[+node.getAttribute('meter.count'),+node.getAttribute('meter.unit')];if(ln==='scoreDef'&&SC.meas.length)SC._chg=true;}
    else if(ln==='meterSig'&&node.parentNode&&/scoreDef|staffDef/.test(node.parentNode.localName)){meter=[+node.getAttribute('count')||4,+node.getAttribute('unit')||4];}
    else if(ln==='measure'){const i=SC.meas.length;const txt=$$('dir,tempo',node).map(function(d){return d.textContent.replace(/\s+/g,' ').trim();}).filter(Boolean).join(' · ');
      const reh=$$('reh',node).map(function(r){return r.textContent.trim();}).filter(Boolean)[0]||'';
      const tmp=$$('tempo',node).map(function(r){return r.textContent.replace(/\s+/g,' ').trim();}).filter(Boolean)[0]||'';
      const bar=(node.getAttribute('right')||'')+' '+(node.getAttribute('left')||'');
      if(reh||tmp||SC._chg||/rptstart/.test(node.getAttribute('left')||'')||(i>0&&/dbl|end|rptend/.test(SC._prevRight||'')))SC.marks.push({mi:i,label:reh||tmp||'',kind:reh?'reh':(tmp?'tempo':'bar')});
      SC._chg=false;SC._prevRight=node.getAttribute('right')||'';
      SC.meas.push({i:i,id:node.getAttribute('xml:id'),n:node.getAttribute('n')||String(i+1),meter:meter.slice(),txt:txt,rall:/rall|rit\.|ritard|allarg|smorz|morendo/i.test(txt)&&!/a tempo/i.test(txt.replace(/.*(rall|rit\.|ritard|allarg)/i,''))});MI[node.getAttribute('xml:id')]=i;}
    node=walker.nextNode();}
  /* notes : portée, voix, paroles, liaisons, points d'orgue… */
  const tieEnd={},ferm={},arp={};
  $$('tie',mei).forEach(function(t){const e=(t.getAttribute('endid')||'').slice(1);if(e)tieEnd[e]=(t.getAttribute('startid')||'').slice(1);});
  $$('fermata',mei).forEach(function(f){const s=(f.getAttribute('startid')||'').slice(1);if(s)ferm[s]=1;});
  $$('arpeg',mei).forEach(function(a){(a.getAttribute('plist')||a.getAttribute('startid')||'').split(/\s+/).forEach(function(x){if(x)arp[x.slice(1)]=1;});});
  const up=function(el,name){while(el&&el.localName!==name)el=el.parentNode;return el;};
  const verseOf=function(el){const o={};Array.prototype.forEach.call(el.children,function(c){if(c.localName!=='verse')return;const n=+c.getAttribute('n')||1;
      const sy=$$('syl',c).map(function(s){const w=s.getAttribute('wordpos'),con=s.getAttribute('con');return s.textContent.trim()+(con==='b'?'‿':'')+((w==='i'||w==='m')?'-':'')+(con==='u'?'_':'');}).join('');o[n]=sy;if(n>SC.verses)SC.verses=n;});return o;};
  const layCount={};
  $$('note',mei).forEach(function(nt){const id=nt.getAttribute('xml:id');const st=up(nt,'staff'),ly=up(nt,'layer'),me=up(nt,'measure'),ch=up(nt,'chord');
    const s=st?+st.getAttribute('n'):1,l=ly?+ly.getAttribute('n'):1;const grace=!!(nt.getAttribute('grace')||(ch&&ch.getAttribute('grace')));
    const lyr=Object.assign({},ch?verseOf(ch):{},verseOf(nt));
    SC.notes[id]={id:id,staff:s,layer:l,mi:me?MI[me.getAttribute('xml:id')]:0,grace:grace,ly:lyr,chord:ch?ch.getAttribute('xml:id'):null,
      tieFrom:tieEnd[id]||null,ferm:!!(ferm[id]||(ch&&ferm[ch.getAttribute('xml:id')])||nt.getAttribute('fermata')),arp:!!(arp[id]||(ch&&arp[ch.getAttribute('xml:id')])),trem:!!up(nt,'bTrem')};
    if(!grace){const k=s+'|'+l;layCount[k]=(layCount[k]||0)+1;}});
  const restFerm={};$$('rest,mRest',mei).forEach(function(r){const id=r.getAttribute('xml:id');if(ferm[id]){const st=up(r,'staff');restFerm[id]=st?+st.getAttribute('n'):1;}});
  /* parties : chant (une par voix si plusieurs voix chantent sur la portée) ou instrument (une par portée) */
  const hasLy={};Object.keys(SC.notes).forEach(function(id){const N=SC.notes[id];if(Object.keys(N.ly).some(function(k){return N.ly[k];}))hasLy[N.staff]=1;});
  const meta=W.partMeta||{};
  SC.staves.forEach(function(S,si){const H=hint&&hint[si];
    const INSTR=/piano|organ|orgue|org\.|keyboard|clavier|cembalo|harpsi|clavecin|harp|harpe|guitar|guitare|violin|viol|cello|bass[eo]? continu|continuo|flute|flûte|oboe|hautbois|clarinet|trumpet|trompette|horn|cor |strings|cordes|accomp|pno|kbd/i;
    const vocal=H?H.kind==='voice':(!INSTR.test(S.label+' '+S.abbr)&&(hasLy[S.n]||VOCRX.test(S.label+' '+S.abbr)));S.kind=vocal?'voice':'piano';
    const lays=Object.keys(layCount).filter(function(k){return +k.split('|')[0]===S.n;}).map(function(k){return {l:+k.split('|')[1],c:layCount[k]};}).sort(function(a,b){return a.l-b.l;});
    const tot=lays.reduce(function(a,x){return a+x.c;},0);
    if(vocal){const big=lays.filter(function(x){return x.c>=tot*.2;});const nm=(S.label||'').split(/[\s,\/&+]+|-(?=\s)/).map(vtOf).filter(Boolean);
      if(big.length>1&&!H){big.forEach(function(x,k){const vt=nm.length===big.length?nm[k]:'';SC.parts.push({id:'s'+S.n+'l'+x.l,staff:S.n,layer:x.l,kind:'voice',vt:vt,name:vt?VTNAME[vt]:(S.label||'Voix')+' '+(k+1)});});
        S.split=true;}
      else SC.parts.push({id:H?H.pid:'s'+S.n,staff:S.n,layer:null,kind:'voice',vt:H?H.vt:vtOf(S.label),name:H?H.name:(S.label||'Voix'),short:S.abbr});}
    else{const hand=H&&H.hand?H.hand:(S.grpN===2?(S.grpIdx?'lh':'rh'):(S.clef==='F'?'lh':'rh'));
      const base=S.label||(hint&&hint[si]?'Piano':'Instrument');
      SC.parts.push({id:H?H.pid:'s'+S.n,staff:S.n,layer:null,kind:'piano',hand:hand,name:H?H.name:(S.grpN===2?base+(S.grpIdx?' MG':' MD'):base)});}});
  /* chœur générique : 4 voix sur 2 portées sans noms → S A T B */
  const VP=SC.parts.filter(function(P){return P.kind==='voice';});
  if(VP.length===4&&VP.every(function(P){return !P.vt;})){['S','A','T','B'].forEach(function(v,k){VP[k].vt=v;VP[k].name=VTNAME[v];});}
  SC.parts.forEach(function(P){const m=meta[P.id];if(m){if(m.name)P.name=m.name;if(m.kind)P.kind=m.kind;if(m.vt!=null)P.vt=m.vt;}});
  const partOf=function(N){for(let i=0;i<SC.parts.length;i++){const P=SC.parts[i];if(P.staff===N.staff&&(P.layer==null||P.layer===N.layer))return P;}
    return SC.parts.filter(function(P){return P.staff===N.staff;})[0];};
  Object.keys(SC.notes).forEach(function(id){const P=partOf(SC.notes[id]);SC.notes[id].pid=P?P.id:null;});
  /* ordre de lecture (reprises dépliées) et événements */
  let tempo=W.bpm||60,pi=-1;const onQ={},evByKey={},evOfId={};const base=function(x){return x.replace(/-rend\d+$/,'');};const pass=function(x){const m=/-rend(\d+)$/.exec(x);return m?+m[1]:1;};
  let maxQ=0;
  tm.forEach(function(E){if(E.tempo)tempo=E.tempo;
    if(E.measureOn){const mi=MI[base(E.measureOn)];SC.perf.push({mi:mi==null?0:mi,q0:E.qstamp,bpm:tempo,pass:pass(E.measureOn)});pi=SC.perf.length-1;}
    else if(E.tempo&&pi>=0&&SC.perf[pi].q0===E.qstamp)SC.perf[pi].bpm=tempo;
    maxQ=Math.max(maxQ,E.qstamp);
    (E.on||[]).forEach(function(x){onQ[x]=E.qstamp;});
    (E.restsOn||[]).forEach(function(x){onQ[x]=E.qstamp;});
    (E.off||[]).forEach(function(x){const b=base(x),N=SC.notes[b];if(!N||onQ[x]==null)return;const q=onQ[x],d=E.qstamp-q;
      if(N.tieFrom){const prev=evOfId[N.tieFrom+(x.indexOf('-rend')>0?x.slice(x.indexOf('-rend')):'')];if(prev&&Math.abs(prev.q+prev.d-q)<1e-3){prev.d=Math.max(prev.d,E.qstamp-prev.q);prev.tied=true;evOfId[x]=prev;if(N.ferm)prev.fermEnd=E.qstamp;return;}}
      const P=SC.parts.filter(function(p){return p.id===N.pid;})[0];if(!P)return;
      const pk=P.id+'|'+q.toFixed(4)+(N.grace?'g'+(N.chord||b):'');let ev=evByKey[pk];
      let opi=pi;while(opi>0&&SC.perf[opi].q0>q+1e-9)opi--;
      if(!ev){ev=evByKey[pk]={q:q,d:d,pi:opi,pid:P.id,kind:P.kind,mi:N.mi,midi:[],ids:[],grace:N.grace,ferm:false,arp:false,trem:false,ly:null,pass:pass(x)};SC.ev.push(ev);}
      ev.d=Math.max(ev.d,d);ev.ids.push(x);ev.base=ev.base||b;
      const mv=tk.getMIDIValuesForElement(b);if(mv&&mv.pitch!=null&&ev.midi.indexOf(mv.pitch)<0)ev.midi.push(mv.pitch);
      if(N.ferm){ev.ferm=true;ev.fermEnd=E.qstamp;}if(N.arp)ev.arp=true;if(N.trem)ev.trem=true;
      if(P.kind==='voice'&&!N.grace){const v=N.ly[ev.pass]!=null?N.ly[ev.pass]:N.ly[1];if(v)ev.ly=v;}
      evOfId[x]=ev;});
    (E.restsOff||[]).forEach(function(x){const b=base(x);if(restFerm[b]!=null&&onQ[x]!=null)SC.fermRests.push({q:E.qstamp,staff:restFerm[b]});});});
  SC.perf.forEach(function(p,k){const nx=SC.perf[k+1];p.len=(nx?nx.q0:maxQ)-p.q0;if(p.len<=0)p.len=SC.meas[p.mi]?SC.meas[p.mi].meter[0]*4/SC.meas[p.mi].meter[1]:4;});
  SC.meas.forEach(function(m){const p=SC.perf.filter(function(x){return x.mi===m.i;})[0];m.len=p?p.len:m.meter[0]*4/m.meter[1];m.q0=p?p.q0:0;m.bpm=p?p.bpm:tempo;});
  SC.ev.sort(function(a,b){return a.q-b.q||(a.grace?-1:0)-(b.grace?-1:0);});
  /* temps (en noires) de chaque événement dans sa mesure, pour les repères stables (respirations…) */
  SC.ev.forEach(function(e){const p=SC.perf[e.pi];e.t=p?Math.round((e.q-p.q0)*1e4)/1e4:0;e.midi.sort(function(a,b){return a-b;});});
  SC.end=maxQ;delete SC._chg;delete SC._prevRight;
  if(!SC.marks.length||SC.marks[0].mi!==0)SC.marks.unshift({mi:0,label:'',kind:'start'});
  return SC;}
/* histogramme des hauteurs par partie (pour la tessiture, sans recharger la pièce) */
function partHist(SC){const o={};SC.parts.forEach(function(P){if(P.kind!=='voice')return;const h={};let n=0;
    SC.ev.forEach(function(e){if(e.pid!==P.id||e.grace||e.pass>1||!e.midi.length)return;const m=e.midi[e.midi.length-1];h[m]=(h[m]||0)+Math.max(.25,e.d);n++;});
    o[P.id]={name:P.name,vt:P.vt||'',h:h,n:n};});return o;}
