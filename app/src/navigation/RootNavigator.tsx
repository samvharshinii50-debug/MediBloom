import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from '../components/Icon';
import { Txt } from '../components/ui';

import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesScreen } from '../screens/MedicinesScreen';
import { AssistantScreen } from '../screens/AssistantScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { AddMedicineScreen } from '../screens/AddMedicineScreen';
import { UploadPrescriptionScreen } from '../screens/UploadPrescriptionScreen';
import { ReviewExtractedScreen } from '../screens/ReviewExtractedScreen';
import { InteractionsScreen } from '../screens/InteractionsScreen';
import { WellnessScreen } from '../screens/WellnessScreen';
import { AdherenceScreen } from '../screens/AdherenceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SafetyEthicsScreen } from '../screens/SafetyEthicsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, IconName> = {
  HomeTab: 'home',
  MedicinesTab: 'pill',
  AssistantTab: 'chat',
  MoreTab: 'dots',
};

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  MedicinesTab: 'Medicines',
  AssistantTab: 'Assistant',
  MoreTab: 'More',
};

function Tabs() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          // Sit above the gesture bar rather than under it.
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarIcon: ({ focused }) => (
          <Icon
            name={TAB_ICONS[route.name] ?? 'home'}
            size={21}
            color={focused ? c.rose : c.inkFaint}
          />
        ),
        tabBarLabel: ({ focused }) => (
          <Txt
            variant="micro"
            weight={focused ? 'black' : 'bold'}
            color={focused ? c.rose : c.inkFaint}
          >
            {TAB_LABELS[route.name] ?? route.name}
          </Txt>
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MedicinesTab" component={MedicinesScreen} options={{ title: 'Medicines' }} />
      <Tab.Screen name="AssistantTab" component={AssistantScreen} options={{ title: 'Assistant' }} />
      <Tab.Screen name="MoreTab" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { c, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: c.bg,
      card: c.surface,
      text: c.ink,
      border: c.border,
      primary: c.rose,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
        <Stack.Screen name="UploadPrescription" component={UploadPrescriptionScreen} />
        <Stack.Screen name="ReviewExtracted" component={ReviewExtractedScreen} />
        <Stack.Screen name="Interactions" component={InteractionsScreen} />
        <Stack.Screen name="Wellness" component={WellnessScreen} />
        <Stack.Screen name="Adherence" component={AdherenceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SafetyEthics" component={SafetyEthicsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
