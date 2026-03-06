import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function fullDiag() {
    // 1. Verificar login
    console.log('=== TEST LOGIN ===');
    const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'gonzalo.salazar.labra@gmail.com',
        password: 'telolimpio2026',
    });
    if (loginErr) {
        console.log('❌ Login falla:', loginErr.message);
        return;
    }
    console.log('✅ Auth OK. ID:', login.user.id);

    // 2. Consultar perfil sin .single() para evitar errores
    console.log('\n=== PERFIL ===');
    const { data: profiles, error: pErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', login.user.id);

    if (pErr) {
        console.log('❌ Error consulta perfil:', pErr.message);
    } else {
        console.log('Registros encontrados:', profiles?.length);
        profiles?.forEach(p => console.log(JSON.stringify(p, null, 2)));
    }

    // 3. Listar TODOS los usuarios
    console.log('\n=== TODOS LOS USUARIOS ===');
    const { data: all, error: allErr } = await supabase.from('usuarios').select('*');
    if (allErr) {
        console.log('❌ Error:', allErr.message);
    } else {
        console.log('Total:', all?.length);
        all?.forEach(u => console.log(`  ${u.email} | rol: ${u.rol} | id: ${u.id}`));
    }

    // 4. Intentar actualizar a adminsupremo directamente
    console.log('\n=== INTENTO DE ACTUALIZACIÓN A ADMINSUPREMO ===');
    const { error: upErr } = await supabase
        .from('usuarios')
        .update({ rol: 'adminsupremo' })
        .eq('id', login.user.id);

    if (upErr) {
        console.log('❌ Update falla:', upErr.message);
        console.log('   (Esto confirma que la constraint SQL aún no acepta adminsupremo)');
    } else {
        console.log('✅ Actualizado a adminsupremo exitosamente');
    }
}

fullDiag();
