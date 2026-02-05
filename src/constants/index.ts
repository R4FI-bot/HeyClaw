/**
 * HeyClaw Constants
 */

import { Platform } from 'react-native';
import type { AppSettings, PlatformFeatures, WakeWordOption } from '../types';

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  gatewayUrl: 'ws://localhost:18789',
  gatewayToken: '',
  wakeWord: 'porcupine' as WakeWordOption,
  autoPlayResponses: true,
  keepScreenOn: false,
  hapticFeedback: true,
  voiceActivationSensitivity: 0.5,
};

// Platform features
export const PLATFORM_FEATURES: PlatformFeatures = {
  supportsBackgroundWakeWord: Platform.OS === 'android',
  supportsScreenOffOperation: Platform.OS === 'android',
  supportsAutoStart: Platform.OS === 'android',
};

// Available wake words (Porcupine built-in)
export const AVAILABLE_WAKE_WORDS: { label: string; value: WakeWordOption }[] = [
  { label: 'Porcupine', value: 'porcupine' },
  { label: 'Bumblebee', value: 'bumblebee' },
  { label: 'Jarvis', value: 'jarvis' },
  { label: 'Computer', value: 'computer' },
  { label: 'Picovoice', value: 'picovoice' },
  { label: 'Alexa', value: 'alexa' },
  { label: 'Hey Google', value: 'hey google' },
  { label: 'Hey Siri', value: 'hey siri' },
  { label: 'OK Google', value: 'ok google' },
  { label: 'Terminator', value: 'terminator' },
  { label: 'Americano', value: 'americano' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Grapefruit', value: 'grapefruit' },
  { label: 'Grasshopper', value: 'grasshopper' },
];

// Audio settings
export const AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6, // VOICE_RECOGNITION on Android
};

// WebSocket reconnection settings
export const WS_CONFIG = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  pingInterval: 30000,
};

// Recording settings
export const RECORDING_CONFIG = {
  maxDuration: 60000, // 60 seconds max
  silenceThreshold: 1500, // 1.5 seconds of silence to stop
  minDuration: 500, // minimum 0.5 seconds
};

// Storage keys
export const STORAGE_KEYS = {
  settings: '@heyclaw/settings',
  conversation: '@heyclaw/conversation',
  onboardingComplete: '@heyclaw/onboarding_complete',
};

// Notification channel (Android)
export const NOTIFICATION_CONFIG = {
  channelId: 'heyclaw-foreground',
  channelName: 'HeyClaw Background Service',
  channelDescription: 'Keeps HeyClaw listening for wake words',
};

// Colors
export const COLORS = {
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  secondary: '#10b981', // Emerald
  background: '#0f172a', // Slate 900
  surface: '#1e293b', // Slate 800
  surfaceLight: '#334155', // Slate 700
  text: '#f8fafc', // Slate 50
  textSecondary: '#94a3b8', // Slate 400
  error: '#ef4444', // Red
  warning: '#f59e0b', // Amber
  success: '#22c55e', // Green
  recording: '#ef4444', // Red for recording indicator
  listening: '#6366f1', // Indigo for wake word listening
  processing: '#f59e0b', // Amber for processing
};
