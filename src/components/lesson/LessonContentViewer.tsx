import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { LessonContentItem } from '@/types/database';
import {
    Video,
    FileText,
    Image,
    File,
    Link as LinkIcon,
    Lock,
    ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ContentType = 'video' | 'article' | 'image' | 'file' | 'link';

interface ContentItem extends Partial<LessonContentItem> {
    id: string;
    content_type: ContentType;
    title_ar: string;
    title_en?: string;
    content_url?: string;
    content_text?: string;
    is_paid: boolean;
    order_index: number;
}

interface LessonContentViewerProps {
    items: ContentItem[];
    hasSubscription: boolean;
    onContentSelect?: (item: ContentItem) => void;
}

const contentTypeConfig: Record<ContentType, { icon: typeof Video; label: { ar: string; en: string }; color: string; bgColor: string }> = {
    video: { icon: Video, label: { ar: 'فيديو', en: 'Video' }, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    article: { icon: FileText, label: { ar: 'مقال', en: 'Article' }, color: 'text-green-600', bgColor: 'bg-green-50' },
    image: { icon: Image, label: { ar: 'صورة', en: 'Image' }, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    file: { icon: File, label: { ar: 'ملف', en: 'File' }, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    link: { icon: LinkIcon, label: { ar: 'رابط', en: 'Link' }, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
};

export default function LessonContentViewer({
    items,
    hasSubscription,
    onContentSelect,
}: LessonContentViewerProps) {
    const { t } = useLanguage();

    const canAccess = (item: ContentItem): boolean => {
        if (!item.is_paid) return true;
        return hasSubscription;
    };

    const handleContentClick = (item: ContentItem) => {
        if (!canAccess(item)) return;

        if (onContentSelect) {
            onContentSelect(item);
        } else if (item.content_url) {
            // Open in new tab for links/files
            if (item.content_type === 'link' || item.content_type === 'file') {
                window.open(item.content_url, '_blank');
            }
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>{t('لا يوجد محتوى في هذا الدرس', 'No content in this lesson')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item, index) => {
                const config = contentTypeConfig[item.content_type];
                const Icon = config.icon;
                const accessible = canAccess(item);

                return (
                    <div
                        key={item.id}
                        className={`
                            relative rounded-lg border border-border overflow-hidden
                            ${accessible ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm' : 'opacity-75'}
                            transition-all duration-200
                        `}
                        onClick={() => handleContentClick(item)}
                    >
                        <div className="flex items-center p-4">
                            {/* Index */}
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-muted-foreground me-3">
                                {index + 1}
                            </div>

                            {/* Type Icon */}
                            <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center me-4`}>
                                <Icon className={`w-5 h-5 ${config.color}`} />
                            </div>

                            {/* Content Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate">
                                    {t(item.title_ar, item.title_en || item.title_ar)}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t(config.label.ar, config.label.en)}
                                </p>
                            </div>

                            {/* Status / Action */}
                            {!accessible ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="text-xs text-amber-700 font-medium">
                                        {t('مدفوع', 'Paid')}
                                    </span>
                                </div>
                            ) : (item.content_type === 'link' || item.content_type === 'file') && item.content_url ? (
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    {t('فتح', 'Open')}
                                </Button>
                            ) : null}
                        </div>

                        {/* Article Content Preview */}
                        {item.content_type === 'article' && item.content_text && accessible && (
                            <div className="px-4 pb-4 pt-0">
                                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-foreground/80 leading-relaxed">
                                    {item.content_text.length > 300
                                        ? `${item.content_text.substring(0, 300)}...`
                                        : item.content_text
                                    }
                                </div>
                            </div>
                        )}

                        {/* Video Player Placeholder */}
                        {item.content_type === 'video' && item.content_url && accessible && (
                            <div className="px-4 pb-4 pt-0">
                                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                                    <Video className="w-12 h-12 text-muted-foreground/50" />
                                </div>
                            </div>
                        )}

                        {/* Image Preview */}
                        {item.content_type === 'image' && item.content_url && accessible && (
                            <div className="px-4 pb-4 pt-0">
                                <img
                                    src={item.content_url}
                                    alt={t(item.title_ar, item.title_en || item.title_ar)}
                                    className="w-full rounded-lg object-cover max-h-64"
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Subscription Prompt */}
            {items.some(item => item.is_paid) && !hasSubscription && (
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                    <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold text-foreground mb-1">
                        {t('اشترك للوصول الكامل', 'Subscribe for Full Access')}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                        {t('بعض المحتوى متاح فقط للمشتركين', 'Some content is only available to subscribers')}
                    </p>
                    <Button size="sm">
                        {t('عرض خطط الاشتراك', 'View Subscription Plans')}
                    </Button>
                </div>
            )}
        </div>
    );
}
