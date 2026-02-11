"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Plus, FileText, X, Paperclip, ChevronDown } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

type PDFAVersion = "1b" | "1a" | "2b" | "2u" | "2a" | "3b" | "3u" | "3a";

export default function PDFToPDFA() {
    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pdfaVersion, setPdfaVersion] = useState<PDFAVersion>("2b");
    const [attachments, setAttachments] = useState<File[]>([]);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

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

        setIsConverting(true);
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("pdfaVersion", pdfaVersion);
        
        // Add attachments if PDF/A-3 is selected
        if (pdfaVersion.startsWith("3")) {
            attachments.forEach((attachment) => {
                formData.append("attachments", attachment);
            });
        }

        try {
            const response = await fetch("/api/pdf-to-pdfa", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const fileName = files[0].name.replace(".pdf", "_PDFA.pdf");

                setResult({
                    fileName: fileName,
                    downloadUrl: downloadUrl,
                });
            } else {
                const error = await response.json();
                alert(error.error || "Conversion failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred during conversion");
        } finally {
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFiles([]);
        setResult(null);
        setAttachments([]);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newAttachments = Array.from(e.target.files);
            setAttachments((prev) => [...prev, ...newAttachments]);
            // Reset input so same files can be selected again
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const isPDFA3 = pdfaVersion.startsWith("3");

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archiving</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Convert your PDF to the ISO-standardized PDF/A format for long-term document preservation and archiving.
                </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">PDF/A Conformance Level</h3>
                
                {(() => {
                    const options = [
                        { 
                            value: "1b" as PDFAVersion, 
                            label: "PDF/A-1b", 
                            desc: "Basic - Visual preservation only",
                            group: "PDF/A-1",
                            recommended: false
                        },
                        { 
                            value: "1a" as PDFAVersion, 
                            label: "PDF/A-1a", 
                            desc: "Accessible - Full text structure tags (Limited: accessibility tags not fully supported)",
                            group: "PDF/A-1",
                            recommended: false
                        },
                        { 
                            value: "2b" as PDFAVersion, 
                            label: "PDF/A-2b", 
                            desc: "Basic - Allows JPEG2000, transparency",
                            group: "PDF/A-2",
                            recommended: true
                        },
                        { 
                            value: "2u" as PDFAVersion, 
                            label: "PDF/A-2u", 
                            desc: "Unicode - Better text extraction",
                            group: "PDF/A-2",
                            recommended: false
                        },
                        { 
                            value: "2a" as PDFAVersion, 
                            label: "PDF/A-2a", 
                            desc: "Accessible - Full accessibility tags (Limited: accessibility tags not fully supported)",
                            group: "PDF/A-2",
                            recommended: false
                        },
                        { 
                            value: "3b" as PDFAVersion, 
                            label: "PDF/A-3b", 
                            desc: "Basic - Allows embedded files (Note: Existing attachments may be lost)",
                            group: "PDF/A-3",
                            recommended: false
                        },
                        { 
                            value: "3u" as PDFAVersion, 
                            label: "PDF/A-3u", 
                            desc: "Unicode - Better text extraction + embedded files (Note: Existing attachments may be lost)",
                            group: "PDF/A-3",
                            recommended: false
                        },
                        { 
                            value: "3a" as PDFAVersion, 
                            label: "PDF/A-3a", 
                            desc: "Accessible - Full accessibility + embedded files (Limited: accessibility tags not fully supported)",
                            group: "PDF/A-3",
                            recommended: false
                        },
                    ];
                    
                    const selectedOption = options.find(opt => opt.value === pdfaVersion) || options[0];
                    
                    return (
                        <>
                            <div className="relative">
                                <select
                                    value={pdfaVersion}
                                    onChange={(e) => {
                                        const newValue = e.target.value as PDFAVersion;
                                        setPdfaVersion(newValue);
                                        // Clear attachments if switching away from PDF/A-3
                                        if (!newValue.startsWith("3")) {
                                            setAttachments([]);
                                        }
                                    }}
                                    className="w-full px-4 py-3 pr-10 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 cursor-pointer appearance-none hover:border-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
                                >
                                    <optgroup label="PDF/A-1">
                                        <option value="1b">PDF/A-1b - Basic</option>
                                        <option value="1a">PDF/A-1a - Accessible (Limited)</option>
                                    </optgroup>
                                    <optgroup label="PDF/A-2">
                                        <option value="2b">PDF/A-2b - Basic (Recommended)</option>
                                        <option value="2u">PDF/A-2u - Unicode</option>
                                        <option value="2a">PDF/A-2a - Accessible (Limited)</option>
                                    </optgroup>
                                    <optgroup label="PDF/A-3">
                                        <option value="3b">PDF/A-3b - Basic + Attachments</option>
                                        <option value="3u">PDF/A-3u - Unicode + Attachments</option>
                                        <option value="3a">PDF/A-3a - Accessible + Attachments (Limited)</option>
                                    </optgroup>
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                            
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-zinc-700">{selectedOption.label}</span>
                                    {selectedOption.recommended && (
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            RECOMMENDED
                                        </span>
                                    )}
                                    {selectedOption.value.endsWith('a') && (
                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            LIMITED
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-zinc-500 font-medium">{selectedOption.desc}</p>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Attachments section - only for PDF/A-3 */}
            {isPDFA3 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Embedded Files (PDF/A-3)</h3>
                    <p className="text-xs font-semibold text-zinc-500 mb-3">
                        Add files to embed in the PDF/A-3 document (images, CSV, XML, Office docs, etc.)
                    </p>
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-[10px] font-black text-amber-700 mb-1">⚠️ Important:</p>
                        <p className="text-[10px] font-semibold text-amber-600">
                            If converting a PDF that already has attachments, those attachments will be lost. You must re-add all attachments (existing + new) in this conversion.
                        </p>
                    </div>
                    
                    {attachments.length > 0 && (
                        <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto">
                            {attachments.map((attachment, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Paperclip size={12} className="text-slate-500 flex-shrink-0" />
                                        <span className="text-xs font-bold text-zinc-700 truncate" title={attachment.name}>
                                            {attachment.name}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            ({(attachment.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeAttachment(index)}
                                        className="text-red-500 hover:text-red-600 transition-colors flex-shrink-0 ml-2"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95">
                        <Plus size={14} />
                        <span>Add Files</span>
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            multiple
                            onChange={handleAttachmentsChange}
                            className="hidden"
                            accept="*/*"
                        />
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-2">
                        Supports all file types: images, CSV, XML, Office docs, etc. Existing attachments in source PDF will be lost.
                    </p>
                </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Why PDF/A?</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Self-contained fonts & colors</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>No dynamic or external dependencies</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Guaranteed future readability</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={files.length === 0}
                    icon={CheckCircle2}
                    text="Convert to PDF/A"
                    processingText="Archiving..."
                    bgColor="bg-slate-700"
                    className="shadow-slate-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="PDF to PDF/A"
            description="Archive your documents with the PDF/A standard for long-term preservation"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Standard", value: `PDF/A-${pdfaVersion}` },
                            { label: "Original", value: files[0]?.name || "" },
                            ...(isPDFA3 && attachments.length > 0 ? [{ label: "Attachments", value: attachments.length.toString() }] : [])
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
                        <label className="text-xs font-black text-slate-600 hover:text-slate-700 cursor-pointer flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl transition-all active:scale-95">
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
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <CheckCircle2 className="text-slate-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">PDF to PDF/A</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Archive your PDF documents for the long term with 100% compliance to PDF/A standards.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-800 cursor-pointer transition-all shadow-xl shadow-slate-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
