import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function createAdmin() {
    console.log('Creando usuario Auth (Admin Master)...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'gonzalo.salazar.labra@gmail.com',
        password: 'telolimpio2026',
        options: {
            data: {
                nombre: 'Gonzalo Salazar',
                rol: 'admin'
            }
        }
    });

    if (authError) {
        console.error('Error creando usuario en Auth:', authError.message);
        return;
    }

    const newUserId = authData.user?.id;
    if (!newUserId) {
        console.error('No se pudo obtener el Session ID del nuevo usuario.');
        return;
    }

    console.log('Usuario Auth creado con ID:', newUserId);
    console.log('Insertando perfil transaccional en public.usuarios...');

    const { error: dbError } = await supabase
        .from('usuarios')
        .insert([
            {
                id: newUserId,
                nombre: 'Gonzalo Salazar',
                email: 'gonzalo.salazar.labra@gmail.com',
                rol: 'admin',
                activo: true
            }
        ]);

    if (dbError) {
        console.error('Error inyectando en tabla pública:', dbError.message);
    } else {
        console.log('¡Admin Maestro creado exitosamente! Credenciales habilitadas.');
    }
}

createAdmin();
