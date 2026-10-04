import { Platform, PermissionsAndroid } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { EngineState, NightSession } from '../domain/types';

type SnoreModule = {
  requestMicrophonePermission(): Promise<boolean>;
  getState(): Promise<EngineState>;
  getNights(): Promise<NightSession[]>;
  startNight(): Promise<EngineState>;
  stopNight(): Promise<NightSession>;
  deleteNight(id: string): Promise<void>;
  deleteAllNights(): Promise<void>;
};
export const nativeEngine =
  Platform.OS === 'web' ? null : requireOptionalNativeModule<SnoreModule>('WellMSnore');
export async function requestMicrophone() {
  if (!nativeEngine) return false;
  if (Platform.OS === 'android') {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Let WellM listen tonight',
        message:
          'Your microphone helps recognize snoring. Audio is processed on this phone and is never uploaded.',
        buttonPositive: 'Continue',
        buttonNegative: 'Not now',
      },
    );
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) return false;
    if (Number(Platform.Version) >= 33)
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return true;
  }
  return nativeEngine.requestMicrophonePermission();
}
