import { Button, Modal } from 'react-bootstrap';
import { Trans, useTranslation } from 'react-i18next';

export interface UnsavedChangesDialogProps {
  show: boolean;
  name: string;
  onDownload: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Asked before leaving a plan with changes that haven't been downloaded (US5) */
export function UnsavedChangesDialog({ show, name, onDownload, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onCancel} centered aria-labelledby="unsaved-title">
      <Modal.Header closeButton>
        <Modal.Title id="unsaved-title" as="h2" className="h5">
          {t('plans.unsaved.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{t('plans.unsaved.text', { name })}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          {t('plans.unsaved.cancel')}
        </Button>
        <Button variant="outline-danger" onClick={onDiscard}>
          {t('plans.unsaved.discard')}
        </Button>
        <Button variant="primary" onClick={onDownload}>
          {t('plans.download')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export interface DownloadDialogProps {
  show: boolean;
  planFile: string;
  trackFile: string;
  /** The GPX isn't in the plans folder yet (uploaded) – offer it for download too */
  trackMissing: boolean;
  onDownloadTrack: () => void;
  onClose: () => void;
}

/** Explains where a downloaded plan file goes (US5) */
export function DownloadDialog({ show, planFile, trackFile, trackMissing, onDownloadTrack, onClose }: DownloadDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onClose} centered aria-labelledby="download-title">
      <Modal.Header closeButton>
        <Modal.Title id="download-title" as="h2" className="h5">
          {t('plans.downloaded.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <Trans i18nKey="plans.downloaded.text" values={{ planFile, trackFile }} components={{ code: <code /> }} />
        </p>
        {trackMissing && (
          <p className="mb-0">
            <Trans i18nKey="plans.downloaded.trackMissing" values={{ trackFile }} components={{ code: <code /> }} />
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        {trackMissing && (
          <Button variant="outline-primary" onClick={onDownloadTrack}>
            {t('plans.downloaded.downloadTrack')}
          </Button>
        )}
        <Button variant="primary" onClick={onClose}>
          {t('plans.downloaded.close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
