/**
 * Speech-to-Text Service
 * 
 * Supports two modes:
 * 1. On-device (default): Uses react-native-voice (Google/Apple native speech recognition)
 * 2. Custom endpoint: Self-hosted Whisper or compatible STT API
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

type TranscriptionHandler = (text: string, isFinal: boolean) => void;
type ErrorHandler = (error: string) => void;
type StateHandler = (isListening: boolean) => void;

interface STTConfig {
  useCustomSTT: boolean;
  customSTTUrl: string;
  language?: string;
}

class STTService {
  private config: STTConfig = {
    useCustomSTT: false,
    customSTTUrl: '',
    language: 'en-US',
  };

  private isListening: boolean = false;
  private transcriptionHandlers: Set<TranscriptionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();

  constructor() {
    this.initializeVoice();
  }

  private initializeVoice(): void {
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
  }

  /**
   * Configure STT provider
   */
  configure(config: Partial<STTConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[STT] Configured:', this.config.useCustomSTT ? 'Custom endpoint' : 'On-device');
  }

  /**
   * Start listening for speech (on-device mode)
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('[STT] Already listening');
      return;
    }

    if (this.config.useCustomSTT) {
      console.log('[STT] Custom STT mode - use transcribeAudio() instead');
      return;
    }

    try {
      await Voice.start(this.config.language || 'en-US');
      this.isListening = true;
      this.notifyStateHandlers(true);
      console.log('[STT] Started listening (on-device)');
    } catch (error) {
      console.error('[STT] Failed to start listening:', error);
      this.notifyErrorHandlers('Failed to start speech recognition');
      throw error;
    }
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    if (!this.isListening && !this.config.useCustomSTT) {
      return;
    }

    try {
      await Voice.stop();
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
      await Voice.cancel();
      this.isListening = false;
      this.notifyStateHandlers(false);
    } catch (error) {
      console.error('[STT] Failed to cancel:', error);
      this.isListening = false;
      this.notifyStateHandlers(false);
    }
  }

  /**
   * Transcribe audio using custom endpoint (Whisper, etc.)
   * 
   * Expected API format:
   * POST <customSTTUrl>
   * Content-Type: multipart/form-data
   * Body: { audio: <audio file> }
   * Response: { text: "transcribed text" }
   */
  async transcribeAudio(audioPath: string): Promise<string> {
    if (!this.config.useCustomSTT || !this.config.customSTTUrl) {
      throw new Error('Custom STT not configured');
    }

    try {
      console.log('[STT] Transcribing audio via custom endpoint');

      // Read audio file as base64
      const audioBase64 = await RNFS.readFile(audioPath, 'base64');

      // Determine content type
      const ext = audioPath.split('.').pop()?.toLowerCase() || 'wav';
      const mimeType = ext === 'wav' ? 'audio/wav' : 
                       ext === 'm4a' ? 'audio/m4a' :
                       ext === 'mp3' ? 'audio/mp3' : 'audio/wav';

      // Create form data
      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${audioPath}` : audioPath,
        type: mimeType,
        name: `audio.${ext}`,
      } as any);

      // Send to custom endpoint
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
      
      // Handle various response formats (Whisper API, etc.)
      const text = result.text || result.transcription || result.transcript || '';
      
      console.log('[STT] Transcription result:', text.substring(0, 50) + '...');
      return text;
    } catch (error) {
      console.error('[STT] Custom transcription failed:', error);
      this.notifyErrorHandlers('Transcription failed');
      throw error;
    }
  }

  /**
   * Transcribe audio from base64 data
   */
  async transcribeBase64(audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> {
    if (!this.config.useCustomSTT || !this.config.customSTTUrl) {
      throw new Error('Custom STT not configured');
    }

    try {
      console.log('[STT] Transcribing base64 audio via custom endpoint');

      const response = await fetch(this.config.customSTTUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          audio_format: mimeType,
        }),
      });

      if (!response.ok) {
        throw new Error(`STT request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.text || result.transcription || result.transcript || '';
    } catch (error) {
      console.error('[STT] Base64 transcription failed:', error);
      this.notifyErrorHandlers('Transcription failed');
      throw error;
    }
  }

  // Voice event handlers
  private onSpeechStart(e: SpeechStartEvent): void {
    console.log('[STT] Speech started');
    this.isListening = true;
    this.notifyStateHandlers(true);
  }

  private onSpeechEnd(e: SpeechEndEvent): void {
    console.log('[STT] Speech ended');
    this.isListening = false;
    this.notifyStateHandlers(false);
  }

  private onSpeechResults(e: SpeechResultsEvent): void {
    const text = e.value?.[0] || '';
    console.log('[STT] Final result:', text);
    this.notifyTranscriptionHandlers(text, true);
  }

  private onSpeechPartialResults(e: SpeechResultsEvent): void {
    const text = e.value?.[0] || '';
    console.log('[STT] Partial result:', text);
    this.notifyTranscriptionHandlers(text, false);
  }

  private onSpeechError(e: SpeechErrorEvent): void {
    console.error('[STT] Error:', e.error);
    this.isListening = false;
    this.notifyStateHandlers(false);
    this.notifyErrorHandlers(e.error?.message || 'Speech recognition error');
  }

  // Handler registration
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

  /**
   * Check if on-device speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const available = await Voice.isAvailable();
      return !!available;
    } catch {
      return false;
    }
  }

  /**
   * Get supported locales (on-device)
   */
  async getSupportedLocales(): Promise<string[]> {
    try {
      const locales = await Voice.getSpeechRecognitionServices();
      return locales || [];
    } catch {
      return [];
    }
  }

  /**
   * Get current listening state
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if using custom STT
   */
  isUsingCustomSTT(): boolean {
    return this.config.useCustomSTT;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
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
