"""Contrôle des durées pour les pièces chorales : python3 tools/chk_satb.py data/xxx_pN.json [parties]"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import importlib.util
spec = importlib.util.spec_from_file_location('chk', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'chk.py'))
src = open(spec.origin).read(); src = src[:src.index('J=json.load')]
ns = {}; exec(src, ns); part = ns['part']
P = sys.argv[2].split(',') if len(sys.argv) > 2 else ['s', 'a', 't', 'b', 'orc']
J = json.load(open(sys.argv[1])); meter = None; bad = 0
for i, m in enumerate(J['measures']):
    meter = m.get('meter', meter); a, b = meter.split('/'); L = m.get('len', int(a) * 4 / int(b))
    for k in P:
        try:
            for x in part(m.get(k, '')):
                if abs(x - L) > 1e-6: print('mesure', i + 1, k, '=', round(x, 3), '≠', L); bad += 1
            if not m.get(k, '').strip(): print('mesure', i + 1, k, 'vide'); bad += 1
        except ValueError as e: print('mesure', i + 1, k, e); bad += 1
print('mesures', len(J['measures']), 'erreurs', bad)
