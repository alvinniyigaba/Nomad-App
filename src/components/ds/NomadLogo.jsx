import crestSrc from '../../assets/group-crest.png';
import figureSrc from '../../assets/fund-figure.png';

/**
 * NomadLogo — the Nomad Group / sub-brand lockup.
 * group → sepia crest disc; fund/ventures/advisory → monochrome staff figure.
 * Below crestMinSize the crest loses legibility, so it falls back to the mono figure.
 */
export default function NomadLogo({
  brand = 'group',
  layout = 'horizontal', // 'horizontal' | 'stacked' | 'wordmark' | 'mark'
  theme = 'light', // 'light' | 'ink'
  size = 34,
  crestMinSize = 22,
  forceMono = false,
  style = {},
  ...rest
}) {
  const onInk = theme === 'ink';
  const wordColor = onInk ? 'var(--text-on-ink)' : 'var(--ink-green)';
  const descColor = onInk ? 'var(--sage-400)' : 'var(--accent-clay)';
  const names = {
    group: ['NOMAD', 'GROUP'],
    fund: ['NOMAD', 'FUND'],
    ventures: ['NOMAD', 'VENTURES'],
    advisory: ['NOMAD', 'ADVISORY'],
  };
  const descriptor = {
    group: 'EXPLORATORY CAPITAL',
    fund: 'PRIVATE CAPITAL',
    ventures: 'EARLY GROWTH',
    advisory: 'COUNSEL',
  }[brand];
  const [line1, line2] = names[brand] || names.group;

  const isGroup = brand === 'group';
  const useMono = forceMono || !isGroup || size < crestMinSize;
  const markSize = size * 2.9;

  const disc = (
    <span
      style={{
        width: markSize,
        height: markSize,
        borderRadius: 'var(--radius-round)',
        overflow: 'hidden',
        border: '1.5px solid var(--accent-gold)',
        background: 'var(--surface-crest)',
        flexShrink: 0,
        display: 'inline-block',
      }}
    >
      <img src={crestSrc} alt="Nomad crest" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </span>
  );
  const figure = (
    <img
      src={figureSrc}
      alt="Nomad figure"
      style={{
        height: markSize,
        width: 'auto',
        display: 'block',
        flexShrink: 0,
        filter: onInk ? 'invert(1) brightness(1.6)' : 'none',
      }}
    />
  );
  const mark = isGroup && !useMono ? disc : figure;

  const wordmark = (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--w-medium)',
        letterSpacing: 'var(--ls-wordmark)',
        color: wordColor,
        fontSize: size,
        lineHeight: 1.08,
        display: 'inline-block',
        textAlign: layout === 'stacked' ? 'center' : 'left',
      }}
    >
      {line1}
      <br />
      {line2}
      {descriptor && layout !== 'mark' && (
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontWeight: 'var(--w-light)',
            fontSize: Math.max(8, size * 0.26),
            letterSpacing: 'var(--ls-tag)',
            color: descColor,
            marginTop: size * 0.22,
            whiteSpace: 'nowrap',
          }}
        >
          {descriptor}
        </span>
      )}
    </span>
  );

  if (layout === 'mark') {
    return (
      <span style={{ display: 'inline-flex', ...style }} {...rest}>
        {mark}
      </span>
    );
  }
  if (layout === 'wordmark') {
    return (
      <span style={{ display: 'inline-flex', ...style }} {...rest}>
        {wordmark}
      </span>
    );
  }
  if (layout === 'stacked') {
    return (
      <span
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.5, ...style }}
        {...rest}
      >
        {mark}
        {wordmark}
      </span>
    );
  }

  // horizontal
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.9, ...style }} {...rest}>
      {mark}
      <span style={{ width: 1, height: size * 2.4, background: 'var(--accent-gold)', opacity: 0.75, flexShrink: 0 }} />
      {wordmark}
    </span>
  );
}
