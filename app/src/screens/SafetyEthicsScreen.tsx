import React from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, TopBar, IconCircle } from '../components/ui';
import type { IconName } from '../components/Icon';

const CARDS: Array<{ icon: IconName; tone: 'rose' | 'violet' | 'sage' | 'coral' | 'gold'; title: string; body: string }> = [
  {
    icon: 'shield', tone: 'rose', title: 'Not a substitute',
    body: 'MediBloom flags risky combinations and helps you remember doses. It does not diagnose or prescribe — always check with your doctor or pharmacist before changing anything.',
  },
  {
    icon: 'lock', tone: 'violet', title: 'Your data stays here',
    body: 'Everything lives in a database on this phone. Nothing is uploaded, and there is no account. The only time anything leaves is when you choose to send an email yourself.',
  },
  {
    icon: 'alert', tone: 'sage', title: 'Checked automatically',
    body: 'Every time you add a medicine, it is checked against everything else you take, straight away. You never have to remember to ask.',
  },
  {
    icon: 'phone', tone: 'coral', title: 'In an emergency',
    body: 'If you or someone else is having a medical emergency or a serious reaction, call your local emergency number or go to the nearest hospital. Do not wait on an app.',
  },
  {
    icon: 'sparkle', tone: 'gold', title: 'Explainable, not a black box',
    body: 'Insights and chat answers come from clear rules applied to your own history and a bundled medical reference. There is no model guessing, and nothing is generated off-device.',
  },
  {
    icon: 'people', tone: 'violet', title: 'Built for everyone',
    body: 'Plain language, a larger-text option, voice read-aloud, buttons big enough to hit easily, and full offline operation — so it works on any phone, anywhere.',
  },
];

export function SafetyEthicsScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Safety & Ethics" onBack={() => nav.goBack()} />
        <Txt variant="tiny" color={c.inkFaint}>
          Your wellbeing comes before any feature.
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          {CARDS.map((card) => (
            <Row
              key={card.title}
              gap={12}
              align="flex-start"
              style={{
                backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                borderRadius: radius.lg, padding: 14,
              }}
            >
              <IconCircle name={card.icon} tone={card.tone} size={34} />
              <View style={{ flex: 1 }}>
                <Txt variant="small" weight="black">{card.title}</Txt>
                <Txt variant="tiny" color={c.inkSoft} style={{ marginTop: 3, lineHeight: 17 }}>
                  {card.body}
                </Txt>
              </View>
            </Row>
          ))}
        </View>

        <Spacer h={18} />
        <Txt variant="micro" color={c.inkGhost} style={{ textAlign: 'center', lineHeight: 16 }}>
          MediBloom provides general medication-safety support only.{'\n'}
          It is not a medical device and does not replace professional care.
        </Txt>
      </ScrollView>
    </View>
  );
}
