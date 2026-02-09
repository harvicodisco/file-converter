"use client";

import { useState } from "react";
import { Wrench, Plus, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function RepairPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
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

    const handleRepair = async () => {
        if (!file) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/repair-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);

                setResult({
                    fileName: `repaired_${file.name}`,
                    downloadUrl: downloadUrl,
                });
            } else {
                const error = await response.json();
                alert(error.error || "Failed to repair PDF");
            }
        } catch (error) {
            console.error("Repair error:", error);
            alert("An error occurred during PDF repair");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFile(null);
        setResult(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="space-y-6 mb-6">
                {/* Info Box */}
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-3">
                        <Wrench className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-xs font-black text-blue-700 mb-1">Repair Corrupted PDF</p>
                            <p className="text-xs font-semibold text-blue-600 leading-relaxed">
                                Fix PDF files that won't open, display incorrectly, or have errors. This tool rebuilds the PDF structure to make it readable again.
                            </p>
                        </div>
                    </div>
                </div>

                {/* What gets fixed */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        What gets fixed
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs font-semibold text-zinc-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <span>Corrupted file structure and cross-reference tables</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-semibold text-zinc-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <span>Broken page trees and object streams</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-semibold text-zinc-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <span>Invalid PDF headers and metadata</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-semibold text-zinc-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <span>Display and rendering issues</span>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                        <span className="font-black">Note:</span> Severely corrupted files may lose some content during repair. The tool will preserve as much as possible.
                    </p>
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleRepair}
                    isProcessing={isProcessing}
                    disabled={!file}
                    icon={Wrench}
                    text="Repair PDF"
                    processingText="Repairing PDF..."
                    bgColor="bg-blue-600"
                    className="shadow-blue-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Repair PDF"
            description="Fix corrupted or damaged PDF files. Rebuild PDF structure to make unreadable files accessible again."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Status", value: "PDF Repaired" }
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
                                <FileText size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group">
                        <iframe
                            src={`${previewUrl}#toolbar=0`}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Source Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Wrench className="text-blue-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Repair PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Fix corrupted or damaged PDF files. Rebuild the PDF structure to restore access to unreadable documents.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 cursor-pointer transition-all shadow-xl shadow-blue-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}

