/**
 * Motivational message helper based on course progress.
 */
export function getMotivationMessage(progressPercent: number): string {
    if (progressPercent >= 100) {
        return '✅ مبروك! اكتملت الدورة—اضغط "استلام الشهادة".';
    }
    if (progressPercent >= 75) {
        return `🚀 قربت! أكملت ${progressPercent}%—درس/درسين وتطلع الشهادة.`;
    }
    if (progressPercent >= 50) {
        return `🔥 أنت بالنص! أكملت ${progressPercent}%—كملها بالكامل عشان تستلم شهادتك.`;
    }
    if (progressPercent >= 25) {
        return `تقدّم جميل 💪 أكملت ${progressPercent}%—باقي أقل من النصف لتحصل على الشهادة.`;
    }
    if (progressPercent >= 10) {
        return `ممتاز! أكملت ${progressPercent}% من الدورة—كمل عشان توصل للشهادة.`;
    }
    return 'ابدأ الآن! أنجز أول درس واقترب من الشهادة.';
}
