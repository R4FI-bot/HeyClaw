/**
 * Status Indicator Component
 * Shows current connection and listening status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectionState, useListeningState } from '../store';
import { COLORS } from '../constants';
import type { ConnectionState, ListeningState } from '../types';

const getConnectionColor = (state: ConnectionState): string => {
  switch (state) {
    case 'connected':
      return COLORS.success;
    case 'connecting':
      return COLORS.warning;
    case 'error':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

const getConnectionText = (state: ConnectionState): string => {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'error':
      return 'Connection Error';
    default:
      return 'Disconnected';
  }
};

const getListeningColor = (state: ListeningState): string => {
  switch (state) {
    case 'wake_word':
      return COLORS.listening;
    case 'recording':
      return COLORS.recording;
    case 'processing':
      return COLORS.processing;
    default:
      return COLORS.textSecondary;
  }
};

const getListeningText = (state: ListeningState): string => {
  switch (state) {
    case 'wake_word':
      return 'Listening for wake word...';
    case 'recording':
      return 'Recording...';
    case 'processing':
      return 'Processing...';
    default:
      return 'Idle';
  }
};

export const StatusIndicator: React.FC = () => {
  const connectionState = useConnectionState();
  const listeningState = useListeningState();

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getConnectionColor(connectionState) },
          ]}
        />
        <Text style={styles.statusText}>{getConnectionText(connectionState)}</Text>
      </View>

      {/* Listening Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getListeningColor(listeningState) },
            listeningState === 'recording' && styles.pulsing,
          ]}
        />
        <Text style={styles.statusText}>{getListeningText(listeningState)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 14,
  },
  pulsing: {
    // Animation would be handled with Animated API
  },
});
