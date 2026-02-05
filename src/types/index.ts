/**
 * HeyClaw Type Definitions
 */

// Connection states for WebSocket
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Listening states for the app
export type ListeningState = 'idle' | 'wake_word' | 'recording' | 'processing';

// ============================================================================
// OpenClaw Protocol Types
// ============================================================================

// Base request/response types
export interface OpenClawRequest {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface OpenClawResponse {
  type: 'res';
  id: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface OpenClawEvent {
  type: 'event';
  event: string;
  payload: Record<string, unknown>;
}

export type OpenClawMessage = OpenClawRequest | OpenClawResponse | OpenClawEvent;

// Connect request params
export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  auth: {
    token: string;
  };
  client: {
    id: string;
    displayName: string;
    version: string;
    platform: string;
    mode: string;
  };
}

// Chat send params
export interface ChatSendParams {
  sessionKey: string;
  message: string;
  idempotencyKey: string;
}

// Chat event payload
export interface ChatEventPayload {
  text?: string;
  sessionKey?: string;
  role?: 'user' | 'assistant';
  timestamp?: number;
  media?: Array<{
    type: string;
    url?: string;
    base64?: string;
  }>;
}

// ============================================================================
// Legacy types (for internal use)
// ============================================================================

// Message types from/to OpenClaw Gateway
export interface GatewayMessage {
  type: 'text' | 'audio' | 'status' | 'error' | 'chat';
  content?: string;
  text?: string;
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

// TTS Provider options
export type TTSProvider = 'device' | 'custom' | 'elevenlabs';

// App settings
export interface AppSettings {
  gatewayUrl: string;
  gatewayToken: string;
  wakeWord: WakeWordOption;
  autoPlayResponses: boolean;
  keepScreenOn: boolean;
  hapticFeedback: boolean;
  voiceActivationSensitivity: number; // 0.0 - 1.0
  // Advanced settings
  picovoiceAccessKey: string;
  // STT settings
  useCustomSTT: boolean;
  customSTTUrl: string;
  // TTS settings
  ttsProvider: TTSProvider;
  customTTSUrl: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
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
