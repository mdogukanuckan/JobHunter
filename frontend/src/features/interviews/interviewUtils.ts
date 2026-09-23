import type { InterviewOutcome } from '../../api/types';

export const OUTCOMES: InterviewOutcome[] = ['Pending', 'Passed', 'Failed', 'Cancelled'];

export const OUTCOME_COLORS: Record<InterviewOutcome, 'info' | 'success' | 'error' | 'default'> = {
  Pending: 'info',
  Passed: 'success',
  Failed: 'error',
  Cancelled: 'default',
};

/** Takvimde/listede nokta rengi. */
export const OUTCOME_HEX: Record<InterviewOutcome, string> = {
  Pending: '#2563eb',
  Passed: '#16a34a',
  Failed: '#dc2626',
  Cancelled: '#9ca3af',
};
