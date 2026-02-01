"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch('http://127.0.0.1:8000/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // 1. Save the "Badge" (Access Token) to local storage
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);

            // 2. Redirect to the dashboard
            router.push('/dashboard');
        } else {
            alert('Login Failed: ' + 'Invalid credentials');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-green-500 font-mono">
            <div className="w-full max-w-md p-8 border border-green-800 bg-gray-900 rounded-lg shadow-lg">
                <div className="flex justify-center mb-6">
                    <Shield className="w-16 h-16 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-center mb-6">SECURE ACCESS</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block mb-1">Agent ID (Username)</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 bg-black border border-green-700 rounded focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <div>
                        <label className="block mb-1">Passcode</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 bg-black border border-green-700 rounded focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-700 text-black font-bold py-2 rounded hover:bg-green-600 transition"
                    >
                        AUTHENTICATE
                    </button>
                </form>
            </div>
        </div>
    );
}
