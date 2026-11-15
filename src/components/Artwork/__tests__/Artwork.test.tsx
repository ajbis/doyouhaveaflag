import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Artwork } from '../Artwork';
import type { ArtworkProps } from '../types';

interface ObserverRecord {
  callback: IntersectionObserverCallback;
  element: Element | null;
  active: boolean;
  options: IntersectionObserverInit | undefined;
}

let observers: ObserverRecord[] = [];

class StubIntersectionObserver {
  private readonly record: ObserverRecord;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.record = { callback, element: null, active: true, options };
    observers.push(this.record);
  }

  observe(element: Element): void {
    this.record.element = element;
  }

  unobserve(): void {
    this.record.active = false;
  }

  disconnect(): void {
    this.record.active = false;
  }
}

/** Settle every observer that is still watching, as a real intersection would. */
function intersect(): void {
  for (const record of observers) {
    if (!record.active || record.element === null) continue;
    record.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  }
}

function styleOf(view: ReturnType<typeof render>, index = 0): string {
  return (
    view.container.querySelectorAll('span')[index]?.getAttribute('style') ?? ''
  );
}

describe('Artwork', () => {
  describe('geometry', () => {
    it('takes a viewBox verbatim', () => {
      const view = render(<Artwork src="/a.svg" viewBox="0 0 50 30" />);

      expect(view.container.querySelector('svg')).toHaveAttribute(
        'viewBox',
        '0 0 50 30',
      );
    });

    it('builds a viewBox from width and height', () => {
      const view = render(<Artwork src="/a.svg" width={50} height={30} />);

      expect(view.container.querySelector('svg')).toHaveAttribute(
        'viewBox',
        '0 0 50 30',
      );
    });

    it('builds a viewBox from a width:height ratio', () => {
      const view = render(<Artwork src="/a.svg" nativeRatio="5:3" />);

      expect(view.container.querySelector('svg')).toHaveAttribute(
        'viewBox',
        '0 0 5 3',
      );
    });

    it('refuses a ratio it cannot read rather than rendering nonsense', () => {
      expect(() => render(<Artwork src="/a.svg" nativeRatio="wide" />)).toThrow(
        /nativeRatio/,
      );
    });

    it('refuses to guess when no geometry is given at all', () => {
      // Only reachable from JavaScript: the type makes geometry mandatory, and
      // an untyped caller still deserves a real error rather than a blank box.
      const untyped = { src: '/a.svg' } as unknown as ArtworkProps;

      expect(() => render(<Artwork {...untyped} />)).toThrow(/viewBox/);
    });
  });

  describe('display box', () => {
    it('fills a box when an aspect-ratio is given', () => {
      const view = render(
        <Artwork src="/a.svg" viewBox="0 0 5 3" aspectRatio="3 / 2" />,
      );

      expect(view.container.querySelector('span')).toHaveStyle({
        aspectRatio: '3 / 2',
      });
      expect(view.container.querySelector('svg')).toHaveStyle({
        height: '100%',
      });
    });

    it('sizes from the artwork when no aspect-ratio is given', () => {
      const view = render(<Artwork src="/a.svg" viewBox="0 0 5 3" />);
      const svg = view.container.querySelector('svg');

      expect(styleOf(view)).not.toContain('aspect-ratio');
      expect(svg).toHaveStyle({ height: 'auto' });
    });

    it('crops rather than letterboxes, whichever alignment is asked for', () => {
      const view = render(
        <>
          <Artwork src="/a.svg" viewBox="0 0 5 3" />
          <Artwork src="/a.svg" viewBox="0 0 5 3" align="top left" />
        </>,
      );
      const svgs = view.container.querySelectorAll('svg');

      expect(svgs[0]).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
      expect(svgs[1]).toHaveAttribute('preserveAspectRatio', 'xMinYMin slice');
    });

    it('maps every alignment to the anchor it names', () => {
      const view = render(
        <>
          <Artwork src="/a.svg" viewBox="0 0 5 3" align="top" />
          <Artwork src="/a.svg" viewBox="0 0 5 3" align="bottom left" />
          <Artwork src="/a.svg" viewBox="0 0 5 3" align="right" />
        </>,
      );
      const svgs = view.container.querySelectorAll('svg');

      expect(svgs[0]).toHaveAttribute('preserveAspectRatio', 'xMidYMin slice');
      expect(svgs[1]).toHaveAttribute('preserveAspectRatio', 'xMinYMax slice');
      expect(svgs[2]).toHaveAttribute('preserveAspectRatio', 'xMaxYMid slice');
    });
  });

  describe('reference', () => {
    it('joins the source and the id into the use target', () => {
      const view = render(<Artwork src="/a.svg" id="a" viewBox="0 0 5 3" />);

      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        '/a.svg#a',
      );
    });

    it('keeps a fragment the source already carries', () => {
      const view = render(<Artwork src="/a.svg#a" viewBox="0 0 5 3" />);

      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        '/a.svg#a',
      );
    });

    it('lets an explicit id win over a fragment in the source', () => {
      const view = render(
        <Artwork src="/a.svg#old" id="new" viewBox="0 0 5 3" />,
      );

      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        '/a.svg#new',
      );
    });
  });

  describe('accessibility', () => {
    it('labels the artwork when given an alt', () => {
      const view = render(
        <Artwork src="/a.svg" viewBox="0 0 5 3" alt="The flag" lang="en" />,
      );
      const svg = view.container.querySelector('svg');

      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', 'The flag');
      expect(svg).toHaveAttribute('lang', 'en');
    });

    it('marks an unlabelled artwork decorative', () => {
      const view = render(<Artwork src="/a.svg" viewBox="0 0 5 3" />);
      const svg = view.container.querySelector('svg');

      expect(svg).not.toHaveAttribute('role');
      expect(svg).not.toHaveAttribute('aria-label');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('hooks', () => {
    it('merges caller style over the layout rules', () => {
      const view = render(
        <Artwork
          src="/a.svg"
          viewBox="0 0 5 3"
          aspectRatio="1 / 1"
          className="art"
          style={{ borderRadius: '50%', ['--brand' as string]: '#f00' }}
        />,
      );
      const wrapper = view.container.querySelector('span');

      expect(wrapper).toHaveClass('art');
      expect(styleOf(view)).toContain('aspect-ratio: 1 / 1');
      expect(styleOf(view)).toContain('border-radius: 50%');
      expect(styleOf(view)).toContain('--brand');
    });
  });

  describe('loading', () => {
    beforeEach(() => {
      observers = [];
      vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('references the artwork straight away by default', () => {
      const view = render(<Artwork src="/a.svg" viewBox="0 0 5 3" />);

      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        '/a.svg',
      );
    });

    it('holds the artwork back until it nears the viewport', () => {
      const view = render(
        <Artwork src="/a.svg" viewBox="0 0 5 3" loading="lazy" />,
      );

      expect(view.container.querySelector('use')).toBeNull();

      act(() => {
        intersect();
      });

      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        '/a.svg',
      );
    });

    it('never references the artwork while it stays out of reach', () => {
      const view = render(
        <Artwork src="/a.svg" viewBox="0 0 5 3" loading="lazy" />,
      );

      expect(view.container.querySelector('use')).toBeNull();
    });

    it('asks to be told early, not at the moment it is seen', () => {
      render(<Artwork src="/a.svg" viewBox="0 0 5 3" loading="lazy" />);

      expect(observers[0]?.options?.rootMargin).toBe('1000px');
    });
  });

  describe('data: URIs', () => {
    const DATA_URI =
      'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%225%22%20height%3D%223%22%2F%3E';

    /**
     * Swapped by key rather than captured as a value: taking a static method
     * off its constructor detaches it, which is exactly the mistake the rule
     * about unbound methods exists to catch.
     */
    const CREATE = 'createObjectURL';
    const REVOKE = 'revokeObjectURL';

    const realCreate = Reflect.getOwnPropertyDescriptor(URL, CREATE);
    const realRevoke = Reflect.getOwnPropertyDescriptor(URL, REVOKE);

    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      observers = [];
      vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
      createObjectURL = vi.fn(() => 'blob:http://localhost:5173/artwork');
      revokeObjectURL = vi.fn();
      Reflect.set(URL, CREATE, createObjectURL);
      Reflect.set(URL, REVOKE, revokeObjectURL);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      if (realCreate) Reflect.defineProperty(URL, CREATE, realCreate);
      else Reflect.deleteProperty(URL, CREATE);
      if (realRevoke) Reflect.defineProperty(URL, REVOKE, realRevoke);
      else Reflect.deleteProperty(URL, REVOKE);
    });

    it('re-points a data: source at a blob: the browser will accept', () => {
      const view = render(
        <Artwork src={DATA_URI} id="probe" viewBox="0 0 5 3" />,
      );

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(view.container.querySelector('use')).toHaveAttribute(
        'href',
        'blob:http://localhost:5173/artwork#probe',
      );
    });

    it('releases the object URL once the artwork goes away', () => {
      const view = render(<Artwork src={DATA_URI} viewBox="0 0 5 3" />);

      view.unmount();

      expect(revokeObjectURL).toHaveBeenCalledWith(
        'blob:http://localhost:5173/artwork',
      );
    });

    it('leaves no half-built reference when it cannot be converted', () => {
      Reflect.set(URL, CREATE, undefined);

      const view = render(<Artwork src={DATA_URI} viewBox="0 0 5 3" />);

      expect(view.container.querySelector('use')).toBeNull();
    });

    it('never defers an inlined flag, which has no request to defer', () => {
      const view = render(
        <Artwork src={DATA_URI} viewBox="0 0 5 3" loading="lazy" />,
      );

      // No intersection was fired: had it gated, this would still be empty.
      expect(view.container.querySelector('use')).not.toBeNull();
      expect(observers).toHaveLength(0);
    });
  });
});
