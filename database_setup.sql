-- ==========================================================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS PARA BARISTAS (SUPABASE)
-- Copia y ejecuta este script en el "SQL Editor" de tu panel de Supabase.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. TABLA: products
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    precio_original NUMERIC(10, 2),
    descuento INTEGER,
    calificacion NUMERIC(3, 1) DEFAULT 4.0,
    imagen_url TEXT,
    categoria_id INTEGER,
    disponible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política RLS: Permitir lectura pública a cualquier usuario (anónimo o autenticado)
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
CREATE POLICY "Permitir lectura publica de productos" 
ON public.products FOR SELECT 
USING (true);


-- --------------------------------------------------------------------------
-- 2. TABLA: perfiles (Perfiles de usuarios vinculados a Auth.users)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255),
    direccion TEXT,
    telefono VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para perfiles (Los usuarios solo acceden a su propio perfil)
DROP POLICY IF EXISTS "Permitir lectura del propio perfil" ON public.perfiles;
CREATE POLICY "Permitir lectura del propio perfil" 
ON public.perfiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir insercion del propio perfil" ON public.perfiles;
CREATE POLICY "Permitir insercion del propio perfil" 
ON public.perfiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir actualizacion del propio perfil" ON public.perfiles;
CREATE POLICY "Permitir actualizacion del propio perfil" 
ON public.perfiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);


-- --------------------------------------------------------------------------
-- 3. TABLA: carrito
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carrito (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en carrito
ALTER TABLE public.carrito ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para carrito (Los usuarios solo operan en sus propios elementos de carrito)
DROP POLICY IF EXISTS "Permitir lectura del propio carrito" ON public.carrito;
CREATE POLICY "Permitir lectura del propio carrito" 
ON public.carrito FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Permitir insercion en el propio carrito" ON public.carrito;
CREATE POLICY "Permitir insercion en el propio carrito" 
ON public.carrito FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Permitir actualizacion del propio carrito" ON public.carrito;
CREATE POLICY "Permitir actualizacion del propio carrito" 
ON public.carrito FOR UPDATE 
TO authenticated 
USING (auth.uid() = usuario_id) 
WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Permitir eliminacion del propio carrito" ON public.carrito;
CREATE POLICY "Permitir eliminacion del propio carrito" 
ON public.carrito FOR DELETE 
TO authenticated 
USING (auth.uid() = usuario_id);


-- --------------------------------------------------------------------------
-- 4. TABLA: pedidos (Órdenes de Compra)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago VARCHAR(100) DEFAULT 'efectivo',
    estado VARCHAR(50) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en pedidos
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pedidos (El usuario solo puede insertar e interactuar con sus pedidos)
DROP POLICY IF EXISTS "Permitir insercion de pedidos propios" ON public.pedidos;
CREATE POLICY "Permitir insercion de pedidos propios" 
ON public.pedidos FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Permitir lectura de pedidos propios" ON public.pedidos;
CREATE POLICY "Permitir lectura de pedidos propios" 
ON public.pedidos FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id);


-- --------------------------------------------------------------------------
-- 5. TABLA: detalles_pedido (Ítems comprados dentro de cada Pedido)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.detalles_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL
);

-- Habilitar RLS en detalles_pedido
ALTER TABLE public.detalles_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para detalles_pedido (Vinculados a través del usuario_id en pedidos)
DROP POLICY IF EXISTS "Permitir insercion de detalles de pedidos propios" ON public.detalles_pedido;
CREATE POLICY "Permitir insercion de detalles de pedidos propios" 
ON public.detalles_pedido FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pedidos 
        WHERE public.pedidos.id = pedido_id 
        AND public.pedidos.usuario_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Permitir lectura de detalles de pedidos propios" ON public.detalles_pedido;
CREATE POLICY "Permitir lectura de detalles de pedidos propios" 
ON public.detalles_pedido FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.pedidos 
        WHERE public.pedidos.id = pedido_id 
        AND public.pedidos.usuario_id = auth.uid()
    )
);


-- --------------------------------------------------------------------------
-- 6. DATOS DE SEMILLA (MOCK_PRODUCTS): Llena la base de datos si está vacía
-- --------------------------------------------------------------------------
INSERT INTO public.products (id, nombre, descripcion, precio, precio_original, descuento, calificacion, imagen_url, categoria_id, disponible)
VALUES
(1, 'Café Irish', 'Café con whiskey irlandés y crema batida', 4.60, 5.30, 13, 4.0, 'img/cafe-irish.jpg', 1, true),
(2, 'Café Inglés', 'Mezcla especial de granos ingleses', 5.70, 7.30, 22, 3.0, 'img/cafe-ingles.jpg', 1, true),
(3, 'Café Australiano', 'Flat white estilo australiano', 3.20, NULL, NULL, 5.0, 'img/cafe-australiano.jpg', 1, true),
(4, 'Café Helado', 'Refrescante café con hielo y leche', 5.60, NULL, NULL, 4.0, 'img/cafe-helado.jpg', 1, true),
(5, 'Café Viena', 'Café con crema batida y canela', 3.85, 5.50, 30, 5.0, 'img/cafe-viena.jpg', 1, true),
(6, 'Café Liqueurs', 'Café con licor de avellana', 5.60, NULL, NULL, 4.0, 'img/cafe-liqueurs.jpg', 1, true)
ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio = EXCLUDED.precio,
    precio_original = EXCLUDED.precio_original,
    descuento = EXCLUDED.descuento,
    calificacion = EXCLUDED.calificacion,
    imagen_url = EXCLUDED.imagen_url,
    categoria_id = EXCLUDED.categoria_id,
    disponible = EXCLUDED.disponible;
