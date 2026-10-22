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
        if 'marks' in m:
            mk = []
            for k in m['marks']:
                k = k.strip()
                if re.search(r"stacc|^tr$|^armure|point d.orgue|fermata|^ten\.?$", k, re.I): continue
                # notes de transcription (pas des indications imprimées) : hors portée
                if re.search(r"\b(MD|MG)\b|accent|bécarre|cl[eé] de|double barre|liaison|petites notes|soufflet|trait horizontal|triolet|tenuto|grupetto|respiration|coupure|^mes\. ?\d|arp[eè]g|8va \(", k, re.I): continue
                k = re.sub(r"\s*\((voix|piano|chant)[^)]*\)$", '', k).strip()
                if not k or k.startswith('('): continue
                d = re.match(r'^(pppp|ppp|pp|p|mp|mf|ffff|fff|ff|f|sfz|sf|fp|rfz|rf)\s*\(', k)  # « p (2e temps…) » → « p »
                if d: k = d.group(1)
                if k not in mk: mk.append(k)
            m['marks'] = mk
        # élision écrite « ste_ed » → « ste‿ed » (le « _ » seul reste un mélisme)
        if m.get('ly'): m['ly'] = ' '.join(re.sub(r"(?<=[\w,;:.!?'’])_(?=\w)", '‿', w) for w in m['ly'].split())
    return ms
def place(T, ms):
    i0, out = 0, []
    for L in T['lines']:
        k = L.pop('key', '').lower()
        for i in range(i0, len(ms)):
            ly = ms[i].get('ly', '').split()
            if any(w.lower().strip('-,!;:.…').replace('’', "'").startswith(k) for w in ly):
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
# — « Largo al factotum » (Rossini) : livret placé par phrase (mots consécutifs), puis trié dans l'ordre de la partition —
def words_stream(ms):
    out, cur, curm = [], '', None
    for i, m in enumerate(ms):
        for sy in m.get('ly', '').split():
            if sy == '_': continue
            t = sy.replace('‿', ' ').replace('’', "'")
            if cur == '': curm = i
            cur += t.rstrip('-').replace("'", '')
            if not t.endswith('-'):
                for w in re.sub(r"[^\wàèéìòù ]", ' ', cur.lower()).split(): out.append((w, curm))
                cur = ''
    return out
def place_phrases(T, ms):
    S = words_stream(ms); used = set(); out = []
    for L in T['lines']:
        k = L.pop('key', '').split()
        for j in range(len(S) - len(k) + 1):
            if j in used: continue
            if all(S[j + q][0].startswith(k[q]) for q in range(len(k))):
                used.add(j); L['m'] = S[j][1]; out.append(L); break
    T['lines'] = sorted(out, key=lambda L: L['m']); return T
if all(os.path.exists('data/fig_p%d.json' % k) for k in range(1, 12)):  # n'inclure l'air qu'une fois complet
    fg = clean(pages('fig'))
    if fg and not fg[0].get('bpm'): fg[0]['bpm'] = 192  # Allegro vivace : noire pointée ≈ 128
    W.append({'id': 'rossini-largo', 'title': 'Largo al factotum', 'composer': 'Gioachino Rossini', 'work': 'Il barbiere di Siviglia, acte I',
              'role': 'Figaro', 'voice': 'baryton', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 0, 'bpm': 192,
              'parts': [{'id': 'v', 'name': 'Figaro (baryton)', 'short': 'Fig.', 'kind': 'voice', 'clef': 'F', 'oct': 0, 'vt': 'Bar'},
                        {'id': 'rh', 'name': 'Piano MD', 'kind': 'piano'}, {'id': 'lh', 'name': 'Piano MG', 'kind': 'piano'}],
              'measures': fg, 'text': place_phrases(json.load(open('data/fig_text.json')), fg), 'src': 'Partition chant-piano (Schirmer)'})
