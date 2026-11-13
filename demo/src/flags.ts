import gb from 'doyouhaveaflag/flags/gb.svg';

export interface FlagEntry {
  /** Stable id — also the artwork's filename. */
  id: string;
  name: string;
  /** URL of the artwork, exactly as a consumer would obtain it. */
  src: string;
  /**
   * Native ratio written height:width, the vexillological convention used by
   * Wikipedia and the Flag Institute. Code uses width:height instead, so
   * `3:5` here is `5:3` in a viewBox.
   */
  native: string;
}

/**
 * The set the test pages render. Imported one file at a time through the
 * package's flags subpath — nothing is bundled wholesale, so this list is
 * exactly the set that ships.
 */
export const FLAGS: FlagEntry[] = [
  { id: 'gb', name: 'United Kingdom', src: gb, native: '3:5' },
];
