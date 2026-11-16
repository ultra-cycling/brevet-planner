import { useState, type DragEvent } from 'react';
import { Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { GpxFileButton } from './GpxFileButton';

/** "New plan" on the start screen: choose a GPX file or drop it onto the card. */
export function GpxDropZone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <Card
      className={`text-center drop-zone h-100 ${dragging ? 'is-dragging' : ''}`}
      data-testid="gpx-drop-zone"
      onDragOver={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Card.Body className="p-4 p-lg-5 d-flex flex-column align-items-center justify-content-center gap-3">
        <h2 id="new-plan-heading" className="h4 mb-0">
          {t('start.newPlan')}
        </h2>
        <p className="text-body-secondary mb-0">{t('start.newPlanText')}</p>
        <GpxFileButton variant="primary" size="lg" label={t('upload.choose')} onFile={onFile} disabled={busy} />
        <p className="small text-body-secondary mb-0">{t('upload.dropHint')}</p>
      </Card.Body>
    </Card>
  );
}
