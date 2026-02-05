/**
 * HeyClaw Type Definitions
 */

// Connection states for WebSocket
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Listening states for the app
export type ListeningState = 'idle' | 'wake_word' | 'recording' | 'processing';

// Message types from/to OpenClaw Gateway
export interface GatewayMessage {
  type: 'text' | 'audio' | 'status' | 'error';
  content?: string;
  audioUrl?: string;
  audioBase64?: string;
  timestamp: number;
}

export interface OutgoingMessage {
  type: 'audio' | 'text';
  content?: string;
  audioBase64?: string;
  timestamp: number;
}

// App settings
export interface AppSettings {
  gatewayUrl: string;
  gatewayToken: string;
  wakeWord: WakeWordOption;
  autoPlayResponses: boolean;
  keepScreenOn: boolean;
  hapticFeedback: boolean;
  voiceActivationSensitivity: number; // 0.0 - 1.0
}

// Wake word options (Porcupine built-in keywords)
export type WakeWordOption = 
  | 'porcupine'
  | 'bumblebee' 
  | 'alexa'
  | 'hey google'
  | 'hey siri'
  | 'ok google'
  | 'jarvis'
  | 'picovoice'
  | 'computer'
  | 'terminator'
  | 'americano'
  | 'blueberry'
  | 'grapefruit'
  | 'grasshopper';

// Conversation history item
export interface ConversationItem {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
  isPlaying?: boolean;
}

// Store state
export interface AppState {
  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  
  // Listening
  listeningState: ListeningState;
  setListeningState: (state: ListeningState) => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Conversation
  conversation: ConversationItem[];
  addMessage: (item: ConversationItem) => void;
  clearConversation: () => void;
  
  // Audio playback queue
  audioQueue: string[];
  addToAudioQueue: (url: string) => void;
  removeFromAudioQueue: () => string | undefined;
  
  // Errors
  lastError: string | null;
  setError: (error: string | null) => void;
}

// Platform-specific features
export interface PlatformFeatures {
  supportsBackgroundWakeWord: boolean;
  supportsScreenOffOperation: boolean;
  supportsAutoStart: boolean;
}
