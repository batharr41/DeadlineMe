export const theme = {
  colors: {
    bg: '#0A0A0F',
    card: '#12121A',
    cardHover: '#1A1A25',
    accent: '#FF3366',
    accentDim: 'rgba(255, 51, 102, 0.2)',
    success: '#00E676',
    successDim: 'rgba(0, 230, 118, 0.2)',
    warning: '#FFB300',
    warningDim: 'rgba(255, 179, 0, 0.2)',
    text: '#F0F0F5',
    textMuted: '#8888AA',
    textDim: '#555570',
    border: '#2A2A3A',
    inputBg: '#0E0E16',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  fontSize: { xs: 11, sm: 13, md: 15, lg: 18, xl: 24, xxl: 32, hero: 48 },
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

// ============================================
// CHARITY CATEGORIES
// User picks a category, we randomly match
// them with a verified charity from the list.
// All charities live in cause-based buckets.
// ============================================
export const CHARITY_CATEGORIES = [
  {
    id: 'humanitarian',
    name: 'Humanitarian Aid',
    icon: '🌍',
    description: 'Doctors Without Borders, Red Cross, UNICEF, Islamic Relief',
    charities: [
      { id: 'doctors_without_borders', name: 'Doctors Without Borders' },
      { id: 'red_cross', name: 'American Red Cross' },
      { id: 'unicef', name: 'UNICEF' },
      { id: 'wfp', name: 'World Food Programme' },
      { id: 'direct_relief', name: 'Direct Relief' },
      { id: 'islamic_relief', name: 'Islamic Relief USA' },
      { id: 'helping_hand', name: 'Helping Hand for Relief & Development' },
    ],
  },
  {
    id: 'poverty',
    name: 'Poverty Relief',
    icon: '🤲',
    description: 'GiveDirectly, Oxfam, Zakat Foundation, Penny Appeal',
    charities: [
      { id: 'give_directly', name: 'GiveDirectly' },
      { id: 'oxfam', name: 'Oxfam America' },
      { id: 'heifer', name: 'Heifer International' },
      { id: 'zakat_foundation', name: 'Zakat Foundation of America' },
      { id: 'penny_appeal', name: 'Penny Appeal USA' },
      { id: 'launchgood', name: 'LaunchGood' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📚',
    description: 'Room to Read, Khan Academy, DonorsChoose',
    charities: [
      { id: 'room_to_read', name: 'Room to Read' },
      { id: 'khan_academy', name: 'Khan Academy' },
      { id: 'donors_choose', name: 'DonorsChoose' },
    ],
  },
  {
    id: 'health_medical',
    name: 'Health & Medical',
    icon: '❤️',
    description: 'St. Jude, American Cancer Society, NAMI',
    charities: [
      { id: 'st_jude', name: "St. Jude Children's Research Hospital" },
      { id: 'acs', name: 'American Cancer Society' },
      { id: 'nami', name: 'NAMI (Mental Health)' },
    ],
  },
  {
    id: 'environment',
    name: 'Environment',
    icon: '🌱',
    description: 'WWF, The Nature Conservancy, Ocean Conservancy',
    charities: [
      { id: 'wwf', name: 'World Wildlife Fund' },
      { id: 'nature_conservancy', name: 'The Nature Conservancy' },
      { id: 'ocean_conservancy', name: 'Ocean Conservancy' },
    ],
  },
  {
    id: 'animals',
    name: 'Animal Welfare',
    icon: '🐾',
    description: 'ASPCA, Best Friends Animal Society',
    charities: [
      { id: 'aspca', name: 'ASPCA' },
      { id: 'best_friends', name: 'Best Friends Animal Society' },
    ],
  },
  {
    id: 'any',
    name: 'Surprise Me',
    icon: '🎲',
    description: 'Random charity from any category above',
    charities: [],
  },
  {
    id: 'custom',
    name: 'Choose Your Own',
    icon: '✏️',
    description: "Name a specific charity. We'll try to match it — if we can't verify it, we'll cancel the stake and let you pick another.",
    charities: [],
  },
];

// Pick a random charity from a category
export const pickRandomCharity = (categoryId) => {
  const cat = CHARITY_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return null;

  if (categoryId === 'any') {
    const allCharities = CHARITY_CATEGORIES
      .filter((c) => c.id !== 'any' && c.id !== 'custom')
      .flatMap((c) => c.charities);
    return allCharities[Math.floor(Math.random() * allCharities.length)];
  }

  if (categoryId === 'custom') return null;
  return cat.charities[Math.floor(Math.random() * cat.charities.length)];
};

export const getCategoryEmoji = (catId) => {
  return CATEGORIES.find((c) => c.id === catId)?.emoji || '⚡';
};

export const getStatusColor = (status) => {
  if (status === 'completed') return theme.colors.success;
  if (status === 'failed') return theme.colors.accent;
  return theme.colors.warning;
};