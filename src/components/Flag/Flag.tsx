import type { CSSProperties, ReactElement } from 'react';
import type { FlagProps, FlagRatio } from './types';

const ASPECT_RATIOS: Record<Exclude<FlagRatio, 'native'>, string> = {
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '1:1': '1 / 1',
};

const DEFAULT_RATIO: FlagRatio = '3:2';

/**
 * A flag rendered as a `<picture>` wrapping an `<img>`.
 *
 * The `<picture>` is the styling hook: it is always `display: block` (an
 * inline `<picture>` silently ignores border, radius and overflow) and always
 * carries the `flag` class. The functional styles live inline so the package
 * ships no stylesheet at all — a consumer never has to remember an import, and
 * there is no CSS for `sideEffects` to drop.
 *
 * Cropping is `object-fit: cover` against the box set by `ratio`, origin
 * centre. `object-fit` is not inherited, so it is declared on the `<img>`.
 */
export function Flag({
  src,
  ratio = DEFAULT_RATIO,
  alt = '',
  lang,
  align = 'center',
  className,
  rounded = false,
  loading,
}: FlagProps): ReactElement {
  const isNative = ratio === 'native';

  const pictureStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    overflow: 'hidden',
    // No aspect-ratio when native: the artwork's own ratio sizes the box.
    ...(isNative ? {} : { aspectRatio: ASPECT_RATIOS[ratio] }),
    ...(rounded ? { borderRadius: '50%' } : {}),
  };

  const imgStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height: isNative ? 'auto' : '100%',
    objectFit: 'cover',
    // centre is the CSS default, so only emit a rule where it deviates.
    ...(align === 'center' ? {} : { objectPosition: align }),
  };

  return (
    <picture
      className={className === undefined ? 'flag' : `flag ${className}`}
      style={pictureStyle}
    >
      <img src={src} alt={alt} lang={lang} loading={loading} style={imgStyle} />
    </picture>
  );
}
