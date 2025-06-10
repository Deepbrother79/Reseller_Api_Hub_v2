
-- Tabella per memorizzare i prodotti digitali locali (stringhe di codice)
CREATE TABLE public.digital_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id),
  content text NOT NULL, -- La stringa del prodotto (email|password, chiave API, etc.)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_used boolean NOT NULL DEFAULT false
);

-- Aggiungi un campo alla tabella products per distinguere il tipo di prodotto
ALTER TABLE public.products 
ADD COLUMN product_type text NOT NULL DEFAULT 'api'; -- 'api' o 'digital'

-- Indice per performance su ricerche di prodotti disponibili
CREATE INDEX idx_digital_products_available 
ON public.digital_products(product_id, is_used) 
WHERE is_used = false;

-- RLS policies per digital_products (se necessario)
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

-- Policy per permettere la lettura a tutti (o personalizza secondo le tue esigenze)
CREATE POLICY "Allow read access to digital_products" 
ON public.digital_products 
FOR SELECT 
USING (true);

-- Policy per permettere l'aggiornamento a tutti (per marcare come usato)
CREATE POLICY "Allow update access to digital_products" 
ON public.digital_products 
FOR UPDATE 
USING (true);
