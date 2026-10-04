import React, { useEffect, useRef, useState } from 'react';
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
import { Button, Pill, useCompact } from './Primitives';
import { colors, fonts, ui } from './theme';
const tabs: { name: string; path: '/' | '/morning' | '/week'; icon: IconName }[] = [
  { name: 'Tonight', path: '/', icon: 'moon' },
  { name: 'Morning', path: '/morning', icon: 'sun' },
  { name: 'My week', path: '/week', icon: 'chart' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const compact = useCompact();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [path]);
  const { demo, notice, dismissNotice, switchDemo, removeAll, engine, notify } = useNights();
  const [help, setHelp] = useState(false);
  const [clear, setClear] = useState(false);
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
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.header, compact && { height: 75, paddingHorizontal: 22 }]}>
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
          <View style={[ui.row, { gap: compact ? 9 : 22 }]}>
            {!compact && (
              <View style={[ui.row, { gap: 7 }]}>
                <Icon name="shield" size={15} />
                <Text style={styles.privateText}>Private on your phone</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About WellM and privacy"
              onPress={() => setHelp(true)}
              style={styles.help}
            >
              <Icon name="info" size={19} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>
      {demo && (
        <View style={styles.demoStrip}>
          <View style={[ui.row, { gap: 7 }]}>
            <Icon name="sparkles" size={13} color={colors.purple} />
            <Text style={styles.demoText}>
              Interactive preview · sample nights · microphone off
            </Text>
          </View>
        </View>
      )}
      <ScrollView
        ref={scroll}
        testID="screen-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: compact ? 22 : 44,
          paddingTop: compact ? 30 : 43,
          paddingBottom: compact ? 28 : 36,
        }}
      >
        <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
          {children}
          <View
            style={[styles.footer, compact && { marginTop: 30, alignItems: 'flex-start', gap: 9 }]}
          >
            <View style={[ui.row, { gap: 7 }]}>
              <Icon name="shield" size={14} color={colors.muted} />
              <Text style={ui.small}>Audio stays on your phone. Always.</Text>
            </View>
            <Text style={ui.small}>For personal awareness. Not a medical tool.</Text>
          </View>
        </View>
      </ScrollView>
      {compact && (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: Math.max(10, insets.bottom),
            paddingTop: 8,
            paddingHorizontal: 14,
          }}
        >
          {navigation}
        </View>
      )}
      <Modal
        visible={help || !!notice || clear}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setHelp(false);
          setClear(false);
          dismissNotice();
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={() => {
                  setHelp(false);
                  setClear(false);
                  dismissNotice();
                }}
                style={{ alignSelf: 'flex-end', padding: 7 }}
              >
                <Icon name="close" />
              </Pressable>
              {notice ? (
                <>
                  <Text style={styles.modalTitle}>{notice.title}</Text>
                  <Text style={[ui.body, { marginVertical: 20 }]}>{notice.message}</Text>
                  <Button title="Got it" icon="check" onPress={dismissNotice} />
                </>
              ) : clear ? (
                <>
                  <Text style={styles.modalTitle}>Clear your nights?</Text>
                  <Text style={[ui.body, { marginVertical: 20 }]}>
                    This permanently deletes your saved summaries and audio clips from this phone.
                  </Text>
                  <Button
                    title="Delete all nights"
                    icon="trash"
                    onPress={() => {
                      void removeAll();
                      setClear(false);
                      setHelp(false);
                    }}
                  />
                  <View style={{ height: 10 }} />
                  <Button
                    secondary
                    title="Keep my nights"
                    icon="close"
                    onPress={() => setClear(false)}
                  />
                </>
              ) : (
                <>
                  <Pill text="PRIVATE BY DESIGN" icon="shield" />
                  <Text style={[styles.modalTitle, { marginTop: 20 }]}>About your recordings</Text>
                  <Text style={[ui.body, { marginTop: 16 }]}>
                    WellM uses Google’s YAMNet sound model on your phone. It estimates snoring
                    sounds, and saves only your summary and the loudest 10 seconds.
                  </Text>
                  <Text style={[ui.body, { marginTop: 14 }]}>
                    A score of 18 means about 18% of analyzed audio was classified as snoring.
                    Higher means more detected snoring, not better sleep. No diagnosis, sleep
                    stages, or apnea detection.
                  </Text>
                  <Text style={[ui.body, { marginTop: 14 }]}>
                    Nights need 30 minutes, at least 90% analysis coverage, no interruption, and no
                    more than 30% noise to count. Speech, music, TV, or clipped audio can affect
                    results.
                  </Text>
                  <Text style={[ui.small, { marginTop: 14, marginBottom: 22 }]}>
                    No account. No uploads. Your latest 90 sessions are kept locally and excluded
                    from phone backups. Stop a night before clearing history.
                  </Text>
                  <Button
                    title={
                      demo && Platform.OS !== 'web'
                        ? 'Use real microphone'
                        : demo
                          ? 'Reset sample nights'
                          : 'Explore sample nights'
                    }
                    secondary
                    icon="sparkles"
                    onPress={() => {
                      switchDemo();
                      setHelp(false);
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (engine.status === 'recording') {
                        notify(
                          'Finish your night first',
                          'Stop listening before deleting your history.',
                        );
                      } else {
                        setClear(true);
                      }
                    }}
                    style={{ padding: 15, alignItems: 'center' }}
                  >
                    <Text style={[ui.small, { color: colors.orange }]}>Clear all saved nights</Text>
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
const styles = StyleSheet.create({
  header: { height: 98, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 44 },
  headerInner: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  privateText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  help: {
    width: 44,
    height: 44,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  demoStrip: { alignItems: 'center', backgroundColor: '#EFECF4', paddingVertical: 8 },
  demoText: { fontFamily: fonts.medium, fontSize: 10, color: colors.purple },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 21,
    marginTop: 40,
  },
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
