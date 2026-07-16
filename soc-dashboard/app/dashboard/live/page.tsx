"use client";
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Terminal, Ban, CheckCircle } from 'lucide-react';
import { useAlerts } from '../AlertsContext';

/**
 * LiveMonitorPage Component
 * Dedicated real-time network traffic & threat stream interceptor.
 * Consumes the global `useAlerts` context to display live packets and alerts
 * as they arrive from the rule-based sniffer.
 */
export default function LiveMonitorPage() {
    const { suspicious, status } = useAlerts();
    const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set()); // Tracks which IPs are blocked locally for UI feedback

    /**
     * Instantly blocks an external IP address detected during live monitoring.
     * Submits `POST /api/block-ip/` with reason and updates local state without full reload.
     * @param ip - Target IP address to block
     * @param type - Threat/Suspicious classification triggered by the sniffer
     */
    const handleBlock = async (ip: string, type: string) => {
        const token = localStorage.getItem('accessToken');

        try {
            const res = await fetch('http://127.0.0.1:8000/api/block-ip/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ip: ip,
                    reason: `Immediate block via Live Monitor: ${type}`
                })
            });

            if (res.ok) {
                // Update UI immediately without reload
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
            <div className="flex justify-between items-center mb-8 border-b border-green-900 pb-4">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Terminal className="text-green-500" /> Live Interceptor
                </h1>
                <div className={`px-4 py-2 rounded font-bold text-sm ${status.includes("LIVE") ? "bg-green-900/50 text-green-400 animate-pulse" : "bg-red-900 text-red-300"}`}>
                    ● {status}
                </div>
            </div>

            {/* Feed Grid */}
            <div className="space-y-3">
                {/* Categories Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-500 text-sm font-bold uppercase tracking-wider">
                    <div className="col-span-3">Activity Type</div>
                    <div className="col-span-2">Severity</div>
                    <div className="col-span-3">Source IP</div>
                    <div className="col-span-3">Destination IP</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                {suspicious.length === 0 && (
                    <div className="text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded">
                        Waiting for suspicious network activity...
                    </div>
                )}

                {suspicious.map((item, index) => {
                    const isBlocked = blockedIPs.has(item.ip);

                    return (
                        <div key={index} className={`grid grid-cols-12 gap-4 items-center p-4 rounded border border-gray-800 shadow-lg transition-all hover:bg-gray-900 ${index === 0 ? 'animate-in slide-in-from-top duration-300 bg-gray-900/50' : 'bg-black'}`}>

                            {/* Col 1-3: Activity Type */}
                            <div className="col-span-3 flex items-center gap-3">
                                <div className={`p-2 rounded-full ${item.severity === 'CRITICAL' ? 'bg-red-900/20 text-red-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                                    <Terminal size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-200">{item.type}</div>
                                    <div className="text-xs text-gray-500">{item.time}</div>
                                </div>
                            </div>

                            {/* Col 4-5: Severity */}
                            <div className="col-span-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${item.severity === 'CRITICAL'
                                    ? 'bg-red-950 text-red-400 border border-red-900'
                                    : 'bg-yellow-950 text-yellow-400 border border-yellow-900'
                                    }`}>
                                    {item.severity === 'CRITICAL' ? <AlertTriangle size={12} /> : <Shield size={12} />}
                                    {item.severity}
                                </span>
                            </div>

                            {/* Col 6-8: Source IP & Location */}
                            <div className="col-span-3">
                                <div className="font-mono text-blue-400 text-sm flex items-center gap-2">
                                    <span className="text-gray-600">SRC:</span> {item.ip}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">🌍 {item.location || 'Unknown Location'}</div>
                            </div>

                            {/* Col 9-11: Destination IP */}
                            <div className="col-span-3 font-mono text-green-400 text-sm flex items-center gap-2">
                                <span className="text-gray-600">DST:</span> {item.dst_ip || '---'}
                            </div>

                            {/* Col 12: ACTION */}
                            <div className="col-span-1 flex justify-end">
                                {isBlocked ? (
                                    <button disabled className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-500 rounded font-bold cursor-not-allowed border border-gray-700 text-xs">
                                        <CheckCircle size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBlock(item.ip, item.type)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-all shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:shadow-[0_0_20px_rgba(220,38,38,0.8)] text-xs"
                                        title="Block Source IP"
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
