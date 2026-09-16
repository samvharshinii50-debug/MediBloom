import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/AppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Card, Row, Spacer, Badge, IconCircle, Chip, EmptyState, Button } from '../components/ui';
import { Icon } from '../components/Icon';
import { countFor, worstFor } from '../engines/interactionEngine';
import { formatTime } from '../services/notifications';

export function MedicinesScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const { medicines, interactions, removeMedicine } = useStore();
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const shown = medicines.filter((m) => (tab === 'active' ? m.active : !m.active));

  const confirmRemove = (id: string, name: string) => {
    Alert.alert(
      `Remove ${name}?`,
      'This deletes it and its reminder. Your dose history for it is removed too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void removeMedicine(id) },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Txt variant="h1" serif>Your Medicines</Txt>
        <Txt variant="small" color={c.inkSoft}>
          {medicines.length} active · checked automatically
        </Txt>
        <Spacer h={12} />
        <Row gap={8}>
          <Chip label={`Active (${medicines.filter((m) => m.active).length})`} selected={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label="Past" selected={tab === 'past'} onPress={() => setTab('past')} />
        </Row>
      </View>

      <ScrollView
        // Clears the floating Upload + Add buttons that sit over this list.
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {shown.length === 0 ? (
          <Card>
            <EmptyState
              icon="pill"
              title={tab === 'active' ? 'No medicines yet' : 'Nothing here'}
              body={
                tab === 'active'
                  ? 'Add one by hand, or upload a prescription and let MediBloom read it for you.'
                  : 'Medicines you stop taking will show up here.'
              }
            />
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {shown.map((m) => {
              const n = countFor(m.id, interactions);
              const worst = worstFor(m.id, interactions);
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}, ${m.dosage} ${m.unit}${n > 0 ? `, ${n} interactions to review` : ''}`}
                  onLongPress={() => confirmRemove(m.id, m.name)}
                  style={{
                    backgroundColor: c.surface, borderRadius: radius.lg,
                    borderWidth: 1, borderColor: c.border, padding: 14,
                  }}
                >
                  <Row justify="space-between" align="flex-start">
                    <IconCircle name="pill" tone="rose" />
                    {n > 0 ? (
                      <Badge
                        label={`${n} to review`}
                        tone={worst === 'severe' ? 'severe' : worst === 'moderate' ? 'moderate' : 'mild'}
                        icon="alert"
                      />
                    ) : (
                      <Badge label="Active" tone="neutral" />
                    )}
                  </Row>
                  <Spacer h={10} />
                  <Txt variant="title" weight="black">{m.name}</Txt>
                  <Txt variant="small" color={c.inkSoft}>
                    {m.dosage} {m.unit} · {m.times.length === 0 ? 'as needed' : m.times.map(formatTime).join(', ')}
                  </Txt>
                  {m.notes ? (
                    <Txt variant="tiny" color={c.inkFaint} style={{ marginTop: 4 }}>{m.notes}</Txt>
                  ) : null}
                </Pressable>
              );
            })}
            <Txt variant="micro" color={c.inkGhost} style={{ textAlign: 'center', marginTop: 6 }}>
              Long-press a medicine to remove it
            </Txt>
          </View>
        )}
      </ScrollView>

      {/* actions */}
      <View style={{ position: 'absolute', right: 20, bottom: 24, alignItems: 'flex-end', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload a prescription"
          onPress={() => nav.navigate('UploadPrescription')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.violet,
            paddingHorizontal: 16, minHeight: 44, borderRadius: 999,
          }}
        >
          <Icon name="upload" size={15} color={c.violet} />
          <Txt variant="small" weight="black" color={c.violet}>Upload prescription</Txt>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a medicine"
          onPress={() => nav.navigate('AddMedicine')}
          style={{
            width: 56, height: 56, borderRadius: 28, backgroundColor: c.rose,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={24} color={c.white} />
        </Pressable>
      </View>
    </View>
  );
}
