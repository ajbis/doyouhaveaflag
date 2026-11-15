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

- Ship real `.svg` files and draw them through **`<use>`** — not React-generated inline SVG, and no longer through `<img>` either. The file stays a file; the page asks for it by reference
- **Why not `<img>`.** An `<img>` is a closed picture: nothing inside it can be addressed, so the named shapes we need to recolour or later move are unreachable from the page. A `<use>` clones the artwork into a _closed_ shadow tree too — measured: `shadowRoot` is `null` and `querySelector('.mark')` finds nothing — but **inherited custom properties do reach in**, and that is the one channel that lets a host recolour named shapes without editing the file
- **Why not inline React SVG either.** Every flag would ship inside the JS bundle, and the artwork could no longer be cached, opened as a file, or lazily fetched
- Shipped assets carry a `viewBox` of the flag's **native dimensions** (Union Flag `0 0 50 30`), **no `width`/`height`**, and a root `id` equal to the filename stem (`gb`) — which is the fragment `<use href="…#gb">` targets
- **Built as inline styles, not the stylesheet below.** The package ships no CSS at all: a consumer never has to remember an import, and there is no stylesheet for `sideEffects` to drop. `Flag.tsx` applies these rules as `style` props instead. The `.flag` class still exists as the consumer's styling hook — it is always present, and `className` merges onto it

### The wrapper

The wrapper `<span>` is the single styling hook — class, border, radius and rounding all hang off it. `<Artwork>` renders it; `<Flag>` supplies the `flag` class.

```css
.flag {
  display: block;
  width: 100%;
  overflow: hidden;
}
.flag > svg {
  display: block;
  width: 100%;
  height: 100%; /* auto when the box ratio comes from the artwork */
  overflow: hidden;
}
```

- A `<span>` defaults to `display: inline` — without `display: block`, `border`, `border-radius` and `overflow` do nothing
- The crop lives entirely on the `<svg>`: its `viewBox` is the artwork's own geometry and `preserveAspectRatio="… slice"` is `object-fit: cover`
- `height: 100%` while the wrapper has an `aspect-ratio` (the box has a height to fill). Without one the height is `auto`, so the artwork's own ratio sizes the box and nothing is cropped
- **`data:` → `blob:` shim.** `<use>` renders **nothing at all** for a `data:` target — silently, no console message — and bundlers inline assets under `assetsInlineLimit` by default, so an ordinary small flag would simply vanish. `Artwork` therefore decodes a `data:` source into a `blob:` URL in a layout effect: settled before first paint, and non-existent on the server, where server and client both render without the `<use>` and so hydrate to the same tree

### Crop and ratios

- Crop model: `preserveAspectRatio="… slice"`, which is `object-fit: cover`, anchored at the **centre** by default (see Alignment)
- Display options: `4:3`, `3:2`, `1:1`, `Native` — **default `3:2`**
- `3:2` equals the most common flag ratio (2:3), so the default shows most flags uncropped; `4:3` would crop essentially every flag
- Do **not** support the official 1:2 Union Flag
- Ratio convention is split by audience: the selector and all code use **width:height** (must equal `aspect-ratio` and the `viewBox`); reference tables stay **height:width** to match Wikipedia / Flag Institute / FOTW. Label each section's convention and note `3:2` ≡ `2:3`

### Alignment

- **Alignment is per flag, never per instance.** Which part of a flag is dispensable is a fact about the flag — the Union Flag is always centred, a canton flag would always favour its hoist — so it lives on the descriptor as `ArtworkSource.align` and `Flag` passes it straight through instead of accepting it as a prop. `FlagAlign` was deleted with the prop; `Align` stays, because `Artwork` still takes it
- **`align` was cut from `FlagProps` for a second reason.** The follow-up artwork offsets (offset/scale of named shapes) are meant to control fit, so a caller-facing anchor would be a second, competing mechanism composing unpredictably with them. Fit needs exactly one owner, and it is the artwork
- **Centre is the default.** `xMidYMid slice` is right for the balanced designs — saltires, tricolours, discs, crosses — that make up most flags, and for a horizontal crop of a vertical tricolour it is the only anchor that leaves the hoist and fly bands equal to each other
- **No modifier classes.** The anchor maps to the `preserveAspectRatio` attribute inline, using the CSS `object-position` vocabulary: `center`, the four edges, and the four corners
- **`slice` is always emitted**, and so is the centre anchor — unlike `object-position`, it cannot be left to a default, because an `<svg>`'s own default is `meet` (contain). The "only where it deviates" rule that governed `object-position` does not survive the change of mechanism, and the reason is recorded here rather than silently dropped
- Both axes are always named. `slice` decides for itself which one overflows; naming the other is a no-op rather than a conflict

