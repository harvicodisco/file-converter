"use client";

import { useState, useEffect } from "react";
import { Globe, Layout, Maximize, FileText, Check, AlertCircle, RotateCw } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

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
                    } catch (e) {
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
        <>
            {/* Website URL Input */}
            <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Website Url</label>
                <div className="flex gap-2">
                    <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-red-600 transition-colors">
                            <Globe size={18} />
                        </div>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 text-zinc-900 font-bold transition-all text-sm mb-1"
                        />
                    </div>
                </div>
                {loadError && <p className="text-xs text-red-500 font-bold ml-1">Please enter a valid URL (https://...)</p>}
            </div>

            <hr className="border-zinc-100" />

            {/* Screen Size */}
            <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Screen Size</label>
                <select
                    value={screenSize}
                    onChange={(e) => setScreenSize(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 text-zinc-900 font-bold text-sm cursor-pointer appearance-none transition-all hover:bg-zinc-100"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '.65em auto' }}
                >
                    <option value="desktop">Desktop (1920x1080)</option>
                    <option value="tablet">Tablet (768x1024)</option>
                    <option value="mobile">Mobile (375x667)</option>
                </select>
            </div>

            {/* Page Size */}
            <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Page Size</label>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 text-zinc-900 font-bold text-sm cursor-pointer appearance-none transition-all hover:bg-zinc-100"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '.65em auto' }}
                >
                    <option value="a4">A4 (210x297 mm)</option>
                    <option value="letter">Letter (8.5x11 in)</option>
                    <option value="legal">Legal (8.5x14 in)</option>
                </select>
            </div>

            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setOneLongPage(!oneLongPage)}>
                <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${oneLongPage ? 'bg-red-600 border-red-600' : 'bg-white border-zinc-300 group-hover:border-red-400'}`}
                >
                    {oneLongPage && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm font-bold text-zinc-700 select-none group-hover:text-zinc-900">One long page</span>
            </div>

            <hr className="border-zinc-100" />

            {/* Orientation */}
            <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Orientation</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setOrientation("portrait")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${orientation === "portrait" ? "border-red-600 bg-red-50 text-red-600" : "border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:bg-zinc-50"
                            }`}
                    >
                        <div className="w-6 h-8 border-2 border-current mb-2 rounded-sm" />
                        <span className="text-xs font-bold">Portrait</span>
                    </button>
                    <button
                        onClick={() => setOrientation("landscape")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${orientation === "landscape" ? "border-red-600 bg-red-50 text-red-600" : "border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:bg-zinc-50"
                            }`}
                    >
                        <div className="w-8 h-6 border-2 border-current mb-2 rounded-sm" />
                        <span className="text-xs font-bold">Landscape</span>
                    </button>
                </div>
            </div>

            {/* Margins */}
            <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Page Margin</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'none', label: 'No margin', icon: <Maximize size={16} /> },
                        { id: 'small', label: 'Small', icon: <Layout size={16} /> },
                        { id: 'big', label: 'Big', icon: <FileText size={16} /> }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setMargin(opt.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${margin === opt.id ? "border-red-600 bg-red-50 text-red-600" : "border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:bg-zinc-50"
                                }`}
                        >
                            <div className="mb-2 opacity-80">{opt.icon}</div>
                            <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={!url || isLoadingPreview}
                    icon={Globe}
                    text="Convert to PDF"
                    processingText="Converting..."
                    bgColor="bg-red-600"
                    className="shadow-red-200 hover:opacity-100 hover:bg-red-700"
                />
            </div>
        </>
    );

    return (
        <ConversionLayout
            title="HTML to PDF"
            description="Convert web pages to high-quality PDF documents."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center animate-fadeIn">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                    />
                </div>
            )}
        >
            {/* Preview Area Content */}
            <div className="h-full w-full flex items-center justify-center p-4">
                {isLoadingPreview ? (
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Creating preview</h3>
                        <p className="text-zinc-500 font-medium animate-pulse">Scanning website structure...</p>
                    </div>
                ) : previewUrl ? (
                    <div className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-200 bg-white max-h-full aspect-[210/297] flex flex-col group">
                        {/* Browser Toolbar Mockup */}
                        <div className="h-6 bg-zinc-100 border-b border-zinc-200 flex items-center px-3 gap-1.5 basis-6 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/30"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/30"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/30"></div>
                            <div className="ml-4 flex-1 h-3.5 bg-white rounded-md border border-zinc-200 text-[8px] text-zinc-400 flex items-center px-2 truncate">
                                {url}
                            </div>
                        </div>

                        {/* Preview Image */}
                        <div className="flex-1 overflow-hidden relative bg-zinc-50">
                            <img
                                src={previewUrl}
                                alt="Website Preview"
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />

                            {/* Overlay to indicate it's a preview */}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 pointer-events-none">
                                PREVIEW
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-sm px-6">
                        {loadError ? (
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="text-red-400" size={40} />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Globe className="text-zinc-300" size={40} />
                            </div>
                        )}

                        <h3 className="text-lg font-bold text-zinc-800 mb-2">
                            {loadError ? "Invalid URL" : "Enter a URL"}
                        </h3>
                        <p className="text-zinc-400 text-sm">
                            {loadError
                                ? "Please check the website address and try again."
                                : "Type a website address in the sidebar to generate a preview."}
                        </p>
                    </div>
                )}
            </div>
        </ConversionLayout>
    );
}
