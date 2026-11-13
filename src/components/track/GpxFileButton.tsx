import { useRef, type ComponentProps } from 'react';
import { Button } from 'react-bootstrap';
import { UploadIcon } from '../icons';

interface GpxFileButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> {
  label: string;
  onFile: (file: File) => void;
}

/** Button that opens the file chooser for a GPX file. */
export function GpxFileButton({ label, onFile, ...buttonProps }: GpxFileButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button {...buttonProps} onClick={() => input.current?.click()} className={`d-inline-flex align-items-center gap-2 ${buttonProps.className ?? ''}`}>
        <UploadIcon />
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="d-none"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // allow choosing the same file again
        }}
      />
    </>
  );
}
