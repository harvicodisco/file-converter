"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Plus, X } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUploadCard from "@/components/FileUploadCard";

export default function MergePDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const [mergedFile, setMergedFile] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleAddFile = (file: File | null) => {
        if (file && !files.find(f => f.name === file.name)) {
            setFiles([...files, file]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            alert("Please add at least 2 PDF files to merge");
            return;
        }

        setIsMerging(true);
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("files", file);
        });

        try {
            const response = await fetch("/api/merge-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setMergedFile(data);
            } else {
                alert("Merge failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <PageLayout
            title="Merge PDF"
            description="Combine multiple PDF files into a single document"
        >
            <div className="space-y-6">
                {/* File Upload Section */}
                <FileUploadCard
                    file={null}
                    onFileChange={handleAddFile}
                    accept=".pdf"
                />

                {/* Files List */}
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                    Selected Files ({files.length})
                                </h3>
                                <button
                                    onClick={() => setFiles([])}
                                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <motion.div
                                        key={`${file.name}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-lg border border-white/5 group/item"
                                    >
                                        <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center text-sm font-medium text-purple-400 flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-medium truncate text-sm">{file.name}</p>
                                            <p className="text-xs text-zinc-500">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover/item:opacity-100 flex-shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            <button
                                onClick={handleMerge}
                                disabled={isMerging || files.length < 2}
                                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isMerging ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Merging PDFs...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Merge {files.length} PDFs
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success Message */}
                {mergedFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="text-emerald-400" size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-emerald-400 mb-1">
                                        Success! Your PDFs have been merged
                                    </p>
                                    <p className="text-sm text-zinc-400">{mergedFile.fileName}</p>
                                </div>
                                <a
                                    href={mergedFile.downloadUrl}
                                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors flex-shrink-0"
                                >
                                    Download
                                </a>
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
                        <h3 className="font-semibold mb-3 text-zinc-300">How to merge PDFs:</h3>
                        <ol className="space-y-2 text-sm text-zinc-400">
                            <li className="flex gap-2">
                                <span className="text-purple-400 font-medium">1.</span>
                                <span>Click the upload area to select your first PDF file</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-purple-400 font-medium">2.</span>
                                <span>Add more PDF files by clicking the upload area again</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-purple-400 font-medium">3.</span>
                                <span>Arrange files in the desired order (coming soon)</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-purple-400 font-medium">4.</span>
                                <span>Click "Merge PDFs" to combine them into one file</span>
                            </li>
                        </ol>
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
