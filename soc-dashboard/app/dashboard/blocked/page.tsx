"use client";
import { useEffect, useState } from 'react';
import { ShieldBan, Trash2, Plus } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function BlockedIPsPage() {
    const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
    const [newIP, setNewIP] = useState('');
    const [reason, setReason] = useState('');

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        ip: string;
        type: 'BLOCK' | 'UNBLOCK';
    }>({ isOpen: false, ip: '', type: 'BLOCK' });

    // 1. Fetch the list when page loads
    const fetchBlocked = async () => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://127.0.0.1:8000/api/blocked/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setBlockedIPs(await res.json());
    };

    useEffect(() => { fetchBlocked(); }, []);

    // 2. Handle Block (Direct Call)
    const handleBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIP) return;

        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://127.0.0.1:8000/api/block-ip/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ip: newIP, reason: reason })
        });

        if (res.ok) {
            setNewIP('');
            setReason('');
            fetchBlocked();
        } else {
            alert("Failed to block IP");
        }
    };

    // 3. Initiate Unblock (Opens Modal)
    const initiateUnblock = (ip: string) => {
        setModal({ isOpen: true, ip: ip, type: 'UNBLOCK' });
    }

    // 4. Handle Unblock Confirmation
    const handleConfirmUnblock = async () => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://127.0.0.1:8000/api/unblock-ip/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ip: modal.ip })
        });

        if (res.ok) {
            setModal({ ...modal, isOpen: false });
            fetchBlocked();
        } else {
            alert("Failed to unblock IP");
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-2">
                <ShieldBan className="text-red-500" /> Active Defense
            </h1>

            {/* Manual Block Form */}
            <div className="bg-gray-900 p-6 rounded border border-red-900/50 mb-8">
                <h2 className="text-xl font-bold mb-4 text-red-400">Manual IP Block</h2>
                <form onSubmit={handleBlock} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="IP Address (e.g. 192.168.1.50)"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        className="flex-1 p-2 bg-black border border-gray-700 rounded text-white"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Reason (Optional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="flex-1 p-2 bg-black border border-gray-700 rounded text-white"
                    />
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2">
                        <Plus size={18} /> BLOCK NOW
                    </button>
                </form>
            </div>

            {/* Block List Table */}
            <div className="bg-gray-900 rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-950 text-gray-400 uppercase text-sm">
                        <tr>
                            <th className="p-4">IP Address</th>
                            <th className="p-4">Reason</th>
                            <th className="p-4">Date Blocked</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {blockedIPs.map((b) => (
                            <tr key={b.ip} className="hover:bg-gray-800/50">
                                <td className="p-4 font-mono text-red-300">{b.ip}</td>
                                <td className="p-4 text-gray-400">{b.reason}</td>
                                <td className="p-4 text-gray-500 text-sm">{new Date(b.date).toLocaleString()}</td>
                                <td className="p-4">
                                    <button
                                        onClick={() => initiateUnblock(b.ip)}
                                        className="text-gray-500 hover:text-green-500 transition">
                                        Unblock
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {blockedIPs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">No IPs currently blocked. System is clean.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                onConfirm={handleConfirmUnblock}
                title="Confirm Unblock"
                message={`Are you sure you want to unblock IP ${modal.ip}? This will allow traffic from this source.`}
                confirmTextMatch={modal.ip}
                confirmButtonText="UNBLOCK IP"
            />
        </div>
    );
}
