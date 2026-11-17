# nivo-web-lite gallery

One folder per screen: its shots at each width and the explanation of every region (PROJECT-GALLERY-1, PROJECT-GALLERY-2). The gallery app is a thin config over @starci/gallery: vite.config.js is the whole of it.

- `pages/<area>/<screen>/` is one screen (one agent, one state). It holds only the shots `<width>.png` (1440 and 390), the explanation file explain.md and the optional links.json, nothing else. A state or an agent variant is its own folder (`<screen>-empty`, `<screen>-loading`, `<screen>-error`); before and after comparisons belong in fix reports.
- explain.md has a front matter (`title`, `route`, `area`) and one `## <region name>` per region, each with the lines `Vì sao:`, `Luật:` (a memory file name or a contexts anchor) and `Grammar:`. A region that cannot be explained with a law and a Grammar reference is a bug: fix it before reporting; CHƯA RÕ or SAI is a warning locally and an error in `starci app check --env prod`.
- links.json lists hotspots of the screen, `{ "to": "<area>/<screen>", "x", "y", "w", "h" }` (fractions of the shot); flows.json names ordered screen ids, `{ "<flow name>": ["<area>/<screen>"] }`. The Flow map view draws them.
- The design canvas (the canvas folder of .starcistacks, PROJECT-GALLERY-6) gives each screen its approved frame beside the real shot and its status dot (design.json): matches green, built but differs amber, stale red, not built grey.
- `npm install && npm run dev` serves it on http://localhost:3750 (the app base port + 50); `starci app stack up --env dev` starts it with the app. New files appear on reload. The gallery shows only the screens that have an explain.md or a design entry; `starci app check` fails on the others.
- The PNGs are git-ignored; explain.md, links.json, flows.json and vite.config.js are source, the config managed by `starci app sync`.
