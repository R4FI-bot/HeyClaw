/**
 * Wake Word Detection Service using Vosk
 * 
 * Uses Vosk with grammar mode for efficient offline wake word detection.
 * No API keys required! Just download a Vosk model.
 * 
 * How it works:
 * - Vosk runs in grammar mode, only listening for specific words
 * - This is more efficient than full STT recognition
 * - Supports any wake word (not limited to pre-trained keywords)
 */

import Vosk from 'react-native-vosk';

type WakeWordHandler = () => void;

interface WakeWordConfig {
  wakeWord: string;
  modelPath: string;
}

class WakeWordService {
  private vosk: Vosk | null = null;
  private isListening: boolean = false;
  private isInitialized: boolean = false;
  private currentWakeWord: string = 'computer';
  private handlers: Set<WakeWordHandler> = new Set();

  /**
   * Initialize Vosk with model path and wake word
   */
  async initialize(config: WakeWordConfig): Promise<void> {
    const { wakeWord, modelPath } = config;
    
    if (!modelPath) {
      throw new Error('Vosk model path is required. Please download a model first.');
    }

    this.currentWakeWord = wakeWord.toLowerCase();

    try {
      this.vosk = new Vosk();
      
      // Load the Vosk model
      await this.vosk.loadModel(modelPath);
      
      this.isInitialized = true;
      console.log('[WakeWord] Vosk initialized with wake word:', this.currentWakeWord);
    } catch (error) {
      console.error('[WakeWord] Vosk initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Change the wake word (no re-initialization needed with Vosk!)
   */
  async setWakeWord(wakeWord: string): Promise<void> {
    const normalizedWord = wakeWord.toLowerCase();
    
    if (normalizedWord === this.currentWakeWord) {
      return;
    }

    const wasListening = this.isListening;
    
    if (wasListening) {
      await this.stopListening();
    }

    this.currentWakeWord = normalizedWord;
    console.log('[WakeWord] Wake word changed to:', this.currentWakeWord);

    if (wasListening) {
      await this.startListening();
    }
  }

  /**
   * Start listening for wake word using grammar mode
   * 
   * Grammar mode makes Vosk only listen for specific words,
   * which is more efficient than full speech recognition.
   */
  async startListening(): Promise<void> {
    if (!this.isInitialized || !this.vosk) {
      throw new Error('Wake word service not initialized. Call initialize() first.');
    }

    if (this.isListening) {
      return;
    }

    try {
      // Set up result handler before starting
      this.vosk.onResult(this.handleResult.bind(this));
      this.vosk.onPartialResult(this.handlePartialResult.bind(this));
      this.vosk.onError(this.handleError.bind(this));
      this.vosk.onFinalResult(this.handleFinalResult.bind(this));
      
      // Start Vosk in grammar mode - only listen for wake word + unknown
      // [unk] catches everything else so Vosk doesn't get confused
      const grammar = [this.currentWakeWord, '[unk]'];
      
      await this.vosk.start({ grammar });
      
      this.isListening = true;
      console.log('[WakeWord] Started listening for:', this.currentWakeWord);
    } catch (error) {
      console.error('[WakeWord] Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for wake word
   */
  async stopListening(): Promise<void> {
    if (!this.vosk || !this.isListening) {
      return;
    }

    try {
      await this.vosk.stop();
      this.isListening = false;
      console.log('[WakeWord] Stopped listening');
    } catch (error) {
      console.error('[WakeWord] Failed to stop listening:', error);
      throw error;
    }
  }

  /**
   * Handle Vosk partial results (streaming recognition)
   */
  private handlePartialResult(partial: string): void {
    // Partial results for wake word detection
    const text = partial.toLowerCase().trim();
    
    if (text.includes(this.currentWakeWord)) {
      console.log('[WakeWord] Partial match detected:', text);
      // Don't trigger on partial - wait for final
    }
  }

  /**
   * Handle Vosk results
   */
  private handleResult(result: string): void {
    this.checkForWakeWord(result);
  }

  /**
   * Handle Vosk final results
   */
  private handleFinalResult(result: string): void {
    this.checkForWakeWord(result);
  }

  /**
   * Check if result contains wake word
   */
  private checkForWakeWord(result: string): void {
    try {
      // Vosk returns JSON: { "text": "computer" }
      const parsed = JSON.parse(result);
      const text = (parsed.text || '').toLowerCase().trim();
      
      if (text.includes(this.currentWakeWord)) {
        console.log('[WakeWord] Detected!', text);
        this.notifyHandlers();
      }
    } catch {
      // If not JSON, check raw text
      const text = result.toLowerCase().trim();
      if (text.includes(this.currentWakeWord)) {
        console.log('[WakeWord] Detected (raw)!', text);
        this.notifyHandlers();
      }
    }
  }

  /**
   * Handle Vosk errors
   */
  private handleError(error: string): void {
    console.error('[WakeWord] Vosk error:', error);
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
    if (this.vosk) {
      await this.stopListening();
      // Vosk cleanup if available
      this.vosk = null;
    }
    this.isInitialized = false;
    this.handlers.clear();
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current wake word
   */
  getCurrentWakeWord(): string {
    return this.currentWakeWord;
  }
}

// Singleton instance
export const wakeWordService = new WakeWordService();
