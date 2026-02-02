"use client";
import { Shield, Activity, Lock, FileText, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Overview', icon: <Activity />, href: '/dashboard' },
        { name: 'Live Monitor', icon: <Shield />, href: '/dashboard/live' },
        { name: 'Blocked IPs', icon: <Lock />, href: '/dashboard/blocked' },
        { name: 'Logs', icon: <FileText />, href: '/dashboard/logs' },
    ];

    return (
        <div className="flex min-h-screen bg-black text-green-500 font-mono">
            {/* Sidebar */}
            <aside className="w-64 border-r border-green-900 bg-gray-950 hidden md:block">
                <div className="p-6 border-b border-green-900 flex items-center gap-2">
                    <Shield className="w-8 h-8 text-red-500" />
                    <span className="text-xl font-bold text-white">ThreatHunter</span>
                </div>

                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 p-3 rounded transition-colors ${pathname === item.href ? 'bg-green-900/30 text-white' : 'hover:bg-green-900/20'
                                }`}
                        >
                            {item.icon}
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}