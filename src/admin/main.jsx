import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './admin.css';
import AdminApp from './AdminApp.jsx';

// The admin console is its own page (admin.html), not part of the member
// app: no service worker, nothing precached on members' phones.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
