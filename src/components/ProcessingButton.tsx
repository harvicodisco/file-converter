"use client";

import { Loader2, LucideIcon } from "lucide-react";

interface ProcessingButtonProps {
    onClick: () => void;
    isProcessing: boolean;
    disabled?: boolean;
    icon: LucideIcon;
    text: string;
    processingText: string;
    gradient?: string;
    className?: string;
    bgColor?: string;
}

export default function ProcessingButton({
    onClick,
    isProcessing,
    disabled = false,
    icon: Icon,
    text,
    processingText,
    gradient = "from-indigo-600 to-indigo-500",
    className = "",
    bgColor = "bg-indigo-600",
}: ProcessingButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={isProcessing || disabled}
            className={`w-full ${bgColor} hover:opacity-90 active:scale-[0.98] cursor-pointer text-white px-8 py-4 rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 ${className}`}
        >
            {isProcessing ? (
                <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>{processingText}</span>
                </>
            ) : (
                <>
                    <Icon size={24} strokeWidth={2.5} />
                    <span>{text}</span>
                </>
            )}
        </button>
    );
}
