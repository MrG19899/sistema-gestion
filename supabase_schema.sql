-- Purga Inicial
TRUNCATE TABLE clientes cascade;

-- 1. Tabla: servicios_limpieza
CREATE TABLE IF NOT EXISTS public.servicios_limpieza (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  servicio text NOT NULL,
  sector text NOT NULL,
  fecha date NOT NULL,
  hora text NOT NULL,
  direccion text NOT NULL,
  estado text DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para limpieza
ALTER TABLE public.servicios_limpieza ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir full access a servicios_limpieza anon" 
  ON public.servicios_limpieza FOR ALL 
  USING (true) WITH CHECK (true);

-- 2. Tabla: servicios_alfombras
CREATE TABLE IF NOT EXISTS public.servicios_alfombras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_servicio text NOT NULL,
  dimensiones text,
  ancho numeric,
  largo numeric,
  m2 numeric,
  valor_m2 numeric,
  valor_total numeric,
  fecha_recepcion date,
  fecha_entrega date,
  ubicacion text,
  estado text DEFAULT 'espera',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para alfombras
ALTER TABLE public.servicios_alfombras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir full access a servicios_alfombras anon" 
  ON public.servicios_alfombras FOR ALL 
  USING (true) WITH CHECK (true);

-- 3. Tabla: servicios_plagas
CREATE TABLE IF NOT EXISTS public.servicios_plagas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  sector text NOT NULL,
  tipo_servicio text[],
  numero_certificado text,
  tecnico_asignado text,
  fecha_ejecucion date,
  proxima_renovacion date,
  estado text DEFAULT 'completado',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para plagas
ALTER TABLE public.servicios_plagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir full access a servicios_plagas anon" 
  ON public.servicios_plagas FOR ALL 
  USING (true) WITH CHECK (true);
