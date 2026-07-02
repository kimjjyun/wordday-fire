import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
const appProtection = appCheckSiteKey
  ? import('./firebase').then(({ initializeAppProtection }) => initializeAppProtection())
  : Promise.resolve(false);

appProtection
  .catch(error => console.error('App Check initialization failed:', error))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  });
