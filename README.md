# doyouhaveaflag

SVG flags as React components. The artwork ships as **real `.svg` files**, drawn into the page through a `<use>` reference — this package never turns it into JavaScript.

## Installation

```bash
npm install doyouhaveaflag
```

`react` and `react-dom` are peer dependencies, so you supply your own copy.

### Bundled vs. separate — a dial, not a switch

Flags ship as real `.svg` files; what your bundler does with them is set by its asset inline limit. Vite's default is `4096` bytes, which gives a sensible split out of the box:

- **Under the limit** — base64'd into your JS. No request, nothing to lazy-load, and you pay only for the flags you actually import.
- **Over the limit** — emitted as a separate file: cacheable, and deferrable with `loading="lazy"`.

Heavy flags are where the bytes are — the top decile of a full 195-flag set is 78.5% of the total — so by default the expensive ones are the ones you can defer. **No configuration is required.**

The limit is a continuous dial rather than an all-or-nothing choice. Lower it to move flags from "bundled" into "separate file", right down to `0` for nothing inlined:

```js
// vite.config.js
export default {
  build: {
    assetsInlineLimit: 0, // 4096 default · 1024 · 512 · 0
  },
};
```

Choose by how your flags load. If most are on screen at first paint, bundling them is cheaper than a round-trip each. If they sit behind a picker or a long list you would rather not pay for until it opens, drop the limit so your lazy-loading strategy can actually reach them — an inlined flag has no request to defer, so `loading="lazy"` does nothing for it.

## Usage

Import the flag you need, then hand it to `<Flag>` as an **artwork descriptor**:

```jsx
import { Flag } from 'doyouhaveaflag';
import gb from 'doyouhaveaflag/flags/gb.svg';

const unionFlag = { id: 'gb', src: gb, viewBox: '0 0 50 30' };

export function Example() {
  return <Flag artwork={unionFlag} ratio="3:2" alt="Union Jack" lang="en-GB" />;
}
```

Each flag is imported individually — nothing is bundled wholesale, so you only ever ship the set you actually use.

### Why a descriptor and not a URL

The renderer needs the artwork's own geometry and cannot read it back out: a `<use>` creates a **closed** shadow tree, so nothing inside it can be measured or queried from your page. The `viewBox` therefore travels with the URL instead of being derived, and it is asserted against the shipped file in this package's tests, so it cannot drift from the artwork.

The three fields are also the `<use>` fragment target (`id`), the file (`src`), and the box the artwork is drawn into (`viewBox`) — and, if the artwork needs one, its crop anchor (`align`, below).

## Props

| Prop        | Type                                  | Default  | Notes                                                                                |
| ----------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `artwork`   | `ArtworkSource`                       | required | `{ id, src, viewBox, align? }` — the file, its root id, its own box, its crop anchor |
| `ratio`     | `'4:3' \| '3:2' \| '1:1' \| 'native'` | `'3:2'`  | Display ratio of the box, written **width:height**                                   |
| `alt`       | `string`                              | `''`     | Accessible name. Empty marks it decorative                                           |
| `lang`      | `string`                              | —        | BCP 47 code for `alt`, so the label can be in any language                           |
| `rounded`   | `boolean`                             | `false`  | Round the corners fully — a circle at `1:1`, an ellipse elsewhere                    |
| `mono`      | `boolean`                             | `false`  | Black and white: ink to black, red to 60% grey, white unchanged                      |
| `className` | `string`                              | —        | Merged onto the wrapper, which always carries `flag`                                 |
| `loading`   | `'lazy' \| 'eager'`                   | —        | Defers the artwork until it nears the viewport                                       |

The wrapper is the styling hook — border, radius and any custom class hang off it:

```css
.my-flag {
  border: 1px solid #d9dee7;
}
```

```jsx
<Flag artwork={unionFlag} className="my-flag" />
```

## Colour

Two ways to recolour a flag, neither of which requires touching the artwork.

### Custom properties

Every paint in a shipped file is a `var()` with the flag's own colour as its fallback, so the artwork renders exactly as authored until you supply values. Three roles are addressable:

| Variable       | Role                         | On the Union Flag |
| -------------- | ---------------------------- | ----------------- |
| `--flag-ink`   | the ground                   | `#012169` blue    |
| `--flag-tint`  | the charge, one step lighter | `#C8102E` red     |
| `--flag-paper` | the lightest, fimbriation    | `#ffffff` white   |

