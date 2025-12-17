import './app.css';
import App from './App.svelte';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/af339645-0d7f-4aeb-aee8-10c1b7f06eeb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: 'pre-fix',
    hypothesisId: 'H1-pack-structure',
    location: 'src/main.ts:8',
    message: 'App bootstrap',
    data: {
      href: typeof window !== 'undefined' ? window.location.href : '',
      scripts: typeof document !== 'undefined' ? Array.from(document.scripts).map((s) => s.src || s.id) : []
    },
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion

const app = new App({
  target: document.getElementById('app') as HTMLElement
});

// #region agent log
fetch('http://127.0.0.1:7243/ingest/af339645-0d7f-4aeb-aee8-10c1b7f06eeb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: 'pre-fix',
    hypothesisId: 'H2-app-mounted',
    location: 'src/main.ts:24',
    message: 'App mounted',
    data: {},
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion

export default app;

