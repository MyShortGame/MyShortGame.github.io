const SUPABASE_URL =
    "https://jywzhwvbyifulqqvgxxd.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_2leqwU4YWbTg--GCIfQMmA_zOEKKG60";


if (!window.supabase) {

    throw new Error(
        "Supabase JS belum dimuat. " +
        "Periksa koneksi internet."
    );

}


const supabaseClient =
    window.supabase.createClient(

        SUPABASE_URL,

        SUPABASE_ANON_KEY,

        {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        }

    );
