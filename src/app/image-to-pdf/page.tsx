/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { FileImage, Plus, Trash2, GripVertical, Check } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { PDFDocument, PageSizes } from 'pdf-lib';

export default function ImageToPDF() {
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    // Settings
    const [pageSize, setPageSize] = useState("a4");
    const [orientation, setOrientation] = useState("portrait");
    const [margin, setMargin] = useState("none");
    const [filesPreview, setFilesPreview] = useState<{ id: string; url: string; file: File }[]>([]);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            const newPreviews = newFiles.map(file => ({
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                url: URL.createObjectURL(file),
                file: file
            }));
            setFilesPreview(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (id: string) => {
        setFilesPreview(prev => {
            const item = prev.find(p => p.id === id);
            if (item) URL.revokeObjectURL(item.url);
            return prev.filter(p => p.id !== id);
        });
    };

    const handleConvert = async () => {
        if (filesPreview.length === 0) return;

        setIsConverting(true);
        try {
            const pdfDoc = await PDFDocument.create();

            for (const item of filesPreview) {
                const arrayBuffer = await item.file.arrayBuffer();
                let image;

                try {
                    const type = item.file.type;
                    if (type === 'image/jpeg' || type === 'image/jpg') {
                        image = await pdfDoc.embedJpg(arrayBuffer);
                    } else if (type === 'image/png') {
                        image = await pdfDoc.embedPng(arrayBuffer);
                    } else {
                        // For other types (webp, etc.), convert to JPG using canvas
                        const img = new Image();
                        img.src = item.url;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });

                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0);

                        const jpgBase64 = canvas.toDataURL('image/jpeg', 0.95);
                        const jpgBytes = await fetch(jpgBase64).then(res => res.arrayBuffer());
                        image = await pdfDoc.embedJpg(jpgBytes);
                    }
                } catch (e) {
                    console.error("Error embedding image", e);
                    continue;
                }

                if (!image) continue;

                let pWidth, pHeight;
                if (pageSize === 'a4') {
                    [pWidth, pHeight] = orientation === 'portrait' ? PageSizes.A4 : [PageSizes.A4[1], PageSizes.A4[0]];
                } else if (pageSize === 'letter') {
                    [pWidth, pHeight] = orientation === 'portrait' ? PageSizes.Letter : [PageSizes.Letter[1], PageSizes.Letter[0]];
                } else {
                    // fit
                    const { width, height } = image.scale(1);
                    pWidth = width;
                    pHeight = height;
                }

                const page = pdfDoc.addPage([pWidth, pHeight]);

                const mValue = margin === 'small' ? 20 : margin === 'large' ? 50 : 0;
                const availableWidth = pWidth - (mValue * 2);
                const availableHeight = pHeight - (mValue * 2);

                const { width, height } = image.scale(1);
                const scale = Math.min(availableWidth / width, availableHeight / height);
                const drawWidth = width * scale;
                const drawHeight = height * scale;

                page.drawImage(image, {
                    x: (pWidth - drawWidth) / 2,
                    y: (pHeight - drawHeight) / 2,
                    width: drawWidth,
                    height: drawHeight,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);

            setResult({
                fileName: "converted_images.pdf",
                downloadUrl: downloadUrl,
            });
        } catch (error) {
            console.error(error);
            alert("Error converting images to PDF. Please try again.");
        } finally {
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        filesPreview.forEach(p => URL.revokeObjectURL(p.url));
        setFilesPreview([]);
        setResult(null);
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Selected Images</span>
                    <span className="text-sm font-black text-indigo-600 bg-white px-2 py-1 rounded-lg shadow-sm">{filesPreview.length}</span>
                </div>
                <label className="cursor-pointer group flex items-center justify-center gap-2 w-full py-3.5 bg-white border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 text-zinc-400 font-bold transition-all active:scale-[0.98]">
                    <Plus size={18} />
                    <span>Append images</span>
                    <input type="file" multiple accept="image/*" onChange={handleFilesChange} className="hidden" />
                </label>
            </div>

            <div className="space-y-6">
                {/* Page Size */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Page Size</label>
                    <div className="grid grid-cols-1 gap-2">
                        {['a4', 'letter', 'fit'].map((size) => (
                            <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${pageSize === size ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm" : "border-zinc-100 bg-white text-zinc-500 hover:border-indigo-200"
                                    }`}
                            >
                                <span className="text-sm font-bold capitalize">{size}</span>
                                {pageSize === size && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orientation */}
                <div className={pageSize === 'fit' ? 'opacity-40 pointer-events-none' : ''}>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Orientation</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['portrait', 'landscape'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setOrientation(mode)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${orientation === mode ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm" : "border-zinc-100 bg-white text-zinc-500 hover:border-indigo-200"
                                    }`}
                            >
                                <div className={`${mode === 'portrait' ? 'w-5 h-7' : 'w-7 h-5'} border-2 border-current rounded-sm mb-2 opacity-60`} />
                                <span className="text-xs font-bold capitalize">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Margin */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Margin</label>
                    <div className="flex gap-2">
                        {['none', 'small', 'large'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMargin(m)}
                                className={`flex-1 py-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold capitalize ${margin === m ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-zinc-100 bg-white text-zinc-500 hover:border-indigo-200"
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-8 mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={filesPreview.length === 0}
                    icon={FileImage}
                    text="Convert to PDF"
                    processingText="Generating PDF..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Image to PDF"
            description="Convert and organize images into a single PDF"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Images", value: filesPreview.length.toString() },
                            { label: "Format", value: "PDF" },
                            { label: "Page Size", value: pageSize.toUpperCase() }
                        ]}
                    />
                </div>
            )}
        >
            {filesPreview.length > 0 ? (
                <div className="w-full h-full p-6 sm:p-10">
                    <Reorder.Group
                        axis="y"
                        values={filesPreview}
                        onReorder={setFilesPreview}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
                    >
                        <AnimatePresence>
                            {filesPreview.map((item, index) => (
                                <Reorder.Item
                                    key={item.id}
                                    value={item}
                                    className="relative group cursor-grab active:cursor-grabbing"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    whileDrag={{ zIndex: 50, scale: 1.05 }}
                                >
                                    <div className="relative aspect-[3/4] bg-white rounded-2xl border-2 border-zinc-100 shadow-sm group-hover:border-indigo-300 group-hover:shadow-xl transition-all overflow-hidden flex flex-col">
                                        {/* Image Container */}
                                        <div className="flex-1 relative overflow-hidden bg-zinc-50 flex items-center justify-center p-2">
                                            <img
                                                src={item.url}
                                                alt="Preview"
                                                className="max-w-full max-h-full object-contain shadow-sm rounded-sm"
                                            />

                                            {/* Index Badge */}
                                            <div className="absolute top-2 left-2 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black text-indigo-600 shadow-sm border border-zinc-100">
                                                IMAGE {index + 1}
                                            </div>

                                            {/* Overlay for drag hint */}
                                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors duration-300" />
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="h-14 bg-white border-t border-zinc-100 flex items-center justify-between px-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFile(item.id);
                                                }}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                title="Remove image"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Move</span>
                                                <GripVertical size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>

                        {/* Add More Button in Grid */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <label className="flex flex-col items-center justify-center w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer transition-all group">
                                <div className="w-14 h-14 bg-zinc-100 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:scale-110 transition-all shadow-inner">
                                    <Plus className="text-zinc-400 group-hover:text-indigo-600" size={24} />
                                </div>
                                <span className="text-sm font-black text-zinc-400 group-hover:text-indigo-600">Add More</span>
                                <input type="file" multiple accept="image/*" onChange={handleFilesChange} className="hidden" />
                            </label>
                        </motion.div>
                    </Reorder.Group>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <FileImage className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Convert Images to PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Drag and drop images to create a single PDF document. You can reorder them after selection.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 cursor-pointer transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select Images</span>
                        <input type="file" multiple accept="image/*" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
