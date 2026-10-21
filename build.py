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
# — « Arm, arm ye brave! » (Haendel) : pages transcrites data/arm_pN.json —
import glob, os
if os.path.exists('data/arm_p1.json'):
    am = []
    for f in sorted(glob.glob('data/arm_p*.json'), key=lambda x: int(re.search(r'p(\d+)', x).group(1))):
        am += json.load(open(f))['measures']
    T = json.load(open('data/arm_text.json'))
    # livret : une ligne à chaque entrée de phrase (1re note chantée après un silence)
    KEYS = [('arm', 0), ('the', 1), ('cause', 1), ('in', 2), ('fence', 2), ("th'al", 3), ('th’al', 3), ('might', 3)]
    lines, prev_rest = [], True
    for i, m in enumerate(am):
        v = m.get('v', '').split(); ly = m.get('ly', '').split()
        if v and v[0].startswith('r') and ly:
            prev_rest = True
        if ly and prev_rest:
            w = ly[0].lower().strip('-,!;')
            k = next((n for key, n in KEYS if w.startswith(key)), None)
            if k is not None and (not lines or lines[-1]['_k'] != k or i - lines[-1]['m'] > 4):
                L = dict(T['lines'][k]); L['m'] = i; L['_k'] = k; lines.append(L)
        prev_rest = bool(v) and all(t.startswith('r') for t in v[-1:])
    for L in lines: L.pop('_k', None); L.pop('key', None)
    T['lines'] = lines
    W.append({'id': 'handel-arm-arm', 'title': 'Arm, arm, ye brave!', 'composer': 'Georg Friedrich Haendel', 'work': 'Judas Maccabaeus, acte I',
              'role': 'Simon', 'voice': 'basse', 'style': 'Oratorio', 'period': 'Baroque', 'ks': 0, 'bpm': 80,
              'parts': [{'id': 'v', 'name': 'Simon (basse)', 'short': 'B.', 'kind': 'voice', 'clef': 'F', 'oct': 0, 'vt': 'B'},
                        {'id': 'rh', 'name': 'Piano MD', 'kind': 'piano'}, {'id': 'lh', 'name': 'Piano MG', 'kind': 'piano'}],
              'measures': am, 'text': T, 'src': 'Songs and Airs, éd. Ebenezer Prout (Ditson, 1915), p. 153-159'})
# — « Madamina » (Mozart) : pages transcrites data/mad_pN.json ; livret placé ligne après ligne par mot-clé —
def pages(prefix):
    out = []
    for f in sorted(glob.glob('data/%s_p*.json' % prefix), key=lambda x: int(re.search(r'_p(\d+)', x).group(1))):
        out += json.load(open(f))['measures']
    return out
def clean(ms):
    # indications d'articulation non encodées (staccato) : pas de texte parasite sur la portée
    for m in ms:
        if 'marks' in m: m['marks'] = [k for k in m['marks'] if not re.match(r'^(stacc|stacc\.|staccato|tr)$', k.strip(), re.I)]
    return ms
def place(T, ms):
    i0, out = 0, []
    for L in T['lines']:
        k = L.pop('key', '').lower()
        for i in range(i0, len(ms)):
            ly = ms[i].get('ly', '').split()
            if any(w.lower().strip('-,!;:.…').replace('’', "'").startswith(k) for w in ly[:2]):
                L['m'] = i; i0 = i + 1; out.append(L); break
    T['lines'] = out; return T
for w in W[1:]: clean(w['measures'])
if os.path.exists('data/mad_p1.json'):
    md = clean(pages('mad'))
    for m in md:
        if 'Andante' in (m.get('tempo') or '') and not m.get('bpm'): m['bpm'] = 100
    W.append({'id': 'mozart-madamina', 'title': 'Madamina, il catalogo è questo', 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Don Giovanni, acte I',
              'role': 'Leporello', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Classique', 'ks': 2, 'bpm': 132,
              'parts': [{'id': 'v', 'name': 'Leporello (basse)', 'short': 'Lep.', 'kind': 'voice', 'clef': 'F', 'oct': 0, 'vt': 'B'},
                        {'id': 'rh', 'name': 'Piano MD', 'kind': 'piano'}, {'id': 'lh', 'name': 'Piano MG', 'kind': 'piano'}],
              'measures': md, 'text': place(json.load(open('data/mad_text.json')), md), 'src': 'IMSLP 691450 (gravure Sibelius)'})
# ordre des modules : chacun ne dépend que des précédents (et du BUS)
MODS = ['core', 'tok2xml', 'engine', 'audio', 'player', 'view', 'ui', 'library', 'mix', 'plan', 'annot', 'chant', 'piano', 'text', 'main']
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
