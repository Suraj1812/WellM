import React, { useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNights } from '../state/NightProvider';
import { Icon, type IconName } from './Icon';
import { Button, useCompact } from './Primitives';
import { colors, fonts, ui } from './theme';
import { formatDuration } from '../domain';
import {
  MotionSettings,
  RevealViewport,
  useReducedMotion,
  useScrollRevealViewport,
} from './Motion';
const tabs: { name: string; path: '/' | '/morning' | '/week'; icon: IconName }[] = [
  { name: 'Tonight', path: '/', icon: 'moon' },
  { name: 'Morning', path: '/morning', icon: 'sun' },
  { name: 'My week', path: '/week', icon: 'chart' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionSettings>
      <AppShellContent>{children}</AppShellContent>
    </MotionSettings>
  );
}
function AppShellContent({ children }: { children: React.ReactNode }) {
  const compact = useCompact();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const viewportElement = useRef<View>(null);
  const viewport = useScrollRevealViewport(viewportElement);
  const reduced = useReducedMotion();
  const { notice, dismissNotice, removeAll, engine, notify } = useNights();
  const [help, setHelp] = useState(false);
  const [clear, setClear] = useState(false);
  const dialogVisible = help || !!notice || clear;
  const [displayedDialog, setDisplayedDialog] = useState({ notice, clear });
  // Preserve the visible content while the native/browser modal finishes fading out.
  if (dialogVisible && (displayedDialog.notice !== notice || displayedDialog.clear !== clear)) {
    setDisplayedDialog({ notice, clear });
  }
  const closeDialog = () => {
    setHelp(false);
    setClear(false);
    dismissNotice();
  };
  const dialogTitle =
    displayedDialog.notice?.title ||
    (displayedDialog.clear ? 'Delete all recordings?' : 'About WellM');
  const navigation = (
    <View style={[styles.tabs, compact && styles.mobileTabs]}>
      {tabs.map((tab) => {
        const active = path === tab.path;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.name}
            onPress={() => router.navigate(tab.path)}
            style={({ pressed }) => [
              styles.tab,
              compact && styles.mobileTab,
              active && styles.activeTab,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Icon name={tab.icon} size={18} color={active ? colors.green : colors.muted} />
            <Text
              style={[
                styles.tabText,
                active && { color: colors.green },
                compact && { fontSize: 11 },
              ]}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={[styles.header, compact && { height: 68, paddingHorizontal: 22 }]}>
        <View style={[styles.headerInner, compact && { maxWidth: undefined }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="WellM, tonight"
            onPress={() => router.navigate('/')}
            style={[ui.row, { gap: 9 }]}
          >
            <Image
              source={require('../../assets/brand/wellm-logo.png')}
              style={{ width: 126, height: 34 }}
              resizeMode="contain"
              accessibilityLabel="WellM"
            />
          </Pressable>
          {!compact && navigation}
          <View style={ui.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About WellM and privacy"
              onPress={() => setHelp(true)}
              style={({ pressed }) => [
                styles.help,
                pressed && { opacity: 0.65, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Icon name="info" size={28} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>
      {engine.active && path !== '/' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            engine.status === 'recording'
              ? 'Recording in progress. Open tonight to stop recording.'
              : 'Unsaved recording. Open tonight.'
          }
          onPress={() => router.navigate('/')}
          style={({ pressed }) => [styles.recordingStrip, pressed && { opacity: 0.65 }]}
        >
          <Icon name="mic" size={15} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.green, flex: 1 }}>
            {engine.status === 'recording' ? 'Recording' : 'Unsaved recording'} ·{' '}
            {formatDuration(engine.active.durationSeconds)}
          </Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.green }}>Open</Text>
          <Icon name="chevron" size={15} />
        </Pressable>
      )}
      <RevealViewport.Provider value={viewport}>
        <View ref={viewportElement} style={{ flex: 1, minHeight: 0 }} onLayout={viewport.refresh}>
          <ScrollView
            key={path}
            testID="screen-scroll"
            style={{ flex: 1, minHeight: 0 }}
            onScroll={viewport.refresh}
            scrollEventThrottle={100}
            onContentSizeChange={viewport.refresh}
            contentContainerStyle={{
              paddingHorizontal: compact ? 22 : 44,
              paddingTop: compact ? 24 : 32,
              paddingBottom: compact ? 28 : 36,
            }}
          >
            <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>{children}</View>
          </ScrollView>
        </View>
      </RevealViewport.Provider>
      {compact && (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: Math.max(10, insets.bottom),
            paddingTop: 8,
            paddingHorizontal: 14,
            flexShrink: 0,
          }}
        >
          {navigation}
        </View>
      )}
      <Modal
        visible={dialogVisible}
        transparent
        animationType={reduced ? 'none' : 'fade'}
        onRequestClose={closeDialog}
      >
        <View style={styles.overlay} pointerEvents={dialogVisible ? 'auto' : 'none'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            onPress={closeDialog}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modal}>
            <View style={[ui.row, { justifyContent: 'space-between', gap: 12 }]}>
              <Text
                style={[
                  styles.modalTitle,
                  { flex: 1 },
                  compact && { fontSize: 26, lineHeight: 32 },
                ]}
              >
                {dialogTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={closeDialog}
                style={{
                  padding: 10,
                  minHeight: 44,
                  minWidth: 44,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1, minHeight: 0 }}
            >
              {displayedDialog.notice ? (
                <>
                  <Text style={[ui.body, { marginVertical: 20 }]}>
                    {displayedDialog.notice.message}
                  </Text>
                  <Button title="Got it" icon="check" onPress={closeDialog} />
                </>
              ) : displayedDialog.clear ? (
                <>
                  <Text style={[ui.body, { marginVertical: 20 }]}>
                    Summaries and audio clips will be permanently deleted.
                  </Text>
                  <Button
                    title="Delete all"
                    icon="trash"
                    onPress={() => {
                      void removeAll();
                      setClear(false);
                      setHelp(false);
                    }}
                  />
                  <View style={{ height: 10 }} />
                  <Button secondary title="Cancel" icon="close" onPress={closeDialog} />
                </>
              ) : (
                <>
                  <AboutPoint text="YAMNet analyzes audio on this device. Nothing is uploaded. Only a summary and the loudest 10 seconds are saved; that clip may contain other sounds." />
                  <AboutPoint text="The score is the percentage of analyzed audio detected as snoring. Higher means more snoring. It does not assess sleep quality or diagnose a condition." />
                  <AboutPoint text="Weekly averages count nights with 30+ recorded minutes, at least 90% analysis, no interruption, and at most 30% noisy audio. The latest session each day is shown." />
                  <AboutPoint
                    text={
                      Platform.OS === 'web'
                        ? 'Keep this tab open and the screen awake while recording. The latest 90 sessions stay in this browser; clearing its storage removes them.'
                        : 'The latest 90 sessions stay on this phone and are excluded from backups.'
                    }
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (
                        engine.active ||
                        engine.status === 'starting' ||
                        engine.status === 'stopping'
                      ) {
                        notify(
                          'Finish recording first',
                          'Stop and save your recording before clearing history.',
                        );
                      } else {
                        setClear(true);
                      }
                    }}
                    style={{ padding: 15, alignItems: 'center' }}
                  >
                    <Text style={[ui.small, { color: colors.orange }]}>Delete all recordings</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function AboutPoint({ text }: { text: string }) {
  return (
    <View style={[ui.row, { alignItems: 'flex-start', gap: 10, marginTop: 16 }]}>
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.green,
          marginTop: 8,
        }}
      />
      <Text style={[ui.small, { flex: 1 }]}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    height: 82,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 44,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  recordingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    minHeight: 44,
    backgroundColor: colors.greenLight,
    flexShrink: 0,
  },
  help: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', padding: 5, gap: 3, borderRadius: 15, backgroundColor: '#EDEFE8' },
  tab: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 19,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeTab: { backgroundColor: '#fff', boxShadow: '0px 2px 7px rgba(25,45,25,0.05)' },
  tabText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  mobileTabs: { width: '100%', backgroundColor: 'transparent', justifyContent: 'space-around' },
  mobileTab: { flex: 1, flexDirection: 'column', gap: 4, paddingHorizontal: 5, paddingVertical: 9 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(25,30,25,.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
    padding: 25,
    backgroundColor: colors.background,
    maxHeight: '95%',
    overflow: 'hidden',
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, lineHeight: 36 },
});
