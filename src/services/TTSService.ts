/**
 * Text-to-Speech Service
 * 
 * Supports three providers:
 * 1. Device (default): Native device TTS (react-native-tts)
 * 2. Custom endpoint: Self-hosted Piper, XTTS v2, or compatible TTS API
 * 3. ElevenLabs: Cloud TTS with high-quality voices
 */

import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import type { TTSProvider } from '../types';

type SpeechCompleteHandler = () => void;
type SpeechStartHandler = () => void;
type ErrorHandler = (error: string) => void;

interface TTSConfig {
  provider: TTSProvider;
  customTTSUrl: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  language?: string;
  rate?: number;
  pitch?: number;
}

interface QueuedUtterance {
  text: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

class TTSService {
  private config: TTSConfig = {
    provider: 'device',
    customTTSUrl: '',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '',
    language: 'en-US',
    rate: 0.5,
    pitch: 1.0,
  };

  private isSpeaking: boolean = false;
  private speechQueue: QueuedUtterance[] = [];
  private speechCompleteHandlers: Set<SpeechCompleteHandler> = new Set();
  private speechStartHandlers: Set<SpeechStartHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.initializeTts();
  }

  private async initializeTts(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize native TTS
      await Tts.setDefaultLanguage(this.config.language || 'en-US');
      await Tts.setDefaultRate(this.config.rate || 0.5);
      await Tts.setDefaultPitch(this.config.pitch || 1.0);
      
      // Set up event listeners
      Tts.addEventListener('tts-start', this.onTtsStart.bind(this));
      Tts.addEventListener('tts-finish', this.onTtsFinish.bind(this));
      Tts.addEventListener('tts-cancel', this.onTtsCancel.bind(this));
      Tts.addEventListener('tts-error', this.onTtsError.bind(this));

      this.initialized = true;
      console.log('[TTS] Initialized native TTS');
    } catch (error) {
      console.error('[TTS] Failed to initialize:', error);
    }
  }

  /**
   * Configure TTS provider and settings
   */
  async configure(config: Partial<TTSConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (config.language && this.config.provider === 'device') {
      try {
        await Tts.setDefaultLanguage(config.language);
      } catch {
        console.warn('[TTS] Language not available:', config.language);
      }
    }

    if (config.rate !== undefined && this.config.provider === 'device') {
      await Tts.setDefaultRate(config.rate);
    }

    if (config.pitch !== undefined && this.config.provider === 'device') {
      await Tts.setDefaultPitch(config.pitch);
    }

    console.log('[TTS] Configured provider:', this.config.provider);
  }

  /**
   * Speak text using configured provider
   */
  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    switch (this.config.provider) {
      case 'device':
        return this.speakDevice(text);
      case 'custom':
        return this.speakCustom(text);
      case 'elevenlabs':
        return this.speakElevenLabs(text);
      default:
        return this.speakDevice(text);
    }
  }

  /**
   * Speak using native device TTS
   */
  private async speakDevice(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isSpeaking) {
        this.speechQueue.push({ text, resolve, reject });
        return;
      }

      this.isSpeaking = true;
      this.notifySpeechStartHandlers();
      
      // Store resolve for the onTtsFinish callback
      (this as any)._currentResolve = resolve;
      (this as any)._currentReject = reject;

      try {
        Tts.speak(text);
        // Resolution happens in onTtsFinish callback
      } catch (error) {
        this.isSpeaking = false;
        (this as any)._currentResolve = null;
        reject(error);
      }
    });
  }

  /**
   * Speak using custom endpoint (Piper/XTTS)
   * 
   * Expected API format:
   * POST <customTTSUrl>
   * Content-Type: application/json
   * Body: { text: "text to speak", voice?: "voice_name" }
   * Response: audio/wav or audio/mp3 binary
   */
  private async speakCustom(text: string): Promise<void> {
    if (!this.config.customTTSUrl) {
      throw new Error('Custom TTS URL not configured');
    }

    this.isSpeaking = true;
    this.notifySpeechStartHandlers();

    try {
      const response = await fetch(this.config.customTTSUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/wav, audio/mp3, audio/mpeg',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      // Get audio data
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = this.arrayBufferToBase64(audioBuffer);
      
      // Determine format from content-type
      const contentType = response.headers.get('content-type') || 'audio/wav';
      const ext = contentType.includes('mp3') || contentType.includes('mpeg') ? 'mp3' : 'wav';
      
      // Save and play
      await this.playAudioBase64(audioBase64, ext);
    } catch (error) {
      console.error('[TTS] Custom TTS failed:', error);
      this.notifyErrorHandlers('Failed to generate speech');
      throw error;
    } finally {
      this.isSpeaking = false;
      this.notifySpeechCompleteHandlers();
      this.processQueue();
    }
  }

  /**
   * Speak using ElevenLabs API
   * 
   * API: https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
   */
  private async speakElevenLabs(text: string): Promise<void> {
    if (!this.config.elevenLabsApiKey || !this.config.elevenLabsVoiceId) {
      throw new Error('ElevenLabs credentials not configured');
    }

    this.isSpeaking = true;
    this.notifySpeechStartHandlers();

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.config.elevenLabsApiKey,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs request failed: ${response.status} - ${error}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = this.arrayBufferToBase64(audioBuffer);
      
      await this.playAudioBase64(audioBase64, 'mp3');
    } catch (error) {
      console.error('[TTS] ElevenLabs TTS failed:', error);
      this.notifyErrorHandlers('Failed to generate speech');
      throw error;
    } finally {
      this.isSpeaking = false;
      this.notifySpeechCompleteHandlers();
      this.processQueue();
    }
  }

  /**
   * Play audio from base64 data
   */
  private async playAudioBase64(base64: string, format: string): Promise<void> {
    const tempPath = `${RNFS.CachesDirectoryPath}/tts_playback_${Date.now()}.${format}`;
    
    try {
      await RNFS.writeFile(tempPath, base64, 'base64');
      
      // Use react-native-sound or audio-recorder-player for playback
      // For now, we'll import from AudioService
      const { audioService } = require('./AudioService');
      await audioService.playAudio(tempPath);
      
      // Clean up temp file after a delay
      setTimeout(() => {
        RNFS.unlink(tempPath).catch(() => {});
      }, 30000);
    } catch (error) {
      console.error('[TTS] Failed to play audio:', error);
      throw error;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = bytes[i + 1] ?? 0;
      const c = bytes[i + 2] ?? 0;
      
      result += chars[a >> 2];
      result += chars[((a & 3) << 4) | (b >> 4)];
      result += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
      result += i + 2 < bytes.length ? chars[c & 63] : '=';
    }
    
    return result;
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    try {
      if (this.config.provider === 'device') {
        await Tts.stop();
      }
      // For custom/elevenlabs, we'd need to stop the audio playback
      const { audioService } = require('./AudioService');
      await audioService.stopPlayback();
      
      this.isSpeaking = false;
      this.speechQueue = [];
    } catch (error) {
      console.error('[TTS] Failed to stop:', error);
    }
  }

  /**
   * Process speech queue
   */
  private processQueue(): void {
    if (this.speechQueue.length > 0 && !this.isSpeaking) {
      const next = this.speechQueue.shift()!;
      this.speak(next.text)
        .then(next.resolve)
        .catch(next.reject);
    }
  }

  // Native TTS event handlers
  private onTtsStart(): void {
    console.log('[TTS] Speech started (device)');
    this.isSpeaking = true;
    this.notifySpeechStartHandlers();
  }

  private onTtsFinish(): void {
    console.log('[TTS] Speech finished (device)');
    this.isSpeaking = false;
    this.notifySpeechCompleteHandlers();
    
    // Resolve pending promise
    if ((this as any)._currentResolve) {
      (this as any)._currentResolve();
      (this as any)._currentResolve = null;
    }
    
    this.processQueue();
  }

  private onTtsCancel(): void {
    console.log('[TTS] Speech cancelled (device)');
    this.isSpeaking = false;
  }

  private onTtsError(error: any): void {
    console.error('[TTS] Error (device):', error);
    this.isSpeaking = false;
    this.notifyErrorHandlers(error?.message || 'TTS error');
  }

  // Handler registration
  onSpeechComplete(handler: SpeechCompleteHandler): () => void {
    this.speechCompleteHandlers.add(handler);
    return () => this.speechCompleteHandlers.delete(handler);
  }

  onSpeechStart(handler: SpeechStartHandler): () => void {
    this.speechStartHandlers.add(handler);
    return () => this.speechStartHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private notifySpeechCompleteHandlers(): void {
    this.speechCompleteHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('[TTS] Complete handler error:', error);
      }
    });
  }

  private notifySpeechStartHandlers(): void {
    this.speechStartHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('[TTS] Start handler error:', error);
      }
    });
  }

  private notifyErrorHandlers(error: string): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('[TTS] Error handler error:', e);
      }
    });
  }

  /**
   * Get available voices (device TTS)
   */
  async getVoices(): Promise<any[]> {
    try {
      return await Tts.voices();
    } catch {
      return [];
    }
  }

  /**
   * Get available engines (device TTS)
   */
  async getEngines(): Promise<any[]> {
    if (Platform.OS !== 'android') return [];
    try {
      return await Tts.engines();
    } catch {
      return [];
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get current provider
   */
  getProvider(): TTSProvider {
    return this.config.provider;
  }
}

// Singleton instance
export const ttsService = new TTSService();
