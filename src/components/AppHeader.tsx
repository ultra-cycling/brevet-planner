import type { ReactNode } from 'react';
import { Container, Form, Navbar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../app/AppServices';
import { BikeIcon } from './icons';

export interface AppHeaderProps {
  /** Brand link: back to the start screen */
  onHome: () => void;
  /** Controls of the open plan (plan menu, download) */
  children?: ReactNode;
}

export function AppHeader({ onHome, children }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const { i18n: i18nConfig } = useConfig();

  return (
    <Navbar as="header" bg="white" className="border-bottom app-header" aria-label={t('header.mainNavigation')}>
      <Container fluid className="flex-nowrap gap-2 gap-sm-3 px-3 px-sm-4">
        <Navbar.Brand
          href={import.meta.env.BASE_URL}
          className="d-flex align-items-center gap-2 fw-bold font-heading me-0"
          onClick={(e) => {
            e.preventDefault();
            onHome();
          }}
        >
          <BikeIcon className="text-route" />
          {/* with a plan open, phones show the icon only */}
          <span className={children ? 'd-none d-lg-inline' : undefined}>{t('app.name')}</span>
          {children && <span className="visually-hidden d-lg-none">{t('app.name')}</span>}
        </Navbar.Brand>
        <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">{children}</div>
        <Form.Group controlId="language" className="flex-shrink-0">
          <Form.Label visuallyHidden>{t('header.language')}</Form.Label>
          <Form.Select
            value={i18n.resolvedLanguage}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            disabled={i18nConfig.languages.length < 2}
          >
            {i18nConfig.languages.map((lng) => (
              <option key={lng} value={lng}>
                {t(`languages.${lng}`, { defaultValue: lng })}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Container>
    </Navbar>
  );
}
