"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Scissors } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUploadCard from "@/components/FileUploadCard";

export default function SplitPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitFiles, setSplitFiles] = useState<{ fileName: string; downloadUrl: string }[] | null>(null);
    const [splitMode, setSplitMode] = useState<"pages" | "range">("pages");
    const [pageNumbers, setPageNumbers] = useState("");
    const [pageRange, setPageRange] = useState({ from: "", to: "" });

    const handleSplit = async () => {
        if (!file) return;

        setIsSplitting(true);
        const formData = new FormData();
        formData.append("file", file);
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
                setSplitFiles(data.files);
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

    return (
        <PageLayout
            title="Split PDF"
            description="Extract specific pages or split PDF into multiple files"
        >
            <div className="space-y-6">
                {/* File Upload Section */}
                <FileUploadCard
                    file={file}
                    onFileChange={setFile}
                    accept=".pdf"
                />

                {/* Split Options */}
                {file && !splitFiles && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
                            <h3 className="text-lg font-semibold mb-4">Split Options</h3>

                            {/* Split Mode Selector */}
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => setSplitMode("pages")}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${splitMode === "pages"
                                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                            : "bg-zinc-800/40 text-zinc-400 border border-white/5 hover:border-white/10"
                                        }`}
                                >
                                    Specific Pages
                                </button>
                                <button
                                    onClick={() => setSplitMode("range")}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${splitMode === "range"
                                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                            : "bg-zinc-800/40 text-zinc-400 border border-white/5 hover:border-white/10"
                                        }`}
                                >
                                    Page Range
                                </button>
                            </div>

                            {/* Input Fields */}
                            {splitMode === "pages" ? (
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">
                                        Enter page numbers (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={pageNumbers}
                                        onChange={(e) => setPageNumbers(e.target.value)}
                                        placeholder="e.g., 1, 3, 5-7, 10"
                                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder:text-zinc-500"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">
                                        You can specify individual pages (1, 3, 5) or ranges (5-7)
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2">
                                            From Page
                                        </label>
                                        <input
                                            type="number"
                                            value={pageRange.from}
                                            onChange={(e) => setPageRange({ ...pageRange, from: e.target.value })}
                                            placeholder="1"
                                            min="1"
                                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder:text-zinc-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2">
                                            To Page
                                        </label>
                                        <input
                                            type="number"
                                            value={pageRange.to}
                                            onChange={(e) => setPageRange({ ...pageRange, to: e.target.value })}
                                            placeholder="10"
                                            min="1"
                                            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder:text-zinc-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSplit}
                                disabled={isSplitting}
                                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSplitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Splitting PDF...
                                    </>
                                ) : (
                                    <>
                                        <Scissors size={20} />
                                        Split PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success Message */}
                {splitFiles && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-20"></div>

                        <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="text-emerald-400" size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-emerald-400 mb-1">
                                        Success! Your PDF has been split
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        {splitFiles.length} file{splitFiles.length > 1 ? "s" : ""} created
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {splitFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-lg border border-white/5"
                                    >
                                        <span className="text-sm text-zinc-300">{file.fileName}</span>
                                        <a
                                            href={file.downloadUrl}
                                            className="px-4 py-1.5 bg-emerald-500 text-white text-sm rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                                        >
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setFile(null);
                                    setSplitFiles(null);
                                    setPageNumbers("");
                                    setPageRange({ from: "", to: "" });
                                }}
                                className="w-full mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Split Another PDF
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-10"></div>

                    <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
                        <h3 className="font-semibold mb-3 text-zinc-300">How to split PDFs:</h3>
                        <ol className="space-y-2 text-sm text-zinc-400">
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-medium">1.</span>
                                <span>Upload the PDF file you want to split</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-medium">2.</span>
                                <span>Choose between extracting specific pages or a page range</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-medium">3.</span>
                                <span>Enter the page numbers or range you want to extract</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-medium">4.</span>
                                <span>Click "Split PDF" and download your files</span>
                            </li>
                        </ol>
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
