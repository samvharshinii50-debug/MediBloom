import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, IconCircle } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

const ITEMS: Array<{ label: string; route: string; icon: IconName; tone: 'sage' | 'violet' | 'rose' | 'gold' }> = [
  { label: 'Wellness', route: 'Wellness', icon: 'leaf', tone: 'sage' },
  { label: 'Adherence', route: 'Adherence', icon: 'chart', tone: 'violet' },
  { label: 'Interactions', route: 'Interactions', icon: 'alert', tone: 'rose' },
  { label: 'Settings', route: 'Settings', icon: 'gear', tone: 'violet' },
  { label: 'Safety & Ethics', route: 'SafetyEthics', icon: 'shield', tone: 'gold' },
];

export function MoreScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const { settings, interactions } = useStore();

  const initial = (settings.profileName || 'M').charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Txt variant="h1" serif>More</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Row gap={12} style={{ backgroundColor: c.surfaceLav, borderRadius: radius.lg, padding: 14, marginBottom: 18 }}>
          <View
            style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: c.roseTint,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Txt variant="title" weight="black" color={c.white}>{initial}</Txt>
          </View>
          <View>
            <Txt variant="bodyLg" weight="black">{settings.profileName || 'Your profile'}</Txt>
            <Txt variant="tiny" color={c.inkFaint} weight="bold">
              Just for you · no account needed
            </Txt>
          </View>
        </Row>

        <View style={{ gap: 8 }}>
          {ITEMS.map((item) => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => nav.navigate(item.route)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                borderRadius: radius.lg, padding: 14, minHeight: 60,
              }}
            >
              <IconCircle name={item.icon} tone={item.tone} />
              <Txt variant="body" weight="black" style={{ flex: 1 }}>{item.label}</Txt>
              {item.route === 'Interactions' && interactions.length > 0 ? (
                <View
                  style={{
                    backgroundColor: c.coralSoft, paddingHorizontal: 8, paddingVertical: 4,
                    borderRadius: 999, marginRight: 4,
                  }}
                >
                  <Txt variant="micro" weight="black" color={c.coralDeep}>{interactions.length}</Txt>
                </View>
              ) : null}
              <Icon name="chevronRight" size={15} color={c.inkGhost} />
            </Pressable>
          ))}
        </View>

        <Spacer h={20} />
        <Txt variant="micro" color={c.inkGhost} style={{ textAlign: 'center' }}>
          MediBloom · everything stays on this device
        </Txt>
      </ScrollView>
    </View>
  );
}
