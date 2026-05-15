/**
 * AppContext — Global application state management
 *
 * SOLID Principles applied:
 * - Single Responsibility: context only manages app-wide state
 * - Open/Closed: new state slices can be added without modifying consumers
 * - Dependency Inversion: components depend on this abstraction, not concrete hooks
 *
 * Replaces 8+ useState calls in App.tsx with a single, testable context.
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { Building, CleaningLog } from '../../types';
import { ALL_BUILDINGS } from '../../constants';

// ---- State shape ----
export interface AppState {
  activeTab: string;
  selectedBuilding: Building;
  selectedCheckpointId: string | null;
  selectedLog: CleaningLog | null;
  viewMode: 'floorplan' | 'grid';
  showReportModal: boolean;
  reportLoading: boolean;
  error: string | null;
}

// ---- Actions ----
type AppAction =
  | { type: 'SET_TAB'; payload: string }
  | { type: 'SET_BUILDING'; payload: Building }
  | { type: 'SET_CHECKPOINT'; payload: string | null }
  | { type: 'SET_LOG'; payload: CleaningLog | null }
  | { type: 'SET_VIEW_MODE'; payload: 'floorplan' | 'grid' }
  | { type: 'SET_REPORT_MODAL'; payload: boolean }
  | { type: 'SET_REPORT_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  // Fix #7: Reset all state on logout to prevent data leaks between sessions
  | { type: 'RESET' };

// ---- Reducer ----
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_BUILDING':
      return {
        ...state,
        selectedBuilding: action.payload,
        selectedCheckpointId: null,
        selectedLog: null,
      };
    case 'SET_CHECKPOINT':
      return { ...state, selectedCheckpointId: action.payload };
    case 'SET_LOG':
      return { ...state, selectedLog: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_REPORT_MODAL':
      return { ...state, showReportModal: action.payload };
    case 'SET_REPORT_LOADING':
      return { ...state, reportLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    // Fix #7: Full reset clears selected building session, logs, checkpoints
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ---- Context ----
interface AppContextValue {
  state: AppState;
  setActiveTab: (tab: string) => void;
  setBuilding: (buildingId: string) => void;
  setCheckpoint: (id: string | null) => void;
  setLog: (log: CleaningLog | null) => void;
  setViewMode: (mode: 'floorplan' | 'grid') => void;
  setShowReportModal: (show: boolean) => void;
  setReportLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  clearError: () => void;
  // Fix #7: Resets all app state on logout
  resetState: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const initialState: AppState = {
  activeTab: 'dashboard',
  selectedBuilding: ALL_BUILDINGS[0],
  selectedCheckpointId: null,
  selectedLog: null,
  viewMode: 'floorplan',
  showReportModal: false,
  reportLoading: false,
  error: null,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setActiveTab = useCallback((tab: string) => dispatch({ type: 'SET_TAB', payload: tab }), []);
  const setBuilding = useCallback((buildingId: string) => {
    const building = ALL_BUILDINGS.find(b => b.id === buildingId);
    if (building) dispatch({ type: 'SET_BUILDING', payload: building });
  }, []);
  const setCheckpoint = useCallback((id: string | null) => dispatch({ type: 'SET_CHECKPOINT', payload: id }), []);
  const setLog = useCallback((log: CleaningLog | null) => dispatch({ type: 'SET_LOG', payload: log }), []);
  const setViewMode = useCallback((mode: 'floorplan' | 'grid') => dispatch({ type: 'SET_VIEW_MODE', payload: mode }), []);
  const setShowReportModal = useCallback((show: boolean) => dispatch({ type: 'SET_REPORT_MODAL', payload: show }), []);
  const setReportLoading = useCallback((loading: boolean) => dispatch({ type: 'SET_REPORT_LOADING', payload: loading }), []);
  const setError = useCallback((msg: string | null) => dispatch({ type: 'SET_ERROR', payload: msg }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  // Fix #7: Clear all user-session state to prevent data leaks on logout
  const resetState = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <AppContext.Provider
      value={{
        state,
        setActiveTab,
        setBuilding,
        setCheckpoint,
        setLog,
        setViewMode,
        setShowReportModal,
        setReportLoading,
        setError,
        clearError,
        resetState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
