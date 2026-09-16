import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, TopBar, Toggle, Chip } from '../components/ui';
import { Icon } from '../components/Icon';
import { AiAssistCard } from '../components/AiAssistCard';
import { EmailRelayCard } from '../components/EmailRelayCard';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { FieldInput } from '../components/FieldInput';
import { fireTestReminder, ensurePermission } from '../services/notifications';
import { openPrefilledAlert } from '../services/caregiver';
import { isRelayConfigured, loadRelayConfig, sendViaRelay } from '../services/emailRelay';
import { loadDemoData } from '../data/demoSeed';

const THRESHOLDS = [1, 2, 4, 8];

export function SettingsScreen() {
  const { c, radius, f, fonts } = useTheme();
  const nav = useNavigation<any>();
  const { settings, updateSettings, eraseEverything, refresh } = useStore();
  const [name, setName] = useState(settings.profileName);
  const [seeding, setSeeding] = useState(false);
  const [testing, setTesting] = useState(false);
  // Android is edge-to-edge, so nothing resizes for the keyboard on its own.
  const keyboardHeight = useKeyboardHeight();

  const loadDemo = () => {
    Alert.alert(
      'Load demo data?',
      'This replaces everything currently in the app with a sample profile. Useful for a demo — not something you want on your real medicine list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load it',
          onPress: async () => {
            setSeeding(true);
            try {
              // Empty means "use the demo profile's own name", rather than a
              // second hardcoded name here that can drift out of step with it.
              await loadDemoData(name.trim() || undefined);
              await refresh();
              Alert.alert('Demo data loaded', 'Five medicines and two weeks of history are in.');
            } catch {
              Alert.alert('Could not load', 'Something went wrong setting up the demo data.');
            } finally {
              setSeeding(false);
            }
          },
        },
      ],
    );
  };

  const input = {
    borderWidth: 1.5, borderColor: c.borderStrong, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 10, fontFamily: fonts.body,
    fontSize: f.small, color: c.ink, backgroundColor: c.surface,
  } as const;

  const testNotification = async () => {
    const ok = await ensurePermission();
    if (!ok) {
      Alert.alert(
        'Notifications are off',
        'MediBloom needs notification permission to remind you. You can turn it on in your phone settings.',
      );
      return;
    }
    await fireTestReminder();
    Alert.alert('Sent', 'A test reminder will appear in a couple of seconds.');
  };

  const testVoice = () => {
    Speech.speak('Time for Metformin, 500 milligrams.', { rate: 0.95 });
  };

  /**
   * Sends the test alert the way a real one would go: through the relay if the
   * user has one set up, and only falling back to the mail app if not. The old
   * version always opened the composer, which on a phone with no mail account
   * configured did nothing at all and looked broken.
   */
  const testCaregiverEmail = async () => {
    if (!settings.caregiverEmail) {
      Alert.alert('No caregiver email', 'Add a caregiver email address first.');
      return;
    }

    const subject = 'MediBloom test alert';
    const body = `Hi ${settings.caregiverName || 'there'},\n\nThis is a test from MediBloom to check caregiver alerts are working.\n\nNothing has been missed — no action needed.`;

    setTesting(true);
    try {
      const relay = await loadRelayConfig();
      if (isRelayConfigured(relay)) {
        const sent = await sendViaRelay(
          { to: settings.caregiverEmail, subject, body, fromName: 'MediBloom' },
          relay,
        );
        if (sent.ok) {
          Alert.alert(
            'Alert sent',
            `Emailed ${settings.caregiverEmail}. Check the inbox, and the spam folder the first time.`,
          );
          return;
        }

        // The reason has to be read before anything else takes over the
        // screen — launching the mail app on top of it buried the one piece
        // of information the user actually needed.
        Alert.alert('Could not send automatically', sent.error ?? 'The provider refused it.', [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Use mail app',
            onPress: () => void openComposer(subject, body),
          },
        ]);
        return;
      }

      await openComposer(subject, body);
    } finally {
      setTesting(false);
    }
  };

  const openComposer = async (subject: string, body: string) => {
    const res = await openPrefilledAlert(settings.caregiverEmail, subject, body);
    if (!res.delivered && res.via === 'skipped') {
      Alert.alert(
        'No mail app on this phone',
        `${res.reason ?? ''}\n\nSet up automatic email below and MediBloom can send alerts itself, without needing a mail app at all.`.trim(),
      );
    }
  };

  const confirmErase = () => {
    Alert.alert(
      'Erase everything?',
      'This deletes every medicine, all dose history, and your settings. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            await eraseEverything();
            Alert.alert('Done', 'Everything has been erased.');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, marginBottom: keyboardHeight }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Settings" onBack={() => nav.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* profile */}
        <Card>
          <Txt variant="title" weight="black">Your name</Txt>
          <Spacer h={10} />
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => void updateSettings({ profileName: name.trim() })}
            placeholder="What should we call you?"
            placeholderTextColor={c.inkGhost}
            style={input}
            accessibilityLabel="Your name"
          />
        </Card>

        <Spacer h={14} />

        {/* appearance */}
        <Card>
          <Txt variant="title" weight="black">Appearance</Txt>
          <Spacer h={12} />
          <Row justify="space-between">
            <Txt variant="small" weight="bold">Theme</Txt>
            <Row gap={6}>
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Chip
                  key={t}
                  label={t[0].toUpperCase() + t.slice(1)}
                  selected={settings.theme === t}
                  onPress={() => void updateSettings({ theme: t })}
                />
              ))}
            </Row>
          </Row>
          <Spacer h={14} />
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="small" weight="bold">Larger text</Txt>
              <Txt variant="micro" color={c.inkFaint}>Bigger text everywhere</Txt>
            </View>
            <Toggle
              label="Larger text"
              value={settings.largerText}
              onChange={(v) => void updateSettings({ largerText: v })}
            />
          </Row>
        </Card>

        <Spacer h={14} />

        {/* reminders */}
        <Card>
          <Txt variant="title" weight="black">Reminders</Txt>
          <Txt variant="micro" color={c.inkFaint} style={{ marginTop: 2 }}>
            Android notifications are always on — the rest are optional.
          </Txt>
          <Spacer h={14} />

          <Row justify="space-between" style={{ backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 12 }}>
            <Row gap={9} style={{ flex: 1, paddingRight: 10 }}>
              <Icon name="speaker" size={15} color={c.goldDeep} />
              <View style={{ flex: 1 }}>
                <Txt variant="small" weight="bold">Voice read-aloud</Txt>
                <Txt variant="micro" color={c.inkFaint}>
                  Speaks the medicine name and dose
                </Txt>
              </View>
            </Row>
            <Toggle
              label="Voice read-aloud"
              value={settings.voiceRemindersEnabled}
              onChange={(v) => {
                void updateSettings({ voiceRemindersEnabled: v });
                if (v) testVoice();
              }}
            />
          </Row>

          <Spacer h={10} />

          <View style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: radius.md, padding: 12 }}>
            <Row justify="space-between">
              <Row gap={9} style={{ flex: 1, paddingRight: 10 }}>
                <Icon name="mail" size={15} color={c.violet} />
                <Txt variant="small" weight="bold">Email reminders</Txt>
              </Row>
              <Toggle
                label="Email reminders"
                value={settings.emailRemindersEnabled}
                onChange={(v) => void updateSettings({ emailRemindersEnabled: v })}
              />
            </Row>
            {settings.emailRemindersEnabled ? (
              <>
                <Spacer h={10} />
                <FieldInput
                  value={settings.emailAddress}
                  onCommit={(t) => void updateSettings({ emailAddress: t })}
                  placeholder="your.email@gmail.com"
                  keyboardType="email-address"
                  accessibilityLabel="Your email address"
                />
                <Txt variant="micro" color={c.inkGhost} style={{ marginTop: 6, lineHeight: 15 }}>
                  A plain-text list of the day's medicines, sent once a day when you first
                  open the app. Needs "Automatic email" below to be set up.
                </Txt>
              </>
            ) : null}
          </View>

          <Spacer h={12} />
          <Pressable
            accessibilityRole="button"
            onPress={testNotification}
            style={{
              minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.violet,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Txt variant="small" weight="black" color={c.violet}>Send a test reminder</Txt>
          </Pressable>
        </Card>

        <Spacer h={14} />

        {/* caregiver */}
        <Card>
          <Row justify="space-between">
            <Txt variant="title" weight="black">Caregiver Alerts</Txt>
            <Toggle
              label="Caregiver alerts"
              value={settings.caregiverEnabled}
              onChange={(v) => void updateSettings({ caregiverEnabled: v })}
            />
          </Row>
          <Txt variant="micro" color={c.inkFaint} style={{ marginTop: 2 }}>
            If a dose stays unmarked, let someone who cares about you know.
          </Txt>

          {settings.caregiverEnabled ? (
            <>
              <Spacer h={12} />
              <FieldInput
                value={settings.caregiverName}
                onCommit={(t) => void updateSettings({ caregiverName: t })}
                placeholder="Caregiver's name"
                autoCapitalize="words"
                accessibilityLabel="Caregiver name"
              />
              <Spacer h={8} />
              <FieldInput
                value={settings.caregiverEmail}
                onCommit={(t) => void updateSettings({ caregiverEmail: t })}
                placeholder="Caregiver's email"
                keyboardType="email-address"
                accessibilityLabel="Caregiver email"
              />
              <Spacer h={12} />
              <Txt variant="micro" weight="bold" color={c.inkSoft}>
                Alert if a dose is unmarked for more than
              </Txt>
              <Row gap={7} style={{ marginTop: 8, flexWrap: 'wrap' }}>
                {THRESHOLDS.map((h) => (
                  <Chip
                    key={h}
                    label={`${h} hour${h === 1 ? '' : 's'}`}
                    selected={settings.caregiverThresholdHours === h}
                    onPress={() => void updateSettings({ caregiverThresholdHours: h })}
                  />
                ))}
              </Row>
              <Spacer h={12} />
              <Pressable
                accessibilityRole="button"
                onPress={testCaregiverEmail}
                style={{
                  minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.violet,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Txt variant="small" weight="black" color={c.violet}>
                  {testing ? 'Sending…' : 'Send a test alert'}
                </Txt>
              </Pressable>
            </>
          ) : null}
        </Card>

        <Spacer h={14} />

        <EmailRelayCard />

        <Spacer h={14} />

        <AiAssistCard />

        <Spacer h={14} />

        {/* demo */}
        <Card>
          <Txt variant="title" weight="black">Demo data</Txt>
          <Txt variant="micro" color={c.inkFaint} style={{ marginTop: 2, lineHeight: 15 }}>
            Replaces everything with a sample profile: five medicines (including one
            genuinely severe combination) and two weeks of dose history.
          </Txt>
          <Spacer h={12} />
          <Pressable
            accessibilityRole="button"
            onPress={loadDemo}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 46,
              borderWidth: 1.5, borderColor: c.violet, borderRadius: radius.md,
              paddingHorizontal: 13, justifyContent: 'center',
            }}
          >
            <Icon name="sparkle" size={15} color={c.violet} />
            <Txt variant="small" weight="black" color={c.violet}>
              {seeding ? 'Loading…' : 'Load demo data'}
            </Txt>
          </Pressable>
        </Card>

        <Spacer h={14} />

        {/* data */}
        <Card>
          <Txt variant="title" weight="black">Your data</Txt>
          <Spacer h={12} />
          <Pressable
            accessibilityRole="button"
            onPress={confirmErase}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 46,
              borderWidth: 1.5, borderColor: c.coralBorder, borderRadius: radius.md,
              paddingHorizontal: 13,
            }}
          >
            <Icon name="trash" size={15} color={c.coralDeep} />
            <Txt variant="small" weight="bold" color={c.coralDeep}>
              Erase everything and start over
            </Txt>
          </Pressable>
        </Card>

        <Spacer h={16} />
        <Txt variant="micro" color={c.inkGhost} style={{ textAlign: 'center', lineHeight: 16 }}>
          Everything lives on this device. Nothing leaves it unless you turn on automatic
          email or cloud assist yourself — both are off to begin with.
        </Txt>
      </ScrollView>
    </View>
  );
}
