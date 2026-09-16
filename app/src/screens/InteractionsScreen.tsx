import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, TopBar, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { groupBySeverity } from '../engines/interactionEngine';
import { explainInteraction, loadApiKey } from '../services/ai';
import type { DetectedInteraction, Severity } from '../data/types';

export function InteractionsScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { interactions, medicines } = useStore();
  const grouped = groupBySeverity(interactions);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Interactions" onBack={nav.canGoBack() ? () => nav.goBack() : undefined} />
        <Txt variant="tiny" color={c.inkFaint}>
          Checked automatically, entirely on this device
        </Txt>
      </View>
      {/* The checking itself never needs a network. Only the optional
          "Explain this to me" button does, and it fails quietly. */}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {interactions.length === 0 ? (
          <Card>
            <EmptyState
              icon="shield"
              title={medicines.length < 2 ? 'Nothing to check yet' : 'All clear'}
              body={
                medicines.length < 2
                  ? 'Once you have two or more medicines, MediBloom checks every pair automatically.'
                  : "Nothing in your list interacts in a way we recognise. We'll re-check the moment you add something new."
              }
            />
          </Card>
        ) : (
          <>
            <Section title="Severe" items={grouped.severe} severity="severe" />
            <Section title="Moderate" items={grouped.moderate} severity="moderate" />
            <Section title="Mild" items={grouped.mild} severity="mild" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title, items, severity,
}: {
  title: string;
  items: DetectedInteraction[];
  severity: Severity;
}) {
  const { c } = useTheme();
  if (items.length === 0) return null;

  const tone =
    severity === 'severe' ? c.coralDeep : severity === 'moderate' ? c.goldDeep : c.sageDeep;

  return (
    <View style={{ marginBottom: 18 }}>
      <Row gap={7} style={{ marginBottom: 10 }}>
        <Icon name="alert" size={15} color={tone} />
        <Txt variant="tiny" weight="black" color={tone} style={{ letterSpacing: 0.4 }}>
          {title.toUpperCase()} · {items.length}
        </Txt>
      </Row>
      <View style={{ gap: 10 }}>
        {items.map((item, i) => (
          <InteractionCard key={`${item.rule.a}-${item.rule.b}-${i}`} item={item} />
        ))}
      </View>
    </View>
  );
}

