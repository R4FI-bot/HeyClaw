/**
 * Conversation List Component
 * Shows history of messages between user and assistant
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useConversation } from '../store';
import { COLORS } from '../constants';
import type { ConversationItem } from '../types';

interface Props {
  onPlayAudio?: (audioUrl: string) => void;
}

const MessageBubble: React.FC<{
  item: ConversationItem;
  onPlayAudio?: (audioUrl: string) => void;
}> = ({ item, onPlayAudio }) => {
  const isUser = item.type === 'user';
  const hasAudio = !!item.audioUrl;

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isUser ? styles.userText : styles.assistantText,
        ]}
      >
        {item.content}
      </Text>
      
      <View style={styles.messageFooter}>
        {hasAudio && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlayAudio?.(item.audioUrl!)}
          >
            <Text style={styles.playButtonText}>
              {item.isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
};

export const ConversationList: React.FC<Props> = ({ onPlayAudio }) => {
  const conversation = useConversation();
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (conversation.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [conversation.length]);

  if (conversation.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>
          Say "Hey Claw" to start a conversation
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={conversation}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble item={item} onPlayAudio={onPlayAudio} />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.text,
  },
  assistantText: {
    color: COLORS.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 8,
  },
  playButton: {
    padding: 4,
  },
  playButtonText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
