/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Globe, Layout, Maximize, FileText, Check, AlertCircle } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function HTMLToPDF() {
    const [url, setUrl] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Settings State
    const [screenSize, setScreenSize] = useState("desktop");
    const [pageSize, setPageSize] = useState("a4");
    const [orientation, setOrientation] = useState("portrait");
    const [margin, setMargin] = useState("small");
    const [oneLongPage, setOneLongPage] = useState(false);

    // Debounce preview update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                setIsLoadingPreview(true);
                setLoadError(false);
                setResult(null);

                // Simulate backend screenshot generation
                // Real implementation would call your own backend
                // Here we verify if the URL is valid format
                setTimeout(() => {
                    try {
                        const hostname = new URL(url).hostname;
                        // Using a reliable placeholder that won't break like iframes
                        // This visualizes "This is where the screenshot goes"
                        setPreviewUrl(`https://placehold.co/800x1200/fafafa/333333/png?text=Preview+of\n${hostname}&font=montserrat`);
                        setIsLoadingPreview(false);
                    } catch {
                        setLoadError(true);
                        setIsLoadingPreview(false);
                    }
                }, 1500);
            } else {
                setPreviewUrl("");
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [url]);

    const handleConvert = async () => {
        if (!url) return;

        setIsConverting(true);
        try {
            const response = await fetch("/api/html-to-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    settings: { screenSize, pageSize, orientation, margin, oneLongPage }
                }),
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
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        setResult(null);
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Website Url</label>
                    <div className="flex gap-2">
                        <div className="relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-sky-600 transition-colors">
                                <Globe size={18} />
                            </div>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-sky-600/10 focus:border-sky-600 text-zinc-900 font-bold transition-all text-sm mb-1"
                            />
                        </div>
                    </div>
                    {loadError && <p className="text-xs text-red-500 font-bold ml-1">Please enter a valid URL (https://...)</p>}
                </div>

                <hr className="border-zinc-100" />

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Page Format</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['a4', 'letter'].map((size) => (
                            <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold capitalize ${pageSize === size ? "border-sky-600 bg-white text-sky-600 shadow-sm" : "border-zinc-100 bg-white text-zinc-500 hover:border-sky-200"
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setOneLongPage(!oneLongPage)}>
                    <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${oneLongPage ? 'bg-sky-600 border-sky-600' : 'bg-white border-zinc-300 group-hover:border-sky-400'}`}
                    >
                        {oneLongPage && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-bold text-zinc-700 select-none group-hover:text-zinc-900">One long page</span>
                </div>

                <hr className="border-zinc-100" />

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Orientation</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['portrait', 'landscape'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setOrientation(mode)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${orientation === mode ? "border-sky-600 bg-sky-50 text-sky-600" : "border-zinc-100 bg-white text-zinc-500 hover:border-sky-200"
                                    }`}
                            >
                                <div className={`${mode === 'portrait' ? 'w-5 h-7' : 'w-7 h-5'} border-2 border-current rounded-sm mb-2 opacity-60`} />
                                <span className="text-xs font-bold capitalize">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-4 mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={!url || isLoadingPreview}
                    icon={Globe}
                    text="Convert Site to PDF"
                    processingText="Converting..."
                    bgColor="bg-sky-600"
                    className="shadow-sky-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="HTML to PDF"
            description="Convert any website URL into a high-quality PDF"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Layout", value: pageSize.toUpperCase() },
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
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-4">
                    {url && (
                        <div className="mb-6 self-start max-w-4xl w-full mx-auto">
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="w-8 h-px bg-zinc-200" />
                                Live Preview
                            </h2>
                        </div>
                    )}

                    {isLoadingPreview ? (
                        <div className="text-center bg-white/50 backdrop-blur-sm p-12 rounded-[3rem] border border-zinc-100 shadow-xl">
                            <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">Generating Preview</h3>
                            <p className="text-zinc-500 font-medium animate-pulse text-sm px-8">Analyzing website structure and rendering layout...</p>
                        </div>
                    ) : previewUrl ? (
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden border border-zinc-200 bg-white aspect-[16/10] flex flex-col group transition-all duration-700 hover:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.15)] hover:-translate-y-1">
                                {/* Browser Toolbar Mockup */}
                                <div className="h-10 bg-zinc-50 border-b border-zinc-200 flex items-center px-5 gap-2 basis-10 flex-shrink-0">
                                    <div className="flex gap-1.5 mr-4">
                                        <div className="w-3 h-3 rounded-full bg-zinc-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-200"></div>
                                    </div>
                                    <div className="flex-1 h-6 bg-white rounded-lg border border-zinc-200 text-[10px] text-zinc-400 font-bold flex items-center px-3 truncate shadow-sm">
                                        <Globe size={10} className="mr-2 text-sky-400" />
                                        {url}
                                    </div>
                                </div>

                                {/* Preview Image */}
                                <div className="flex-1 overflow-hidden relative bg-zinc-50">
                                    <img
                                        src={previewUrl}
                                        alt="Website Preview"
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700"
                                    />

                                    {/* Overlay for indication */}
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute top-4 right-4 bg-sky-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 tracking-widest flex items-center gap-1.5 uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        Live
                                    </div>
                                </div>
                            </div>
                            <p className="mt-6 text-center text-zinc-400 text-xs font-bold tracking-wide uppercase">
                                Website detected • Ready for high-quality PDF conversion
                            </p>
                        </div>
                    ) : (
                        <div className="text-center max-w-md px-6 bg-white p-12 rounded-[3.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50">
                            <div className="w-24 h-24 bg-sky-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group overflow-hidden relative">
                                <div className="absolute inset-0 bg-sky-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <Globe className="text-sky-400 group-hover:scale-110 transition-all duration-500 relative z-10" size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">Convert Website to PDF</h3>
                            <p className="text-zinc-500 font-medium text-sm mb-0 leading-relaxed">
                                Enter any website URL in the sidebar. We'll generate a live preview and convert it to a professional document.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </ConversionLayout>
    );
}
