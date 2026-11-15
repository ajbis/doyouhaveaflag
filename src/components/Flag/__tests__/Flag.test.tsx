import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ArtworkSource } from '../../Artwork';
import { Flag } from '../Flag';

const ARTWORK: ArtworkSource = {
  id: 'gb',
  src: '/flags/gb.svg',
  viewBox: '0 0 50 30',
};

/** The raw style attribute, for the rules the component deliberately omits. */
function styleOf(view: ReturnType<typeof render>, index = 0): string {
  const wrapper = view.container.querySelectorAll('span')[index];
  return wrapper?.getAttribute('style') ?? '';
}

describe('Flag', () => {
  it('draws the artwork through a use element', () => {
    const view = render(<Flag artwork={ARTWORK} />);

    expect(view.container.querySelector('use')).toHaveAttribute(
      'href',
      '/flags/gb.svg#gb',
    );
  });

  it('defaults to a 3:2 box', () => {
    const view = render(<Flag artwork={ARTWORK} />);

    expect(view.container.querySelector('span')).toHaveStyle({
      aspectRatio: '3 / 2',
    });
  });

  it('maps each fixed ratio to its aspect-ratio', () => {
    const view = render(
      <>
        <Flag artwork={ARTWORK} ratio="4:3" />
        <Flag artwork={ARTWORK} ratio="1:1" />
      </>,
    );
    const wrappers = view.container.querySelectorAll('span');

    expect(wrappers[0]).toHaveStyle({ aspectRatio: '4 / 3' });
    expect(wrappers[1]).toHaveStyle({ aspectRatio: '1 / 1' });
  });

  it('drops the box ratio for the native ratio', () => {
    const view = render(<Flag artwork={ARTWORK} ratio="native" />);

    expect(styleOf(view)).not.toContain('aspect-ratio');
    expect(view.container.querySelector('svg')).toHaveStyle({ height: 'auto' });
  });

  it('centres the crop when the artwork declares no alignment', () => {
    const view = render(<Flag artwork={ARTWORK} />);

    expect(view.container.querySelector('svg')).toHaveAttribute(
      'preserveAspectRatio',
      'xMidYMid slice',
    );
  });

  it('takes the crop anchor from the artwork descriptor', () => {
    const view = render(<Flag artwork={{ ...ARTWORK, align: 'top left' }} />);

    expect(view.container.querySelector('svg')).toHaveAttribute(
      'preserveAspectRatio',
      'xMinYMin slice',
    );
  });

  it('rounds the corners when asked', () => {
    const view = render(<Flag artwork={ARTWORK} rounded />);

    expect(view.container.querySelector('span')).toHaveStyle({
      borderRadius: '50%',
    });
  });

  it('passes alt and lang through to the artwork', () => {
    const view = render(
      <Flag artwork={ARTWORK} alt="Union Jack" lang="en-GB" />,
    );
    const svg = view.container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-label', 'Union Jack');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('lang', 'en-GB');
  });

  it('defaults alt to an empty string so an unlabelled flag is decorative', () => {
    const view = render(<Flag artwork={ARTWORK} />);
    const svg = view.container.querySelector('svg');

    expect(svg).not.toHaveAttribute('aria-label');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the flag class and merges a caller class onto it', () => {
    const view = render(
      <>
        <Flag artwork={ARTWORK} />
        <Flag artwork={ARTWORK} className="in-table" />
      </>,
    );
    const wrappers = view.container.querySelectorAll('span');

    expect(wrappers[0]).toHaveClass('flag');
    expect(wrappers[0]).not.toHaveClass('artwork');
    expect(wrappers[1]).toHaveClass('flag', 'in-table');
  });

  it('sets the monochrome palette as custom properties on the wrapper', () => {
    const view = render(<Flag artwork={ARTWORK} mono />);
    const style = styleOf(view);

    expect(style).toContain('--flag-ink: #000000');
    expect(style).toContain('--flag-tint: #666666');
    expect(style).toContain('--flag-paper: #ffffff');
  });

  it('keeps the rounded rule when mono is also on', () => {
    const view = render(<Flag artwork={ARTWORK} mono rounded />);
    const style = styleOf(view);

    expect(style).toContain('--flag-ink');
    expect(style).toContain('border-radius: 50%');
  });

  it('emits no tone rule of its own when mono is off', () => {
    const view = render(<Flag artwork={ARTWORK} />);

    expect(styleOf(view)).not.toContain('--flag-');
  });

  it('applies rounded on its own, with no tone', () => {
    const view = render(<Flag artwork={ARTWORK} rounded />);
    const style = styleOf(view);

    expect(style).not.toContain('--flag-');
    expect(style).toContain('border-radius: 50%');
  });
});
