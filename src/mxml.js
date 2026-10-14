/* ═══════════ 📥 IMPORT MUSICXML (.musicxml, .xml, .mxl) → format du partiteur ═══════════
   Chaque partie vocale est éclatée par (portée, voix) : un chœur SATB sur deux portées donne 4 pupitres.
   Les parties instrumentales gardent une ligne par portée (voix multiples séparées par //). */
'use strict';
/* — .mxl = zip : on lit le répertoire central et on décompresse avec DecompressionStream — */
async function mxlUnzip(buf){const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break;}
  if(e<0)throw new Error('fichier .mxl illisible');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};
  for(let k=0;k<n;k++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl));files[name]={meth:meth,csz:csz,off:off};p+=46+nl+xl+cl;}
  const read=async function(name){const f=files[name];if(!f)return null;const lnl=dv.getUint16(f.off+26,true),lxl=dv.getUint16(f.off+28,true),st=f.off+30+lnl+lxl;
    const data=u8.slice(st,st+f.csz);if(f.meth===0)return new TextDecoder().decode(data);
    const ds=new DecompressionStream('deflate-raw');const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();return new TextDecoder().decode(out);};
  let root=null;const cont=await read('META-INF/container.xml');
  if(cont){const m=/full-path="([^"]+)"/.exec(cont);if(m)root=m[1];}
  if(!root)root=Object.keys(files).filter(function(f){return /\.(xml|musicxml)$/i.test(f)&&f.indexOf('META-INF')<0;})[0];
  return read(root);}
async function mxmlFromFile(file){const buf=await file.arrayBuffer();const u=new Uint8Array(buf);
  if(u[0]===0x50&&u[1]===0x4b)return mxlUnzip(buf);return new TextDecoder().decode(buf);}

const MX_VAL=[['wdd',7],['wd',6],['w',4],['hdd',3.5],['hd',3],['h',2],['dd',1.75],['d',1.5],['',1],['edd',.875],['ed',.75],['e',.5],['sd',.375],['s',.25],['td',.1875],['t',.125]];
function mxSingle(q){for(let i=0;i<MX_VAL.length;i++)if(Math.abs(MX_VAL[i][1]-q)<1e-4)return MX_VAL[i][0];return null;}
/* durée en noires → suite de suffixes (liés si note, juxtaposés si silence) */
function mxSplit(q){const out=[];let r=q,g=0;while(r>1/64&&g++<16){let hit=null;for(let i=0;i<MX_VAL.length;i++)if(MX_VAL[i][1]<=r+1e-4&&!/dd/.test(MX_VAL[i][0])){hit=MX_VAL[i];break;}if(!hit)break;out.push(hit[0]);r-=hit[1];}return out;}
function mxDurTok(q,tm){/* tm = [actual,normal] du triolet éventuel */
  if(tm&&tm[0]!==tm[1]){const b=q*tm[0]/tm[1],s=mxSingle(b);if(s!=null)return [s+(tm[0]===3&&tm[1]===2?'3':'%'+tm[0]+':'+tm[1])];}
  const s=mxSingle(q);if(s!=null)return [s];
  const t=mxSingle(q*1.5);if(t!=null)return [t+'3'];
  return mxSplit(q);}
const MX_ALT={'-2':'bb','-1':'b','0':'','1':'#','2':'##'};
function mxTxt(el,sel){const x=el.querySelector(sel);return x?x.textContent.trim():'';}