### Accessibility

- No country name in the SVG `<title>` — it locks the asset to English only
- The a11y text setting takes **text plus a lang code** and passes both through: `role="img"` + `aria-label` + `lang` on the `<svg>`. Whether that's a country, region, ISO code, English, or the country's own language is up to the use case, not the library
- An empty `alt` (the default) marks the artwork decorative — the `<svg>` gets `aria-hidden` instead of a role, matching what `alt=""` meant on the old `<img>`

### Lazy loading

**`<use>` has no native lazy loading.** Measured: a `<use>` fetches its target the moment it enters the document — offscreen, and even inside a `display:none` subtree — where `<img loading="lazy">` waits. `loading="lazy"` therefore has to gate the **element's existence**, not a `src`: `Artwork` holds the `<use>` out of the document until an `IntersectionObserver` fires.

- The observer uses the **viewport** root with `rootMargin: '1000px'`. Native lazy loading's real advantage was its connection-aware distance threshold, which prefetched well ahead of the fold so a fast scroll never reached empty boxes; a bare `threshold: 0` waits for actual intersection and gives that back
- **Inlined sources are never gated.** A `data:` flag has no request to defer, so gating it would only delay the paint. `loading="lazy"` is deliberately inert there — which is also what the README promises
- **A panel-rooted variant is not implemented** (there is no dropdown yet). It wants `root` = the panel and `threshold: 0`, because a clipped panel's rows are not "near the viewport" in any useful sense. The measurements below are why that combination exists rather than the one above:

Measured on 60 images in a 300px scroll container, native `loading="lazy"` vs IO with `root: panel`, `threshold: 0`:

| Phase                       | `loading="lazy"`      | IO `root: panel` |
| --------------------------- | --------------------- | ---------------- |
| dropdown closed             | 1 (pre-selected only) | 1                |
| after open — 9 rows visible | 45                    | **9**            |
| after scroll                | 60                    | 18               |

Native `loading="lazy"` also cannot serve a dropdown at all: its root is the document viewport carrying an ~800px margin (measured — a row 804px below the fold fetched, 837px did not), and a 300px dropdown near the top of the page puts ~36 clipped rows inside that margin. IntersectionObserver never fetches rows that were never on screen (18 vs 60).

### Colour

Every paint in a shipped file is `var(--flag-<role>, <hex>)` — the flag's own colour as the fallback — so a file renders exactly as authored until someone supplies values. Three roles:

- `--flag-ink` — the ground
- `--flag-tint` — one step lighter; the charge
- `--flag-paper` — the lightest; fimbriation

Because they are **inherited** custom properties, they can be set on _any ancestor_ and still reach the shapes inside the closed `<use>` shadow tree. That is the entire mechanism: no API, no prop, just ordinary CSS — so brand colours, dark mode and design tokens all work for free.

`mono` is shorthand that sets the three on the wrapper: `TONES.k100` / `TONES.k60` / `TONES.k0`. The ramp is exported as `TONES` (`k100`, `k80`, `k60`, `k40`, `k20`, `k0`) — print's term for black, each step being n% ink over white, so `k60` is `0.6 × #000 + 0.4 × #fff` = `#666666`.

- **Purpose is decoration and UI states**, not identification: a green flag and a red flag are _meant_ to look alike in mono, so cross-flag collisions are accepted outright
- **The real constraint is within a flag** — no two abutting regions may share a tone. `k100` / `k60` / `k0` gives black, mid-grey and white, and every pairing separates
- `k60` rather than a true mid-grey: `#666666` gives 5.7:1 against paper, where `#808080` gives 3.95:1 and misses WCAG AA for text
- `mono` sets the variables on the wrapper itself, so it outranks a value set on an ancestor. Overriding a mono flag means targeting its wrapper

