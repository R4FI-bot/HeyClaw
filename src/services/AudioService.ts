/**
 * Audio Recording and Playback Service
 */

import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
} from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { AUDIO_CONFIG, RECORDING_CONFIG } from '../constants';

type RecordingCompleteHandler = (audioBase64: string, durationMs: number) => void;
type PlaybackCompleteHandler = () => void;

class AudioService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private recordingPath: string = '';
  private recordingStartTime: number = 0;
  private silenceStartTime: number = 0;
  private recordingHandlers: Set<RecordingCompleteHandler> = new Set();
  private playbackHandlers: Set<PlaybackCompleteHandler> = new Set();
  private audioQueue: string[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('[Audio] Already recording');
      return;
    }

    const path = Platform.select({
      ios: 'heyclaw_recording.m4a',
      android: `${RNFS.CachesDirectoryPath}/heyclaw_recording.wav`,
    })!;

    this.recordingPath = path;

    try {
      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.VOICE_RECOGNITION,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: AUDIO_CONFIG.channels,
        AVFormatIDKeyIOS: AVEncodingOption.aac,
      };

      await this.audioRecorderPlayer.startRecorder(path, audioSet);

      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.silenceStartTime = 0;

      // Monitor recording for silence detection
      this.audioRecorderPlayer.addRecordBackListener((e) => {
        // Check for max duration
        const duration = Date.now() - this.recordingStartTime;
        if (duration >= RECORDING_CONFIG.maxDuration) {
          this.stopRecording();
        }
      });

      console.log('[Audio] Recording started');
    } catch (error) {
      console.error('[Audio] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio data
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      const result = await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;

      const durationMs = Date.now() - this.recordingStartTime;

      // Check minimum duration
      if (durationMs < RECORDING_CONFIG.minDuration) {
        console.log('[Audio] Recording too short, discarding');
        return;
      }

      // Read file and convert to base64
      const audioBase64 = await RNFS.readFile(this.recordingPath, 'base64');
      
      console.log('[Audio] Recording stopped, duration:', durationMs, 'ms');
      
      // Notify handlers
      this.notifyRecordingHandlers(audioBase64, durationMs);

      // Clean up temp file
      await RNFS.unlink(this.recordingPath).catch(() => {});
    } catch (error) {
      console.error('[Audio] Failed to stop recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;
      
      // Clean up temp file
      await RNFS.unlink(this.recordingPath).catch(() => {});
      
      console.log('[Audio] Recording cancelled');
    } catch (error) {
      console.error('[Audio] Failed to cancel recording:', error);
      this.isRecording = false;
    }
  }

  /**
   * Play audio from URL or base64
   */
  async playAudio(source: string): Promise<void> {
    if (this.isPlaying) {
      // Add to queue
      this.audioQueue.push(source);
      return;
    }

    try {
      this.isPlaying = true;

      let path: string;
      
      // Check if it's base64 data
      if (source.startsWith('data:') || !source.startsWith('http')) {
        // Save base64 to temp file
        const base64Data = source.replace(/^data:audio\/\w+;base64,/, '');
        path = `${RNFS.CachesDirectoryPath}/heyclaw_playback_${Date.now()}.mp3`;
        await RNFS.writeFile(path, base64Data, 'base64');
      } else {
        path = source;
      }

      await this.audioRecorderPlayer.startPlayer(path);
      
      this.audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration) {
          this.onPlaybackComplete();
        }
      });

      console.log('[Audio] Playing audio');
    } catch (error) {
      console.error('[Audio] Failed to play audio:', error);
      this.isPlaying = false;
      this.processQueue();
      throw error;
    }
  }

  private async onPlaybackComplete(): Promise<void> {
    await this.stopPlayback();
    this.notifyPlaybackHandlers();
    this.processQueue();
  }

  private processQueue(): void {
    if (this.audioQueue.length > 0) {
      const next = this.audioQueue.shift()!;
      this.playAudio(next);
    }
  }

  /**
   * Stop current playback
   */
  async stopPlayback(): Promise<void> {
    if (!this.isPlaying) {
      return;
    }

    try {
      await this.audioRecorderPlayer.stopPlayer();
      this.audioRecorderPlayer.removePlayBackListener();
      this.isPlaying = false;
      console.log('[Audio] Playback stopped');
    } catch (error) {
      console.error('[Audio] Failed to stop playback:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Pause playback
   */
  async pausePlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.error('[Audio] Failed to pause playback:', error);
    }
  }

  /**
   * Resume playback
   */
  async resumePlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.resumePlayer();
    } catch (error) {
      console.error('[Audio] Failed to resume playback:', error);
    }
  }

  /**
   * Add audio to queue for auto-play
   */
  queueAudio(source: string): void {
    if (!this.isPlaying) {
      this.playAudio(source);
    } else {
      this.audioQueue.push(source);
    }
  }

  /**
   * Clear audio queue
   */
  clearQueue(): void {
    this.audioQueue = [];
  }

  /**
   * Register recording complete handler
   */
  onRecordingComplete(handler: RecordingCompleteHandler): () => void {
    this.recordingHandlers.add(handler);
    return () => this.recordingHandlers.delete(handler);
  }

  /**
   * Register playback complete handler
   */
  onPlaybackComplete(handler: PlaybackCompleteHandler): () => void {
    this.playbackHandlers.add(handler);
    return () => this.playbackHandlers.delete(handler);
  }

  private notifyRecordingHandlers(audioBase64: string, durationMs: number): void {
    this.recordingHandlers.forEach((handler) => {
      try {
        handler(audioBase64, durationMs);
      } catch (error) {
        console.error('[Audio] Recording handler error:', error);
      }
    });
  }

  private notifyPlaybackHandlers(): void {
    this.playbackHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error('[Audio] Playback handler error:', error);
      }
    });
  }

  /**
   * Get recording state
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get playback state
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton instance
export const audioService = new AudioService();
