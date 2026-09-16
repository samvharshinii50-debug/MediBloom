import React, { useMemo, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Button, TopBar, Card } from '../components/ui';
import { Icon } from '../components/Icon';
import { TimePicker } from '../components/TimePicker';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { resolveGeneric } from '../data/drugSynonyms';
import { findInteraction } from '../data/interactions';
import { suggestGenerics } from '../engines/prescriptionParser';
import { FREQUENCY_PRESETS, toDateKey } from '../engines/scheduleEngine';
import { formatTime } from '../services/notifications';

const COLORS = ['#E85D8A', '#8B5FBF', '#F17C7C', '#8FD4B8', '#D4A574', '#F5C56B'];
const UNITS = ['mg', 'mcg', 'ml', 'IU', 'g'];

export function AddMedicineScreen() {
  const { c, radius, f, fonts } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { addMedicine, medicines } = useStore();

  const prefill = route.params?.prefill;
  // Android is edge-to-edge, so the window no longer shrinks for the keyboard.
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState<string>(prefill?.name ?? '');
  const [dosage, setDosage] = useState<string>(prefill?.dosage ?? '');
  const [unit, setUnit] = useState<string>(prefill?.unit ?? 'mg');
  const [freq, setFreq] = useState<string>(prefill?.frequencyLabel ?? 'Once daily');
  const [times, setTimes] = useState<string[]>(prefill?.times ?? FREQUENCY_PRESETS['Once daily']);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  /** Index of the reminder time being edited, or null when the picker is closed. */
  const [editingTime, setEditingTime] = useState<number | null>(null);

  const generic = useMemo(() => resolveGeneric(name), [name]);
  const nameSuggestions = useMemo(
    () => (name.length >= 3 && !generic ? suggestGenerics(name, 4) : []),
    [name, generic],
  );

  /** Live preview: what this new medicine would clash with. */
  const wouldClash = useMemo(() => {
    if (!generic) return [];
    return medicines
      .map((m) => ({ m, rule: findInteraction(generic, m.generic) }))
      .filter((x): x is { m: typeof medicines[0]; rule: NonNullable<ReturnType<typeof findInteraction>> } => !!x.rule);
  }, [generic, medicines]);

  const canSave = name.trim().length >= 2 && dosage.trim().length > 0;

  const onSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addMedicine({
        name: name.trim(),
        generic: generic ?? name.trim().toLowerCase(),
        dosage: dosage.trim(),
        unit,
        times,
        startDate: toDateKey(new Date()),
        endDate: null,
        colorTag: color,
        notes: notes.trim() || null,
        active: true,
      });
      nav.goBack();
    } catch (e) {
      Alert.alert('Could not save', 'Something went wrong adding that medicine. Please try again.');
      setSaving(false);
    }
  };

  const inputStyle = {
    borderWidth: 1.5, borderColor: c.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body,
    fontSize: f.bodyLg, color: c.ink, backgroundColor: c.surface,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, marginBottom: keyboardHeight }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Add a medicine" onBack={() => nav.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Label>Medicine name</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          placeholderTextColor={c.inkGhost}
          style={inputStyle}
          accessibilityLabel="Medicine name"
          autoCapitalize="words"
        />
        {generic && generic !== name.trim().toLowerCase() ? (
          <Txt variant="tiny" color={c.sageDeep} style={{ marginTop: 6 }}>
            Recognised as {generic}
          </Txt>
        ) : null}
        {nameSuggestions.length > 0 ? (
          <Row gap={7} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {nameSuggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => setName(s.charAt(0).toUpperCase() + s.slice(1))}
                style={{
                  paddingHorizontal: 12, minHeight: 34, justifyContent: 'center',
                  borderRadius: 999, backgroundColor: c.surfaceLav,
                }}
              >
                <Txt variant="tiny" weight="bold" color={c.inkSoft}>{s}</Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}

        {wouldClash.length > 0 ? (
          <View
            style={{
              marginTop: 12, backgroundColor: c.coralSoft, borderWidth: 1,
              borderColor: c.coralBorder, borderRadius: radius.md, padding: 12,
            }}
          >
            <Row gap={8} align="flex-start">
              <Icon name="alert" size={15} color={c.coralDeep} />
              <View style={{ flex: 1 }}>
                <Txt variant="small" weight="black" color={c.coralDeep}>
                  Heads up before you add this
                </Txt>
                {wouldClash.slice(0, 2).map(({ m, rule }) => (
                  <Txt key={m.id} variant="tiny" color={c.coralDeep} style={{ marginTop: 3, lineHeight: 16 }}>
                    {rule.severity} with {m.name} — {rule.explanation}
                  </Txt>
                ))}
              </View>
            </Row>
          </View>
        ) : null}

        <Spacer h={14} />
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1.4 }}>
            <Label>Dose</Label>
            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder="500"
              placeholderTextColor={c.inkGhost}
              keyboardType="numeric"
              style={inputStyle}
              accessibilityLabel="Dose amount"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Unit</Label>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: unit === u }}
                  style={{
                    paddingHorizontal: 12, minHeight: 38, justifyContent: 'center',
                    borderRadius: 999, backgroundColor: unit === u ? c.ink : c.surfaceLav,
                  }}
                >
                  <Txt variant="tiny" weight="bold" color={unit === u ? c.white : c.inkSoft}>{u}</Txt>
                </Pressable>
              ))}
            </Row>
          </View>
        </Row>

        <Spacer h={14} />
        <Label>How often</Label>
        <Row gap={7} style={{ flexWrap: 'wrap' }}>
          {Object.keys(FREQUENCY_PRESETS).map((k) => (
            <Pressable
              key={k}
              onPress={() => { setFreq(k); setTimes(FREQUENCY_PRESETS[k]); }}
              accessibilityRole="button"
              accessibilityState={{ selected: freq === k }}
              style={{
                paddingHorizontal: 14, minHeight: 38, justifyContent: 'center',
                borderRadius: 999, backgroundColor: freq === k ? c.ink : c.surfaceLav,
              }}
            >
              <Txt variant="small" weight="bold" color={freq === k ? c.white : c.inkSoft}>{k}</Txt>
            </Pressable>
          ))}
        </Row>

        {times.length > 0 ? (
          <Row gap={8} style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {times.map((t, i) => (
              <Pressable
                key={`${t}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Change the ${formatTime(t)} reminder`}
                onPress={() => setEditingTime(i)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  backgroundColor: c.surfaceAlt, paddingHorizontal: 12,
                  minHeight: 42, borderRadius: radius.md,
                  borderWidth: 1.5, borderColor: c.borderStrong,
                }}
              >
                <Icon name="clock" size={13} color={c.violet} />
                <Txt variant="small" weight="bold">{formatTime(t)}</Txt>
                <Icon name="edit" size={11} color={c.inkFaint} />
              </Pressable>
            ))}
          </Row>
        ) : (
          <Txt variant="tiny" color={c.inkFaint} style={{ marginTop: 8 }}>
            No fixed times — you'll log this one when you take it.
          </Txt>
        )}

        <Spacer h={14} />
        <Label>Colour tag</Label>
        <Row gap={10}>
          {COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setColor(col)}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${col}`}
              hitSlop={8}
              style={{
                width: 30, height: 30, borderRadius: 15, backgroundColor: col,
                borderWidth: color === col ? 3 : 0, borderColor: c.bg,
                ...(color === col ? { shadowColor: col, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 4 } : {}),
              }}
            />
          ))}
        </Row>

        <Spacer h={14} />
        <Label>Notes (optional)</Label>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. take with food"
          placeholderTextColor={c.inkGhost}
          multiline
          style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]}
          accessibilityLabel="Notes"
        />

        <Spacer h={20} />
        <Button
          label={saving ? 'Saving…' : 'Add medicine'}
          onPress={onSave}
          full
          disabled={!canSave || saving}
        />
      </ScrollView>

      <TimePicker
        visible={editingTime !== null}
        initial={editingTime !== null ? times[editingTime] ?? '09:00' : '09:00'}
        onCancel={() => setEditingTime(null)}
        onConfirm={(t) => {
          setTimes((prev) => {
            const next = [...prev];
            if (editingTime !== null) next[editingTime] = t;
            // Keep reminders in chronological order so the day reads correctly.
            return next.sort((a, b) => a.localeCompare(b));
          });
          setEditingTime(null);
        }}
      />
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="tiny" weight="black" color={c.inkSoft} style={{ marginBottom: 6 }}>
      {children}
    </Txt>
  );
}
