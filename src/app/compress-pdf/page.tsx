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
    } | null>(null);
    const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

        try {
            if (compressionLevel === "high") {
                // Dynamic import to avoid SSR errors
                const pdfjsLib = await import('pdfjs-dist');
                // Set worker path
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                // Extreme Compression: Rasterize pages to compressed JPEGs
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const pdfDoc = await PDFDocument.create();

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    // Use scale 1.0 (original size at 72dpi) for aggressive compression
                    const viewport = page.getViewport({ scale: 1.0 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context!, viewport, canvas: canvas }).promise;

                    // Convert canvas to optimized JPEG
                    // 0.4 quality provides significant savings while keeping text readable
                    const imgData = canvas.toDataURL('image/jpeg', 0.4);
                    const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
                    const image = await pdfDoc.embedJpg(imgBytes);

                    const { width, height } = image.scale(1);
                    const pdfPage = pdfDoc.addPage([width, height]);
                    pdfPage.drawImage(image, { x: 0, y: 0, width, height });
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                const downloadUrl = URL.createObjectURL(blob);

                setResult({
                    fileName: `extreme_compressed_${file.name}`,
                    downloadUrl: downloadUrl,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    compressionRatio: Math.floor(((file.size - blob.size) / file.size) * 100),
                });
            } else {
                // Standard Compression: Use API for metadata cleanup
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

                    setResult({
                        fileName: `compressed_${file.name}`,
                        downloadUrl: downloadUrl,
                        originalSize: file.size,
                        compressedSize: blob.size,
                        compressionRatio: ratio,
                    });
                } else {
                    alert("Compression failed");
                }
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred during compression");
        } finally {
            setIsCompressing(false);
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
        { level: "low", label: "Low Compression", desc: "High Quality, Less Compression" },
        { level: "medium", label: "Recommended", desc: "Good Quality, Good Compression" },
        { level: "high", label: "Extreme", desc: "Low Quality, High Compression" },
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
                                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                                    Warning: File will become non-searchable (image-based)
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleCompress}
                    isProcessing={isCompressing}
                    disabled={!file}
                    icon={FileText}
                    text="Compress PDF"
                    processingText="Compressing..."
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
