import { describe, expect, it } from 'vitest';

/**
 * Every shipped file, read as raw text.
 *
 * `import.meta.glob` rather than `node:fs`: the app program's `types` list is
 * deliberately browser-only (`vite/client`, `vitest/globals`), and globbing
 * also means a new flag is covered the moment it lands — there is no list here
 * to forget to update.
 */
const ARTWORK: Array<[file: string, source: string]> = Object.entries(
  import.meta.glob<string>('../*.svg', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)
  .map(([path, source]): [file: string, source: string] => [
    path.slice(path.lastIndexOf('/') + 1),
    source,
  ])
  .sort(([a], [b]) => a.localeCompare(b));

/** `var(--flag-<role>, #hex)` — the only form a shipped paint may take. */
const PAINT = /^var\(--flag-(ink|tint|paper),\s*#[0-9a-fA-F]{3,8}\)$/;

function parseErrors(source: string): Element | null {
  return new DOMParser()
    .parseFromString(source, 'image/svg+xml')
    .querySelector('parsererror');
}

function root(source: string): Element {
  return new DOMParser().parseFromString(source, 'image/svg+xml')
    .documentElement;
}

describe('shipped artwork', () => {
  it('ships at least one flag', () => {
    expect(ARTWORK.length).toBeGreaterThan(0);
  });

  // Without this, a detector that never fires would pass every file below.
  it('detects the malformation these tests exist to catch', () => {
    expect(parseErrors('<svg><!-- sets --flag-ink --></svg>')).not.toBeNull();
    expect(parseErrors('<svg></svg>')).toBeNull();
  });

  it.each(ARTWORK)('%s is well-formed XML', (_file, source) => {
    expect(parseErrors(source)).toBeNull();
  });

  it.each(ARTWORK)(
    '%s declares a viewBox and no width/height',
    (_file, src) => {
      const element = root(src);

      expect(element.getAttribute('viewBox')).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(element.hasAttribute('width')).toBe(false);
      expect(element.hasAttribute('height')).toBe(false);
    },
  );

  it.each(ARTWORK)('%s roots itself at its filename stem', (file, src) => {
    expect(root(src).getAttribute('id')).toBe(file.replace(/\.svg$/, ''));
  });

  it.each(ARTWORK)(
    '%s paints only through var() with a hex fallback',
    (_file, src) => {
      expect(src).not.toContain('currentColor');
      const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
      expect(doc.querySelector('linearGradient, radialGradient')).toBeNull();

      const offending = [...doc.querySelectorAll('*')].flatMap((element) =>
        (['fill', 'stroke'] as const)
          .map((attribute) => ({
            at: `${element.tagName}[${attribute}]`,
            value: element.getAttribute(attribute),
          }))
          .filter(
            ({ value }) =>
              value !== null && value !== 'none' && !PAINT.test(value),
          ),
      );

      expect(offending).toEqual([]);
    },
  );
});