### `<Artwork>` and the descriptor

`Artwork` is the primitive: a referenced vector drawn into a sized, cropped box. It owns the mechanics — geometry (as `viewBox`, or `width` + `height`, or `nativeRatio`), the display box, the crop anchor, the `<use>`, the `blob:` shim, the observer, a11y — and knows nothing about flags, palettes, or which ratios are worth offering.

`Flag` supplies the flag meaning: the descriptor, the `FlagRatio` set and its `3:2` default, the `flag` class, `rounded`, and `mono`.

**The descriptor is the coupling.** `ArtworkSource` is `{ id, src, viewBox, align? }` — the facts about a file that the renderer needs and cannot recover by measurement, because the `<use>` shadow tree is closed, plus the one crop decision that belongs to the flag rather than to the caller. The demo's `FlagEntry extends ArtworkSource`, so one object is both the catalogue entry and the prop, and the `viewBox` is asserted against the shipped file in tests so it cannot drift from what ships.

Exported from the package root: `Artwork`, `ArtworkProps`, `ArtworkSource`, `Align`, `TONES`, alongside `Flag`, `FlagProps` and `FlagRatio`.

### Format — SVG or PNG

No library-wide default: format is a **per-flag × per-display-size** decision.

- At selector size (~32–64px) PNG beats SVG on every heavy flag by 15×–113×
- At 600px SVG still wins for Mexico, Peru and Turkmenistan; Ecuador and Peru (civil) are PNG winners at every size
- **Variant selection is the biggest lever**: Ecuador civil 303 B vs state 279,145 B (922×); Peru civil 381 B vs state 138,213 B (363×) — default to the civil variant
- Corpus of 195 sovereign flags: 986.9 KiB gz total, median 310 B, mean 5,183 B — the top decile (19 flags) is 78.5% of the bytes

**PNG is now incompatible with recolouring.** A PNG has no named shapes and no `var()`, so a PNG variant could never take `--flag-*` or `mono` — `<use>` needs SVG. If the heavy tail ever ships as PNG it is a _non-recolourable_ fallback, and that trade has to be made knowingly: the size win is real, and what it costs is the whole Colour mechanism above.

Open at build time: whether the heavy tail ships PNG variants — with the recolouring cost attached.

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

- **Light flags inline** — no request, nothing to lazy-load, and you pay only for the flags you actually import. `loading="lazy"` is inert on them by design, because there is nothing to defer
- **Heavy flags emit** — cacheable, and deferrable by `loading="lazy"`, which for `<use>` means an IntersectionObserver holding the element out of the document until it nears the viewport
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
- **Artwork edits do not hot-reload.** Vite's watcher never fires for `src/assets/flags/*.svg` — a `touch` logs nothing where `src/*.ts` logs an HMR update — so the dev server keeps serving the transform it cached at startup. A changed flag then renders the _previous_ version of the file with no console error anywhere, which reads exactly like a broken `<use>`. **Restart `yarn dev` after editing artwork.**

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
6. **Every paint is a `var()` over a literal hex.** No gradients in field or
   stripe geometry, and no `currentColor`. Each fill or stroke reads
   `var(--flag-<role>, <hex>)` with the flag's own colour as the fallback, so
   the file renders identically whether or not a host supplies values — a plain
   SVG viewer sees only the fallbacks. Roles, not shape names: `ink` (ground),
   `tint` (one step lighter, the charge), `paper` (lightest, fimbriation).
7. **ids prefixed per flag** (`gb-counterchange`, never `t`). The root `<svg>`
   also carries the filename stem (`id="gb"`), which is the `<use>` fragment
   target.
8. **Strip everything else on ingest** — rdf, dc, inkscape, metadata. In the
   reference set, most of a heavy file's bytes are not geometry at all.
9. **An XML comment may not contain `--`.** Every custom property name starts
   with two, so the obvious comment — "this paint is `var(--flag-ink, …)`" —
   makes the file **not well-formed**. It fails to parse in `<img>`, in `<use>`,
   everywhere, and it fails _silently_: no console error, just an empty box.
   Name the roles in prose and point at the README instead. This cost a full
   debug cycle once; the artwork tests now parse every shipped file.

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
