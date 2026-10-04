import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NightProvider } from '../state/NightProvider';
import { AppShell } from '../components/AppShell';

export default function Layout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Fraunces_400Regular,
  });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <NightProvider>
        <StatusBar style="dark" />
        <AppShell>
          <Slot />
        </AppShell>
      </NightProvider>
    </SafeAreaProvider>
  );
}
