/**
 * Which part of the artwork survives when the display box forces a crop.
 *
 * The vocabulary is CSS `object-position`'s — an edge, a corner, or `center` —
 * so the same words describe the crop whichever way the artwork is drawn.
 *
 * `center` is the baseline. Unlike the CSS case it still emits a rule here:
 * the `<svg>` must carry `preserveAspectRatio` to get `slice` (cover) at all,
 * because its own default is `meet` (contain).
 */
export type Align =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

/**
 * The artwork's descriptor: everything about it that is fixed, rather than a
 * per-instance choice.
 *
 * The fields are deliberately one bundle. `viewBox` is copied verbatim from
 * the artwork and asserted against the file in the tests, so it cannot drift
 * from what ships; `id` is at once the filename stem and the artwork's root
 * element id, which is the fragment `<use href="…#gb">` targets. Carrying them
 * together is what lets the renderer crop correctly without ever reading back
 * through the `<use>` shadow tree — which is closed, so nothing inside it can
 * be measured or queried.
 *
 * `align` sits here rather than on `<Flag>` because it answers a question about
 * the artwork's composition — which part of this design is dispensable — and
 * that answer is the same for every instance of the flag. It is not a display
 * preference: the Union Flag is always centred, and a flag whose distinctive
 * element sits at the hoist would always favour its hoist.
 */
export interface ArtworkSource {
  /** Element id of the artwork's root, and the filename stem. */
  id: string;
  /** URL of the artwork file, exactly as a bundler resolves it. */
  src: string;
  /** The artwork's own `viewBox`, verbatim — `0 0 50 30`. */
  viewBox: string;
  /**
   * Which part survives when the display box forces a crop. Defaults to
   * `center`, which is right for the balanced designs — saltires, tricolours,
   * discs — that make up most flags.
   */
  align?: Align;
}

/**
 * The artwork's own geometry, in whichever form the caller happens to have it.
 * Give exactly one: the three describe the same fact, and the outer `<svg>` is
 * built from whichever you bring.
 *
 * `width:height`, not the vexillological `height:width` — code follows the
 * convention that matches `viewBox` and `aspect-ratio`.
 */
type NativeGeometry =
  | { viewBox: string; width?: never; height?: never; nativeRatio?: never }
  | { width: number; height: number; viewBox?: never; nativeRatio?: never }
  | { nativeRatio: string; viewBox?: never; width?: never; height?: never };

interface ArtworkPropsBase {
  /** URL of the artwork file, exactly as a bundler resolves it. */
  src: string;

  /**
   * Element id of the artwork's root — the fragment `<use>` targets.
   *
   * Optional because `src` may already carry one (`'gb.svg#gb'`), but supplying
   * it separately is the clearer form: the fragment is then visible as data
   * rather than buried in a URL.
   */
  id?: string;

  /**
   * The display box's `aspect-ratio`, as CSS takes it: `'3 / 2'`.
   *
   * Omit it and the box takes its ratio from the artwork instead, so nothing
   * is ever cropped.
   */
  aspectRatio?: string;

  /**
   * Which part survives the crop. Defaults to `center`.
   *
   * A fact about the artwork rather than a per-instance preference, so it
   * normally arrives from {@link ArtworkSource.align} instead of being set
   * here.
   */
  align?: Align;

  /**
   * When the `<use>` is allowed to exist.
   *
   * `<use>` has no native `loading="lazy"` — the browser fetches its target as
   * soon as the element is in the document — so `'lazy'` defers the element
   * itself until it nears the viewport. Defaults to `'eager'`.
   */
  loading?: 'lazy' | 'eager';

  /**
   * Accessible name. Defaults to an empty string, which marks the artwork as
   * decorative — pass real text when it carries meaning.
   */
  alt?: string;

  /** BCP 47 language code for {@link ArtworkPropsBase.alt}. */
  lang?: string;

  /** Merged onto the wrapper, which is the styling hook. */
  className?: string;

  /**
   * Merged onto the wrapper's style. Custom properties are inherited down into
   * the `<use>` shadow tree, which is the one channel that reaches named shapes
   * inside the artwork.
   */
  style?: import('react').CSSProperties;
}

export type ArtworkProps = NativeGeometry & ArtworkPropsBase;
