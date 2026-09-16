import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Card, Chip } from './ui';
import { FieldInput } from './FieldInput';
import { Icon } from './Icon';
import {
  DEFAULT_RELAY, isRelayConfigured, loadRelayConfig, relayBlocker, saveRelayConfig,
  sendRelayTest, type EmailRelayConfig, type RelayMode,
} from '../services/emailRelay';

/**
 * In Nunito the stem of "l" and the hook of "J" sit together and read as a
 * "U" — on screen "EmailJS" came out as "EmaiUS", which is no help at all to
 * someone trying to find the service. It is not a ligature, so a zero-width
 * non-joiner does nothing; the letters need actual space between them.
 */
const EMAILJS = 'Email JS';

const MODES: Array<{ mode: RelayMode; label: string }> = [
  { mode: 'off', label: 'One tap' },
  { mode: 'webhook', label: 'My own script' },
  { mode: 'emailjs', label: EMAILJS },
];

/**
 * Sets up sending caregiver alerts without the user having to tap anything.
 *
 * Both routes are free and both belong to the user — there is no MediBloom
 * server in the middle and no mail password stored on the phone.
 */
export function EmailRelayCard() {
  const { c, radius } = useTheme();
  const { settings } = useStore();

  const [cfg, setCfg] = useState<EmailRelayConfig>(DEFAULT_RELAY);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    loadRelayConfig().then(setCfg);
  }, []);

  const patch = async (p: Partial<EmailRelayConfig>) => {
    const next = { ...cfg, ...p };
    setCfg(next);
    setStatus(null);
    await saveRelayConfig(next);
  };

  const target = settings.caregiverEmail || settings.emailAddress;
  const blocker = relayBlocker(cfg);
  const ready = isRelayConfigured(cfg);

  const runTest = async () => {
    if (!target) {
      setStatus({ ok: false, message: 'Add a caregiver email above first.' });
      return;
    }
    setSending(true);
    setStatus(null);
    const res = await sendRelayTest(target, cfg);
    setStatus({
      ok: res.ok,
      message: res.ok
        ? `Sent to ${target}. Check the inbox — and the spam folder the first time.`
        : res.error ?? 'Could not send.',
    });
    setSending(false);
  };

  return (
    <Card>
      <Txt variant="title" weight="black">Automatic email</Txt>
      <Txt variant="micro" color={c.inkFaint} style={{ marginTop: 2, lineHeight: 15 }}>
        How a caregiver alert actually leaves the phone.
      </Txt>

      <Spacer h={12} />
      <Row gap={7} style={{ flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <Chip
            key={m.mode}
            label={m.label}
            selected={cfg.mode === m.mode}
            onPress={() => void patch({ mode: m.mode })}
          />
        ))}
      </Row>

      <Spacer h={12} />

      {cfg.mode === 'off' ? (
        <Txt variant="micro" color={c.inkFaint} style={{ lineHeight: 16 }}>
          The alert arrives as a notification with the email already written — subject,
          body, everything. One tap opens your mail app and sends it. No setup, no
          accounts, nothing stored.
        </Txt>
      ) : null}

      {cfg.mode === 'webhook' ? (
        <>
          <Txt variant="micro" color={c.inkFaint} style={{ lineHeight: 16 }}>
            Point this at a Google Apps Script web app of your own — about ten lines,
            sends through your own Gmail, costs nothing and no third party sees it.
            MediBloom posts {'{ to, subject, body }'} as JSON. The setup snippet is in
            the project README.
          </Txt>
          <Spacer h={10} />
          <FieldInput
            value={cfg.webhookUrl}
            onCommit={(t) => void patch({ webhookUrl: t })}
            placeholder="https://script.google.com/macros/s/.../exec"
            keyboardType="url"
            accessibilityLabel="Webhook URL"
          />
        </>
      ) : null}

      {cfg.mode === 'emailjs' ? (
        <>
          <Txt variant="micro" color={c.inkFaint} style={{ lineHeight: 16 }}>
            {EMAILJS} free tier covers 200 emails a month. The service and keys below are
            already filled in. Two things are left, and both are switches in your {EMAILJS}
            account rather than anything the app can do:
          </Txt>
          <Spacer h={8} />
          <View style={{ backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 11 }}>
            <Txt variant="micro" color={c.goldDeep} style={{ lineHeight: 17 }}>
              <Txt variant="micro" weight="black" color={c.goldDeep}>1.</Txt> Account → Security →
              turn on “Allow {EMAILJS} API for non-browser applications”. Without this every
              send is refused.
              {'\n'}
              <Txt variant="micro" weight="black" color={c.goldDeep}>2.</Txt> Email Templates →
              create one using {'{{to_email}}, {{subject}}, {{message}}'} → paste its ID below.
            </Txt>
          </View>
          <Spacer h={10} />
          <FieldInput
            value={cfg.emailjsTemplateId}
            onCommit={(t) => void patch({ emailjsTemplateId: t })}
            placeholder="Template ID — the missing piece"
            accessibilityLabel="Template ID"
          />
          <Spacer h={8} />
          <FieldInput
            value={cfg.emailjsServiceId}
            onCommit={(t) => void patch({ emailjsServiceId: t })}
            placeholder="Service ID"
            accessibilityLabel="Service ID"
          />
          <Spacer h={8} />
          <FieldInput
            value={cfg.emailjsPublicKey}
            onCommit={(t) => void patch({ emailjsPublicKey: t })}
            placeholder="Public key"
            accessibilityLabel="Public key"
          />
          <Spacer h={8} />
          <FieldInput
            value={cfg.emailjsPrivateKey}
            onCommit={(t) => void patch({ emailjsPrivateKey: t })}
            placeholder="Private key"
            secureTextEntry
            accessibilityLabel="Private key"
          />
        </>
      ) : null}

      {cfg.mode !== 'off' ? (
        <>
          <Spacer h={12} />
          <Row gap={8} align="flex-start">
            <Icon
              name={ready ? 'check' : 'alert'}
              size={13}
              color={ready ? c.sageDeep : c.goldDeep}
            />
            <Txt
              variant="micro"
              weight="bold"
              color={ready ? c.sageDeep : c.goldDeep}
              style={{ flex: 1, lineHeight: 16 }}
            >
              {ready
                ? 'Ready — alerts will send on their own.'
                : `${blocker} Until then, alerts use the one-tap notification.`}
            </Txt>
          </Row>

          <Spacer h={12} />
          <Pressable
            accessibilityRole="button"
            onPress={runTest}
            disabled={sending}
            style={{
              minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.violet,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}
          >
            {sending ? <ActivityIndicator size="small" color={c.violet} /> : null}
            <Txt variant="small" weight="black" color={c.violet}>
              {sending ? 'Sending…' : 'Send a real test email'}
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
