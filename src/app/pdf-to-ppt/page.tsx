"use client";

import { useState } from "react";
import { Presentation, Plus, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function PDFToPPT() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", files[0]);

        try {
            const response = await fetch("/api/pdf-to-ppt", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                alert("Conversion failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Presentation Flow</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Turn your PDF documents into editable PowerPoint slides while keeping the layout and images intact.
                </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Features</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>High-quality slide generation</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>Editable text and shapes</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>Preserve image quality</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isProcessing}
                    disabled={files.length === 0}
                    icon={Presentation}
                    text="Convert to PowerPoint"
                    processingText="Generating Slides..."
                    bgColor="bg-orange-600"
                    className="shadow-orange-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="PDF to PowerPoint"
            description="Convert PDF pages to PowerPoint slides"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Format", value: "PPTX" },
                            { label: "Original", value: files[0]?.name || "" }
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
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl transition-all active:scale-95">
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
                    <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Presentation className="text-orange-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">PDF to PowerPoint</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Convert your PDF documents into high-quality PowerPoint presentations in a single click.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 cursor-pointer transition-all shadow-xl shadow-orange-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
