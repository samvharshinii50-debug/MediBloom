import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Card, Row, Spacer, Badge, IconCircle, EmptyState, Button } from '../components/ui';
import { Icon, Logo } from '../components/Icon';
import { doseUiState, relativeLabel } from '../engines/scheduleEngine';
import { formatTime } from '../services/notifications';
import { MIN_TOUCH_TARGET } from '../theme/tokens';
import type { DoseLogEntry, Medicine } from '../data/types';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const {
    ready, settings, medicines, todayDoses, interactions, adherence, insight, markDose,
  } = useStore();

  const now = new Date();
  const medById = useMemo(
    () => new Map(medicines.map((m) => [m.id, m])),
    [medicines],
  );

  const severe = interactions.find((i) => i.rule.severity === 'severe');
  const doneCount = todayDoses.filter((d) => d.status === 'taken').length;

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={48} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* top bar */}
      <Row justify="space-between" style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
        <Row gap={8}>
          <Logo size={26} />
          <Txt variant="h3" serif>MediBloom</Txt>
        </Row>
        {adherence.streakDays > 0 ? (
          <Row gap={5} style={{ backgroundColor: c.goldSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 }}>
            <Icon name="flame" size={13} color={c.gold} />
            <Txt variant="tiny" weight="black" color={c.goldDeep}>{adherence.streakDays}</Txt>
          </Row>
        ) : null}
      </Row>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Spacer h={6} />
        <Txt variant="h1" serif>{greeting(now)}{settings.profileName ? `, ${settings.profileName}` : ''}</Txt>
        <Txt variant="small" color={c.inkSoft}>{dateLabel}</Txt>
        <Spacer h={16} />

        {severe ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Severe interaction between ${severe.medicineA.name} and ${severe.medicineB.name}. Tap to review.`}
            onPress={() => nav.navigate('Interactions')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: c.coralSoft, borderWidth: 1, borderColor: c.coralBorder,
              borderRadius: radius.lg, padding: 14, marginBottom: 16,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.coral,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="alert" size={17} color={c.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="body" weight="black" color={c.coralDeep}>Careful with this combo</Txt>
              <Txt variant="tiny" color={c.coralDeep} style={{ marginTop: 1 }}>
                {severe.medicineA.name} + {severe.medicineB.name} — tap to see why
              </Txt>
            </View>
            <Icon name="chevronRight" size={16} color={c.coralDeep} />
          </Pressable>
        ) : null}

        {/* today's medicines */}
        <Row justify="space-between" align="baseline" style={{ marginBottom: 10 }}>
          <Txt variant="bodyLg" weight="black">Today's Medicines</Txt>
          <Txt variant="tiny" color={c.inkFaint} weight="bold">
            {doneCount} of {todayDoses.length}
          </Txt>
        </Row>

        {todayDoses.length === 0 ? (
          <Card>
            <EmptyState
              icon="pill"
              title="Nothing scheduled yet"
              body="Add your first medicine and MediBloom will start reminding you — and check it against everything else you take."
            />
            <Button label="Add a medicine" onPress={() => nav.navigate('AddMedicine')} full icon="plus" />
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {todayDoses.map((dose) => {
              const med = medById.get(dose.medicineId);
              if (!med) return null;
              return (
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  medicine={med}
                  now={now}
                  onMark={(status) => markDose(dose.id, status)}
                />
              );
            })}
          </View>
        )}

        <Spacer h={16} />

        {insight ? (
          <View
            style={{
              borderRadius: radius.lg, padding: 16,
              backgroundColor: c.violetSoft, borderWidth: 1, borderColor: c.border,
            }}
          >
            <Row gap={7} style={{ marginBottom: 8 }}>
              <Icon name="sparkle" size={14} color={c.violet} />
              <Txt variant="micro" weight="black" color={c.violet} style={{ letterSpacing: 0.5 }}>
                TODAY'S INSIGHT
              </Txt>
            </Row>
            <Txt variant="bodyLg" serif italic style={{ lineHeight: 21 }}>{insight.text}</Txt>
          </View>
        ) : null}

        <Spacer h={16} />

        <Card>
          <Txt variant="bodyLg" weight="black">This week</Txt>
          <Spacer h={12} />
          <Row justify="space-between">
            <Txt variant="small" color={c.inkSoft} weight="bold">Adherence</Txt>
            <Txt variant="h3" serif>{adherence.ratePercent}%</Txt>
          </Row>
          <Spacer h={8} />
          <View style={{ height: 8, borderRadius: 999, backgroundColor: c.violetSoft, overflow: 'hidden' }}>
            <View style={{ width: `${adherence.ratePercent}%`, height: '100%', backgroundColor: c.rose }} />
          </View>
          <Spacer h={14} />
          <Row justify="space-between">
            <Stat label="Medicines" value={String(medicines.length)} />
            <Stat label="Doses taken" value={`${adherence.taken}/${adherence.taken + adherence.missed + adherence.skipped}`} />
            <Stat
              label="To review"
              value={String(interactions.length)}
              tone={interactions.length > 0 ? c.coral : undefined}
            />
          </Row>
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Txt variant="h3" serif color={tone}>{value}</Txt>
      <Txt variant="micro" color={c.inkFaint} weight="bold">{label}</Txt>
    </View>
  );
}

function DoseRow({
  dose, medicine, now, onMark,
}: {
  dose: DoseLogEntry;
  medicine: Medicine;
  now: Date;
  onMark: (status: 'taken' | 'skipped') => void;
}) {
  const { c, radius } = useTheme();
  const state = doseUiState(dose, now);

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 11,
        padding: 11, borderRadius: radius.lg,
        backgroundColor: state === 'due' ? c.violetSoft : c.surfaceAlt,
      }}
    >
      <View style={{ width: 5, height: 30, borderRadius: 3, backgroundColor: medicine.colorTag }} />
      <IconCircle name="pill" tone="rose" size={34} />
      <View style={{ flex: 1 }}>
        <Txt variant="body" weight="black" numberOfLines={1}>
          {medicine.name} · {medicine.dosage} {medicine.unit}
        </Txt>
        <Txt
          variant="tiny"
          color={state === 'due' ? c.violet : state === 'missed' ? c.coralDeep : c.inkFaint}
          weight={state === 'due' ? 'black' : 'body'}
        >
          {state === 'taken'
            ? `Done ${dose.actedAt ? new Date(dose.actedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}`
            : state === 'skipped'
              ? 'Skipped'
              : state === 'due'
                ? `Due now · ${formatTime(dose.scheduledTime)}`
                : state === 'missed'
                  ? `Missed · ${formatTime(dose.scheduledTime)}`
                  : `${formatTime(dose.scheduledTime)} · ${relativeLabel(dose, now)}`}
        </Txt>
      </View>

      {dose.status === 'pending' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark ${medicine.name} as taken`}
          onPress={() => onMark('taken')}
          hitSlop={8}
          style={{
            minHeight: MIN_TOUCH_TARGET - 8,
            paddingHorizontal: 13, justifyContent: 'center',
            borderRadius: 999, borderWidth: 1.5, borderColor: c.violet,
          }}
        >
          <Txt variant="tiny" weight="black" color={c.violet}>Mark taken</Txt>
        </Pressable>
      ) : (
        <Icon
          name="check"
          size={17}
          color={dose.status === 'taken' ? c.sageDeep : c.inkGhost}
        />
      )}
    </View>
  );
}
