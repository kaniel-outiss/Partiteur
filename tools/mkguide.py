"""Génère scan/<px>/GUIDE_<PX>.md à partir du guide ténor (Che gelida manina).
   python3 tools/mkguide.py px "titre complet" "source+pages" "fichiers" "voix" "armure" "mesure" ["note"]"""
import sys,re
px,title,src,files,voice,key,meter=sys.argv[1:8];note=sys.argv[8] if len(sys.argv)>8 else ''
s=open('scan/cgm/GUIDE_CGM.md').read()
s=re.sub(r'^# .*$','# Transcription '+title+' — pour Le partiteur',s,count=1,flags=re.M)
i=s.index('Musique du domaine public');j=s.index('\n',s.index("Puccini change souvent"))
s=s[:i]+src+'\n'+files+'\nReporte chaque indication de tempo/expression dans marks ; "meter" à chaque changement de mesure, "ks" (positif = dièses, négatif = bémols) à chaque changement d\'armure. Vérifie le numéro de page imprimé et signale tout désordre.'+('\n'+note if note else '')+s[j:]
s=s.replace("RODOLFO (ténor, clé de SOL : écris les notes TELLES QU'ÉCRITES en clé de sol, SANS transposer à l'octave inférieure — l'appli s'en charge)",voice)
i=s.index('Armure :');j=s.index('\n',i);s=s[:i]+'Armure : '+key+' ; écris toujours les altérations EFFECTIVES.'+s[j:]
i=s.index('Mesure :');j=s.index('\n',i);s=s[:i]+'Mesure : '+meter+' — mets "meter" sur la 1re mesure de TA page ET à chaque changement. Si les numéros de mesure sont imprimés, vérifie ton compte.'+s[j:]
s=s.replace('scan/cgm/','scan/%s/'%px).replace('data/cgm_p','data/%s_p'%px).replace('cgm_pN','%s_pN'%px)
open('scan/%s/GUIDE_%s.md'%(px,px.upper()),'w').write(s)
print(s[:600])
