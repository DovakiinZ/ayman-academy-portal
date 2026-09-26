#!/usr/bin/env python3
"""Audit every table / column / RPC the app touches against the LIVE schema.

Why this check rather than clicking around: the documented failure mode in this
codebase is a button that runs, reports success, and writes nothing, because the
column or function it names does not exist. The quiz editor did exactly that, and
five RPCs the UI called were missing entirely. Those bugs are invisible to a
smoke test and obvious to this one.

Schema source: `supabase gen types typescript --project-id ...` - the live
database, not the hand-written src/types/database.ts, which has drifted before.
"""
import os
import re
import sys

# Regenerate the schema first (the Supabase CLI must be logged in):
#   supabase gen types typescript --project-id lkdbinrwojvrchunzqfq > schema.live.ts
#
# Write it with a tool that does NOT prepend a BOM. PowerShell's `>` redirect
# does, and an earlier version of this parser silently matched nothing because
# of it, reporting every table in the app as missing. The file is opened as
# utf-8-sig below so a BOM is tolerated, but it is worth knowing.
SCHEMA_TS = os.environ.get('WARAQ_SCHEMA_TS') or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'schema.live.ts')
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 1. Parse the generated types ──────────────────────────────────────────────
# A brace-depth scan, not a regex: the file is deeply nested, and the earlier
# regex version silently matched nothing (reporting every table as missing)
# because of CRLF line endings plus a BOM from PowerShell's `>` redirect.

raw = open(SCHEMA_TS, encoding='utf-8-sig').read().replace('\r\n', '\n')
lines = raw.split('\n')


def indent_of(line):
    return len(line) - len(line.lstrip(' '))


def find_block(start_idx, header_re):
    """Index of the line matching header_re at/after start_idx, else None."""
    for i in range(start_idx, len(lines)):
        if re.match(header_re, lines[i]):
            return i
    return None


def children_of(header_idx):
    """Yield (name, start, end) for each `name: {` directly inside a block."""
    base = indent_of(lines[header_idx])
    i = header_idx + 1
    while i < len(lines):
        line = lines[i]
        if line.strip() == '':
            i += 1
            continue
        ind = indent_of(line)
        if ind <= base and line.strip().startswith('}'):
            return
        m = re.match(r'^\s*(\w+): \{\s*$', line)
        if m and ind == base + 2:
            # walk to the matching close brace
            depth = 1
            j = i + 1
            while j < len(lines) and depth > 0:
                depth += lines[j].count('{') - lines[j].count('}')
                j += 1
            yield m.group(1), i, j
            i = j
            continue
        i += 1


tables = {}
functions = set()

pub = find_block(0, r'^  public: \{')
if pub is None:
    raise SystemExit('could not find the public schema block')

for section in ('Tables', 'Views'):
    idx = None
    for i in range(pub, len(lines)):
        if re.match(r'^    %s: \{' % section, lines[i]):
            idx = i
            break
    if idx is None:
        continue
    for tname, s, e in children_of(idx):
        cols = set()
        for k in range(s, e):
            if re.match(r'^\s*Row: \{', lines[k]):
                depth = 1
                j = k + 1
                while j < len(lines) and depth > 0:
                    depth += lines[j].count('{') - lines[j].count('}')
                    if depth > 0:
                        cm = re.match(r'^\s*(\w+)\??:', lines[j])
                        if cm:
                            cols.add(cm.group(1))
                    j += 1
                break
        tables[tname] = cols

for i in range(pub, len(lines)):
    if re.match(r'^    Functions: \{', lines[i]):
        for fname, _s, _e in children_of(i):
            functions.add(fname)
        break

print('LIVE SCHEMA: %d tables/views, %d functions' % (len(tables), len(functions)))
if len(tables) == 0:
    raise SystemExit('parser found nothing - refusing to report false positives')
print()

# ── 2. Collect call sites ─────────────────────────────────────────────────────

TARGETS = [
    ('web', os.path.join(REPO, 'src')),
    ('flutter', os.path.join(REPO, 'ayman_academy_flutter', 'lib')),
]

