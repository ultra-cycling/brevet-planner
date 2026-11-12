import '@fontsource-variable/inter';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './styles/theme.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { AppServicesProvider } from './app/AppServices';
import { startApp } from './app/bootstrap';
import { App } from './components/App';
import { StartupError } from './components/StartupError';

const root = createRoot(document.getElementById('root')!);

startApp().then(
  ({ services, i18n }) =>
    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <AppServicesProvider services={services}>
            <App />
          </AppServicesProvider>
        </I18nextProvider>
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error);
    root.render(<StartupError error={error} />);
  },
);
