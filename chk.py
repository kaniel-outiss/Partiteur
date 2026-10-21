import json,sys,re
D={'w':4,'h':2,'':1,'e':.5,'s':.25,'t':.125}
def dur(tok):
    t=tok.split('+')[-1]
    if t.startswith('g'):return 0
    m=re.match(r'^(r|[A-G](?:#|b|bb|##)?\d)([whest]?)(dd|d)?(3)?[~*!^]*$',t)
    if not m:raise ValueError('jeton illisible: '+tok)
    d=D[m.group(2)]
    if m.group(3)=='d':d*=1.5
    if m.group(3)=='dd':d*=1.75
    if m.group(4):d*=2/3
    return d
def part(s):
    return [sum(dur(x) for x in v.split()) for v in s.split('//')] if s.strip() else []
J=json.load(open(sys.argv[1]));meter=None;bad=0
for i,m in enumerate(J['measures']):
    meter=m.get('meter',meter);a,b=meter.split('/');L=m.get('len',int(a)*4/int(b))
    for k in ('v','rh','lh'):
        try:
            for x in part(m.get(k,'')):
                if abs(x-L)>1e-6:print('mesure',i+1,k,'=',round(x,3),'≠',L);bad+=1
        except ValueError as e:print('mesure',i+1,k,e);bad+=1
    nn=len([t for t in m.get('v','').split() if not t.startswith('r') and not t.startswith('g')])
print('mesures',len(J['measures']),'erreurs',bad)
