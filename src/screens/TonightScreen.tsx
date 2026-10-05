import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Icon } from '../components/Icon';
import { Button, SectionHeading, Waveform } from '../components/Primitives';
import { SignalHalo } from '../components/Motion';
import { fonts, type ThemeColors } from '../components/theme';
import { useTheme, useThemedStyles } from '../components/ThemeProvider';
import Reveal from '../components/Reveal';
import { formatDuration, formatRelativeNightDate } from '../domain';

export default function Tonight() {
  const { colors, ui } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { engine, nights, start, stop, busy, ready } = useNights();
  const recording = engine.status === 'recording';
  const active = engine.active;
  const latest = nights[0];
  const elapsed = active?.durationSeconds || 0;
  const analyzed = active?.analyzedSeconds || 0;
  const noise = analyzed ? Math.min(1, (active?.noisySeconds || 0) / analyzed) : 0;
  const label = active
    ? recording
      ? 'Stop & see summary'
      : 'Retry saving summary'
    : busy
      ? 'Starting…'
      : 'Start listening';
  return (
    <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>
      <Text style={styles.title}>Tonight</Text>
      {engine.error && (
        <View accessibilityRole="alert" style={styles.error}>
          <Icon name="info" color={colors.orange} size={16} />
          <Text style={[ui.small, { flex: 1, color: colors.orange }]}>{engine.error}</Text>
        </View>
      )}
      <Reveal variant="scale">
        <View style={[ui.card, styles.recorder]}>
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <SignalHalo active={recording} level={active?.waveform.at(-1) || 0}>
              <View style={styles.mic}>
                <Icon name="mic" color={colors.green} size={28} />
              </View>
            </SignalHalo>
            <Text style={styles.timer}>
              {active ? formatDuration(elapsed) : 'Start a recording'}
            </Text>
            <Text style={[ui.small, { marginTop: 7 }]}>
              {active
                ? recording
                  ? 'Listening'
                  : 'Ready to save'
                : 'Quiet room. Microphone uncovered.'}
            </Text>
            {active && (
              <View style={{ width: '80%', marginTop: 24 }}>
                <Waveform
                  values={active.waveform}
                  color={colors.green}
                  height={46}
                  label="Live microphone sound level"
                />
              </View>
            )}
          </View>
          {active && (
            <View style={styles.metrics}>
              <LiveMetric value={formatDuration(analyzed)} label="Analyzed" />
              <LiveMetric value={formatDuration(active.snoringSeconds)} label="Snoring" />
              <LiveMetric value={analyzed ? `${Math.round(noise * 100)}%` : '—'} label="Noise" />
            </View>
          )}
          <Button
            title={label}
            icon={active ? 'stop' : 'mic'}
            loading={busy || !ready}
            onPress={() => {
              if (active)
                void stop().then((night) => {
                  if (night) router.navigate({ pathname: '/morning', params: { id: night.id } });
                });
              else void start();
            }}
          />
          <Text style={[ui.small, { textAlign: 'center', marginTop: 13 }]}>
            {Platform.OS === 'web'
              ? 'Keep this tab open while recording.'
              : 'Listening continues with the screen locked.'}
          </Text>
        </View>
      </Reveal>
      {latest && (
        <Reveal delay={80}>
          <View style={{ marginTop: 28 }}>
            <SectionHeading title="Last recording" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your latest morning summary"
              onPress={() => router.navigate({ pathname: '/morning', params: { id: latest.id } })}
              style={({ pressed }) => [ui.card, styles.last, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14 }}>
                  {formatRelativeNightDate(latest.endedAt)}
                </Text>
                <Text style={ui.small}>
                  {formatDuration(latest.durationSeconds)} recorded ·{' '}
                  {formatDuration(latest.snoringSeconds)} snoring
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.green }}>
                {latest.analyzedSeconds ? latest.score : '—'}
              </Text>
              <Icon name="chevron" size={16} />
            </Pressable>
          </View>
        </Reveal>
      )}
    </View>
  );
}
function LiveMetric({ value, label }: { value: string; label: string }) {
  const { colors, ui } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 20, color: colors.green }}>{value}</Text>
      <Text style={ui.small}>{label}</Text>
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontFamily: fonts.serif,
      color: colors.ink,
      fontSize: 34,
      lineHeight: 42,
      marginBottom: 24,
    },
    recorder: { padding: 26 },
    mic: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.greenLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timer: {
      fontFamily: fonts.serif,
      color: colors.ink,
      fontSize: 34,
      lineHeight: 44,
      marginTop: 22,
      fontVariant: ['tabular-nums'],
    },
    metrics: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingVertical: 22,
      marginBottom: 8,
    },
    last: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
    error: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.orangeLight,
      marginBottom: 18,
    },
  });
