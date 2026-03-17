import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, AlertTriangle } from 'lucide-react';
import { LessonDraft } from '@/lib/draftManager';

interface DraftRecoveryDialogProps {
  draft: LessonDraft | null;
  open: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * Dialog shown when a draft is found on page load
 * Allows user to restore or discard the unsaved changes
 */
export default function DraftRecoveryDialog({
  draft,
  open,
  onRestore,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const { t } = useLanguage();

  if (!draft) return null;

  const draftAge = Date.now() - draft.timestamp;
  const minutesAgo = Math.floor(draftAge / 60000);
  const hoursAgo = Math.floor(draftAge / 3600000);
  const daysAgo = Math.floor(draftAge / 86400000);

  const timeAgo = daysAgo > 0
    ? t(`قبل ${daysAgo} يوم`, `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`)
    : hoursAgo > 0
    ? t(`قبل ${hoursAgo} ساعة`, `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`)
    : t(`قبل ${minutesAgo} دقيقة`, `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            {t('تم العثور على مسودة محفوظة', 'Unsaved Draft Found')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t(
                'لديك مسودة غير محفوظة من هذا الدرس.',
                'You have an unsaved draft for this lesson.'
              )}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t('آخر تعديل:', 'Last modified:')} {timeAgo}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t(
                'هل تريد استعادة المسودة أم تجاهلها؟',
                'Would you like to restore the draft or discard it?'
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            {t('تجاهل', 'Discard')}
          </Button>
          <Button onClick={onRestore}>
            {t('استعادة المسودة', 'Restore Draft')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
