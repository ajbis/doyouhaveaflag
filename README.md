# doyouhaveaflag

SVG flags as React components. The artwork ships as **real `.svg` files** — it never becomes part of your JavaScript bundle.

## Installation

```bash
npm install doyouhaveaflag
```

`react` and `react-dom` are peer dependencies, so you supply your own copy.

### Bundled vs. separate — a dial, not a switch

Flags ship as real `.svg` files; what your bundler does with them is set by its asset inline limit. Vite's default is `4096` bytes, which gives a sensible split out of the box:

- **Under the limit** — base64'd into your JS. No request, nothing to lazy-load, and you pay only for the flags you actually import.
- **Over the limit** — emitted as a separate file: cacheable, and deferrable with `loading="lazy"` or an IntersectionObserver.

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

Import the flag you need, then hand its URL to `<Flag>`:

```jsx
import { Flag } from 'doyouhaveaflag';
import gb from 'doyouhaveaflag/flags/gb.svg';

export function Example() {
  return <Flag src={gb} ratio="3:2" alt="Union Jack" lang="en-GB" />;
}
```

Each flag is imported individually — nothing is bundled wholesale, so you only ever ship the set you actually use.

## Props

| Prop        | Type                                  | Default    | Notes                                                             |
| ----------- | ------------------------------------- | ---------- | ----------------------------------------------------------------- |
| `src`       | `string`                              | required   | URL of the artwork, as imported above                             |
| `ratio`     | `'4:3' \| '3:2' \| '1:1' \| 'native'` | `'3:2'`    | Display ratio of the box, written **width:height**                |
| `align`     | `'center' \| 'top' \| 'bottom' \| …`  | `'center'` | Which part survives when `cover` has to crop                      |
| `alt`       | `string`                              | `''`       | Accessible name. Empty marks it decorative                        |
| `lang`      | `string`                              | —          | BCP 47 code for `alt`, so the label can be in any language        |
| `rounded`   | `boolean`                             | `false`    | Round the corners fully — a circle at `1:1`, an ellipse elsewhere |
| `className` | `string`                              | —          | Merged onto the `<picture>`, which always carries `flag`          |
| `loading`   | `'lazy' \| 'eager'`                   | —          | Passed straight through to the `<img>`                            |

The `<picture>` is the styling hook — border, radius and any custom class hang off it:

```css
.my-flag {
  border: 1px solid #d9dee7;
}
```

```jsx
<Flag src={gb} className="my-flag" />
```

## Ratios

Display ratios are written **width:height**, because that is what `aspect-ratio` and the SVG `viewBox` both take. The `3:2` default matches the most common flag ratio in the world (usually written `2:3`), so most flags show uncropped — `4:3` would crop nearly all of them.

Vexillological reference tables (Wikipedia, the Flag Institute, FOTW) write ratios **height:width** instead, so `3:2` here is `2:3` there. `native` drops the box ratio entirely and lets the artwork's own dimensions govern, so nothing is ever cropped.

## Accessibility

The artwork deliberately carries **no** `<title>` — a country name inside the SVG would lock the asset to one language. Instead `alt` and `lang` are passed through to the `<img>`, so the label can be a country, a region, an ISO code, English, or the flag's own language. That choice belongs to your use case, not to the library.

An empty `alt` (the default) marks the flag decorative. Pass real text when the flag carries meaning.

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
