/**
 * The six 20% steps between paper and ink, kept in one place so no palette can
 * drift from the ramp.
 *
 * `k` is the print term for black: `k100` is solid ink and `k0` is paper, and
 * each step is n% ink laid over white — `k60` is `0.6 × #000 + 0.4 × #fff`,
 * which is `#666666`. The steps exist as named values rather than being
 * computed so a consumer can see exactly what a tone resolves to.
 */
export const TONES = {
  k100: '#000000',
  k80: '#333333',
  k60: '#666666',
  k40: '#999999',
  k20: '#cccccc',
  k0: '#ffffff',
} as const;
