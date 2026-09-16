import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, Button, TopBar, Badge } from '../components/ui';
import { Icon } from '../components/Icon';
import { needsConfirmation } from '../engines/prescriptionParser';
import { resolveGeneric } from '../data/drugSynonyms';
import { toDateKey } from '../engines/scheduleEngine';
import type { ParsedMedicine } from '../data/types';

const COLORS = ['#E85D8A', '#8B5FBF', '#F17C7C', '#8FD4B8', '#D4A574', '#F5C56B'];

export function ReviewExtractedScreen() {
  const { c, radius, f, fonts } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { addMedicines } = useStore();

  const sourceLabel: string = route.params?.sourceLabel ?? 'Prescription';
  const [items, setItems] = useState<ParsedMedicine[]>(route.params?.parsed ?? []);
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<ParsedMedicine>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const applySuggestion = (index: number, suggestion: string) => {
    update(index, {
      name: suggestion.charAt(0).toUpperCase() + suggestion.slice(1),
      generic: suggestion,
      confidence: 0.95,
      suggestions: [],
    });
  };

  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onConfirm = async () => {
    if (items.length === 0 || saving) return;
    setSaving(true);
    try {
      await addMedicines(
        items.map((it, i) => ({
          name: it.name,
          generic: it.generic ?? it.name.toLowerCase(),
          dosage: it.dosage,
          unit: it.unit,
          times: it.times,
          startDate: toDateKey(new Date()),
          endDate: null,
          colorTag: COLORS[i % COLORS.length],
          notes: null,
          active: true,
        })),
      );
      // Pop back to the tab stack and land on Medicines so the user sees what
      // was just added, rather than being left on a dead review screen.
      nav.navigate('Tabs', { screen: 'MedicinesTab' });
    } catch {
      Alert.alert('Could not save', 'Something went wrong adding those medicines.');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Review what we found" onBack={() => nav.goBack()} />
        <Txt variant="tiny" color={c.inkFaint}>Check everything before saving.</Txt>
        <Spacer h={12} />
        <Row gap={8} style={{ backgroundColor: c.surfaceLav, borderRadius: radius.md, padding: 11 }}>
          <Icon name="file" size={14} color={c.violet} />
          <Txt variant="tiny" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{sourceLabel}</Txt>
          <Txt variant="micro" color={c.inkFaint}>· {items.length} found · read offline</Txt>
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.length === 0 ? (
          <Txt variant="small" color={c.inkFaint} style={{ textAlign: 'center', paddingVertical: 40 }}>
            Nothing left to add.
          </Txt>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((item, i) => {
              const unsure = needsConfirmation(item);
              return (
                <View
                  key={`${item.rawText}-${i}`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: unsure ? c.amber : c.borderStrong,
                    backgroundColor: unsure ? c.amberSoft : c.surface,
                    borderRadius: radius.lg, padding: 13,
                  }}
                >
                  <Row justify="space-between">
                    <Badge
                      label={unsure ? 'Please check this' : 'Looks clear'}
                      tone={unsure ? 'moderate' : 'mild'}
                      icon={unsure ? 'alert' : 'check'}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                      onPress={() => remove(i)}
                      hitSlop={10}
                    >
                      <Icon name="close" size={15} color={c.inkFaint} />
                    </Pressable>
                  </Row>

                  <Spacer h={10} />

                  <TextInput
                    value={item.name}
                    onChangeText={(t) =>
                      update(i, { name: t, generic: resolveGeneric(t) })
                    }
                    accessibilityLabel="Medicine name"
                    style={{
                      borderWidth: 1.5, borderColor: unsure ? c.amber : c.borderStrong,
                      backgroundColor: unsure ? c.surface : c.surfaceAlt,
                      borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 9,
                      fontFamily: fonts.bodyBold, fontSize: f.body, color: c.ink,
                    }}
                  />

                  <Row gap={8} style={{ marginTop: 8 }}>
                    <TextInput
                      value={item.dosage}
                      onChangeText={(t) => update(i, { dosage: t })}
                      keyboardType="numeric"
                      accessibilityLabel="Dose"
                      style={{
                        flex: 1, borderWidth: 1.5, borderColor: c.borderStrong,
                        borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 9,
                        fontFamily: fonts.body, fontSize: f.body, color: c.ink,
                        backgroundColor: c.surface,
                      }}
                    />
                    <View
                      style={{
                        flex: 0.8, borderWidth: 1.5, borderColor: c.borderStrong,
                        borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 10,
                        backgroundColor: c.surface, justifyContent: 'center',
                      }}
                    >
                      <Txt variant="body">{item.unit}</Txt>
                    </View>
                    <View
                      style={{
                        flex: 1.6, borderWidth: 1.5, borderColor: c.borderStrong,
                        borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 10,
                        backgroundColor: c.surface, justifyContent: 'center',
                      }}
                    >
                      <Txt variant="body" numberOfLines={1}>{item.frequencyLabel}</Txt>
                    </View>
                  </Row>

                  {item.suggestions.length > 0 ? (
                    <>
                      <Txt variant="tiny" weight="bold" color={c.goldDeep} style={{ marginTop: 10 }}>
                        Hard to read — did you mean:
                      </Txt>
                      <Row gap={6} style={{ marginTop: 7, flexWrap: 'wrap' }}>
                        {item.suggestions.map((s) => (
                          <Pressable
                            key={s}
                            accessibilityRole="button"
                            accessibilityLabel={`Use ${s}`}
                            onPress={() => applySuggestion(i, s)}
                            style={{
                              paddingHorizontal: 12, minHeight: 34, justifyContent: 'center',
                              borderRadius: 999, backgroundColor: c.ink,
                            }}
                          >
                            <Txt variant="tiny" weight="bold" color={c.white}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Txt>
                          </Pressable>
                        ))}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Type it myself"
                          onPress={() => update(i, { suggestions: [] })}
                          style={{
                            paddingHorizontal: 12, minHeight: 34, justifyContent: 'center',
                            borderRadius: 999, backgroundColor: c.surfaceLav,
                          }}
                        >
                          <Txt variant="tiny" weight="bold" color={c.inkSoft}>Type it</Txt>
                        </Pressable>
                      </Row>
                    </>
                  ) : null}

                  <Txt variant="micro" color={c.inkGhost} style={{ marginTop: 9 }} numberOfLines={1}>
                    Read as: {item.rawText}
                  </Txt>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.border }}>
        <Button
          label={saving ? 'Saving…' : `Looks good, add ${items.length}`}
          onPress={onConfirm}
          full
          disabled={items.length === 0 || saving}
        />
      </View>
    </View>
  );
}
