import json,sys
VER=sys.argv[1] if len(sys.argv)>1 else '0.6'
ms=[]
for f in ['p1','p2','p3']: ms+=json.load(open('data/%s.json'%f))['measures']
W=[{'id':'tosca-recondita','title':'Recondita armonia','composer':'Giacomo Puccini','work':'Tosca, acte I','role':'Cavaradossi','voice':'ténor','style':'Air d’opéra','period':'Post-romantique','ks':-1,'bpm':48,
 'parts':[{'id':'v','name':'Cavaradossi (ténor)','short':'Canto','kind':'voice','clef':'G','oct':-12,'vt':'T'},{'id':'rh','name':'Piano MD','kind':'piano'},{'id':'lh','name':'Piano MG','kind':'piano'}],'measures':ms,'text':json.load(open('data/tosca_text.json'))}]
s=open('src/shell.html').read().replace('__VER__',VER).replace('__WORKS__',json.dumps(W,ensure_ascii=False)).replace('__APP__',open('src/app.js').read()).replace('__MXML__',open('src/mxml.js').read()).replace('__LIB__',open('src/lib.js').read()).replace('__NAV__',open('src/nav.js').read()).replace('__PIANO__',open('src/piano.js').read()).replace('__PITCH__',open('src/pitch.js').read()).replace('__TEXT__',open('src/text.js').read()).replace('__SAFE__',open('shared/pt-safe.js').read())
open('partiteur.html','w').write(s);print('ok',len(ms),'mesures',len(s),'octets')
