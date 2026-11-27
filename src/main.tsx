import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { LearningProvider } from './context/LearningContext';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <LearningProvider>
        <App />
      </LearningProvider>
    </HashRouter>
  </StrictMode>,
);
