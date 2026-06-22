import React, { ReactNode } from 'react';
import { getUserFriendlyError } from '../utils/errorHandler';
import './DataState.css';

interface DataStateProps {
  isLoading: boolean;
  isEmpty: boolean;
  hasError: boolean;
  error?: any;
  onRetry?: () => void;
  emptyMessage?: string;
  children?: ReactNode;
}

/**
 * DataState component renders appropriate UI based on loading, empty, and error states.
 * It expects the parent to provide the state flags from useOptimisticData or similar hook.
 * When data is present (not loading, not empty, no error) it simply renders its children.
 */
export const DataState: React.FC<DataStateProps> = ({
  isLoading,
  isEmpty,
  hasError,
  error,
  onRetry,
  emptyMessage = 'No data available.',
  children,
}) => {
  if (isLoading) {
    return (
      <div className="data-state data-state--loading" role="status">
        <div className="glass-loader" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="data-state data-state--error">
        <p className="error-message">{getUserFriendlyError(error)}</p>
        {onRetry && (
          <button className="retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="data-state data-state--empty">
        <p className="empty-message">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
};
