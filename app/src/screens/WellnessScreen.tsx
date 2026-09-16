import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, TopBar, EmptyState } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { dailyBreakdown, generateInsights, weakestTimeOfDay } from '../engines/insightEngine';

export function WellnessScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const { historyDoses, medicines, interactions, adherence } = useStore();

  const week = useMemo(() => dailyBreakdown(historyDoses, 7), [historyDoses]);
  const insights = useMemo(
    () => generateInsights(medicines, historyDoses, interactions),
    [medicines, historyDoses, interactions],
  );
  const weak = useMemo(() => weakestTimeOfDay(historyDoses), [historyDoses]);

  const dayColor = (d: { taken: number; missed: number; skipped: number; total: number }) => {
    if (d.total === 0) return c.borderStrong;
    if (d.missed > 0) return c.coral;
    if (d.skipped > 0) return c.amber;
    return c.sage;
  };

  /** Today's plan is derived from real state, never invented. */
  const plan = useMemo(() => {
    const out: Array<{ icon: IconName; label: string }> = [];
    const withFood = medicines.find((m) => (m.notes ?? '').toLowerCase().includes('food'));
    if (withFood) out.push({ icon: 'bulb', label: `Take ${withFood.name} with food` });

    const severe = interactions.find((i) => i.rule.severity === 'severe');
    if (severe) out.push({ icon: 'alert', label: `Review ${severe.medicineB.name} today` });

    if (weak) out.push({ icon: 'clock', label: `Watch your ${weak.bucket} dose` });
    out.push({ icon: 'droplet', label: 'Drink water with each dose' });
    return out.slice(0, 4);
  }, [medicines, interactions, weak]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Your Wellness" onBack={() => nav.goBack()} />
        <Txt variant="tiny" color={c.inkFaint}>
          A simple weekly picture of how you and your medicines are getting along
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {historyDoses.length === 0 ? (
          <Card>
            <EmptyState
              icon="leaf"
              title="Nothing to show yet"
              body="Mark a few doses and MediBloom will start showing you the patterns in your week."
            />
          </Card>
        ) : (
          <>
            <Card>
              <MetricRow
                icon="check"
                tone={c.rose}
                label="Adherence"
                days={week.map(dayColor)}
                trailing={`${adherence.ratePercent}%`}
              />
              <Divider />
              <MetricRow
                icon="flame"
                tone={c.gold}
                label="Streak"
                days={week.map((d) => (d.missed > 0 ? c.coral : d.total > 0 ? c.sage : c.borderStrong))}
                trailing={`${adherence.streakDays}d`}
              />
              <Divider />
              <MetricRow
                icon="clock"
                tone={c.violet}
                label="On time"
                days={week.map((d) => (d.total === 0 ? c.borderStrong : d.taken >= d.total ? c.sage : c.amber))}
                trailing={weak ? `${weak.bucket} dips` : 'steady'}
              />
            </Card>

            <Spacer h={14} />

            {insights.length > 0 ? (
              <View
                style={{
                  borderRadius: radius.lg, padding: 16,
                  backgroundColor: c.violetSoft, borderWidth: 1, borderColor: c.border,
                }}
              >
                <Row gap={7} style={{ marginBottom: 8 }}>
                  <Icon name="sparkle" size={14} color={c.violet} />
                  <Txt variant="micro" weight="black" color={c.violet} style={{ letterSpacing: 0.5 }}>
                    WELLNESS INSIGHT
                  </Txt>
                </Row>
                <Txt variant="bodyLg" serif italic style={{ lineHeight: 21 }}>
                  {insights[0].text}
                </Txt>
                {insights.length > 1 ? (
                  <>
                    <Spacer h={10} />
                    <Txt variant="tiny" color={c.inkSoft} style={{ lineHeight: 18 }}>
                      {insights[1].text}
                    </Txt>
                  </>
                ) : null}
              </View>
            ) : null}

            <Spacer h={14} />

            <Txt variant="bodyLg" weight="black">Today's plan</Txt>
            <Spacer h={10} />
            <View style={{ gap: 8 }}>
              {plan.map((p) => (
                <Row
                  key={p.label}
                  gap={11}
                  style={{
                    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                    borderRadius: radius.md, padding: 13,
                  }}
                >
                  <Icon name={p.icon} size={15} color={c.violet} />
                  <Txt variant="small" weight="bold" style={{ flex: 1 }}>{p.label}</Txt>
                </Row>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetricRow({
  icon, tone, label, days, trailing,
}: {
  icon: IconName;
  tone: string;
  label: string;
  days: string[];
  trailing: string;
}) {
  const { c } = useTheme();
  return (
    <Row justify="space-between" style={{ paddingVertical: 10 }}>
      <Row gap={7} style={{ width: 96 }}>
        <Icon name={icon} size={14} color={tone} />
        <Txt variant="tiny" weight="black">{label}</Txt>
      </Row>
      <Row gap={4} style={{ flex: 1, justifyContent: 'center' }}>
        {days.map((col, i) => (
          <View key={i} style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: col }} />
        ))}
      </Row>
      <Txt variant="tiny" weight="bold" color={c.inkSoft} style={{ width: 54, textAlign: 'right' }}>
        {trailing}
      </Txt>
    </Row>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.surfaceLav }} />;
}
