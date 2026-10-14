/* ═══════════ 🎼 LE PARTITEUR — bibliothèque de partitions chantées (airs, chœurs SATB) ═══════════
   Données : WORKS[] — {id,title,composer,work,role,voice,ks,src,parts:[{id,name,kind:'voice'|'piano',clef,oct,lyrics}],measures:[{meter,tempo,bpm,marks,<partId>:"jetons",ly,doubt}]}
   Jetons (voir GUIDE.md) : C4 Bb3 F#5 · durées w h (noire) e s t · d dd · 3 (triolet) · ~ liaison · g petite note · * trémolo · ! arpège · ^ point d'orgue · r silence · + accord · // voix */
'use strict';
const $=function(s,r){return (r||document).querySelector(s);};
const LS={get:function(k,d){try{const v=localStorage.getItem('partiteur_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set:function(k,v){try{localStorage.setItem('partiteur_'+k,JSON.stringify(v));}catch(e){}}};
/* ── analyse des jetons ── */
const DUR={w:4,h:2,'':1,e:.5,s:.25,t:.125};
const STEP={C:0,D:1,E:2,F:3,G:4,A:5,B:6},SEMI=[0,2,4,5,7,9,11];
function parseNote(n){const m=/^([A-G])(bb|##|b|#)?(-?\d)$/.exec(n);if(!m)return null;const acc={'':0,'#':1,'##':2,b:-1,bb:-2}[m[2]||''];const oct=+m[3];
  return {L:m[1],acc:acc,oct:oct,midi:12*(oct+1)+SEMI[STEP[m[1]]]+acc,step:oct*7+STEP[m[1]]};}
function parseTok(tok){const g=tok.charAt(0)==='g'&&/^g[A-G]/.test(tok);if(g)tok=tok.slice(1);
  const parts=tok.split('+'),last=parts[parts.length-1];const m=/^(r|[A-G](?:bb|##|b|#)?-?\d)([whest]?)(dd|d)?(3|%\d+:\d+)?([~*!^]*)(@[\d,]+)?$/.exec(last);if(!m)return null;
  let d=DUR[m[2]];if(m[3]==='d')d*=1.5;if(m[3]==='dd')d*=1.75;if(m[4]==='3')d*=2/3;else if(m[4]){const q=m[4].slice(1).split(':');d*=+q[1]/+q[0];}const fl=m[5]||'';
  const rest=m[1]==='r';const notes=rest?[]:parts.map(function(p,i){return parseNote(i===parts.length-1?m[1]:p.replace(/[whest]?(dd|d)?(3|%\d+:\d+)?[~*!^]*(@[\d,]+)?$/,''));}).filter(Boolean);
  return {rest:rest,notes:notes,d:g?0:d,grace:g,tie:fl.indexOf('~')>=0,trem:fl.indexOf('*')>=0,arp:fl.indexOf('!')>=0,ferm:fl.indexOf('^')>=0,base:m[2]||'q',dot:m[3]||'',tri:m[4]==='3',tup:m[4]&&m[4]!=='3'?m[4].slice(1).split(':')[0]:'',fg:m[6]?m[6].slice(1):''};}
function parseVoice(str){let t=0;return str.trim().split(/\s+/).filter(Boolean).map(function(x){const e=parseTok(x);if(!e)return null;e.t=t;t+=e.d;return e;}).filter(Boolean);}
function meterLen(m){const a=m.split('/');return +a[0]*4/+a[1];}
/* ── la pièce : temps absolus, paroles, tempo ── */
function build(W){let meter='4/4',t=0,bpm=W.bpm||60,tf=1;const M=[];
  W.measures.forEach(function(m,i){const chg=!!m.meter&&(m.meter!==meter||i===0);if(m.meter)meter=m.meter;const L=m.len||meterLen(meter);
    const mm={i:i,n:i+1,meter:meter,meterShow:chg,t0:t,len:L,marks:m.marks||[],tempo:m.tempo||null,doubt:m.doubt||'',parts:{}};
    if(m.bpm)bpm=m.bpm;const T=(m.tempo||'')+' '+(m.marks||[]).join(' ');
    if(/Più lento/i.test(T))tf=.9;if(/a tempo|I\. ?Tempo|stesso movimento/i.test(T))tf=1;
    mm.bpm=bpm*tf;mm.rall=/rall|allarg|rit\./i.test(T);
    W.parts.forEach(function(P){const s=m[P.id]||'';mm.parts[P.id]=s.split('//').map(function(v){return parseVoice(v);});});
    /* paroles : une syllabe par note chantée (pas de petite note, pas de note liée depuis la précédente) */
    const vp=W.parts.filter(function(P){return P.kind==='voice';});
    vp.forEach(function(P){const sy=(m[P.lyKey||'ly']||'').trim().split(/\s+/).filter(Boolean);let k=0;const V=mm.parts[P.id][0]||[];
      V.forEach(function(e,j){if(e.rest||e.grace)return;const prev=j>0?V[j-1]:(M.length?lastOf(M[M.length-1].parts[P.id][0]):null);if(prev&&prev.tie&&!prev.rest)return;e.ly=sy[k++]||'';});});
    M.push(mm);t+=L;});
  return M;}
function lastOf(a){return a&&a.length?a[a.length-1]:null;}
/* ── transposition et orthographe ── */
const KEYS_MAJ={'-7':'Cb','-6':'Gb','-5':'Db','-4':'Ab','-3':'Eb','-2':'Bb','-1':'F','0':'C','1':'G','2':'D','3':'A','4':'E','5':'B','6':'F#','7':'C#'};
function ksAfter(ks,tr){const pc=(([0,7,2,9,4,11,6,1,8,3,10,5][(ks%12+12)%12])+tr+120)%12;const FS={0:0,7:1,2:2,9:3,4:4,11:5,6:-6,5:-1,10:-2,3:-3,8:-4,1:-5};return FS[pc];}
const SH=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],FL=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function spell(midi,ks){const n=(ks<0?FL:SH)[(midi%12+12)%12],oct=Math.floor(midi/12)-1;const L=n.charAt(0),acc=n.length>1?(n.charAt(1)==='#'?1:-1):0;
  let o=oct;return {L:L,acc:acc,oct:o,midi:midi,step:o*7+STEP[L]};}
function ksMap(ks){const o={};const S='FCGDAEB',F='BEADGCF';if(ks>0)for(let i=0;i<ks;i++)o[S[i]]=1;if(ks<0)for(let i=0;i<-ks;i++)o[F[i]]=-1;return o;}
/* ── état ── */
const ST={W:null,M:null,tr:LS.get('tr',0),tempo:LS.get('tempo',100),mix:LS.get('mix',{}),sing:LS.get('sing',null),wait:LS.get('wait',true),loop:null,playing:false,cur:-1};
/* ── dessin de la partition (SVG maison) ── */
const SP=9; /* interligne */
function clefFor(P,notesMidi){if(P.kind==='voice'){return P.clef||'G';}if(P.id==='lh'||P.clef==='F'){return 'F';}return P.clef||'G';}
function drawScore(){const W=ST.W,M=ST.M,box=$('#score');const real=Math.max(300,box.clientWidth-8),width=Math.max(540,real);ST.scale=real/width;const ks=ksAfter(W.ks||0,ST.tr);const KM=ksMap(ks);
  const parts=W.parts.filter(function(P){return !(ST.mix[P.id]&&ST.mix[P.id].hide);});
  /* largeur des mesures : selon le nombre d'attaques */
  const mw=M.map(function(m){let n=0;parts.forEach(function(P){m.parts[P.id].forEach(function(v){n=Math.max(n,v.filter(function(e){return !e.grace;}).length);});});return Math.max(90,n*26+30);});
  const head=SP*7+Math.abs(ks)*SP*.9;const sys=[];let row=[],w=head;
  M.forEach(function(m,i){if(row.length&&w+mw[i]>width){sys.push(row);row=[];w=head;}row.push(i);w+=mw[i];});if(row.length)sys.push(row);
  let svg='',y=10;const staffH=SP*4,gap=SP*7.5,lyH=SP*3;ST.geo=[];
  sys.forEach(function(r){const used=r.reduce(function(a,i){return a+mw[i];},0),scale=(width-head)/used;const sysTop=y;
    /* hauteur de chaque portée selon l'ambitus de la ligne */
    const rows=parts.map(function(P){let hi=0,lo=0;r.forEach(function(i){M[i].parts[P.id].forEach(function(v){v.forEach(function(e){e.notes.forEach(function(n){const sp=spellTr(n,P,ks);const s=sp.step-(clefOf(P,M[i],ks)==='F'?18:30);hi=Math.max(hi,s);lo=Math.min(lo,s);});});});});
      return {P:P,top:Math.max(SP*2.6,(hi-8)*SP/2+SP*2.4),bot:Math.max(SP*2.2,-lo*SP/2+SP*1.6)+(P.kind==='voice'?lyH:0)};});
    const top={};rows.forEach(function(R){y+=R.top;top[R.P.id]=y;y+=staffH+R.bot;});const sysBot=y;
    /* portées, clés, armures, noms */
    rows.forEach(function(R){const t=top[R.P.id];for(let k=0;k<5;k++)svg+='<line x1="4" x2="'+width+'" y1="'+(t+k*SP)+'" y2="'+(t+k*SP)+'" class="sl"/>';});
    svg+='<line x1="4" x2="4" y1="'+top[rows[0].P.id]+'" y2="'+(top[rows[rows.length-1].P.id]+staffH)+'" class="bl"/>';
    const pianoRows=rows.filter(function(R){return R.P.kind==='piano';});if(pianoRows.length>1)svg+='<path d="M2,'+top[pianoRows[0].P.id]+' q-8,'+((top[pianoRows[1].P.id]+staffH-top[pianoRows[0].P.id])/2)+' 0,'+(top[pianoRows[1].P.id]+staffH-top[pianoRows[0].P.id])+'" class="brace"/>';
    rows.forEach(function(R){const t=top[R.P.id],cl=clefOf(R.P,M[r[0]],ks);svg+=clefSVG(cl,10,t,R.P.kind==='voice'&&R.P.oct===-12&&cl===(R.P.clef||'G'));
      ksSVG(KM,ks,cl,SP*3.6,t).forEach(function(s){svg+=s;});
      svg+='<text x="'+(width-4)+'" y="'+(t-SP*.8)+'" text-anchor="end" class="pn">'+(r[0]===0||true?R.P.short||R.P.name:'')+'</text>';});
    let x=head;
    r.forEach(function(i){const m=M[i],w=mw[i]*scale;ST.geo[i]={x0:x,x1:x+w,y0:sysTop,y1:sysBot,top:top};
      svg+='<rect class="mzone" data-m="'+i+'" x="'+x+'" y="'+sysTop+'" width="'+w+'" height="'+(sysBot-sysTop)+'"/>';
      if(m.meterShow)rows.forEach(function(R){const t=top[R.P.id],a=m.meter.split('/');svg+='<text x="'+(x+8)+'" y="'+(t+SP*1.9)+'" class="ts">'+a[0]+'</text><text x="'+(x+8)+'" y="'+(t+SP*3.9)+'" class="ts">'+a[1]+'</text>';});
      const xs=x+(m.meterShow?SP*2.6:SP*1.2),xe=x+w-SP*.8;
      /* textes de tempo / nuances au-dessus de la première portée */
      const tx=[m.tempo].concat(m.marks).filter(Boolean);if(tx.length)svg+='<text x="'+(x+4)+'" y="'+(top[rows[0].P.id]-rows[0].top+SP*1.4)+'" class="mk" dx="14">'+tx.join(' · ')+'</text>';
      if(typeof pnChordSVG==='function')svg+=pnChordSVG(m,i,xs,xe,top,rows,ks);
      if(m.doubt)svg+='<text x="'+(x+w-6)+'" y="'+(sysTop+12)+'" text-anchor="end" class="dq" data-doubt="'+i+'">?</text>';
      rows.forEach(function(R){const P=R.P,t=top[P.id],cl=clefOf(P,m,ks),B=cl==='F'?18:30;const accState={};
        m.parts[P.id].forEach(function(V,vi){const multi=m.parts[P.id].length>1;
          V.forEach(function(e){if(e.grace)return;const ex=xs+(e.t/m.len)*(xe-xs),ey0=t+SP*4;
            e._x=ex;e._P=P.id;
            if(e.rest){if(V.length===1&&Math.abs(e.d-m.len)<1e-6){svg+=restSVG({base:'w',dot:''},(xs+xe)/2,t+SP*2);return;}svg+=restSVG(e,ex,t+(multi?(vi?SP*3:SP):SP*2));return;}
            const N=e.notes.map(function(n){const sp=spellTr(n,P,ks);return {sp:sp,s:sp.step-B,out:isOut(P,n.midi)};}).sort(function(a,b){return a.s-b.s;});
            const up=multi?vi===0:((N[0].s+N[N.length-1].s)/2<4);
            /* lignes supplémentaires */
            N.forEach(function(q){if(q.s<=-2)for(let k=-2;k>=q.s;k-=2)svg+='<line x1="'+(ex-SP*.9)+'" x2="'+(ex+SP*.9)+'" y1="'+(ey0-k*SP/2)+'" y2="'+(ey0-k*SP/2)+'" class="sl"/>';
              if(q.s>=10)for(let k=10;k<=q.s;k+=2)svg+='<line x1="'+(ex-SP*.9)+'" x2="'+(ex+SP*.9)+'" y1="'+(ey0-k*SP/2)+'" y2="'+(ey0-k*SP/2)+'" class="sl"/>';});
            let prev=null,sh=false;N.forEach(function(q){sh=(prev!=null&&q.s-prev===1)?!sh:false;q.dx=sh?(up?SP*1.1:-SP*1.1):0;prev=q.s;});
            const hol=e.d*(e.tri?1.5:1)>=2-1e-6||e.base==='h'||e.base==='w';
            N.forEach(function(q){const cy=ey0-q.s*SP/2,hx=ex+q.dx;const key=q.sp.L+q.sp.oct,want=q.sp.acc,have=accState[key]!=null?accState[key]:(KM[q.sp.L]||0);
              if(want!==have){svg+='<text x="'+(hx-SP*1.6)+'" y="'+(cy+SP*.45)+'" class="acc">'+(want===1?'♯':(want===-1?'♭':(want===2?'𝄪':(want===-2?'𝄫':'♮'))))+'</text>';accState[key]=want;}
              svg+='<ellipse cx="'+hx+'" cy="'+cy+'" rx="'+(SP*.62)+'" ry="'+(SP*.45)+'" transform="rotate(-20 '+hx+' '+cy+')" class="nh'+(hol?' hol':'')+(q.out?' out':'')+(typeof pnHandCls==='function'?pnHandCls(P):'')+(typeof pjCls==='function'?pjCls(e,P):'')+'" data-ev="1"/>'+(typeof pnNameSVG==='function'?pnNameSVG(q.sp,hx,cy,hol):'');
              if(e.dot)svg+='<circle cx="'+(ex+SP*1.15)+'" cy="'+(cy-(q.s%2===0?SP*.25:0))+'" r="1.6" class="dot"/>'+(e.dot==='dd'?'<circle cx="'+(ex+SP*1.6)+'" cy="'+(cy-(q.s%2===0?SP*.25:0))+'" r="1.6" class="dot"/>':'');});
            if(e.base!=='w'){const lo=N[0],hi=N[N.length-1],sx=up?ex+SP*.58:ex-SP*.58,y1=up?ey0-lo.s*SP/2:ey0-hi.s*SP/2,y2=up?ey0-hi.s*SP/2-SP*3.2:ey0-lo.s*SP/2+SP*3.2;
              svg+='<line x1="'+sx+'" x2="'+sx+'" y1="'+y1+'" y2="'+y2+'" class="stem"/>';
              const fl={e:1,s:2,t:3}[e.base]||0;for(let k=0;k<fl;k++){const fy=y2+(up?k*SP*.75:-k*SP*.75);svg+='<path d="M'+sx+','+fy+' q'+(SP*.8)+','+(up?SP*.7:-SP*.7)+' '+(SP*.45)+','+(up?SP*1.8:-SP*1.8)+'" class="flag"/>';}
              if(e.trem)for(let k=0;k<3;k++){const ty=(y1+y2)/2+(k-1)*SP*.55;svg+='<line x1="'+(sx-SP*.6)+'" x2="'+(sx+SP*.6)+'" y1="'+(ty+SP*.25)+'" y2="'+(ty-SP*.25)+'" class="trem"/>';}
              if(e.tri||e.tup)svg+='<text x="'+ex+'" y="'+(up?y2-3:y2+11)+'" class="tri">'+(e.tup||3)+'</text>';}
            if(e.fg&&typeof pnFingSVG==='function')svg+=pnFingSVG(e,P,ex,ey0,N,up);
            if(e.arp)svg+='<path d="M'+(ex-SP*1.4)+','+(ey0-N[N.length-1].s*SP/2-SP*.6)+' l0,'+((N[N.length-1].s-N[0].s)*SP/2+SP*1.2)+'" class="arp"/>';
            if(e.ferm)svg+='<text x="'+ex+'" y="'+(t-SP*.6)+'" class="ferm">𝄐</text>';
            if(e.tie)svg+='<path d="M'+(ex+SP*.8)+','+(ey0-N[0].s*SP/2+(up?SP*.9:-SP*.9))+' q'+(SP*1.6)+','+(up?SP*1.1:-SP*1.1)+' '+(SP*3.2)+',0" class="tie"/>';
            if(e.ly!=null&&e.ly!=='')svg+='<text x="'+ex+'" y="'+(t+staffH+SP*2.8+Math.max(0,(-N[0].s-2))*SP/2)+'" class="ly" data-ly="1">'+esc(e.ly.replace(/‿/g,' ').replace(/_$/,''))+'</text>';
          });
          /* petites notes : juste avant la note suivante */
          V.forEach(function(e,j){if(!e.grace)return;const nx=V.slice(j+1).filter(function(z){return !z.grace;})[0];const ex=(nx?xs+(nx.t/m.len)*(xe-xs):xs)-SP*1.6;
            e.notes.forEach(function(n){const sp=spellTr(n,P,ks),s=sp.step-B,cy=t+SP*4-s*SP/2;svg+='<ellipse cx="'+ex+'" cy="'+cy+'" rx="'+(SP*.42)+'" ry="'+(SP*.3)+'" transform="rotate(-20 '+ex+' '+cy+')" class="nh gr"/><line x1="'+(ex+SP*.38)+'" x2="'+(ex+SP*.38)+'" y1="'+cy+'" y2="'+(cy-SP*2.2)+'" class="stem gr"/>';});});
        });});
      rows.forEach(function(R){const t=top[R.P.id];svg+='<line x1="'+(x+w)+'" x2="'+(x+w)+'" y1="'+t+'" y2="'+(t+staffH)+'" class="bl"/>';});
      svg+='<text x="'+(x+3)+'" y="'+(sysTop+10)+'" class="mn">'+m.n+'</text>';
      x+=w;});
    y+=gap;});
  box.innerHTML='<svg viewBox="0 0 '+width+' '+y+'" width="'+(width*ST.scale)+'" height="'+(y*ST.scale)+'" id="sv">'+svg+'<rect id="ph" x="-20" y="0" width="3" height="0" rx="1.5"/></svg>';
  box.querySelectorAll('[data-doubt]').forEach(function(q){q.addEventListener('click',function(ev){ev.stopPropagation();const m=ST.M[+q.dataset.doubt];toast('Mesure '+m.n+' — à vérifier : '+m.doubt);});});
  box.querySelectorAll('.mzone').forEach(function(z){z.addEventListener('click',function(){const i=+z.dataset.m;if(ST.loopSel!=null){const a=Math.min(ST.loopSel,i),b=Math.max(ST.loopSel,i);ST.loop=[a,b];ST.loopSel=null;toast('🔁 Boucle mesures '+(a+1)+' → '+(b+1));markLoop();return;}seek(i);});});
  markLoop();}
function clefOf(P,m,ks){if(P.kind==='voice')return ST.voiceClef&&ST.voiceClef[P.id]||P.clef||'G';return P.clef||(P.id==='lh'?'F':'G');}
/* hauteur écrite affichée : transposition + octave du chant si on passe en clé de fa */
function spellTr(n,P,ks){let midi=n.midi+ST.tr;if(P.kind==='voice'&&clefOf(P,null,ks)!==(P.clef||'G'))midi+=(P.oct||0);return spell(midi,ks);}
function clefSVG(cl,x,t,oct8){if(cl==='F')return '<text x="'+x+'" y="'+(t+SP*3.1)+'" class="clef f">𝄢</text>';return '<text x="'+x+'" y="'+(t+SP*4.1)+'" class="clef">𝄞</text>'+(oct8?'<text x="'+(x+SP*1.1)+'" y="'+(t+SP*6.4)+'" class="o8">8</text>':'');}
function ksSVG(KM,ks,cl,x,t){const out=[];const ST_={'♯':{F:8,C:5,G:9,D:6,A:3,E:7,B:4},'♭':{B:4,E:7,A:3,D:6,G:2,C:5,F:1}};const sym=ks>0?'♯':'♭',ord=(ks>0?'FCGDAEB':'BEADGCF').slice(0,Math.abs(ks));
  for(let k=0;k<ord.length;k++){const st=ST_[sym][ord[k]]-(cl==='F'?2:0);out.push('<text x="'+(x+k*SP*.9)+'" y="'+(t+SP*4-st*SP/2+SP*.45)+'" class="acc">'+sym+'</text>');}return out;}
function restSVG(e,x,y){const b=e.base;const g={w:'𝄻',h:'𝄼',q:'𝄽',e:'𝄾',s:'𝄿',t:'𝅀'}[b]||'𝄽';
  if(b==='w'||b==='h')return '<rect x="'+(x-SP*.6)+'" y="'+(b==='w'?y-SP+1:y-SP*.5)+'" width="'+(SP*1.2)+'" height="'+(SP*.5)+'" class="rest"/>'+(e.dot?'<circle cx="'+(x+SP*1)+'" cy="'+(y-SP*.5)+'" r="1.6" class="dot"/>':'')+(e.ferm?'<text x="'+x+'" y="'+(y-SP*2.6)+'" class="ferm">𝄐</text>':'');
  return '<text x="'+x+'" y="'+(y+SP*.6)+'" class="restg">'+g+'</text>'+(e.dot?'<circle cx="'+(x+SP*1)+'" cy="'+(y-SP*.3)+'" r="1.6" class="dot"/>':'');}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove('on');},4200);}
function markLoop(){document.querySelectorAll('.mzone').forEach(function(z){const i=+z.dataset.m;z.classList.toggle('inloop',!!(ST.loop&&i>=ST.loop[0]&&i<=ST.loop[1]));});$('#bLoop').classList.toggle('on',!!ST.loop);}
/* ── son : piano (corde frappée) et voix (« a » chanté, formants + vibrato) ── */
let AC=null,MASTER=null;
function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();MASTER=AC.createGain();MASTER.gain.value=.8;const comp=AC.createDynamicsCompressor();MASTER.connect(comp);comp.connect(AC.destination);}if(AC.state==='suspended'&&!AC.startRendering)AC.resume();return AC;}
function hz(m){return 440*Math.pow(2,(m-69)/12);}
function pianoNote(m,t,dur,vol){const A=ac(),f=hz(m);const g=A.createGain();g.connect(MASTER);const v=(vol||.5)*(m>84?.6:1)*.22;
  [[1,1],[2,.35],[3,.12],[4,.06]].forEach(function(h){const o=A.createOscillator();o.type=h[0]===1?'triangle':'sine';o.frequency.value=f*h[0]*(1+(h[0]-1)*.0007);const gg=A.createGain();gg.gain.value=h[1];o.connect(gg);gg.connect(g);o.start(t);o.stop(t+dur+1.6);});
  const dec=Math.max(.6,3.2-(m-48)*.035);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(v*.45,t+.25);g.gain.exponentialRampToValueAtTime(v*.18,t+Math.min(dur+.05,dec));g.gain.exponentialRampToValueAtTime(.0001,t+dur+.45);}
function voiceNote(m,t,dur,vol,leg){const A=ac(),f=hz(m);const o=A.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f,t);
  const vib=A.createOscillator(),vg=A.createGain();vib.frequency.value=5.4;vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(f*.012,t+Math.min(.5,dur*.6));vib.connect(vg);vg.connect(o.frequency);
  const out=A.createGain();out.connect(MASTER);[[730,1,9],[1090,.55,10],[2440,.25,12]].forEach(function(F){const bp=A.createBiquadFilter();bp.type='bandpass';bp.frequency.value=F[0];bp.Q.value=F[2];const gg=A.createGain();gg.gain.value=F[1];o.connect(bp);bp.connect(gg);gg.connect(out);});
  const v=(vol||.5)*.55;out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(v,t+(leg?.03:.07));out.gain.setValueAtTime(v,t+Math.max(.08,dur-.06));out.gain.exponentialRampToValueAtTime(.0001,t+dur+.08);
  o.start(t);vib.start(t);o.stop(t+dur+.15);vib.stop(t+dur+.15);}
