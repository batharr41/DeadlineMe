export const theme = {
  colors: {
    bg: '#080809',
    surface: '#0F0F12',
    card: '#141418',
    cardHover: '#1A1A20',
    overlay: '#1E1E25',

    accent: '#FF2D55',
    accentSoft: 'rgba(255, 45, 85, 0.12)',
    accentBorder: 'rgba(255, 45, 85, 0.25)',

    success: '#34C759',
    successSoft: 'rgba(52, 199, 89, 0.12)',
    warning: '#FF9F0A',
    warningSoft: 'rgba(255, 159, 10, 0.12)',
    danger: '#FF3B30',

    text: '#F2F2F7',
    textSecondary: '#AEAEB2',
    textTertiary: '#636366',
    textDisabled: '#3A3A3C',

    border: 'rgba(255, 255, 255, 0.07)',
    borderMed: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
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
  {
    id: 'humanitarian',
    name: 'Humanitarian Aid',
    icon: '🌍',
    orgs: ['Doctors Without Borders', 'Red Cross', 'UNICEF', 'World Food Programme', 'Islamic Relief USA', 'Direct Relief'],
  },
  {
    id: 'poverty',
    name: 'Poverty Relief',
    icon: '🤲',
    orgs: ['GiveDirectly', 'Oxfam', 'Zakat Foundation', 'Penny Appeal', 'Heifer International', 'LaunchGood'],
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📖',
    orgs: ['Room to Read', 'Khan Academy', 'DonorsChoose', 'Teach For America', 'Girls Who Code'],
  },
  {
    id: 'health',
    name: 'Health & Medical',
    icon: '🏥',
    orgs: ['St. Jude Children\'s Research Hospital', 'American Cancer Society', 'NAMI', 'Feeding America', 'PATH'],
  },
  {
    id: 'environment',
    name: 'Environment',
    icon: '🌱',
    orgs: ['WWF', 'The Nature Conservancy', 'Ocean Conservancy', 'Sierra Club Foundation', 'Cool Earth'],
  },
  {
    id: 'animals',
    name: 'Animal Welfare',
    icon: '🐾',
    orgs: ['ASPCA', 'Best Friends Animal Society', 'Humane Society', 'World Animal Protection'],
  },
  {
    id: 'veterans',
    name: 'Veterans & Military',
    icon: '🎖️',
    orgs: ['Wounded Warrior Project', 'Fisher House Foundation', 'Gary Sinise Foundation'],
  },
  {
    id: 'children',
    name: 'Children & Youth',
    icon: '🧒',
    orgs: ['Save the Children', 'Boys & Girls Clubs', 'UNICEF USA', 'Child Fund International'],
  },
  {
    id: 'surprise',
    name: 'Surprise Me',
    icon: '✨',
    orgs: [],
  },
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