# — airs transcrits depuis les recueils : un bloc de données par air —
def add_air(prefix, meta, bpm, voice, extra=()):
    if not os.path.exists('data/%s_p1.json' % prefix) or not os.path.exists('data/%s_done' % prefix): return  # inclus seulement une fois l'air assemblé et vérifié
    ms = clean(pages(prefix))
    if ms and any('D.S. al Fine' in (m.get('marks') or []) for m in ms):  # reprise dal segno déroulée pour la lecture
        a = next(i for i, m in enumerate(ms) if 'Segno' in (m.get('marks') or []))
        f = next(i for i, m in enumerate(ms) if 'Fine' in (m.get('marks') or []))
        cp = json.loads(json.dumps(ms[a:f + 1]))
        for m in cp:
            m['marks'] = [k for k in (m.get('marks') or []) if k != 'Segno']
        cp[0]['marks'] = ['Dal segno (𝄋)'] + cp[0]['marks']
        ms = ms + cp
    if ms and not ms[0].get('bpm'): ms[0]['bpm'] = bpm
    T = json.load(open('data/%s_text.json' % prefix)) if os.path.exists('data/%s_text.json' % prefix) else None
    W.append(dict(dict({'ks': 0}, **meta), bpm=bpm, measures=ms, text=place_phrases(T, ms) if T else None,
                  parts=[dict(dict({'clef': 'F', 'oct': 0}, **voice), id='v', kind='voice')] + [dict(x, kind='voice') for x in extra] + [{'id': 'rh', 'name': 'Piano MD', 'kind': 'piano'}, {'id': 'lh', 'name': 'Piano MG', 'kind': 'piano'}]))
add_air('cal', {'id': 'rossini-calunnia', 'title': 'La calunnia è un venticello', 'composer': 'Gioachino Rossini', 'work': 'Il barbiere di Siviglia, acte I',
                'role': 'Don Basilio', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Romantique', 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 57-65'},
        126, {'name': 'Don Basilio (basse)', 'short': 'Bas.', 'vt': 'B'})