/* ── lecture ── */
let PLAY=null;
function partVol(P){const x=ST.mix[P.id]||{};if(x.mute)return 0;const solo=ST.W.parts.some(function(Q){return (ST.mix[Q.id]||{}).solo;});if(solo&&!x.solo)return 0;if(ST.sing===P.id&&!x.guide)return 0;return x.vol==null?1:x.vol;}
function evList(from,to){const out=[];const M=ST.M;
  for(let i=from;i<=to;i++){const m=M[i];ST.W.parts.forEach(function(P){m.parts[P.id].forEach(function(V){V.forEach(function(e,j){if(e.rest)return;
      const prev=j>0?V[j-1]:(i>from?lastOf(M[i-1].parts[P.id][0]):null);if(prev&&prev.tie&&!prev.rest&&!e.grace&&prev.notes.length&&e.notes.length&&prev.notes[0].midi===e.notes[0].midi)return;
      let d=e.d;let k=j;while(V[k]&&V[k].tie&&V[k+1]){d+=V[k+1].d;k++;}if(V[k]&&V[k].tie&&!V[k+1]&&M[i+1]){const nv=M[i+1].parts[P.id][0]||[];if(nv[0])d+=nv[0].d;}
      out.push({m:i,beat:m.t0+e.t-(e.grace?.12:0),d:e.grace?.12:d,P:P,e:e});});});});}
  return out;}
