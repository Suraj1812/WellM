import React, { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { fonts, type ThemeColors } from './theme';
import { useTheme, useThemedStyles } from './ThemeProvider';
import { Icon, type IconName } from './Icon';
import { useReducedMotion } from './Motion';
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const press = (down: boolean) => {
    Animated.spring(scale, {
      toValue: down ? 0.98 : 1,
      speed: 30,
      bounciness: 0,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  };
  useEffect(() => () => scale.stopAnimation(), [scale]);
  return (
    <Animated.View style={{ transform: [{ scale: reduced ? 1 : scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [
          styles.button,
          secondary && styles.secondary,
          hovered && { backgroundColor: secondary ? colors.secondaryHover : colors.primaryHover },
          focused && { borderColor: colors.purple },
          { opacity: pressed || disabled || loading ? 0.72 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={secondary ? colors.green : colors.onPrimary} />
        ) : (
          <Icon name={icon} color={secondary ? colors.green : colors.onPrimary} size={19} />
        )}
        <Text style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Text>
      </Pressable>
    </Animated.View>
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
  const { colors, ui } = useTheme();
  return (
    <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>{title}</Text>
      {label && <Text style={ui.small}>{label}</Text>}
    </View>
  );
}
export function Waveform({
  values,
  color,
  height = 44,
  progress = 0,
  label = 'Recorded sound level',
}: {
  values: number[];
  color?: string;
  height?: number;
  progress?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  const waveformColor = color ?? colors.purple;
  const reduced = useReducedMotion();
  const bars = values.length ? values.slice(-48) : Array<number>(48).fill(0);
  return (
    <View
      accessible
      accessibilityLabel={values.length ? label : 'No sound samples yet'}
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
        <WaveformBar
          key={i}
          value={Number.isFinite(bar) ? Math.min(1, Math.max(0, bar)) : 0}
          height={height}
          color={waveformColor}
          opacity={progress && i / bars.length <= progress ? 1 : values.length ? 0.55 : 0.2}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

const WaveformBar = memo(function WaveformBar({
  value,
  height,
  color,
  opacity,
  reduced,
}: {
  value: number;
  height: number;
  color: string;
  opacity: number;
  reduced: boolean;
}) {
  const [level] = useState(() => new Animated.Value(Math.max(2 / height, value)));
  useEffect(() => {
    const animation = Animated.timing(level, {
      toValue: Math.max(2 / height, value),
      duration: reduced ? 0 : 180,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [height, level, reduced, value]);
  return (
    <Animated.View
      style={{
        flex: 1,
        minWidth: 2,
        maxWidth: 6,
        height,
        borderRadius: 3,
        backgroundColor: color,
        opacity,
        transform: [{ scaleY: level }],
      }}
    />
  );
});

export function ProgressBar({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const { colors } = useTheme();
  const progressColor = color ?? colors.green;
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const fraction = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const [progress] = useState(() => new Animated.Value(fraction));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: fraction,
      duration: reduced ? 0 : 320,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fraction, progress, reduced]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: colors.progressTrack,
      }}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 3,
          backgroundColor: progressColor,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-width / 2, 0],
              }),
            },
            { scaleX: progress },
          ],
        }}
      />
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: colors.green,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 22,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    secondary: { backgroundColor: colors.greenLight },
    buttonText: { fontFamily: fonts.bold, color: colors.onPrimary, fontSize: 15 },
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
