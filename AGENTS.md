# AGENTS.md

## Goal

> **The highest quality flag library available.**

Everything here — artwork, packaging, API — is measured against that. Where a
rule bends, the exception is written down beside it with its reason: an
undocumented exception is just a mistake waiting to happen.

## Git

- No global gitconfig on this machine — set identity per-commit (do not write git config):
  `git -c user.name='ajbis' -c user.email='1932972+ajbis@users.noreply.github.com' commit ...`
  (matches all existing commit authors)

## Commands

Run everything through corepack: `corepack yarn <script>` (`packageManager: yarn@4.14.1`).

| Command                                      | What it does                                      |
| -------------------------------------------- | ------------------------------------------------- |
| `yarn dev`                                   | Test pages on the Vite dev server                 |
| `yarn start`                                 | Same, bound to `0.0.0.0` for device testing       |
| `yarn build`                                 | Library → `dist/` (ESM + `.d.ts` + `dist/flags/`) |
| `yarn build:docs`                            | Test pages → `docs/` for GitHub Pages             |
| `yarn typecheck`                             | `tsc -b` across the app and node projects         |
| `yarn lint`                                  | ESLint                                            |
| `yarn lint:styles`                           | Stylelint (`stylelint "**/*.{css,scss}"`)         |
| `yarn format` / `format:check`               | Prettier                                          |
| `yarn test` / `test:watch` / `test:coverage` | Vitest                                            |
| `yarn pack:check`                            | `npm pack --dry-run` — exactly what would ship    |

`prepublishOnly` runs every gate automatically before a publish, so a stale or broken build cannot ship.

**Two Vite configs.** `vite.config.ts` is the test pages and is the default, so `yarn dev` and `yarn build:docs` both target it. `vite.lib.config.ts` is the library. `vitest.config.ts` is standalone — see Tooling decisions below.

## Repo state

- Scaffolded as a **publishable npm package**: React + TypeScript + Vite
- `src/` is the library — `src/components/Flag/` plus `src/assets/flags/`
- `demo/` is the test pages: a **wall** view (flags at each display ratio) and a **playground** for exploring props live. It imports by package name (`doyouhaveaflag`, `doyouhaveaflag/flags/gb.svg`) and Vite aliases those back to source, so dev gets HMR with no build step
- `docs/` is `demo/` **built** — the output of `yarn build:docs`, committed for GitHub Pages. It is generated, not authored, so it goes stale: rebuild it whenever `demo/` or the shipped flags change
- Only the **Union Flag** ships (`gb.svg`). Everything under `working/ref/` is reference for recreating our own artwork — the Commons corpus is not the library's contents
- `.gitignore` is the standard Node template, plus `working/ref/` at the end
- `working/ref/` holds reference material and is deliberately gitignored — don't "fix" it. `working/` stays untracked until it holds a file (git ignores empty dirs)

## Architecture

Decisions settled and browser-verified, now implemented in `src/`. Deviations from the original spec are called out inline.

### Assets

- Ship real `.svg` files and render through `<img>` — **not** React-generated inline SVG
- Native `loading="lazy"` exists only on `<img>`/`<iframe>`; an inline `<svg>` fetches nothing, so there is no request to defer and every flag would ship inside the JS bundle instead
- Shipped assets carry a `viewBox` of the flag's **native dimensions** (Union Flag `0 0 50 30`) and **no `width`/`height`** — `object-fit` needs only the ratio, which the `viewBox` supplies. Most Commons artwork arrives with both, so normalise on ingest
- **Built as inline styles, not the stylesheet below.** The package ships no CSS at all: a consumer never has to remember an import, and there is no stylesheet for `sideEffects` to drop. `Flag.tsx` applies these rules as `style` props instead. The `.flag` class still exists as the consumer's styling hook — it is always present, and `className` merges onto it

### The `<picture>` wrapper

The `<picture>` is the single styling hook — class, border, radius and rounding all hang off it.

