import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Reload once a newly deployed version's service worker takes over, and
// check for one hourly. Without this, an open or home-screen app keeps
// running the cached old build until it's fully closed and reopened.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
