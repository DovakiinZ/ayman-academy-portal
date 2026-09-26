#!/usr/bin/env python3
"""Static audit of app wiring: navigation targets and dead controls.

Complements `scripts/audit-schema.py`, which catches the *data* class of silent
failure (a button that runs and writes nothing because the column does not
exist). This one catches the *navigation* class: a link or a push to a route
that was never registered, which renders a blank screen or a 404 with no error
anywhere, and controls wired to nothing at all.

Both classes are invisible to a click-through smoke test on a happy path, which
is how they survive.

Usage:  python scripts/audit-app-wiring.py
Exit:   0 clean, 1 findings.
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(path, encoding='utf-8', errors='replace') as fh:
        return fh.read()


def walk(root, exts):
    for dirpath, _dirs, files in os.walk(root):
        if 'node_modules' in dirpath or os.sep + 'build' + os.sep in dirpath:
            continue
        for fn in files:
            if fn.endswith(exts):
                yield os.path.join(dirpath, fn)


findings = []


def add(kind, what, where):
    findings.append((kind, what, where))


# ══════════════════════════════════════════════════════════════════════════════
#  WEB
# ══════════════════════════════════════════════════════════════════════════════

app_tsx = read(os.path.join(REPO, 'src', 'App.tsx'))

# Registered routes. A `:param` segment matches anything, so routes are compared
# as patterns rather than literals.
web_routes = set(re.findall(r'<Route\s+path="([^"]+)"', app_tsx))


def route_matches(target, pattern):
    t = [p for p in target.strip('/').split('/') if p]
    r = [p for p in pattern.strip('/').split('/') if p]
    if r and r[-1] == '*':
        return t[:len(r) - 1] == r[:-1]
    if len(t) != len(r):
        return False
    return all(rp.startswith(':') or rp == tp for tp, rp in zip(t, r))


def web_route_known(target):
    if not target.startswith('/'):
        return True          # relative or external, not our problem
    if target.startswith('//') or '://' in target:
        return True
    target = target.split('?')[0].split('#')[0]
    return any(route_matches(target, p) for p in web_routes)


src_root = os.path.join(REPO, 'src')
for path in walk(src_root, ('.tsx', '.ts')):
    rel = os.path.relpath(path, REPO)
    if rel.endswith('App.tsx'):
        continue
    text = read(path)

    # <Link to="/x">, navigate('/x'), <Navigate to="/x">
    targets = []
    targets += [(m.group(1), m.start()) for m in re.finditer(r'\bto="(/[^"{}]*)"', text)]
    targets += [(m.group(1), m.start()) for m in re.finditer(r"""\bnavigate\(\s*['"](/[^'"]*)['"]""", text)]

    for target, pos in targets:
        if '${' in target or '{' in target:
            continue
        if not web_route_known(target):
            add('WEB ROUTE NOT REGISTERED', target, '%s:%d' % (rel, text[:pos].count('\n') + 1))

    # Controls wired to nothing.
    for m in re.finditer(r'onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}', text):
        add('WEB DEAD onClick', '() => {}', '%s:%d' % (rel, text[:m.start()].count('\n') + 1))
    for m in re.finditer(r'onClick=\{\s*undefined\s*\}', text):
        add('WEB DEAD onClick', 'undefined', '%s:%d' % (rel, text[:m.start()].count('\n') + 1))
    for m in re.finditer(r'\bhref="#"', text):
        add('WEB PLACEHOLDER href', '#', '%s:%d' % (rel, text[:m.start()].count('\n') + 1))
    for m in re.finditer(r'//\s*TODO[^\n]*', text):
        if 'onClick' in text[max(0, m.start() - 200):m.start()]:
            add('WEB TODO near handler', m.group(0)[:50], '%s:%d' % (rel, text[:m.start()].count('\n') + 1))


# ══════════════════════════════════════════════════════════════════════════════
#  FLUTTER
# ══════════════════════════════════════════════════════════════════════════════

flutter_lib = os.path.join(REPO, 'ayman_academy_flutter', 'lib')
routes_dart = read(os.path.join(flutter_lib, 'core', 'router', 'routes.dart'))
router_dart = read(os.path.join(flutter_lib, 'core', 'router', 'router.dart'))

# Routes class constants, e.g. `static const mySubjects = '/student/subjects';`
route_consts = dict(re.findall(r"static const (\w+)\s*=\s*'([^']+)'", routes_dart))

# Literal paths registered in the GoRouter tree, plus nested relative segments.
registered = set(route_consts.values())
for m in re.finditer(r"path:\s*'([^']+)'", router_dart):
    registered.add(m.group(1))
for m in re.finditer(r'path:\s*Routes\.(\w+)', router_dart):
    if m.group(1) in route_consts:
        registered.add(route_consts[m.group(1)])

# Nested GoRoutes use relative segments; reconstruct the full paths they form by
# joining any parent literal with each relative child.
relatives = [m.group(1) for m in re.finditer(r"path:\s*'([^'/][^']*)'", router_dart)]
absolutes = [p for p in registered if p.startswith('/')]
for parent in list(absolutes):
    for child in relatives:
        registered.add(parent.rstrip('/') + '/' + child)
        for parent2 in list(absolutes):
            registered.add(parent2.rstrip('/') + '/' + child)


def flutter_route_known(target):
    target = target.split('?')[0]
    for pattern in registered:
        if route_matches(target, pattern):
            return True
    return False


for path in walk(flutter_lib, ('.dart',)):
    rel = os.path.relpath(path, REPO)
    if 'core' + os.sep + 'router' in rel:
        continue
    text = read(path)

    for m in re.finditer(r"""context\.(?:push|go|replace)\(\s*'(/[^']*)'""", text):
        target = m.group(1)
        if r'$' in target:
            continue
        if not flutter_route_known(target):
            add('FLUTTER ROUTE NOT REGISTERED', target, '%s:%d' % (rel, text[:m.start()].count('\n') + 1))

    for m in re.finditer(r'onPressed:\s*\(\s*\)\s*\{\s*\}', text):
        add('FLUTTER DEAD onPressed', '() {}', '%s:%d' % (rel, text[:m.start()].count('\n') + 1))
    for m in re.finditer(r'onTap:\s*\(\s*\)\s*\{\s*\}', text):
        add('FLUTTER DEAD onTap', '() {}', '%s:%d' % (rel, text[:m.start()].count('\n') + 1))
    for m in re.finditer(r'//\s*TODO[^\n]*', text):
        add('FLUTTER TODO', m.group(0)[:60], '%s:%d' % (rel, text[:m.start()].count('\n') + 1))


# ══════════════════════════════════════════════════════════════════════════════

print('web routes registered     : %d' % len(web_routes))
print('flutter route patterns    : %d' % len(registered))
print()

if not findings:
    print('RESULT: no unregistered navigation targets and no dead controls.')
    sys.exit(0)

by_kind = {}
for kind, what, where in findings:
    by_kind.setdefault(kind, []).append((what, where))

for kind in sorted(by_kind):
    print('%s  (%d)' % (kind, len(by_kind[kind])))
    for what, where in by_kind[kind]:
        print('   %-44s %s' % (what, where))
    print()

sys.exit(1)
