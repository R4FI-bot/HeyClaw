/**
 * Wake Word Detection Service using Porcupine
 * 
 * NOTE: Requires a Picovoice Access Key from https://console.picovoice.ai/
 * The access key should be stored in app settings.
 */

import { Porcupine, BuiltInKeywords } from '@picovoice/porcupine-react-native';
import type { WakeWordOption } from '../types';

type WakeWordHandler = () => void;

// Map our wake word options to Porcupine's built-in keywords
const WAKE_WORD_MAP: Record<WakeWordOption, BuiltInKeywords> = {
  'porcupine': BuiltInKeywords.PORCUPINE,
  'bumblebee': BuiltInKeywords.BUMBLEBEE,
  'alexa': BuiltInKeywords.ALEXA,
  'hey google': BuiltInKeywords.HEY_GOOGLE,
  'hey siri': BuiltInKeywords.HEY_SIRI,
  'ok google': BuiltInKeywords.OK_GOOGLE,
  'jarvis': BuiltInKeywords.JARVIS,
  'picovoice': BuiltInKeywords.PICOVOICE,
  'computer': BuiltInKeywords.COMPUTER,
  'terminator': BuiltInKeywords.TERMINATOR,
  'americano': BuiltInKeywords.AMERICANO,
  'blueberry': BuiltInKeywords.BLUEBERRY,
  'grapefruit': BuiltInKeywords.GRAPEFRUIT,
  'grasshopper': BuiltInKeywords.GRASSHOPPER,
};

class WakeWordService {
  private porcupine: Porcupine | null = null;
  private isListening: boolean = false;
  private accessKey: string = '';
  private currentWakeWord: WakeWordOption = 'porcupine';
  private handlers: Set<WakeWordHandler> = new Set();

  /**
   * Initialize Porcupine with access key
   */
  async initialize(accessKey: string, wakeWord: WakeWordOption = 'porcupine'): Promise<void> {
    this.accessKey = accessKey;
    this.currentWakeWord = wakeWord;

    if (!accessKey) {
      throw new Error('Picovoice access key is required');
    }

    try {
      const keyword = WAKE_WORD_MAP[wakeWord];
      
      this.porcupine = await Porcupine.fromBuiltInKeywords(
        accessKey,
        [keyword],
        this.handleDetection.bind(this)
      );

      console.log('[WakeWord] Initialized with keyword:', wakeWord);
    } catch (error) {
      console.error('[WakeWord] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Change the wake word (requires re-initialization)
   */
  async setWakeWord(wakeWord: WakeWordOption): Promise<void> {
    if (wakeWord === this.currentWakeWord && this.porcupine) {
      return;
    }

    const wasListening = this.isListening;
    
    if (wasListening) {
      await this.stopListening();
    }

    await this.cleanup();
    await this.initialize(this.accessKey, wakeWord);

    if (wasListening) {
      await this.startListening();
    }
  }

  /**
   * Start listening for wake word
   */
  async startListening(): Promise<void> {
    if (!this.porcupine) {
      throw new Error('Wake word service not initialized');
    }

    if (this.isListening) {
      return;
    }

    try {
      await this.porcupine.start();
      this.isListening = true;
      console.log('[WakeWord] Started listening');
    } catch (error) {
      console.error('[WakeWord] Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for wake word
   */
  async stopListening(): Promise<void> {
    if (!this.porcupine || !this.isListening) {
      return;
    }

    try {
      await this.porcupine.stop();
      this.isListening = false;
      console.log('[WakeWord] Stopped listening');
    } catch (error) {
      console.error('[WakeWord] Failed to stop listening:', error);
      throw error;
    }
  }

  private handleDetection(keywordIndex: number): void {
    console.log('[WakeWord] Detected! Index:', keywordIndex);
    this.notifyHandlers();
  }

  /**
   * Register a handler for wake word detection
   */
  onDetection(handler: WakeWordHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(): void {
    this.handlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error('[WakeWord] Handler error:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.porcupine) {
      await this.stopListening();
      await this.porcupine.delete();
      this.porcupine = null;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get current wake word
   */
  getCurrentWakeWord(): WakeWordOption {
    return this.currentWakeWord;
  }
}

// Singleton instance
export const wakeWordService = new WakeWordService();
