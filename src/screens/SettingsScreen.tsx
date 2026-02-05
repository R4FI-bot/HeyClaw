/**
 * Settings Screen
 * Configure gateway connection, wake word, STT/TTS providers
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useAppStore } from '../store';
import { COLORS, SUGGESTED_WAKE_WORDS, PLATFORM_FEATURES, STT_PROVIDERS } from '../constants';
import type { TTSProvider, STTProvider } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const TTS_PROVIDERS: { label: string; value: TTSProvider; description: string }[] = [
  { label: '📱 Device (Default)', value: 'device', description: 'On-device TTS, works offline' },
  { label: '🌐 Custom Endpoint', value: 'custom', description: 'Self-hosted Piper or XTTS' },
  { label: '🎙️ ElevenLabs', value: 'elevenlabs', description: 'Cloud TTS, requires API key' },
];

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings, clearConversation } = useAppStore();
  
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayToken, setGatewayToken] = useState(settings.gatewayToken);
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Wake word state
  const [customWakeWord, setCustomWakeWord] = useState(settings.wakeWord || 'computer');
  
  // STT state
  const [sttProvider, setSttProvider] = useState<STTProvider>(settings.sttProvider || 'vosk');
  const [customSTTUrl, setCustomSTTUrl] = useState(settings.customSTTUrl || '');
  
  // TTS state
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>(settings.ttsProvider || 'device');
  const [customTTSUrl, setCustomTTSUrl] = useState(settings.customTTSUrl || '');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(settings.elevenLabsApiKey || '');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState(settings.elevenLabsVoiceId || '');
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);

  const handleSave = () => {
    updateSettings({
      gatewayUrl,
      gatewayToken,
      wakeWord: customWakeWord.toLowerCase().trim(),
      sttProvider,
      customSTTUrl,
      // voskModelPath is managed by ModelManagerScreen
      ttsProvider,
      customTTSUrl,
      elevenLabsApiKey,
      elevenLabsVoiceId,
    });
    Alert.alert('Saved', 'Settings have been saved');
  };

  const handleWakeWordSelect = (wakeWord: string) => {
    setCustomWakeWord(wakeWord);
    updateSettings({ wakeWord: wakeWord.toLowerCase() });
  };

  const handleClearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => clearConversation(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Gateway Connection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔌 Gateway Connection</Text>
          <Text style={styles.sectionDescription}>
            Connect to your OpenClaw gateway
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gateway Address</Text>
            <TextInput
              style={styles.input}
              value={gatewayUrl}
              onChangeText={setGatewayUrl}
              placeholder="192.168.1.100:18789"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.hint}>
              Your OpenClaw gateway IP and port (find in Control UI)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gateway Token</Text>
            <View style={styles.tokenContainer}>
              <TextInput
                style={[styles.input, styles.tokenInput]}
                value={gatewayToken}
                onChangeText={setGatewayToken}
                placeholder="Enter your gateway token"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowToken(!showToken)}
              >
                <Text style={styles.toggleText}>{showToken ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Found in Control UI URL: ?token=YOUR_TOKEN
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Wake Word */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Wake Word</Text>
          <Text style={styles.sectionDescription}>
            Say this phrase to activate HeyClaw (powered by Vosk)
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custom Wake Word</Text>
            <TextInput
              style={styles.input}
              value={customWakeWord}
              onChangeText={setCustomWakeWord}
              placeholder="computer"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Any word works! Try your name, "hey claw", or anything you like.
            </Text>
          </View>
          
          <Text style={styles.label}>Quick Select</Text>
          <View style={styles.wakeWordGrid}>
            {SUGGESTED_WAKE_WORDS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.wakeWordButton,
                  customWakeWord.toLowerCase() === item.value && styles.wakeWordButtonActive,
                ]}
                onPress={() => handleWakeWordSelect(item.value)}
              >
                <Text
                  style={[
                    styles.wakeWordText,
                    customWakeWord.toLowerCase() === item.value && styles.wakeWordTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Wake word detection is 100% offline using Vosk - no API keys or cloud needed!
            </Text>
          </View>
        </View>

        {/* Speech-to-Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Speech-to-Text</Text>
          <Text style={styles.sectionDescription}>
            How your voice is transcribed after wake word
          </Text>

          <View style={styles.providerGrid}>
            {STT_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.value}
                style={[
                  styles.providerButton,
                  sttProvider === provider.value && styles.providerButtonActive,
                ]}
                onPress={() => setSttProvider(provider.value)}
              >
                <Text
                  style={[
                    styles.providerLabel,
                    sttProvider === provider.value && styles.providerLabelActive,
                  ]}
                >
                  {provider.label}
                </Text>
                <Text style={styles.providerDesc}>{provider.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {sttProvider === 'vosk' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Voice Model</Text>
              
              {settings.voskModelPath ? (
                <View style={styles.activeModelCard}>
                  <View style={styles.activeModelInfo}>
                    <Text style={styles.activeModelLabel}>Active Model:</Text>
                    <Text style={styles.activeModelName}>
                      {settings.voskModelPath.split('/').pop() || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={styles.activeModelStatus}>✓ Ready</Text>
                </View>
              ) : (
                <View style={styles.noModelCard}>
                  <Text style={styles.noModelEmoji}>📥</Text>
                  <Text style={styles.noModelText}>
                    No model installed. Download one to enable wake word detection.
                  </Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.modelManagerButton} 
                onPress={() => navigation.navigate('ModelManager')}
              >
                <Text style={styles.modelManagerButtonText}>
                  🎤 {settings.voskModelPath ? 'Manage Voice Models' : 'Download Voice Model'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.hint}>
                Download and manage speech recognition models directly in the app
              </Text>
            </View>
          )}

          {sttProvider === 'custom' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Custom STT URL</Text>
              <TextInput
                style={styles.input}
                value={customSTTUrl}
                onChangeText={setCustomSTTUrl}
                placeholder="https://your-whisper-server/transcribe"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.hint}>
                Whisper API endpoint. Expects POST with audio file, returns {`{ text: "..." }`}
              </Text>
            </View>
          )}

          {sttProvider === 'device' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Using Google/Apple cloud speech recognition. Good accuracy but requires internet.
              </Text>
            </View>
          )}
        </View>

        {/* Text-to-Speech */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Text-to-Speech</Text>
          <Text style={styles.sectionDescription}>
            How responses are spoken back to you
          </Text>

          <View style={styles.providerGrid}>
            {TTS_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.value}
                style={[
                  styles.providerButton,
                  ttsProvider === provider.value && styles.providerButtonActive,
                ]}
                onPress={() => setTtsProvider(provider.value)}
              >
                <Text
                  style={[
                    styles.providerLabel,
                    ttsProvider === provider.value && styles.providerLabelActive,
                  ]}
                >
                  {provider.label}
                </Text>
                <Text style={styles.providerDesc}>{provider.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {ttsProvider === 'custom' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Custom TTS URL</Text>
              <TextInput
                style={styles.input}
                value={customTTSUrl}
                onChangeText={setCustomTTSUrl}
                placeholder="https://your-tts-server/synthesize"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.hint}>
                Piper/XTTS endpoint. POST with {`{ text: "..." }`}, returns audio/wav
              </Text>
            </View>
          )}

          {ttsProvider === 'elevenlabs' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ElevenLabs API Key</Text>
                <View style={styles.tokenContainer}>
                  <TextInput
                    style={[styles.input, styles.tokenInput]}
                    value={elevenLabsApiKey}
                    onChangeText={setElevenLabsApiKey}
                    placeholder="Your ElevenLabs API key"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry={!showElevenLabsKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowElevenLabsKey(!showElevenLabsKey)}
                  >
                    <Text style={styles.toggleText}>{showElevenLabsKey ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Voice ID</Text>
                <TextInput
                  style={styles.input}
                  value={elevenLabsVoiceId}
                  onChangeText={setElevenLabsVoiceId}
                  placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>
                  Find voice IDs at elevenlabs.io/voice-library
                </Text>
              </View>
            </>
          )}

          {ttsProvider === 'device' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Using native device TTS. Works offline, supports multiple languages!
              </Text>
            </View>
          )}
        </View>

        {/* Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Behavior</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-play responses</Text>
              <Text style={styles.settingDescription}>
                Automatically play audio responses
              </Text>
            </View>
            <Switch
              value={settings.autoPlayResponses}
              onValueChange={(value) => updateSettings({ autoPlayResponses: value })}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic feedback</Text>
              <Text style={styles.settingDescription}>
                Vibrate on wake word detection
              </Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(value) => updateSettings({ hapticFeedback: value })}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {PLATFORM_FEATURES.supportsScreenOffOperation && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Keep screen on</Text>
                <Text style={styles.settingDescription}>
                  Prevent screen from turning off
                </Text>
              </View>
              <Switch
                value={settings.keepScreenOn}
                onValueChange={(value) => updateSettings({ keepScreenOn: value })}
                trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>
          )}
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.advancedHeader}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.sectionTitle}>🔧 Advanced</Text>
            <Text style={styles.expandIcon}>{showAdvanced ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedContent}>
              {/* Platform Info */}
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>
                  {PLATFORM_FEATURES.supportsBackgroundWakeWord ? '✅' : '❌'} Background wake word
                </Text>
                <Text style={styles.featureItem}>
                  {PLATFORM_FEATURES.supportsScreenOffOperation ? '✅' : '❌'} Screen off operation
                </Text>
                <Text style={styles.featureItem}>
                  {PLATFORM_FEATURES.supportsAutoStart ? '✅' : '❌'} Auto-start on boot
                </Text>
              </View>

              {Platform.OS === 'ios' && (
                <Text style={styles.note}>
                  ℹ️ iOS limitations: Wake word detection only works while the app is open due to Apple restrictions.
                </Text>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  🎉 No API keys required! HeyClaw uses Vosk for fully offline wake word detection and speech recognition.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗑️ Data</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearConversation}
          >
            <Text style={styles.dangerButtonText}>Clear Conversation History</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>HeyClaw v1.0.0 • Powered by Vosk</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenInput: {
    flex: 1,
  },
  toggleButton: {
    padding: 12,
    marginLeft: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 20,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  linkButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  modelInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  modelInfoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modelInfoItem: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  activeModelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  activeModelInfo: {
    flex: 1,
  },
  activeModelLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  activeModelName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  activeModelStatus: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  noModelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  noModelEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  noModelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modelManagerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modelManagerButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  wakeWordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  wakeWordButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wakeWordButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  wakeWordText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  wakeWordTextActive: {
    color: COLORS.text,
  },
  providerGrid: {
    gap: 8,
    marginBottom: 16,
  },
  providerButton: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  providerLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  providerLabelActive: {
    color: COLORS.text,
  },
  providerDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  advancedContent: {
    marginTop: 16,
  },
  featureList: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: COLORS.text,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 16,
    marginBottom: 32,
  },
});
