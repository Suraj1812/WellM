import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNights } from '../state/NightProvider';
import { useTheme } from './ThemeProvider';
import { Icon } from './Icon';
import { Waveform } from './Primitives';
import type { NightSession } from '../domain/types';

export function ClipPlayer({ night }: { night: NightSession }) {
  const { colors, ui } = useTheme();
  if (!night.loudestClipUri)
    return (
      <View style={{ padding: 19, borderRadius: 16, backgroundColor: colors.playerMutedSurface }}>
        <Text style={ui.small}>No audio clip was saved for this recording.</Text>
      </View>
    );
  return <BrowserPlayer key={night.id} night={night} />;
}

function BrowserPlayer({ night }: { night: NightSession }) {
  const { colors, ui } = useTheme();
  const audio = useRef<HTMLAudioElement | null>(null);
  const { engine, busy, notify } = useNights();
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(night.loudestClipSeconds);
  const [width, setWidth] = useState(1);
  useEffect(() => {
    const player = new Audio(night.loudestClipUri!);
    player.preload = 'auto';
    audio.current = player;
    const ready = () => {
      setLoaded(true);
      setError(false);
      if (Number.isFinite(player.duration)) setDuration(player.duration);
    };
    const progress = () => setTime(player.currentTime);
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    const ended = () => {
      setPlaying(false);
      setTime(player.duration);
    };
    const failed = () => {
      setError(true);
      setLoaded(false);
      setPlaying(false);
    };
    player.addEventListener('canplay', ready);
    player.addEventListener('timeupdate', progress);
    player.addEventListener('play', play);
    player.addEventListener('pause', pause);
    player.addEventListener('ended', ended);
    player.addEventListener('error', failed);
    player.load();
    return () => {
      player.pause();
      player.removeEventListener('canplay', ready);
      player.removeEventListener('timeupdate', progress);
      player.removeEventListener('play', play);
      player.removeEventListener('pause', pause);
      player.removeEventListener('ended', ended);
      player.removeEventListener('error', failed);
      player.removeAttribute('src');
      player.load();
      audio.current = null;
    };
  }, [night.loudestClipUri]);
  useEffect(() => {
    if (engine.active) audio.current?.pause();
  }, [engine.active]);
  const toggle = async () => {
    const player = audio.current;
    if (!player) return;
    if (engine.active || busy) {
      notify('Your night is still listening', 'Finish recording before playing a clip.');
      return;
    }
    if (error) {
      setError(false);
      player.load();
      return;
    }
    if (playing) {
      player.pause();
      return;
    }
    try {
      if (player.ended || player.currentTime >= duration - 0.05) player.currentTime = 0;
      await player.play();
    } catch (failure) {
      notify(
        'Could not play this clip',
        failure instanceof Error ? failure.message : 'Try playing it again.',
      );
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
          error
            ? 'Reload loudest audio clip'
            : playing
              ? 'Pause loudest audio clip'
              : 'Play loudest audio clip'
        }
        disabled={!loaded && !error}
        accessibilityState={{ disabled: !loaded && !error }}
        onPress={() => void toggle()}
        style={({ pressed }) => ({
          width: 47,
          height: 47,
          borderRadius: 24,
          backgroundColor: colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.65 : 1,
        })}
      >
        {!loaded && !error ? (
          <ActivityIndicator color={colors.onPlayer} />
        ) : (
          <Icon
            name={error ? 'volume' : playing ? 'pause' : 'play'}
            color={colors.onPlayer}
            size={17}
          />
        )}
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={[ui.small, { flex: 1, color: colors.orange }]}>
          This clip could not be loaded. Tap to retry.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seek within loudest audio clip"
          style={{ flex: 1 }}
          disabled={!loaded || busy || Boolean(engine.active)}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          onPress={(event) => {
            if (audio.current)
              audio.current.currentTime = Math.max(
                0,
                Math.min(duration, (event.nativeEvent.locationX / Math.max(1, width)) * duration),
              );
          }}
        >
          <Waveform values={night.waveform} progress={time / Math.max(0.01, duration)} />
        </Pressable>
      )}
      <Text style={[ui.small, { color: colors.purple, fontVariant: ['tabular-nums'] }]}>
        {Math.floor(time)} / {Math.round(duration)}s
      </Text>
    </View>
  );
}
