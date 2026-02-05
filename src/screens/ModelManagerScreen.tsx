/**
 * Model Manager Screen
 * 
 * UI for downloading, managing, and selecting Vosk speech recognition models.
 * Users can download models directly in the app without manual PC setup.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import { useAppStore } from '../store';
import {
  modelDownloadService,
  AVAILABLE_MODELS,
  type VoskModel,
  type InstalledModel,
  type DownloadProgress,
} from '../services/ModelDownloadService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModelManager'>;
};

// Language flag emojis
const LANGUAGE_FLAGS: Record<string, string> = {
  de: '🇩🇪',
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  ru: '🇷🇺',
  pt: '🇧🇷',
  zh: '🇨🇳',
  ja: '🇯🇵',
};

export const ModelManagerScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const { settings, updateSettings } = useAppStore();
  
  const [installedModels, setInstalledModels] = useState<InstalledModel[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableSpace, setAvailableSpace] = useState(0);
  const [totalModelsSize, setTotalModelsSize] = useState(0);

  // Load installed models and storage info
  const loadData = useCallback(async () => {
    try {
      const [installed, space, modelsSize] = await Promise.all([
        modelDownloadService.getInstalledModels(),
        modelDownloadService.getAvailableSpace(),
        modelDownloadService.getTotalModelsSize(),
      ]);
      
      setInstalledModels(installed);
      setAvailableSpace(space);
      setTotalModelsSize(modelsSize);
    } catch (error) {
      console.error('[ModelManager] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Check if model is installed
  const isInstalled = (modelId: string): boolean => {
    return installedModels.some(m => m.id === modelId);
  };

  // Check if model is currently downloading
  const isDownloading = (modelId: string): boolean => {
    const progress = downloadProgress[modelId];
    return progress !== undefined && 
      (progress.status === 'downloading' || progress.status === 'extracting');
  };

  // Check if model is currently active
  const isActive = (modelId: string): boolean => {
    const modelPath = `${modelDownloadService.getModelsDirectory()}/${modelId}`;
    return settings.voskModelPath === modelPath;
  };

  // Download a model
  const handleDownload = async (model: VoskModel) => {
    // Check available space
    if (availableSpace < model.sizeBytes * 2) { // Need space for zip + extracted
      Alert.alert(
        'Insufficient Storage',
        `This model requires approximately ${model.size} of free space. Please free up some storage and try again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setDownloadProgress(prev => ({
        ...prev,
        [model.id]: {
          modelId: model.id,
          bytesWritten: 0,
          contentLength: model.sizeBytes,
          progress: 0,
          status: 'downloading',
        },
      }));

      const modelPath = await modelDownloadService.downloadModel(
        model,
        (progress) => {
          setDownloadProgress(prev => ({
            ...prev,
            [model.id]: progress,
          }));
        }
      );

      // Refresh installed models
      await loadData();

      // If this is the first model, set it as active
      if (!settings.voskModelPath) {
        updateSettings({ voskModelPath: modelPath });
        Alert.alert(
          'Model Ready! 🎉',
          `${model.name} has been downloaded and set as your active model. Wake word detection is now ready!`,
          [{ text: 'Awesome!' }]
        );
      } else {
        Alert.alert(
          'Download Complete',
          `${model.name} has been installed successfully.`,
          [{ text: 'OK' }]
        );
      }

      // Clear progress after a delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const updated = { ...prev };
          delete updated[model.id];
          return updated;
        });
      }, 2000);

    } catch (error: any) {
      Alert.alert(
        'Download Failed',
        `Failed to download ${model.name}: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Cancel download
  const handleCancelDownload = (modelId: string) => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel this download?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            modelDownloadService.cancelDownload(modelId);
            setDownloadProgress(prev => {
              const updated = { ...prev };
              delete updated[modelId];
              return updated;
            });
          },
        },
      ]
    );
  };

  // Delete a model
  const handleDelete = (model: InstalledModel) => {
    const isCurrentlyActive = isActive(model.id);
    
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${model.name}? This will free up ${modelDownloadService.constructor.name}.${model.sizeBytes ? ` (${modelDownloadService.constructor.prototype.constructor.name})` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await modelDownloadService.deleteModel(model.id);
              
              // If this was the active model, clear the setting
              if (isCurrentlyActive) {
                updateSettings({ voskModelPath: '' });
              }
              
              await loadData();
              
              Alert.alert('Deleted', `${model.name} has been removed.`);
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // Set model as active
  const handleSetActive = (model: InstalledModel) => {
    updateSettings({ voskModelPath: model.path });
    Alert.alert(
      'Model Activated',
      `${model.name} is now your active speech recognition model.`,
      [{ text: 'OK' }]
    );
  };

  // Render progress bar
  const renderProgressBar = (progress: DownloadProgress) => {
    const statusText = progress.status === 'extracting' 
      ? 'Extracting...' 
      : `${Math.round(progress.progress)}%`;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progress.progress}%` }
            ]} 
          />
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {statusText}
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelDownload(progress.modelId)}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render a model card
  const renderModelCard = (model: VoskModel) => {
    const installed = isInstalled(model.id);
    const downloading = isDownloading(model.id);
    const active = isActive(model.id);
    const progress = downloadProgress[model.id];
    const flag = LANGUAGE_FLAGS[model.languageCode] || '🌐';

    return (
      <View 
        key={model.id} 
        style={[
          styles.modelCard,
          active && styles.modelCardActive,
        ]}
      >
        <View style={styles.modelHeader}>
          <View style={styles.modelTitleRow}>
            <Text style={styles.modelFlag}>{flag}</Text>
            <View style={styles.modelTitleContainer}>
              <Text style={styles.modelName}>{model.name}</Text>
              {model.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>⭐ Recommended</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.modelMeta}>
            <Text style={styles.modelSize}>{model.size}</Text>
            {installed && (
              <View style={styles.installedBadge}>
                <Text style={styles.installedText}>✓ Installed</Text>
              </View>
            )}
            {active && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>● Active</Text>
              </View>
            )}
          </View>
        </View>

        {downloading && progress && renderProgressBar(progress)}

        <View style={styles.modelActions}>
          {!installed && !downloading && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownload(model)}
            >
              <Text style={styles.downloadButtonText}>📥 Download</Text>
            </TouchableOpacity>
          )}
          
          {installed && !active && (
            <>
              <TouchableOpacity
                style={styles.activateButton}
                onPress={() => {
                  const installedModel = installedModels.find(m => m.id === model.id);
                  if (installedModel) handleSetActive(installedModel);
                }}
              >
                <Text style={styles.activateButtonText}>Use This Model</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  const installedModel = installedModels.find(m => m.id === model.id);
                  if (installedModel) handleDelete(installedModel);
                }}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}

          {installed && active && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeIndicatorText}>✓ Currently Active</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading models...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasNoModels = installedModels.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.title}>🎤 Voice Models</Text>
          <Text style={styles.subtitle}>
            Download a speech recognition model to enable offline wake word detection and voice recognition.
          </Text>
        </View>

        {/* Storage Info */}
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>📦 Storage</Text>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Models installed:</Text>
            <Text style={styles.storageValue}>
              {modelDownloadService.constructor.prototype.constructor.name === 'ModelDownloadService' 
                ? `${installedModels.length} (${formatBytes(totalModelsSize)})`
                : `${installedModels.length}`}
            </Text>
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Available space:</Text>
            <Text style={styles.storageValue}>{formatBytes(availableSpace)}</Text>
          </View>
        </View>

        {/* First Time Setup Banner */}
        {hasNoModels && (
          <View style={styles.setupBanner}>
            <Text style={styles.setupEmoji}>👋</Text>
            <Text style={styles.setupTitle}>Get Started</Text>
            <Text style={styles.setupText}>
              Download a voice model to enable wake word detection. 
              We recommend starting with the German (Small) model - it's fast and accurate!
            </Text>
          </View>
        )}

        {/* Models List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Models</Text>
          <Text style={styles.sectionSubtitle}>
            Small models are faster and use less storage. Large models are more accurate.
          </Text>
          
          {AVAILABLE_MODELS.map(model => renderModelCard(model))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Tips</Text>
          <Text style={styles.infoText}>
            • Small models (~45 MB) work great for wake word detection{'\n'}
            • Large models (~1.9 GB) provide better accuracy for full transcription{'\n'}
            • You can have multiple models installed and switch between them{'\n'}
            • All processing happens on-device - no internet needed after download
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  storageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  storageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  storageValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  setupBanner: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  setupEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelCardActive: {
    borderColor: COLORS.primary,
  },
  modelHeader: {
    marginBottom: 12,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  modelTitleContainer: {
    flex: 1,
  },
  modelName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommendedBadge: {
    backgroundColor: COLORS.warning + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  recommendedText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelSize: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  installedBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  installedText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cancelButton: {
    padding: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  modelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activateButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activateButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  activeIndicator: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeIndicatorText: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
