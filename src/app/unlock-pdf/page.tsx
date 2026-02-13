"use client";

import { useState, useRef } from "react";
import { Lock, Plus, FileText, X, Eye, EyeOff } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function UnlockPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setError(null);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUnlock = async () => {
        if (files.length === 0) return;
        if (!password.trim()) {
            setError("Please enter the PDF password");
            return;
        }

        setIsUnlocking(true);
        setError(null);

        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();

            // Use pdfjs-dist to decrypt PDF with password (works client-side)
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            // Load PDF with password
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                password: password.trim(),
            });

            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            if (numPages === 0) {
                setError("PDF has no pages to unlock.");
                setIsUnlocking(false);
                return;
            }

            // Create new PDF with pdf-lib
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.create();

            let pagesProcessed = 0;

            // Process each page: decrypt, render as image, embed in new PDF
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                
                // Get page dimensions in PDF points (72 DPI)
                const viewport = page.getViewport({ scale: 1.0 });
                const pdfPageWidth = viewport.width;
                const pdfPageHeight = viewport.height;
                
                // Render at higher scale for better quality
                const renderViewport = page.getViewport({ scale: 2.0 });

                // Render page to canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    console.warn(`Failed to get canvas context for page ${pageNum}`);
                    continue;
                }

                canvas.height = renderViewport.height;
                canvas.width = renderViewport.width;

                // Render the page
                try {
                    await page.render({
                        canvasContext: context as any,
                        viewport: renderViewport,
                        canvas: canvas as any,
                    }).promise;
                } catch (renderError) {
                    console.error(`Failed to render page ${pageNum}:`, renderError);
                    continue;
                }

                // Verify canvas has content (check if it's not blank)
                const imageData = canvas.toDataURL('image/jpeg', 0.95);
                if (!imageData || imageData === 'data:,') {
                    console.warn(`Canvas for page ${pageNum} appears to be blank`);
                    continue;
                }

                const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());

                // Embed image in PDF
                const image = await pdfDoc.embedJpg(imageBytes);
                
                // Get image dimensions (in PDF points)
                const { width, height } = image.scale(1);
                
                // Create PDF page with image dimensions
                const pdfPage = pdfDoc.addPage([width, height]);
                
                // Draw image to fill the page
                pdfPage.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
                
                pagesProcessed++;
            }

            if (pagesProcessed === 0) {
                setError("Failed to process any pages. The PDF may be corrupted or the password may be incorrect.");
                setIsUnlocking(false);
                return;
            }

            // Set metadata
            try {
                const metadata = await pdf.getMetadata();
                if (metadata?.info) {
                    const info = metadata.info as any;
                    if (info.Title) pdfDoc.setTitle(info.Title);
                    if (info.Author) pdfDoc.setAuthor(info.Author);
                    if (info.Subject) pdfDoc.setSubject(info.Subject);
                    if (info.Creator) pdfDoc.setCreator(info.Creator);
                    if (info.Producer) pdfDoc.setProducer(info.Producer);
                }
            } catch (metadataError) {
                // Use default metadata if copying fails
                const now = new Date();
                pdfDoc.setTitle(file.name.replace(".pdf", "") || "Unlocked Document");
                pdfDoc.setAuthor("PDF Unlocker");
                pdfDoc.setCreator("File Converter");
                pdfDoc.setProducer("PDF Unlocker");
                pdfDoc.setCreationDate(now);
                pdfDoc.setModificationDate(now);
            }

            // Save PDF
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                updateFieldAppearances: false,
            });

            // Create download URL
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);
            const fileName = file.name.replace(".pdf", "_unlocked.pdf");

            setResult({
                fileName: fileName,
                downloadUrl: downloadUrl,
            });
        } catch (error: any) {
            console.error("Unlock error:", error);
            
            // Check if it's a password error
            if (error.name === "PasswordException" || 
                error.message?.includes("password") ||
                error.message?.includes("Incorrect password") ||
                error.message?.includes("wrong password")) {
                setError("Incorrect password. Please verify the password and try again.");
            } else {
                setError(error.message || "Failed to unlock PDF. Please check the password and try again.");
            }
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFiles([]);
        setResult(null);
        setPassword("");
        setError(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Remove PDF password security, giving you the freedom to use your PDFs as you want.
                </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">PDF Password</h3>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                        }}
                        placeholder="Enter PDF password"
                        className="w-full px-4 py-3 pr-12 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-slate-600 transition-colors"
                        disabled={isUnlocking || files.length === 0}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        disabled={isUnlocking || files.length === 0}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-[10px] font-bold text-red-700">{error}</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">How it works?</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Upload your password-protected PDF file</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Enter the password to unlock the PDF</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Download your unlocked PDF without password protection</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleUnlock}
                    isProcessing={isUnlocking}
                    disabled={files.length === 0 || !password.trim()}
                    icon={Lock}
                    text="Unlock PDF"
                    processingText="Unlocking..."
                    bgColor="bg-slate-700"
                    className="shadow-slate-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Unlock PDF"
            description="Remove PDF password security, giving you the freedom to use your PDFs as you want"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Status", value: "Unlocked" },
                            { label: "Original", value: files[0]?.name || "" },
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : files.length > 0 ? (
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

                    <div className="flex-1 min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] flex items-center justify-center relative">
                        <div className="text-center px-8">
                            <div className="w-24 h-24 bg-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Lock className="text-slate-400" size={48} />
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">Password Protected PDF</h3>
                            <p className="text-sm font-semibold text-zinc-500 mb-1">
                                This PDF is password-protected
                            </p>
                            <p className="text-xs font-medium text-zinc-400">
                                Enter the password in the settings panel to unlock
                            </p>
                        </div>
                        <div className="absolute top-4 right-4 bg-slate-700/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10">
                            Protected Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Lock className="text-slate-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Unlock PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Remove password protection from your PDF files. Enter the password to unlock and download a password-free version.
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

