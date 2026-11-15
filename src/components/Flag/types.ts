import type { ArtworkSource } from '../Artwork/types';

/**
 * Display ratio for the flag box, written width:height so it matches both
 * `aspect-ratio` and the artwork's `viewBox`.
 *
 * `native` drops the box ratio entirely and lets the artwork's own dimensions
 * govern, so nothing is ever cropped.
 */
export type FlagRatio = '4:3' | '3:2' | '1:1' | 'native';

export interface FlagProps {
  /**
   * The flag's artwork: its file, its root element id, and its own `viewBox`.
   *
   * A descriptor rather than a bare URL because the renderer needs the
   * artwork's geometry and must not derive it by measuring — the `<use>` shadow
   * tree is closed, so nothing inside it can be read back. Each flag already
   * knows these three things, so they travel together:
   *
   *     import gb from 'doyouhaveaflag/flags/gb.svg'
   *     <Flag artwork={{ id: 'gb', src: gb, viewBox: '0 0 50 30' }} />
   *
   * The `viewBox` is a fact about the file, so it belongs beside the import
   * rather than in the markup — the tests assert it against what ships. The
   * descriptor also carries `align`, the one crop decision that belongs to the
   * flag rather than to the caller; `<Flag>` reads it from here instead of
   * accepting it as a prop.
   */
  artwork: ArtworkSource;

  /** Display ratio. Defaults to `3:2`. */
  ratio?: FlagRatio;

  /**
   * Accessible name for the flag. Defaults to an empty string, which marks it
   * as decorative — pass real text when the flag carries meaning.
   */
  alt?: string;

  /**
   * BCP 47 language code for {@link FlagProps.alt}, so the label can be in any
   * language rather than being locked to English.
   */
  lang?: string;

  /** Extra class merged onto the wrapper, which always carries `flag`. */
  className?: string;

  /**
   * Round the corners all the way (`border-radius: 50%`). A circle at `1:1`,
   * an ellipse at any other ratio — hence `rounded`, not `circle`.
   */
  rounded?: boolean;

  /**
   * When the flag's artwork is fetched. `lazy` mounts the reference once it
   * nears the viewport, which is how a wall of flags stays cheap.
   */
  loading?: 'lazy' | 'eager';

  /**
   * Render in black and white: ink becomes full black, the red tint one step
   * down at 60%, paper stays white.
   *
   * This is decoration and UI states, so a green flag and a red flag look the
   * same in mono — what matters is that no two regions *within* one flag share
   * a tone. It works by setting `--flag-ink`, `--flag-tint` and `--flag-paper`
   * on the wrapper; those custom properties are the one channel that reaches
   * named shapes inside the artwork, and any ancestor can set them too, so
   * brand colours need no API from us.
   */
  mono?: boolean;
}
