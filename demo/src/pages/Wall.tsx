import { Flag, type FlagRatio } from 'doyouhaveaflag';
import { useState } from 'react';
import { FLAGS } from '../flags';

const EVERY_RATIO: readonly FlagRatio[] = ['4:3', '3:2', '1:1', 'native'];
const DEFAULT_ONLY: readonly FlagRatio[] = ['3:2'];

export function Wall() {
  const [everyRatio, setEveryRatio] = useState(false);
  const ratios = everyRatio ? EVERY_RATIO : DEFAULT_ONLY;

  return (
    <section className="wall">
      <div className="wall__controls">
        <label className="wall__toggle">
          <input
            type="checkbox"
            checked={everyRatio}
            onChange={(event) => setEveryRatio(event.target.checked)}
          />
          Show every display ratio
        </label>
        <p className="wall__hint">
          Off shows each flag at the default <code>3:2</code>. On shows the crop
          at each option side by side — <code>native</code> never crops.
        </p>
      </div>

      <div className="wall__grid">
        {FLAGS.map((flag) => (
          <figure key={flag.id} className="wall__card">
            <div className="wall__frames">
              {ratios.map((ratio) => (
                <div key={ratio} className="wall__frame">
                  <Flag src={flag.src} ratio={ratio} alt={flag.name} />
                  <span className="wall__label">{ratio}</span>
                </div>
              ))}
            </div>
            <figcaption className="wall__name">
              {flag.name}
              <span className="wall__native">native {flag.native} h:w</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
