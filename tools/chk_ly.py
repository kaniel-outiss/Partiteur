"""Contrôle syllabes/notes chantées (notes liées = pas de syllabe) : python3 tools/chk_ly.py px [voix=v:ly]"""
import json,re,sys,glob
px=sys.argv[1];pairs=[x.split(':') for x in (sys.argv[2:] or ['v:ly'])]
def evs(s):
    out=[]
    for t in s.split('//')[0].split():
        last=t.split('+')[-1];g=last.startswith('g')
        if t.startswith('r') or g:out.append(None if not g else 'g');continue
        ps=[re.match(r'g?([A-G](?:bb|##|b|#)?-?\d)',x).group(1) for x in t.split('+')]
        out.append((ps,'~' in last))
    return out
files=sorted(glob.glob('data/%s_p*.json'%px),key=lambda f:int(re.search(r'_p(\d+)',f).group(1)))
for vk,lk in pairs:
    prev=set()
    for f in files:
        for i,m in enumerate(json.load(open(f))['measures']):
            n=0
            for e in evs(m.get(vk,'')):
                if e is None:prev=set();continue
                if e=='g':continue
                ps,tie=e
                if not all(p in prev for p in ps):n+=1
                prev=set(ps) if tie else set()
            sy=len(m.get(lk,'').split())
            if sy!=n:print(f,i+1,vk,'notes',n,'syll',sy,'|',m.get(vk),'|',m.get(lk))
