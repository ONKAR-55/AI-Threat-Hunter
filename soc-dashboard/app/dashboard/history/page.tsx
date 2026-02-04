"use client";
import { useEffect, useState } from 'react';
import { FileText, ShieldAlert, Lock, Clock, Trash2 } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function HistoryPage() {
    const [activeTab, setActiveTab] = useState('attacks'); // attacks | blocks | logs
    const [data, setData] = useState<{ attacks: any[], blocks: any[], logs: any[] } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchData = async () => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://127.0.0.1:8000/api/history/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setData(await res.json());
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteHistory = async () => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://127.0.0.1:8000/api/clear-history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type: activeTab })
        });

        if (res.ok) {
            setIsDeleteModalOpen(false);
            fetchData(); // Refresh to update list
        } else {
            alert("Failed to delete history.");
        }
    };

    const getDeleteMessage = () => {
        if (activeTab === 'attacks') return "This will permanently delete all threat detection logs.";
        if (activeTab === 'blocks') return "This will permanently delete all blocked/unblocked IP records.";
        if (activeTab === 'logs') return "This will permanently delete all system logs.";
        return "Delete history?";
    };

    if (!data) return <div className="p-10 text-green-500 font-mono animate-pulse">Loading Archives...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Clock className="text-green-500" /> Audit History
                </h1>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="bg-red-900/30 text-red-500 border border-red-900 px-4 py-2 rounded hover:bg-red-900/50 flex items-center gap-2 transition"
                >
                    <Trash2 size={16} /> Clear {activeTab}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-green-900 pb-1">
                <TabButton label="Attack History" icon={<ShieldAlert size={18} />} active={activeTab === 'attacks'} onClick={() => setActiveTab('attacks')} />
                <TabButton label="Block History" icon={<Lock size={18} />} active={activeTab === 'blocks'} onClick={() => setActiveTab('blocks')} />
                <TabButton label="System Logs" icon={<FileText size={18} />} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
            </div>

            {/* Content Table */}
            <div className="bg-gray-900 rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black text-gray-400 uppercase text-sm">
                        <tr>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Event / IP</th>
                            <th className="p-4">Details</th>
                            <th className="p-4">Status / Severity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">

                        {/* VIEW 1: ATTACKS */}
                        {activeTab === 'attacks' && data.attacks.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                                <td className="p-4 text-gray-500 text-sm">{new Date(item.date).toLocaleString()}</td>
                                <td className="p-4 font-mono text-white">{item.ip}</td>
                                <td className="p-4 text-red-300">{item.type}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${item.severity === 'CRITICAL' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>{item.severity}</span></td>
                            </tr>
                        ))}
                        {activeTab === 'attacks' && data.attacks.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No attack history found.</td></tr>
                        )}

                        {/* VIEW 2: BLOCKS */}
                        {activeTab === 'blocks' && data.blocks.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                                <td className="p-4 text-gray-500 text-sm">{new Date(item.date).toLocaleString()}</td>
                                <td className="p-4 font-mono text-white">{item.ip}</td>
                                <td className="p-4 text-gray-400">{item.reason}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${item.status === 'ACTIVE' ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'}`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'blocks' && data.blocks.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No block history found.</td></tr>
                        )}

                        {/* VIEW 3: LOGS */}
                        {activeTab === 'logs' && data.logs.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                                <td className="p-4 text-gray-500 text-sm">{new Date(item.time).toLocaleString()}</td>
                                <td className="p-4 font-mono text-blue-300">{item.source}</td>
                                <td className="p-4 text-gray-300">{item.msg}</td>
                                <td className="p-4 text-xs font-bold">{item.level}</td>
                            </tr>
                        ))}
                        {activeTab === 'logs' && data.logs.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No system logs found.</td></tr>
                        )}

                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteHistory}
                title={`Delete ${activeTab} history?`}
                message={getDeleteMessage()}
                confirmTextMatch="DELETE-HISTORY"
                confirmButtonText="Yes, Delete Permanently"
                isDanger
            />
        </div>
    );
}

// Simple Tab Component
function TabButton({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 font-bold transition-colors ${active ? 'bg-green-900/30 text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}
        >
            {icon} {label}
        </button>
    )
}
