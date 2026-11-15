import { Flag, type FlagRatio } from 'doyouhaveaflag';
import { useState } from 'react';
import { FLAGS } from '../flags';

const RATIOS: readonly FlagRatio[] = ['4:3', '3:2', '1:1', 'native'];

type Loading = '' | 'lazy' | 'eager';

export function Playground() {
  const [flagId, setFlagId] = useState(FLAGS[0].id);
  const [ratio, setRatio] = useState<FlagRatio>('3:2');
  const [rounded, setRounded] = useState(false);
  const [mono, setMono] = useState(false);
  const [alt, setAlt] = useState(FLAGS[0].name);
  const [lang, setLang] = useState('en-GB');
  const [loading, setLoading] = useState<Loading>('');

  const flag = FLAGS.find((entry) => entry.id === flagId) ?? FLAGS[0];

  const props: string[] = [
    `artwork={{ id: '${flag.id}', src: ${flag.id}Url, viewBox: '${flag.viewBox}' }}`,
    `ratio="${ratio}"`,
  ];
  if (rounded) props.push('rounded');
  if (mono) props.push('mono');
  if (alt !== '') props.push(`alt="${alt}"`);
  if (lang !== '') props.push(`lang="${lang}"`);
  if (loading !== '') props.push(`loading="${loading}"`);
  const snippet = `<Flag\n  ${props.join('\n  ')}\n/>`;

  return (
    <section className="playground">
      <form className="playground__controls">
        <label className="playground__field">
          <span className="playground__label">Flag</span>
          <select
            value={flagId}
            onChange={(event) => {
              const next = event.target.value;
              const entry = FLAGS.find((item) => item.id === next);

              setFlagId(next);
              if (entry) setAlt(entry.name);
            }}
          >
            {FLAGS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="playground__field">
          <span className="playground__label">Ratio</span>
          <select
            value={ratio}
            onChange={(event) => setRatio(event.target.value as FlagRatio)}
          >
            {RATIOS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="playground__field playground__field--inline">
          <input
            type="checkbox"
            checked={rounded}
            onChange={(event) => setRounded(event.target.checked)}
          />
          <span className="playground__label">Rounded</span>
        </label>

        <label className="playground__field playground__field--inline">
          <input
            type="checkbox"
            checked={mono}
            onChange={(event) => setMono(event.target.checked)}
          />
          <span className="playground__label">Mono</span>
        </label>

        <label className="playground__field">
          <span className="playground__label">alt</span>
          <input
            type="text"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>

        <label className="playground__field">
          <span className="playground__label">lang</span>
          <input
            type="text"
            value={lang}
            onChange={(event) => setLang(event.target.value)}
          />
        </label>

        <label className="playground__field">
          <span className="playground__label">loading</span>
          <select
            value={loading}
            onChange={(event) => setLoading(event.target.value as Loading)}
          >
            <option value="">default</option>
            <option value="lazy">lazy</option>
            <option value="eager">eager</option>
          </select>
        </label>
      </form>

      <div className="playground__preview">
        <div
          className={`playground__stage${rounded ? ' playground__stage--rounded' : ''}`}
        >
          <Flag
            artwork={flag}
            ratio={ratio}
            alt={alt}
            lang={lang || undefined}
            rounded={rounded}
            mono={mono}
            loading={loading || undefined}
          />
        </div>
        <p className="playground__caption">
          {flag.name} — {ratio === 'native' ? '' : `${ratio} of `}native{' '}
          {flag.native} h:w
        </p>
      </div>

      <div className="playground__code">
        <h2 className="playground__heading">Equivalent JSX</h2>
        <pre>
          <code>{snippet}</code>
        </pre>
      </div>
    </section>
  );
}
