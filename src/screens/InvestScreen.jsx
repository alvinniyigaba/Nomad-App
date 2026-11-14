import { useNavigate } from 'react-router-dom';
import { fromMinor } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { positionInvestedMinor } from '../utils/investmentSeries';
import { ActionLabel, Amount, Screen, ScreenTitle } from '../components/ui';
import InvestmentsBody from './invest/InvestmentsBody';

export default function InvestScreen() {
  const navigate = useNavigate();
  const { holdings } = useExternalHoldings();
  const { ksh } = useMoney();

  // The headline is everything invested — the same figure Home counts — so
  // an external holding like a premium plan doesn't leave this page reading
  // zero. The performance figures below it are Nomad-managed holdings only.
  const totalMinor = positionInvestedMinor(holdings);

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ScreenTitle>INVESTMENTS</ScreenTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <HideBalancesButton />
          <ActionLabel onClick={() => navigate('/statements')}>LETTERS</ActionLabel>
        </div>
      </div>

      <Amount top={22}>{ksh(fromMinor(totalMinor))}</Amount>
      <InvestmentsBody holdings={holdings} />
    </Screen>
  );
}
