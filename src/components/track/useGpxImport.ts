import { useCallback, useState } from 'react';
import { GpxError, parseGpxFile, type GpxErrorCode } from '../../domain/track/gpx';
import type { Track } from '../../domain/track/track';

export type ImportErrorCode = GpxErrorCode | 'notGpxFile' | 'unreadable';

/** Reads a GPX file chosen by the user; keeps the last error for display. */
export function useGpxImport(onTrack: (track: Track) => void) {
  const [error, setError] = useState<ImportErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const importFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!/\.gpx$/i.test(file.name)) {
        setError('notGpxFile');
        return;
      }
      setBusy(true);
      try {
        onTrack(await parseGpxFile(file));
      } catch (e) {
        if (!(e instanceof GpxError)) console.error(e);
        setError(e instanceof GpxError ? e.code : 'unreadable');
      } finally {
        setBusy(false);
      }
    },
    [onTrack],
  );

  return { importFile, error, clearError: () => setError(null), busy };
}
