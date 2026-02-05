/**
 * Home Screen
 * Main screen with listening button and conversation
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { StatusIndicator, ListeningButton, ConversationList } from '../components';
import { useAppStore } from '../store';
import { 
  webSocketService, 
  wakeWordService, 
  audioService, 
  backgroundService 
} from '../services';
import { COLORS, PLATFORM_FEATURES } from '../constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { 
    settings,
    setConnectionState,
    setListeningState,
    addMessage,
    listeningState,
  } = useAppStore();

  // Initialize services on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Connect WebSocket
        if (settings.gatewayUrl && settings.gatewayToken) {
          setConnectionState('connecting');
          webSocketService.connect(settings.gatewayUrl, settings.gatewayToken);
        }

        // Start background service on Android
        if (PLATFORM_FEATURES.supportsBackgroundWakeWord) {
          await backgroundService.start();
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
      wakeWordService.cleanup();
      backgroundService.stop();
    };
  }, []);

  // WebSocket status handler
  useEffect(() => {
    const unsubscribe = webSocketService.onStatus((connected) => {
      setConnectionState(connected ? 'connected' : 'disconnected');
      
      // Start wake word detection when connected
      if (connected && settings.gatewayToken) {
        startWakeWordDetection();
      }
    });

    return unsubscribe;
  }, [settings.gatewayToken]);

  // WebSocket message handler
  useEffect(() => {
    const unsubscribe = webSocketService.onMessage((message) => {
      if (message.type === 'audio' || message.type === 'text') {
        // Add to conversation
        addMessage({
          id: `msg-${Date.now()}`,
          type: 'assistant',
          content: message.content || '[Audio message]',
          audioUrl: message.audioUrl || message.audioBase64,
          timestamp: message.timestamp,
        });

        // Auto-play if enabled
        if (settings.autoPlayResponses && (message.audioUrl || message.audioBase64)) {
          audioService.queueAudio(message.audioUrl || message.audioBase64!);
        }
      }
    });

    return unsubscribe;
  }, [settings.autoPlayResponses, addMessage]);

  // Start wake word detection
  const startWakeWordDetection = async () => {
    try {
      // TODO: Need Picovoice access key in settings
      // await wakeWordService.initialize(settings.picovoiceAccessKey, settings.wakeWord);
      // await wakeWordService.startListening();
      setListeningState('wake_word');
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
    }
  };

  // Wake word detected handler
  useEffect(() => {
    const unsubscribe = wakeWordService.onDetection(() => {
      handleWakeWordDetected();
    });

    return unsubscribe;
  }, []);

  // Handle wake word detection
  const handleWakeWordDetected = useCallback(async () => {
    console.log('Wake word detected!');
    setListeningState('recording');
    
    try {
      await audioService.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setListeningState('wake_word');
    }
  }, [setListeningState]);

  // Recording complete handler
  useEffect(() => {
    const unsubscribe = audioService.onRecordingComplete((audioBase64, durationMs) => {
      console.log('Recording complete:', durationMs, 'ms');
      
      // Add user message to conversation
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'user',
        content: '[Voice message]',
        timestamp: Date.now(),
      });

      // Send to gateway
      setListeningState('processing');
      webSocketService.sendAudio(audioBase64);

      // Resume wake word listening after processing
      setTimeout(() => {
        setListeningState('wake_word');
      }, 1000);
    });

    return unsubscribe;
  }, [addMessage, setListeningState]);

  // Manual button press - toggle recording
  const handleButtonPress = useCallback(async () => {
    if (listeningState === 'recording') {
      await audioService.stopRecording();
    } else if (listeningState === 'wake_word' || listeningState === 'idle') {
      handleWakeWordDetected();
    }
  }, [listeningState, handleWakeWordDetected]);

  // Long press - cancel recording
  const handleButtonLongPress = useCallback(async () => {
    if (listeningState === 'recording') {
      await audioService.cancelRecording();
      setListeningState('wake_word');
    }
  }, [listeningState, setListeningState]);

  // Play audio from conversation
  const handlePlayAudio = useCallback((audioUrl: string) => {
    audioService.playAudio(audioUrl);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>HeyClaw</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <StatusIndicator />

      {/* Conversation */}
      <View style={styles.conversationContainer}>
        <ConversationList onPlayAudio={handlePlayAudio} />
      </View>

      {/* Listening Button */}
      <View style={styles.buttonContainer}>
        <ListeningButton
          onPress={handleButtonPress}
          onLongPress={handleButtonLongPress}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  conversationContainer: {
    flex: 1,
    marginTop: 16,
  },
  buttonContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});
