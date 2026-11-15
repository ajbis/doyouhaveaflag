import type { ArtworkSource } from 'doyouhaveaflag';
import gb from 'doyouhaveaflag/flags/gb.svg';

export interface FlagEntry extends ArtworkSource {
  name: string;
  /**
   * Native ratio written height:width, the vexillological convention used by
   * Wikipedia and the Flag Institute. Code uses width:height instead, so
   * `3:5` here is `5:3` in a viewBox — which is why the real number lives in
   * `viewBox` and this is only a caption.
   */
  native: string;
}

/**
 * The set the test pages render. Imported one file at a time through the
 * package's flags subpath — nothing is bundled wholesale, so this list is
 * exactly the set that ships.
 *
 * Each entry *is* an `ArtworkSource`, so the same object can be handed to
 * `<Flag>` as its `artwork` with no adaptation.
 */
export const FLAGS: FlagEntry[] = [
  {
    id: 'gb',
    name: 'United Kingdom',
    src: gb,
    viewBox: '0 0 50 30',
    native: '3:5',
  },
];
