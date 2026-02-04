"use client";

import { useState } from "react";
import { Scissors } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

export default function SplitPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isSplitting, setIsSplitting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [splitMode, setSplitMode] = useState<"pages" | "range">("pages");
    const [pageNumbers, setPageNumbers] = useState("");
    const [pageRange, setPageRange] = useState({ from: "", to: "" });

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
    };

    return (
        <PageLayout
            title="Split PDF"
            description="Extract specific pages or separate your PDF into multiple documents"
        >
            <div className="space-y-8 max-w-3xl mx-auto">
                {!result ? (
                    <>
                        <FileUpload
                            files={files}
                            onFilesChange={setFiles}
                            accept=".pdf"
                            multiple={false}
                            supportedFormats="PDF files"
                        />

                        {files.length > 0 && (
                            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-200/50">
                                <h3 className="text-xl font-black mb-6">Split Configuration</h3>

                                <div className="flex gap-3 mb-8">
                                    <button
                                        onClick={() => setSplitMode("pages")}
                                        className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all border-2 ${splitMode === "pages"
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                                            : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-200"
                                            }`}
                                    >
                                        Select Pages
                                    </button>
                                    <button
                                        onClick={() => setSplitMode("range")}
                                        className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all border-2 ${splitMode === "range"
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                                            : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-200"
                                            }`}
                                    >
                                        Range Split
                                    </button>
                                </div>

                                <div className="mb-8">
                                    {splitMode === "pages" ? (
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                                                Page Numbers (comma separated)
                                            </label>
                                            <input
                                                type="text"
                                                value={pageNumbers}
                                                onChange={(e) => setPageNumbers(e.target.value)}
                                                placeholder="e.g., 1, 4, 8-12"
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">From Page</label>
                                                <input
                                                    type="number"
                                                    value={pageRange.from}
                                                    onChange={(e) => setPageRange({ ...pageRange, from: e.target.value })}
                                                    placeholder="1"
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">To Page</label>
                                                <input
                                                    type="number"
                                                    value={pageRange.to}
                                                    onChange={(e) => setPageRange({ ...pageRange, to: e.target.value })}
                                                    placeholder="10"
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <ProcessingButton
                                    onClick={handleSplit}
                                    isProcessing={isSplitting}
                                    icon={Scissors}
                                    text="Split PDF"
                                    processingText="Processing..."
                                    bgColor="bg-indigo-600"
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                    />
                )}
            </div>
        </PageLayout>
    );
}
