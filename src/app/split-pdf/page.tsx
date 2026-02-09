"use client";

import { useState } from "react";
import { Scissors, FileText, Check, Plus } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function SplitPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isSplitting, setIsSplitting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [splitMode, setSplitMode] = useState<"pages" | "range">("pages");
    const [pageNumbers, setPageNumbers] = useState("");
    const [pageRange, setPageRange] = useState({ from: "", to: "" });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSplit = async () => {
        if (files.length === 0) return;

        setIsSplitting(true);
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("splitMode", splitMode);

        if (splitMode === "pages") {
            formData.append("pageNumbers", pageNumbers);
        } else {
            formData.append("pageFrom", pageRange.from);
            formData.append("pageTo", pageRange.to);
        }

        try {
            const response = await fetch("/api/split-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.files && data.files.length > 0) {
                    setResult(data.files[0]);
                }
            } else {
                alert("Split failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsSplitting(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
        setPageNumbers("");
        setPageRange({ from: "", to: "" });
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Split Mode</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setSplitMode("pages")}
                        className={`px-3 py-3 rounded-xl font-bold text-xs transition-all border-2 ${splitMode === "pages"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-zinc-500 border-zinc-100 hover:border-indigo-200"
                            }`}
                    >
                        Select Pages
                    </button>
                    <button
                        onClick={() => setSplitMode("range")}
                        className={`px-3 py-3 rounded-xl font-bold text-xs transition-all border-2 ${splitMode === "range"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-zinc-500 border-zinc-100 hover:border-indigo-200"
                            }`}
                    >
                        Range Split
                    </button>
                </div>
            </div>

            <div className="space-y-6 mb-8">
                {splitMode === "pages" ? (
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                            Page Numbers (comma separated)
                        </label>
                        <input
                            type="text"
                            value={pageNumbers}
                            onChange={(e) => setPageNumbers(e.target.value)}
                            placeholder="e.g., 1, 4, 8-12"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all text-sm"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">From</label>
                            <input
                                type="number"
                                value={pageRange.from}
                                onChange={(e) => setPageRange({ ...pageRange, from: e.target.value })}
                                placeholder="1"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">To</label>
                            <input
                                type="number"
                                value={pageRange.to}
                                onChange={(e) => setPageRange({ ...pageRange, to: e.target.value })}
                                placeholder="10"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleSplit}
                    isProcessing={isSplitting}
                    disabled={files.length === 0}
                    icon={Scissors}
                    text="Split PDF Now"
                    processingText="Processing..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Split PDF"
            description="Extract specific pages or separate your PDF into multiple documents"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Original", value: files[0]?.name || "" },
                            { label: "Mode", value: splitMode.toUpperCase() }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : files.length > 0 && previewUrl ? (
                <div className="w-full h-full max-w-5xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                File Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group">
                        <iframe
                            src={`${previewUrl}#toolbar=0`}
                            className="w-full h-full border-none"
                            title="Pre-conversion Preview"
                        />
                        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Source Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Scissors className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Split your PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Separate one page or a whole range for easy conversion into independent PDF documents.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 cursor-pointer transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
