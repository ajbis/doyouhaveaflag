/**
 * Type of a flag artwork import:
 *
 *     import gb from 'doyouhaveaflag/flags/gb.svg'
 *
 * The package's "./flags/*.svg" exports subpath points every flag at this
 * declaration, so any flag import is a plain URL string ready to hand to
 * `<Flag src={...} />`.
 *
 * This file ships in dist/ — it is deliberately not part of our own program,
 * where `vite/client` already declares `*.svg` for the test pages.
 */
declare const src: string;

export default src;
