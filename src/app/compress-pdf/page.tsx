"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Minimize2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUploadCard from "@/components/FileUploadCard";

export default function CompressPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressedFile, setCompressedFile] = useState<{
        fileName: string;
        downloadUrl: string;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
    } | null>(null);
    const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");

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
                setCompressedFile(data);
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

    const compressionOptions = [
        {
            level: "low" as const,
            label: "Low Compression",
            description: "Best quality, larger file size",
            color: "green",
        },
        {
            level: "medium" as const,
            label: "Medium Compression",
            description: "Balanced quality and size",
            color: "blue",
        },
        {
            level: "high" as const,
            label: "High Compression",
            description: "Smaller file size, reduced quality",
            color: "purple",
        },
    ];

    return (
        <PageLayout
            title="Compress PDF"
            description="Reduce PDF file size without losing quality"
        >
            <div className="space-y-6">
                {/* File Upload Section */}
                <FileUploadCard
                    file={file}
                    onFileChange={setFile}
                    accept=".pdf"
                />

                {/* Compression Options */}
                {file && !compressedFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
                            <h3 className="text-lg font-semibold mb-4">Compression Level</h3>

                            <div className="space-y-3 mb-6">
                                {compressionOptions.map((option) => (
                                    <button
                                        key={option.level}
                                        onClick={() => setCompressionLevel(option.level)}
                                        className={`w-full text-left p-4 rounded-lg transition-all ${compressionLevel === option.level
                                                ? `bg-${option.color}-500/20 border border-${option.color}-500/30`
                                                : "bg-zinc-800/40 border border-white/5 hover:border-white/10"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p
                                                    className={`font-medium mb-1 ${compressionLevel === option.level
                                                            ? `text-${option.color}-400`
                                                            : "text-white"
                                                        }`}
                                                >
                                                    {option.label}
                                                </p>
                                                <p className="text-sm text-zinc-400">
                                                    {option.description}
                                                </p>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${compressionLevel === option.level
                                                        ? `border-${option.color}-500`
                                                        : "border-zinc-600"
                                                    }`}
                                            >
                                                {compressionLevel === option.level && (
                                                    <div className={`w-2.5 h-2.5 rounded-full bg-${option.color}-500`} />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleCompress}
                                disabled={isCompressing}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCompressing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Compressing PDF...
                                    </>
                                ) : (
                                    <>
                                        <Minimize2 size={20} />
                                        Compress PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success Message */}
                {compressedFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="text-emerald-400" size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-emerald-400 mb-1">
                                        Success! Your PDF has been compressed
                                    </p>
                                    <p className="text-sm text-zinc-400">{compressedFile.fileName}</p>
                                </div>
                            </div>

                            {/* Compression Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-zinc-900/40 p-4 rounded-lg border border-white/5 text-center">
                                    <p className="text-xs text-zinc-400 mb-1">Original Size</p>
                                    <p className="text-lg font-bold text-white">
                                        {(compressedFile.originalSize / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <div className="bg-zinc-900/40 p-4 rounded-lg border border-white/5 text-center">
                                    <p className="text-xs text-zinc-400 mb-1">Compressed Size</p>
                                    <p className="text-lg font-bold text-emerald-400">
                                        {(compressedFile.compressedSize / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <div className="bg-zinc-900/40 p-4 rounded-lg border border-white/5 text-center">
                                    <p className="text-xs text-zinc-400 mb-1">Saved</p>
                                    <p className="text-lg font-bold text-emerald-400">
                                        {compressedFile.compressionRatio}%
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <a
                                    href={compressedFile.downloadUrl}
                                    className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors text-center"
                                >
                                    Download Compressed PDF
                                </a>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setCompressedFile(null);
                                    }}
                                    className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Compress Another
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-10"></div>

                    <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
                        <h3 className="font-semibold mb-3 text-zinc-300">How to compress PDFs:</h3>
                        <ol className="space-y-2 text-sm text-zinc-400">
                            <li className="flex gap-2">
                                <span className="text-green-400 font-medium">1.</span>
                                <span>Upload the PDF file you want to compress</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-green-400 font-medium">2.</span>
                                <span>Select your preferred compression level</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-green-400 font-medium">3.</span>
                                <span>Click "Compress PDF" and wait for processing</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-green-400 font-medium">4.</span>
                                <span>Download your compressed file and save space!</span>
                            </li>
                        </ol>
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
