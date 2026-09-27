import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event && event.message && (
        event.message.includes('cross-origin frame') ||
        event.message.includes('Blocked a frame') ||
        event.message.includes('SecurityError')
      )
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason || '');
    if (
      reasonStr.includes('cross-origin frame') ||
      reasonStr.includes('Blocked a frame') ||
      reasonStr.includes('SecurityError')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