function mxmlParse(xml,fname){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('XML invalide');
  if(doc.querySelector('score-timewise'))throw new Error('format « timewise » non pris en charge — réexporte en MusicXML standard');
  const sp=doc.querySelector('score-partwise');if(!sp)throw new Error('ce fichier n’est pas une partition MusicXML');
  const title=mxTxt(sp,'work > work-title')||mxTxt(sp,'movement-title')||(function(){const c=[].slice.call(sp.querySelectorAll('credit credit-words'));return c.length?c[0].textContent.trim():'';})()||(fname||'Sans titre').replace(/\.[^.]+$/,'');
  const composer=(function(){const c=sp.querySelector('identification creator[type="composer"]');return c?c.textContent.trim():'';})();
  const names={};[].slice.call(sp.querySelectorAll('part-list score-part')).forEach(function(s){names[s.getAttribute('id')]=mxTxt(s,'part-name')||mxTxt(s,'part-abbreviation')||mxTxt(s,'instrument-name')||'';});
  const parts=[].slice.call(sp.querySelectorAll(':scope > part'));if(!parts.length)throw new Error('aucune partie');
  const nM=Math.max.apply(null,parts.map(function(p){return p.querySelectorAll(':scope > measure').length;}));
  const MEAS=[];for(let i=0;i<nM;i++)MEAS.push({marks:[]});
  let ks0=null,mode='major';const OUT=[];/* {pid,name,staves,lyr,clefs,meas:[{key:{start,dur,...ev}}]} */
  parts.forEach(function(part,pi){const pid=part.getAttribute('id');let div=1,staves=1;const clefs={};let curMeter=null;
    const P={pid:pid,name:names[pid]||'',cnt:{},staves:1,lyr:false,clefs:clefs,meas:[]};
    [].slice.call(part.querySelectorAll(':scope > measure')).forEach(function(me,mi){const MM=MEAS[mi];let pos=0,maxEnd=0;const evs={};let last=null;
      [].slice.call(me.children).forEach(function(el){const tg=el.tagName;
        if(tg==='attributes'){const d=mxTxt(el,'divisions');if(d)div=+d;const st=mxTxt(el,'staves');if(st){staves=+st;P.staves=staves;}
          const f=el.querySelector('key fifths');if(f&&ks0==null){ks0=+f.textContent;const md=mxTxt(el,'key mode');if(md)mode=md;}
          const tm=el.querySelector('time');if(tm&&pi===0){const b=mxTxt(tm,'beats'),bt=mxTxt(tm,'beat-type');if(b&&bt){const mt=b.split('+').reduce(function(a,x){return a+ +x;},0)+'/'+bt;MM.meter=mt;}}
          [].slice.call(el.querySelectorAll('clef')).forEach(function(c){const n=c.getAttribute('number')||'1';if(clefs[n]==null)clefs[n]={sign:mxTxt(c,'sign'),oct:+(mxTxt(c,'clef-octave-change')||0)};});}
        else if(tg==='backup'){pos-=+mxTxt(el,'duration');}
        else if(tg==='forward'){pos+=+mxTxt(el,'duration');}
        else if(tg==='direction'&&pi===0){const w=[].slice.call(el.querySelectorAll('words')).map(function(x){return x.textContent.trim();}).filter(Boolean);
          const dy=el.querySelector('dynamics');if(dy&&dy.firstElementChild)w.push(dy.firstElementChild.tagName);
          w.forEach(function(x){if(MM.marks.indexOf(x)<0&&MM.marks.length<4)MM.marks.push(x);});
          const snd=el.querySelector('sound[tempo]');if(snd&&MM.bpm==null)MM.bpm=Math.round(+snd.getAttribute('tempo'));
          const pm=el.querySelector('metronome per-minute');if(pm&&MM.bpm==null){const bu=mxTxt(el,'metronome beat-unit');const f={half:2,quarter:1,eighth:.5}[bu]||1;MM.bpm=Math.round(+pm.textContent*f*(el.querySelector('metronome beat-unit-dot')?1.5:1));}}
        else if(tg==='sound'&&el.getAttribute('tempo')&&MM.bpm==null)MM.bpm=Math.round(+el.getAttribute('tempo'));
        else if(tg==='note'){const chord=!!el.querySelector(':scope > chord'),grace=!!el.querySelector(':scope > grace'),rest=!!el.querySelector(':scope > rest'),cue=!!el.querySelector(':scope > cue');
          if(cue)return;
          const dur=+(mxTxt(el,':scope > duration')||0);const staff=mxTxt(el,':scope > staff')||'1',voice=mxTxt(el,':scope > voice')||'1';const key=staff+'|'+voice;
          let nm=null;if(!rest){const pt=el.querySelector('pitch');if(!pt){const un=el.querySelector('unpitched');if(!un)return;nm=mxTxt(un,'display-step')+mxTxt(un,'display-octave');}
            else nm=mxTxt(pt,'step')+(MX_ALT[String(Math.round(+(mxTxt(pt,'alter')||0)))]||'')+mxTxt(pt,'octave');}
          const ties=[].slice.call(el.querySelectorAll(':scope > tie')).map(function(t){return t.getAttribute('type');});
          const N=el.querySelector('notations');const tm=el.querySelector('time-modification');
          const lyE=[].slice.call(el.querySelectorAll(':scope > lyric')).filter(function(l){return (l.getAttribute('number')||'1')==='1';})[0]||el.querySelector(':scope > lyric');
          let ly=null;if(lyE){const tx=[].slice.call(lyE.querySelectorAll('text')).map(function(t){return t.textContent;}).join('‿').trim().replace(/\s+/g,'‿');const sy=mxTxt(lyE,'syllabic');
            if(tx)ly=tx+((sy==='begin'||sy==='middle')?'-':'');if(lyE.querySelector('extend')&&!tx)ly=null;}
          if(ly)P.lyr=true;
          const fgE=el.querySelector('notations technical fingering');const fg=fgE?fgE.textContent.trim().replace(/[^\d]/g,'').slice(0,1):'';
          if(chord&&last&&evs[key]&&evs[key].length){const L=evs[key][evs[key].length-1];if(nm){L.notes.push(nm);L.fg.push(fg);}if(ties.indexOf('start')>=0)L.tie=true;if(ly&&!L.ly)L.ly=ly;return;}
          const ev={start:pos,q:grace?0:dur/div,grace:grace,rest:rest,notes:nm?[nm]:[],fg:nm?[fg]:[],tie:ties.indexOf('start')>=0,tieStop:ties.indexOf('stop')>=0,
            ferm:!!(N&&N.querySelector('fermata')),arp:!!(N&&N.querySelector('arpeggiate')),trem:!!(N&&N.querySelector('tremolo')),
            tm:tm?[+mxTxt(tm,'actual-notes'),+mxTxt(tm,'normal-notes')]:null,ly:ly,whole:rest&&el.querySelector('rest').getAttribute('measure')==='yes'};
          (evs[key]=evs[key]||[]).push(ev);last=ev;if(!rest&&!grace)P.cnt[key]=(P.cnt[key]||0)+1;if(!grace){pos+=dur;maxEnd=Math.max(maxEnd,pos);}}});
      P.meas[mi]={evs:evs,len:maxEnd/div};});
    OUT.push(P);});
  /* longueur de chaque mesure (levée, mesures incomplètes) */
  let meter='4/4';const mlen=MEAS.map(function(MM,i){if(MM.meter)meter=MM.meter;const a=meter.split('/'),L=+a[0]*4/+a[1];
    const real=Math.max.apply(null,OUT.map(function(P){return P.meas[i]?P.meas[i].len:0;}));return {L:L,real:real};});
  /* une voix (liste d'événements d'une clé) → jetons, avec silences pour les trous */
  const voiceStr=function(list,div,L,lyOn,tieIn){let t=0;const tok=[],sy=[];let tied=tieIn;
    (list||[]).forEach(function(e){const st=e.start/div;
      if(!e.grace&&st>t+1e-4){mxSplit(st-t).forEach(function(s){tok.push('r'+s);});t=st;}
      if(e.grace){if(e.notes.length)tok.push('g'+e.notes.join('+')+'e');return;}
      if(e.rest){if(e.whole){mxSplit(L-t).forEach(function(s){tok.push('r'+s);});t=L;}else{mxDurTok(e.q,e.tm).forEach(function(s){tok.push('r'+s+(e.ferm?'^':''));});t+=e.q;}tied=false;return;}
      const ds=mxDurTok(e.q,e.tm);const fl=(e.trem?'*':'')+(e.arp?'!':'')+(e.ferm?'^':'');
      ds.forEach(function(s,k){const lastPiece=k===ds.length-1;const head=e.notes.slice(0,-1).join('+');
        const fgs=e.fg.some(Boolean)&&k===0?'@'+e.fg.map(function(x){return x||'0';}).join(','):'';
        tok.push((head?head+'+':'')+e.notes[e.notes.length-1]+s+((!lastPiece||e.tie)?'~':'')+(lastPiece?fl:'')+(lastPiece?'':'')+(k===0?fgs:''));
        if(lyOn&&!(k===0&&tied)&&k===0)sy.push(e.ly||'_');});
      tied=e.tie;t+=e.q;});
    if(list&&list.length&&t<L-1e-4)mxSplit(L-t).forEach(function(s){tok.push('r'+s);});
    return {s:tok.join(' '),sy:sy,tied:tied};};
  /* répartition en pupitres / portées */
  const W={id:'imp-'+Date.now().toString(36),title:title,composer:composer,work:'',role:'',voice:'',ks:Math.max(-7,Math.min(7,ks0||0)),mode:mode,bpm:MEAS[0].bpm||72,parts:[],measures:[],imported:true,src:fname||''};
  const VT=[['sopr','S','Soprano'],['mezzo','Mz','Mezzo'],['alt','A','Alto'],['contr','A','Alto'],['ten','T','Ténor'],['bari','Bar','Baryton'],['bass','B','Basse'],['basse','B','Basse']];
  const vtOf=function(n){n=(n||'').toLowerCase();for(let i=0;i<VT.length;i++)if(n.indexOf(VT[i][0])>=0)return VT[i][1];const m=/^\s*([satb])\.?\s*$/i.exec(n);return m?m[1].toUpperCase():'';};
  const VOC=/sopr|alt|ten|bass|bari|mezzo|contr|voice|voix|chant|canto|choir|ch(œ|oe)ur|chorus|^\s*[satb]\.?\s*$/i;
  const SPEC={};/* id → {P,keys:[...]} */
  OUT.forEach(function(P,pi){const keys={};P.meas.forEach(function(m){if(m)Object.keys(m.evs).forEach(function(k){keys[k]=1;});});const K=Object.keys(keys).sort();
    const vocal=P.lyr||VOC.test(P.name);if(!P.name)P.name=vocal?'Voix':'Instrument';
    const pitchMed=function(st){const a=[];P.meas.forEach(function(m){if(m)Object.keys(m.evs).forEach(function(k){if(k.split('|')[0]===st)m.evs[k].forEach(function(e){e.notes.forEach(function(n){const q=/^([A-G])(bb|##|b|#)?(-?\d)$/.exec(n);if(q)a.push(12*(+q[3]+1)+[0,2,4,5,7,9,11]['CDEFGAB'.indexOf(q[1])]);});});});});a.sort(function(x,y){return x-y;});return a.length?a[a.length>>1]:60;};
    const clefOfStaff=function(st){const c=P.clefs[st]||{sign:'G',oct:0};if(c.sign==='F')return {clef:'F',oct:0};if(c.oct===-1)return {clef:'G',oct:-12};return {clef:'G',oct:0};};
    if(vocal){const tot=K.reduce(function(a,k){return a+(P.cnt[k]||0);},0);
      const nmL=P.name.split(/[\s,\/&+]+|-(?=\s)/).map(vtOf).filter(Boolean);
      /* voix secondaires minuscules sur une même portée : on les garde dans la ligne principale (//) */
      const groups=[];K.forEach(function(k){const st=k.split('|')[0];const big=(P.cnt[k]||0)>=tot*.25||nmL.length>1;const g=groups.filter(function(x){return x.st===st;})[0];if(big||!g)groups.push({st:st,keys:[k],main:big});else g.keys.push(k);});
      const G=groups.filter(function(g){return (P.cnt[g.keys[0]]||0)>0;}).length?groups.filter(function(g){return (P.cnt[g.keys[0]]||0)>0;}):groups;
      const nm=P.name.split(/[\s,\/&+]+|-(?=\s)/).map(vtOf).filter(Boolean);const gen=G.length===4?['Soprano','Alto','Ténor','Basse']:null;
      G.forEach(function(g,ki){const k=g.keys[0],st=g.st;const c=clefOfStaff(st);let name=P.name,vt=vtOf(P.name);
        if(G.length>1){if(nm.length===G.length){vt=nm[ki];name=VT.filter(function(x){return x[1]===vt;})[0][2];}else if(gen){name=gen[ki];vt=['S','A','T','B'][ki];}else name=P.name+' '+(ki+1);}
        const id='v'+pi+'_'+ki;W.parts.push({id:id,name:name,kind:'voice',clef:c.clef,oct:c.oct,vt:vt,lyKey:'ly_'+id});SPEC[id]={P:P,keys:g.keys,voice:true};});}
    else{const st=[];K.forEach(function(k){const s=k.split('|')[0];if(st.indexOf(s)<0)st.push(s);});st.sort();
      st.forEach(function(s,si){const c={clef:pitchMed(s)>=57?'G':'F'};const id='i'+pi+'_'+si;const base=P.name;
        W.parts.push({id:id,name:st.length>1?base+(si===0?' MD':' MG'):base,kind:'piano',clef:c.clef});SPEC[id]={P:P,keys:K.filter(function(k){return k.split('|')[0]===s;}),voice:false};});}});
  if(!W.parts.length)throw new Error('aucune note trouvée');
  /* division propre à chaque partie */
  const DIVS={};parts.forEach(function(part){let d=1;const pid=part.getAttribute('id');DIVS[pid]=[];[].slice.call(part.querySelectorAll(':scope > measure')).forEach(function(me,mi){const x=me.querySelector('attributes divisions');if(x)d=+x.textContent;DIVS[pid][mi]=d;});});
  const tieState={};
  MEAS.forEach(function(MM,i){const L=mlen[i].real>0?mlen[i].real:mlen[i].L;const m={};if(MM.meter)m.meter=MM.meter;if(MM.bpm)m.bpm=MM.bpm;if(MM.marks.length)m.marks=MM.marks;
    if(Math.abs(L-mlen[i].L)>1e-4)m.len=L;
    W.parts.forEach(function(Q){const S=SPEC[Q.id],PM=S.P.meas[i];const div=DIVS[S.P.pid][i]||1;
      if(!PM){m[Q.id]=mxSplit(L).map(function(s){return 'r'+s;}).join(' ');return;}
      const strs=S.keys.map(function(k){const r=voiceStr(PM.evs[k],div,L,S.voice,tieState[Q.id+k]);tieState[Q.id+k]=r.tied;return r;}).filter(function(r,j){return r.s||j===0;});
      m[Q.id]=strs.map(function(r){return r.s||mxSplit(L).map(function(s){return 'r'+s;}).join(' ');}).join(' // ');
      if(S.voice){const sy=strs[0]?strs[0].sy:[];m[Q.lyKey]=sy.join(' ');}});
    W.measures.push(m);});
  /* pupitre sans paroles : emprunter celles de sa voisine de portée quand le rythme est le même */
  W.parts.filter(function(Q){return Q.kind==='voice';}).forEach(function(Q){if(W.measures.some(function(m){return /[^_\s]/.test(m[Q.lyKey]||'');}))return;
    const sib=W.parts.filter(function(R){return R.kind==='voice'&&R!==Q&&SPEC[R.id].P===SPEC[Q.id].P&&SPEC[R.id].keys[0].split('|')[0]===SPEC[Q.id].keys[0].split('|')[0];})[0]||W.parts.filter(function(R){return R.kind==='voice'&&R!==Q&&W.measures.some(function(m){return /[^_\s]/.test(m[R.lyKey]||'');});})[0];
    if(!sib)return;W.measures.forEach(function(m){const a=(m[Q.lyKey]||'').split(/\s+/).filter(Boolean),b=(m[sib.lyKey]||'').split(/\s+/).filter(Boolean);if(a.length===b.length)m[Q.lyKey]=b.join(' ');});});
  W.voice=W.parts.filter(function(Q){return Q.kind==='voice';}).map(function(Q){return Q.name;}).join(', ')||'instrumental';
  return W;}
