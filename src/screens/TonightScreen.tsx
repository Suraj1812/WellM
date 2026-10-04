import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Icon } from '../components/Icon';
import { Button, Pill, SectionHeading, useCompact, Waveform } from '../components/Primitives';
import { colors, fonts, ui } from '../components/theme';
import Reveal from '../components/Reveal';
import { formatDuration, formatMinutes, formatRelativeNightDate } from '../domain';
export default function Tonight() {
  const compact = useCompact();
  const { engine, nights, start, stop, demo, busy, ready } = useNights();
  const recording = engine.status === 'recording';
  const hasActiveNight = Boolean(engine.active);
  const latest = nights[0];
  const actionLabel = hasActiveNight
    ? recording
      ? 'Stop & see summary'
      : 'Retry saving summary'
    : demo
      ? 'Preview a night'
      : 'Start listening';
  return (
    <View>
      {engine.error && (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: colors.orangeLight,
            borderRadius: 15,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Icon name="info" color={colors.orange} size={18} />
          <Text style={[ui.small, { flex: 1, color: colors.orange }]}>{engine.error}</Text>
        </View>
      )}
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
        <Text style={ui.eyebrow}>TONIGHT</Text>
        {!compact && <Pill text="ON-DEVICE & OFFLINE" icon="shield" />}
      </View>
      <Text style={[ui.title, compact && { fontSize: 37, lineHeight: 44 }]}>
        {recording
          ? 'Listening for the night.'
          : hasActiveNight
            ? 'Your summary needs a retry.'
            : 'Ready when you are.'}
      </Text>
      <Text style={[ui.subtitle, { marginTop: 13, marginBottom: compact ? 26 : 33 }]}>
        {recording
          ? demo
            ? 'This is a preview. Your microphone is off.'
            : 'You can lock your phone. Listening will continue in the background.'
          : hasActiveNight
            ? 'Listening has stopped. Review the message above, then retry saving your night.'
            : 'Start listening before bed. Review your snoring sounds in the morning.'}
      </Text>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 24 }}>
        <View style={[styles.nightCard, { flex: compact ? undefined : 1.22 }]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.nightEyebrow}>
              {hasActiveNight ? 'YOUR NIGHT' : 'NIGHT LISTENING'}
            </Text>
            <View style={[ui.row, { gap: 5 }]}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: recording ? colors.green : '#ADB7AE',
                }}
              />
              <Text style={styles.nightLabel}>
                {recording
                  ? demo
                    ? 'Preview'
                    : 'Listening'
                  : hasActiveNight
                    ? 'Needs attention'
                    : 'Ready when you are'}
              </Text>
            </View>
          </View>
          {hasActiveNight ? (
            <View style={{ alignItems: 'center', paddingVertical: compact ? 26 : 46 }}>
              <View style={styles.recordingIcon}>
                <Icon name="mic" color={colors.green} size={29} />
              </View>
              <Text style={styles.timer}>
                {formatDuration(engine.active?.durationSeconds || 0)}
              </Text>
              <View style={{ width: '65%', marginTop: 13 }}>
                <Waveform values={engine.active?.waveform || []} color={colors.green} height={38} />
              </View>
              <Text style={[styles.nightLabel, { marginTop: 15 }]}>
                {demo
                  ? 'Sample sound activity'
                  : recording
                    ? 'Sound processed privately on your phone'
                    : 'Saved recording duration'}
              </Text>
            </View>
          ) : (
            <Image
              source={require('../../assets/images/bedside-evening.jpg')}
              accessibilityLabel="A phone on a bedside table in a quiet bedroom"
              resizeMode="cover"
              style={{
                width: '100%',
                height: compact ? 180 : 270,
                borderRadius: 15,
                marginTop: 22,
                marginBottom: 21,
              }}
            />
          )}
          <Text style={styles.nightTitle}>
            {recording
              ? 'Listening in progress'
              : hasActiveNight
                ? 'Your recorded night'
                : 'One tap before bed.'}
          </Text>
          <Text style={styles.nightDescription}>
            {hasActiveNight
              ? 'Your morning summary will be ready when you finish.'
              : 'We’ll save a summary and your loudest 10 seconds.'}
          </Text>
          <View style={{ marginTop: 22 }}>
            <Button
              title={actionLabel}
              icon={hasActiveNight ? 'stop' : 'mic'}
              loading={busy || !ready}
              onPress={() => {
                if (hasActiveNight)
                  void stop().then((night) => {
                    if (night) router.navigate({ pathname: '/morning', params: { id: night.id } });
                  });
                else void start();
              }}
            />
          </View>
          <View style={[ui.row, { justifyContent: 'center', gap: 7, marginTop: 14 }]}>
            <Icon name={recording ? 'moon' : 'shield'} size={13} color={colors.muted} />
            <Text style={styles.nightLabel}>
              {demo
                ? 'Sample preview · no audio is recorded'
                : recording
                  ? 'Keeps listening with the screen locked'
                  : 'Processed on your phone. Never uploaded.'}
            </Text>
          </View>
        </View>
        <View style={{ flex: compact ? undefined : 1, gap: 20 }}>
          <Reveal>
            <View style={ui.card}>
              <SectionHeading title="Before you start" />
              <Text style={[ui.small, { marginTop: -8, marginBottom: 20 }]}>
                For a more reliable recording.
              </Text>
              <SetupStep
                number="01"
                icon="phone"
                title="Keep your phone nearby"
                body="On your bedside table, microphone uncovered. About an arm’s length away."
              />
              <SetupStep
                number="02"
                icon="volume"
                title="Keep the room quiet"
                body="Turn off the TV and music. Other sounds can affect snoring detection."
              />
              <SetupStep
                number="03"
                icon="moon"
                title="Record for at least 30 minutes"
                body="Let it listen for at least 30 minutes. Plug in your phone and lock the screen."
                last
              />
            </View>
          </Reveal>
          <View style={styles.reassurance}>
            <View style={styles.reassuranceIcon}>
              <Icon name="leaf" size={23} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 13,
                  color: colors.green,
                  marginBottom: 4,
                }}
              >
                A sound journal, not a diagnosis.
              </Text>
              <Text style={[ui.small, { color: '#6A7A6E' }]}>
                Use it to notice snoring patterns. It doesn’t measure sleep quality.
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Reveal>
        <View style={{ marginTop: 29 }}>
          <SectionHeading
            title="Your last night"
            label={latest ? formatRelativeNightDate(latest.endedAt) : 'No recordings yet'}
          />
          {latest ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your latest morning summary"
              onPress={() => router.navigate({ pathname: '/morning', params: { id: latest.id } })}
              style={({ pressed }) => [styles.lastNight, { opacity: pressed ? 0.75 : 1 }]}
            >
              <View style={styles.lastIcon}>
                <Icon name="moon" size={24} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lastTitle}>
                  {latest.eligible ? 'Your latest recording' : 'Saved, with a quality note'}
                </Text>
                <Text style={ui.small}>
                  {formatMinutes(latest.snoringSeconds)} min of estimated snoring ·{' '}
                  {formatDuration(latest.durationSeconds)} recorded
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginHorizontal: compact ? 5 : 20 }}>
                <Text style={{ fontFamily: fonts.serif, color: colors.green, fontSize: 32 }}>
                  {latest.score}
                </Text>
                <Text style={[ui.small, { fontSize: 10 }]}>snoring score</Text>
              </View>
              <Icon name="chevron" size={18} color={colors.muted} />
            </Pressable>
          ) : (
            <View style={[styles.lastNight, { gap: 15 }]}>
              <Icon name="sun" color={colors.purple} size={26} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lastTitle}>No nights recorded yet.</Text>
                <Text style={ui.small}>
                  Start a night to see your snoring estimate and loudest moment.
                </Text>
              </View>
            </View>
          )}
        </View>
      </Reveal>
    </View>
  );
}
function SetupStep({
  number,
  icon,
  title,
  body,
  last = false,
}: {
  number: string;
  icon: 'phone' | 'volume' | 'moon';
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        ui.row,
        {
          alignItems: 'flex-start',
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderColor: '#EFF0EA',
          gap: 13,
        },
      ]}
    >
      <View style={styles.stepIcon}>
        <Icon name={icon} size={19} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={[ui.small, { marginTop: 4 }]}>{body}</Text>
      </View>
      <Text style={{ fontFamily: fonts.regular, color: '#B4BEB3', fontSize: 11, paddingTop: 2 }}>
        {number}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  nightCard: {
    borderRadius: 24,
    padding: 27,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nightEyebrow: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.7, color: colors.muted },
  nightLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  nightTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    textAlign: 'center',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  nightDescription: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  recordingIcon: {
    width: 67,
    height: 67,
    borderRadius: 34,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { fontFamily: fonts.serif, color: colors.green, fontSize: 45, marginTop: 14 },
  reassurance: {
    flexDirection: 'row',
    padding: 21,
    gap: 15,
    backgroundColor: '#EAF0E7',
    borderRadius: 18,
  },
  reassuranceIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#DFE8DA',
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F1F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  lastNight: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 21,
    backgroundColor: '#fff',
    borderRadius: 19,
    borderColor: colors.border,
    borderWidth: 1,
  },
  lastIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EEEBF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 17,
  },
  lastTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink, marginBottom: 4 },
});
