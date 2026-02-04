import { LucideIcon, ArrowRight, Lock } from "lucide-react";

interface Step {
    icon: LucideIcon;
    title: string;
}

interface TrustBadgesProps {
    steps: [Step, Step, Step];
}

export default function TrustBadges({ steps }: TrustBadgesProps) {
    return (
        <div className="w-full mt-12 pb-12">
            {/* Steps Flow */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12">
                <StepBadge icon={steps[0].icon} text={steps[0].title} />
                <ArrowRight className="text-zinc-300 hidden md:block" />
                <StepBadge icon={steps[1].icon} text={steps[1].title} />
                <ArrowRight className="text-zinc-300 hidden md:block" />
                <StepBadge icon={steps[2].icon} text={steps[2].title} />
            </div>

            {/* Security/Trust Info */}
            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm font-medium">
                <Lock size={14} />
                <p>Files are deleted after processing • Secure upload over HTTPS</p>
            </div>
        </div>
    );
}

function StepBadge({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
    return (
        <div className="flex items-center gap-3 bg-white/60 px-6 py-3 rounded-full shadow-sm border border-zinc-100 text-zinc-700">
            <Icon size={18} className="text-indigo-600" />
            <span className="font-medium whitespace-nowrap">{text}</span>
        </div>
    );
}
