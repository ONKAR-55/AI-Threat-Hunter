"use client";
import { ShieldAlert } from 'lucide-react';

export default function ThreatsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <ShieldAlert className="text-red-500" size={32} />
                <h1 className="text-3xl font-bold text-white">Total Threats Matrix</h1>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400 mb-4 font-mono text-sm">Loading advanced threat analytics engine...</p>
                <div className="animate-pulse w-full h-1 bg-green-900 rounded overflow-hidden">
                    <div className="w-1/3 h-full bg-green-500"></div>
                </div>
            </div>
        </div>
    );
}
