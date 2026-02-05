/**
 * Model Download Service
 * 
 * Handles downloading, extracting, and managing Vosk speech recognition models.
 * Models are downloaded as ZIP files and extracted to the app's document directory.
 */

import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

// ============================================================================
// Types
// ============================================================================

export interface VoskModel {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  size: string;
  sizeBytes: number;
  url: string;
  recommended?: boolean;
}

export interface InstalledModel {
  id: string;
  name: string;
  language: string;
  path: string;
  sizeBytes: number;
  installedAt: number;
}

export interface DownloadProgress {
  modelId: string;
  bytesWritten: number;
  contentLength: number;
  progress: number; // 0-100
  status: 'downloading' | 'extracting' | 'complete' | 'error';
  error?: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

// ============================================================================
// Available Models
// ============================================================================

export const AVAILABLE_MODELS: VoskModel[] = [
  {
    id: 'vosk-model-small-de-0.15',
    name: 'German (Small)',
    language: 'Deutsch',
    languageCode: 'de',
    size: '45 MB',
    sizeBytes: 45 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip',
    recommended: true,
  },
  {
    id: 'vosk-model-small-en-us-0.15',
    name: 'English US (Small)',
    language: 'English',
    languageCode: 'en',
    size: '40 MB',
    sizeBytes: 40 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
  },
  {
    id: 'vosk-model-de-0.21',
    name: 'German (Large)',
    language: 'Deutsch',
    languageCode: 'de',
    size: '1.9 GB',
    sizeBytes: 1.9 * 1024 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-de-0.21.zip',
  },
  {
    id: 'vosk-model-en-us-0.22',
    name: 'English US (Large)',
    language: 'English',
    languageCode: 'en',
    size: '1.8 GB',
    sizeBytes: 1.8 * 1024 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip',
  },
  {
    id: 'vosk-model-small-es-0.42',
    name: 'Spanish (Small)',
    language: 'Español',
    languageCode: 'es',
    size: '39 MB',
    sizeBytes: 39 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip',
  },
  {
    id: 'vosk-model-small-fr-0.22',
    name: 'French (Small)',
    language: 'Français',
    languageCode: 'fr',
    size: '41 MB',
    sizeBytes: 41 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip',
  },
  {
    id: 'vosk-model-small-it-0.22',
    name: 'Italian (Small)',
    language: 'Italiano',
    languageCode: 'it',
    size: '48 MB',
    sizeBytes: 48 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip',
  },
  {
    id: 'vosk-model-small-ru-0.22',
    name: 'Russian (Small)',
    language: 'Русский',
    languageCode: 'ru',
    size: '45 MB',
    sizeBytes: 45 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',
  },
  {
    id: 'vosk-model-small-pt-0.3',
    name: 'Portuguese (Small)',
    language: 'Português',
    languageCode: 'pt',
    size: '31 MB',
    sizeBytes: 31 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip',
  },
  {
    id: 'vosk-model-small-cn-0.22',
    name: 'Chinese (Small)',
    language: '中文',
    languageCode: 'zh',
    size: '42 MB',
    sizeBytes: 42 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip',
  },
  {
    id: 'vosk-model-small-ja-0.22',
    name: 'Japanese (Small)',
    language: '日本語',
    languageCode: 'ja',
    size: '48 MB',
    sizeBytes: 48 * 1024 * 1024,
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-ja-0.22.zip',
  },
];

// ============================================================================
// Model Download Service
// ============================================================================

class ModelDownloadService {
  private modelsDir: string;
  private activeDownloads: Map<string, number> = new Map(); // modelId -> jobId

  constructor() {
    this.modelsDir = `${RNFS.DocumentDirectoryPath}/vosk-models`;
  }

  /**
   * Initialize the service and ensure models directory exists
   */
  async initialize(): Promise<void> {
    const exists = await RNFS.exists(this.modelsDir);
    if (!exists) {
      await RNFS.mkdir(this.modelsDir);
      console.log('[ModelDownload] Created models directory:', this.modelsDir);
    }
  }

  /**
   * Get the base models directory path
   */
  getModelsDirectory(): string {
    return this.modelsDir;
  }

  /**
   * Get list of installed models
   */
  async getInstalledModels(): Promise<InstalledModel[]> {
    await this.initialize();
    
    const installed: InstalledModel[] = [];
    
    try {
      const items = await RNFS.readDir(this.modelsDir);
      
      for (const item of items) {
        if (item.isDirectory()) {
          // Check if this is a valid Vosk model directory
          const modelConfPath = `${item.path}/conf/model.conf`;
          const ivectorPath = `${item.path}/ivector`;
          const amPath = `${item.path}/am`;
          
          // A valid Vosk model has at least one of these
          const hasConf = await RNFS.exists(modelConfPath);
          const hasIvector = await RNFS.exists(ivectorPath);
          const hasAm = await RNFS.exists(amPath);
          
          if (hasConf || hasIvector || hasAm) {
            const modelInfo = AVAILABLE_MODELS.find(m => m.id === item.name);
            const stats = await RNFS.stat(item.path);
            
            installed.push({
              id: item.name,
              name: modelInfo?.name || item.name,
              language: modelInfo?.language || 'Unknown',
              path: item.path,
              sizeBytes: await this.getDirectorySize(item.path),
              installedAt: new Date(stats.mtime).getTime(),
            });
          }
        }
      }
    } catch (error) {
      console.error('[ModelDownload] Error reading installed models:', error);
    }
    
    return installed;
  }

