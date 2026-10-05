import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Button, Pill, useCompact } from '../components/Primitives';
import { Icon } from '../components/Icon';
import { WeekChart } from '../components/WeekChart';
import { fonts, type ThemeColors } from '../components/theme';
import { useTheme, useThemedStyles } from '../components/ThemeProvider';
import Reveal from '../components/Reveal';
import {
  getWeekDays,
  getNightForDay,
  formatNightDate,
  formatDuration,
  formatMinutes,
} from '../domain';

export default function Week() {
  const { colors, ui } = useTheme();
  const styles = useThemedStyles(createStyles);
  const compact = useCompact();
  const { nights, ready, notify } = useNights();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const anchor = new Date();
  anchor.setDate(anchor.getDate() + offset * 7);
  const days = getWeekDays(anchor);
  const weekNights = days.map((day) => getNightForDay(nights, day.key));
  const eligible = weekNights.filter((night) => night?.eligible);
  const average = eligible.length
    ? Math.round(eligible.reduce((sum, night) => sum + night!.score, 0) / eligible.length)
    : null;
  const selectedIndex = Math.max(0, selected ? days.findIndex((day) => day.key === selected) : 6);
  const selectedNight = weekNights[selectedIndex];
  const selectedDay = days[selectedIndex];
  const animationKey = `${days[0].key}:${weekNights.map((night) => (night ? `${night.id}:${night.score}:${night.analyzedSeconds}` : '')).join('|')}`;

  if (!ready)
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.green} accessibilityLabel="Loading recordings" />
      </View>
    );

  return (
    <View>
      <Text
        style={[
          ui.title,
          { fontSize: compact ? 36 : 42, lineHeight: compact ? 44 : 52, marginBottom: 24 },
        ]}
      >
        My week
      </Text>
      <View style={[ui.card, { padding: compact ? 18 : 28 }]}>
        <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }]}>
          <View>
            <Text style={ui.small}>Average snoring score</Text>
            <View style={[ui.row, { gap: 12, marginTop: 5 }]}>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 48,
                  lineHeight: 56,
                  color: colors.green,
                }}
              >
                {average ?? '—'}
              </Text>
              <Text style={ui.small}>
                {eligible.length
                  ? `${eligible.length} counted ${eligible.length === 1 ? 'night' : 'nights'}`
                  : 'No counted nights'}
              </Text>
            </View>
          </View>
          <View style={[ui.row, { gap: 9 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous seven days"
              onPress={() => {
                setOffset((old) => old - 1);
                setSelected(null);
              }}
              style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
            >
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <Icon name="chevron" size={16} />
              </View>
            </Pressable>
            <Text style={[ui.small, { fontFamily: fonts.medium, color: colors.ink }]}>
              {days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next seven days"
              accessibilityState={{ disabled: offset === 0 }}
              disabled={offset === 0}
              onPress={() => {
                setOffset((old) => Math.min(0, old + 1));
                setSelected(null);
              }}
              style={({ pressed }) => [
                styles.arrow,
                offset === 0 && { opacity: 0.3 },
                pressed && styles.pressed,
              ]}
            >
              <Icon name="chevron" size={16} />
            </Pressable>
          </View>
        </View>
        <WeekChart
          days={days}
          nights={weekNights}
          selectedIndex={selectedIndex}
          onSelect={setSelected}
          onExplain={(day, night) => {
            setSelected(day.key);
            notify(
              'Not counted',
              `${formatNightDate(day.date.getTime())}\n\n${night.exclusionReasons.join('\n')}`,
            );
          }}
          animationKey={animationKey}
        />
      </View>
      <Reveal
        key={`${selectedDay.key}:${selectedNight?.id || ''}`}
        variant="fade"
        style={{ marginTop: 18 }}
      >
        <View style={[ui.card, { padding: compact ? 20 : 26 }]}>
          <View
            style={[
              ui.row,
              { justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
            ]}
          >
            <Text
              style={{ fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink }}
            >
              {formatNightDate(selectedDay.date.getTime())}
            </Text>
            {selectedNight && (
              <Pill
                text={selectedNight.eligible ? 'Counted' : 'Not counted'}
                tint={selectedNight.eligible ? 'green' : 'orange'}
              />
            )}
          </View>
          {selectedNight ? (
            <>
              <View style={[ui.row, { flexWrap: 'wrap', gap: 18, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text
                    testID="selected-night-score"
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 32,
                      lineHeight: 44,
                      includeFontPadding: false,
                      color: colors.green,
                    }}
                  >
                    {selectedNight.analyzedSeconds ? selectedNight.score : '—'}
                  </Text>
                  <Text style={ui.small}>/ 100</Text>
                </View>
                <Text style={[ui.small, { flex: 1, minWidth: 140 }]}>
                  {formatMinutes(selectedNight.snoringSeconds)} min snoring ·{' '}
                  {formatDuration(selectedNight.durationSeconds)} recorded
                </Text>
              </View>
              {!selectedNight.eligible && (
                <Text
                  accessibilityLabel={selectedNight.exclusionReasons.join(' ')}
                  style={[ui.small, { color: colors.orange }]}
                >
                  {selectedNight.exclusionReasons[0]}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open recording for ${selectedDay.label}`}
                onPress={() =>
                  router.navigate({ pathname: '/morning', params: { id: selectedNight.id } })
                }
                style={({ pressed }) => [
                  ui.row,
                  {
                    gap: 8,
                    marginTop: 12,
                    minHeight: 44,
                    alignSelf: 'flex-start',
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={{ fontFamily: fonts.bold, color: colors.green, fontSize: 13 }}>
                  View recording
                </Text>
                <Icon name="arrow" size={16} />
              </Pressable>
            </>
          ) : (
            <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }]}>
              <Text style={ui.small}>No recording</Text>
              <Button
                title="Record tonight"
                secondary
                icon="moon"
                onPress={() => router.navigate('/')}
              />
            </View>
          )}
        </View>
      </Reveal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    arrow: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.controlSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { backgroundColor: colors.secondaryHover, transform: [{ scale: 0.95 }] },
  });
