/**
 * The seven stages of a member's journey. Each is named for a practice and
 * carries the story of the nomadic people it is drawn from: the name a
 * member sees is always the practice, never the people.
 *
 * `level` is how far along the trail a stage sits (1–5). Two pairs share a
 * level: they are different ways of being at the same point, not steps.
 * `color` is the stage's accent (active tab, stage card, highlights) and
 * `onColor` the text colour that reads on it.
 */
export const ARCHETYPES = [
  {
    id: 'tracker',
    name: 'Tracker',
    people: 'San',
    terrain: 'Kalahari dunes',
    level: 1,
    usualAge: '18–25',
    color: 'var(--savannah-sand)',
    onColor: 'var(--earth-900)',
    motto: 'Read the ground, take the next step.',
    story: 'The San bound their bands together through hxaro: gifts that built a web of obligation to lean on in a hard season. Your version is habit, a savings circle and a first cushion.',
    focus: 'Build the habit and a first month of runway.',
  },
  {
    id: 'herder',
    name: 'Herder',
    people: 'Fulani',
    terrain: 'Sahel grassland',
    level: 2,
    usualAge: '25–40',
    color: 'var(--ochre-gold)',
    onColor: 'var(--earth-900)',
    motto: 'Grow the herd, live off the milk.',
    story: 'Fulani herders measure wealth in a herd that grows. They breed it and live off the milk, never the cattle. Your portfolio works the same way.',
    focus: 'Keep investing every month and let returns start covering your costs.',
  },
  {
    id: 'caravaneer',
    name: 'Caravaneer',
    people: 'Tuareg',
    terrain: 'Sand ridges',
    level: 2,
    usualAge: '25–40',
    color: 'var(--clay-soft)',
    onColor: 'var(--bone)',
    motto: 'Cross together what none could cross alone.',
    story: 'Tuareg caravans carried many traders’ goods over routes no single trader could survive. Your ventures and pooled deals are the caravan.',
    focus: 'Put venture surplus to work in pooled deals, and keep a cushion outside the business.',
  },
  {
    id: 'kin_keeper',
    name: 'Kin Keeper',
    people: 'Bedouin',
    terrain: 'Desert plateau',
    level: 3,
    usualAge: '40–50',
    color: 'var(--earth-500)',
    onColor: 'var(--bone)',
    motto: 'No one crosses the dry season alone.',
    story: 'Among the Bedouin, kin carry each other through hard seasons: the group covers what one household cannot. You are providing for others while still building.',
    focus: 'Fund fees and family ahead of time, so they stop competing with your investing.',
  },
  {
    id: 'granary_keeper',
    name: 'Granary Keeper',
    people: 'Amazigh',
    terrain: 'Atlas mountains',
    level: 3,
    usualAge: '40–50',
    color: 'var(--sage-600)',
    onColor: 'var(--bone)',
    motto: 'Gather it, guard it, know what you hold.',
    story: 'Amazigh villages kept their harvest in the agadir, a shared fortified granary where every family’s store was safe and counted. You hold enough now that order matters.',
    focus: 'Consolidate what is scattered and move into larger, more specific investments.',
  },
  {
    id: 'rain_reader',
    name: 'Rain Reader',
    people: 'Samburu',
    terrain: 'Dry riverbed',
    level: 4,
    usualAge: '50–60',
    color: 'var(--clay-red)',
    onColor: 'var(--bone)',
    motto: 'Move before the dry season, not during it.',
    story: 'Samburu herders read the sky and move early, keeping animals close to water before the drought arrives. You are near the crossing: protect what you have and keep it within reach.',
    focus: 'Shift toward steady income and keep enough liquid for the handover.',
  },
  {
    id: 'elder',
    name: 'Elder',
    people: 'Maasai',
    terrain: 'Rift escarpment',
    level: 5,
    usualAge: 'Independence 100%+',
    color: 'var(--ink-green)',
    onColor: 'var(--bone)',
    motto: 'The climb is done. Live off the herd.',
    story: 'The Maasai pass through age-sets, and a warrior becomes an elder in a formal handover. Elders no longer herd: the herd keeps them, and they decide what is passed on.',
    focus: 'Draw income without drawing down the herd, and plan what you pass on.',
  },
];

export const ARCHETYPE_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));
export const MAX_LEVEL = 5;

/** The stage or stages one level up, joined for display: "Kin Keeper or Granary Keeper". */
export function nextLevelNames(level) {
  return ARCHETYPES.filter((a) => a.level === level + 1).map((a) => a.name).join(' or ');
}