function InteractionCard({ item }: { item: DetectedInteraction }) {
  const { c, radius } = useTheme();
  const { settings } = useStore();
  const { rule } = item;

  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (settings.aiEnabled) loadApiKey().then(setApiKey);
  }, [settings.aiEnabled]);

  const canExplain = settings.aiEnabled && apiKey.length > 0 && !detail;

  const explain = async () => {
    setBusy(true);
    setFailed(null);
    const res = await explainInteraction(
      item.medicineA.name,
      item.medicineB.name,
      rule.severity,
      rule.explanation,
      rule.guidance,
      { provider: settings.aiProvider, apiKey, model: settings.aiModel },
    );
    setBusy(false);
    if (res.text) setDetail(res.text);
    else setFailed(res.error ?? 'Could not reach the provider.');
  };

  const border =
    rule.severity === 'severe' ? c.coralBorder
      : rule.severity === 'moderate' ? c.amber : c.sage;
  const badgeBg =
    rule.severity === 'severe' ? c.coral
      : rule.severity === 'moderate' ? c.amber : c.sage;
  const badgeFg = rule.severity === 'severe' ? c.white : c.ink;

  return (
    <View
      style={{
        backgroundColor: c.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: border, padding: 15,
      }}
    >
      <Row justify="space-between" align="flex-start" style={{ marginBottom: 10 }}>
        <Row gap={6} style={{ flex: 1, flexWrap: 'wrap' }}>
          <Pill label={item.medicineA.name} tone="rose" />
          <Pill label={item.medicineB.name} tone="coral" />
        </Row>
        <View style={{ backgroundColor: badgeBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
          <Txt variant="micro" weight="black" color={badgeFg}>{rule.severity.toUpperCase()}</Txt>
        </View>
      </Row>

      <Txt variant="small" color={c.ink} style={{ lineHeight: 19 }}>{rule.explanation}</Txt>

      <Spacer h={12} />

      {rule.swapFor ? (
        <View style={{ backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 12 }}>
          <Txt variant="micro" weight="black" color={c.goldDeep} style={{ letterSpacing: 0.4, marginBottom: 8 }}>
            TRY THIS SWAP
          </Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Pill label={item.medicineB.name} tone="coral" />
            <Icon name="arrowRight" size={13} color={c.gold} />
            <Pill label={cap(rule.swapFor)} tone="sage" />
          </Row>
          {rule.swapReason ? (
            <Txt variant="tiny" color={c.inkSoft} style={{ marginTop: 8, lineHeight: 17 }}>
              {rule.swapReason}
            </Txt>
          ) : null}
          <Txt variant="tiny" color={c.inkSoft} style={{ marginTop: 6, lineHeight: 17 }}>
            {rule.guidance}
          </Txt>
        </View>
      ) : (
        <View style={{ backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 12 }}>
          <Row gap={9} align="flex-start">
            <Icon name="bulb" size={15} color={c.gold} />
            <View style={{ flex: 1 }}>
              <Txt variant="micro" weight="black" color={c.goldDeep} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
                WHAT TO DO
              </Txt>
              <Txt variant="tiny" color={c.ink} style={{ lineHeight: 17 }}>{rule.guidance}</Txt>
            </View>
          </Row>
        </View>
      )}

      {/* ------------------------- optional detail ------------------------- */}
      {canExplain ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Explain the ${item.medicineA.name} and ${item.medicineB.name} interaction in more detail`}
          onPress={() => void explain()}
          disabled={busy}
          style={{
            marginTop: 10, minHeight: 42, borderRadius: radius.md,
            borderWidth: 1.5, borderColor: c.violet, flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {busy ? <ActivityIndicator size="small" color={c.violet} /> : (
            <Icon name="sparkle" size={13} color={c.violet} />
          )}
          <Txt variant="tiny" weight="black" color={c.violet}>
            {busy ? 'Looking it up…' : 'Explain this to me'}
          </Txt>
        </Pressable>
      ) : null}

      {detail ? (
        <View
          style={{
            marginTop: 10, backgroundColor: c.violetSoft,
            borderRadius: radius.md, padding: 12,
          }}
        >
          <Row gap={7} style={{ marginBottom: 6 }}>
            <Icon name="sparkle" size={12} color={c.violet} />
            <Txt variant="micro" weight="black" color={c.violet} style={{ letterSpacing: 0.4 }}>
              IN MORE DETAIL
            </Txt>
          </Row>
          <Txt variant="tiny" color={c.ink} style={{ lineHeight: 18 }}>{detail}</Txt>
          <Txt variant="micro" color={c.inkGhost} weight="bold" style={{ marginTop: 8 }}>
            Cloud assist · the warning above is from the bundled reference
          </Txt>
        </View>
      ) : null}

      {failed ? (
        <Txt variant="micro" color={c.inkGhost} style={{ marginTop: 8, lineHeight: 15 }}>
          Couldn't fetch more detail — {failed} Everything above still applies; it is
          checked on this phone and does not need a connection.
        </Txt>
      ) : null}
    </View>
  );
}

function Pill({ label, tone }: { label: string; tone: 'rose' | 'coral' | 'sage' }) {
  const { c } = useTheme();
  const map = {
    rose: { bg: c.roseSoft, fg: c.roseDeep },
    coral: { bg: c.coralSoft, fg: c.coralDeep },
    sage: { bg: c.sageSoft, fg: c.sageDeep },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 }}>
      <Txt variant="tiny" weight="black" color={map.fg}>{label}</Txt>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
