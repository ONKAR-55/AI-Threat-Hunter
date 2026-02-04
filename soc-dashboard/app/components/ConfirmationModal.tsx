"use client";
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmTextMatch?: string; // If provided, user must type this to enable confirm button
    confirmButtonText?: string;
    isDanger?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmTextMatch,
    confirmButtonText = "Confirm",
    isDanger = false
}: ConfirmationModalProps) {
    const [inputValue, setInputValue] = useState("");

    if (!isOpen) return null;

    const isConfirmDisabled = confirmTextMatch
        ? inputValue !== confirmTextMatch
        : false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-4 text-white">
                    {isDanger ? <AlertTriangle className="text-red-500 w-8 h-8" /> : null}
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                    {message}
                </p>

                {confirmTextMatch && (
                    <div className="mb-6">
                        <label className="block text-sm text-gray-500 mb-2">
                            Type <span className="font-mono font-bold text-white select-all">{confirmTextMatch}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full p-2 bg-black border border-gray-700 rounded text-white focus:border-red-500 focus:outline-none placeholder-gray-600"
                            placeholder={confirmTextMatch}
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded font-medium text-gray-400 hover:bg-gray-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirmDisabled}
                        className={`px-4 py-2 rounded font-bold transition flex items-center gap-2 ${isDanger
                                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300/50'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
}
