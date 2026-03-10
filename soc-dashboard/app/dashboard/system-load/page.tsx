"use client";
import { Activity } from 'lucide-react';

export default function SystemLoadPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <Activity className="text-blue-500" size={32} />
                <h1 className="text-3xl font-bold text-white">System Load Telemetry</h1>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400 mb-4 font-mono text-sm">Initializing hardware metrics and CPU telemetry...</p>
                <div className="animate-pulse w-full h-1 bg-blue-900 rounded overflow-hidden">
                    <div className="w-1/3 h-full bg-blue-500"></div>
                </div>
            </div>
        </div>
    );
}
