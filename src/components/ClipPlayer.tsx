import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useNights } from '../state/NightProvider';
import { fonts } from './theme';
import { useTheme } from './ThemeProvider';
import { Icon } from './Icon';
import { Waveform } from './Primitives';
import type { NightSession } from '../domain/types';
export function ClipPlayer({ night }: { night: NightSession }) {
  const { colors, ui } = useTheme();
  if (!night.loudestClipUri)
    return (
      <View
        style={[
          ui.row,
          { padding: 19, borderRadius: 16, backgroundColor: colors.playerSurface, gap: 16 },
        ]}
      >
        <View
          style={{
            width: 43,
            height: 43,
            backgroundColor: colors.playerMutedSurface,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="volume" color={colors.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 13 }}>
            No clip was saved
          </Text>
          <Text style={[ui.small, { marginTop: 5 }]}>
            The session ended before audio could be saved.
          </Text>
        </View>
      </View>
    );
  return <LocalPlayer key={night.id} night={night} />;
}
function LocalPlayer({ night }: { night: NightSession }) {
  const { colors, ui } = useTheme();
  const player = useAudioPlayer(
    { uri: night.loudestClipUri! },
    { updateInterval: 150, keepAudioSessionActive: true },
  );
  const status = useAudioPlayerStatus(player);
  const { engine, busy, notify } = useNights();
  const [preparing, setPreparing] = useState(false);
  const toggle = async () => {
    if (engine.active || busy) {
      notify(
        'Your night is still listening',
        'Finish your night before playing a clip so playback doesn’t affect the recording.',
      );
      return;
    }
    if (status.error) {
      player.replace({ uri: night.loudestClipUri! });
      return;
    }
    if (!status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    setPreparing(true);
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (status.didJustFinish || status.currentTime >= night.loudestClipSeconds - 0.1)
        await player.seekTo(0);
      player.play();
    } catch {
      notify('Could not play this clip', 'The local audio file may no longer be available.');
    } finally {
      setPreparing(false);
    }
  };
  return (
    <View
      style={[
        ui.row,
        { padding: 17, borderRadius: 16, backgroundColor: colors.playerSurface, gap: 14 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status.error
            ? 'Reload loudest audio clip'
            : status.playing
              ? 'Pause loudest audio clip'
              : 'Play loudest audio clip'
        }
        accessibilityState={{ disabled: preparing || (!status.isLoaded && !status.error) }}
        disabled={preparing || (!status.isLoaded && !status.error)}
        onPress={() => void toggle()}
        style={({ pressed }) => ({
          width: 47,
          height: 47,
          borderRadius: 24,
          backgroundColor: colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed || preparing ? 0.65 : 1,
        })}
      >
        {!status.isLoaded && !status.error ? (
          <ActivityIndicator color={colors.onPlayer} />
        ) : (
          <Icon
            name={status.error ? 'volume' : status.playing ? 'pause' : 'play'}
            color={colors.onPlayer}
            size={17}
          />
        )}
      </Pressable>
      {status.error ? (
        <Text accessibilityRole="alert" style={[ui.small, { flex: 1, color: colors.orange }]}>
          This clip could not be loaded. Tap to retry.
        </Text>
      ) : (
        <Waveform
          values={night.waveform}
          progress={status.currentTime / Math.max(1, night.loudestClipSeconds)}
        />
      )}
      <Text style={[ui.small, { color: colors.purple, fontVariant: ['tabular-nums'] }]}>
        {Math.floor(status.currentTime)} / {Math.round(night.loudestClipSeconds)}s
      </Text>
    </View>
  );
}
