import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Start listening for the install prompt before React mounts (Chrome fires it early)
import './pwa/installPrompt';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
