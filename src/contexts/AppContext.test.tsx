import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from './AppContext';
import { ALL_BUILDINGS } from '../../constants';

describe('appReducer', () => {
  it('should handle SET_TAB', () => {
    const nextState = appReducer(initialState, { type: 'SET_TAB', payload: 'settings' });
    expect(nextState.activeTab).toBe('settings');
  });

  it('should handle SET_ERROR', () => {
    const nextState = appReducer(initialState, { type: 'SET_ERROR', payload: 'Network error' });
    expect(nextState.error).toBe('Network error');
  });

  it('should handle CLEAR_ERROR', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const nextState = appReducer(stateWithError, { type: 'CLEAR_ERROR' });
    expect(nextState.error).toBeNull();
  });

  it('should handle RESET to clear all session state (Fix #7)', () => {
    // Simulate a user who has navigated around and selected a bunch of things
    const dirtyState = {
      activeTab: 'team',
      selectedBuilding: ALL_BUILDINGS[1],
      selectedCheckpointId: 'checkpoint-123',
      selectedLog: null,
      viewMode: 'grid' as const,
      showReportModal: true,
      reportLoading: false,
      error: 'Stale error message',
    };

    // Dispatch RESET (which should be called on logout)
    const nextState = appReducer(dirtyState, { type: 'RESET' });

    // Ensure it strictly matches the initial clean state
    expect(nextState).toEqual(initialState);
  });
});
