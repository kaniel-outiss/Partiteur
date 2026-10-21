#!/usr/bin/env python3
"""Convertisseur .fab du partiteur.

  python3 tools/fab.py xml PARTITION.(musicxml|xml|mxl|mei) [--title T] [--composer C] [--work W] [--role R]
                          [--voice V] [--style S] [--period P] [--src SOURCE] [--text LIVRET.json] [-o SORTIE.fab]
      MusicXML / MEI → .fab (la partition est gardée telle quelle ; livret joint si --text).

  python3 tools/fab.py tokens META.json PAGE1.json [PAGE2.json …] [--text LIVRET.json] [-o SORTIE.fab]
      Transcription au format jetons (GUIDE.md, une page par fichier) → .fab.
      META.json : {"id","title","composer","work","role","voice","style","period","ks","mode","bpm","src",
                   "parts":[{"id":"v","name":"…","kind":"voice","clef":"G","oct":-12,"vt":"T"},{"id":"rh",…},{"id":"lh",…}]}

  python3 tools/fab.py rep REPERTOIRE.fab [CHANT_OU_REPERTOIRE.fab …]
      Ajoute / met à jour des chants dans un répertoire (créé s'il n'existe pas). Même identifiant = remplacé.
  python3 tools/fab.py ls REPERTOIRE.fab        liste des chants d'un répertoire

  python3 tools/fab.py info FICHIER.fab        résumé
  python3 tools/fab.py unpack FICHIER.fab      → FICHIER.json lisible
  python3 tools/fab.py pack FICHIER.json       → FICHIER.fab

PDF → .fab : un PDF est une image ; il passe par la transcription (GUIDE.md → pages en jetons) puis « tokens ».
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fablib


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    x = sub.add_parser('xml')
    x.add_argument('src')
    for k in ['title', 'composer', 'work', 'role', 'voice', 'style', 'period']:
        x.add_argument('--' + k)
    x.add_argument('--source', dest='source')
    x.add_argument('--text')
    x.add_argument('-o')
    t = sub.add_parser('tokens')
    t.add_argument('meta')
    t.add_argument('pages', nargs='+')
    t.add_argument('--text')
    t.add_argument('-o')
    for c in ['info', 'unpack', 'pack', 'ls']:
        sub.add_parser(c).add_argument('file')
    r = sub.add_parser('rep')
    r.add_argument('rep')
    r.add_argument('add', nargs='*')
    a = ap.parse_args()

    if a.cmd == 'rep':
        cur = fablib.read_pack(a.rep) if os.path.exists(a.rep) else {}
        nn = nu = 0
        for f in a.add:
            for o in fablib.load_any(f):
                if o['id'] in cur: nu += 1
                else: nn += 1
                cur[o['id']] = o
        fablib.write_pack(list(cur.values()), a.rep)
        print('→', a.rep, ':', len(cur), 'chants (', nn, 'nouveaux,', nu, 'mis à jour )', round(os.path.getsize(a.rep) / 1024), 'Ko')
        return
    if a.cmd == 'ls':
        for o in fablib.load_any(a.file):
            print('-', o['id'], '·', o.get('title'), '·', o.get('composer', ''), '·', o['score']['type'])
        return

    if a.cmd == 'xml':
        xml = fablib.read_score_xml(a.src)
        if not re.search(r'score-partwise|<mei[\s>]', xml):
            sys.exit('pas une partition MusicXML « partwise » ni MEI')
        title = a.title or (re.search(r'<work-title>([^<]+)', xml) or re.search(r'<movement-title>([^<]+)', xml) or [None, os.path.splitext(os.path.basename(a.src))[0]])[1]
        comp = a.composer or ((re.search(r'<creator type="composer">([^<]+)', xml) or [None, ''])[1])
        meta = {'id': 'fab-' + fablib.slug(comp.split()[-1] if comp else '') + '-' + fablib.slug(title), 'title': title.strip(), 'composer': comp.strip(),
                'work': a.work, 'role': a.role, 'voice': a.voice, 'style': a.style, 'period': a.period, 'src': a.source or os.path.basename(a.src)}
        o = fablib.make(meta, {'type': 'musicxml', 'xml': xml, 'partMeta': {}}, json.load(open(a.text)) if a.text else None)
    elif a.cmd == 'tokens':
        meta = json.load(open(a.meta))
        ms = []
        for p in a.pages:
            ms += json.load(open(p))['measures']
        o = fablib.make(meta, {'type': 'tokens', 'parts': meta['parts'], 'measures': ms, 'partMeta': {}}, json.load(open(a.text)) if a.text else None)
    elif a.cmd == 'info':
        if fablib.is_pack(a.file):
            L = fablib.load_any(a.file)
            print('répertoire :', len(L), 'chants ·', round(os.path.getsize(a.file) / 1024), 'Ko')
            return
        o = fablib.read(a.file)
        sc = o['score']
        n = len(sc.get('measures', [])) if sc['type'] == 'tokens' else len(re.findall(r'<measure\b', sc.get('xml', '')))
        print(json.dumps({k: o.get(k) for k in ['id', 'title', 'composer', 'work', 'role', 'voice', 'style', 'period', 'ks', 'bpm', 'src']}, ensure_ascii=False, indent=1))
        print('partition :', sc['type'], '·', n, 'mesures', '· livret :', len((o.get('text') or {}).get('lines', [])), 'lignes', '· perso :', ', '.join((o.get('perso') or {}).keys()) or '—')
        return
    elif a.cmd == 'unpack':
        out = re.sub(r'\.fab$', '', a.file) + '.json'
        json.dump(fablib.read(a.file), open(out, 'w'), ensure_ascii=False, indent=1)
        print('→', out)
        return
    else:
        o = json.load(open(a.file))
        out = re.sub(r'\.json$', '', a.file) + '.fab'
        fablib.write(o, out)
        print('→', out)
        return
    last = (o.get('composer') or '').split()
    out = a.o or ((fablib.slug(last[-1]) + '-') if last else '') + fablib.slug(o['title']) + '.fab'
    fablib.write(o, out)
    print('→', out, round(os.path.getsize(out) / 1024, 1), 'Ko')


if __name__ == '__main__':
    main()
