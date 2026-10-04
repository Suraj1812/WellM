import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { EngineState, NightSession } from '../domain/types';
import { calculateNightMetrics, createDemoNights } from '../domain';
import { nativeEngine, requestMicrophone } from '../services/engine';

const idle: EngineState = { status: 'idle', active: null, error: null };
type Notice = { title: string; message: string } | null;
type Context = {
  nights: NightSession[];
  engine: EngineState;
  demo: boolean;
  ready: boolean;
  busy: boolean;
  notice: Notice;
  dismissNotice(): void;
  notify(title: string, message: string): void;
  start(): Promise<boolean>;
  stop(): Promise<NightSession | null>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
  switchDemo(): void;
};
const NightContext = createContext<Context | null>(null);
export function NightProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState(Platform.OS === 'web');
  const [nights, setNights] = useState<NightSession[]>(() =>
    Platform.OS === 'web' ? createDemoNights() : [],
  );
  const [engine, setEngine] = useState<EngineState>(idle);
  const [ready, setReady] = useState(Platform.OS === 'web' || !nativeEngine);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const operation = useRef(false);
  const modeVersion = useRef(0);
  const demoStarted = useRef(0);
  const engineRef = useRef(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);
  const notify = useCallback((title: string, message: string) => setNotice({ title, message }), []);
  const refresh = useCallback(async () => {
    if (!nativeEngine || demo) return;
    const version = modeVersion.current;
    try {
      const [state, history] = await Promise.all([
        nativeEngine.getState(),
        nativeEngine.getNights(),
      ]);
      if (version !== modeVersion.current) return;
      setEngine(state);
      setNights(history.sort((a, b) => b.endedAt - a.endedAt));
    } catch (error) {
      if (version !== modeVersion.current) return;
      notify(
        'Could not read your nights',
        error instanceof Error ? error.message : 'Try reopening WellM.',
      );
    } finally {
      if (version === modeVersion.current) setReady(true);
    }
  }, [demo, notify]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    let polling = false;
    const timer = setInterval(async () => {
      if (polling || operation.current) return;
      if (demo) {
        if (!demoStarted.current) return;
        const seconds = (Date.now() - demoStarted.current) / 1000;
        setEngine({
          status: 'recording',
          error: null,
          active: {
            id: 'preview-active',
            startedAt: demoStarted.current,
            durationSeconds: seconds,
            analyzedSeconds: seconds,
            snoringSeconds: seconds * 0.18,
            noisySeconds: 0,
            currentDbfs: -36,
            lastSnoringConfidence: 0.62,
            waveform: Array.from(
              { length: 40 },
              (_, i) => 0.12 + Math.abs(Math.sin(i * 1.7 + seconds)) * 0.6,
            ),
          },
        });
      } else if (nativeEngine) {
        polling = true;
        const version = modeVersion.current;
        try {
          const state = await nativeEngine.getState();
          if (version !== modeVersion.current) return;
          if (engineRef.current.status === 'recording' && state.status !== 'recording')
            await refresh();
          setEngine(state);
        } catch {
        } finally {
          polling = false;
        }
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [demo, refresh]);
  const start = async () => {
    if (operation.current || engine.active) return false;
    operation.current = true;
    setBusy(true);
    try {
      if (demo) {
        demoStarted.current = Date.now();
        setEngine({
          status: 'recording',
          error: null,
          active: {
            id: 'preview-active',
            startedAt: Date.now(),
            durationSeconds: 0,
            analyzedSeconds: 0,
            snoringSeconds: 0,
            noisySeconds: 0,
            currentDbfs: -60,
            lastSnoringConfidence: 0,
            waveform: [],
          },
        });
        return true;
      }
      if (!nativeEngine) {
        notify(
          'A phone build is needed',
          'Install the WellM development build to listen with YAMNet. Expo Go and the browser can only preview sample nights.',
        );
        return false;
      }
      if (!(await requestMicrophone())) {
        notify(
          'Microphone access is off',
          'Allow microphone access in your phone settings to start a night. Your audio stays on this phone.',
        );
        return false;
      }
      const result = await nativeEngine.startNight();
      setEngine(result);
      if (result.error) throw new Error(result.error);
      return true;
    } catch (error) {
      notify(
        'Could not start listening',
        error instanceof Error ? error.message : 'Please try again.',
      );
      return false;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const stop = async () => {
    if (operation.current) return null;
    operation.current = true;
    setBusy(true);
    try {
      let result: NightSession;
      if (demo) {
        const seconds = Math.max(1, (Date.now() - demoStarted.current) / 1000);
        result = {
          ...createDemoNights()[0],
          id: `preview-${Date.now()}`,
          startedAt: demoStarted.current,
          endedAt: Date.now(),
          durationSeconds: seconds,
          analyzedSeconds: seconds,
          snoringSeconds: seconds * 0.18,
          noisySeconds: 0,
          ...calculateNightMetrics({
            durationSeconds: seconds,
            analyzedSeconds: seconds,
            snoringSeconds: seconds * 0.18,
            noisySeconds: 0,
            interrupted: false,
          }),
          loudestClipUri: null,
          loudestClipSeconds: 0,
          source: 'demo',
        };
        demoStarted.current = 0;
      } else {
        if (!nativeEngine) return null;
        result = await nativeEngine.stopNight();
      }
      setNights((old) => [result, ...old.filter((night) => night.id !== result.id)]);
      setEngine(idle);
      return result;
    } catch (error) {
      notify(
        'Could not finish this night',
        error instanceof Error ? error.message : 'Your session may still be listening. Try again.',
      );
      await refresh();
      return null;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      if (!demo) await nativeEngine?.deleteNight(id);
      setNights((old) => old.filter((night) => night.id !== id));
    } catch (error) {
      notify('Could not delete this night', String(error));
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const removeAll = async () => {
    if (operation.current || engine.active) {
      notify('Finish your night first', 'Finish the current action before deleting your history.');
      return;
    }
    operation.current = true;
    setBusy(true);
    try {
      if (!demo) await nativeEngine?.deleteAllNights();
      setNights([]);
    } catch (error) {
      notify('Could not clear your history', String(error));
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const switchDemo = () => {
    if (operation.current || engine.active) {
      notify('Finish your night first', 'Finish the current action before switching modes.');
      return;
    }
    modeVersion.current += 1;
    setEngine(idle);
    if (Platform.OS !== 'web' && demo) {
      setDemo(false);
      setNights([]);
      setReady(!nativeEngine);
    } else {
      setDemo(true);
      setNights(createDemoNights());
      setReady(true);
    }
  };
  return (
    <NightContext.Provider
      value={{
        nights,
        engine,
        demo,
        ready,
        busy,
        notice,
        notify,
        dismissNotice: () => setNotice(null),
        start,
        stop,
        remove,
        removeAll,
        switchDemo,
      }}
    >
      {children}
    </NightContext.Provider>
  );
}
export function useNights() {
  const ctx = useContext(NightContext);
  if (!ctx) throw new Error('NightProvider is missing');
  return ctx;
}