  /**
   * Get the path for a specific model (if installed)
   */
  async getModelPath(modelId: string): Promise<string | null> {
    const modelPath = `${this.modelsDir}/${modelId}`;
    const exists = await RNFS.exists(modelPath);
    return exists ? modelPath : null;
  }

  /**
   * Check if a model is installed
   */
  async isModelInstalled(modelId: string): Promise<boolean> {
    const path = await this.getModelPath(modelId);
    return path !== null;
  }

  /**
   * Download and install a model
   */
  async downloadModel(
    model: VoskModel,
    onProgress: ProgressCallback
  ): Promise<string> {
    await this.initialize();

    const zipPath = `${RNFS.CachesDirectoryPath}/${model.id}.zip`;
    const extractPath = `${this.modelsDir}/${model.id}`;

    // Check if already downloading
    if (this.activeDownloads.has(model.id)) {
      throw new Error('Model is already being downloaded');
    }

    // Clean up any existing partial download
    if (await RNFS.exists(zipPath)) {
      await RNFS.unlink(zipPath);
    }

    try {
      // Start download
      console.log('[ModelDownload] Starting download:', model.id);
      
      const downloadResult = RNFS.downloadFile({
        fromUrl: model.url,
        toFile: zipPath,
        background: true,
        discretionary: false,
        cacheable: false,
        progressInterval: 500,
        progressDivider: 1,
        begin: (res) => {
          console.log('[ModelDownload] Download started, size:', res.contentLength);
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          onProgress({
            modelId: model.id,
            bytesWritten: res.bytesWritten,
            contentLength: res.contentLength,
            progress: Math.min(progress, 99), // Reserve 99-100 for extraction
            status: 'downloading',
          });
        },
      });

      this.activeDownloads.set(model.id, downloadResult.jobId);

      const result = await downloadResult.promise;
      this.activeDownloads.delete(model.id);

      if (result.statusCode !== 200) {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }

      console.log('[ModelDownload] Download complete, extracting...');

      // Update status to extracting
      onProgress({
        modelId: model.id,
        bytesWritten: result.bytesWritten,
        contentLength: result.bytesWritten,
        progress: 99,
        status: 'extracting',
      });

      // Remove existing model directory if it exists
      if (await RNFS.exists(extractPath)) {
        await RNFS.unlink(extractPath);
      }

      // Extract the zip
      const unzippedPath = await unzip(zipPath, this.modelsDir);
      console.log('[ModelDownload] Extracted to:', unzippedPath);

      // The zip might extract to a different folder name, rename if needed
      const extractedItems = await RNFS.readDir(this.modelsDir);
      const newFolder = extractedItems.find(
        item => item.isDirectory() && 
        item.name !== model.id && 
        item.name.includes(model.id.replace('vosk-model-', ''))
      );
      
      if (newFolder && newFolder.path !== extractPath) {
        // Model extracted with different name, rename
        if (await RNFS.exists(extractPath)) {
          await RNFS.unlink(extractPath);
        }
        await RNFS.moveFile(newFolder.path, extractPath);
      }

      // Clean up zip file
      await RNFS.unlink(zipPath);

      // Report completion
      onProgress({
        modelId: model.id,
        bytesWritten: result.bytesWritten,
        contentLength: result.bytesWritten,
        progress: 100,
        status: 'complete',
      });

      console.log('[ModelDownload] Model installed:', extractPath);
      return extractPath;

    } catch (error: any) {
      this.activeDownloads.delete(model.id);
      
      // Clean up partial download
      if (await RNFS.exists(zipPath)) {
        await RNFS.unlink(zipPath);
      }

      onProgress({
        modelId: model.id,
        bytesWritten: 0,
        contentLength: 0,
        progress: 0,
        status: 'error',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Cancel an active download
   */
  cancelDownload(modelId: string): void {
    const jobId = this.activeDownloads.get(modelId);
    if (jobId) {
      RNFS.stopDownload(jobId);
      this.activeDownloads.delete(modelId);
      console.log('[ModelDownload] Download cancelled:', modelId);
    }
  }

  /**
   * Delete an installed model
   */
  async deleteModel(modelId: string): Promise<void> {
    const modelPath = `${this.modelsDir}/${modelId}`;
    
    if (await RNFS.exists(modelPath)) {
      await RNFS.unlink(modelPath);
      console.log('[ModelDownload] Deleted model:', modelId);
    }
  }

  /**
   * Get available disk space in bytes
   */
  async getAvailableSpace(): Promise<number> {
    try {
      const info = await RNFS.getFSInfo();
      return info.freeSpace;
    } catch (error) {
      console.error('[ModelDownload] Error getting disk space:', error);
      return 0;
    }
  }

  /**
   * Get total models directory size
   */
  async getTotalModelsSize(): Promise<number> {
    await this.initialize();
    return this.getDirectorySize(this.modelsDir);
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(path: string): Promise<number> {
    let totalSize = 0;
    
    try {
      const items = await RNFS.readDir(path);
      
      for (const item of items) {
        if (item.isDirectory()) {
          totalSize += await this.getDirectorySize(item.path);
        } else {
          totalSize += item.size;
        }
      }
    } catch (error) {
      console.error('[ModelDownload] Error calculating size:', error);
    }
    
    return totalSize;
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

// Singleton instance
export const modelDownloadService = new ModelDownloadService();
