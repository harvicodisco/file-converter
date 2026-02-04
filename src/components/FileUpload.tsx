"use client";

import { useRef, useState, DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    accept?: string;

    multiple?: boolean;
    maxSize?: number; // in MB
    maxFiles?: number;
    supportedFormats?: string;
}

export default function FileUpload({
    files,
    onFilesChange,
    accept = "*",
    multiple = false,
    maxSize = 50,
    maxFiles = 10,
    supportedFormats = "All file types",
}: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (newFiles: File[]) => {
        const validFiles = newFiles.filter((file) => {
            const fileSizeMB = file.size / 1024 / 1024;
            if (fileSizeMB > maxSize) {
                alert(`${file.name} exceeds ${maxSize}MB limit`);
                return false;
            }
            return true;
        });

        if (multiple) {
            const combined = [...files, ...validFiles];
            if (combined.length > maxFiles) {
                alert(`Maximum ${maxFiles} files allowed`);
                return;
            }
            onFilesChange(combined);
        } else {
            onFilesChange(validFiles.slice(0, 1));
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeFile = (index: number) => {
        onFilesChange(files.filter((_, i) => i !== index));
    };

    // Determine specific file type label for the button
    const fileTypeLabel = accept.includes("pdf") ? "PDF" : "File";

    return (
        <div className="w-full">
            <div className="relative group">
                {/* Main Card Container */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="relative bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-zinc-200/50 cursor-pointer transition-all hover:shadow-2xl hover:shadow-zinc-200/60"
                >
                    {files.length === 0 ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl h-[320px] flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-zinc-50/50 ${isDragging
                                ? "border-indigo-500 bg-indigo-50/50"
                                : "border-zinc-200 hover:border-indigo-300"
                                }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept={accept}
                                multiple={multiple}
                                className="hidden"
                            />

                            {/* Icon */}
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${isDragging ? "bg-indigo-100" : "bg-zinc-100"
                                }`}>
                                <Upload size={28} className={isDragging ? "text-indigo-600" : "text-zinc-400"} />
                            </div>

                            {/* Main Text */}
                            <h3 className="text-2xl font-bold text-zinc-900 mb-6">
                                {isDragging ? "Drop your PDF here" : `Drop your ${fileTypeLabel} here`}
                            </h3>

                            {/* Button */}
                            <button className="bg-[#5c56f5] hover:bg-[#4b45e5] text-white text-base font-medium py-3.5 px-8 rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform group-hover:-translate-y-0.5 mb-4">
                                Choose {fileTypeLabel} File
                            </button>

                            {/* Helper Text */}
                            <p className="text-zinc-400 text-sm font-medium">
                                {supportedFormats} up to {maxSize}MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                    Selected {files.length} file{files.length > 1 ? "s" : ""}
                                </h3>
                                {multiple && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                                    >
                                        + Add files
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <AnimatePresence>
                                    {files.map((file, index) => (
                                        <motion.div
                                            key={`${file.name}-${index}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex items-center gap-4 p-4 bg-zinc-50 border border-zinc-100 rounded-xl group/item hover:border-indigo-200 hover:bg-white transition-all shadow-sm shadow-zinc-100/50"
                                        >
                                            <div className="w-12 h-12 bg-indigo-100 flex items-center justify-center rounded-xl flex-shrink-0">
                                                <FileText className="text-indigo-600" size={24} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-bold text-zinc-800 truncate text-base">{file.name}</p>
                                                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm cursor-pointer"
                                            >
                                                <X size={18} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept={accept}
                                multiple={multiple}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
