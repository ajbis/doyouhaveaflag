import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject, ReactElement, CSSProperties } from 'react';
import type { Align, ArtworkProps } from './types';

/**
 * `object-position`'s words → the `preserveAspectRatio` anchor they mean.
 *
 * Both axes are always named because `slice` chooses which one overflows on its
 * own; naming the other is a no-op rather than an error.
 */
const ANCHORS: Record<Align, string> = {
  center: 'xMidYMid',
  top: 'xMidYMin',
  bottom: 'xMidYMax',
  left: 'xMinYMid',
  right: 'xMaxYMid',
  'top left': 'xMinYMin',
  'top right': 'xMaxYMin',
  'bottom left': 'xMinYMax',
  'bottom right': 'xMaxYMax',
};

/** React warns when `useLayoutEffect` runs during SSR; this form doesn't. */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Whatever geometry was handed in, as the outer `<svg>`'s own `viewBox`. */
function toViewBox(props: ArtworkProps): string {
  if ('viewBox' in props && typeof props.viewBox === 'string') {
    return props.viewBox;
  }
  if (
    'width' in props &&
    typeof props.width === 'number' &&
    typeof props.height === 'number'
  ) {
    return `0 0 ${props.width} ${props.height}`;
  }
  if ('nativeRatio' in props && typeof props.nativeRatio === 'string') {
    const [width, height] = props.nativeRatio.split(':').map(Number);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        `Artwork: nativeRatio must be "width:height", got "${props.nativeRatio}"`,
      );
    }
    return `0 0 ${width} ${height}`;
  }
  throw new Error(
    'Artwork: give one of viewBox, width + height, or nativeRatio',
  );
}

/**
 * A `data:` URI for the artwork, or `undefined` while there isn't one yet.
 *
 * `<use>` renders nothing at all for a `data:` target — silently, with no
 * console message — and bundlers inline assets under 4 KiB by default, so an
 * ordinary small flag would simply vanish. The bytes are already in hand, so
 * hand them back as a `blob:` URL instead, which `<use>` accepts.
 *
 * Runs in a layout effect: it must be settled before the first paint, and it
 * cannot exist on the server, where both server and client render without the
 * `<use>` and so hydrate to the same tree.
 */
function useArtworkUrl(src: string): string | undefined {
  const [blob, setBlob] = useState<string | undefined>(undefined);

  useIsomorphicLayoutEffect(() => {
    if (!src.startsWith('data:')) return;
    const url = toBlobUrl(src);
    if (url === undefined) return;
    setBlob(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [src]);

  if (!src.startsWith('data:')) return src;
  return blob;
}

function toBlobUrl(dataUri: string): string | undefined {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return undefined;
  }
  const comma = dataUri.indexOf(',');
  if (comma < 0) return undefined;
  const meta = dataUri.slice('data:'.length, comma);
  const payload = dataUri.slice(comma + 1);
  const type = meta.split(';')[0] || 'image/svg+xml';
  try {
    const body = /;base64/i.test(meta)
      ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
      : decodeURIComponent(payload);
    return URL.createObjectURL(new Blob([body], { type }));
  } catch {
    return undefined;
  }
}

/** Split any fragment off, so a `blob:` URL can be rebuilt with it attached. */
function splitFragment(src: string): [string, string] {
  const at = src.indexOf('#');
  return at < 0 ? [src, ''] : [src.slice(0, at), src.slice(at)];
}

/**
 * Whether the `<use>` may be inserted into the document yet.
 *
 * `loading="lazy"` can't mean what it means on an `<img>`: measured, a `<use>`
 * fetches its target the moment it is in the document, even inside a
 * `display:none` subtree and even parked offscreen. So the observer decides
 * when the element exists at all.
 *
 * The `rootMargin` is what buys back what native lazy loading gave for free —
 * its connection-aware distance threshold prefetched well ahead of the fold, so
 * a fast scroll never reached empty boxes. A bare `threshold: 0` waits for
 * actual intersection and does. The dropdown case, where the root is a clipped
 * panel rather than the viewport, wants `threshold: 0` and its own root; that
 * isn't this.
 */
function useNearViewport(
  ref: RefObject<HTMLSpanElement | null>,
  gated: boolean,
): boolean {
  const [near, setNear] = useState(!gated);

  useEffect(() => {
    if (!gated) {
      setNear(true);
      return;
    }
    if (near) return;
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: '1000px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [gated, near, ref]);

  return near;
}

/**
 * Vector artwork drawn into a sized, cropped box through `<use>`.
 *
 * The wrapper is the styling hook — class, border, radius and rounding all hang
 * off it, and it is always `display: block`, because an inline wrapper
 * silently ignores border, radius and overflow. The `<svg>` does the cropping:
 * its `viewBox` is the artwork's own geometry and `preserveAspectRatio="… slice"`
 * is `object-fit: cover`, with `align` choosing the anchor.
 *
 * Two channels reach named shapes inside the artwork, and this component owns
 * neither — it just keeps them open. Inherited custom properties travel down
 * through the `<use>` shadow tree (which is closed: nothing inside it can be
 * queried or selected from out here), and the artwork's own `var()` fallbacks
 * mean it renders exactly as authored when no values are supplied.
 */
export function Artwork(props: ArtworkProps): ReactElement {
  const {
    src,
    id,
    aspectRatio,
    align = 'center',
    alt = '',
    lang,
    loading,
    className,
    style,
  } = props;

  // An inlined source has no request to defer — gating it would only delay the
  // paint, so `loading="lazy"` is deliberately inert there.
  const inlined = src.startsWith('data:');

  const ref = useRef<HTMLSpanElement>(null);
  const near = useNearViewport(ref, loading === 'lazy' && !inlined);
  const base = useArtworkUrl(src);

  // Nothing is rendered until the URL can actually resolve: a half-built
  // `<use>` would fetch (or fail) rather than wait.
  const [baseWithoutFragment, fragment] = splitFragment(base ?? '');
  const target =
    base === undefined || !near
      ? undefined
      : baseWithoutFragment + (id === undefined ? fragment : `#${id}`);

  const decorative = alt === '';

  const wrapperStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    overflow: 'hidden',
    ...(aspectRatio === undefined ? {} : { aspectRatio }),
    ...style,
  };

  return (
    <span ref={ref} className={className} style={wrapperStyle}>
      <svg
        viewBox={toViewBox(props)}
        preserveAspectRatio={`${ANCHORS[align]} slice`}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        lang={lang}
        style={{
          display: 'block',
          width: '100%',
          // The wrapper's aspect-ratio gives the box a height to fill; without
          // one, `auto` takes the ratio from the viewBox and nothing crops.
          height: aspectRatio === undefined ? 'auto' : '100%',
          overflow: 'hidden',
        }}
      >
        {target === undefined ? null : <use href={target} />}
      </svg>
    </span>
  );
}
