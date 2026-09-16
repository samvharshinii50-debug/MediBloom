import React, { useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Button } from './ui';
import { Icon } from './Icon';
import { parseTimeKey } from '../engines/scheduleEngine';
import { formatTime } from '../services/notifications';
import { MIN_TOUCH_TARGET } from '../theme/tokens';

/**
 * Deliberately built from big +/- buttons rather than a native spinner.
 * A spinner is fiddly for anyone with shaky hands or poor eyesight, and this
 * app promises to be usable by exactly those people.
 */
export function TimePicker({
  visible, initial, onCancel, onConfirm,
}: {
  visible: boolean;
  initial: string;
  onCancel: () => void;
  onConfirm: (time: string) => void;
}) {
  const { c, radius } = useTheme();
  const start = parseTimeKey(initial || '09:00');
  const [hours, setHours] = useState(start.hours);
  const [minutes, setMinutes] = useState(start.minutes);

  // Re-seed whenever the sheet is reopened on a different time.
  React.useEffect(() => {
    if (visible) {
      const p = parseTimeKey(initial || '09:00');
      setHours(p.hours);
      setMinutes(p.minutes);
    }
  }, [visible, initial]);

  const wrap = (n: number, max: number) => ((n % max) + max) % max;
  const key = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Close time picker"
        style={{ flex: 1, backgroundColor: 'rgba(45,36,56,0.45)', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: 22 }}
        >
          <Txt variant="h3" serif>Pick a time</Txt>
          <Spacer h={4} />
          <Txt variant="tiny" color={c.inkFaint}>
            You'll get a reminder at this time every day.
          </Txt>
          <Spacer h={18} />

          <Row justify="center" gap={18}>
            <Stepper
              label="Hour"
              value={String(hours).padStart(2, '0')}
              onUp={() => setHours((h) => wrap(h + 1, 24))}
              onDown={() => setHours((h) => wrap(h - 1, 24))}
            />
            <Txt variant="h1" serif color={c.inkFaint}>:</Txt>
            <Stepper
              label="Minute"
              value={String(minutes).padStart(2, '0')}
              onUp={() => setMinutes((m) => wrap(m + 5, 60))}
              onDown={() => setMinutes((m) => wrap(m - 5, 60))}
            />
          </Row>

          <Spacer h={16} />
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: c.violetSoft, paddingHorizontal: 18,
                paddingVertical: 9, borderRadius: radius.pill,
              }}
            >
              <Txt variant="title" weight="black" color={c.violet}>{formatTime(key)}</Txt>
            </View>
          </View>

          <Spacer h={20} />
          <Row gap={10}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <Button label="Set time" onPress={() => onConfirm(key)} style={{ flex: 1.4 }} />
          </Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stepper({
  label, value, onUp, onDown,
}: {
  label: string;
  value: string;
  onUp: () => void;
  onDown: () => void;
}) {
  const { c, radius } = useTheme();
  const btn = {
    width: MIN_TOUCH_TARGET + 8,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: c.surfaceLav,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="micro" color={c.inkFaint} weight="bold">{label}</Txt>
      <Spacer h={6} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={onUp} style={btn}>
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="chevronDown" size={18} color={c.violet} />
        </View>
      </Pressable>
      <View style={{ paddingVertical: 8 }}>
        <Txt variant="display" serif>{value}</Txt>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={onDown} style={btn}>
        <Icon name="chevronDown" size={18} color={c.violet} />
      </Pressable>
    </View>
  );
}
