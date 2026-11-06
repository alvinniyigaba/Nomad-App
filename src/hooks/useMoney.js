import { useMemo } from 'react';
import { useAppState } from '../state/AppStateContext';
import { fmt, ksh } from '../utils/format';

/** What a hidden amount shows. Always the same length, so the mask never hints at how big the number is. */
export const MASK = '••••••';

/**
 * Money formatters that respect the "hide balances" setting. Use these for
 * anything that reveals what a member has (balances, holdings, loans,
 * contributions, transactions). Amounts the member is typing in, such as the
 * deposit or withdrawal keypad, keep using the plain fmt/ksh from utils/format.
 */
export function useMoney() {
  const { balancesHidden, toggleBalancesHidden } = useAppState();
  return useMemo(
    () => ({
      hidden: balancesHidden,
      toggle: toggleBalancesHidden,
      fmt: balancesHidden ? () => MASK : fmt,
      ksh: balancesHidden ? () => `UGX ${MASK}` : ksh,
    }),
    [balancesHidden, toggleBalancesHidden],
  );
}
