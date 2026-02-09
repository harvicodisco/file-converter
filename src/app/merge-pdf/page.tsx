"use client";

import { useState } from "react";
import { Merge, Plus, Trash2, ArrowUp, ArrowDown, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";

export default function MergePDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === files.length - 1)
        ) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newFiles = [...files];
        [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
        setFiles(newFiles);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            alert("Please add at least 2 PDF files to merge");
            return;
        }

        setIsMerging(true);
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        try {
            const response = await fetch("/api/merge-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
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

    const handleReset = () => {
        setFiles([]);
        setResult(null);
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Files</span>
                    <span className="text-sm font-black text-indigo-600 bg-white px-2 py-1 rounded-lg shadow-sm">{files.length}</span>
                </div>
                {files.length >= 2 ? (
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Ready to merge
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-xl border border-zinc-100 italic">
                        Add {Math.max(0, 2 - files.length)} more file{2 - files.length > 1 ? 's' : ''}
                    </div>
                )}
            </div>

            <p className="text-xs font-bold text-zinc-500 mb-8 px-1 leading-relaxed">
                Reorder your PDFs by using the arrow buttons before clicking merge.
            </p>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleMerge}
                    isProcessing={isMerging}
                    disabled={files.length < 2}
                    icon={Merge}
                    text={`Merge ${files.length} PDF${files.length !== 1 ? "s" : ""}`}
                    processingText="Merging PDFs..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Merge PDF"
            description="Combine multiple PDF files into one single document"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Merged", value: `${files.length} Files` },
                            { label: "Size", value: `${(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB` }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : files.length > 0 ? (
                <div className="w-full max-w-4xl mx-auto flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Merge size={14} className="text-zinc-300" />
                                Merge Queue
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{files.length} documents selected for merging</p>
                        </div>
                        <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Add Files</span>
                            <input type="file" multiple accept=".pdf" onChange={handleFilesChange} className="hidden" />
                        </label>
                    </div>

                    <div className="space-y-3 pb-20">
                        <AnimatePresence>
                            {files.map((file, index) => (
                                <motion.div
                                    key={`${file.name}-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0 border border-red-100">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-zinc-800 truncate">{file.name}</p>
                                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-tighter">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => moveFile(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer transition-colors"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => moveFile(index, 'down')}
                                                disabled={index === files.length - 1}
                                                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer transition-colors"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                        </div>
                                        <div className="w-px h-6 bg-zinc-100 mx-1" />
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Merge className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Merge PDFs</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Combine multiple PDF files into a single, perfectly ordered document in seconds.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 cursor-pointer transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF Files</span>
                        <input type="file" multiple accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
