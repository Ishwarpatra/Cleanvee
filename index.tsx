import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppProvider } from './src/contexts/AppContext';
import { SettingsProvider } from './src/contexts/SettingsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
