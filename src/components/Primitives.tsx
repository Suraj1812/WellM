import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, ui } from './theme';
import { Icon, type IconName } from './Icon';
export function useCompact() {
  return useWindowDimensions().width < 760;
}
export function Button({
  title,
  onPress,
  icon = 'arrow',
  secondary = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress(): void;
  icon?: IconName;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { opacity: pressed || disabled ? 0.65 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.green : '#fff'} />
      ) : (
        <Icon name={icon} color={secondary ? colors.green : '#fff'} size={19} />
      )}
      <Text style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Text>
    </Pressable>
  );
}
export function Pill({
  text,
  icon,
  tint = 'green',
}: {
  text: string;
  icon?: IconName;
  tint?: 'green' | 'purple' | 'orange';
}) {
  const color =
    tint === 'purple' ? colors.purple : tint === 'orange' ? colors.orange : colors.green;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor:
            tint === 'purple'
              ? colors.lavender
              : tint === 'orange'
                ? colors.orangeLight
                : colors.greenLight,
        },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={color} />}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}
export function SectionHeading({ title, label }: { title: string; label?: string }) {
  return (
    <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>{title}</Text>
      {label && <Text style={ui.small}>{label}</Text>}
    </View>
  );
}
export function Waveform({
  values,
  color = colors.purple,
  height = 44,
  progress = 0,
}: {
  values: number[];
  color?: string;
  height?: number;
  progress?: number;
}) {
  const bars = values.length
    ? values.slice(-48)
    : Array.from(
        { length: 48 },
        (_, i) => 0.15 + Math.abs(Math.sin(i * 0.79) * Math.cos(i * 0.3)) * 0.6,
      );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height,
        gap: 3,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            minWidth: 2,
            maxWidth: 6,
            height: Math.max(4, Math.min(1, bar) * height),
            borderRadius: 3,
            backgroundColor: color,
            opacity: progress && i / bars.length <= progress ? 1 : 0.45,
          }}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.green,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  secondary: { backgroundColor: colors.greenLight },
  buttonText: { fontFamily: fonts.bold, color: '#fff', fontSize: 15 },
  pill: {
    borderRadius: 30,
    paddingVertical: 7,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: fonts.medium, fontSize: 11 },
});
