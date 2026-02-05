/**
 * HeyClaw Constants
 */

import { Platform } from 'react-native';
import type { AppSettings, PlatformFeatures, TTSProvider, STTProvider } from '../types';

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  gatewayUrl: '',
  gatewayToken: '',
  wakeWord: 'computer', // Star Trek style! Can be any word with Vosk
  autoPlayResponses: true,
  keepScreenOn: false,
  hapticFeedback: true,
  voiceActivationSensitivity: 0.5,
  // Vosk settings
  voskModelPath: '', // Will be set after model download
  voskLanguage: 'en-US', // Default to English, German available
  // STT settings - default: Vosk (offline)
  sttProvider: 'vosk' as STTProvider,
  customSTTUrl: '',
  // TTS settings - default: on-device (react-native-tts)
  ttsProvider: 'device' as TTSProvider,
  customTTSUrl: '',
  elevenLabsApiKey: '',
  elevenLabsVoiceId: '',
};

// Platform features
export const PLATFORM_FEATURES: PlatformFeatures = {
  supportsBackgroundWakeWord: Platform.OS === 'android',
  supportsScreenOffOperation: Platform.OS === 'android',
  supportsAutoStart: Platform.OS === 'android',
};

// STT Provider options
export const STT_PROVIDERS: { label: string; value: STTProvider; description: string }[] = [
  { label: '🎤 Vosk (Offline)', value: 'vosk', description: 'Fast, fully offline, no API keys' },
  { label: '📱 Device', value: 'device', description: 'Google/Apple cloud recognition' },
  { label: '🌐 Custom Whisper', value: 'custom', description: 'Self-hosted Whisper endpoint' },
];

// Suggested wake words (Vosk can detect any word, but these work well)
export const SUGGESTED_WAKE_WORDS: { label: string; value: string }[] = [
  { label: '🖖 Computer', value: 'computer' },   // Default - Star Trek
  { label: '🤖 Jarvis', value: 'jarvis' },       // Iron Man
  { label: '🎤 Hey Claw', value: 'hey claw' },   // HeyClaw brand
  { label: '👋 Hello', value: 'hello' },
  { label: '🇩🇪 Hallo', value: 'hallo' },       // German
  { label: '🗣️ Assistent', value: 'assistent' }, // German
];

// Vosk model info - user downloads separately
export const VOSK_MODELS = {
  // Small models (~50MB) - faster, less accurate
  'en-US-small': {
    name: 'vosk-model-small-en-us-0.15',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
    size: '40MB',
    language: 'English (US)',
  },
  'de-DE-small': {
    name: 'vosk-model-small-de-0.15',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip',
    size: '45MB',
    language: 'German',
  },
  // Large models (~1GB+) - slower, more accurate
  'en-US-large': {
    name: 'vosk-model-en-us-0.22',
    url: 'https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip',
    size: '1.8GB',
    language: 'English (US)',
  },
  'de-DE-large': {
    name: 'vosk-model-de-0.21',
    url: 'https://alphacephei.com/vosk/models/vosk-model-de-0.21.zip',
    size: '1.9GB',
    language: 'German',
  },
};

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
