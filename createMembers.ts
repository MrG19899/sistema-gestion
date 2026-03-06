import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const usersToCreate = [
    { email: 'gonzalo.salazar.labra@gmail.com', password: 'telolimpio2026', nombre: 'Gonzalo Salazar', rol: 'adminsupremo' },
    { email: 'Antogavilanh@gmail.com', password: 'Oliwano123', nombre: 'Antonia Gavilán', rol: 'admin' },
    { email: 'Francisco.garcia.cisterna@gmail.com', password: 'Oliwano123', nombre: 'Francisco García', rol: 'admin' },
];

async function recreateAll() {
    // 1. Limpiar tabla pública (los IDs viejos ya no existen en Auth)
    console.log('Limpiando tabla usuarios (registros huérfanos)...');
    await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Tabla usuarios limpia\n');

    // 2. Crear cada usuario con pausa entre ellos para evitar rate-limit
    for (let i = 0; i < usersToCreate.length; i++) {
        const u = usersToCreate[i];
        console.log(`[${i + 1}/3] Creando: ${u.email} (${u.rol})...`);

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
            options: { data: { nombre: u.nombre, rol: u.rol } }
        });

        if (authError) {
            console.error(`❌ Error Auth: ${authError.message}`);
            continue;
        }

        const userId = authData.user?.id;
        if (!userId) {
            console.error('❌ No se obtuvo ID');
            continue;
        }
        console.log(`   Auth OK → ID: ${userId}`);

        const { error: dbError } = await supabase.from('usuarios').insert([
            { id: userId, nombre: u.nombre, email: u.email, rol: u.rol, activo: true }
        ]);

        if (dbError) {
            console.error(`   ❌ DB Error: ${dbError.message}`);
        } else {
            console.log(`   ✅ ${u.nombre} activado como ${u.rol.toUpperCase()}`);
        }

        // Pausa de 3 segundos entre usuarios para evitar rate-limit
        if (i < usersToCreate.length - 1) {
            console.log('   ⏳ Esperando 3s para evitar rate-limit...\n');
            await wait(3000);
        }
    }

    console.log('\n🎉 Los 3 usuarios han sido procesados.');
}

recreateAll();