FROM_RE = re.compile(r"""\.from\(\s*['"](\w+)['"]\s*\)""")
# Covers `.rpc('x')`, `.rpc<T>('x')` and `(supabase.rpc as any)('x')` - the last
# form is used all over src/lib and a narrower pattern missed it entirely,
# hiding two nonexistent certificate RPCs on the first pass.
RPC_RE = re.compile(r"""\.rpc(?:\s+as\s+any\))?\s*(?:<[^>]*>)?\(\s*['"](\w+)['"]""")
SELECT_RE = re.compile(r"""\.select\(\s*['"]([^'"]*)['"]""")

# `.from('avatars')` on storage is not a Postgres table; storage buckets use
# `.storage.from(...)`. Track them so they are not reported as missing tables.
STORAGE_RE = re.compile(r"""\.storage\s*\n?\s*\.from\(\s*['"](\w+)['"]""")

problems = []
seen_tables = {}
seen_rpcs = {}
storage_buckets = set()


def walk(root, exts):
    for dirpath, _dirs, files in os.walk(root):
        for fn in files:
            if fn.endswith(exts):
                yield os.path.join(dirpath, fn)


for label, root in TARGETS:
    if not os.path.isdir(root):
        continue
    exts = ('.tsx', '.ts') if label.startswith('web') else ('.dart',)
    for path in walk(root, exts):
        text = open(path, encoding='utf-8', errors='replace').read()
        rel = os.path.relpath(path, REPO)

        for m in STORAGE_RE.finditer(text):
            storage_buckets.add(m.group(1))

        for m in FROM_RE.finditer(text):
            t = m.group(1)
            # skip storage bucket references
            back = text[max(0, m.start() - 60):m.start()]
            if '.storage' in back:
                storage_buckets.add(t)
                continue
            seen_tables.setdefault(t, set()).add(label)
            if t not in tables:
                line = text[:m.start()].count('\n') + 1
                problems.append(('MISSING TABLE', t, '%s:%d' % (rel, line)))

        for m in RPC_RE.finditer(text):
            f = m.group(1)
            seen_rpcs.setdefault(f, set()).add(label)
            if f not in functions:
                line = text[:m.start()].count('\n') + 1
                problems.append(('MISSING RPC', f, '%s:%d' % (rel, line)))

        for fm in FROM_RE.finditer(text):
            t = fm.group(1)
            if t not in tables:
                continue
            tail = text[fm.end():fm.end() + 400]
            sm = SELECT_RE.search(tail)
            if not sm:
                continue
            rawsel = sm.group(1)
            if '*' in rawsel or '(' in rawsel:
                continue
            for col in [c.strip() for c in rawsel.split(',')]:
                col = col.split(':')[-1].strip()
                col = re.sub(r'::.*$', '', col)
                if not col or not re.fullmatch(r'\w+', col):
                    continue
                if col not in tables[t]:
                    line = text[:fm.start()].count('\n') + 1
                    problems.append(('MISSING COLUMN', '%s.%s' % (t, col), '%s:%d' % (rel, line)))

# ── 3. Report ─────────────────────────────────────────────────────────────────

missing_t = sorted({w for k, w, _ in problems if k == 'MISSING TABLE'})
missing_r = sorted({w for k, w, _ in problems if k == 'MISSING RPC'})
missing_c = sorted({w for k, w, _ in problems if k == 'MISSING COLUMN'})

print('TABLES referenced: %d, all present: %s' % (len(seen_tables), not missing_t))
print('RPCs   referenced: %d, all present: %s' % (len(seen_rpcs), not missing_r))
if storage_buckets:
    print('storage buckets (not tables): %s' % ', '.join(sorted(storage_buckets)))
print()

if not problems:
    print('RESULT: every table, column and RPC referenced exists in the live database.')
else:
    print('FINDINGS')
    seen = set()
    for kind, what, where in problems:
        k = (kind, what)
        if k in seen:
            continue
        seen.add(k)
        print('  %-15s %-42s %s' % (kind, what, where))
    print()
    print('  missing tables: %d, missing RPCs: %d, missing columns: %d'
          % (len(missing_t), len(missing_r), len(missing_c)))


sys.exit(1 if problems else 0)