function play(){if(PLAY){stop();return;}const A=ac();const M=ST.M;const from=ST.loop?ST.loop[0]:Math.max(0,ST.cur<0?0:ST.cur),to=ST.loop?ST.loop[1]:M.length-1;
  const EV=evList(from,to).sort(function(a,b){return a.beat-b.beat;});
  PLAY={EV:EV,k:0,from:from,to:to,t0:A.currentTime+.25,b0:M[from].t0,pauseAt:null,id:null};$('#bPlay').textContent='⏸';ST.playing=true;
  const spb=function(i){const m=M[i];return 60/(m.bpm*ST.tempo/100);};
  /* horloge musicale : temps → battement (accélère/ralentit par mesure, rall. = ralenti progressif) */
  const clock=PLAY.clock={t:PLAY.t0,b:PLAY.b0,mi:from};PLAY.btt=null;
  const beatToTime=function(b){while(clock.mi<=to){const m=M[clock.mi],end=m.t0+m.len;const s=spb(clock.mi);
      if(b<=end+1e-9){const rel=b-clock.b,ral=m.rall?(1+.35*((clock.b-m.t0)+rel/2)/m.len):1;return clock.t+rel*s*ral;}
      const rel=end-clock.b,ral=m.rall?(1+.35*((clock.b-m.t0)+rel/2)/m.len):1;clock.t+=rel*s*ral;clock.b=end;clock.mi++;}return clock.t;};
  const tick=function(){if(!PLAY)return;const now=A.currentTime;
    PLAY.btt=beatToTime;if(PLAY.waiting)return;
    if(PLAY.hold==null&&typeof pnGate==='function'){const hb=pnGate();if(hb!=null){PLAY.hold=hb;PLAY.holdMaster=true;}}
    while(PLAY.k<EV.length){const ev=EV[PLAY.k];if(PLAY.hold!=null&&ev.beat>=PLAY.hold-1e-6){const ht=beatToTime(PLAY.hold);if(now>=ht){PLAY.waiting=true;PLAY.holdT=ht;if(!PLAY.holdMaster)$('#wait').classList.add('on');else if(typeof pnWaiting==='function')pnWaiting();}break;}const t=beatToTime(ev.beat);if(t>now+.25)break;PLAY.k++;
      const vol=partVol(ev.P);const tEnd=beatToTime(ev.beat+ev.d);const dur=Math.max(.08,tEnd-t);
      
      if(vol>0)ev.e.notes.forEach(function(n,ni){let midi=n.midi+ST.tr;if(ev.P.kind==='voice'&&ev.P.oct)midi+=ev.P.oct;
        const tt=Math.max(t,now)+(ev.e.arp?ni*.035:0);
        if(ev.e.trem&&ev.P.kind==='piano'){const step=.09;for(let x=0;x<dur-.02;x+=step)pianoNote(midi,tt+x,step*1.2,vol*.55);}
        else if(ev.P.kind==='voice')voiceNote(midi,tt,dur,vol,true);else pianoNote(midi,tt,dur,vol*(ev.e.grace?.6:1));});
      /* point d'orgue : on attend que tu touches l'écran */
      if(ev.e.ferm&&ST.wait&&ev.m<=to&&!ev.e.grace&&!PLAY.holdMaster){const hb=ev.beat+ev.d;if(PLAY.hold==null||hb>PLAY.hold)PLAY.hold=hb;}
      scheduleUI(ev,t);}
    if(PLAY.k>=EV.length&&now>beatToTime(M[to].t0+M[to].len)){if(ST.loop){stop(true);if(typeof onLoopEnd==='function')onLoopEnd();play();}else{stop();if(typeof onPieceEnd==='function')onPieceEnd();}}};
  PLAY.id=setInterval(tick,40);tick();uiLoop();}
