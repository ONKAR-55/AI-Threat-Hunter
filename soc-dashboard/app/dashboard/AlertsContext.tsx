"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AlertsContextType {
    suspicious: any[];
    threats: any[]; // Alias for backward compatibility
    terminalLogs: string[];
    status: string;
}

const AlertsContext = createContext<AlertsContextType>({
    suspicious: [],
    threats: [],
    terminalLogs: ['> Core system loaded.', '> Awaiting commands...'],
    status: "CONNECTING..."
});

/**
 * AlertsProvider Component
 * Maintains a single, continuous WebSocket connection (`ws://127.0.0.1:8000/ws/alerts/`)
 * across all dashboard routes/tabs. Ensures live network traffic and alerts are captured
 * in the background even as the user switches between different dashboard views.
 */
export function AlertsProvider({ children }: { children: React.ReactNode }) {
    const [suspicious, setSuspicious] = useState<any[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(['Detected Suspicious Activities....']);
    const [status, setStatus] = useState("CONNECTING...");

    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let isCleanedUp = false;

        /**
         * Initiates WebSocket connection with auto-retry logic.
         * Skips handshake if component is unmounted during reconnect attempts.
         */
        const connect = () => {
            if (isCleanedUp) return;
            setStatus("CONNECTING...");
            socket = new WebSocket('ws://127.0.0.1:8000/ws/alerts/');

            socket.onopen = () => {
                if (isCleanedUp) {
                    socket?.close();
                    return;
                }
                setStatus("LIVE MONITORING");
            };

            /**
             * Handles incoming real-time suspicious activity messages broadcasted by Django Channels.
             * Appends new alerts to the `suspicious` feed and formats terminal log entries.
             */
            socket.onmessage = (e) => {
                if (isCleanedUp) return;
                try {
                    const data = JSON.parse(e.data);
                    
                    // Update suspicious activities feed (keep latest 50 items in memory)
                    setSuspicious((prev) => [data, ...prev].slice(0, 50));

                    // Format and update terminal log output with timestamp and IP path
                    const time = new Date().toLocaleTimeString();
                    const logMsg = `[${time}] SUSPICIOUS: ${data.type} detected from ${data.ip} -> ${data.dst_ip || 'Any'}`;
                    setTerminalLogs((prev) => [...prev, logMsg].slice(-50));
                } catch (err) {
                    console.error("Failed to parse alert data", err);
                }
            };

            /**
             * Triggers automatic 3-second reconnect interval if WebSocket closes or server restarts.
             */
            socket.onclose = () => {
                if (isCleanedUp) return;
                setStatus("OFFLINE (RECONNECTING...)");
                reconnectTimer = setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                if (isCleanedUp) return;
                socket?.close();
            };
        };

        connect();

        return () => {
            isCleanedUp = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (socket) socket.close();
        };
    }, []);

    return (
        <AlertsContext.Provider value={{ suspicious, threats: suspicious, terminalLogs, status }}>
            {children}
        </AlertsContext.Provider>
    );
}

/**
 * Custom hook `useAlerts`
 * Allows any dashboard component/page to consume the live WebSocket feed, status,
 * and system terminal logs without creating duplicate sockets.
 */
export function useAlerts() {
    return useContext(AlertsContext);
}
