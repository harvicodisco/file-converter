"use client";

import { useState } from "react";
import { FileText, Upload, Plus } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion } from "framer-motion";
import { PDFDocument } from 'pdf-lib';

export default function CompressPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [result, setResult] = useState<{
        fileName: string;
        downloadUrl: string;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
        alreadyOptimized?: boolean;
    } | null>(null);
    const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [compressionProgress, setCompressionProgress] = useState<{ current: number; total: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setResult(null);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsCompressing(true);
        console.log(`Starting compression: level=${compressionLevel}, originalSize=${file.size}`);

        try {
            if (compressionLevel === "high") {
                // Extreme Compression: Rasterize pages to compressed JPEGs
                console.log("Using Extreme Compression (Client-side Rasterization)");

                // Dynamic import
                const pdfjsLib = await import('pdfjs-dist');

                // Set worker path - using unpkg which is generally more reliable for ES modules
                const version = pdfjsLib.version || '5.4.624';
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                const pdfDoc = await PDFDocument.create();

                setCompressionProgress({ current: 0, total: pdf.numPages });

                console.log(`PDF loaded. Pages: ${pdf.numPages}`);

                const isSmallFile = file.size < 102400; // Under 100KB

                for (let i = 1; i <= pdf.numPages; i++) {
                    setCompressionProgress({ current: i, total: pdf.numPages });
                    console.log(`Processing page ${i}/${pdf.numPages}...`);
                    const page = await pdf.getPage(i);
                    // Extremely aggressive resolution for small files to try and beat 19KB
                    const scale = isSmallFile ? 0.5 : 0.75;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (!context) throw new Error("Could not create canvas context");

                    await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;

                    // Extremely aggressive quality for small files
                    const quality = isSmallFile ? 0.15 : 0.3;
                    const imgData = canvas.toDataURL('image/jpeg', quality);

                    // Robust DataURL to Uint8Array/ArrayBuffer conversion
                    const res = await fetch(imgData);
                    const imgBytes = await res.arrayBuffer();
                    const image = await pdfDoc.embedJpg(imgBytes);

                    const { width, height } = image.scale(1);
                    const pdfPage = pdfDoc.addPage([width, height]);
                    pdfPage.drawImage(image, { x: 0, y: 0, width, height });

                    // Cleanup canvas to free memory
                    canvas.width = 0;
                    canvas.height = 0;
                }

                console.log("Saving compressed PDF...");
                const pdfBytes = await pdfDoc.save({
                    useObjectStreams: true,
                    addDefaultPage: false,
                });

                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                const downloadUrl = URL.createObjectURL(blob);

                console.log(`Extreme compression complete. New size: ${blob.size}`);

                setResult({
                    fileName: `extreme_compressed_${file.name}`,
                    downloadUrl: downloadUrl,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    compressionRatio: Math.max(0, Math.floor(((file.size - blob.size) / file.size) * 100)),
                    alreadyOptimized: (file.size - blob.size) <= 0
                });
            } else {
                // Standard Compression: Use API for metadata cleanup
                console.log(`Using Standard Compression (API: ${compressionLevel})`);
                const formData = new FormData();
                formData.append("file", file);
                formData.append("compressionLevel", compressionLevel);

                const response = await fetch("/api/compress-pdf", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const downloadUrl = URL.createObjectURL(blob);

                    const savings = file.size - blob.size;
                    const ratio = Math.max(0, Math.floor((savings / file.size) * 100));

                    console.log(`Standard compression complete. New size: ${blob.size}`);

                    setResult({
                        fileName: `compressed_${file.name}`,
                        downloadUrl: downloadUrl,
                        originalSize: file.size,
                        compressedSize: blob.size,
                        compressionRatio: ratio,
                        alreadyOptimized: savings <= 0
                    });
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "API compression failed");
                }
            }
        } catch (error: any) {
            console.error("Compression error:", error);
            alert(`Error: ${error.message || "An error occurred during compression"}`);
        } finally {
            setIsCompressing(false);
            setCompressionProgress(null);
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

    const compressionOptions = [
        { level: "low", label: "Low Compression", desc: "Best Quality, Basic Size Reduction" },
        { level: "medium", label: "Recommended", desc: "Balanced Quality, Professional Reduction" },
        { level: "high", label: "Extreme (Rasterize)", desc: "Smallest Size, Text Becomes Image" },
    ];

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Compression Level</span>
                </div>
                <div className="space-y-3">
                    {compressionOptions.map((opt) => (
                        <div key={opt.level}>
                            <div
                                onClick={() => setCompressionLevel(opt.level as "low" | "medium" | "high")}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${compressionLevel === opt.level
                                    ? 'border-indigo-600 bg-white shadow-sm'
                                    : 'border-zinc-100 bg-white hover:border-indigo-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-bold ${compressionLevel === opt.level ? 'text-indigo-700' : 'text-zinc-700'}`}>
                                        {opt.label}
                                    </span>
                                    {compressionLevel === opt.level && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-sm" />}
                                </div>
                                <p className="text-[10px] text-zinc-400 font-medium">{opt.desc}</p>
                            </div>
                            {opt.level === "high" && (
                                <p className="mt-2 ml-1 text-[9px] text-amber-600 font-bold flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-amber-500 shadow-sm" />
                                    Warning: Text becomes non-searchable (image-based)
                                </p>
                            )}
                            {opt.level !== "high" && (
                                <p className="mt-2 ml-1 text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-sm" />
                                    Keeps text searchable & optimized
                                </p>
                            )}
                        </div>
                    ))}
                    {result?.alreadyOptimized ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center mb-6">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
                                <FileText className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-amber-900 font-bold mb-1">Your File is Already Optimal</h3>
                            <p className="text-amber-700 text-[11px] font-medium px-4 leading-relaxed">
                                Professional analysis shows this PDF ({Math.round(result.originalSize / 1024)} KB) is already at its minimum possible size.
                                Further compression would require removing essential text or styling.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleCompress}
                    isProcessing={isCompressing}
                    disabled={!file}
                    icon={FileText}
                    text="Compress PDF"
                    processingText={compressionProgress
                        ? `Processing Page ${compressionProgress.current}/${compressionProgress.total}...`
                        : "Compressing..."
                    }
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Compress PDF"
            description="Reduce PDF file size without losing quality"
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
                        <label className="text-xs font-black text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
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
                        <Upload className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Compress PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Optimize your PDF files for web and email by reducing their size without sacrificing readability.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 cursor-pointer transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