function resume(){if(!PLAY||!PLAY.waiting)return;const d=AC.currentTime-PLAY.holdT;PLAY.clock.t+=d;PLAY.hold=null;PLAY.holdMaster=false;PLAY.waiting=false;$('#wait').classList.remove('on');}
function stop(keep){$('#wait').classList.remove('on');if(!PLAY)return;clearInterval(PLAY.id);PLAY=null;ST.playing=false;$('#bPlay').textContent='▶';try{MASTER.gain.setTargetAtTime(0,AC.currentTime,.03);setTimeout(function(){MASTER.gain.setTargetAtTime(.8,AC.currentTime,.01);},250);}catch(e){}}
const UIQ=[];function scheduleUI(ev,t){UIQ.push({t:t,ev:ev});}
function uiLoop(){if(!PLAY&&!UIQ.length)return;const now=AC.currentTime;while(UIQ.length&&UIQ[0].t<=now){const u=UIQ.shift();show(u.ev);}if(PLAY||UIQ.length)requestAnimationFrame(uiLoop);}
function show(ev){const i=ev.m;if(i!==ST.cur){ST.cur=i;const g=ST.geo[i];const ph=$('#ph');if(g&&ph){ph.setAttribute('y',g.y0);ph.setAttribute('height',g.y1-g.y0);}
    if(g&&$('#follow').classList.contains('on')){const box=$('#scorew');const sc=ST.scale||1,top=g.y0*sc-40;if(top<box.scrollTop||g.y1*sc>box.scrollTop+box.clientHeight)box.scrollTo({top:top,behavior:'smooth'});}$('#mnum').textContent='mesure '+(i+1)+' / '+ST.M.length;}
  const ph=$('#ph');if(ph&&ev.e._x!=null)ph.setAttribute('x',ev.e._x-1.5);
  if(ev.e.ly&&lyPart()&&ev.P.id===lyPart().id){$('#lyr').innerHTML=lyLine(i,ev.e);}}
