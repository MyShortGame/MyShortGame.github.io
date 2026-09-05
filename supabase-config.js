const SUPABASE_URL="https://jywzhwvbyifulqqvgxxd.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_2leqwU4YWbTg--GCIfQMmA_zOEKKG60"";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
