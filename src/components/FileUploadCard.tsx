"use client";

import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { motion } from "framer-motion";

interface FileUploadCardProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // in MB
}

export default function FileUploadCard({
    file,
    onFileChange,
    accept = ".pdf",
    multiple = false,
    maxSize = 50,
}: FileUploadCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const fileSizeMB = selectedFile.size / 1024 / 1024;

            if (fileSizeMB > maxSize) {
                alert(`File size must be less than ${maxSize}MB`);
                return;
            }

            onFileChange(selectedFile);
        }
    };

    const handleRemoveFile = () => {
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

            <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl">
                {!file ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center cursor-pointer hover:border-zinc-500 transition-colors bg-zinc-800/20"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept={accept}
                            multiple={multiple}
                            className="hidden"
                        />
                        <Upload className="mx-auto mb-4 text-zinc-500" size={48} />
                        <h3 className="text-xl font-medium mb-2">
                            Click or drag file to upload
                        </h3>
                        <p className="text-zinc-500">
                            Supports PDF files up to {maxSize}MB
                        </p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 p-4 bg-zinc-800/40 rounded-xl border border-white/5"
                    >
                        <div className="w-12 h-12 bg-purple-500/20 flex items-center justify-center rounded-lg flex-shrink-0">
                            <FileText className="text-purple-400" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-sm text-zinc-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={handleRemoveFile}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