function lyLine(i,cur){/* la phrase en cours, la syllabe chantée en or */const M=ST.M,P=lyPart();if(!P)return '';let out=[];
  for(let k=Math.max(0,i-1);k<=Math.min(M.length-1,i+2);k++)(M[k].parts[P.id][0]||[]).forEach(function(e){if(e.ly)out.push(e===cur?'<b>'+esc(e.ly.replace(/‿/g,' '))+'</b>':esc(e.ly.replace(/‿/g,' ')));});
  return out.join(' ').replace(/- /g,'').replace(/_/g,'');}
function seek(i){ST.cur=i;const g=ST.geo[i];const ph=$('#ph');if(g&&ph){ph.setAttribute('x',g.x0+4);ph.setAttribute('y',g.y0);ph.setAttribute('height',g.y1-g.y0);}if(g){const box=$('#scorew'),sc=ST.scale||1;if(g.y0*sc<box.scrollTop||g.y1*sc>box.scrollTop+box.clientHeight)box.scrollTo({top:Math.max(0,g.y0*sc-40),behavior:'smooth'});}$('#mnum').textContent='mesure '+(i+1)+' / '+ST.M.length;if(PLAY){stop();play();}}
/* ── interface ── */
function mixerHTML(){return ST.W.parts.map(function(P){const x=ST.mix[P.id]||{};return '<div class="mx"><span class="mxn">'+(P.kind==='voice'?'🎤 ':'🎹 ')+esc(P.name)+'</span>'
  +'<button data-mx="mute" data-p="'+P.id+'" class="'+(x.mute?'on':'')+'">'+(x.mute?'🔇':'🔊')+'</button><button data-mx="solo" data-p="'+P.id+'" class="'+(x.solo?'on':'')+'">solo</button>'
  +(P.kind==='voice'?'<button data-mx="sing" data-p="'+P.id+'" class="'+(ST.sing===P.id?'on gold':'')+'">🙋 je chante</button>':'')
  +'<input type="range" min="0" max="1.5" step=".05" value="'+(x.vol==null?1:x.vol)+'" data-mx="vol" data-p="'+P.id+'"></div>';}).join('');}