Set them on **any ancestor** and they inherit down into the artwork:

```jsx
<div style={{ '--flag-ink': '#003399', '--flag-tint': '#cc5500' }}>
  <Flag artwork={unionFlag} />
</div>
```

They are ordinary CSS, not a prop — brand colours, dark mode and design tokens all work with no API from this library.

### Mono

`mono` is shorthand for a black-and-white palette:

```jsx
<Flag artwork={unionFlag} mono />
```

It exists for **decoration and UI states** — a selected item, a disabled row — where colour is noise. Two flags that differ in colour are meant to look alike in mono, so there is no attempt to keep them distinguishable; what matters is that no two regions _within_ one flag share a tone, and the palette is built to hold that.

The three variables are set to `TONES.k100`, `TONES.k60` and `TONES.k0`. `TONES` is exported as well, if you want the in-between steps:

```js
import { TONES } from 'doyouhaveaflag';

TONES.k60; // '#666666' — 60% ink over white
```

Because `mono` sets the variables on the flag itself, it wins over a value set on an ancestor. To override a mono flag, target its wrapper.

## `<Artwork>`

`Flag` is built on a general primitive for drawing a referenced vector into a sized, cropped box, exported in case you need it for something that isn't a flag:

```jsx
import { Artwork } from 'doyouhaveaflag';

<Artwork
  src={emblem}
  id="arms"
  viewBox="0 0 64 64"
  aspectRatio="1 / 1"
  align="top"
  alt="Coat of arms"
/>;
```

It takes the artwork's geometry in whichever form you have it — `viewBox`, or `width` and `height`, or `nativeRatio` as `width:height` — plus `aspectRatio` for the display box (omit it and the artwork's own ratio sizes the box, so nothing crops), `align`, `loading`, `alt`, `lang`, `className` and `style`.

`Flag` supplies everything flag-specific: the ratio and its default, the `flag` class, `rounded`, and the mono palette — passing the artwork's own crop anchor straight through from the descriptor.

## Ratios

Display ratios are written **width:height**, because that is what `aspect-ratio` and the SVG `viewBox` both take. The `3:2` default matches the most common flag ratio in the world (usually written `2:3`), so most flags show uncropped — `4:3` would crop nearly all of them.

Vexillological reference tables (Wikipedia, the Flag Institute, FOTW) write ratios **height:width** instead, so `3:2` here is `2:3` there. `native` drops the box ratio entirely and lets the artwork's own dimensions govern, so nothing is ever cropped.

### Crop anchor

When the box _does_ force a crop it is `object-fit: cover` anchored at the centre — `preserveAspectRatio="xMidYMid slice"`.

The anchor is deliberately **not** a prop. Which part of a flag is dispensable is a fact about the flag, not a preference of whoever happens to render it, so it travels on the descriptor instead:

```js
const unionFlag = { id: 'gb', src: gb, viewBox: '0 0 50 30' }; // centred
const cantonFlag = { id: 'us', src: us, viewBox: '0 0 19 10', align: 'left' };
```

`align` takes the nine CSS `object-position` names — `center` (the default), the four edges, the four corners — and `Flag` passes it straight through to the artwork.

## Accessibility

The artwork deliberately carries **no** `<title>` — a country name inside the SVG would lock the asset to one language. Instead `alt` and `lang` are set on the `<svg>` as `role="img"` with an `aria-label`, so the label can be a country, a region, an ISO code, English, or the flag's own language. That choice belongs to your use case, not to the library.

An empty `alt` (the default) marks the flag decorative: the `<svg>` is then `aria-hidden`, so a screen reader passes straight over it.

## Development

```bash
corepack yarn install
corepack yarn dev        # test pages on http://localhost:5173
corepack yarn build      # library → dist/
corepack yarn build:docs # test pages → docs/ (GitHub Pages)
```

Quality gates — all must pass before publishing (`prepublishOnly` runs them automatically):

```bash
corepack yarn typecheck
corepack yarn lint
corepack yarn lint:styles
corepack yarn format:check
corepack yarn test
```

`yarn dev` opens a **wall** view (every flag at each display ratio) and a **playground** for exploring props live, with the equivalent JSX alongside.

## License

[MIT](LICENSE)
