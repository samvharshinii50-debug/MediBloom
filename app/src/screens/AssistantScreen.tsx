import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer } from '../components/ui';
import { Icon } from '../components/Icon';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { answer, type AssistantAnswer } from '../engines/assistantEngine';
import { askAi, loadApiKey, type AiConfig } from '../services/ai';

interface Message {
  id: string;
  from: 'user' | 'bot';
  text: string;
  followUps?: string[];
  swap?: { from: string; to: string; reason?: string } | null;
  /** Shown as a small badge so it is always clear where an answer came from. */
  source?: 'device' | 'ai';
  /** Quiet footnote, e.g. why the cloud answer was not used. */
  note?: string;
}

const STARTERS = [
  'What did I take today?',
  'What is left today?',
  'Do any of mine interact?',
];

export function AssistantScreen() {
  const { c, radius, f, fonts } = useTheme();
  const { medicines, historyDoses, interactions, settings } = useStore();
  const scrollRef = useRef<ScrollView>(null);

  const tabBarHeight = useBottomTabBarHeight();
  const keyboardHeight = useKeyboardHeight();
  // The screen's bottom edge already sits above the tab bar, so only the part
  // of the keyboard that overlaps the screen itself needs lifting.
  const lift = Math.max(0, keyboardHeight - tabBarHeight);

  const [apiKey, setApiKey] = useState('');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      from: 'bot',
      text: `Hi${settings.profileName ? ` ${settings.profileName}` : ''}! Ask me about your medicines — what you took today, what's still due, or whether two are safe together.`,
      followUps: STARTERS,
      source: 'device',
    },
  ]);

  useEffect(() => {
    let alive = true;
    loadApiKey().then((k) => {
      if (alive) setApiKey(k);
    });
    return () => {
      alive = false;
    };
  }, [settings.aiEnabled]);

  const aiReady = settings.aiEnabled && apiKey.length > 0;

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // Keep the newest message visible when the keyboard pushes the layout up.
  useEffect(() => {
    if (keyboardHeight > 0) scrollDown();
  }, [keyboardHeight, scrollDown]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || thinking) return;
      setInput('');

      // The on-device answer is computed first, every time. It is the fallback,
      // and its swap chips are grounded in real rules rather than model output.
      const local: AssistantAnswer = answer(q, {
        medicines,
        entries: historyDoses,
        interactions,
        profileName: settings.profileName,
      });

      const swap = local.interaction?.rule.swapFor
        ? {
            from: local.interaction.medicineB.name,
            to: local.interaction.rule.swapFor,
            reason: local.interaction.rule.swapReason,
          }
        : null;

      const stamp = Date.now();
      setMessages((prev) => [...prev, { id: `u-${stamp}`, from: 'user', text: q }]);
      scrollDown();

      // A question the rule engine answers exactly — what she took, what is
      // left, her numbers — is answered instantly from the phone. Sending it
      // to a model would only add several seconds and a chance of it turning
      // "skipped" into "you took it".
      if (!aiReady || local.exact) {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${stamp}`,
            from: 'bot',
            text: local.text,
            followUps: local.followUps,
            swap,
            source: 'device',
          },
        ]);
        scrollDown();
        return;
      }

      setThinking(true);
      scrollDown();

      const cfg: AiConfig = {
        provider: settings.aiProvider,
        apiKey,
        model: settings.aiModel,
      };
      const res = await askAi(
        q,
        { medicines, entries: historyDoses, interactions, profileName: settings.profileName },
        cfg,
      );
      setThinking(false);

      setMessages((prev) => [
        ...prev,
        res.text
          ? {
              id: `b-${stamp}`,
              from: 'bot',
              text: res.text,
              followUps: local.followUps,
              swap,
              source: 'ai',
            }
          : {
              id: `b-${stamp}`,
              from: 'bot',
              text: local.text,
              followUps: local.followUps,
              swap,
              source: 'device',
              note: res.error ? `Cloud assist unavailable — ${res.error}` : undefined,
            },
      ]);
      scrollDown();
    },
    [
      medicines, historyDoses, interactions, settings.profileName,
      settings.aiProvider, settings.aiModel, apiKey, aiReady, thinking, scrollDown,
    ],
  );

  const lastFollowUps =
    [...messages].reverse().find((m) => m.from === 'bot')?.followUps ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, marginBottom: lift }}>
      <Row gap={10} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
        <View
          style={{
            width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.rose,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chat" size={17} color={c.white} />
        </View>
        <View>
          <Txt variant="h3" serif>Ask MediBloom</Txt>
          <Txt variant="micro" color={c.inkFaint} weight="bold">
            {aiReady ? 'Cloud assist on · falls back offline' : 'Fully offline · your data only'}
          </Txt>
        </View>
      </Row>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollDown}
      >
        {messages.map((m) =>
          m.from === 'user' ? (
            <View
              key={m.id}
              style={{
                alignSelf: 'flex-end', maxWidth: '84%',
                backgroundColor: c.rose, borderRadius: radius.lg, padding: 12,
              }}
            >
              <Txt variant="small" color={c.white} weight="bold" style={{ lineHeight: 19 }}>
                {m.text}
              </Txt>
            </View>
          ) : (
            <Row key={m.id} gap={9} align="flex-start" style={{ maxWidth: '92%' }}>
              <View
                style={{
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: m.source === 'ai' ? c.violet : c.rose,
                  alignItems: 'center', justifyContent: 'center', marginTop: 2,
                }}
              >
                <Icon name="sparkle" size={12} color={c.white} />
              </View>
              <View
                style={{
                  flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                  borderRadius: radius.lg, padding: 12,
                }}
              >
                <Txt variant="small" style={{ lineHeight: 20 }}>{m.text}</Txt>

                {m.swap ? (
                  <Row
                    gap={8}
                    style={{
                      marginTop: 10, backgroundColor: c.goldSoft,
                      borderRadius: radius.sm, padding: 10, flexWrap: 'wrap',
                    }}
                  >
                    <SwapPill label={m.swap.from} tone="coral" />
                    <Icon name="arrowRight" size={12} color={c.gold} />
                    <SwapPill label={cap(m.swap.to)} tone="sage" />
                  </Row>
                ) : null}

                {m.source ? (
                  <Txt variant="micro" color={c.inkGhost} weight="bold" style={{ marginTop: 8 }}>
                    {m.source === 'ai' ? 'Cloud assist · grounded in your data' : 'Answered on this phone'}
                  </Txt>
                ) : null}

                {m.note ? (
                  <Txt variant="micro" color={c.inkGhost} style={{ marginTop: 3, lineHeight: 15 }}>
                    {m.note}
                  </Txt>
                ) : null}
              </View>
            </Row>
          ),
        )}

        {thinking ? (
          <Row gap={9} align="center">
            <View
              style={{
                width: 26, height: 26, borderRadius: 13, backgroundColor: c.violet,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="sparkle" size={12} color={c.white} />
            </View>
            <Row
              gap={8}
              style={{
                backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 11,
              }}
            >
              <ActivityIndicator size="small" color={c.violet} />
              <Txt variant="tiny" color={c.inkFaint} weight="bold">Thinking…</Txt>
            </Row>
          </Row>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
        {lastFollowUps.length > 0 && !thinking ? (
          <Row gap={7} style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            {lastFollowUps.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => void send(s)}
                style={{
                  paddingHorizontal: 13, minHeight: 36, justifyContent: 'center',
                  borderRadius: 999, backgroundColor: c.surfaceLav,
                }}
              >
                <Txt variant="tiny" weight="bold" color={c.inkSoft}>{s}</Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}

        <Row
          gap={8}
          style={{
            backgroundColor: c.surfaceAlt, borderWidth: 1.5, borderColor: c.borderStrong,
            borderRadius: radius.lg, paddingLeft: 15, paddingRight: 5, paddingVertical: 5,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => void send(input)}
            placeholder="Ask anything about your medicines…"
            placeholderTextColor={c.inkGhost}
            returnKeyType="send"
            blurOnSubmit={false}
            accessibilityLabel="Ask a question"
            style={{
              flex: 1, fontFamily: fonts.body, fontSize: f.body,
              color: c.ink, paddingVertical: 9,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={() => void send(input)}
            disabled={thinking}
            style={{
              width: 38, height: 38, borderRadius: radius.md,
              backgroundColor: thinking ? c.inkGhost : c.rose,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="send" size={15} color={c.white} />
          </Pressable>
        </Row>
      </View>
    </View>
  );
}

function SwapPill({ label, tone }: { label: string; tone: 'coral' | 'sage' }) {
  const { c } = useTheme();
  const map = tone === 'coral'
    ? { bg: c.coralSoft, fg: c.coralDeep }
    : { bg: c.sageSoft, fg: c.sageDeep };
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
      <Txt variant="tiny" weight="black" color={map.fg}>{label}</Txt>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
