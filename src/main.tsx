import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppRouter } from './app/router';
import { Providers } from './app/Providers';
import './styles/index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in index.html.');
}

createRoot(container).render(
  <StrictMode>
    <Providers>
      <AppRouter>
        <App />
      </AppRouter>
    </Providers>
  </StrictMode>,
);