function render(){const W=ST.W;$('#title').innerHTML='<b>'+esc(W.title)+'</b><span>'+esc(W.composer)+' · '+esc(W.work)+' · '+esc(W.role)+'</span>';
  $('#mixer').innerHTML=mixerHTML();$('#tr').textContent=(ST.tr>0?'+':'')+ST.tr;$('#tmp').textContent=ST.tempo+' %';$('#keyname').textContent='en '+keyName(ksAfter(W.ks||0,ST.tr));
  $('#bWait').classList.toggle('on',ST.wait);drawScore();}
function keyName(ks){const n=KEYS_MAJ[String(ks)]||'?';return {C:'do',G:'sol',D:'ré',A:'la',E:'mi',B:'si',F:'fa'}[n.charAt(0)]+(n.length>1?(n.charAt(1)==='b'?'♭':'♯'):'')+' majeur / '+({C:'la',G:'mi',D:'si',A:'fa♯',E:'do♯',B:'sol♯','F#':'ré♯','C#':'la♯',F:'ré',Bb:'sol',Eb:'do',Ab:'fa',Db:'si♭',Gb:'mi♭',Cb:'la♭'}[n])+' mineur';}
function library(){$('#lib').innerHTML=WORKS.map(function(W){return '<button class="wk" data-w="'+W.id+'"><b>'+esc(W.title)+'</b><span>'+esc(W.composer)+' — '+esc(W.work)+'</span><small>'+esc(W.voice)+' · '+W.measures.length+' mesures</small></button>';}).join('')+'<div class="wk soon"><b>➕ Bientôt</b><span>Tes airs de basse, des chœurs SATB, des classiques…</span></div>';
  document.querySelectorAll('[data-w]').forEach(function(b){b.onclick=function(){open(b.dataset.w);};});}
