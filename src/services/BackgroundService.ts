/**
 * Background Service for Android
 * Keeps wake word detection running when app is in background or screen is off
 */

import { Platform } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import { NOTIFICATION_CONFIG } from '../constants';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface BackgroundTaskOptions {
  onTick?: () => void;
}

class BackgroundService {
  private isRunning: boolean = false;
  private onTick: (() => void) | null = null;

  /**
   * Background task that runs continuously
   */
  private async backgroundTask(taskDataArguments: any): Promise<void> {
    const { delay } = taskDataArguments;
    
    while (BackgroundActions.isRunning()) {
      // Call tick handler if registered
      if (this.onTick) {
        try {
          this.onTick();
        } catch (error) {
          console.error('[Background] Tick error:', error);
        }
      }
      
      await sleep(delay);
    }
  }

  /**
   * Start background service (Android only)
   */
  async start(options?: BackgroundTaskOptions): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('[Background] Background service only available on Android');
      return;
    }

    if (this.isRunning) {
      console.log('[Background] Already running');
      return;
    }

    this.onTick = options?.onTick || null;

    const taskOptions = {
      taskName: 'HeyClaw',
      taskTitle: 'HeyClaw is listening',
      taskDesc: 'Waiting for wake word...',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#6366f1',
      linkingURI: 'heyclaw://home',
      parameters: {
        delay: 5000, // Check every 5 seconds
      },
    };

    try {
      await BackgroundActions.start(
        this.backgroundTask.bind(this),
        taskOptions
      );
      this.isRunning = true;
      console.log('[Background] Service started');
    } catch (error) {
      console.error('[Background] Failed to start service:', error);
      throw error;
    }
  }

  /**
   * Stop background service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await BackgroundActions.stop();
      this.isRunning = false;
      this.onTick = null;
      console.log('[Background] Service stopped');
    } catch (error) {
      console.error('[Background] Failed to stop service:', error);
      throw error;
    }
  }

  /**
   * Update notification
   */
  async updateNotification(title: string, desc: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await BackgroundActions.updateNotification({
        taskTitle: title,
        taskDesc: desc,
      });
    } catch (error) {
      console.error('[Background] Failed to update notification:', error);
    }
  }

  /**
   * Check if service is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const backgroundService = new BackgroundService();
