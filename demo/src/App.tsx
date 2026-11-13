import { useState } from 'react';
import { Playground } from './pages/Playground';
import { Wall } from './pages/Wall';

const PAGES = {
  wall: Wall,
  playground: Playground,
} as const;

type PageId = keyof typeof PAGES;

const LABELS: Record<PageId, string> = {
  wall: 'Wall',
  playground: 'Playground',
};

export function App() {
  const [page, setPage] = useState<PageId>('wall');
  const Page = PAGES[page];

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">do you have a flag?</h1>
        <nav className="app__nav" aria-label="Test pages">
          {(Object.keys(PAGES) as PageId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="app__tab"
              aria-current={page === id ? 'page' : undefined}
              onClick={() => setPage(id)}
            >
              {LABELS[id]}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__main">
        <Page />
      </main>
    </div>
  );
}
