import { Container, Form, Navbar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../app/AppServices';
import { BikeIcon } from './icons';
import { GpxFileButton } from './track/GpxFileButton';

export interface AppHeaderProps {
  onGpxFile: (file: File) => void;
  busy?: boolean;
}

export function AppHeader({ onGpxFile, busy = false }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const { i18n: i18nConfig } = useConfig();

  return (
    <Navbar as="header" bg="white" className="border-bottom app-header" aria-label={t('header.mainNavigation')}>
      <Container fluid className="flex-wrap gap-3 px-4">
        <Navbar.Brand href={import.meta.env.BASE_URL} className="d-flex align-items-center gap-2 fw-bold font-heading">
          <BikeIcon className="text-route" />
          {t('app.name')}
        </Navbar.Brand>
        <div className="ms-auto d-flex flex-wrap align-items-center gap-2">
          <Form.Group controlId="language">
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
          <GpxFileButton variant="outline-primary" label={t('upload.button')} onFile={onGpxFile} disabled={busy} />
        </div>
      </Container>
    </Navbar>
  );
}
