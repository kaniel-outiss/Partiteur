"""Format .fab du partiteur — lecture / écriture (partagé par build.py et tools/fab.py).
Un .fab est un JSON compressé gzip :
  {fab:1, app:'Le partiteur', id, title, composer, work, role, voice, style, period, lang, ks, mode, bpm, src, tags, created, modified,
   score: {type:'tokens', parts:[…], measures:[…], partMeta:{}}      ← jetons du partiteur (GUIDE.md)
        | {type:'musicxml', xml:'…', partMeta:{id:{name,kind,vt}}},  ← MusicXML tel quel
   text: {lang, ctx, diction[], lines:[{m, it, ipa, w:[[mot,glose]], fr}], doubts[]} | absent,   ← livret
   hist: {partie:{name,vt,h:{midi:durée},n}} | absent,                ← tessiture (calculée par l'appli si absente)
   perso: {tr, tempo, br, mk, seq, ann, ver, …} | absent}            ← réglages perso semés à la 1re ouverture
"""
import gzip, json, re, unicodedata, zipfile, io, datetime

VER = 1
META = ['title', 'composer', 'work', 'role', 'voice', 'style', 'period', 'lang', 'ks', 'mode', 'bpm', 'src', 'tags', 'created']


def slug(s):
    s = unicodedata.normalize('NFD', str(s or 'chant'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60] or 'chant'


def make(meta, score, text=None, hist=None, perso=None):
    o = {'fab': VER, 'app': 'Le partiteur', 'id': meta['id']}
    for k in META:
        if meta.get(k) not in (None, ''):
            o[k] = meta[k]
    o['modified'] = datetime.date.today().isoformat()
    o['score'] = score
    if text: o['text'] = text
    if hist: o['hist'] = hist
    if perso: o['perso'] = perso
    return o


def from_work(W):
    """œuvre au format interne (build.py) → objet .fab (partition en jetons)"""
    if W.get('xml'):
        sc = {'type': 'musicxml', 'xml': W['xml'], 'partMeta': W.get('partMeta') or {}}
    else:
        sc = {'type': 'tokens', 'parts': W['parts'], 'measures': W['measures'], 'partMeta': W.get('partMeta') or {}}
    return make(W, sc, W.get('text'))


def dumps(o):
    return gzip.compress(json.dumps(o, ensure_ascii=False, separators=(',', ':')).encode('utf-8'), mtime=0)


def write(o, path):
    open(path, 'wb').write(dumps(o))


def read(path):
    b = open(path, 'rb').read()
    if b[:2] == b'\x1f\x8b':
        b = gzip.decompress(b)
    o = json.loads(b.decode('utf-8'))
    if not o.get('fab') or 'score' not in o:
        raise ValueError(path + " : ce n'est pas un .fab")
    return o


def read_score_xml(path):
    """MusicXML (.xml/.musicxml), compressé (.mxl) ou MEI → texte XML"""
    b = open(path, 'rb').read()
    if b[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(b))
        root = None
        if 'META-INF/container.xml' in z.namelist():
            m = re.search(r'full-path="([^"]+)"', z.read('META-INF/container.xml').decode('utf-8', 'replace'))
            root = m and m.group(1)
        if not root:
            root = [n for n in z.namelist() if re.search(r'\.(xml|musicxml)$', n, re.I) and 'META-INF' not in n][0]
        return z.read(root).decode('utf-8')
    return b.decode('utf-8')
