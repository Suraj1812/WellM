import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Button, Pill, SectionHeading, useCompact } from '../components/Primitives';
import { Icon } from '../components/Icon';
import { ClipPlayer } from '../components/ClipPlayer';
import { fonts, type ThemeColors } from '../components/theme';
import { useTheme, useThemedStyles } from '../components/ThemeProvider';
import Reveal from '../components/Reveal';
import { useReducedMotion } from '../components/Motion';
import { formatClock, formatDuration, formatRelativeNightDate } from '../domain';
export default function Morning() {
  const { colors, ui } = useTheme();
  const styles = useThemedStyles(createStyles);
  const compact = useCompact();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { nights, ready, remove, engine } = useNights();
  const [confirm, setConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(8);
  const [details, setDetails] = useState(false);
  const reduced = useReducedMotion();
  const night = nights.find((item) => item.id === id) || nights[0];
  if (!night)
    return (
      <Reveal variant="scale">
        <View style={{ alignItems: 'center', paddingVertical: 70, gap: 19 }}>
          <View style={styles.emptyIcon}>
            <Icon name="sun" size={40} color={colors.purple} />
          </View>
          <Text style={[ui.title, { fontSize: compact ? 34 : 42, textAlign: 'center' }]}>
            {ready ? 'No recordings yet' : 'Loading…'}
          </Text>
          <Text style={[ui.subtitle, { maxWidth: 390, textAlign: 'center' }]}>
            {engine.status === 'recording'
              ? 'Stop listening to see your summary.'
              : 'Your first recording will appear here.'}
          </Text>
          <Button title="Start recording" icon="moon" onPress={() => router.navigate('/')} />
        </View>
      </Reveal>
    );
  const noiseRatio = night.analyzedSeconds ? night.noisySeconds / night.analyzedSeconds : 0;
  const coverage = night.durationSeconds ? night.analyzedSeconds / night.durationSeconds : 0;
  return (
    <View>
      <Text style={{ fontFamily: fonts.serif, color: colors.ink, fontSize: 34, lineHeight: 42 }}>
        Morning
      </Text>
      <Text style={[ui.subtitle, { marginTop: 10, marginBottom: 16 }]}>
        {formatRelativeNightDate(night.endedAt)} · {formatClock(night.startedAt)} –{' '}
        {formatClock(night.endedAt)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a saved recording"
        onPress={() => setHistoryOpen(true)}
        style={({ pressed }) => [
          ui.row,
          {
            alignSelf: 'flex-start',
            gap: 8,
            marginBottom: 26,
            paddingVertical: 8,
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Icon name="moon" size={16} />
        <Text style={{ fontFamily: fonts.medium, color: colors.green, fontSize: 12 }}>
          Recordings ({nights.length})
        </Text>
        <Icon name="chevron" size={14} />
      </Pressable>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 24 }}>
        <Reveal variant="scale" style={{ flex: compact ? undefined : 1 }}>
          <View
            style={[
              ui.card,
              {
                alignItems: 'center',
                backgroundColor: colors.scoreSurface,
                borderColor: colors.scoreBorder,
              },
            ]}
          >
            <View style={{ width: '100%' }}>
              <SectionHeading title="Snoring score" />
            </View>
            <View
              style={{
                width: 218,
                height: 218,
                marginVertical: 5,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessibilityLabel={
                night.analyzedSeconds
                  ? `Snoring score ${night.score} out of 100. Higher means more detected snoring.`
                  : 'No score available because no audio was analyzed.'
              }
            >
              <Svg width={218} height={218} style={{ position: 'absolute' }} viewBox="0 0 218 218">
                <Circle
                  cx="109"
                  cy="109"
                  r="92"
                  fill="none"
                  stroke={colors.scoreTrack}
                  strokeWidth="12"
                />
                <Circle
                  cx="109"
                  cy="109"
                  r="92"
                  fill="none"
                  stroke={colors.green}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(night.score / 100) * 578} 578`}
                  transform="rotate(-90 109 109)"
                />
              </Svg>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 78,
                  lineHeight: 90,
                  color: colors.green,
                }}
              >
                {night.analyzedSeconds ? night.score : '—'}
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.scoreCaption }}>
                OUT OF 100
              </Text>
            </View>
            <Text style={[ui.small, { marginTop: 8, marginBottom: 24 }]}>
              {night.analyzedSeconds ? 'Higher means more snoring.' : 'No audio analyzed.'}
            </Text>
            <View
              style={[
                ui.row,
                {
                  width: '100%',
                  borderTopWidth: 1,
                  borderColor: colors.scoreBorder,
                  paddingTop: 23,
                  justifyContent: 'space-around',
                },
              ]}
            >
              <Metric value={formatDuration(night.snoringSeconds)} label="Snoring" />
              <View style={{ width: 1, height: 42, backgroundColor: colors.scoreBorder }} />
              <Metric value={formatDuration(night.durationSeconds)} label="Recorded" />
            </View>
          </View>
        </Reveal>
        <View style={{ flex: compact ? undefined : 1.12, gap: 20 }}>
          <Reveal delay={90}>
            <View style={ui.card}>
              <SectionHeading
                title="Loudest clip"
                label={
                  night.loudestClipSeconds
                    ? `${Math.round(night.loudestClipSeconds)} seconds`
                    : 'Local playback'
                }
              />
              <ClipPlayer night={night} />
            </View>
          </Reveal>
          <Reveal delay={150}>
            <View style={ui.card}>
              <View
                style={[
                  ui.row,
                  { justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
                ]}
              >
                <Text style={styles.cardTitle}>Quality</Text>
                <Pill
                  text={night.eligible ? 'Counted' : 'Not counted'}
                  tint={night.eligible ? 'green' : 'orange'}
                  icon={night.eligible ? 'check' : 'info'}
                />
              </View>
              {!night.eligible && (
                <View style={{ marginBottom: 18 }}>
                  {night.exclusionReasons.map((reason) => (
                    <View
                      key={reason}
                      style={[ui.row, { alignItems: 'flex-start', gap: 8, marginBottom: 7 }]}
                    >
                      <Icon name="info" size={14} color={colors.orange} />
                      <Text style={[ui.small, { flex: 1, color: colors.orange }]}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}
              <QualityRow
                label="Analyzed"
                value={
                  night.analyzedSeconds ? `${Math.min(100, Math.round(coverage * 100))}%` : '—'
                }
              />
              <QualityRow
                label="Noise"
                value={night.analyzedSeconds ? `${Math.round(noiseRatio * 100)}%` : '—'}
                last
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={details ? 'Hide recording details' : 'Show recording details'}
                accessibilityState={{ expanded: details }}
                aria-expanded={details}
                onPress={() => setDetails((value) => !value)}
                style={[ui.row, { gap: 8, paddingVertical: 12, minHeight: 44 }]}
              >
                <Text style={[ui.small, { color: colors.green }]}>
                  {details ? 'Hide details' : 'Recording details'}
                </Text>
                <View style={{ transform: [{ rotate: details ? '-90deg' : '90deg' }] }}>
                  <Icon name="chevron" size={16} />
                </View>
              </Pressable>
              {details && (
                <>
                  <QualityRow label="Captured" value={formatDuration(night.durationSeconds)} />
                  <QualityRow label="Analyzed" value={formatDuration(night.analyzedSeconds)} />
                  <QualityRow label="Snoring" value={formatDuration(night.snoringSeconds)} />
                  <QualityRow label="Noise" value={formatDuration(night.noisySeconds)} last />
                </>
              )}
            </View>
          </Reveal>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete this night and its audio"
        onPress={() => setConfirm(true)}
        style={{ alignSelf: 'flex-start', paddingVertical: 17 }}
      >
        <Text style={[ui.small, { color: colors.orange }]}>Delete recording</Text>
      </Pressable>
      <Modal
        visible={confirm}
        transparent
        animationType={reduced ? 'none' : 'fade'}
        onRequestClose={() => setConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={[ui.card, { maxWidth: 400, width: '100%' }]}>
            <Text style={[ui.title, { fontSize: 30, lineHeight: 37 }]}>Delete recording?</Text>
            <Text style={[ui.body, { marginVertical: 20 }]}>
              This removes the summary and audio clip.
            </Text>
            <Button
              title="Delete recording"
              icon="trash"
              onPress={() => {
                void remove(night.id);
                setConfirm(false);
              }}
            />
            <View style={{ height: 10 }} />
            <Button title="Cancel" secondary icon="close" onPress={() => setConfirm(false)} />
          </View>
        </View>
      </Modal>
      <Modal
        visible={historyOpen}
        transparent
        animationType={reduced ? 'none' : 'fade'}
        onRequestClose={() => setHistoryOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={[ui.card, { maxWidth: 480, width: '100%', maxHeight: '85%' }]}>
            <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <Text style={[ui.title, { fontSize: 28, lineHeight: 36 }]}>Recordings</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close recordings"
                onPress={() => setHistoryOpen(false)}
                style={{ padding: 12, minWidth: 44, minHeight: 44 }}
              >
                <Icon name="close" size={18} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {nights.slice(0, historyLimit).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === night.id }}
                  accessibilityLabel={`${formatRelativeNightDate(item.endedAt)} at ${formatClock(item.startedAt)}, ${formatDuration(item.durationSeconds)}, ${item.eligible ? 'counted' : 'did not count'}`}
                  onPress={() => {
                    setHistoryOpen(false);
                    router.navigate({ pathname: '/morning', params: { id: item.id } });
                  }}
                  style={({ pressed }) => [
                    styles.historyRow,
                    item.id === night.id && { backgroundColor: colors.greenLight },
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>
                      {formatRelativeNightDate(item.endedAt)} · {formatClock(item.startedAt)}
                    </Text>
                    <Text style={[ui.small, { fontSize: 11 }]}>
                      {formatDuration(item.durationSeconds)} recorded ·{' '}
                      {item.eligible ? 'Counted' : 'Quality note'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.green }}>
                    {item.analyzedSeconds ? item.score : '—'}
                  </Text>
                  <Icon name={item.id === night.id ? 'check' : 'chevron'} size={16} />
                </Pressable>
              ))}
              {historyLimit < nights.length && (
                <View style={{ marginTop: 16 }}>
                  <Button
                    title="Show more"
                    secondary
                    icon="chevron"
                    onPress={() => setHistoryLimit((limit) => limit + 8)}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  const { colors, ui } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.green }}>{value}</Text>
      <Text style={[ui.small, { marginTop: 3 }]}>{label}</Text>
    </View>
  );
}
function QualityRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const { colors, ui } = useTheme();
  return (
    <View
      style={[
        ui.row,
        {
          justifyContent: 'space-between',
          paddingVertical: 10,
          borderBottomWidth: last ? 0 : 1,
          borderColor: colors.divider,
        },
      ]}
    >
      <Text style={ui.small}>{label}</Text>
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize: 12,
          color: colors.ink,
          flexShrink: 1,
          textAlign: 'right',
          maxWidth: '62%',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
    emptyIcon: {
      backgroundColor: colors.lavender,
      borderRadius: 35,
      width: 90,
      height: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 13,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginBottom: 4,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
  });
