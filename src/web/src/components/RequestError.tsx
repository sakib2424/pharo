import { AlertCircle, RotateCcw } from 'lucide-react';

export function RequestError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="request-error" role="alert">
      <AlertCircle size={17} aria-hidden="true" />
      <span>{message}</span>
      <button className="text-button" onClick={onRetry}>
        <RotateCcw size={13} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
