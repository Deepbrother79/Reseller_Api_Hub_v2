
-- Crea il prodotto digitale EMAIL-INBOX-READER per i token
INSERT INTO public.products (
  id,
  name,
  product_type,
  fornitore_url,
  short_description
) VALUES (
  gen_random_uuid(),
  'EMAIL-INBOX-READER',
  'digital',
  'internal://email-inbox-reader',
  'Token-based service for reading email inbox via credentials strings'
) ON CONFLICT (name) DO NOTHING;

-- Aggiorna i prodotti esistenti per aggiungere flag di compatibilità
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS inbox_compatible boolean DEFAULT false;

-- Marca i prodotti HOTMAIL e OUTLOOK come compatibili con inbox reading
UPDATE public.products 
SET inbox_compatible = true 
WHERE name IN ('HOTMAIL-NEW-LIVE-1-12H', 'OUTLOOK-NEW-LIVE-1-12H');