function open(id){const W=WORKS.filter(function(x){return x.id===id;})[0];ST.W=W;ST.M=build(W);ST.cur=-1;ST.loop=null;ST.voiceClef={};LS.set('last',id);ST.tr=LS.get('tr:'+id,0);ST.tempo=LS.get('tempo:'+id,100);ST.mix=LS.get('mix:'+id,{});ST.sing=LS.get('sing:'+id,null);ST.an=null;
  $('#home').style.display='none';$('#app').style.display='';render();}
document.addEventListener('click',function(e){const b=e.target.closest('[data-mx]');if(b&&b.tagName==='BUTTON'){const id=b.dataset.p,k=b.dataset.mx;const x=ST.mix[id]=ST.mix[id]||{};
    if(k==='sing')ST.sing=ST.sing===id?null:id;else x[k]=!x[k];LS.set('mix:'+ST.W.id,ST.mix);LS.set('sing:'+ST.W.id,ST.sing);render();$('#mixer').innerHTML=mixerHTML();}});
document.addEventListener('input',function(e){const b=e.target;if(b.dataset&&b.dataset.mx==='vol'){const x=ST.mix[b.dataset.p]=ST.mix[b.dataset.p]||{};x.vol=+b.value;LS.set('mix:'+ST.W.id,ST.mix);}});
window.addEventListener('DOMContentLoaded',function(){const boot=function(){library();
  $('#bPlay').onclick=play;$('#bStop').onclick=function(){stop();seek(0);};
  $('#trm').onclick=function(){ST.tr--;LS.set('tr:'+ST.W.id,ST.tr);render();};$('#trp').onclick=function(){ST.tr++;LS.set('tr:'+ST.W.id,ST.tr);render();};
  $('#tm').onclick=function(){ST.tempo=Math.max(40,ST.tempo-10);LS.set('tempo:'+ST.W.id,ST.tempo);render();};$('#tp').onclick=function(){ST.tempo=Math.min(160,ST.tempo+10);LS.set('tempo:'+ST.W.id,ST.tempo);render();};
  $('#bLoop').onclick=function(){if(ST.loop){ST.loop=null;markLoop();toast('Boucle supprimée');return;}ST.loopSel=ST.cur<0?0:ST.cur;toast('🔁 Touche la dernière mesure de la boucle (début : mesure '+(ST.loopSel+1)+')');};
  $('#bWait').onclick=function(){ST.wait=!ST.wait;LS.set('wait',ST.wait);$('#bWait').classList.toggle('on',ST.wait);};
  $('#follow').onclick=function(){this.classList.toggle('on');};
  $('#bClef').onclick=function(){const P=ST.W.parts.filter(function(p){return p.kind==='voice';})[0];ST.voiceClef[P.id]=clefOf(P,null,0)==='F'?'G':'F';drawScore();toast(ST.voiceClef[P.id]==='F'?'Chant en clé de fa (hauteur réelle, pour basse/baryton)':'Chant en clé de sol (ténor, une octave plus haut que le son)');};
  $('#wait').onclick=resume;document.addEventListener('keydown',function(e){if(e.code==='Space'&&ST.W){e.preventDefault();if(PLAY&&PLAY.waiting)resume();else play();}});
  $('#bBack').onclick=function(){stop();$('#app').style.display='none';$('#home').style.display='';};
  window.addEventListener('resize',function(){if(ST.W)drawScore();});
  const last=LS.get('last',null);if(last&&WORKS.some(function(w){return w.id===last;}))open(last);};
  if(typeof libLoad==='function')libLoad().then(boot,boot);else boot();});
