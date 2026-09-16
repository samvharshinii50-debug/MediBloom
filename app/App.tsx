import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AppStoreProvider, useStore } from './src/state/AppStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationBridge } from './src/NotificationBridge';
import { initNotifications, ensurePermission } from './src/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — harmless */
});

/** Reads theme prefs out of the store and feeds them to ThemeProvider. */
function Themed() {
  const { settings, ready } = useStore();

  /*
   * Hide the splash the moment the store is ready.
   *
   * This used to live in an onLayout callback, which raced: if the first
   * layout happened before SQLite finished opening, `ready` was still false,
   * the callback did nothing, and onLayout never fired again — leaving the
   * splash up forever over a perfectly healthy app. An effect keyed on `ready`
   * cannot miss it.
   */
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  /*
   * Belt and braces: whatever happens to the store, nobody is left staring at
   * a splash screen. Five seconds is far longer than a cold start needs.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider themePreference={settings.theme} largerText={settings.largerText}>
      <ThemedSurface />
    </ThemeProvider>
  );
}

/**
 * Applies the top safe-area inset once for the whole app. Screens render
 * without headers, so without this the first row sits under the status bar.
 * The bottom inset is left to the tab bar, which pads itself.
 */
function ThemedSurface() {
  const { c, isDark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NotificationBridge />
        <RootNavigator />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const [notifReady, setNotifReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initNotifications();
      await ensurePermission();
      setNotifReady(true);
    })().catch(() => setNotifReady(true));
  }, []);

  // A font that fails to load must not block the app — fall through to system
  // fonts rather than showing a blank screen forever.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#FDF8F6' }} />;
  }

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Themed />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
