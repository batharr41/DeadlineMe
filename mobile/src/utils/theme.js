export const theme = {
  colors: {
    // Backgrounds
    bg: '#080809',
    surface: '#0F0F12',
    card: '#141418',
    cardHover: '#1A1A20',
    overlay: '#1E1E25',

    // Accents
    accent: '#FF2D55',
    accentSoft: 'rgba(255, 45, 85, 0.12)',
    accentBorder: 'rgba(255, 45, 85, 0.25)',

    // Status
    success: '#34C759',
    successSoft: 'rgba(52, 199, 89, 0.12)',
    warning: '#FF9F0A',
    warningSoft: 'rgba(255, 159, 10, 0.12)',
    danger: '#FF3B30',

    // Text
    text: '#F2F2F7',
    textSecondary: '#AEAEB2',
    textTertiary: '#636366',
    textDisabled: '#3A3A3C',

    // Borders
    border: 'rgba(255, 255, 255, 0.07)',
    borderMed: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
  },

  // Typography scale
  text: {
    hero: { fontSize: 40, fontWeight: '700', letterSpacing: -1.5, color: '#F2F2F7' },
    h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.8, color: '#F2F2F7' },
    h2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.4, color: '#F2F2F7' },
    h3: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: '#F2F2F7' },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 22, color: '#AEAEB2' },
    small: { fontSize: 13, fontWeight: '400', lineHeight: 18, color: '#636366' },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: '#636366' },
    mono: { fontSize: 13, fontFamily: 'monospace', color: '#AEAEB2' },
  },

  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },

  radius: {
    sm: 8, md: 12, lg: 16, xl: 20, full: 999,
  },
};

export const CATEGORIES = [
  { id: 'fitness', emoji: '💪', label: 'Fitness' },
  { id: 'learning', emoji: '📚', label: 'Learning' },
  { id: 'career', emoji: '💼', label: 'Career' },
  { id: 'creative', emoji: '🎨', label: 'Creative' },
  { id: 'health', emoji: '🧘', label: 'Health' },
  { id: 'finance', emoji: '💰', label: 'Finance' },
  { id: 'social', emoji: '🤝', label: 'Social' },
  { id: 'other', emoji: '⚡', label: 'Other' },
];

export const STAKE_OPTIONS = [5, 10, 25, 50];

export const CHARITY_CATEGORIES = [
  { id: 'humanitarian', name: 'Humanitarian Aid', icon: '🌍', orgs: ['Doctors Without Borders', 'Red Cross', 'UNICEF', 'Islamic Relief USA'] },
  { id: 'poverty', name: 'Poverty Relief', icon: '🤲', orgs: ['GiveDirectly', 'Oxfam', 'Zakat Foundation', 'Penny Appeal'] },
  { id: 'education', name: 'Education', icon: '📖', orgs: ['Room to Read', 'Khan Academy', 'DonorsChoose'] },
  { id: 'health', name: 'Health & Medical', icon: '🏥', orgs: ['St. Jude', 'ACS', 'NAMI'] },
  { id: 'environment', name: 'Environment', icon: '🌱', orgs: ['WWF', 'Nature Conservancy'] },
  { id: 'animals', name: 'Animals', icon: '🐾', orgs: ['ASPCA', 'Best Friends'] },
  { id: 'surprise', name: 'Surprise Me', icon: '✨', orgs: [] },
];

export const getCategoryEmoji = (catId) =>
  CATEGORIES.find((c) => c.id === catId)?.emoji || '⚡';

export const getStatusColor = (status, colors) => {
  if (status === 'completed') return colors.success;
  if (status === 'failed') return colors.accent;
  if (status === 'cancelled') return colors.textTertiary;
  return colors.warning;
};

export const pickRandomCharity = () => {
  const pool = CHARITY_CATEGORIES.filter(c => c.id !== 'surprise');
  return pool[Math.floor(Math.random() * pool.length)];
};
