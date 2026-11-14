import { useEffect } from 'react';
import { useJourney } from '../../hooks/useJourney';
import { useStage } from '../../state/StageContext';

/** useJourney for a screen: also reports the member's stage, so the tab bar can take its colour. */
export function useJourneyScreen() {
  const journey = useJourney();
  const { setStageId } = useStage();
  const stageId = journey.model?.stage.id;

  useEffect(() => {
    if (stageId) setStageId(stageId);
  }, [stageId, setStageId]);

  return journey;
}
