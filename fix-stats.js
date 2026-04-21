const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase.rpc('increment_blog_views', { blog_id: '11111111-1111-1111-1111-111111111111' })
  console.log("RPC Error:", error)
}
test()
