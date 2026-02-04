"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ShieldAlert, Server, ArrowUp, ArrowDown } from 'lucide-react';

export default function DashboardHome() {
    const [stats, setStats] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch('http://127.0.0.1:8000/api/stats/', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.status === 401) {
                    router.push('/login');
                } else {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch stats");
            }
        };

        fetchStats();
    }, [router]);

    if (!stats) return <div className="p-10">Loading Command Center...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 text-white">System Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Threats"
                    value={stats.total_threats}
                    icon={<ShieldAlert className="text-yellow-500" />}
                />
                <StatCard
                    title="Critical Alerts"
                    value={stats.high_severity}
                    icon={<AlertTriangle className="text-red-600" />}
                    isCritical
                />
                <StatCard
                    title="Blocked IPs"
                    value={stats.blocked_ips}
                    icon={<Server className="text-blue-500" />}
                />
                <div className="bg-gray-900 p-6 rounded border border-green-900">
                    <div className="text-gray-400 text-sm mb-2">Network Traffic</div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex gap-1 text-green-400"><ArrowDown size={16} /> {stats.traffic_in}</span>
                        <span className="flex gap-1 text-blue-400"><ArrowUp size={16} /> {stats.traffic_out}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple Card Component
function StatCard({ title, value, icon, isCritical = false }: any) {
    return (
        <div className={`p-6 rounded border ${isCritical ? 'bg-red-950/30 border-red-900' : 'bg-gray-900 border-green-900'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-sm">{title}</span>
                {icon}
            </div>
            <div className={`text-3xl font-bold ${isCritical ? 'text-red-500' : 'text-white'}`}>
                {value}
            </div>
        </div>
    );
}
