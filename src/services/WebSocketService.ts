/**
 * WebSocket Service for OpenClaw Gateway Communication
 * 
 * Implements the OpenClaw Gateway protocol:
 * 1. Connect with auth token
 * 2. Send messages via chat.send
 * 3. Receive responses as chat events
 */

import { WS_CONFIG } from '../constants';
import type {
  OpenClawMessage,
  OpenClawRequest,
  OpenClawResponse,
  OpenClawEvent,
  ChatEventPayload,
} from '../types';

// WebSocket event types (React Native compatible)
interface WSMessageEvent {
  data: string;
}

interface WSCloseEvent {
  code: number;
  reason: string;
}

type ChatHandler = (payload: ChatEventPayload) => void;
type StatusHandler = (connected: boolean) => void;
type ErrorHandler = (error: string) => void;

// Protocol version
const PROTOCOL_VERSION = 3;

// App info

const CLIENT_INFO = {
  id: 'openclaw-android',
  displayName: 'HeyClaw',
  version: '1.0.0',
  platform: 'android',
  mode: 'operator',
};
class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private chatHandlers: Set<ChatHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isIntentionalClose: boolean = false;
  private isConnected: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  /**
   * Generate unique request ID
   */
  private nextId(): string {
    return `hc-${++this.requestId}-${Date.now()}`;
  }

  /**
   * Connect to the OpenClaw Gateway
   */
  connect(gatewayUrl: string, token: string): void {
    // Parse URL - accept formats like "192.168.1.100:18789" or "ws://host:port"
    let wsUrl = gatewayUrl.trim();
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = `ws://${wsUrl}`;
    }
    
    this.url = wsUrl;
    this.token = token;
    this.isIntentionalClose = false;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('[WebSocket] Connecting to:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private async handleOpen(): Promise<void> {
    console.log('[WebSocket] Socket opened, sending connect request');
    this.reconnectAttempts = 0;
    
    try {
      // Send OpenClaw connect request
      await this.sendConnectRequest();
      console.log('[WebSocket] Connected and authenticated!');
      this.isConnected = true;
      this.notifyStatusHandlers(true);
      this.startPingInterval();
    } catch (error) {
      console.error('[WebSocket] Authentication failed:', error);
      this.notifyErrorHandlers((error as Error).message || 'Authentication failed');
      this.disconnect();
    }
  }

  /**
   * Send connect request with auth
   */
  private async sendConnectRequest(): Promise<void> {
    const params = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      auth: {
        token: this.token,
      },
      client: CLIENT_INFO,
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
    };

    const result = await this.sendRequest('connect', params);
    console.log('[WebSocket] Connect result:', result);
  }

  /**
   * Send a request and wait for response
   */
  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = this.nextId();
      const request: OpenClawRequest = {
        type: 'req',
        id,
        method,
        params,
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 30000);

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send request
      console.log('[WebSocket] Sending request:', method, id);
      this.ws.send(JSON.stringify(request));
    });
  }

  private handleMessage(event: WSMessageEvent): void {
    try {
      const message: OpenClawMessage = JSON.parse(event.data);
      console.log('[WebSocket] Received:', message.type, 
        'type' in message && message.type === 'event' ? (message as OpenClawEvent).event : '');

      switch (message.type) {
        case 'res':
          this.handleResponse(message as OpenClawResponse);
          break;
        case 'event':
          this.handleEvent(message as OpenClawEvent);
          break;
        default:
          console.log('[WebSocket] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleResponse(response: OpenClawResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('[WebSocket] Received response for unknown request:', response.id);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message || 'Request failed'));
    } else {
      pending.resolve(response.result);
    }
  }

  private handleEvent(event: OpenClawEvent): void {
    console.log('[WebSocket] Event:', event.event);
    
    switch (event.event) {
      case 'chat':
        // Chat message from assistant
        this.notifyChatHandlers(event.payload as ChatEventPayload);
        break;
      case 'pong':
        // Ping response - ignore
        break;
      default:
        console.log('[WebSocket] Unhandled event:', event.event);
    }
  }

  private handleClose(event: WSCloseEvent): void {
    console.log('[WebSocket] Disconnected:', event.code, event.reason);
    this.isConnected = false;
    this.cleanup();
    this.notifyStatusHandlers(false);

    if (!this.isIntentionalClose) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    console.error('[WebSocket] Error:', error);
    this.notifyErrorHandlers('Connection error');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      this.notifyErrorHandlers('Could not connect to gateway');
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
        // Send ping as event (lightweight)
        this.ws.send(JSON.stringify({ type: 'event', event: 'ping' }));
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
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Disconnect from the gateway
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.isConnected = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a chat message to the assistant (main session)
   */
  async sendChatMessage(message: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to gateway');
    }

    const params = {
      sessionKey: 'main',
      message,
      idempotencyKey: this.nextId(),
    };

    try {
      const result = await this.sendRequest('chat.send', params);
      console.log('[WebSocket] Chat send result:', result);
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send text message (convenience wrapper)
   */
  sendText(content: string): boolean {
    this.sendChatMessage(content).catch((error) => {
      console.error('[WebSocket] Send text error:', error);
      this.notifyErrorHandlers(error.message || 'Failed to send message');
    });
    return this.isConnected;
  }

  /**
   * Register a chat message handler
   */
  onChat(handler: ChatHandler): () => void {
    this.chatHandlers.add(handler);
    return () => this.chatHandlers.delete(handler);
  }

  /**
   * Register a connection status handler
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private notifyChatHandlers(payload: ChatEventPayload): void {
    this.chatHandlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[WebSocket] Chat handler error:', error);
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

  private notifyErrorHandlers(error: string): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (e) {
        console.error('[WebSocket] Error handler error:', e);
      }
    });
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
