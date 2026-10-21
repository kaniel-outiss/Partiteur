/* ═══════════ 🧩 JETONS → MusicXML — compile le format de transcription (GUIDE.md) en MusicXML propre ═══════════
   Ligatures par temps, n-olets, liaisons, accidents affichés, paroles (syllabes, mélismes, élisions),
   clés automatiques au piano (avec hystérésis), nuances / tempos / pédale, voix multiples (//).
   La partition gravée et la lecture viennent ensuite de Verovio : ce fichier est le seul pont avec l'ancien format. */
'use strict';
const TX2={DIV:480,
  DUR:{w:4,h:2,'':1,q:1,e:.5,s:.25,t:.125,x:.0625},TYPE:{w:'whole',h:'half','':'quarter',q:'quarter',e:'eighth',s:'16th',t:'32nd',x:'64th'},FLAGS:{e:1,s:2,t:3,x:4},
  STEP:{C:0,D:1,E:2,F:3,G:4,A:5,B:6},SEMI:[0,2,4,5,7,9,11],
  DYN:['pppp','ppp','pp','p','mp','mf','f','ff','fff','ffff','sf','sfz','sffz','fp','rf','rfz','fz']};
function t2Note(s){const m=/^([A-G])(bb|##|b|#)?(-?\d)$/.exec(s);if(!m)return null;const acc={'':0,'#':1,'##':2,b:-1,bb:-2}[m[2]||''];
  return {L:m[1],acc:acc,oct:+m[3],midi:12*(+m[3]+1)+TX2.SEMI[TX2.STEP[m[1]]]+acc};}
/* un jeton → {rest,notes[],grace,base,dot,tup:[a,n]|null,d (noires),tie,trem,arp,ferm,fg[]} */
/* liaison de prolongation : seulement vers une note de même hauteur (accord partiellement lié) */
function t2TieTo(V,k,nm,pid,vi,midi){let nx=V[k+1];while(nx&&nx.grace)nx=V[++k+1];if(!nx&&nm){const W=t2Voice(String(nm[pid]||'').split('//')[vi]||'');nx=W.filter(function(e){return !e.grace;})[0];}
  return !!(nx&&!nx.rest&&nx.notes.some(function(q){return q.midi===midi;}));}
function t2Tok(tok){const grace=/^g[A-G]/.test(tok);tok=tok.replace(/(^|\+)g(?=[A-G])/g,'$1');
  const parts=tok.split('+'),last=parts[parts.length-1];
  const m=/^(r|[A-G](?:bb|##|b|#)?-?\d)([whestqx]?)(dd|d)?(3|%\d+:\d+)?([~*!^]*)(@[\d,]+)?$/.exec(last);if(!m)return null;
  const base=m[2]==='q'?'':m[2];let d=TX2.DUR[base];if(m[3]==='d')d*=1.5;if(m[3]==='dd')d*=1.75;let tup=null;
  if(m[4]==='3')tup=[3,2];else if(m[4]){const q=m[4].slice(1).split(':');tup=[+q[0],+q[1]];}if(tup)d*=tup[1]/tup[0];
  const fl=m[5]||'',rest=m[1]==='r';
  const notes=rest?[]:parts.map(function(p,i){return t2Note(i===parts.length-1?m[1]:p.replace(/[whestqx]?(dd|d)?(3|%\d+:\d+)?[~*!^]*(@[\d,]+)?$/,''));}).filter(Boolean);
  return {rest:rest,notes:notes,grace:grace,base:base,dot:m[3]||'',tup:tup,d:grace?0:d,tie:fl.indexOf('~')>=0,trem:fl.indexOf('*')>=0,arp:fl.indexOf('!')>=0,ferm:fl.indexOf('^')>=0,fg:m[6]?m[6].slice(1).split(','):[]};}
function t2Voice(str){let t=0;return String(str||'').trim().split(/\s+/).filter(Boolean).map(function(x){const e=t2Tok(x);if(!e)return null;e.t=t;t+=e.d;return e;}).filter(Boolean);}
function t2Esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function t2MeterLen(mt){const a=mt.split('/');return +a[0]*4/+a[1];}
/* armure → altérations par défaut */
function t2KsMap(ks){const o={};const S='FCGDAEB',F='BEADGCF';if(ks>0)for(let i=0;i<ks;i++)o[S[i]]=1;if(ks<0)for(let i=0;i<-ks;i++)o[F[i]]=-1;return o;}
/* ligatures : par temps (noire, ou noire pointée en 6/8, 9/8, 12/8) */
function t2Beams(V,meter){const a=meter.split('/');const unit=(+a[1]===8&&+a[0]%3===0)?1.5:1;
  const fl=function(e){return e.rest||e.grace?0:(TX2.FLAGS[e.base]||0);};const B=V.map(function(){return [];});
  let i=0;while(i<V.length){if(!fl(V[i])){i++;continue;}const g=Math.floor((V[i].t+1e-6)/unit);let j=i;
    while(j+1<V.length&&fl(V[j+1])&&Math.floor((V[j+1].t+1e-6)/unit)===g)j++;
    if(j>i){for(let L=1;L<=3;L++){let k=i;while(k<=j){if(fl(V[k])<L){k++;continue;}let z=k;while(z+1<=j&&fl(V[z+1])>=L)z++;
        if(z>k){for(let q=k;q<=z;q++)B[q][L-1]=q===k?'begin':(q===z?'end':'continue');}
        else if(L>1)B[k][L-1]=k===i?'forward hook':'backward hook';k=z+1;}}}
    i=j+1;}
  return B;}
/* n-olets : crochet du premier au dernier d'un groupe qui remplit un nombre entier de noires */
function t2Tuplets(V){const T=V.map(function(){return null;});let st=-1,acc=0;
  V.forEach(function(e,k){if(e.grace)return;if(!e.tup){if(st>=0){T[st]='start';T[k-1]=T[k-1]==='start'?'single':'stop';}st=-1;acc=0;return;}
    if(st<0){st=k;acc=0;}acc+=e.d;if(Math.abs(acc-Math.round(acc))<1e-4&&acc>1e-4){if(k===st)T[k]='single';else{T[st]='start';T[k]='stop';}st=-1;acc=0;}});
  if(st>=0){T[st]='start';T[V.length-1]=T[V.length-1]==='start'?'single':'stop';}
  return T;}
/* clé automatique au piano (médiane de la mesure, avec hystérésis) */
function t2AutoClefs(meas,key,def){let cur=def;return meas.map(function(m){const a=[];String(m[key]||'').split('//').forEach(function(v){t2Voice(v).forEach(function(e){if(!e.grace)e.notes.forEach(function(n){a.push(n.midi);});});});
  if(a.length){a.sort(function(x,y){return x-y;});const med=a[a.length>>1],lo=a[0],hi=a[a.length-1];
    if(def==='F'){if(cur==='F'&&lo>=57)cur='G';else if(cur==='G'&&(lo<=45||med<=53))cur='F';}
    else{if(cur==='G'&&hi<=57)cur='F';else if(cur==='F'&&hi>=60&&med>=57)cur='G';}}return cur;});}
/* ── l'œuvre entière ──
   opt.voiceClef : {partId:'F'|'G'} (chant en clé de fa, hauteur réelle) ; renvoie {xml, staves:[{pid,kind,hand,...}]} */
function tokWorkToXML(W,opt){opt=opt||{};const DIV=TX2.DIV;const ks=W.ks||0;let kcur=ks;const KSM=W.measures.map(function(m){if(m.ks!=null)kcur=m.ks;return kcur;}),KMM=KSM.map(t2KsMap);
  /* regroupement des parties : main droite + main gauche = un piano à deux portées */
  const G=[];W.parts.forEach(function(P,i){const prev=G[G.length-1];
    const isLH=P.kind!=='voice'&&(P.id==='lh'||/ MG$/.test(P.name||''));
    if(isLH&&prev&&prev.kind!=='voice'&&prev.staves.length===1){prev.staves.push(P);return;}
    G.push({id:'P'+(G.length+1),kind:P.kind==='voice'?'voice':'piano',name:P.kind==='voice'?P.name:(P.name||'Piano').replace(/ M[DG]$/,'').replace(/^Piano$/,'Piano'),abbr:P.short||'',staves:[P]});});
  const staves=[];G.forEach(function(g){g.staves.forEach(function(P,si){staves.push({pid:P.id,kind:P.kind==='voice'?'voice':'piano',hand:g.kind==='piano'?(g.staves.length>1?(si?'lh':'rh'):null):null,name:P.name,vt:P.vt||'',oct:P.oct||0,group:g.id});});});
  /* mètre par mesure, durée réelle */
  let meter='4/4';const MM=W.measures.map(function(m,i){if(m.meter)meter=m.meter;return {meter:meter,meterShow:!!m.meter&&(i===0||m.meter!==W.measures.slice(0,i).reduce(function(a,x){return x.meter||a;},'')),len:m.len||t2MeterLen(meter)};});
  /* tempo réel par mesure (facteurs « Più lento », « a tempo »…) */
  let bpm=W.bpm||60,tf=1,lastB=null;const BPM=W.measures.map(function(m){if(m.bpm)bpm=m.bpm;const T=(m.tempo||'')+' '+(m.marks||[]).join(' ');
    if(/Più lento|Meno mosso/i.test(T))tf=.9;if(/Più mosso/i.test(T))tf=1.1;if(/a tempo|I\. ?Tempo|Tempo I|stesso movimento/i.test(T))tf=1;const b=Math.round(bpm*tf);const ch=b!==lastB;lastB=b;return ch?b:null;});
  /* clés */
  const CLEF={};staves.forEach(function(S){const P=W.parts.filter(function(x){return x.id===S.pid;})[0];
    if(S.kind==='voice'){const want=(opt.voiceClef&&opt.voiceClef[S.pid])||P.clef||'G';CLEF[S.pid]=W.measures.map(function(){return want;});S.clef=want;S.oct8=want==='G'&&P.oct===-12;}
    else CLEF[S.pid]=P.clefFixed?W.measures.map(function(){return P.clef||'G';}):t2AutoClefs(W.measures,S.pid,S.hand==='lh'||(!S.hand&&(P.clef==='F'))?'F':'G');});
  const tieIn={},lyrState={};
  let x='<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="3.1"><work><work-title>'+t2Esc(W.title||'')+'</work-title></work><identification><creator type="composer">'+t2Esc(W.composer||'')+'</creator></identification>'
    +'<defaults><lyric-font font-family="Times New Roman" font-size="10"/></defaults><part-list>';
  G.forEach(function(g){if(g.kind==='piano'&&g.staves.length>1)x+='<part-group type="start" number="1"><group-symbol>brace</group-symbol></part-group>';
    x+='<score-part id="'+g.id+'"><part-name>'+t2Esc(g.name)+'</part-name>'+(g.abbr?'<part-abbreviation>'+t2Esc(g.abbr)+'</part-abbreviation>':'')+'</score-part>';
    if(g.kind==='piano'&&g.staves.length>1)x+='<part-group type="stop" number="1"/>';});
  x+='</part-list>';
  G.forEach(function(g,gi){x+='<part id="'+g.id+'">';const ns=g.staves.length;
    W.measures.forEach(function(m,mi){const L=MM[mi].len;x+='<measure number="'+(mi+(MM[0].len<t2MeterLen(MM[0].meter)-1e-6?0:1))+'"'+(mi===0&&L<t2MeterLen(MM[mi].meter)-1e-6?' implicit="yes"':'')+'>';
      /* attributs */
      let at='';if(mi===0)at+='<divisions>'+DIV+'</divisions><key><fifths>'+KSM[0]+'</fifths></key>';else if(KSM[mi]!==KSM[mi-1])at+='<key><fifths>'+KSM[mi]+'</fifths></key>';
      if(mi===0||MM[mi].meterShow){const a=MM[mi].meter.split('/');at+='<time><beats>'+a[0]+'</beats><beat-type>'+a[1]+'</beat-type></time>';}
      if(mi===0&&ns>1)at+='<staves>'+ns+'</staves>';
      g.staves.forEach(function(P,si){const c=CLEF[P.id][mi],pc=mi?CLEF[P.id][mi-1]:null;if(mi===0||c!==pc){const S=staves.filter(function(s){return s.pid===P.id;})[0];
        at+='<clef'+(ns>1?' number="'+(si+1)+'"':'')+'><sign>'+c+'</sign><line>'+(c==='F'?4:2)+'</line>'+(c==='G'&&S.oct8?'<clef-octave-change>-1</clef-octave-change>':'')+'</clef>';}});
      if(at)x+='<attributes>'+at+'</attributes>';
      /* directions (au-dessus de la première partie) */
      /* nuances : sous la main droite du piano s'il y en a un (elles concernent surtout l'accompagnement), sinon sous le chant */
      const pianoG=G.filter(function(q){return q.kind==='piano';})[0];
      if(pianoG&&g===pianoG)(m.marks||[]).forEach(function(k){if(TX2.DYN.indexOf(k)>=0)x+='<direction placement="below"><direction-type><dynamics><'+k+'/></dynamics></direction-type>'+(ns>1?'<staff>1</staff>':'')+'</direction>';});
      if(gi===0){const words=[];if(m.tempo)words.push(['tempo',m.tempo]);(m.marks||[]).forEach(function(k){if(k===m.tempo||/^(Ped\.|\*|✻)$/.test(k))return;const dyn=TX2.DYN.indexOf(k)>=0;if(dyn&&pianoG&&pianoG!==g)return;words.push([dyn?'dyn':'w',k]);});
        words.forEach(function(w,k){x+='<direction placement="'+(w[0]==='dyn'?'below':'above')+'"><direction-type>'+(w[0]==='dyn'?'<dynamics><'+w[1]+'/></dynamics>':'<words font-style="'+(w[0]==='tempo'?'normal':'italic')+'"'+(w[0]==='tempo'?' font-weight="bold"':'')+'>'+t2Esc(w[1])+'</words>')+'</direction-type>'+(k===0&&BPM[mi]!=null?'<sound tempo="'+BPM[mi]+'"/>':'')+'</direction>';});
        if(!words.length&&BPM[mi]!=null)x+='<direction><direction-type><words/></direction-type><sound tempo="'+BPM[mi]+'"/></direction>';}
      if(g.kind==='piano'&&(m.marks||[]).indexOf('Ped.')>=0)x+='<direction placement="below"><direction-type><pedal type="start" line="no"/></direction-type>'+(ns>1?'<staff>'+ns+'</staff>':'')+'</direction>';
      /* portées et voix */
      let pos=0;g.staves.forEach(function(P,si){const vs=String(m[P.id]||'').split('//');const multi=vs.length>1;
        const lyKey=P.kind==='voice'?(P.lyKey||'ly'):null;const syl=lyKey?String(m[lyKey]||'').trim().split(/\s+/).filter(Boolean):[];let sk=0;
        /* accidents affichés : dans l'ordre du temps, toutes voix confondues */
        const VV=vs.map(function(v){return t2Voice(v);}),ACC={},acc={},all=[];
        VV.forEach(function(V,vi){V.forEach(function(e,k){if(!e.rest)all.push({t:e.t+(e.grace?-1e-3:0),vi:vi,k:k,e:e});});});
        all.sort(function(a,b){return a.t-b.t||a.vi-b.vi;});
        all.forEach(function(o){const V=VV[o.vi],pv=o.k>0?V[o.k-1]:null,ti=tieIn[P.id+'|'+o.vi]||{};
          o.e.notes.forEach(function(n,ni){const cont=o.k>0?(pv&&pv.tie&&pv.notes.some(function(q){return q.midi===n.midi;})):!!ti[n.midi];
            const key=n.L+n.oct,have=acc[key]!=null?acc[key]:(KMM[mi][n.L]||0);if(n.acc!==have&&!cont)ACC[o.vi+'|'+o.k+'|'+ni]=1;acc[key]=n.acc;});});
        vs.forEach(function(vstr,vi){const V=VV[vi];if(!V.length&&vi>0)return;
          if(pos>0){x+='<backup><duration>'+Math.round(pos*DIV)+'</duration></backup>';pos=0;}
          const voiceNo=si*4+vi+1,tk=P.id+'|'+vi;const B=t2Beams(V,MM[mi].meter),T=t2Tuplets(V);
          if(!V.length){x+='<note><rest measure="yes"/><duration>'+Math.round(L*DIV)+'</duration><voice>'+voiceNo+'</voice>'+(ns>1?'<staff>'+(si+1)+'</staff>':'')+'</note>';pos=L;return;}
          const whole=V.length===1&&V[0].rest&&Math.abs(V[0].d-L)<1e-6&&!multi;
          V.forEach(function(e,k){const prevTie=tieIn[tk]||{};const nowTie={};
            const sung=P.kind==='voice'&&vi===0&&!e.rest&&!e.grace&&!e.notes.every(function(n){return prevTie[n.midi];});
            const ly=sung?(syl[sk++]||''):null;
            const list=e.rest?[null]:e.notes;
            list.forEach(function(n,ni){let s='<note>';if(e.grace)s+='<grace'+(V[k+1]&&V[k+1].grace?'':' slash="yes"')+'/>';if(ni>0)s+='<chord/>';
              if(!n)s+=whole?'<rest measure="yes"/>':'<rest/>';
              else{const sound=n.midi+(P.kind==='voice'?(P.oct||0):0);const oct=n.oct+Math.round((sound-n.midi)/12);
                s+='<pitch><step>'+n.L+'</step>'+(n.acc?'<alter>'+n.acc+'</alter>':'')+'<octave>'+oct+'</octave></pitch>';}
              if(!e.grace)s+='<duration>'+Math.round(e.d*DIV)+'</duration>';
              const tieStop=n&&prevTie[n.midi],tieStart=n&&e.tie&&t2TieTo(V,k,W.measures[mi+1],P.id,vi,n.midi);if(tieStop)s+='<tie type="stop"/>';if(tieStart){s+='<tie type="start"/>';nowTie[n.midi]=1;}
              s+='<voice>'+voiceNo+'</voice>';if(!whole)s+='<type>'+(e.grace?'eighth':TX2.TYPE[e.base])+'</type>';
              if(e.dot&&!whole){s+='<dot/>';if(e.dot==='dd')s+='<dot/>';}
              if(n&&ACC[vi+'|'+k+'|'+ni])s+='<accidental>'+({'-2':'flat-flat','-1':'flat','0':'natural','1':'sharp','2':'double-sharp'}[n.acc])+'</accidental>';
              if(e.tup)s+='<time-modification><actual-notes>'+e.tup[0]+'</actual-notes><normal-notes>'+e.tup[1]+'</normal-notes></time-modification>';
              if(multi&&!e.rest)s+='<stem>'+(vi===0?'up':'down')+'</stem>';
              if(ns>1)s+='<staff>'+(si+1)+'</staff>';
              if(ni===0&&!e.grace)B[k].forEach(function(b,L1){if(b)s+='<beam number="'+(L1+1)+'">'+b+'</beam>';});
              let no='';if(tieStop)no+='<tied type="stop"/>';if(tieStart)no+='<tied type="start"/>';
              if(ni===0&&T[k]){if(T[k]==='single'||T[k]==='start')no+='<tuplet type="start" bracket="yes"/>';if(T[k]==='single'||T[k]==='stop')no+='<tuplet type="stop"/>';}
              if(e.arp)no+='<arpeggiate/>';if(e.ferm&&ni===0)no+='<fermata type="upright"/>';
              if(e.trem&&ni===0)no+='<ornaments><tremolo type="single">3</tremolo></ornaments>';
              const f=e.fg[ni];if(n&&f&&f!=='0')no+='<technical><fingering>'+t2Esc(f)+'</fingering></technical>';
              if(no)s+='<notations>'+no+'</notations>';
              if(ni===0&&ly&&ly!=='_'){const st=lyrState[P.id]||'';const hy=/-$/.test(ly);const txt=ly.replace(/-$/,'').replace(/_+$/,'');
                const sy=st==='open'?(hy?'middle':'end'):(hy?'begin':'single');lyrState[P.id]=hy?'open':'';
                const nxt=syl[sk];const ext=!hy&&nxt==='_';
                s+='<lyric number="1"><syllabic>'+sy+'</syllabic>'+txt.split('‿').map(function(w){return '<text>'+t2Esc(w)+'</text>';}).join('<elision>‿</elision>')+(ext?'<extend type="start"/>':'')+'</lyric>';}
              s+='</note>';x+=s;});
            if(!e.grace){tieIn[tk]=nowTie;pos+=e.d;}});});});
      if(g.kind==='piano'&&(m.marks||[]).some(function(k){return /^(\*|✻)$/.test(k);})){x+='<direction placement="below"><direction-type><pedal type="stop" line="no"/></direction-type>'+(ns>1?'<staff>'+ns+'</staff>':'')+'</direction>';}
      if(mi===W.measures.length-1)x+='<barline location="right"><bar-style>light-heavy</bar-style></barline>';
      x+='</measure>';});
    x+='</part>';});
  x+='</score-partwise>';
  return {xml:x,staves:staves};}
if(typeof module!=='undefined')module.exports={tokWorkToXML:tokWorkToXML,t2Tok:t2Tok,t2Voice:t2Voice};
