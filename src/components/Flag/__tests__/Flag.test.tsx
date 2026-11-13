import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Flag } from '../Flag';

const SRC = '/flags/gb.svg';

/** The raw style attribute, for the rules the component deliberately omits. */
function styleOf(view: ReturnType<typeof render>, index: number): string {
  const picture = view.container.querySelectorAll('picture')[index];
  return picture?.getAttribute('style') ?? '';
}

describe('Flag', () => {
  it('puts the src on the image', () => {
    const view = render(<Flag src={SRC} />);

    expect(view.container.querySelector('img')).toHaveAttribute('src', SRC);
  });

  it('defaults to a 3:2 box', () => {
    const view = render(<Flag src={SRC} />);

    expect(view.container.querySelector('picture')).toHaveStyle({
      aspectRatio: '3 / 2',
    });
  });

  it('maps each fixed ratio to its aspect-ratio', () => {
    const view = render(
      <>
        <Flag src={SRC} ratio="4:3" />
        <Flag src={SRC} ratio="1:1" />
      </>,
    );
    const pictures = view.container.querySelectorAll('picture');

    expect(pictures[0]).toHaveStyle({ aspectRatio: '4 / 3' });
    expect(pictures[1]).toHaveStyle({ aspectRatio: '1 / 1' });
  });

  it('drops the box ratio for the native ratio', () => {
    const view = render(<Flag src={SRC} ratio="native" />);

    expect(styleOf(view, 0)).not.toContain('aspect-ratio');
    expect(view.container.querySelector('img')).toHaveStyle({ height: 'auto' });
  });

  it('emits no object-position for the centre alignment', () => {
    const view = render(<Flag src={SRC} align="center" />);

    expect(styleOf(view, 0)).not.toContain('object-position');
  });

  it('shifts the crop for a non-centre alignment', () => {
    const view = render(<Flag src={SRC} align="bottom right" />);

    expect(view.container.querySelector('img')).toHaveStyle({
      objectPosition: 'bottom right',
    });
  });

  it('rounds the corners when asked', () => {
    const view = render(<Flag src={SRC} rounded />);

    expect(view.container.querySelector('picture')).toHaveStyle({
      borderRadius: '50%',
    });
  });

  it('passes alt and lang through to the image', () => {
    const view = render(<Flag src={SRC} alt="Union Jack" lang="en-GB" />);
    const image = view.container.querySelector('img');

    expect(image).toHaveAttribute('alt', 'Union Jack');
    expect(image).toHaveAttribute('lang', 'en-GB');
  });

  it('defaults alt to an empty string so an unlabelled flag is decorative', () => {
    const view = render(<Flag src={SRC} />);

    expect(view.container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('keeps the flag class and merges a caller class onto it', () => {
    const view = render(
      <>
        <Flag src={SRC} />
        <Flag src={SRC} className="in-table" />
      </>,
    );
    const pictures = view.container.querySelectorAll('picture');

    expect(pictures[0]).toHaveClass('flag');
    expect(pictures[1]).toHaveClass('flag', 'in-table');
  });

  it('passes loading through to the image', () => {
    const view = render(<Flag src={SRC} loading="lazy" />);

    expect(view.container.querySelector('img')).toHaveAttribute(
      'loading',
      'lazy',
    );
  });
});
