import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';

const SubjectRedirect = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const resolveAndRedirect = async () => {
            if (!subjectId) {
                navigate('/stages', { replace: true });
                return;
            }

            try {
                // Fetch the subject's stage slug
                const { data, error } = await supabase
                    .from('subjects')
                    .select('stage:stages(slug, id)')
                    .eq('id', subjectId)
                    .single() as any;

                if (error || !data || !data.stage) {
                    console.error('Error resolving legacy subject link:', error);
                    navigate('/not-found', { replace: true });
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stage = data.stage as any;
                const slug = stage.slug || stage.id;

                // Redirect to the new hierarchical path
                navigate(`/stages/${slug}/${subjectId}`, { replace: true });
            } catch (err) {
                console.error('Unexpected error in SubjectRedirect:', err);
                navigate('/stages', { replace: true });
            } finally {
                setLoading(false);
            }
        };

        resolveAndRedirect();
    }, [subjectId, navigate]);

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري تحويلك إلى الصفحة المطلوبة...</p>
            </div>
        </Layout>
    );
};

export default SubjectRedirect;
