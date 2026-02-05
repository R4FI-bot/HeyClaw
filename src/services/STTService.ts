/**
 * Speech-to-Text Service
 * 
 * Supports multiple modes:
 * 1. Vosk (default): Offline, open source, no API keys
 * 2. Device: Uses react-native-voice (Google/Apple cloud)
 * 3. Custom endpoint: Self-hosted Whisper or compatible API
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import Vosk from 'react-native-vosk';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import type { STTProvider } from '../types';

type TranscriptionHandler = (text: string, isFinal: boolean) => void;
type ErrorHandler = (error: string) => void;
type StateHandler = (isListening: boolean) => void;

interface STTConfig {
  provider: STTProvider;
  customSTTUrl: string;
  voskModelPath: string;
  language?: string;
}

class STTService {
  private config: STTConfig = {
    provider: 'vosk',
    customSTTUrl: '',
    voskModelPath: '',
    language: 'en-US',
  };

  private vosk: Vosk | null = null;
  private voskInitialized: boolean = false;
  private isListening: boolean = false;
  private transcriptionHandlers: Set<TranscriptionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();

  constructor() {
    this.initializeVoiceCallbacks();
  }

  /**
   * Initialize react-native-voice callbacks (for device mode)
   */
  private initializeVoiceCallbacks(): void {
    Voice.onSpeechStart = this.onVoiceSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onVoiceSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onVoiceSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onVoiceSpeechPartialResults.bind(this);
    Voice.onSpeechError = this.onVoiceSpeechError.bind(this);
  }

  /**
   * Configure STT provider
   */
  async configure(config: Partial<STTConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    console.log('[STT] Configured provider:', this.config.provider);

    // Initialize Vosk if needed
    if (this.config.provider === 'vosk' && this.config.voskModelPath) {
      await this.initializeVosk();
    }
  }

  /**
   * Initialize Vosk for STT
   */
  private async initializeVosk(): Promise<void> {
    if (this.voskInitialized) {
      return;
    }

    if (!this.config.voskModelPath) {
      console.warn('[STT] Vosk model path not set');
      return;
    }

    try {
      this.vosk = new Vosk();
      await this.vosk.loadModel(this.config.voskModelPath);
      
      // Set up callbacks
      this.vosk.onResult(this.onVoskResult.bind(this));
      this.vosk.onPartialResult(this.onVoskPartialResult.bind(this));
      this.vosk.onFinalResult(this.onVoskFinalResult.bind(this));
      this.vosk.onError(this.onVoskError.bind(this));
      
      this.voskInitialized = true;
      console.log('[STT] Vosk initialized');
    } catch (error) {
      console.error('[STT] Vosk initialization failed:', error);
      this.notifyErrorHandlers('Failed to initialize Vosk');
    }
  }

  /**
   * Start listening for speech
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('[STT] Already listening');
      return;
    }

    const { provider } = this.config;

    if (provider === 'custom') {
      console.log('[STT] Custom STT mode - use transcribeAudio() instead');
      return;
    }

    try {
      if (provider === 'vosk') {
        await this.startVoskListening();
      } else {
        await this.startVoiceListening();
      }
    } catch (error) {
      console.error('[STT] Failed to start listening:', error);
      this.notifyErrorHandlers('Failed to start speech recognition');
      throw error;
    }
  }

  /**
   * Start Vosk listening (full STT, no grammar restriction)
   */
  private async startVoskListening(): Promise<void> {
    if (!this.voskInitialized || !this.vosk) {
      await this.initializeVosk();
      if (!this.voskInitialized || !this.vosk) {
        throw new Error('Vosk not initialized. Check model path.');
      }
    }

    // Start without grammar = full speech recognition
    await this.vosk.start();
    this.isListening = true;
    this.notifyStateHandlers(true);
    console.log('[STT] Started Vosk listening');
  }

  /**
   * Start device (react-native-voice) listening
   */
  private async startVoiceListening(): Promise<void> {
    await Voice.start(this.config.language || 'en-US');
    this.isListening = true;
    this.notifyStateHandlers(true);
    console.log('[STT] Started device listening');
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (this.config.provider === 'vosk' && this.vosk) {
        await this.vosk.stop();
      } else {
        await Voice.stop();
      }
      
      this.isListening = false;
      this.notifyStateHandlers(false);
      console.log('[STT] Stopped listening');
    } catch (error) {
      console.error('[STT] Failed to stop listening:', error);
      this.isListening = false;
      this.notifyStateHandlers(false);
    }
  }

  /**
   * Cancel speech recognition
   */
  async cancel(): Promise<void> {
    try {
      if (this.config.provider === 'vosk' && this.vosk) {
        await this.vosk.stop();
      } else {
        await Voice.cancel();
      }
      this.isListening = false;
      this.notifyStateHandlers(false);
    } catch (error) {
      console.error('[STT] Failed to cancel:', error);
      this.isListening = false;
      this.notifyStateHandlers(false);
    }
  }

  // ============================================================================
  // Vosk event handlers
  // ============================================================================

  private onVoskPartialResult(partial: string): void {
    try {
      const parsed = JSON.parse(partial);
      const text = parsed.partial || '';
      if (text) {
        this.notifyTranscriptionHandlers(text, false);
      }
    } catch {
      if (partial) {
        this.notifyTranscriptionHandlers(partial, false);
      }
    }
  }

  private onVoskResult(result: string): void {
    try {
      const parsed = JSON.parse(result);
      const text = parsed.text || '';
      if (text) {
        console.log('[STT] Vosk result:', text);
        this.notifyTranscriptionHandlers(text, false);
      }
    } catch {
      if (result) {
        this.notifyTranscriptionHandlers(result, false);
      }
    }
  }

  private onVoskFinalResult(result: string): void {
    try {
      const parsed = JSON.parse(result);
      const text = parsed.text || '';
      if (text) {
        console.log('[STT] Vosk final:', text);
        this.notifyTranscriptionHandlers(text, true);
      }
    } catch {
      if (result) {
        this.notifyTranscriptionHandlers(result, true);
      }
    }
    
    this.isListening = false;
    this.notifyStateHandlers(false);
  }

  private onVoskError(error: string): void {
    console.error('[STT] Vosk error:', error);
    this.notifyErrorHandlers(error);
    this.isListening = false;
    this.notifyStateHandlers(false);
  }

  // ============================================================================
  // react-native-voice event handlers
  // ============================================================================

  private onVoiceSpeechStart(e: SpeechStartEvent): void {
    console.log('[STT] Voice started');
    this.isListening = true;
    this.notifyStateHandlers(true);
  }

  private onVoiceSpeechEnd(e: SpeechEndEvent): void {
    console.log('[STT] Voice ended');
    this.isListening = false;
    this.notifyStateHandlers(false);
  }

  private onVoiceSpeechResults(e: SpeechResultsEvent): void {
    const text = e.value?.[0] || '';
    console.log('[STT] Voice final:', text);
    this.notifyTranscriptionHandlers(text, true);
  }

  private onVoiceSpeechPartialResults(e: SpeechResultsEvent): void {
    const text = e.value?.[0] || '';
    this.notifyTranscriptionHandlers(text, false);
  }

  private onVoiceSpeechError(e: SpeechErrorEvent): void {
    console.error('[STT] Voice error:', e.error);
    this.isListening = false;
    this.notifyStateHandlers(false);
    this.notifyErrorHandlers(e.error?.message || 'Speech recognition error');
  }

  // ============================================================================
  // Custom endpoint transcription
  // ============================================================================

  /**
   * Transcribe audio using custom endpoint (Whisper, etc.)
   */
  async transcribeAudio(audioPath: string): Promise<string> {
    if (this.config.provider !== 'custom' || !this.config.customSTTUrl) {
      throw new Error('Custom STT not configured');
    }

    try {
      console.log('[STT] Transcribing via custom endpoint');

      const ext = audioPath.split('.').pop()?.toLowerCase() || 'wav';
      const mimeType = ext === 'wav' ? 'audio/wav' : 
                       ext === 'm4a' ? 'audio/m4a' :
                       ext === 'mp3' ? 'audio/mp3' : 'audio/wav';

      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${audioPath}` : audioPath,
        type: mimeType,
        name: `audio.${ext}`,
      } as any);

      const response = await fetch(this.config.customSTTUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`STT request failed: ${response.status}`);
      }

      const result = await response.json();
      const text = result.text || result.transcription || result.transcript || '';
      
      console.log('[STT] Transcription:', text.substring(0, 50) + '...');
      return text;
    } catch (error) {
      console.error('[STT] Custom transcription failed:', error);
      this.notifyErrorHandlers('Transcription failed');
      throw error;
    }
  }

  // ============================================================================
  // Handler registration
  // ============================================================================

  onTranscription(handler: TranscriptionHandler): () => void {
    this.transcriptionHandlers.add(handler);
    return () => this.transcriptionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  private notifyTranscriptionHandlers(text: string, isFinal: boolean): void {
    this.transcriptionHandlers.forEach(handler => {
      try {
        handler(text, isFinal);
      } catch (error) {
        console.error('[STT] Handler error:', error);
      }
    });
  }

  private notifyErrorHandlers(error: string): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('[STT] Error handler error:', e);
      }
    });
  }

  private notifyStateHandlers(isListening: boolean): void {
    this.stateHandlers.forEach(handler => {
      try {
        handler(isListening);
      } catch (error) {
        console.error('[STT] State handler error:', error);
      }
    });
  }

  // ============================================================================
  // Utility methods
  // ============================================================================

  /**
   * Check if on-device speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.config.provider === 'vosk') {
      return this.voskInitialized;
    }
    try {
      const available = await Voice.isAvailable();
      return !!available;
    } catch {
      return false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getProvider(): STTProvider {
    return this.config.provider;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      if (this.vosk) {
        await this.vosk.stop();
        this.vosk = null;
      }
      this.transcriptionHandlers.clear();
      this.errorHandlers.clear();
      this.stateHandlers.clear();
    } catch (error) {
      console.error('[STT] Failed to destroy:', error);
    }
  }
}

// Singleton instance
export const sttService = new STTService();
