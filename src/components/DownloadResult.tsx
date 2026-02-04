"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Download, RefreshCw } from "lucide-react";

interface DownloadResultProps {
    fileName: string;
    downloadUrl: string;
    onReset: () => void;
    stats?: {
        label: string;
        value: string;
    }[];
}

export default function DownloadResult({
    fileName,
    downloadUrl,
    onReset,
    stats,
}: DownloadResultProps) {
    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
        >
            <div className="bg-white border border-zinc-100 p-6 sm:p-8 rounded-[2rem] shadow-2xl shadow-zinc-200/50">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CheckCircle2 className="text-emerald-500 relative z-10" size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                            Download Prepared!
                        </h3>
                        <p className="text-zinc-400 font-bold px-4 break-all md:truncate max-w-xs mx-auto text-sm">{fileName}</p>
                    </div>
                </div>

                {stats && stats.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100/50 text-center hover:bg-white hover:shadow-md transition-all duration-300"
                            >
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-sm font-black text-zinc-800">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleDownload}
                        className="w-full px-8 py-4.5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-emerald-200/50 cursor-pointer text-lg group"
                    >
                        <Download size={22} className="group-hover:-translate-y-1 transition-transform" />
                        Download Now
                    </button>
                    <button
                        onClick={onReset}
                        className="w-full px-8 py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.98]"
                    >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                        Convert More
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
