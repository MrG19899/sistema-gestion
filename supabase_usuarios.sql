-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'worker', 'viewer')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Politicas basicas (permitir todo anonimato para demostraciones)
CREATE POLICY "Permitir select anonimo usuarios" ON public.usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir insert anonimo usuarios" ON public.usuarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir update anonimo usuarios" ON public.usuarios FOR UPDATE TO anon USING (true);
CREATE POLICY "Permitir delete anonimo usuarios" ON public.usuarios FOR DELETE TO anon USING (true);

-- Insertar administrador por defecto
INSERT INTO public.usuarios (nombre, email, rol, activo) VALUES 
('Administrador Principal', 'admin@telolimpio.cl', 'admin', true) 
ON CONFLICT (email) DO NOTHING;
