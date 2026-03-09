import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function addTrampasColumn() {
    console.log("Adding trampas jsonb column to servicios_plagas...");

    // Supabase doesn't support executing arbitrary DDL directly via REST API.
    // Instead, we can do a mock insert/update or rely on RPC if available.
    // However, the best way for a developer to do this without RPC is via SQL Editor.
    // I will write a small RPC call just in case they have exec_sql, but normally we inform the user.

    const { data, error } = await supabase.rpc('exec_sql', {
        query: "ALTER TABLE servicios_plagas ADD COLUMN IF NOT EXISTS trampas JSONB DEFAULT '[]'::jsonb;"
    });

    if (error) {
        console.error("RPC exec_sql failed, you must run this inside Supabase SQL Editor manually:", error);
        console.log("--> ALTER TABLE servicios_plagas ADD COLUMN IF NOT EXISTS trampas JSONB DEFAULT '[]'::jsonb;");
    } else {
        console.log("Success:", data);
    }
}

addTrampasColumn();
