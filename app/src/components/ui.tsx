import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

/* ------------------------------ typography ------------------------------- */

type TextVariant =
  | 'display' | 'h1' | 'h2' | 'h3' | 'title'
  | 'bodyLg' | 'body' | 'small' | 'tiny' | 'micro';

interface TxtProps {
  children: React.ReactNode;
  variant?: TextVariant;
  serif?: boolean;
  italic?: boolean;
  color?: string;
  weight?: 'body' | 'bold' | 'black';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function Txt({
  children, variant = 'body', serif = false, italic = false,
  color, weight = 'body', style, numberOfLines,
}: TxtProps) {
  const { c, f, fonts } = useTheme();
  const fontFamily = serif
    ? italic ? fonts.serifItalic : fonts.serif
    : weight === 'black' ? fonts.bodyBlack
      : weight === 'bold' ? fonts.bodyBold
        : fonts.body;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily, fontSize: f[variant], color: color ?? c.ink },
        variant === 'display' || variant === 'h1' ? { lineHeight: f[variant] * 1.2 } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* -------------------------------- layout --------------------------------- */

export function Screen({
  children, scroll = false, padded = true, footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: React.ReactNode;
}) {
  const { c } = useTheme();
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded ? { paddingHorizontal: 20 } : null, { paddingBottom: 24 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded ? { paddingHorizontal: 20 } : null]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      {body}
      {footer}
    </SafeAreaView>
  );
}

export function Card({
  children, style, tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'alt' | 'lav';
}) {
  const { c, radius } = useTheme();
  const bg = tone === 'alt' ? c.surfaceAlt : tone === 'lav' ? c.surfaceLav : c.surface;
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: radius.lg + 2, borderWidth: 1, borderColor: c.border, padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children, gap = 10, style, align = 'center', justify,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, justifyContent: justify, gap }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ h = 12 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

/* ------------------------------- controls -------------------------------- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  icon?: IconName;
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label, onPress, variant = 'primary', icon, full = false, disabled = false, style, testID,
}: ButtonProps) {
  const { c, radius, f, fonts } = useTheme();

  const bg =
    variant === 'primary' ? c.rose
      : variant === 'danger' ? 'transparent'
        : variant === 'outline' ? 'transparent' : 'transparent';
  const fg =
    variant === 'primary' ? c.white
      : variant === 'danger' ? c.coralDeep
        : variant === 'outline' ? c.violet : c.inkSoft;
  const borderColor =
    variant === 'outline' ? c.violet : variant === 'danger' ? c.coralBorder : 'transparent';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: 20,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: variant === 'outline' || variant === 'danger' ? 1.5 : 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: f.bodyLg, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({
  value, onChange, label, testID,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={12}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        backgroundColor: value ? c.rose : c.borderStrong,
        padding: 3,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.white }} />
    </Pressable>
  );
}

export function Badge({
  label, tone = 'neutral', icon,
}: {
  label: string;
  tone?: 'neutral' | 'severe' | 'moderate' | 'mild' | 'violet';
  icon?: IconName;
}) {
  const { c, f, fonts, radius } = useTheme();
  const map = {
    neutral: { bg: c.surfaceLav, fg: c.inkFaint },
    severe: { bg: c.coralSoft, fg: c.coralDeep },
    moderate: { bg: c.amberSoft, fg: c.goldDeep },
    mild: { bg: c.sageSoft, fg: c.sageDeep },
    violet: { bg: c.violetSoft, fg: c.violet },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: map.bg, paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: radius.pill, alignSelf: 'flex-start',
      }}
    >
      {icon ? <Icon name={icon} size={11} color={map.fg} /> : null}
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: f.tiny, color: map.fg }}>{label}</Text>
    </View>
  );
}

export function Chip({
  label, selected = false, onPress, testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { c, f, fonts, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: selected ? c.ink : c.surfaceLav,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: f.small, color: selected ? c.white : c.inkSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconCircle({
  name, tone, size = 36,
}: {
  name: IconName;
  tone: 'rose' | 'violet' | 'sage' | 'gold' | 'coral';
  size?: number;
}) {
  const { c, radius } = useTheme();
  const map = {
    rose: { bg: c.roseSoft, fg: c.rose },
    violet: { bg: c.violetSoft, fg: c.violet },
    sage: { bg: c.sageSoft, fg: c.sageDeep },
    gold: { bg: c.goldSoft, fg: c.goldDeep },
    coral: { bg: c.coralSoft, fg: c.coral },
  }[tone];

  return (
    <View
      style={{
        width: size, height: size, borderRadius: radius.md,
        backgroundColor: map.bg, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name={name} size={size * 0.47} color={map.fg} />
    </View>
  );
}

/** Header for screens pushed onto the stack. */
export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const { c, radius } = useTheme();
  return (
    <Row gap={12} style={{ paddingVertical: 14 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={10}
          style={{
            width: MIN_TOUCH_TARGET - 8, height: MIN_TOUCH_TARGET - 8,
            borderRadius: radius.md, backgroundColor: c.surfaceLav,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chevronLeft" size={16} color={c.ink} />
        </Pressable>
      ) : null}
      <Txt variant="h2" serif>{title}</Txt>
    </Row>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <IconCircle name={icon} tone="violet" size={56} />
      <Spacer h={14} />
      <Txt variant="title" weight="black" style={{ textAlign: 'center' }}>{title}</Txt>
      <Spacer h={6} />
      <Txt variant="small" color={c.inkFaint} style={{ textAlign: 'center', lineHeight: 19 }}>
        {body}
      </Txt>
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
});
