"""Convert the Claude Design bundle (design/_ds_bundle.js) into an ES module (web/components/ds.js).
Re-run after a new design export:  python3 web/scripts_convert_ds.py"""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "design/_ds_bundle.js").read_text()
meta = json.loads(re.match(r"/\* @ds-bundle: (\{.*?\}) \*/", src).group(1))
names = [c["name"] for c in meta["components"]]
body = src.split("\n", 1)[1]                                   # drop the meta comment
# Keep only the design-system components: the bundle also carries the handoff config, the UI-kit screens and
# mock data (browser-only globals). Cut at the first non-component section, then re-append the export lines.
cut = min(i for i in (body.find("\n// handoff/"), body.find("\n// ui_kits/")) if i != -1)
registrations = "\n".join(re.findall(r"^__ds_ns\.[A-Za-z_]+ = __ds_scope\.[A-Za-z_]+;$", body, flags=re.M))
body = body[:cut] + "\n\n" + registrations + "\n\n})();"
body = body.replace("(() => {\n", "", 1)                       # drop the outer IIFE opener
body = re.sub(r"const __ds_ns = \(window\.[A-Za-z0-9_]+ = window\.[A-Za-z0-9_]+ \|\| \{\}\);",
              "const __ds_ns = {};", body, count=1)
body = body.rstrip()
assert body.endswith("})();"), body[-40:]
body = body[: -len("})();")]                                   # drop the outer IIFE closer
# App additions the design did not include: a Policy page in the sidebar.
nav_data = "  id: 'data',\n  icon: 'database',\n  label: 'Data'\n}];"
assert nav_data in body, "sidebar NAV changed in the design export"
body = body.replace(nav_data, nav_data[:-2] + ", {\n  id: 'policy',\n  icon: 'shield-check',\n  label: 'Policy'\n}];", 1)
exports = "\n".join(f"export const {n} = __ds_ns.{n};" for n in names)
out = ("'use client';\n/* Generated from design/_ds_bundle.js by web/scripts_convert_ds.py. Do not edit by hand. */\n"
       "/* eslint-disable */\nimport * as React from 'react';\n\n" + body +
       "\nif (__ds_ns.__errors && __ds_ns.__errors.length) console.error('Design system errors', __ds_ns.__errors);\n\n" + exports + "\n")
(root / "web/components/ds.js").write_text(out)
print(f"wrote web/components/ds.js with {len(names)} exports")
