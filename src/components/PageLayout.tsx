"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageLayoutProps {
    children: ReactNode;
    title: string;
    description: string;
}

export default function PageLayout({ children, title, description }: PageLayoutProps) {
    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6 sm:px-24 selection:bg-purple-500/30">
            {/* Background Orbs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl mx-auto"
            >
                <header className="mb-12 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
                    >
                        {title}
                    </motion.h1>
                    <p className="text-zinc-400 text-lg">{description}</p>
                </header>

                <main>{children}</main>
            </motion.div>
        </div>
    );
}
