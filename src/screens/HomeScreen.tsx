/**
 * Home Screen
 * Main screen with listening button and conversation
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  StatusBar,
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
  backgroundService,
  sttService,
  ttsService,
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
    updateMessage,
    listeningState,
    setError,
  } = useAppStore();

  // Initialize services on mount
  // Track streaming message for delta updates
  const streamingMessageRef = useRef<{ runId: string; messageId: string } | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Connect WebSocket if we have settings
        if (settings.gatewayUrl && settings.gatewayToken) {
          setConnectionState('connecting');
          webSocketService.connect(settings.gatewayUrl, settings.gatewayToken);
        }

        // Configure STT service (Vosk needs model path)
        sttService.configure({
          provider: settings.sttProvider,
          customSTTUrl: settings.customSTTUrl,
          voskModelPath: settings.voskModelPath,
        });

        // Configure TTS service
        ttsService.configure({
          provider: settings.ttsProvider,
          customTTSUrl: settings.customTTSUrl,
          elevenLabsApiKey: settings.elevenLabsApiKey,
          elevenLabsVoiceId: settings.elevenLabsVoiceId,
        });

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
      sttService.destroy();
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

  // Reconfigure STT when settings change
  useEffect(() => {
    sttService.configure({
      provider: settings.sttProvider,
      customSTTUrl: settings.customSTTUrl,
      voskModelPath: settings.voskModelPath,
    });
  }, [settings.sttProvider, settings.customSTTUrl, settings.voskModelPath]);

  // Reconfigure TTS when settings change
  useEffect(() => {
    ttsService.configure({
      provider: settings.ttsProvider,
      customTTSUrl: settings.customTTSUrl,
      elevenLabsApiKey: settings.elevenLabsApiKey,
      elevenLabsVoiceId: settings.elevenLabsVoiceId,
    });
  }, [settings.ttsProvider, settings.customTTSUrl, settings.elevenLabsApiKey, settings.elevenLabsVoiceId]);

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
  }, [settings.wakeWord, settings.voskModelPath]);

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
    const unsubscribe = webSocketService.onChat((payload: any) => {
      console.log("[Home] Chat received:", payload.state, payload.runId);
      
      // Extract text from gateway format: payload.message.content[0].text
      let text = "";
      let role = "";
      let timestamp = Date.now();
      
      if (payload.message) {
        role = payload.message.role || "";
        timestamp = payload.message.timestamp || Date.now();
        if (payload.message.content && Array.isArray(payload.message.content)) {
          const textContent = payload.message.content.find((c: any) => c.type === "text");
          if (textContent) {
            text = textContent.text || "";
          }
        }
      } else if (payload.text) {
        text = payload.text;
        role = payload.role || "";
        timestamp = payload.timestamp || Date.now();
      }
      
      if (!text || role !== "assistant") return;
      
      const runId = payload.runId || "unknown";
      const state = payload.state || "final";
      
      if (state === "delta") {
        // Streaming update
        if (streamingMessageRef.current?.runId === runId) {
          updateMessage(streamingMessageRef.current.messageId, text);
        } else {
          const messageId = `msg-${Date.now()}`;
          streamingMessageRef.current = { runId, messageId };
          addMessage({
            id: messageId,
            type: "assistant",
            content: text,
            timestamp,
          });
        }
      } else if (state === "final") {
        if (streamingMessageRef.current?.runId === runId) {
          updateMessage(streamingMessageRef.current.messageId, text);
          streamingMessageRef.current = null;
        } else {
          addMessage({
            id: `msg-${Date.now()}`,
            type: "assistant",
            content: text,
            timestamp,
          });
        }
        
        // Auto-play TTS only on final
        if (settings.autoPlayResponses && text) {
          const audioContent = payload.message?.content?.find((c: any) => c.type === "audio");
          if (audioContent && (audioContent.url || audioContent.base64)) {
            audioService.queueAudio(audioContent.url || audioContent.base64);
          } else {
            ttsService.speak(text).catch(err => {
              console.error("[Home] TTS failed:", err);
            });
          }
        }
      }
    });

    return unsubscribe;
  }, [settings.autoPlayResponses, addMessage, updateMessage]);


  // Start wake word detection using Vosk
  const startWakeWordDetection = useCallback(async () => {
    try {
      if (!settings.voskModelPath) {
        console.log('[Home] No Vosk model path - wake word disabled');
        console.log('[Home] Please download a model from alphacephei.com/vosk/models');
        setListeningState('idle');
        return;
      }

      // Initialize Vosk wake word service
      await wakeWordService.initialize({
        wakeWord: settings.wakeWord,
        modelPath: settings.voskModelPath,
      });
      
      await wakeWordService.startListening();
      setListeningState('wake_word');
      console.log('[Home] Wake word detection started:', settings.wakeWord);
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      setListeningState('idle');
      setError('Failed to initialize Vosk. Check model path.');
    }
  }, [settings.wakeWord, settings.voskModelPath, setListeningState, setError]);

  // Wake word detected handler
  useEffect(() => {
    const unsubscribe = wakeWordService.onDetection(() => {
      handleWakeWordDetected();
    });

    return unsubscribe;
  }, []);

  // Handle wake word detection
  const handleWakeWordDetected = useCallback(async () => {
    console.log('[Home] Wake word detected!');
    setListeningState('recording');
    
    try {
      // Stop wake word detection while recording
      await wakeWordService.stopListening();
      
      // TODO: Play activation sound
      
      // Start full STT based on provider
      if (settings.sttProvider === 'custom') {
        // For custom STT, record audio and send to endpoint
        await audioService.startRecording();
      } else {
        // For Vosk or device STT, start listening directly (streaming recognition)
        await sttService.startListening();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setListeningState('wake_word');
      // Resume wake word detection
      wakeWordService.startListening();
    }
  }, [setListeningState, settings.sttProvider]);

  // Recording complete handler (for custom STT mode)
  useEffect(() => {
    const unsubscribe = audioService.onRecordingComplete((audioBase64, durationMs) => {
      console.log('Recording complete:', durationMs, 'ms');
      handleRecordingComplete(audioBase64, durationMs);
    });

    return unsubscribe;
  }, []);

  // STT transcription handler
  useEffect(() => {
    const unsubscribe = sttService.onTranscription((text, isFinal) => {
      console.log('[Home] STT result:', text, 'final:', isFinal);
      
      if (isFinal && text.trim()) {
        handleTranscriptionComplete(text);
      }
    });

    return unsubscribe;
  }, []);

  // Handle recording complete - transcribe via custom STT endpoint
  const handleRecordingComplete = async (audioBase64: string, durationMs: number) => {
    setListeningState('processing');
    
    try {
      // Use custom STT to transcribe audio
      const transcribedText = await sttService.transcribeAudio(audioBase64);
      
      if (!transcribedText.trim()) {
        console.log('[Home] Empty transcription, ignoring');
        resumeWakeWordDetection();
        return;
      }
      
      // Process the transcription
      await handleTranscriptionComplete(transcribedText);
    } catch (error) {
      console.error('Failed to process recording:', error);
      setError('Failed to transcribe voice message');
      resumeWakeWordDetection();
    }
  };

  // Handle completed transcription (from either Vosk, device, or custom STT)
  const handleTranscriptionComplete = async (text: string) => {
    setListeningState('processing');
    
    try {
      // Add user message to conversation
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'user',
        content: text,
        timestamp: Date.now(),
      });

      // Send to OpenClaw via chat.send
      if (webSocketService.getIsConnected()) {
        await webSocketService.sendChatMessage(text);
      } else {
        Alert.alert('Not Connected', 'Please check your gateway settings');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send voice message');
    } finally {
      // Resume wake word listening
      resumeWakeWordDetection();
    }
  };

  // Resume wake word detection after recording
  const resumeWakeWordDetection = useCallback(async () => {
    setListeningState('wake_word');
    try {
      if (wakeWordService.getIsInitialized()) {
        await wakeWordService.startListening();
      }
    } catch (error) {
      console.error('[Home] Failed to resume wake word:', error);
    }
  }, [setListeningState]);

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
      // Stop recording/listening
      if (settings.sttProvider === 'custom') {
        await audioService.stopRecording();
      } else {
        await sttService.stopListening();
      }
    } else {
      // Start recording manually (simulates wake word)
      handleWakeWordDetected();
    }
  }, [listeningState, handleWakeWordDetected, navigation, settings.sttProvider]);

  // Long press - cancel recording
  const handleButtonLongPress = useCallback(async () => {
    if (listeningState === 'recording') {
      if (settings.sttProvider === 'custom') {
        await audioService.cancelRecording();
      } else {
        await sttService.cancel();
      }
      resumeWakeWordDetection();
    }
  }, [listeningState, settings.sttProvider, resumeWakeWordDetection]);

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
    if (!settings.voskModelPath) {
      return '⚠️ Download Vosk model in Settings';
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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 12,
    paddingBottom: 12,
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
