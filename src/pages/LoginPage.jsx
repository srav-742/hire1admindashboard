import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../firebase';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Hit Express backend directly for Admin authentication
            const response = await axios.post(`${API_URL}/login`, {
                email: formData.email,
                password: formData.password,
                role: 'admin'
            }, {
                headers: {
                    'X-Client-ID': 'hire1percent_web_client',
                    'X-Client-Secret': 'h1p_secret_2026_gateway_key'
                }
            });

            const profile = response.data.user;
            if (!profile) {
                throw new Error("Invalid response from authorization server.");
            }

            setMessage({ type: 'success', text: "Access granted. Synchronizing session..." });

            // Store in local storage to match monolith expectations
            localStorage.setItem('user', JSON.stringify({ ...profile, role: 'admin' }));

            // Navigate to requested route or admin dashboard home
            const from = location.state?.from?.pathname || '/admin';
            setTimeout(() => {
                navigate(from, { replace: true });
            }, 1000);

        } catch (error) {
            console.error("[ADMIN-LOGIN-ERROR]", error);
            let userFriendlyMessage = "System access denied. Please check your credentials.";

            if (error.response?.data?.message) {
                userFriendlyMessage = error.response.data.message;
            } else if (error.message) {
                userFriendlyMessage = error.message;
            }

            setMessage({
                type: 'error',
                text: userFriendlyMessage
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f4ee] flex flex-col justify-between relative overflow-hidden font-sans select-none">
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/5 to-emerald-500/10 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />

            {/* Top Bar Branding */}
            <header className="px-8 py-6 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-sm">
                        1%
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-900">
                        Hire One Percent
                    </span>
                </div>
            </header>

            {/* Central Form Container */}
            <main className="flex-1 flex items-center justify-center p-4 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md bg-white border border-black/10 rounded-[2.5rem] p-8 md:p-10 shadow-lg relative overflow-hidden"
                >
                    {/* Inner styling watermark */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500" />
                    
                    <div className="mb-8 text-center">
                        <div className="mx-auto h-12 w-12 bg-black/5 rounded-2xl flex items-center justify-center text-gray-900 mb-4 border border-black/10">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
                            Admin Portal
                        </h2>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mt-2">
                            Secure Terminal Access Only
                        </p>
                    </div>

                    {/* Messages System */}
                    <AnimatePresence mode="wait">
                        {message.text && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`p-4 rounded-2xl border text-xs font-bold mb-6 flex items-start gap-2.5 leading-relaxed ${
                                    message.type === 'success' 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-red-50 border-red-200 text-red-700'
                                }`}
                            >
                                {message.type !== 'success' && <AlertCircle size={16} className="shrink-0" />}
                                <span>{message.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form fields */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                Secure Username / Email
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@hireonepercent.com"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#fbf8f3] border border-black/10 text-sm font-semibold outline-none focus:bg-white focus:border-black transition-all text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block px-1">
                                Terminal Passcode
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#fbf8f3] border border-black/10 text-sm font-semibold outline-none focus:bg-white focus:border-black transition-all text-gray-900"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-2 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Authorizing...
                                </>
                            ) : (
                                <>
                                    Establish Link
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="px-8 py-6 text-center relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    &copy; 2026 Hire1Percent. Classified / Internal System.
                </p>
            </footer>
        </div>
    );
};

export default LoginPage;
