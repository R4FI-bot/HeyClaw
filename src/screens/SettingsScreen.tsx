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
import type { WakeWordOption } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings, clearConversation } = useAppStore();
  
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayToken, setGatewayToken] = useState(settings.gatewayToken);
  const [showToken, setShowToken] = useState(false);

  const handleSave = () => {
    updateSettings({
      gatewayUrl,
      gatewayToken,
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
          <Text style={styles.sectionTitle}>Gateway Connection</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gateway URL</Text>
            <TextInput
              style={styles.input}
              value={gatewayUrl}
              onChangeText={setGatewayUrl}
              placeholder="ws://localhost:18789"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Access Token</Text>
            <View style={styles.tokenContainer}>
              <TextInput
                style={[styles.input, styles.tokenInput]}
                value={gatewayToken}
                onChangeText={setGatewayToken}
                placeholder="Enter your access token"
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
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Wake Word */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wake Word</Text>
          <Text style={styles.sectionDescription}>
            Choose the phrase that activates HeyClaw
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

          <Text style={styles.note}>
            💡 Note: Custom wake words require a Picovoice Console account
          </Text>
        </View>

        {/* Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behavior</Text>

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

        {/* Platform Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Features</Text>
          
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

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearConversation}
          >
            <Text style={styles.dangerButtonText}>Clear Conversation History</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>HeyClaw v0.1.0</Text>
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
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
