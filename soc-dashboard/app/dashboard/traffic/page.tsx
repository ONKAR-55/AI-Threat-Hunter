"use client";
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Zap, Ban, CheckCircle } from 'lucide-react';

export default function TrafficPage() {
    const [threats, setThreats] = useState<any[]>([]);
    const [status, setStatus] = useState("CONNECTING...");
    const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set());

    useEffect(() => {
        const socket = new WebSocket('ws://127.0.0.1:8000/ws/alerts/');

        socket.onopen = () => setStatus("LIVE MONITORING");
        socket.onclose = () => setStatus("OFFLINE");

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);

            // Allow all traffic in this window if you want, but sticking to the WebSocket alerts stream
            setThreats((prev) => [data, ...prev].slice(0, 100)); // Keep last 100 pkts
        };

        return () => socket.close();
    }, []);

    const handleBlock = async (ip: string, type: string) => {
        const token = localStorage.getItem('accessToken');
        try {
            const res = await fetch('http://127.0.0.1:8000/api/block-ip/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ip: ip, reason: `Immediate block via Traffic Monitor: ${type}` })
            });

            if (res.ok) {
                setBlockedIPs(prev => new Set(prev).add(ip));
            } else {
                alert("Failed to block IP");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-yellow-400" /> Network Traffic Analyzer
                </h1>
                <div className={`px-4 py-2 rounded font-bold text-sm ${status.includes("LIVE") ? "bg-yellow-900/50 text-yellow-400 animate-pulse" : "bg-red-900 text-red-300"}`}>
                    ● {status}
                </div>
            </div>

            {/* Feed Grid */}
            <div className="space-y-3">
                {/* Categories Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-400 text-xs font-bold uppercase tracking-wider bg-gray-900 rounded">
                    <div className="col-span-3">Network Event</div>
                    <div className="col-span-2">Severity</div>
                    <div className="col-span-3">Source IP</div>
                    <div className="col-span-3">Destination IP</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                {threats.length === 0 && (
                    <div className="text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded">
                        Awaiting network packet streams...
                    </div>
                )}

                {threats.map((threat, index) => {
                    const isBlocked = blockedIPs.has(threat.ip);

                    return (
                        <div key={index} className={`grid grid-cols-12 gap-4 items-center p-4 rounded border border-gray-800 shadow-lg transition-all hover:bg-gray-800/80 ${index === 0 ? 'animate-in fade-in slide-in-from-top-4 duration-500 bg-gray-900/50' : 'bg-black'}`}>

                            {/* Col 1-3: Attack Type */}
                            <div className="col-span-3 flex items-center gap-3">
                                <div className={`p-2 rounded-full ${threat.severity === 'CRITICAL' ? 'bg-red-900/20 text-red-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                                    <Zap size={18} />
                                </div>
                                <div className="truncate">
                                    <div className="font-bold text-gray-200 text-sm truncate">{threat.type}</div>
                                    <div className="text-xs text-gray-500">{threat.time}</div>
                                </div>
                            </div>

                            {/* Col 4-5: Severity */}
                            <div className="col-span-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${threat.severity === 'CRITICAL' || threat.severity === 'HIGH'
                                    ? 'bg-red-950 text-red-400 border border-red-900'
                                    : 'bg-green-950 text-green-400 border border-green-900'
                                    }`}>
                                    {threat.severity === 'CRITICAL' ? <AlertTriangle size={12} /> : <Shield size={12} />}
                                    {threat.severity}
                                </span>
                            </div>

                            {/* Col 6-8: Source IP & Location */}
                            <div className="col-span-3 truncate">
                                <div className="font-mono text-blue-400 text-sm flex items-center gap-2">
                                    <span className="text-gray-600 text-xs">SRC:</span> {threat.ip}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 truncate">🌍 {threat.location || 'Unknown Location'}</div>
                            </div>

                            {/* Col 9-11: Destination IP */}
                            <div className="col-span-3 truncate font-mono text-yellow-500 text-sm flex items-center gap-2">
                                <span className="text-gray-600 text-xs">DST:</span> {threat.dst_ip || '---'}
                            </div>

                            {/* Col 12: ACTION */}
                            <div className="col-span-1 flex justify-end">
                                {isBlocked ? (
                                    <button disabled className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-500 rounded font-bold cursor-not-allowed border border-gray-700 text-xs">
                                        <CheckCircle size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBlock(threat.ip, threat.type)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-all shadow-md text-xs"
                                        title="Block External IP"
                                    >
                                        <Ban size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
