import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useNights } from '../state/NightProvider';
import { Button, Pill, SectionHeading, useCompact } from '../components/Primitives';
import { Icon } from '../components/Icon';
import { ClipPlayer } from '../components/ClipPlayer';
import { colors, fonts, ui } from '../components/theme';
import Reveal from '../components/Reveal';
import { formatClock, formatDuration, formatMinutes, formatRelativeNightDate } from '../domain';
export default function Morning() {
  const compact = useCompact();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { nights, ready, remove, engine } = useNights();
  const [confirm, setConfirm] = useState(false);
  const night = nights.find((item) => item.id === id) || nights[0];
  if (!night)
    return (
      <View style={{ alignItems: 'center', paddingVertical: 70, gap: 19 }}>
        <View style={styles.emptyIcon}>
          <Icon name="sun" size={40} color={colors.purple} />
        </View>
        <Text style={[ui.title, { fontSize: compact ? 34 : 42, textAlign: 'center' }]}>
          {ready ? 'No summary yet.' : 'Getting your night ready…'}
        </Text>
        <Text style={[ui.subtitle, { maxWidth: 390, textAlign: 'center' }]}>
          {engine.status === 'recording'
            ? 'Your night is still listening. Finish it to see your morning card.'
            : 'Start listening before bed. Your summary will be here when you finish.'}
        </Text>
        <Button title="Go to tonight" icon="moon" onPress={() => router.navigate('/')} />
      </View>
    );
  const noiseRatio = night.analyzedSeconds ? night.noisySeconds / night.analyzedSeconds : 0;
  const coverage = night.durationSeconds ? night.analyzedSeconds / night.durationSeconds : 0;
  return (
    <View>
      <View
        style={[
          ui.row,
          { justifyContent: 'space-between', marginBottom: 13, flexWrap: 'wrap', gap: 10 },
        ]}
      >
        <Text style={ui.eyebrow}>YOUR MORNING CARD</Text>
        <Pill
          text={night.source === 'demo' ? 'SAMPLE NIGHT' : 'ONLY ON YOUR PHONE'}
          icon={night.source === 'demo' ? 'sparkles' : 'shield'}
          tint={night.source === 'demo' ? 'purple' : 'green'}
        />
      </View>
      <Text style={[ui.title, compact && { fontSize: 39, lineHeight: 46 }]}>Good morning.</Text>
      <Text style={[ui.subtitle, { marginTop: 10, marginBottom: 30 }]}>
        {formatRelativeNightDate(night.endedAt)} · {formatClock(night.startedAt)} –{' '}
        {formatClock(night.endedAt)}
      </Text>
      <Reveal>
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 24 }}>
          <View
            style={[
              ui.card,
              {
                flex: compact ? undefined : 1,
                alignItems: 'center',
                backgroundColor: '#EEF2E9',
                borderColor: '#E1E8DA',
              },
            ]}
          >
            <View style={{ width: '100%' }}>
              <SectionHeading title="Your snoring snapshot" />
            </View>
            <View
              style={{
                width: 218,
                height: 218,
                marginVertical: 5,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessibilityLabel={`Snoring score ${night.score} out of 100. Higher means more detected snoring.`}
            >
              <Svg width={218} height={218} style={{ position: 'absolute' }} viewBox="0 0 218 218">
                <Circle cx="109" cy="109" r="92" fill="none" stroke="#DCE5D4" strokeWidth="12" />
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
                {night.score}
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: '#6B7E64' }}>
                OUT OF 100
              </Text>
            </View>
            <Text
              style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.ink, marginTop: 5 }}
            >
              Estimated snoring time
            </Text>
            <Text
              style={[
                ui.small,
                { textAlign: 'center', maxWidth: 300, marginTop: 10, marginBottom: 24 },
              ]}
            >
              About {night.score}% of analyzed audio was classified as snoring. Higher means more
              snoring sounds.
            </Text>
            <View
              style={[
                ui.row,
                {
                  width: '100%',
                  borderTopWidth: 1,
                  borderColor: '#DCE5D4',
                  paddingTop: 23,
                  justifyContent: 'space-around',
                },
              ]}
            >
              <Metric
                value={formatMinutes(night.snoringSeconds)}
                unit="min"
                label="estimated snoring"
              />
              <View style={{ width: 1, height: 42, backgroundColor: '#DCE5D4' }} />
              <Metric value={formatMinutes(night.durationSeconds)} unit="min" label="recorded" />
            </View>
          </View>
          <View style={{ flex: compact ? undefined : 1.12, gap: 20 }}>
            <View style={ui.card}>
              <SectionHeading
                title="Your loudest moment"
                label={
                  night.loudestClipSeconds
                    ? `${Math.round(night.loudestClipSeconds)} seconds`
                    : 'Local playback'
                }
              />
              <Text style={[ui.small, { marginBottom: 20 }]}>
                The loudest recorded sound, saved only on your phone.
              </Text>
              <ClipPlayer night={night} />
              <View style={[ui.row, { gap: 7, marginTop: 16 }]}>
                <Icon name="info" size={13} color={colors.muted} />
                <Text style={[ui.small, { flex: 1, fontSize: 11 }]}>
                  The loudest sound may be snoring or something else.
                </Text>
              </View>
            </View>
            <View style={ui.card}>
              <View
                style={[
                  ui.row,
                  { justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
                ]}
              >
                <Text style={styles.cardTitle}>Recording quality</Text>
                <Pill
                  text={night.eligible ? 'Counted in your week' : 'Did not count'}
                  tint={night.eligible ? 'green' : 'orange'}
                  icon={night.eligible ? 'check' : 'info'}
                />
              </View>
              {night.eligible ? (
                <Text style={[ui.small, { marginBottom: 20 }]}>
                  Enough time, a clear signal, and continuous listening. This night is included in
                  your weekly average.
                </Text>
              ) : (
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
              <QualityRow label="Recording length" value={formatDuration(night.durationSeconds)} />
              <QualityRow
                label="Background noise"
                value={`${Math.round(noiseRatio * 100)}% of analyzed audio`}
              />
              <QualityRow
                label="Audio analyzed"
                value={`${Math.min(100, Math.round(coverage * 100))}% of recording`}
                last
              />
            </View>
          </View>
        </View>
      </Reveal>
      <View
        style={[
          ui.row,
          { flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginTop: 24 },
        ]}
      >
        <View style={{ flex: 1, minWidth: 210 }}>
          <Text style={[ui.small, { maxWidth: 560 }]}>
            Compare several nights to spot patterns. This score can’t tell you how well you slept or
            diagnose a health condition.
          </Text>
        </View>
        <Button
          title="See my week"
          secondary
          icon="chart"
          onPress={() => router.navigate('/week')}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete this night and its audio"
        onPress={() => setConfirm(true)}
        style={{ alignSelf: 'flex-start', paddingVertical: 17 }}
      >
        <Text style={[ui.small, { color: colors.orange }]}>Delete this night</Text>
      </Pressable>
      <Modal
        visible={confirm}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={[ui.card, { maxWidth: 400, width: '100%' }]}>
            <Text style={[ui.title, { fontSize: 30, lineHeight: 37 }]}>Delete this night?</Text>
            <Text style={[ui.body, { marginVertical: 20 }]}>
              Your summary and audio clip will be permanently removed from this phone.
            </Text>
            <Button
              title="Delete night"
              icon="trash"
              onPress={() => {
                void remove(night.id);
                setConfirm(false);
              }}
            />
            <View style={{ height: 10 }} />
            <Button
              title="Keep this night"
              secondary
              icon="close"
              onPress={() => setConfirm(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.green }}>
        {value}
        <Text style={{ fontFamily: fonts.regular, fontSize: 13 }}> {unit}</Text>
      </Text>
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
  return (
    <View
      style={[
        ui.row,
        {
          justifyContent: 'space-between',
          paddingVertical: 10,
          borderBottomWidth: last ? 0 : 1,
          borderColor: '#EEF0E8',
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
const styles = StyleSheet.create({
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  emptyIcon: {
    backgroundColor: colors.lavender,
    borderRadius: 35,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(25,30,25,.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
