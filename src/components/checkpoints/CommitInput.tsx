import { useContext, useState, type ComponentProps } from 'react';
import { Form } from 'react-bootstrap';
import FormContext from 'react-bootstrap/FormContext';

type ControlProps = Omit<ComponentProps<typeof Form.Control>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown'>;

export interface CommitInputProps extends ControlProps {
  value: string;
  /** Called on blur or Enter with the edited text; return an error message to keep the draft and show it. */
  onCommit: (text: string) => string | null;
}

/**
 * Text input that commits on blur or Enter (not on every keystroke) – so a half-typed time or distance
 * doesn't move a checkpoint around. Escape discards the draft.
 */
export function CommitInput({ value, onCommit, id: ownId, ...rest }: CommitInputProps) {
  // inside <Form.Group controlId> the group provides the id (react-bootstrap warns if the control sets one too)
  const { controlId } = useContext(FormContext) as { controlId?: string };
  const id = ownId ?? controlId;
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const message = draft === value ? null : onCommit(draft);
    setError(message);
    if (message === null) setDraft(null);
  };
  const discard = () => {
    setDraft(null);
    setError(null);
  };

  return (
    <>
      <Form.Control
        {...rest}
        id={controlId === undefined ? id : undefined}
        value={draft ?? value}
        isInvalid={error !== null}
        aria-describedby={error !== null && id ? `${id}-error` : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            discard();
          }
        }}
      />
      {error !== null && (
        <Form.Control.Feedback type="invalid" id={id ? `${id}-error` : undefined}>
          {error}
        </Form.Control.Feedback>
      )}
    </>
  );
}
