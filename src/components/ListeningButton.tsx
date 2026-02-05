/**
 * Main Listening Button Component
 * Large circular button that shows listening state and allows manual activation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useListeningState, useConnectionState } from '../store';
import { COLORS } from '../constants';
import type { ListeningState } from '../types';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
}

const getButtonColor = (state: ListeningState): string => {
  switch (state) {
    case 'wake_word':
      return COLORS.listening;
    case 'recording':
      return COLORS.recording;
    case 'processing':
      return COLORS.processing;
    default:
      return COLORS.surfaceLight;
  }
};

const getButtonText = (state: ListeningState): string => {
  switch (state) {
    case 'wake_word':
      return '🎤';
    case 'recording':
      return '🔴';
    case 'processing':
      return '⏳';
    default:
      return '🎙️';
  }
};

const getSubText = (state: ListeningState, connected: boolean): string => {
  if (!connected) {
    return 'Not connected';
  }
  switch (state) {
    case 'wake_word':
      return 'Say "Hey Claw"';
    case 'recording':
      return 'Listening...';
    case 'processing':
      return 'Thinking...';
    default:
      return 'Tap to start';
  }
};

export const ListeningButton: React.FC<Props> = ({ onPress, onLongPress }) => {
  const listeningState = useListeningState();
  const connectionState = useConnectionState();
  const isConnected = connectionState === 'connected';
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for recording
  useEffect(() => {
    if (listeningState === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [listeningState, pulseAnim]);

  // Rotation animation for processing
  useEffect(() => {
    if (listeningState === 'processing') {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [listeningState, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const buttonColor = getButtonColor(listeningState);
  const buttonText = getButtonText(listeningState);
  const subText = getSubText(listeningState, isConnected);

  return (
    <View style={styles.container}>
      {/* Outer ring for wake word listening */}
      {listeningState === 'wake_word' && (
        <View style={[styles.outerRing, { borderColor: COLORS.listening }]} />
      )}
      
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: listeningState === 'processing' ? spin : '0deg' },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: buttonColor },
            !isConnected && styles.disabled,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={!isConnected}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.subText}>{subText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    opacity: 0.5,
  },
  buttonWrapper: {
    width: 160,
    height: 160,
  },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 64,
  },
  subText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
