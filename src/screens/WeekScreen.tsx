import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Button, Pill, SectionHeading, useCompact } from '../components/Primitives';
import { Icon } from '../components/Icon';
import { colors, fonts, ui } from '../components/theme';
import Reveal from '../components/Reveal';
import {
  getWeekDays,
  getNightForDay,
  formatNightDate,
  formatDuration,
  formatMinutes,
} from '../domain';
export default function Week() {
  const compact = useCompact();
  const { nights, demo } = useNights();
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
  const selectedIndex = selected ? days.findIndex((day) => day.key === selected) : 6;
  const selectedNight = weekNights[Math.max(0, selectedIndex)];
  const selectedDay = days[Math.max(0, selectedIndex)];
  return (
    <View>
      <View
        style={[
          ui.row,
          { justifyContent: 'space-between', marginBottom: 13, flexWrap: 'wrap', gap: 10 },
        ]}
      >
        <Text style={ui.eyebrow}>YOUR WEEK</Text>
        {demo && <Pill text="SAMPLE NIGHTS" icon="sparkles" tint="purple" />}
      </View>
      <Text style={[ui.title, compact && { fontSize: 39, lineHeight: 46 }]}>
        The last seven nights.
      </Text>
      <Text style={[ui.subtitle, { marginTop: 10, marginBottom: 30 }]}>
        Compare snoring estimates from your recorded nights.
      </Text>
      <Reveal>
        <View style={[ui.card, { padding: compact ? 20 : 30 }]}>
          <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }]}>
            <View>
              <Text style={ui.eyebrow}>AVERAGE SNORING SCORE</Text>
              <View style={[ui.row, { gap: 12, marginTop: 8 }]}>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 55,
                    color: colors.green,
                    lineHeight: 63,
                  }}
                >
                  {average === null ? '—' : average}
                </Text>
                <Text style={[ui.small, { maxWidth: 190 }]}>
                  {eligible.length
                    ? `from ${eligible.length} counted ${eligible.length === 1 ? 'night' : 'nights'}\nHigher means more detected snoring.`
                    : 'No counted nights yet.\nRecord for at least 30 minutes.'}
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
                style={styles.arrow}
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
                style={[styles.arrow, offset === 0 && { opacity: 0.3 }]}
              >
                <Icon name="chevron" size={16} />
              </Pressable>
            </View>
          </View>
          <View style={{ marginTop: 32, flexDirection: 'row', height: 210 }}>
            <View
              style={{ width: 30, height: 170, justifyContent: 'space-between', paddingBottom: 0 }}
            >
              {[100, 75, 50, 25, 0].map((tick) => (
                <Text key={tick} style={[ui.small, { fontSize: 10, lineHeight: 11 }]}>
                  {tick}
                </Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  left: 0,
                  right: 0,
                  top: 3,
                  height: 165,
                  justifyContent: 'space-between',
                }}
              >
                {[0, 1, 2, 3, 4].map((row) => (
                  <View
                    key={row}
                    style={{ borderTopWidth: 1, borderColor: '#E9EDE3', borderStyle: 'dashed' }}
                  />
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  height: 210,
                  gap: compact ? 8 : 30,
                  paddingHorizontal: compact ? 5 : 28,
                }}
              >
                {days.map((day, index) => {
                  const night = weekNights[index];
                  const active = index === Math.max(0, selectedIndex);
                  return (
                    <Pressable
                      key={day.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${day.label}, ${night ? (night.eligible ? `score ${night.score}` : `did not count: ${night.exclusionReasons.join(' ')}`) : 'no night recorded'}`}
                      onPress={() => setSelected(day.key)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingBottom: 4,
                      }}
                    >
                      <View
                        style={{
                          height: 170,
                          width: '100%',
                          maxWidth: 66,
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        }}
                      >
                        {night && night.eligible && (
                          <Text
                            style={{
                              fontFamily: fonts.medium,
                              color: active ? colors.green : colors.muted,
                              fontSize: 12,
                              marginBottom: 7,
                            }}
                          >
                            {night.score}
                          </Text>
                        )}
                        <View
                          style={{
                            width: '85%',
                            height: night
                              ? night.eligible
                                ? Math.max(9, night.score * 1.48)
                                : 33
                              : 5,
                            backgroundColor: night
                              ? night.eligible
                                ? active
                                  ? colors.green
                                  : '#ACC0A5'
                                : '#F4EBDC'
                              : '#E8ECE2',
                            borderColor: night && !night.eligible ? '#D5B992' : 'transparent',
                            borderWidth: night && !night.eligible ? 1 : 0,
                            borderStyle: 'dashed',
                            borderTopLeftRadius: 8,
                            borderTopRightRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {night && !night.eligible && (
                            <Icon name="info" size={14} color={colors.orange} />
                          )}
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: active ? fonts.bold : fonts.regular,
                          color: active ? colors.green : colors.muted,
                          fontSize: 11,
                          marginTop: 12,
                        }}
                      >
                        {compact ? day.shortLabel : day.label}
                      </Text>
                      {day.isToday && (
                        <View
                          style={{
                            height: 3,
                            width: 3,
                            borderRadius: 2,
                            backgroundColor: colors.green,
                            marginTop: 5,
                          }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={[ui.row, { gap: 21, marginTop: 20, flexWrap: 'wrap' }]}>
            <Legend color="#ACC0A5" text="Counted night" />
            <Legend color="#F4EBDC" text="Did not count" dashed />
            <Legend color="#E8ECE2" text="No recording" />
          </View>
        </View>
      </Reveal>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 22, marginTop: 24 }}>
        <View style={[ui.card, { flex: compact ? undefined : 1.25 }]}>
          <SectionHeading
            title={formatNightDate(selectedDay.date.getTime())}
            label={selectedDay.isToday ? 'Today' : undefined}
          />
          {selectedNight ? (
            <>
              <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 32, color: colors.green }}>
                  {selectedNight.score}
                  <Text style={[ui.small, { fontSize: 12 }]}> / 100</Text>
                </Text>
                <Pill
                  text={selectedNight.eligible ? 'Counted' : 'Did not count'}
                  tint={selectedNight.eligible ? 'green' : 'orange'}
                  icon={selectedNight.eligible ? 'check' : 'info'}
                />
              </View>
              <Text style={ui.small}>
                {formatMinutes(selectedNight.snoringSeconds)} min estimated snoring ·{' '}
                {formatDuration(selectedNight.durationSeconds)} recorded
              </Text>
              {selectedNight.exclusionReasons.map((reason) => (
                <Text key={reason} style={[ui.small, { color: colors.orange, marginTop: 8 }]}>
                  {reason}
                </Text>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View morning card for ${selectedDay.label}`}
                onPress={() =>
                  router.navigate({ pathname: '/morning', params: { id: selectedNight.id } })
                }
                style={[ui.row, { gap: 8, marginTop: 22 }]}
              >
                <Text style={{ fontFamily: fonts.bold, color: colors.green, fontSize: 13 }}>
                  Open morning card
                </Text>
                <Icon name="arrow" size={17} />
              </Pressable>
            </>
          ) : (
            <View>
              <Text style={[ui.subtitle, { marginBottom: 20 }]}>No recording for this day.</Text>
              <Button
                title="Go to tonight"
                secondary
                icon="moon"
                onPress={() => router.navigate('/')}
              />
            </View>
          )}
        </View>
        <View
          style={{
            flex: compact ? undefined : 1,
            borderRadius: 22,
            backgroundColor: '#ECE8F2',
            padding: 26,
          }}
        >
          <Icon name="leaf" color={colors.purple} size={25} />
          <Text
            style={{
              fontFamily: fonts.serif,
              color: '#534963',
              fontSize: 25,
              marginTop: 13,
              marginBottom: 10,
            }}
          >
            Which nights count?
          </Text>
          <Text style={[ui.small, { color: '#7D7288', lineHeight: 21 }]}>
            Only clear, uninterrupted nights of 30 minutes or more count toward your average. A
            short or noisy night is still saved, so you always know what happened.
          </Text>
          <Text style={[ui.small, { marginTop: 12, color: '#7D7288' }]}>
            Tap any day to see the details. Your most recent session for each morning is shown.
          </Text>
        </View>
      </View>
    </View>
  );
}
function Legend({
  color,
  text,
  dashed = false,
}: {
  color: string;
  text: string;
  dashed?: boolean;
}) {
  return (
    <View style={[ui.row, { gap: 7 }]}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: color,
          borderWidth: dashed ? 1 : 0,
          borderStyle: 'dashed',
          borderColor: '#D5B992',
        }}
      />
      <Text style={[ui.small, { fontSize: 10 }]}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
