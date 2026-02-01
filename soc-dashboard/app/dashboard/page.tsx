"use client";
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Activity, Terminal } from 'lucide-react';

export default function SOCDashboard() {
    const [threats, setThreats] = useState<any[]>([]);
    const [status, setStatus] = useState("DISCONNECTED");

    useEffect(() => {
        // 1. Connect to your Django WebSocket
        const socket = new WebSocket('ws://127.0.0.1:8000/ws/alerts/');

        socket.onopen = () => {
            console.log("Connected to SOC Backend");
            setStatus("LIVE MONITORING");
        };

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            // 2. Add new threat to the TOP of the list
            setThreats((prev) => [data, ...prev]);
        };

        socket.onclose = () => setStatus("OFFLINE");

        return () => socket.close();
    }, []);

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-10">
            {/* Header */}
            <div className="flex justify-between items-center mb-10 border-b border-green-800 pb-4">
                <h1 className="text-4xl font-bold flex items-center gap-2">
                    <Shield className="w-10 h-10" /> AI THREAT HUNTER
                </h1>
                <div className={`px-4 py-2 rounded font-bold ${status === "LIVE MONITORING" ? "bg-green-900 text-green-300 animate-pulse" : "bg-red-900 text-red-300"}`}>
                    ● {status}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Panel: Statistics */}
                <div className="border border-green-800 p-6 rounded bg-gray-900 h-fit">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity /> THREAT METRICS</h2>
                    <div className="text-6xl font-bold mb-2">{threats.length}</div>
                    <div className="text-sm text-green-400 opacity-70">TOTAL THREATS DETECTED</div>
                </div>

                {/* Right Panel: Live Feed */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Terminal /> REAL-TIME LOGS</h2>
                    <div className="space-y-3">
                        {threats.length === 0 && <p className="opacity-50">Waiting for network traffic...</p>}

                        {threats.map((threat, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-900 border-l-4 border-red-500 p-4 shadow-lg animate-in slide-in-from-right">
                                <div>
                                    <div className="font-bold text-lg text-red-400">{threat.type}</div>
                                    <div className="text-sm opacity-70">{threat.time}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{threat.ip}</div>
                                    <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">{threat.severity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
