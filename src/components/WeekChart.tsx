import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NightSession, WeekDay } from '../domain/types';
import { Icon } from './Icon';
import { useMotionPreference } from './Motion';
import { fonts, type ThemeColors } from './theme';
import { useTheme, useThemedStyles } from './ThemeProvider';

const plotHeight = 160;

export function WeekChart({
  days,
  nights,
  selectedIndex,
  onSelect,
  onExplain,
  animationKey,
}: {
  days: WeekDay[];
  nights: (NightSession | undefined)[];
  selectedIndex: number;
  onSelect(key: string): void;
  onExplain(day: WeekDay, night: NightSession): void;
  animationKey: string;
}) {
  const { colors, ui } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduced = useMotionPreference();
  const [bars] = useState(() => Array.from({ length: 7 }, () => new Animated.Value(0)));
  const [lines] = useState(() => Array.from({ length: 5 }, () => new Animated.Value(0)));
  useEffect(() => {
    if (reduced === null) return;
    const values = [...bars, ...lines];
    values.forEach((value) => {
      value.stopAnimation();
      value.setValue(reduced ? 1 : 0);
    });
    if (reduced) return;
    const grid = Animated.stagger(
      65,
      [...lines].reverse().map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ),
    );
    const columns = Animated.stagger(
      60,
      bars.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 640,
          delay: 110,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ),
    );
    const animation = Animated.parallel([grid, columns]);
    animation.start();
    return () => animation.stop();
  }, [animationKey, bars, lines, reduced]);

  return (
    <View style={styles.chart}>
      <View style={styles.axis}>
        {[100, 75, 50, 25, 0].map((tick) => (
          <Text key={tick} style={[ui.small, styles.tick]}>
            {tick}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={styles.grid}>
          {lines.map((progress, row) => (
            <Animated.View
              key={row}
              style={{
                borderTopWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                  },
                ],
              }}
            />
          ))}
        </View>
        <View style={styles.columns}>
          {days.map((day, index) => {
            const night = nights[index];
            const selected = selectedIndex === index;
            const score = night?.analyzedSeconds ? Math.min(100, Math.max(0, night.score)) : null;
            const height = score === null ? 0 : (score / 100) * plotHeight;
            const color = night
              ? night.eligible
                ? selected
                  ? colors.green
                  : colors.unselectedBar
                : colors.orange
              : colors.border;
            const progress = bars[index];
            return (
              <View key={day.key} style={styles.column}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}, ${night ? (score === null ? `no analyzed audio. ${night.exclusionReasons.join(' ')}` : `snoring score ${score}. ${night.eligible ? 'Counted in average.' : `Excluded from average. ${night.exclusionReasons.join(' ')}`}`) : 'No recording'}`}
                  onPress={() => onSelect(day.key)}
                  style={({ pressed }) => [styles.daySelect, pressed && { opacity: 0.6 }]}
                >
                  <View style={styles.barSpace}>
                    {score !== null && (
                      <Animated.Text
                        style={[
                          styles.score,
                          {
                            bottom: height + 7,
                            color: selected ? colors.green : colors.muted,
                            opacity: progress,
                            transform: [
                              {
                                translateY: progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [height, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        {score}
                      </Animated.Text>
                    )}
                    {height > 0 ? (
                      <Animated.View
                        testID={`week-bar-${day.key}`}
                        style={{
                          width: '78%',
                          maxWidth: 58,
                          height,
                          backgroundColor: color,
                          borderWidth: night?.eligible ? 0 : 1,
                          borderColor: colors.orange,
                          borderStyle: 'dashed',
                          borderTopLeftRadius: 7,
                          borderTopRightRadius: 7,
                          opacity: progress,
                          transform: [
                            {
                              translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height / 2, 0],
                              }),
                            },
                            { scaleY: progress },
                          ],
                        }}
                      />
                    ) : (
                      <Animated.View
                        testID={`week-baseline-${day.key}`}
                        style={{
                          width: night ? '62%' : 12,
                          height: night ? 3 : 2,
                          borderRadius: 2,
                          backgroundColor: color,
                          opacity: progress,
                          transform: [
                            {
                              translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [6, 0],
                              }),
                            },
                          ],
                        }}
                      />
                    )}
                  </View>
                  <View style={[styles.day, selected && { backgroundColor: colors.greenLight }]}>
                    <Text
                      style={{
                        fontFamily: selected ? fonts.bold : fonts.regular,
                        fontSize: 11,
                        color: selected ? colors.green : colors.muted,
                      }}
                    >
                      {day.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.today,
                      { backgroundColor: day.isToday ? colors.green : 'transparent' },
                    ]}
                  />
                </Pressable>
                {night && !night.eligible && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Why ${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} did not count`}
                    onPress={() => onExplain(day, night)}
                    hitSlop={{ top: 4, bottom: 4 }}
                    style={({ pressed }) => [styles.qualityMarker, pressed && { opacity: 0.6 }]}
                  >
                    <View style={styles.qualityMarkerIcon}>
                      <Icon name="info" color={colors.orange} size={16} />
                    </View>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chart: { flexDirection: 'row', marginTop: 24, height: plotHeight + 68 },
    axis: { width: 27, height: plotHeight, marginTop: 24, justifyContent: 'space-between' },
    tick: { fontSize: 10, lineHeight: 10, transform: [{ translateY: -5 }] },
    grid: {
      position: 'absolute',
      top: 24,
      left: 0,
      right: 0,
      height: plotHeight,
      justifyContent: 'space-between',
    },
    columns: { flexDirection: 'row', gap: 5 },
    column: { flex: 1, alignItems: 'center', minWidth: 0 },
    daySelect: { width: '100%', alignItems: 'center' },
    barSpace: {
      height: plotHeight,
      marginTop: 24,
      width: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    score: { position: 'absolute', fontFamily: fonts.medium, fontSize: 12 },
    qualityMarker: {
      position: 'absolute',
      top: plotHeight + 8,
      width: '100%',
      maxWidth: 28,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qualityMarkerIcon: {
      backgroundColor: colors.white,
      borderRadius: 10,
      padding: 2,
    },
    day: { marginTop: 10, paddingHorizontal: 4, paddingVertical: 7, borderRadius: 8 },
    today: { marginTop: 3, width: 3, height: 3, borderRadius: 2 },
  });
