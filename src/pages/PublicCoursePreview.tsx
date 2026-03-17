/**
 * PublicCoursePreview — Wraps the student CoursePreview in public Layout
 * so unauthenticated users can view course details from the marketplace.
 */

import Layout from '@/components/layout/Layout';
import CoursePreview from '@/pages/student/CoursePreview';

export default function PublicCoursePreview() {
    return (
        <Layout>
            <div className="py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    <CoursePreview />
                </div>
            </div>
        </Layout>
    );
}
