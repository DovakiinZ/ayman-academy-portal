import React from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
    title: string;
    subtitle?: string;
    align?: 'center' | 'right' | 'left';
    className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
    title,
    subtitle,
    align = 'right',
    className
}) => {
    const isRTL = align === 'right';

    return (
        <div className={cn(
            "space-y-4 mb-10 group",
            align === 'center' ? "text-center" : isRTL ? "text-right" : "text-left",
            className
        )}>
            <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-primary">
                    {title}
                </h2>
                {/* Subtle Accent Underline */}
                <div className={cn(
                    "h-1 rounded-full bg-primary/70 transition-all duration-300 group-hover:w-24",
                    "w-14 md:w-18", // 56px on mobile (14*4), 72px on desktop (18*4)
                    align === 'center' ? "mx-auto" : isRTL ? "mr-0" : "ml-0"
                )} />
            </div>

            {subtitle && (
                <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                    {subtitle}
                </p>
            )}

            {/* Faint full-width divider line below the section title block */}
            <div className="w-full h-px bg-slate-900/[0.05] mt-6" />
        </div>
    );
};

export default SectionTitle;
