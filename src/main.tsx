import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConfirmProvider } from './components/ConfirmDialog';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
