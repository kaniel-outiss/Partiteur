"""Le partiteur — assemble l'appli en un seul fichier HTML (partiteur.html).
   python3 build.py [version]"""
import json, re, sys
VER = sys.argv[1] if len(sys.argv) > 1 else json.load(open('package.json'))['version']
ms = []
for f in ['p1', 'p2', 'p3']:
    ms += json.load(open('data/%s.json' % f))['measures']
W = [{'id': 'tosca-recondita', 'title': 'Recondita armonia', 'composer': 'Giacomo Puccini', 'work': 'Tosca, acte I', 'role': 'Cavaradossi',
      'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Post-romantique', 'ks': -1, 'bpm': 48,
      'parts': [{'id': 'v', 'name': 'Cavaradossi (ténor)', 'short': 'Canto', 'kind': 'voice', 'clef': 'G', 'oct': -12, 'vt': 'T'},
                {'id': 'rh', 'name': 'Piano MD', 'kind': 'piano'}, {'id': 'lh', 'name': 'Piano MG', 'kind': 'piano'}],
      'measures': ms, 'text': json.load(open('data/tosca_text.json'))}]
# ordre des modules : chacun ne dépend que des précédents (et du BUS)
MODS = ['core', 'tok2xml', 'engine', 'audio', 'player', 'view', 'ui', 'library', 'mix', 'chant', 'piano', 'text', 'main']
app = '\n'.join('/* ── %s.js ── */\n' % m + open('src/%s.js' % m).read() for m in MODS)
sons = json.load(open('data/sons.json'))
PARTS = {
    'VER': VER,
    'WORKS': json.dumps(W, ensure_ascii=False),
    'SONS': json.dumps(sons, separators=(',', ':')),
    'VEROVIO': open('vendor/verovio-toolkit-wasm.js').read(),
    'APP': app,
    'SAFE': open('shared/pt-safe.js').read(),
}
shell = open('src/shell.html').read()
out = re.sub(r'__(VER|WORKS|SONS|VEROVIO|APP|SAFE)__', lambda m: PARTS[m.group(1)], shell)
open('partiteur.html', 'w').write(out)
print('ok', len(ms), 'mesures (Tosca)', round(len(out) / 1e6, 2), 'Mo')
