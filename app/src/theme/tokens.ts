/**
 * Design tokens ported from the approved MediBloom mockups.
 * Light and dark palettes expose the SAME key set so screens can consume
 * `useTheme().c.<token>` without branching on the active scheme.
 */

export const lightColors = {
  bg: '#FDF8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF9FC',
  surfaceLav: '#F6F2FB',
  border: '#F3EDF8',
  borderStrong: '#EDE6F2',

  rose: '#E85D8A',
  roseTint: '#F4A6C1',
  roseSoft: '#FCE8EE',
  roseDeep: '#C2437C',

  violet: '#8B5FBF',
  violetTint: '#C9B6E4',
  violetSoft: '#F1EBF8',

  gold: '#D4A574',
  goldSoft: '#F7EEE3',
  goldDeep: '#B08328',

  sage: '#8FD4B8',
  sageSoft: '#E8F7F0',
  sageDeep: '#3F9270',

  amber: '#F5C56B',
  amberSoft: '#FDF3E2',

  coral: '#F17C7C',
  coralSoft: '#FDEBEB',
  coralDeep: '#C0504E',
  coralBorder: '#F6C7C7',

  ink: '#2D2438',
  inkSoft: '#6B6377',
  inkFaint: '#A79FB0',
  inkGhost: '#C7BFCF',

  white: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  bg: '#1E1726',
  surface: '#26202E',
  surfaceAlt: '#2A2233',
  surfaceLav: '#322A44',
  border: '#362D42',
  borderStrong: '#3E3348',

  rose: '#F088AA',
  roseTint: '#F4A6C1',
  roseSoft: '#3A2530',
  roseDeep: '#F4A6C1',

  violet: '#B49BE0',
  violetTint: '#C9B6E4',
  violetSoft: '#322A44',

  gold: '#E0B98A',
  goldSoft: '#3A2E22',
  goldDeep: '#E0B98A',

  sage: '#9FE0C2',
  sageSoft: '#1F3A2D',
  sageDeep: '#9FE0C2',

  amber: '#F5C56B',
  amberSoft: '#3A3021',

  coral: '#F5938F',
  coralSoft: '#3D262B',
  coralDeep: '#F5938F',
  coralBorder: '#5A3339',

  ink: '#F5EFF7',
  inkSoft: '#C7BDD1',
  inkFaint: '#8A8195',
  inkGhost: '#6F6679',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 9,
  md: 13,
  lg: 16,
  xl: 20,
  pill: 999,
};

/** Base font sizes. Multiplied by the larger-text scale at runtime. */
export const fontSize = {
  micro: 10,
  tiny: 11,
  small: 12,
  body: 13,
  bodyLg: 14,
  title: 15,
  h3: 17,
  h2: 19,
  h1: 24,
  display: 32,
};

export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
};

/** Every tappable control must meet this, per the accessibility commitment. */
export const MIN_TOUCH_TARGET = 44;

/** Multiplier applied to every font size when "Larger text" is on. */
export const LARGER_TEXT_SCALE = 1.22;

export type Colors = typeof lightColors;
