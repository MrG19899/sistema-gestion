import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function cleanMockData() {
    console.log('Limpiando tabla: usuarios...');
    let res = await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Usuarios result:', res.error ? res.error : 'OK');

    console.log('Limpiando tabla: servicios_limpieza...');
    res = await supabase.from('servicios_limpieza').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('servicios_limpieza result:', res.error ? res.error : 'OK');

    console.log('Limpiando tabla: servicios_plagas...');
    res = await supabase.from('servicios_plagas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('servicios_plagas result:', res.error ? res.error : 'OK');

    console.log('Limpiando tabla: servicios_alfombras...');
    res = await supabase.from('servicios_alfombras').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('servicios_alfombras result:', res.error ? res.error : 'OK');

    console.log('Limpiando tabla: notas_muro...');
    res = await supabase.from('notas_muro').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('notas_muro result:', res.error ? res.error : 'OK');

    console.log('Limpiando tabla: clientes...');
    res = await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('clientes result:', res.error ? res.error : 'OK');

    console.log('--- Proceso de Limpieza Completado ---');
}

cleanMockData();
