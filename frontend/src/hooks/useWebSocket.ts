/**
 * EXAMOS - WebSocket Hook
 * Manages WebSocket connection for real-time trust score updates.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface WebSocketMessage {
  type: string;
  trust_score?: number;
  event_type?: string;
  severity?: string;
  deduction?: number;
  attempt_id?: number;
  student_id?: number;
}

interface UseWebSocketOptions {
  onMessage?: (msg: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useExamWebSocket(attemptId: number | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [lastEvent, setLastEvent] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(function connectWs() {
    if (!attemptId) return;

    const token = localStorage.getItem("examos_token");
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/exam/${attemptId}?token=${token}`);

    ws.onopen = () => {
      setIsConnected(true);
      options.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.trust_score !== undefined) {
          setTrustScore(msg.trust_score);
        }
        setLastEvent(msg);
        options.onMessage?.(msg);
      } catch {
        console.warn("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [attemptId, options]);

  const sendEvent = useCallback((eventType: string, details?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: eventType, details }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, trustScore, lastEvent, sendEvent, disconnect };
}

export function useMonitorWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("examos_token");
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/monitor?token=${token}`);

    ws.onopen = () => {
      setIsConnected(true);
      options.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        setEvents((prev) => [msg, ...prev].slice(0, 100));
        options.onMessage?.(msg);
      } catch {
        console.warn("Failed to parse monitor message");
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isConnected, events };
}
