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
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CheckCircle2 className="text-emerald-500 relative z-10" size={40} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                        File Ready!
                    </h3>
                    <p className="text-zinc-400 font-bold px-4 break-all text-xs line-clamp-2">{fileName}</p>
                </div>
            </div>

            {stats && stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-8">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-100/50 text-center hover:bg-white hover:shadow-sm transition-all duration-300"
                        >
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                            <p className="text-[11px] font-black text-zinc-800 truncate">{stat.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleDownload}
                    className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-emerald-200/50 cursor-pointer group"
                >
                    <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                    Download File
                </button>
                <button
                    onClick={onReset}
                    className="w-full px-6 py-3.5 bg-zinc-100 text-zinc-500 rounded-xl font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.98]"
                >
                    <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                    Start New
                </button>
            </div>
        </motion.div>
    );
}
