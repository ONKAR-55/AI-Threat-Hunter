"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { ShieldAlert, Activity, Server, Lock, ArrowUp, Zap, OctagonAlert, Terminal as TerminalIcon } from 'lucide-react';
import Link from 'next/link';
import { useAlerts } from './AlertsContext';

// Color Palette for Pie Charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

/**
 * DashboardHome Component
 * Serves as the primary Command Center / Overview page for SOC-GUARD.
 * Displays high-level metrics, live traffic throughput, attack trends, and system terminal logs.
 */
export default function DashboardHome() {
    const [stats, setStats] = useState<any>(null);
    const router = useRouter();
    const { terminalLogs } = useAlerts();
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll system terminal to bottom when new logs arrive
    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    /**
     * Polls backend every 1 second to fetch real-time telemetry:
     * - total_threats, blocked_ips, traffic_in/out, system_load, attack_trend, top_attackers
     */
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const fetchStats = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return router.push('/login');

            try {
                const res = await fetch('http://127.0.0.1:8000/api/stats/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                } else if (res.status === 401) {
                    localStorage.removeItem('accessToken');
                    router.push('/login');
                } else {
                    setStats((prev: any) => prev || { error: true });
                }
            } catch (err) {
                setStats((prev: any) => prev || { error: true });
            }
        };

        fetchStats(); // Initial fetch
        intervalId = setInterval(fetchStats, 1000); // Poll every 1 second

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [router]);

    if (!stats) return <div className="p-10 text-green-500 font-mono animate-pulse">Initializing Command Center...</div>;
    if (stats.error) return <div className="p-10 text-red-500 font-mono">Error: Data Matrix Offline. Check Backend Connection.</div>;

    return (
        <div className="space-y-6">
            {/* 1. TOP STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Link href="/dashboard/history" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <StatCard title="Suspicious Activities" value={stats.total_suspicious || stats.total_threats || 0} icon={<ShieldAlert className="text-red-500" />} />
                </Link>
                <Link href="/dashboard/blocked" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <StatCard title="Active Blocks" value={stats.blocked_ips || 0} icon={<Lock className="text-orange-500" />} />
                </Link>
                <div className="block rounded">
                    <StatCard title="Current Load" value={stats.system_load} icon={<Activity className="text-blue-500" />} />
                </div>
                <Link href="/dashboard/live" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <div className="bg-gray-900 p-6 rounded border border-green-900/30 relative overflow-hidden group hover:border-green-800 transition-colors">
                        <div className="absolute inset-0 bg-linear-to-r from-green-900/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="text-gray-400 text-sm mb-1 flex justify-between">
                            <span>Traffic (In | Out)</span>
                            <Zap size={16} className="text-yellow-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {stats.traffic_in} <span className="text-gray-500 text-sm">|</span> {stats.traffic_out} <span className="text-gray-500 text-sm">pkts/s</span>
                        </div>
                        <div className="text-xs text-green-400 flex items-center gap-1">
                            <ArrowUp size={12} /> Live Traffic
                        </div>
                    </div>
                </Link>
            </div>

            {/* 2. MAIN DASHBOARD CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Analytics */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Suspicious Activity Trend (Area Chart) */}
                    <div className="bg-gray-900 p-6 rounded border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-green-500" /> Suspicious Activity Trend (24h)
                        </h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chart_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                                    <Area yAxisId="right" type="monotone" name="Total Traffic" dataKey="traffic" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
                                    <Area yAxisId="left" type="monotone" name="Suspicious Activities" dataKey="suspicious" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Network Protocol Distribution (2 Donut Charts: Incoming vs Outgoing) */}
                    <div className="bg-gray-900 p-6 rounded border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                            <span>Protocols (Live)</span>
                            <span className="text-xs text-gray-400 font-normal">Incoming vs Outgoing</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-64">
                            {/* Incoming Packets */}
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1">
                                    INCOMING PROTOCOLS
                                </span>
                                <div className="w-full flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.chart_pie_in || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {(stats.chart_pie_in || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-in-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '5px', border: 'none' }} />
                                            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Outgoing Packets */}
                            <div className="flex flex-col items-center justify-center h-full border-t sm:border-t-0 sm:border-l border-gray-800 pt-3 sm:pt-0 sm:pl-3">
                                <span className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                                    OUTGOING PROTOCOLS
                                </span>
                                <div className="w-full flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.chart_pie_out || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {(stats.chart_pie_out || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-out-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '5px', border: 'none' }} />
                                            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: System Terminal */}
                <div className="bg-black border border-green-900/50 rounded-lg p-4 font-mono text-sm shadow-inner flex flex-col h-200 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                        <TerminalIcon className="text-green-500" size={18} /> System Terminal
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 text-green-500 pr-2 custom-scrollbar">
                        {terminalLogs.map((log, index) => (
                            <div key={index} className={`${log.includes('ALERT') || log.includes('SUSPICIOUS') ? 'text-red-400 font-bold' : 'text-green-500'}`}>
                                {log}
                            </div>
                        ))}
                        {/* This empty div acts as an anchor to scroll to */}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * StatCard Component
 * Reusable telemetry card structure for top-level dashboard metrics.
 */
function StatCard({ title, value, icon }: any) {
    return (
        <div className="bg-gray-900 p-6 rounded border border-gray-800 hover:border-green-800 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-sm font-medium">{title}</span>
                <div className="p-2 bg-gray-800 rounded-lg">{icon}</div>
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
        </div>
    );
}
