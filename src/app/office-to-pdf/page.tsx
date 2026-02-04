"use client";

import { useState } from "react";
import { FileSpreadsheet, Plus, Upload, Check, Info } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import { motion } from "framer-motion";

export default function OfficeToPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleConvert = async () => {
        if (!file) return;

        setIsConverting(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/office-to-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                const errorData = await response.json();
                alert(`Conversion failed: ${errorData.message || errorData.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Document Selected</span>
                </div>
                {file ? (
                    <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-white p-2 rounded-xl border border-rose-100 shadow-sm">
                        <Check size={14} />
                        Ready to convert
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-xl border border-zinc-100 italic">
                        No file uploaded
                    </div>
                )}
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 mb-6 group hover:border-indigo-100 transition-colors">
                <div className="flex gap-3">
                    <div className="mt-1">
                        <Info size={16} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-1">Quality Assurance</p>
                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                            Our AI preserves all fonts, images, and formatting from your original Office document.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-4 mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={!file}
                    icon={FileSpreadsheet}
                    text="Convert to PDF"
                    processingText="Converting..."
                    bgColor="bg-rose-600"
                    className="shadow-rose-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Office to PDF"
            description="Premium Word, Excel, & PPT conversion."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Original", value: file?.name || "" },
                            { label: "Converted", value: "PDF Document" }
                        ]}
                    />
                </div>
            )}
        >
            {file ? (
                <div className="w-full max-w-sm mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 flex flex-col items-center text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600/10" />

                        <div className="w-28 h-36 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex flex-col items-center justify-center mb-8 shadow-inner relative overflow-hidden group transition-transform duration-500 hover:scale-105">
                            <div className="absolute top-0 right-0 w-10 h-10 bg-indigo-100 rounded-bl-2xl shadow-sm" />
                            <FileSpreadsheet size={56} className="text-indigo-500 mb-2 group-hover:rotate-3 transition-transform duration-300" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-[8px]">OFFICE FILE</span>
                        </div>

                        <h3 className="text-xl font-black text-zinc-900 mb-2 truncate max-w-full px-4 tracking-tight">{file.name}</h3>
                        <div className="px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100 mb-10">
                            <p className="text-xs font-black text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>

                        <label className="text-sm font-black text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-2 transition-all hover:gap-3 group active:scale-95">
                            <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                            <span>Replace File</span>
                            <input type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                        </label>
                    </motion.div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <FileSpreadsheet className="text-rose-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Convert Office to PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Drag and drop your Word, Excel, or PowerPoint document here to turn it into a high-quality PDF.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 cursor-pointer transition-all shadow-xl shadow-rose-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select Office File</span>
                        <input type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
