-- ============================================
-- 033 SEED BADGES DATA
-- Populates the gamification system with initial achievements
-- ============================================

-- Ensure badges table exists (defined in 031)
DO $$
BEGIN
    INSERT INTO public.badges (key, name_ar, name_en, description_ar, description_en, icon, criteria_type, criteria_value, sort_order)
    VALUES 
        -- Streaks
        ('streak_3', 'بداية قوية 🔥', 'Strong Start 🔥', 'أكملت المذاكرة لـ 3 أيام متتالية', 'Completed studying for 3 consecutive days', '🔥', 'streak', 3, 1),
        ('streak_7', 'المثابر الممتاز ⚡', 'Master Persistent ⚡', 'أكملت المذاكرة لـ 7 أيام متتالية', 'Completed studying for 7 consecutive days', '⚡', 'streak', 7, 2),
        ('streak_30', 'التعلم أسلوب حياة 👑', 'Learning is Life 👑', 'أكملت المذاكرة لـ 30 يوماً متتالياً', 'Completed studying for 30 consecutive days', '👑', 'streak', 30, 3),
        
        -- Scores
        ('perfect_score', 'العلامة الكاملة 🎯', 'Perfect Score 🎯', 'حصلت على 100% في أي اختبار', 'Got 100% on any quiz', '🎯', 'score', 100, 4),
        ('high_achiever', 'المتفوق الذهبي ✨', 'Golden Achiever ✨', 'حصلت على متوسط 90% في 5 اختبارات', 'Maintained 90% average over 5 quizzes', '🏆', 'score', 90, 5),
        
        -- Completion
        ('first_course', 'الخطوة الأولى 🏁', 'First Step 🏁', 'أكملت دورتك الأولى بنجاح', 'Successfully completed your first course', '🏁', 'courses_completed', 1, 6),
        ('scholar', 'طالب العلم 📚', 'The Scholar 📚', 'أكملت 5 دورات تعليمية', 'Completed 5 education courses', '📚', 'courses_completed', 5, 7),
        ('expert', 'الخبير 🧠', 'The Expert 🧠', 'أكملت 10 دورات تعليمية', 'Completed 10 education courses', '🧠', 'courses_completed', 10, 8),
        
        -- XP
        ('xp_1000', 'ألف ميل 🚀', 'Thousand Miles 🚀', 'جمعت 1000 نقطة خبرة', 'Collected 1000 XP points', '🚀', 'xp_total', 1000, 9)
    ON CONFLICT (key) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        description_ar = EXCLUDED.description_ar,
        description_en = EXCLUDED.description_en,
        icon = EXCLUDED.icon,
        criteria_type = EXCLUDED.criteria_type,
        criteria_value = EXCLUDED.criteria_value,
        sort_order = EXCLUDED.sort_order;
END $$;
