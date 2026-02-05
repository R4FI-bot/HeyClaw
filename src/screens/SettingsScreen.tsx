/**
 * Settings Screen
 * Configure gateway connection, wake word, and other options
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
import { COLORS, AVAILABLE_WAKE_WORDS, PLATFORM_FEATURES } from '../constants';
import type { WakeWordOption, TTSProvider } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const TTS_PROVIDERS: { label: string; value: TTSProvider; description: string }[] = [
  { label: '📱 Device (Default)', value: 'device', description: 'On-device TTS, no API keys needed' },
  { label: '🌐 Custom Endpoint', value: 'custom', description: 'Self-hosted Piper or XTTS' },
  { label: '🎙️ ElevenLabs', value: 'elevenlabs', description: 'Cloud TTS, requires API key' },
];

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings, clearConversation } = useAppStore();
  
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayToken, setGatewayToken] = useState(settings.gatewayToken);
  const [picovoiceKey, setPicovoiceKey] = useState(settings.picovoiceAccessKey || '');
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // STT state
  const [useCustomSTT, setUseCustomSTT] = useState(settings.useCustomSTT || false);
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
      picovoiceAccessKey: picovoiceKey,
      useCustomSTT,
      customSTTUrl,
      ttsProvider,
      customTTSUrl,
      elevenLabsApiKey,
      elevenLabsVoiceId,
    });
    Alert.alert('Saved', 'Settings have been saved');
  };

  const handleWakeWordSelect = (wakeWord: WakeWordOption) => {
    updateSettings({ wakeWord });
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
            <Text style={styles.saveButtonText}>Save Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Wake Word */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Wake Word</Text>
          <Text style={styles.sectionDescription}>
            Say this phrase to activate HeyClaw
          </Text>
          
          <View style={styles.wakeWordGrid}>
            {AVAILABLE_WAKE_WORDS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.wakeWordButton,
                  settings.wakeWord === item.value && styles.wakeWordButtonActive,
                ]}
                onPress={() => handleWakeWordSelect(item.value)}
              >
                <Text
                  style={[
                    styles.wakeWordText,
                    settings.wakeWord === item.value && styles.wakeWordTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 All wake words work offline using Porcupine - no cloud required!
            </Text>
          </View>
        </View>

        {/* Speech-to-Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Speech-to-Text</Text>
          <Text style={styles.sectionDescription}>
            How your voice is transcribed to text
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Use custom STT endpoint</Text>
              <Text style={styles.settingDescription}>
                Self-hosted Whisper or compatible API
              </Text>
            </View>
            <Switch
              value={useCustomSTT}
              onValueChange={setUseCustomSTT}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {useCustomSTT && (
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

          {!useCustomSTT && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Using on-device speech recognition (Google/Apple). Works offline, no API keys needed!
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

          <View style={styles.ttsProviderGrid}>
            {TTS_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.value}
                style={[
                  styles.ttsProviderButton,
                  ttsProvider === provider.value && styles.ttsProviderButtonActive,
                ]}
                onPress={() => setTtsProvider(provider.value)}
              >
                <Text
                  style={[
                    styles.ttsProviderLabel,
                    ttsProvider === provider.value && styles.ttsProviderLabelActive,
                  ]}
                >
                  {provider.label}
                </Text>
                <Text style={styles.ttsProviderDesc}>{provider.description}</Text>
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Picovoice Access Key (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={picovoiceKey}
                  onChangeText={setPicovoiceKey}
                  placeholder="For custom wake words only"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>
                  Only needed if you want to train custom wake words via console.picovoice.ai
                </Text>
              </View>

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
        <Text style={styles.version}>HeyClaw v1.0.0</Text>
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
  ttsProviderGrid: {
    gap: 8,
    marginBottom: 16,
  },
  ttsProviderButton: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ttsProviderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  ttsProviderLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  ttsProviderLabelActive: {
    color: COLORS.text,
  },
  ttsProviderDesc: {
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
    marginTop: 16,
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
