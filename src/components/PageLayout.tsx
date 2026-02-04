"use client";

import { motion } from "framer-motion";

interface PageLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

export default function PageLayout({ children, title, description }: PageLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-zinc-900 pt-32 pb-12 px-6 sm:px-24 selection:bg-indigo-100 selection:text-indigo-600 overflow-x-hidden">
            {/* Soft Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

                {/* Glow Effects (Soft) */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[80px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-7xl mx-auto relative z-10"
            >
                <header className="mb-12 text-center">
                    <motion.h1
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="text-4xl sm:text-6xl font-extrabold mb-4 tracking-tight text-zinc-900 leading-tight"
                    >
                        {title}
                    </motion.h1>
                    <p className="text-zinc-500 text-lg sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                        {description}
                    </p>
                </header>

                <main className="relative">{children}</main>
            </motion.div>
        </div>
    );
}
