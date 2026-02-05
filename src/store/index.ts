/**
 * HeyClaw Global State Store (Zustand)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, ConnectionState, ListeningState, ConversationItem, AppSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Connection
      connectionState: 'disconnected' as ConnectionState,
      setConnectionState: (connectionState) => set({ connectionState }),

      // Listening
      listeningState: 'idle' as ListeningState,
      setListeningState: (listeningState) => set({ listeningState }),

      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Conversation
      conversation: [] as ConversationItem[],
      addMessage: (item) =>
        set((state) => ({
          conversation: [...state.conversation, item],
        })),
      clearConversation: () => set({ conversation: [] }),

      // Audio queue
      audioQueue: [] as string[],
      addToAudioQueue: (url) =>
        set((state) => ({
          audioQueue: [...state.audioQueue, url],
        })),
      removeFromAudioQueue: () => {
        const queue = get().audioQueue;
        if (queue.length === 0) return undefined;
        const [first, ...rest] = queue;
        set({ audioQueue: rest });
        return first;
      },

      // Errors
      lastError: null,
      setError: (lastError) => set({ lastError }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        // Don't persist conversation or runtime state
      }),
    }
  )
);

// Selectors for common use cases
export const useConnectionState = () => useAppStore((state) => state.connectionState);
export const useListeningState = () => useAppStore((state) => state.listeningState);
export const useSettings = () => useAppStore((state) => state.settings);
export const useConversation = () => useAppStore((state) => state.conversation);
