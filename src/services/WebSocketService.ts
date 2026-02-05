/**
 * WebSocket Service for OpenClaw Gateway Communication
 */

import { WS_CONFIG } from '../constants';
import type { GatewayMessage, OutgoingMessage } from '../types';

type MessageHandler = (message: GatewayMessage) => void;
type StatusHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private isIntentionalClose: boolean = false;

  /**
   * Connect to the OpenClaw Gateway
   */
  connect(url: string, token: string): void {
    this.url = url;
    this.token = token;
    this.isIntentionalClose = false;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Add token to URL as query parameter
      const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.reconnectAttempts = 0;
    this.notifyStatusHandlers(true);
    this.startPingInterval();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: GatewayMessage = JSON.parse(event.data);
      this.notifyMessageHandlers(message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Disconnected:', event.code, event.reason);
    this.cleanup();
    this.notifyStatusHandlers(false);

    if (!this.isIntentionalClose) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    console.error('[WebSocket] Error:', error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting in ${WS_CONFIG.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, WS_CONFIG.reconnectInterval);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_CONFIG.pingInterval);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Disconnect from the gateway
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the gateway
   */
  send(message: OutgoingMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send - not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
      return false;
    }
  }

  /**
   * Send audio data to the gateway
   */
  sendAudio(audioBase64: string): boolean {
    return this.send({
      type: 'audio',
      audioBase64,
      timestamp: Date.now(),
    });
  }

  /**
   * Send text message to the gateway
   */
  sendText(content: string): boolean {
    return this.send({
      type: 'text',
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a status handler
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyMessageHandlers(message: GatewayMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WebSocket] Message handler error:', error);
      }
    });
  }

  private notifyStatusHandlers(connected: boolean): void {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('[WebSocket] Status handler error:', error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
