"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ConversionLayoutProps {
    children: React.ReactNode; // The preview area
    settingsPanel: React.ReactNode; // The right sidebar
    title: string;
    description?: string;
}

export default function ConversionLayout({ children, settingsPanel, title, description }: ConversionLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-zinc-900 pt-20 pb-0 overflow-hidden flex flex-col h-screen selection:bg-indigo-100 selection:text-indigo-600">
            {/* Soft Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-30"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-[80px]" />
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Preview Area */}
                <main className="flex-1 relative overflow-y-auto overflow-x-hidden p-4 sm:p-8 md:p-12 flex flex-col items-center">
                    <div className="absolute top-6 left-6 z-30">
                        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-indigo-600 font-bold transition-all bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-zinc-200/50 hover:shadow-md active:scale-95 group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Back to Home</span>
                        </Link>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full mt-14 flex-1 max-w-6xl bg-white/70 backdrop-blur-sm rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-white/50 flex flex-col overflow-hidden"
                    >
                        {/* Toolbar / Title for Preview */}
                        <div className="h-14 border-b border-zinc-100 flex items-center justify-between px-8 bg-white/40 sticky top-0 z-20 backdrop-blur-md">
                            <h2 className="font-black text-zinc-400 text-[10px] tracking-[0.2em] uppercase">Workspace</h2>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="text-xs text-zinc-500 font-bold">{title}</div>
                            </div>
                        </div>

                        {/* Actual Content Container */}
                        <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center">
                            {children}
                        </div>
                    </motion.div>
                </main>

                {/* Right Sidebar - Settings */}
                <aside className="w-full sm:w-[380px] md:w-[420px] bg-white border-l border-zinc-100 flex-shrink-0 flex flex-col h-full z-20 shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.03)]">
                    <div className="p-8 border-b border-zinc-50">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                            <Link href="/">
                                <span className="font-black">U</span>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-black text-zinc-900 leading-tight tracking-tight">{title}</h1>
                        {description && <p className="text-sm font-bold text-zinc-400 mt-1.5 leading-relaxed">{description}</p>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {settingsPanel}
                    </div>
                </aside>
            </div>
        </div>
    );
}
