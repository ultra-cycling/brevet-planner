import { Alert, Container } from 'react-bootstrap';

/**
 * Shown when the app cannot start (e.g. invalid config.yaml).
 * Deliberately not translated: i18n may not be initialised at this point.
 */
export function StartupError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Container className="py-5">
      <Alert variant="danger">
        <Alert.Heading as="h1" className="h4">
          Brevet Planner could not start
        </Alert.Heading>
        <p className="mb-0">{message}</p>
      </Alert>
    </Container>
  );
}
