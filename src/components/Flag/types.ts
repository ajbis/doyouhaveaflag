/**
 * Display ratio for the flag box, written width:height so it matches both
 * `aspect-ratio` and the artwork's `viewBox`.
 *
 * `native` drops the box ratio entirely and lets the artwork's own dimensions
 * govern, so nothing is ever cropped.
 */
export type FlagRatio = '4:3' | '3:2' | '1:1' | 'native';

/**
 * Which part of the artwork survives when `object-fit: cover` has to crop.
 *
 * `center` is the baseline and emits no rule of its own — the CSS default
 * already does the right thing, so a rule only appears where a flag deviates.
 */
export type FlagAlign =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

export interface FlagProps {
  /**
   * URL of the flag artwork. This is a real file, not an inlined string —
   * import it from the package's flags subpath:
   *
   *     import gb from 'doyouhaveaflag/flags/gb.svg'
   */
  src: string;

  /** Display ratio. Defaults to `3:2`. */
  ratio?: FlagRatio;

  /**
   * Accessible name for the image. Defaults to an empty string, which marks it
   * as decorative — pass real text when the flag carries meaning.
   */
  alt?: string;

  /**
   * BCP 47 language code for {@link FlagProps.alt}, so the label can be in any
   * language rather than being locked to English.
   */
  lang?: string;

  /** Crop alignment, used only when the display ratio forces a crop. */
  align?: FlagAlign;

  /** Extra class merged onto the `<picture>`, which always carries `flag`. */
  className?: string;

  /**
   * Round the corners all the way (`border-radius: 50%`). A circle at `1:1`,
   * an ellipse at any other ratio — hence `rounded`, not `circle`.
   */
  rounded?: boolean;

  /** Passed straight through to the `<img>`. */
  loading?: 'lazy' | 'eager';
}
