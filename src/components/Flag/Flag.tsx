import type { CSSProperties, ReactElement } from 'react';
import { Artwork } from '../Artwork';
import { TONES } from '../../tones';
import type { FlagProps, FlagRatio } from './types';

const ASPECT_RATIOS: Record<Exclude<FlagRatio, 'native'>, string> = {
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '1:1': '1 / 1',
};

const DEFAULT_RATIO: FlagRatio = '3:2';

/**
 * The monochrome palette, expressed as the three custom properties the artwork
 * resolves. `k60` for the tint rather than `k50`: 60% ink over white is
 * `#666666`, which clears 5.7:1 against paper where a true mid-grey would not.
 */
const MONO: CSSProperties = {
  '--flag-ink': TONES.k100,
  '--flag-tint': TONES.k60,
  '--flag-paper': TONES.k0,
} as CSSProperties;

/**
 * A flag: the artwork in a display box, with the flag-specific decisions made
 * here and the rendering mechanics left to `Artwork`.
 *
 * Those decisions are the ratio and its default, the `flag` class, `rounded`,
 * and the mono palette. Tone never enters the renderer — it arrives as three
 * inherited custom properties on the wrapper, travels down through the `<use>`
 * shadow tree, and is resolved by `var()` rules the artwork already carries,
 * with their original colours as fallbacks.
 *
 * Crop alignment is deliberately *not* one of the decisions made here. Which
 * part of a flag is dispensable is a fact about the flag, so it arrives with
 * the artwork instead of being set per instance.
 */
export function Flag({
  artwork,
  ratio = DEFAULT_RATIO,
  alt = '',
  lang,
  className,
  rounded = false,
  loading,
  mono = false,
}: FlagProps): ReactElement {
  const isNative = ratio === 'native';

  const style: CSSProperties | undefined =
    mono || rounded
      ? {
          ...(mono ? MONO : {}),
          ...(rounded ? { borderRadius: '50%' } : {}),
        }
      : undefined;

  return (
    <Artwork
      src={artwork.src}
      id={artwork.id}
      viewBox={artwork.viewBox}
      // No aspect-ratio when native: the artwork's own ratio sizes the box.
      aspectRatio={isNative ? undefined : ASPECT_RATIOS[ratio]}
      align={artwork.align}
      alt={alt}
      lang={lang}
      loading={loading}
      className={className === undefined ? 'flag' : `flag ${className}`}
      style={style}
    />
  );
}