add_air('npa', {'id': 'mozart-non-piu-andrai', 'title': 'Non più andrai', 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Le nozze di Figaro, acte I',
                'role': 'Figaro', 'voice': 'baryton-basse', 'style': 'Air d’opéra', 'period': 'Classique', 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 272-280'},
        132, {'name': 'Figaro (baryton-basse)', 'short': 'Fig.', 'vt': 'Bar'})
add_air('zim', {'id': 'puccini-vecchia-zimarra', 'title': 'Vecchia zimarra, senti', 'composer': 'Giacomo Puccini', 'work': 'La Bohème, acte IV',
                'role': 'Colline', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Post-romantique', 'ks': 4, 'mode': 'minor', 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 86-87'},
        63, {'name': 'Colline (basse)', 'short': 'Col.', 'vt': 'B'})
add_air('lac', {'id': 'verdi-lacerato-spirito', 'title': 'Il lacerato spirito', 'composer': 'Giuseppe Verdi', 'work': 'Simon Boccanegra, prologue',
                'role': 'Fiesco', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 3, 'mode': 'minor', 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 316-319'},
        66, {'name': 'Fiesco (basse)', 'short': 'Fie.', 'vt': 'B'})
add_air('svb', {'id': 'mozart-se-vuol-ballare', 'title': 'Se vuol ballare', 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Le nozze di Figaro, acte I',
                'role': 'Figaro', 'voice': 'baryton-basse', 'style': 'Air d’opéra', 'period': 'Classique', 'src': 'Bass-Baritone Arias with Orchestra (Music Minus One 4056), p. 12-19'},
        100, {'name': 'Figaro (baryton-basse)', 'short': 'Fig.', 'vt': 'Bar'})
add_air('ufl', {'id': 'donizetti-furtiva-lagrima', 'title': 'Una furtiva lagrima', 'composer': 'Gaetano Donizetti', 'work': "L'elisir d'amore, acte II",
                'role': 'Nemorino', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -5, 'mode': 'minor', 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 118-121'},
        60, {'name': 'Nemorino (ténor)', 'short': 'Nem.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('cgm', {'id': 'puccini-che-gelida-manina', 'title': 'Che gelida manina', 'composer': 'Giacomo Puccini', 'work': 'La Bohème, acte I',
                'role': 'Rodolfo', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Post-romantique', 'ks': -5, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 63-67'},
        66, {'name': 'Rodolfo (ténor)', 'short': 'Rod.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('aur', {'id': 'faure-apres-un-reve', 'title': 'Après un rêve', 'composer': 'Gabriel Fauré', 'work': 'Op. 7 n° 1 — poème de Romain Bussine',
                'role': None, 'voice': 'voix moyenne', 'style': 'Mélodie française', 'period': 'Romantique', 'ks': -3, 'mode': 'minor', 'src': '30 Songs, éd. Kagen (International Music Co.), voix moyenne, do mineur'},
        60, {'name': 'Voix (moyenne)', 'short': 'V.', 'vt': 'Mz', 'clef': 'G', 'oct': 0})
add_air('ber', {'id': 'faure-les-berceaux', 'title': 'Les berceaux', 'composer': 'Gabriel Fauré', 'work': 'Op. 23 n° 1 — poème de Sully Prudhomme',
                'role': None, 'voice': 'voix moyenne', 'style': 'Mélodie française', 'period': 'Romantique', 'ks': -5, 'mode': 'minor', 'src': '30 Songs, éd. Kagen (International Music Co.), voix moyenne, si♭ mineur'},
        66, {'name': 'Voix (moyenne)', 'short': 'V.', 'vt': 'Mz', 'clef': 'G', 'oct': 0})
add_air('cdl', {'id': 'faure-clair-de-lune', 'title': 'Clair de lune', 'composer': 'Gabriel Fauré', 'work': 'Op. 46 n° 2 — poème de Paul Verlaine',
                'role': None, 'voice': 'voix moyenne', 'style': 'Mélodie française', 'period': 'Romantique', 'ks': -5, 'mode': 'minor', 'src': '30 Songs, éd. Kagen (International Music Co.), voix moyenne, si♭ mineur'},
        78, {'name': 'Voix (moyenne)', 'short': 'V.', 'vt': 'Mz', 'clef': 'G', 'oct': 0})
add_air('lyd', {'id': 'faure-lydia', 'title': 'Lydia', 'composer': 'Gabriel Fauré', 'work': 'Op. 4 n° 2 — poème de Leconte de Lisle',
                'role': None, 'voice': 'voix moyenne', 'style': 'Mélodie française', 'period': 'Romantique', 'ks': -1, 'src': '30 Songs, éd. Kagen (International Music Co.), voix moyenne, fa majeur'},
        66, {'name': 'Voix (moyenne)', 'short': 'V.', 'vt': 'Mz', 'clef': 'G', 'oct': 0})
add_air('uam', {'id': 'mozart-aura-amorosa', 'title': "Un'aura amorosa", 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Così fan tutte, acte I',
                'role': 'Ferrando', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Classique', 'ks': 3, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 96-99'},
        60, {'name': 'Ferrando (ténor)', 'short': 'Fer.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('sgt', {'id': 'donizetti-spirto-gentil', 'title': 'Spirto gentil', 'composer': 'Gaetano Donizetti', 'work': 'La favorita, acte IV',
                'role': 'Fernando', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 0, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 113-117'},
        60, {'name': 'Fernando (ténor)', 'short': 'Fer.', 'vt': 'T', 'clef': 'G', 'oct': -12})
# ordre des modules : chacun ne dépend que des précédents (et du BUS)
add_air('cai', {'id': 'verdi-celeste-aida', 'title': 'Celeste Aida', 'composer': 'Giuseppe Verdi', 'work': 'Aida, acte I',
                'role': 'Radamès', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 1, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 28-33'},
        72, {'name': 'Radamès (ténor)', 'short': 'Rad.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('ndo', {'id': 'puccini-nessun-dorma', 'title': 'Nessun dorma', 'composer': 'Giacomo Puccini', 'work': 'Turandot, acte III',
                'role': 'Calaf', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Post-romantique', 'ks': 1, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 210-212'},
        60, {'name': 'Calaf (ténor)', 'short': 'Cal.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('vlg', {'id': 'leoncavallo-vesti-la-giubba', 'title': 'Vesti la giubba', 'composer': 'Ruggero Leoncavallo', 'work': 'Pagliacci, acte I',
                'role': 'Canio', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Vérisme', 'ks': 0, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 168-170'},
        66, {'name': 'Canio (ténor)', 'short': 'Can.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('sal', {'id': 'gounod-salut-demeure', 'title': 'Salut ! demeure chaste et pure', 'composer': 'Charles Gounod', 'work': 'Faust, acte III',
                'role': 'Faust', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -4, 'src': 'Operatic Anthology (Schirmer), p. 69-73'},
        54, {'name': 'Faust (ténor)', 'short': 'Fau.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('flr', {'id': 'bizet-la-fleur', 'title': "La fleur que tu m'avais jetée", 'composer': 'Georges Bizet', 'work': 'Carmen, acte II',
                'role': 'Don José', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -5, 'src': 'Operatic Anthology (Schirmer), p. 22-25'},
        60, {'name': 'Don José (ténor)', 'short': 'José', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('jce', {'id': 'bizet-je-crois-entendre', 'title': 'Je crois entendre encore', 'composer': 'Georges Bizet', 'work': 'Les Pêcheurs de perles, acte I',
                'role': 'Nadir', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 0, 'mode': 'minor', 'src': 'Romance de Nadir, éd. Formation vocale Nantes (ton original)'},
        60, {'name': 'Nadir (ténor)', 'short': 'Nad.', 'vt': 'T', 'clef': 'G', 'oct': -12})
add_air('mwa', {'id': 'handel-messiah-but-who-may-abide', 'title': 'Thus saith the Lord… But who may abide', 'composer': 'Georg Friedrich Haendel', 'work': 'Le Messie, nº 5-6',
                'role': None, 'voice': 'basse', 'style': 'Oratorio', 'period': 'Baroque', 'ks': -1, 'mode': 'minor', 'src': 'The Messiah, Schirmer 1912, p. 24-35'},
        72, {'name': 'Basse', 'short': 'B.', 'vt': 'B'})
add_air('ovn', {'id': 'thomas-o-vin', 'title': 'Ô vin, dissipe la tristesse', 'composer': 'Ambroise Thomas', 'work': 'Hamlet, acte II',
                'role': 'Hamlet', 'voice': 'baryton', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -2, 'src': 'Operatic Anthology (Schirmer), p. 142-148'},
        100, {'name': 'Hamlet (baryton)', 'short': 'Ham.', 'vt': 'Bar'})
add_air('mpw', {'id': 'handel-messiah-people-darkness', 'title': 'For behold, darkness… The people that walked in darkness', 'composer': 'Georg Friedrich Haendel', 'work': 'Le Messie, nº 10-11',
                'role': None, 'voice': 'basse', 'style': 'Oratorio', 'period': 'Baroque', 'ks': 2, 'mode': 'minor', 'src': 'The Messiah, Schirmer 1912, p. 60-65'},
        72, {'name': 'Basse', 'short': 'B.', 'vt': 'B'})
add_air('wdn', {'id': 'handel-messiah-why-do-the-nations', 'title': 'Why do the nations so furiously rage together?', 'composer': 'Georg Friedrich Haendel', 'work': 'Le Messie, nº 40',
                'role': None, 'voice': 'basse', 'style': 'Oratorio', 'period': 'Baroque', 'ks': 0, 'src': 'The Messiah, Schirmer 1912, p. 174-181'},
        112, {'name': 'Basse', 'short': 'B.', 'vt': 'B'})
add_air('tsh', {'id': 'handel-messiah-trumpet-shall-sound', 'title': 'Behold, I tell you a mystery… The trumpet shall sound', 'composer': 'Georg Friedrich Haendel', 'work': 'Le Messie, nº 47-48',
                'role': None, 'voice': 'basse', 'style': 'Oratorio', 'period': 'Baroque', 'ks': 2, 'src': 'The Messiah, Schirmer 1912, p. 214-221'},
        80, {'name': 'Basse', 'short': 'B.', 'vt': 'B'})
add_air('ven', {'id': 'mozart-la-vendetta', 'title': 'La vendetta, oh, la vendetta', 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Le nozze di Figaro, acte I',
                'role': 'Bartolo', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Classique', 'ks': 2, 'src': 'Le nozze di Figaro, Bärenreiter BA 4565, p. 45-51'},
        132, {'name': 'Bartolo (basse)', 'short': 'Bart.', 'vt': 'B'})
add_air('dot', {'id': 'rossini-a-un-dottor', 'title': 'A un dottor della mia sorte', 'composer': 'Gioachino Rossini', 'work': 'Il barbiere di Siviglia, acte I',
                'role': 'Bartolo', 'voice': 'basse', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -3, 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 66-85'},
        69, {'name': 'Bartolo (basse)', 'short': 'Bart.', 'vt': 'B'})
add_air('hoc', {'id': 'mozart-ho-capito', 'title': 'Ho capito, Signor, sì!', 'composer': 'Wolfgang Amadeus Mozart', 'work': 'Don Giovanni, acte I',
                'role': 'Masetto', 'voice': 'baryton-basse', 'style': 'Air d’opéra', 'period': 'Classique', 'ks': -1, 'src': 'Anthology of Italian Opera — Bass (Ricordi), p. 126-131'},
        144, {'name': 'Masetto (baryton-basse)', 'short': 'Mas.', 'vt': 'Bar'})
add_air('dqp', {'id': 'verdi-di-quella-pira', 'title': 'Di quella pira', 'composer': 'Giuseppe Verdi', 'work': 'Il trovatore, acte III',
                'role': 'Manrico', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': 0, 'src': '250 Arias de Opera para Tenor, vol. 3 (éd. Carisch), p. 39-47', 'condense': True},
        100, {'name': 'Manrico (ténor)', 'short': 'Man.', 'vt': 'T', 'clef': 'G', 'oct': -12},
        extra=[{'id': 'ct', 'name': 'Chœur — ténors', 'short': 'T.', 'clef': 'G', 'oct': -12, 'vt': 'T', 'lyKey': 'lct'},
               {'id': 'cb', 'name': 'Chœur — basses', 'short': 'B.', 'clef': 'F', 'oct': 0, 'vt': 'B', 'lyKey': 'lcb'}])
add_air('ama', {'id': 'donizetti-ah-mes-amis', 'title': 'Ah ! mes amis, quel jour de fête… Pour mon âme', 'composer': 'Gaetano Donizetti', 'work': 'La fille du régiment, acte I',
                'role': 'Tonio', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Romantique', 'ks': -3, 'src': 'Tenor Arias Album, p. 129-153', 'condense': True},
        100, {'name': 'Tonio (ténor)', 'short': 'Ton.', 'vt': 'T', 'clef': 'G', 'oct': -12},
        extra=[{'id': 'su', 'name': 'Sulpice (basse)', 'short': 'Sul.', 'clef': 'F', 'oct': 0, 'vt': 'B', 'lyKey': 'lsu'},
               {'id': 'ct', 'name': 'Chœur — ténors', 'short': 'T.', 'clef': 'G', 'oct': -12, 'vt': 'T', 'lyKey': 'lct'},
               {'id': 'cb', 'name': 'Chœur — basses', 'short': 'B.', 'clef': 'F', 'oct': 0, 'vt': 'B', 'lyKey': 'lcb'}])
add_air('dnv', {'id': 'puccini-donna-non-vidi-mai', 'title': 'Donna non vidi mai', 'composer': 'Giacomo Puccini', 'work': 'Manon Lescaut, acte I',
                'role': 'Des Grieux', 'voice': 'ténor', 'style': 'Air d’opéra', 'period': 'Post-romantique', 'ks': -2, 'src': 'Anthology of Italian Opera — Tenor (Ricordi), p. 161-163'},
        63, {'name': 'Des Grieux (ténor)', 'short': 'DG.', 'vt': 'T', 'clef': 'G', 'oct': -12})
# — pièces chorales SATB (+ portée d'orchestre) : parties s/a/t/b (paroles ls/la/lt/lb) et orc —
def add_satb(prefix, meta, bpm, parts, lykey='lb'):
    if not os.path.exists('data/%s_p1.json' % prefix) or not os.path.exists('data/%s_done' % prefix): return
    ms = pages(prefix)
    for m in ms:
        for k in ('ls', 'la', 'lt', 'lb'):
            if m.get(k): m[k] = ' '.join(re.sub(r"(?<=[\w,;:.!?'’])_(?=\w)", '‿', w) for w in m[k].split())
    ly = [m.pop('ly', None) for m in ms]
    clean(ms)
    if ms and not ms[0].get('bpm'): ms[0]['bpm'] = bpm
    T = json.load(open('data/%s_text.json' % prefix)) if os.path.exists('data/%s_text.json' % prefix) else None
    if T: T = place_phrases(T, [{'ly': m.get(lykey, '')} for m in ms])
    W.append(dict(dict({'ks': 0}, **meta), bpm=bpm, measures=ms, text=T, parts=parts))
add_satb('lib', {'id': 'faure-libera-me', 'title': 'Libera me', 'composer': 'Gabriel Fauré', 'work': 'Requiem op. 48, n° VI',
                 'role': None, 'voice': 'SATB + basse solo', 'style': 'Musique sacrée', 'period': 'Romantique', 'ks': -1, 'mode': 'minor', 'src': 'Éd. Nancho Alvarez (tomasluisdevictoria.org), p. 12-14', 'condense': True},
         80, [{'id': 's', 'name': 'Soprano', 'short': 'S.', 'kind': 'voice', 'clef': 'G', 'oct': 0, 'vt': 'S', 'lyKey': 'ls'},
              {'id': 'a', 'name': 'Alto', 'short': 'A.', 'kind': 'voice', 'clef': 'G', 'oct': 0, 'vt': 'A', 'lyKey': 'la'},
              {'id': 't', 'name': 'Ténor', 'short': 'T.', 'kind': 'voice', 'clef': 'G', 'oct': -12, 'vt': 'T', 'lyKey': 'lt'},
              {'id': 'b', 'name': 'Basse (solo puis chœur)', 'short': 'B.', 'kind': 'voice', 'clef': 'F', 'oct': 0, 'vt': 'B', 'lyKey': 'lb'},
              {'id': 'orc', 'name': 'Orchestre (réduction)', 'short': 'Orch.', 'kind': 'piano'}])
# — les chants ne sont plus dans l'appli : UN répertoire bibliotheque/partiteur-repertoire.fab (publié avec l'APK ;
#   ajouté avec 📥 ou déposé dans Documents/Partiteur, il est fusionné dans repertoire.fab du téléphone) —
sys.path.insert(0, 'tools')
import fablib
os.makedirs('bibliotheque', exist_ok=True)
for f in glob.glob('bibliotheque/*.fab'): os.remove(f)
fablib.write_pack([fablib.from_work(w) for w in W], 'bibliotheque/partiteur-repertoire.fab')
MODS = ['core', 'tok2xml', 'engine', 'audio', 'player', 'view', 'ui', 'fab', 'library', 'mix', 'plan', 'annot', 'chant', 'piano', 'text', 'main']
app = '\n'.join('/* ── %s.js ── */\n' % m + open('src/%s.js' % m).read() for m in MODS)
sons = json.load(open('data/sons.json'))
PARTS = {
    'VER': VER,
    'WORKS': '[]',  # lecteur : la bibliothèque est lue sur le disque
    'SONS': json.dumps(sons, separators=(',', ':')),
    'VEROVIO': open('vendor/verovio-toolkit-wasm.js').read(),
    'APP': app,
    'SAFE': open('shared/pt-safe.js').read(),
}
shell = open('src/shell.html').read()
out = re.sub(r'__(VER|WORKS|SONS|VEROVIO|APP|SAFE)__', lambda m: PARTS[m.group(1)], shell)
open('partiteur.html', 'w').write(out)
if os.environ.get('PT_TEST'):  # copie de test (non publiée) : chants embarqués pour le rendu automatique
    open(os.environ['PT_TEST'], 'w').write(out.replace('const WORKS=[];', 'const WORKS=[];window.TESTW=' + json.dumps(W, ensure_ascii=False) + ';', 1))
print('ok', len(W), 'chants → bibliotheque/partiteur-repertoire.fab (', round(os.path.getsize('bibliotheque/partiteur-repertoire.fab') / 1024), 'Ko ) ·', round(len(out) / 1e6, 2), 'Mo')
