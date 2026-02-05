/**
 * HeyClaw - Voice Companion App for OpenClaw
 * 
 * A hands-free voice assistant that works with your AI companion
 */

import React, { useEffect } from 'react';
import { StatusBar, Platform, PermissionsAndroid, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './src/navigation';
import { COLORS } from './src/constants';

// Request required permissions on Android
const requestPermissions = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ]);

    const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    
    if (audioGranted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        'Permission Required',
        'HeyClaw needs microphone access for voice commands. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Permission request error:', error);
  }
};

const App: React.FC = () => {
  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />
      <Navigation />
    </SafeAreaProvider>
  );
};

export default App;
