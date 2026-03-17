import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      subject:subjects(*, stage:stages(*)),
      sections:lesson_sections(*),
      blocks:lesson_blocks(*)
    `)
    .eq('id', 'b2aa3474-93b9-4db5-b62c-7c646d42062b');

  console.log(JSON.stringify(error, null, 2));
}
main();
