"use client";

import { useState } from "react";
import { FileSpreadsheet, Plus, Upload, Check, Info } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion } from "framer-motion";

export default function OfficeToPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setResult(null);
            setPreviewUrl(URL.createObjectURL(selectedFile));
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
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
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
            description="Convert Word, Excel, and PowerPoint documents to PDF"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Original", value: file?.name || "" },
                            { label: "Format", value: "PDF" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : file && previewUrl ? (
                <div className="w-full h-full max-w-5xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileSpreadsheet size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group">
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50">
                            <div className="w-20 h-24 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center mb-6 shadow-sm">
                                <FileSpreadsheet size={40} className="text-rose-400" />
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 mb-2">Office Document Ready</h3>
                            <p className="text-zinc-500 font-medium text-sm max-w-xs leading-relaxed">
                                We've received your {file.name.split('.').pop()?.toUpperCase()} file. Click "Convert to PDF" to generate your high-quality document.
                            </p>
                        </div>
                        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Source Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <FileSpreadsheet className="text-orange-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Office to PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Drag and drop your Word, Excel, or PowerPoint document here to turn it into a high-quality PDF.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 cursor-pointer transition-all shadow-xl shadow-orange-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select Office File</span>
                        <input type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
