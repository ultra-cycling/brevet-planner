import { Card, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './AppHeader';

export function App() {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-column min-vh-100">
      <AppHeader />
      <Container as="main" fluid className="flex-grow-1 py-4 px-4">
        <Card className="mx-auto text-center empty-state">
          <Card.Body className="p-5">
            <h1 className="h3 font-heading">{t('emptyState.title')}</h1>
            <p className="text-body-secondary mb-0">{t('emptyState.text')}</p>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
