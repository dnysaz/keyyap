const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: blogs } = await supabase.from('blogs').select('id').limit(1);
  if (!blogs || blogs.length === 0) return console.log("No blog found");
  
  const blog_id = blogs[0].id;
  console.log("Testing with blog_id:", blog_id);
  
  const { data, error } = await supabase.rpc('increment_blog_views', { blog_id });
  console.log("Result:", { data, error });
}
test();
