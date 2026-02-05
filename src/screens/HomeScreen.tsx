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
  Alert,
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
import type { ChatEventPayload } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { 
    settings,
    connectionState,
    setConnectionState,
    setListeningState,
    addMessage,
    listeningState,
    setError,
  } = useAppStore();

  // Initialize services on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Connect WebSocket if we have settings
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

  // Reconnect when settings change
  useEffect(() => {
    if (settings.gatewayUrl && settings.gatewayToken) {
      webSocketService.disconnect();
      setConnectionState('connecting');
      webSocketService.connect(settings.gatewayUrl, settings.gatewayToken);
    }
  }, [settings.gatewayUrl, settings.gatewayToken]);

  // WebSocket status handler
  useEffect(() => {
    const unsubscribe = webSocketService.onStatus((connected) => {
      setConnectionState(connected ? 'connected' : 'disconnected');
      
      // Start wake word detection when connected
      if (connected) {
        startWakeWordDetection();
      }
    });

    return unsubscribe;
  }, [settings.wakeWord]);

  // WebSocket error handler
  useEffect(() => {
    const unsubscribe = webSocketService.onError((error) => {
      console.error('[Home] WebSocket error:', error);
      setError(error);
      // Show alert for connection errors
      if (error.includes('Authentication') || error.includes('connect')) {
        Alert.alert('Connection Error', error);
      }
    });

    return unsubscribe;
  }, [setError]);

  // WebSocket chat handler (responses from assistant)
  useEffect(() => {
    const unsubscribe = webSocketService.onChat((payload: ChatEventPayload) => {
      console.log('[Home] Chat received:', payload);
      
      if (payload.text && payload.role === 'assistant') {
        // Add assistant response to conversation
        addMessage({
          id: `msg-${Date.now()}`,
          type: 'assistant',
          content: payload.text,
          timestamp: payload.timestamp || Date.now(),
        });

        // Auto-play TTS if enabled and we have media
        if (settings.autoPlayResponses && payload.media) {
          const audioMedia = payload.media.find(m => m.type.startsWith('audio'));
          if (audioMedia && (audioMedia.url || audioMedia.base64)) {
            audioService.queueAudio(audioMedia.url || audioMedia.base64!);
          }
        }
      }
    });

    return unsubscribe;
  }, [settings.autoPlayResponses, addMessage]);

  // Start wake word detection
  const startWakeWordDetection = async () => {
    try {
      // Use Picovoice access key if provided, otherwise built-in works for basic keywords
      const accessKey = settings.picovoiceAccessKey || '';
      
      if (!accessKey) {
        // For now, just set state - wake word requires key
        console.log('[Home] No Picovoice key - wake word disabled');
        setListeningState('idle');
        return;
      }

      await wakeWordService.initialize(accessKey, settings.wakeWord);
      await wakeWordService.startListening();
      setListeningState('wake_word');
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      setListeningState('idle');
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
      // TODO: Play activation sound
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
      handleRecordingComplete(audioBase64, durationMs);
    });

    return unsubscribe;
  }, []);

  // Handle recording complete - transcribe and send
  const handleRecordingComplete = async (audioBase64: string, durationMs: number) => {
    setListeningState('processing');
    
    try {
      // TODO: Use speech-to-text to transcribe audio
      // For now, we'll need to implement STT integration
      // Options: 
      // 1. React Native Voice (uses native STT)
      // 2. Whisper API via OpenClaw
      // 3. On-device Whisper
      
      // Placeholder - in real impl this would be transcribed text
      const transcribedText = '[Voice transcription pending - implement STT]';
      
      // Add user message to conversation
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'user',
        content: transcribedText,
        timestamp: Date.now(),
      });

      // Send to OpenClaw via chat.send
      if (webSocketService.getIsConnected()) {
        await webSocketService.sendChatMessage(transcribedText);
      } else {
        Alert.alert('Not Connected', 'Please check your gateway settings');
      }
    } catch (error) {
      console.error('Failed to process recording:', error);
      setError('Failed to process voice message');
    } finally {
      // Resume wake word listening
      setListeningState('wake_word');
    }
  };

  // Manual button press - toggle recording or send test message
  const handleButtonPress = useCallback(async () => {
    if (!webSocketService.getIsConnected()) {
      Alert.alert(
        'Not Connected',
        'Please configure your gateway connection in Settings',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => navigation.navigate('Settings') },
        ]
      );
      return;
    }

    if (listeningState === 'recording') {
      await audioService.stopRecording();
    } else {
      // Start recording manually (simulates wake word)
      handleWakeWordDetected();
    }
  }, [listeningState, handleWakeWordDetected, navigation]);

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

  // Get status text
  const getStatusText = (): string => {
    if (connectionState === 'disconnected') {
      return 'Tap ⚙️ to configure';
    }
    if (connectionState === 'connecting') {
      return 'Connecting...';
    }
    if (listeningState === 'recording') {
      return 'Listening... tap to stop';
    }
    if (listeningState === 'processing') {
      return 'Processing...';
    }
    return `Say "${settings.wakeWord}" or tap`;
  };

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
      
      {/* Hint text */}
      <Text style={styles.hintText}>{getStatusText()}</Text>

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
  hintText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 8,
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
