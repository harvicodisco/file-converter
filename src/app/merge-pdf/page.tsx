"use client";

import { useState } from "react";
import { Merge, Plus, Trash2, ArrowUp, ArrowDown, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
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
        <>
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">Total Files</span>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-md shadow-sm">{files.length}</span>
                </div>
                {files.length >= 2 ? (
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold bg-white p-2 rounded-lg border border-indigo-100">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Ready to merge
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-lg border border-zinc-100">
                        <span className="w-2 h-2 rounded-full bg-zinc-300" />
                        Add {2 - files.length} more file{2 - files.length > 1 ? 's' : ''}
                    </div>
                )}
            </div>

            <div className="pt-4 mt-auto">
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
        </>
    );

    return (
        <ConversionLayout
            title="Merge PDF"
            description="Combine multiple PDF files into one."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center py-8">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Files Merged", value: files.length.toString() },
                            { label: "Status", value: "Success" }
                        ]}
                    />
                </div>
            )}
        >
            {files.length > 0 ? (
                <div className="w-full max-w-3xl mx-auto space-y-3 pb-20">
                    <AnimatePresence>
                        {files.map((file, index) => (
                            <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-zinc-800 truncate">{file.name}</p>
                                    <p className="text-xs text-zinc-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>

                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col sm:flex-row gap-1">
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
                                    <div className="w-px h-6 bg-zinc-200 mx-1 hidden sm:block" />
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

                    <label className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-dashed border-zinc-300 rounded-xl hover:border-indigo-400 hover:text-indigo-600 text-zinc-400 font-bold transition-all cursor-pointer group hover:bg-indigo-50/10">
                        <Plus size={20} className="group-hover:scale-110 transition-transform" />
                        <span>Add more PDFs</span>
                        <input type="file" multiple accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Merge className="text-zinc-300" size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">No PDFs selected</h3>
                    <p className="text-zinc-400 text-sm mb-6">Select multiple PDF files to combine them into one document.</p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer transition-all shadow-lg shadow-indigo-200">
                        <Plus size={18} />
                        <span>Select PDFs</span>
                        <input type="file" multiple accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
