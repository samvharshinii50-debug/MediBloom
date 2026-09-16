import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, Toggle, Chip } from './ui';
import { FieldInput } from './FieldInput';
import { Icon } from './Icon';
import {
  AI_PROVIDERS, loadApiKey, saveApiKey, testAiConnection,
  type AiProvider,
} from '../services/ai';

const PROVIDER_ORDER: AiProvider[] = ['groq', 'gemini', 'openrouter'];

/**
 * Turns the assistant's optional cloud mode on.
 *
 * Deliberately blunt about the trade: the on-device assistant is the default
 * and always works; this sends a summary of the user's medicines to a company
 * that is not us. Nobody should switch that on without being told.
 */
export function AiAssistCard() {
  const { c, radius } = useTheme();
  const { settings, updateSettings } = useStore();

  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    loadApiKey().then(setKey);
  }, []);

  const info = AI_PROVIDERS[settings.aiProvider];

  const pickProvider = async (p: AiProvider) => {
    setStatus(null);
    await updateSettings({ aiProvider: p, aiModel: AI_PROVIDERS[p].defaultModel });
  };

  const persistKey = async (value: string) => {
    setKey(value);
    setStatus(null);
    await saveApiKey(value.trim());
  };

  const runTest = async () => {
    setTesting(true);
    setStatus(null);
    const res = await testAiConnection({
      provider: settings.aiProvider,
      apiKey: key.trim(),
      model: settings.aiModel,
    });
    setStatus(res);
    setTesting(false);
  };

  return (
    <Card>
      <Row justify="space-between">
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Txt variant="title" weight="black">Smarter answers</Txt>
          <Txt variant="micro" color={c.inkFaint} style={{ marginTop: 2, lineHeight: 15 }}>
            Optional. The assistant already works offline — this only helps with
            wording it doesn't recognise.
          </Txt>
        </View>
        <Toggle
          label="Cloud assist"
          value={settings.aiEnabled}
          onChange={(v) => void updateSettings({ aiEnabled: v })}
        />
      </Row>

      {settings.aiEnabled ? (
        <>
          <Spacer h={14} />

          <View
            style={{
              backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 12,
            }}
          >
            <Row gap={8} align="flex-start">
              <Icon name="alert" size={14} color={c.goldDeep} />
              <Txt variant="micro" color={c.goldDeep} style={{ flex: 1, lineHeight: 16 }}>
                With this on, a summary of your medicines and today's doses is sent to
                your chosen provider to answer each question. Your key stays in this
                phone's keystore. Turn it off and everything goes back to on-device only.
              </Txt>
            </Row>
          </View>

          <Spacer h={14} />
          <Txt variant="micro" weight="black" color={c.inkSoft}>Provider</Txt>
          <Row gap={7} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {PROVIDER_ORDER.map((p) => (
              <Chip
                key={p}
                label={AI_PROVIDERS[p].label}
                selected={settings.aiProvider === p}
                onPress={() => void pickProvider(p)}
              />
            ))}
          </Row>

          <Spacer h={8} />
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`https://${info.keyUrl}`)}
          >
            <Txt variant="micro" color={c.violet} weight="bold">
              {info.freeNote} Get a key at {info.keyUrl} →
            </Txt>
          </Pressable>

          <Spacer h={14} />
          <Txt variant="micro" weight="black" color={c.inkSoft}>API key</Txt>
          <Spacer h={8} />
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <FieldInput
                value={key}
                onCommit={persistKey}
                placeholder="Paste your key"
                secureTextEntry={!revealed}
                accessibilityLabel="API key"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide key' : 'Show key'}
              onPress={() => setRevealed((v) => !v)}
              style={{
                width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.surfaceLav,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name={revealed ? 'lock' : 'sun'} size={15} color={c.inkSoft} />
            </Pressable>
          </Row>

          <Spacer h={10} />
          <Txt variant="micro" weight="black" color={c.inkSoft}>Model</Txt>
          <Spacer h={8} />
          <FieldInput
            value={settings.aiModel}
            onCommit={(t) => void updateSettings({ aiModel: t })}
            placeholder={info.defaultModel}
            accessibilityLabel="Model name"
          />

          <Spacer h={12} />
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="small" weight="bold">Help read prescriptions</Txt>
              <Txt variant="micro" color={c.inkFaint} style={{ lineHeight: 15 }}>
                A second pass on lines the phone couldn't read. You still confirm everything.
              </Txt>
            </View>
            <Toggle
              label="AI prescription help"
              value={settings.aiOcrAssist}
              onChange={(v) => void updateSettings({ aiOcrAssist: v })}
            />
          </Row>

          <Spacer h={12} />
          <Pressable
            accessibilityRole="button"
            onPress={runTest}
            disabled={testing}
            style={{
              minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.violet,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}
          >
            {testing ? <ActivityIndicator size="small" color={c.violet} /> : null}
            <Txt variant="small" weight="black" color={c.violet}>
              {testing ? 'Checking…' : 'Test connection'}
            </Txt>
          </Pressable>

          {status ? (
            <View
              style={{
                marginTop: 10, borderRadius: radius.sm, padding: 10,
                backgroundColor: status.ok ? c.sageSoft : c.coralSoft,
              }}
            >
              <Txt
                variant="micro"
                weight="bold"
                color={status.ok ? c.sageDeep : c.coralDeep}
                style={{ lineHeight: 16 }}
              >
                {status.message}
              </Txt>
            </View>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