```css
.flag {
  display: block;
  width: 100%;
  overflow: hidden;
}
.flag > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- `<picture>` defaults to `display: inline` — without `display: block`, `border`, `border-radius` and `overflow` do nothing
- `object-fit` is **not inherited**: declared on the `<picture>` it leaves the `<img>` at `fill` and the image fails to fill its box. It must address `picture > img`
- `object-position` likewise goes on the child, selected by the class on the `<picture>`

### Crop and ratios

- Crop model: `object-fit: cover`, origin **centre**
- Display options: `4:3`, `3:2`, `1:1`, `Native` — **default `3:2`**
- `3:2` equals the most common flag ratio (2:3), so the default shows most flags uncropped; `4:3` would crop essentially every flag
- Do **not** support the official 1:2 Union Flag
- Ratio convention is split by audience: the selector and all code use **width:height** (must equal `aspect-ratio` and the `viewBox`); reference tables stay **height:width** to match Wikipedia / Flag Institute / FOTW. Label each section's convention and note `3:2` ≡ `2:3`

### Alignment

- **No modifier classes.** Alignment sets `object-position` on the `<img>` inline, using the CSS `object-position` vocabulary: `center`, the four edges, and the four corners
- **Centre is the baseline and emits no rule at all** — `Flag.tsx` omits the declaration unless `align` deviates from `center`, so the CSS default does the work. The original plan was per-alignment classes with names TBD; inline styles made the class names unnecessary while preserving the "only where it deviates" rule

### Accessibility

- No country name in the SVG `<title>` — it locks the asset to English only
- The a11y text setting takes **text plus a lang code** and passes both through (`alt` + `lang` on the `<img>`). Whether that's a country, region, ISO code, English, or the country's own language is up to the use case, not the library

### Lazy loading

Two mechanisms, chosen by context:

- **Dropdown rows** — `data-src` + `IntersectionObserver` with `root` = the dropdown, `threshold: 0`
- **Flags in normal page flow** — native `loading="lazy"`, which is correct there because the document viewport _is_ the right root

`loading="lazy"` cannot serve the dropdown: its root is the document viewport carrying an ~800px margin (measured — a row 804px below the fold fetched, 837px did not), and a 300px dropdown near the top of the page puts ~36 clipped rows inside that margin. Measured on 60 images in a 300px scroll container:

| Phase                       | `loading="lazy"`      | IO `root: panel` |
| --------------------------- | --------------------- | ---------------- |
| dropdown closed             | 1 (pre-selected only) | 1                |
| after open — 9 rows visible | 45                    | **9**            |
| after scroll                | 60                    | 18               |

IntersectionObserver also never fetches rows that were never on screen (18 vs 60). Note that `data-src` rows have no `src`, so `loading="lazy"` is inert on them — drop it there rather than layering the two.

### Format — SVG or PNG

No library-wide default: format is a **per-flag × per-display-size** decision.

- At selector size (~32–64px) PNG beats SVG on every heavy flag by 15×–113×
- At 600px SVG still wins for Mexico, Peru and Turkmenistan; Ecuador and Peru (civil) are PNG winners at every size
- **Variant selection is the biggest lever**: Ecuador civil 303 B vs state 279,145 B (922×); Peru civil 381 B vs state 138,213 B (363×) — default to the civil variant
- Corpus of 195 sovereign flags: 986.9 KiB gz total, median 310 B, mean 5,183 B — the top decile (19 flags) is 78.5% of the bytes

Open at build time: the per-alignment class names, and whether the heavy tail ships PNG variants.

## Packaging (npm)

What differs from shipping a library rather than an app, and why:

- **ESM only** — `formats: ['es']` with `type: module`, no CJS build. React libs are ESM-first and consumers are bundlers; a second CJS bundle would buy compatibility nobody needs and risks the dual-package hazard
- **`files: ["dist"]`** — npm publishes anything not ignored, so the payload is an explicit allowlist. `tsconfig.build.json` excludes `__tests__` and `*.test.*`, so tests never reach `dist/`
- **`exports` map** — `.` for the component, `./flags/*.svg` for the artwork, `./package.json`
- **`dist/flags.d.ts` backs the `.svg` types condition** — it exports `src` as a plain string. Without it a consumer's `import gb from 'doyouhaveaflag/flags/gb.svg'` fails to typecheck. It lives in `types/`, deliberately outside `src/` so it never joins our own program where `vite/client` already declares `*.svg`; `copyFlags()` in `vite.lib.config.ts` copies it into `dist/` on every build
- **React is a `peerDependency`** — bundling it gives consumers two copies of React and broken hooks
- **`sideEffects: false`** — safe only because the package ships no CSS. Any stylesheet added later **must** be listed here or bundlers will silently drop it
- **`prepublishOnly`** runs every gate, so a stale or broken build cannot ship
- **`npm pack` is the real test** — `yarn pack:check` shows exactly what ships; installing that tarball into a scratch project is how the exports map, the `.svg` types and the lifecycle scripts were verified

### Asset inlining is a consumer dial

The package cannot force artwork to stay out of the JS. `assetsInlineLimit` (Vite default `4096`) decides per file whether it base64s into the bundle or emits as a file — and it is a **continuous dial**, not all-or-nothing: `0` makes everything a file, any other value just moves the cutoff.

- **Light flags inline** — no request, nothing to lazy-load, and you pay only for the flags you actually import
- **Heavy flags emit** — cacheable, and deferrable by `loading="lazy"` or the IntersectionObserver strategy, which only works on a real URL
- By default the expensive ones are the ones you can defer (top decile of a full set = 78.5% of bytes), so **no configuration is required**
- `new URL(..., import.meta.url)` does **not** escape this — verified, it inlines too

### Lifecycle scripts

- **Yarn 4 runs `postinstall` but not `prepare`** — verified with marker files. So `prepare: "husky"` (husky's own advice, correct under npm/pnpm) never initialises hooks here
- **`postinstall` also runs in a consumer's install**, where husky is absent — that failed a consumer install with exit 127 until it was guarded
- Hence `postinstall: "husky || exit 0"`. The guard is `exit 0` rather than `true` because `true` is not a cmd.exe command, so `|| true` would break Windows consumers
- husky itself already bails cleanly when `.git` is missing, so the guard is really only covering the missing-binary case

## Tooling decisions

- **`react/prop-types` is `off`** — redundant under TypeScript (the compiler already validates props) and a false-positive magnet: it fired on a local array named `props`
- **`vitest.config.ts` does not merge `vite.config.ts`** — that file sets `root: demo/`, which would hide `src/` from the runner. It declares the React plugin itself instead
- **No stylesheet** — see Architecture → Assets
- **No `vite-plugin-dts`** — declarations come from `tsc -p tsconfig.build.json` with `emitDeclarationOnly`, which is zero-dependency and predictable

## Flag artwork

How every shipped `.svg` is built. Reference material — Wikimedia Commons,
FOTW — is for exploration only; see
[Sourcing and licensing](#sourcing-and-licensing).

### Construction rules

1. **Field first, always.** The first element is `<rect width="{W}" height="{H}">`
   filling the `viewBox` exactly, with no `x`/`y`. If it doesn't cover the field,
   something is wrong.
2. **Everything after the field is an overlay**, in construction order:
   field → fimbriation → charge → emblem.
3. **Overlap, don't abut.** A three-stripe flag is the field plus two panels
   drawn _on top of_ it, not three panels side by side: one clean antialiased
   edge instead of two, and no gap to the background if a coordinate lands a
   hair off.
4. **`viewBox` only** — no `width`/`height` on the `<svg>`. Reference artwork
   almost always carries both; strip them on ingest.
5. **Every number traceable to a construction sheet.** If a coordinate isn't in
   the spec it must be derivable from it in one sentence.
6. **Flat literal-hex fills.** No gradients in field or stripe geometry and no
   `currentColor` — the file has to render standalone inside `<img>`.
7. **ids prefixed per flag** (`gb-counterchange`, never `t`).
8. **Strip everything else on ingest** — rdf, dc, inkscape, metadata. In the
   reference set, most of a heavy file's bytes are not geometry at all.

### Primitives first, merged shapes by exception

Layer primitive shapes — `<rect>`, `<circle>`, `<polygon>` — by default. A
shape's coordinates should be the spec's numbers: `<rect x="22" width="6">`
reads straight off the sheet, where a merged cross path's eight corner
coordinates do not. Primitives are also easier to correct, and for opaque fills
overlapping primitives rasterise identically to a merged outline.

Merge into a single path only where it buys something:

1. **The shape will be stroked.** Stroke is centred on the path, so stroking two
   overlapping rectangles draws the second rectangle's outline straight across
   the first one's fill. Fimbriation is the usual trigger.
2. **Merging removes a clip or mask.**
3. **No primitive fits** — crescents, saltires, charges.

### Exceptions

Recorded here with their reasons, so they stay justified.

**Union Flag saltire — `clipPath`.** The counterchange cannot be produced by
concentric layering at all: each diagonal is 6 units split **white 3 / red 2 /
white 1**, and a centred stroke cannot be asymmetric. The file draws white
stroke 6 and red stroke 4, both centred on the diagonal, then clips the red to
one side of the centreline in each quadrant — all four clip edges lie exactly on
the diagonals, so the red keeps precisely 2 of its 4 units, offset. The cost is
rule 5: `stroke-width="4"` is an artifact of the trick rather than a spec number
(the spec's number is red 2). Should we ever want every file
readable-as-rendered, or start inlining them, the replacement is four offset
stroke segments — one per quadrant, each on a centreline shifted 1 unit
perpendicular.

### Sourcing and licensing

**Research from the specification, then draw our own.** The numbers —
proportions, construction, colour — come from the body that owns the flag,
because that is the authoritative version. The artwork is ours: no third
party's file goes into `src/`.

Wikimedia Commons and FOTW are inputs to that research, not to the package.
`working/ref/` holds downloaded Commons material for exactly that purpose.

Copyright is why the distinction matters. It protects expression rather than
ideas or facts, but a flag design sits awkwardly between the two: whether one is
protected depends on where it was made and whether an official government made
it, and the originality threshold varies by country — the Australian Aboriginal
flag was a copyrighted work until the Australian government bought it in 2022.
Rather than reason through that each time, avoid the question: building from
published numbers is creating, taking a file is copying.

Getting the numbers right and being entitled to use what we built are separate
checks, so log both per flag:

- **United Kingdom** — Flag Institute specification
  (<https://www.flaginstitute.org/wp/uk-flags/union-flag-specification/>),
  source of the `## Union Flag` numbers. Reference SVG: Wikimedia Commons
  `Flag of the United Kingdom (3-5).svg` (vector by _Yaddah_, design data from
  FOTW) — **public domain**: a UK Government artistic work (HMSO Crown
  Copyright expiry), marked CC Public Domain Mark 1.0. The saltire construction
  still descends from it; the field and cross have been re-expressed as ours.
- Add a line per flag as it lands: the specification consulted, and the licence
  of anything used as reference.

Colour follows the same route: where the official source gives a Pantone,
convert from that rather than taking whatever RGB a reference file carries.

Separately from copyright, many jurisdictions restrict how a national flag may
be used — misuse, derogatory depiction, commercial use. Those rules are
independent of a file's licence and generally concern how a flag is flown rather
than how it is drawn, but they are worth knowing about.

## Flag aspect ratios (for SVG viewBoxes)

Ratios are written **height:width** (the vexillological convention used on Wikipedia); the decimal form is width ÷ height. So a "2:3" flag is landscape — 1.5× wider than it is tall.

- **2:3** → 1.5 — France, Spain, Egypt — the most common ratio worldwide
- **1:2** → 2.0 — New Zealand, Canada, Israel — second most common
- **3:5** → 1.667 — Germany, Bulgaria, Luxembourg, **United Kingdom** (3:5 on land, 1:2 at sea) — a distant third
- **5:8** → 1.6 — Sweden, Poland, Argentina
- **8:11** → 1.375 — Norway
- **7:11** → 1.571 — Estonia
- **1:1** → 1.0 — Switzerland, Vatican City (square)

Non-rectangular and unusual:

- **Nepal** — the only non-rectangular national flag: two stacked pennants, so there is no bounding rectangle to copy
- **Qatar** — 11:28 → 2.545, the longest national flag
- **Togo** — golden ratio, φ ≈ 1.618

Per-country ratios are frequently miscited — confirm on Wikipedia when building a specific flag rather than trusting a grouping (Russia and India are 2:3, not 3:5).

Official artwork: Wikimedia Commons serves the SVG at `https://commons.wikimedia.org/wiki/Special:FilePath/<file name>`. The UK set — all five official ratios plus the construction sheet — is downloaded in `working/ref/`.

## Flag sizes

Render height **600px**, width = `height × (b/a)` for a ratio of h:w = a:b. Stay on or around 600 — nudge the height by a few px to buy an integer width rather than dropping to a smaller size.

| Ratio          | Height | Width | Notes                                 |
| -------------- | ------ | ----- | ------------------------------------- |
| 1:1            | 600    | 600   | exact                                 |
| 8:11           | 600    | 825   | exact                                 |
| 2:3            | 600    | 900   | exact                                 |
| 5:8            | 600    | 960   | exact                                 |
| 3:5            | 600    | 1000  | exact                                 |
| 1:2            | 600    | 1200  | exact                                 |
| 7:11 (Estonia) | 602    | 946   | height nudged 600 → 602 for ÷7        |
| 11:28 (Qatar)  | 605    | 1540  | height nudged 600 → 605 for ÷11       |
| φ (Togo)       | 600    | 971   | irrational — round the width (970.82) |

- 600 = 2³ × 3 × 5², so it is divisible by the first numbers 1, 2, 3, 5 and 8 — every common ratio is already exact at 600 with no change
- Only a first number of 7 or 11 forces a nudge, and the nearest multiples sit within 6px of 600: **602** and **605** (595 and 594 also work if you want the height just under)
- φ can never be exact at any height
- The exact ratio lives in the `viewBox` as a clean unit grid (Union Flag: `0 0 50 30`); the shipped `<svg>` carries no `width`/`height` (see Architecture → Assets), so render size comes from CSS and a fractional render width is cosmetic and never a geometry error

## Union Flag

Construction units, on a 30 × 50 field (spec: <https://www.flaginstitute.org/wp/uk-flags/union-flag-specification/>):

- Field **30 wide × 50 long** (3:5) on land; **1:2 at sea** replaces the 50 with 60, and the diagonal angle 30.96° with 26.57°
- Each diagonal is **6 units** total — white 3, red 2, white 1; centrelines run corner to corner and cross at the flag's centre
- Red St George cross **6 units** wide, edge to edge and centred, with a **2-unit** white fimbriation
- Hoist is the left edge: the **broader white diagonal must be uppermost next to the pole** — otherwise the flag is upside down

Colours (RGB — these are web assets, no print values needed):

- Blue `#012169` (1, 33, 105) — Pantone 280 C
- Red `#C8102E` (200, 16, 46) — Pantone 186 C
- White `#FFFFFF`
- All six downloaded SVGs use exactly these three. The Flag Institute diagram in `working/ref/` quotes a different RGB for the same two Pantones (`#00247D` / `#CF142B`) — its own conversion, so don't "correct" the SVGs to match it
