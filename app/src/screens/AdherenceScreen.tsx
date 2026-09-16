import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, TopBar, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import {
  adherenceByMedicine, dailyBreakdown, dayDetail, weekComparison,
} from '../engines/insightEngine';
import { describeDate, formatClock, friendlyDate, toDateKey } from '../engines/scheduleEngine';

type DayCell = { date: string; taken: number; missed: number; skipped: number; total: number };

const WEEKS = 4;

export function AdherenceScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const { adherence, historyDoses, medicines } = useStore();

  const today = toDateKey(new Date());
  const days = useMemo(() => dailyBreakdown(historyDoses, WEEKS * 7), [historyDoses]);
  const byMed = useMemo(
    () => adherenceByMedicine(medicines, historyDoses),
    [medicines, historyDoses],
  );
  const week = useMemo(() => weekComparison(historyDoses), [historyDoses]);

  /** Which square the user tapped. Defaults to today so the panel is never empty. */
  const [selected, setSelected] = useState<string>(today);
  const detail = useMemo(
    () => dayDetail(historyDoses, medicines, selected),
    [historyDoses, medicines, selected],
  );

  /**
   * Colour by how much of the day was actually taken. Painting a whole day red
   * for a single missed dose made a good week look like a disaster, which is
   * both discouraging and untrue.
   */
  const cellColor = (d: DayCell) => {
    if (d.total === 0) return c.borderStrong;
    const settled = d.taken + d.missed + d.skipped;
    // Scheduled but nothing marked yet. Needs a tint that is clearly not the
    // "nothing was due" grey — those two sat a couple of hex points apart and
    // were impossible to tell apart in the legend.
    if (settled === 0) return c.violetTint;
    const ratio = d.taken / settled;
    if (ratio >= 0.999) return c.sage;
    if (ratio >= 0.5) return c.amber;
    return c.coral;
  };

  // 28 days is exactly four weeks, so every column is the same weekday.
  const columnLabels = days.slice(0, 7).map((d) => describeDate(d.date).weekday.charAt(0));
  const rangeLabel =
    days.length > 0
      ? `${describeDate(days[0].date).day} ${describeDate(days[0].date).month} – ${describeDate(days[days.length - 1].date).day} ${describeDate(days[days.length - 1].date).month}`
      : '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Your Adherence" onBack={() => nav.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {historyDoses.length === 0 ? (
          <Card>
            <EmptyState
              icon="chart"
              title="No history yet"
              body="Once you start marking doses, your streak, trends and per-medicine breakdown appear here."
            />
          </Card>
        ) : (
          <>
            <Row gap={10}>
              <StatCard label="Streak" value={`${adherence.streakDays}d`} />
              <StatCard label="Adherence" value={`${adherence.ratePercent}%`} />
              <StatCard
                label="Taken"
                value={`${adherence.taken}/${adherence.taken + adherence.missed + adherence.skipped}`}
              />
            </Row>

            <Spacer h={14} />

            {/* ---------------------------- the grid ---------------------------- */}
            <Card>
              <Row justify="space-between" align="flex-end">
                <View>
                  <Txt variant="body" weight="black">Last 4 weeks</Txt>
                  <Txt variant="micro" color={c.inkFaint} weight="bold" style={{ marginTop: 1 }}>
                    {rangeLabel}
                  </Txt>
                </View>
                <Txt variant="micro" color={c.inkGhost} weight="bold">Tap a day</Txt>
              </Row>

              <Spacer h={12} />

              {/* Weekday header, derived from the real dates rather than assumed. */}
              <Row gap={5}>
                {columnLabels.map((label, i) => (
                  <View key={`${label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                    <Txt variant="micro" color={c.inkGhost} weight="black">{label}</Txt>
                  </View>
                ))}
              </Row>

              <Spacer h={6} />

              {/* Four fixed rows of seven. A wrapping flex grid with percentage
                  widths collapses to zero height in React Native. */}
              <View style={{ gap: 5 }}>
                {Array.from({ length: WEEKS }, (_, week) => (
                  <View key={week} style={{ flexDirection: 'row', gap: 5 }}>
                    {days.slice(week * 7, week * 7 + 7).map((d) => {
                      const isSelected = d.date === selected;
                      const isToday = d.date === today;
                      const { day } = describeDate(d.date);
                      const filled = d.total > 0 && d.taken + d.missed + d.skipped > 0;
                      return (
                        <Pressable
                          key={d.date}
                          accessibilityRole="button"
                          accessibilityLabel={`${friendlyDate(d.date)}: ${d.taken} taken, ${d.missed} missed, ${d.total} scheduled`}
                          onPress={() => setSelected(d.date)}
                          onLongPress={() => setSelected(d.date)}
                          delayLongPress={200}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: cellColor(d),
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: isSelected ? 2.5 : isToday ? 1.5 : 0,
                            borderColor: isSelected ? c.ink : c.inkFaint,
                          }}
                        >
                          <Txt
                            variant="micro"
                            weight="black"
                            color={filled ? c.white : c.inkFaint}
                          >
                            {day}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              <Spacer h={12} />
              <Row gap={12} style={{ flexWrap: 'wrap' }}>
                <Legend color={c.sage} label="All taken" />
                <Legend color={c.amber} label="Most taken" />
                <Legend color={c.coral} label="Mostly missed" />
                <Legend color={c.violetTint} label="Not marked yet" />
                <Legend color={c.borderStrong} label="Nothing due" />
              </Row>
            </Card>

            <Spacer h={14} />

            {/* --------------------------- day detail --------------------------- */}
            <Card>
              <Row justify="space-between" align="center">
                <Txt variant="body" weight="black">{friendlyDate(selected)}</Txt>
                <Txt variant="micro" color={c.inkFaint} weight="bold">
                  {detail.length > 0
                    ? `${detail.filter((d) => d.status === 'taken').length} of ${detail.length} taken`
                    : 'Nothing scheduled'}
                </Txt>
              </Row>

              {detail.length > 0 ? (
                <>
                  <Spacer h={12} />
                  <View style={{ gap: 9 }}>
                    {detail.map((d, i) => (
                      <Row key={`${d.medicineName}-${d.time}-${i}`} gap={10}>
                        <View
                          style={{
                            width: 8, height: 8, borderRadius: 4, backgroundColor: d.colorTag,
                          }}
                        />
                        <Txt variant="small" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                          {d.medicineName}
                        </Txt>
                        <Txt variant="tiny" color={c.inkFaint} weight="bold">
                          {formatClock(d.time)}
                        </Txt>
                        <StatusPill status={d.status} />
                      </Row>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Spacer h={8} />
                  <Txt variant="tiny" color={c.inkFaint} style={{ lineHeight: 17 }}>
                    No doses were scheduled on this day. Tap another square to look at it.
                  </Txt>
                </>
              )}
            </Card>

            <Spacer h={14} />

            {/* ----------------------------- trend ------------------------------ */}
            <Card>
              <Txt variant="body" weight="black">This week</Txt>
              <Spacer h={10} />
              <Row gap={10} align="center">
                <Txt variant="h2" serif>{week.thisWeek}%</Txt>
                {week.delta !== null ? (
                  <Row
                    gap={5}
                    style={{
                      backgroundColor: week.delta >= 0 ? c.sageSoft : c.coralSoft,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                    }}
                  >
                    <View style={week.delta >= 0 ? { transform: [{ rotate: '180deg' }] } : undefined}>
                      <Icon name="chevronDown" size={12} color={week.delta >= 0 ? c.sageDeep : c.coralDeep} />
                    </View>
                    <Txt variant="tiny" weight="black" color={week.delta >= 0 ? c.sageDeep : c.coralDeep}>
                      {week.delta >= 0 ? '+' : ''}{week.delta} vs last week
                    </Txt>
                  </Row>
                ) : (
                  <Txt variant="tiny" color={c.inkFaint} weight="bold">
                    Not enough of last week to compare yet
                  </Txt>
                )}
              </Row>
            </Card>

            <Spacer h={14} />

            <Card>
              <Txt variant="body" weight="black">By medicine</Txt>
              <Spacer h={12} />
              <View style={{ gap: 12 }}>
                {byMed.map(({ medicine, ratePercent }) => (
                  <Row key={medicine.id} gap={10}>
                    <Txt variant="small" weight="bold" numberOfLines={1} style={{ width: 88 }}>
                      {medicine.name}
                    </Txt>
                    <View
                      style={{
                        flex: 1, height: 8, borderRadius: 999,
                        backgroundColor: c.surfaceLav, overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${ratePercent}%`, height: '100%',
                          backgroundColor: medicine.colorTag, borderRadius: 999,
                        }}
                      />
                    </View>
                    <Txt variant="tiny" weight="black" style={{ width: 38, textAlign: 'right' }}>
                      {ratePercent}%
                    </Txt>
                  </Row>
                ))}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatusPill({ status }: { status: 'pending' | 'taken' | 'missed' | 'skipped' }) {
  const { c } = useTheme();
  const map = {
    taken: { bg: c.sageSoft, fg: c.sageDeep, label: 'Taken' },
    missed: { bg: c.coralSoft, fg: c.coralDeep, label: 'Missed' },
    skipped: { bg: c.goldSoft, fg: c.goldDeep, label: 'Skipped' },
    pending: { bg: c.surfaceLav, fg: c.inkSoft, label: 'Due' },
  }[status];

  return (
    <View
      style={{
        backgroundColor: map.bg, paddingHorizontal: 9, paddingVertical: 4,
        borderRadius: 999, minWidth: 58, alignItems: 'center',
      }}
    >
      <Txt variant="micro" weight="black" color={map.fg}>{map.label}</Txt>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <Txt variant="micro" color={c.inkFaint} weight="bold">{label}</Txt>
      <Spacer h={6} />
      <Txt variant="h2" serif>{value}</Txt>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { c } = useTheme();
  return (
    <Row gap={5}>
      <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: color }} />
      <Txt variant="micro" color={c.inkFaint} weight="bold">{label}</Txt>
    </Row>
  );
}
