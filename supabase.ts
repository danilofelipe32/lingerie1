import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yldsggoepgekkxjzbnou.supabase.co';
const supabaseKey = 'sb_publishable_mLIyCIQZRmPWmQnXB_qY1Q_qGVsP_gx';

export const supabase = createClient(supabaseUrl, supabaseKey);
