import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { EngineState, NightSession } from '../domain/types';
import { nativeEngine, requestMicrophone } from '../services/engine';

const idle: EngineState = { status: 'idle', active: null, error: null };
type Notice = { title: string; message: string } | null;
type Context = {
  nights: NightSession[];
  engine: EngineState;
  ready: boolean;
  busy: boolean;
  notice: Notice;
  dismissNotice(): void;
  notify(title: string, message: string): void;
  start(): Promise<boolean>;
  stop(): Promise<NightSession | null>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
};
const NightContext = createContext<Context | null>(null);

export function NightProvider({ children }: { children: React.ReactNode }) {
  const [nights, setNights] = useState<NightSession[]>([]);
  const [engine, setEngine] = useState<EngineState>(idle);
  const [ready, setReady] = useState(!nativeEngine);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const operation = useRef(false);
  const revision = useRef(0);
  const engineRef = useRef(engine);
  const mounted = useRef(true);
  const notify = useCallback((title: string, message: string) => setNotice({ title, message }), []);
  const updateEngine = useCallback((state: EngineState) => {
    engineRef.current = state;
    if (mounted.current) setEngine(state);
  }, []);

  const refresh = useCallback(async () => {
    if (!nativeEngine || operation.current) return;
    const version = revision.current;
    try {
      const [state, history] = await Promise.all([
        nativeEngine.getState(),
        nativeEngine.getNights(),
      ]);
      if (!mounted.current || version !== revision.current || operation.current) return;
      updateEngine(state);
      setNights(
        history
          .filter((night) => night.source === 'recorded')
          .sort((a, b) => b.endedAt - a.endedAt),
      );
    } catch (error) {
      if (!mounted.current || version !== revision.current) return;
      notify(
        'Could not read your nights',
        error instanceof Error ? error.message : 'Try reopening WellM.',
      );
    } finally {
      if (mounted.current && version === revision.current) setReady(true);
    }
  }, [notify, updateEngine]);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(refresh);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    let polling = false;
    const timer = setInterval(
      async () => {
        if (!nativeEngine || polling || operation.current) return;
        polling = true;
        const version = revision.current;
        try {
          const state = await nativeEngine.getState();
          if (!mounted.current || version !== revision.current || operation.current) return;
          const finished = engineRef.current.active && !state.active;
          const changed = state.status !== engineRef.current.status;
          updateEngine(state);
          if (finished || changed) await refresh();
        } catch (error) {
          if (!mounted.current || version !== revision.current || operation.current) return;
          updateEngine({
            ...engineRef.current,
            error:
              error instanceof Error
                ? error.message
                : 'Could not refresh the recording. Try reopening WellM.',
          });
        } finally {
          polling = false;
        }
      },
      Platform.OS === 'web' ? 300 : 750,
    );
    return () => {
      mounted.current = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, updateEngine]);

  const beginOperation = () => {
    if (operation.current) return false;
    operation.current = true;
    revision.current += 1;
    setBusy(true);
    return true;
  };
  const endOperation = () => {
    operation.current = false;
    if (mounted.current) setBusy(false);
  };
  const start = async () => {
    if (engineRef.current.active || !beginOperation()) return false;
    try {
      if (!nativeEngine) {
        notify(
          'Install the phone app',
          'This recorder needs the WellM native build. Install the APK to use your microphone.',
        );
        return false;
      }
      updateEngine({ status: 'starting', active: null, error: null });
      if (!(await requestMicrophone())) {
        updateEngine(idle);
        notify(
          'Microphone access is off',
          'Allow microphone access in settings, then start again. Audio is processed on this device.',
        );
        return false;
      }
      const result = await nativeEngine.startNight();
      updateEngine(result);
      if (result.error) throw new Error(result.error);
      return result.status === 'recording';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      try {
        if (nativeEngine) updateEngine(await nativeEngine.getState());
        else updateEngine({ status: 'error', active: null, error: message });
      } catch {
        updateEngine({ status: 'error', active: null, error: message });
      }
      notify('Could not start listening', message);
      return false;
    } finally {
      endOperation();
    }
  };
  const stop = async () => {
    if (!nativeEngine || !engineRef.current.active || !beginOperation()) return null;
    try {
      updateEngine({ ...engineRef.current, status: 'stopping' });
      const result = await nativeEngine.stopNight();
      if (mounted.current)
        setNights((old) => [result, ...old.filter((night) => night.id !== result.id)].slice(0, 90));
      updateEngine(idle);
      return result;
    } catch (error) {
      notify(
        'Could not finish this night',
        error instanceof Error ? error.message : 'Try saving your night again.',
      );
      try {
        updateEngine(await nativeEngine.getState());
      } catch {
        updateEngine({
          ...engineRef.current,
          status: 'error',
          error: 'Your summary has not been saved. Try again.',
        });
      }
      return null;
    } finally {
      endOperation();
    }
  };
  const remove = async (id: string) => {
    if (!nativeEngine || !beginOperation()) return;
    try {
      await nativeEngine.deleteNight(id);
      if (mounted.current) setNights((old) => old.filter((night) => night.id !== id));
    } catch (error) {
      notify('Could not delete this night', error instanceof Error ? error.message : String(error));
    } finally {
      endOperation();
    }
  };
  const removeAll = async () => {
    if (engineRef.current.active || operation.current) {
      notify('Finish your night first', 'Finish the current action before deleting your history.');
      return;
    }
    if (!nativeEngine || !beginOperation()) return;
    try {
      await nativeEngine.deleteAllNights();
      if (mounted.current) setNights([]);
    } catch (error) {
      notify(
        'Could not clear your history',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      endOperation();
    }
  };

  return (
    <NightContext.Provider
      value={{
        nights,
        engine,
        ready,
        busy,
        notice,
        notify,
        dismissNotice: () => setNotice(null),
        start,
        stop,
        remove,
        removeAll,
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
