import { StyleSheet } from 'react-native';
export const colors = {
  background: '#F7F7F2',
  white: '#FFFFFF',
  ink: '#252E2A',
  muted: '#68736B',
  green: '#3D604B',
  greenLight: '#E9F0E7',
  lavender: '#E8E4F3',
  purple: '#77668D',
  border: '#E5E7DF',
  orange: '#905829',
  orangeLight: '#FBF0E3',
  navy: '#282A48',
};
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_600SemiBold',
  serif: 'Fraunces_400Regular',
};
export const ui = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.2, color: colors.muted },
  title: {
    fontFamily: fonts.serif,
    color: colors.ink,
    fontSize: 48,
    lineHeight: 55,
    letterSpacing: -1.8,
  },
  subtitle: { fontFamily: fonts.regular, color: colors.muted, fontSize: 15, lineHeight: 24 },
  body: { fontFamily: fonts.regular, color: colors.ink, fontSize: 14, lineHeight: 22 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 26,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.muted },
});
