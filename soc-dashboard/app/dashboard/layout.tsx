"use client";
import Link from 'next/link';
import { Shield, ShieldAlert, Lock, FileText, LogOut, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [time, setTime] = useState<Date | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname(); // Keep usePathname as it might be used for active link styling

    useEffect(() => {
        setIsMounted(true);
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Assuming navItems replaces menuItems and its structure is similar to the original's menuItems
    // but with the new icons and potentially different hrefs/names
    const navItems = [
        { name: 'Overview', icon: <Activity size={20} />, href: '/dashboard' },
        { name: 'Live Monitor', icon: <Shield size={20} />, href: '/dashboard/live' },
        { name: 'Blocked IPs', icon: <Lock size={20} />, href: '/dashboard/blocked' },
        { name: 'History', icon: <FileText size={20} />, href: '/dashboard/history' },
    ];


    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login'; // Using window.location for full refresh
    };

    return (
        <div className="flex h-screen bg-black text-gray-200 font-sans selection:bg-green-900 selection:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="bg-green-900/20 p-2 rounded-full border border-green-500/30">
                        <ShieldAlert className="text-green-500 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">I-<span className="text-green-500">GUARD</span></h1>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">AI Security Ops</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${pathname === item.href ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            <span className={`group-hover:text-green-400 transition-colors ${pathname === item.href ? 'text-green-400' : ''}`}>{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800 text-center">
                    <div className="text-2xl font-mono text-green-500 font-bold">
                        {isMounted && time ? time.toLocaleTimeString([], { hour12: false }) : "--:--:--"}
                    </div>
                    <div className="text-xs text-gray-600 uppercase mt-1">System Time (UTC)</div>
                </div>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                    <div className="mt-4 text-xs text-center text-gray-600">
                        v1.2.0 • Stable
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-black p-8">
                {children}
            </main>
        </div>
    );
}
