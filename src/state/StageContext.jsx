import { createContext, useContext, useMemo, useState } from 'react';
import { ARCHETYPE_BY_ID } from '../data/archetypes';

const StageContext = createContext(null);

/**
 * Remembers the member's stage for the parts of the app that tint
 * themselves with it (the tab bar) without each having to load the whole
 * journey. A journey screen reports the stage once it has worked it out;
 * until then the default stage's colour is used.
 */
export function StageProvider({ children }) {
  const [stageId, setStageId] = useState('herder');
  const value = useMemo(() => ({ stage: ARCHETYPE_BY_ID[stageId], setStageId }), [stageId]);
  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error('useStage must be used within StageProvider');
  return ctx;
}
