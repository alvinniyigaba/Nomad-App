/** The four tabs. `match` lists the paths that keep a tab lit; `icon` is used by the floating tab bar only. */
export const TABS = [
  { label: 'HOME', path: '/home', match: ['/home'], icon: 'home' },
  { label: 'SAVE', path: '/save', match: ['/save', '/save/goal'], icon: 'save' },
  { label: 'BORROW', path: '/borrow', match: ['/borrow', '/loan'], icon: 'borrow' },
  { label: 'INVEST', path: '/invest', match: ['/invest'], icon: 'invest' },
];
