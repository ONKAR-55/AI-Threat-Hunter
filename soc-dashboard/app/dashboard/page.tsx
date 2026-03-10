"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { ShieldAlert, Activity, Server, Lock, ArrowUp, Zap, Bot, Send } from 'lucide-react';
import Link from 'next/link';

// Color Palette for Pie Chart
const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function DashboardHome() {
    const [stats, setStats] = useState<any>(null);
    const router = useRouter();

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
        intervalId = setInterval(fetchStats, 3000); // Poll every 3 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [router]);

    if (!stats) return <div className="p-10 text-green-500 font-mono animate-pulse">Initializing Command Center...</div>;
    if (stats.error) return <div className="p-10 text-red-500 font-mono">Error: Data Matrix Offline. Check Backend Connection.</div>;

    return (
        <div className="space-y-6">
            {/* 1. TOP STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Link href="/dashboard/threats" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <StatCard title="Total Threats" value={stats.total_threats || 0} icon={<ShieldAlert className="text-red-500" />} />
                </Link>
                <Link href="/dashboard/blocked" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <StatCard title="Active Blocks" value={stats.blocked_ips || 0} icon={<Lock className="text-orange-500" />} />
                </Link>
                <Link href="/dashboard/system-load" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <StatCard title="System Load" value={stats.system_load || "N/A"} icon={<Activity className="text-blue-500" />} />
                </Link>
                <Link href="/dashboard/traffic" className="block focus:outline-none focus:ring-2 focus:ring-green-500 rounded">
                    <div className="bg-gray-900 p-6 rounded border border-green-900/30 relative overflow-hidden group hover:border-green-800 transition-colors">
                        <div className="absolute inset-0 bg-linear-to-r from-green-900/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="text-gray-400 text-sm mb-1 flex justify-between">
                            <span>Traffic (In | Out)</span>
                            <Zap size={16} className="text-yellow-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {stats.traffic_in || "0"} <span className="text-gray-500 text-sm">|</span> {stats.traffic_out || "0"} <span className="text-gray-500 text-sm">pkts/s</span>
                        </div>
                        <div className="text-xs text-green-400 flex items-center gap-1">
                            <ArrowUp size={12} /> Live hardware traffic
                        </div>
                    </div>
                </Link>
            </div>

            {/* 2. MAIN DASHBOARD CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Analytics */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Attack Trend (Area Chart) */}
                    <div className="bg-gray-900 p-6 rounded border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-green-500" /> Attack Intensity (24h)
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
                                    <Area yAxisId="left" type="monotone" name="Total Threats" dataKey="threats" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Threat Distribution (Donut Chart) */}
                    <div className="bg-gray-900 p-6 rounded border border-gray-800">
                        <h2 className="text-lg font-bold text-white mb-2">Threat Distribution</h2>
                        <div className="h-64 w-full flex items-center justify-center overflow-hidden">
                            {(!stats.chart_pie || stats.chart_pie.length === 0) ? (
                                <div className="text-gray-600 text-sm">No data available</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.chart_pie}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.chart_pie.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '5px', border: 'none' }} />
                                        <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: AI Chat */}
                <div className="bg-gray-900 p-6 rounded border border-gray-800 flex flex-col h-full min-h-[500px]">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Bot size={18} className="text-green-500" /> Reflex AI
                    </h2>

                    {/* Chat Messages Area */}
                    <div className="flex-1 bg-black rounded border border-gray-800 p-4 mb-4 overflow-y-auto">
                        <div className="text-gray-500 text-sm italic text-center mt-2">
                            AI System ready. Awaiting inquiries...
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <button className="w-full bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50 py-2 rounded text-sm font-bold mb-4 transition-colors">
                        Generate 1-Hour Report
                    </button>

                    {/* Input Area */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask about live threats..."
                            className="flex-1 bg-black border border-gray-700 text-white text-sm rounded px-3 py-2 outline-none focus:border-green-500"
                        />
                        <button className="bg-gray-800 hover:bg-gray-700 text-white p-2 px-3 rounded transition-colors flex items-center justify-center">
                            <Send size={16} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

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
