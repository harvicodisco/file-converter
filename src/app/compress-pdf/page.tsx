"use client";

import { useState } from "react";
import { FileText, Upload, Plus } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import { motion } from "framer-motion";

export default function CompressPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [result, setResult] = useState<{
        fileName: string;
        downloadUrl: string;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
    } | null>(null);
    const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null); // Reset result on new file
        }
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsCompressing(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("compressionLevel", compressionLevel);

        try {
            const response = await fetch("/api/compress-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                alert("Compression failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsCompressing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    const compressionOptions = [
        { level: "low", label: "Low Compression", desc: "High Quality, Less Compression" },
        { level: "medium", label: "Recommended", desc: "Good Quality, Good Compression" },
        { level: "high", label: "Extreme", desc: "Low Quality, High Compression" },
    ];

    const SettingsPanel = (
        <>
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">Compression Level</span>
                </div>
                <div className="space-y-3">
                    {compressionOptions.map((opt) => (
                        <div
                            key={opt.level}
                            onClick={() => setCompressionLevel(opt.level as "low" | "medium" | "high")}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${compressionLevel === opt.level
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-zinc-200 bg-white hover:border-indigo-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-bold ${compressionLevel === opt.level ? 'text-indigo-700' : 'text-zinc-700'}`}>
                                    {opt.label}
                                </span>
                                {compressionLevel === opt.level && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-sm shadow-indigo-300" />}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-medium">{opt.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 mt-auto">
                <ProcessingButton
                    onClick={handleCompress}
                    isProcessing={isCompressing}
                    disabled={!file}
                    icon={FileText}
                    text="Compress PDF"
                    processingText="Compressing..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </>
    );

    return (
        <ConversionLayout
            title="Compress PDF"
            description="Reduce PDF file size."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Original", value: `${((result.originalSize || 0) / 1024 / 1024).toFixed(2)} MB` },
                            { label: "Compressed", value: `${((result.compressedSize || 0) / 1024 / 1024).toFixed(2)} MB` },
                            { label: "Savings", value: `${result.compressionRatio}%` },
                        ]}
                    />
                </div>
            )}
        >
            {file ? (
                <div className="w-full max-w-sm mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 flex flex-col items-center text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600/10" />

                        <div className="w-28 h-36 bg-red-50 rounded-2xl border-2 border-red-100 flex flex-col items-center justify-center mb-8 shadow-inner relative overflow-hidden group transition-transform duration-500 hover:scale-105">
                            <div className="absolute top-0 right-0 w-10 h-10 bg-red-100 rounded-bl-2xl shadow-sm" />
                            <FileText size={56} className="text-red-500 mb-2 group-hover:rotate-3 transition-transform duration-300" />
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">PDF DOCUMENT</span>
                        </div>

                        <h3 className="text-xl font-black text-zinc-900 mb-2 truncate max-w-full px-4 tracking-tight">{file.name}</h3>
                        <div className="px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100 mb-10">
                            <p className="text-xs font-black text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>

                        <label className="text-sm font-black text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-2 transition-all hover:gap-3 group active:scale-95">
                            <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                            <span>Replace Document</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    </motion.div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Upload className="text-zinc-300" size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">No PDF selected</h3>
                    <p className="text-zinc-400 text-sm mb-6">Select a PDF file to compress it.</p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer transition-all shadow-lg shadow-indigo-200">
                        <Plus size={18} />
                        <span>Select PDF</span>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
