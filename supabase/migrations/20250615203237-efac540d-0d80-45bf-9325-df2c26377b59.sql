
-- Inserisci il nuovo prodotto GET-OAUTH2-TOKEN
INSERT INTO public.products (
  id,
  name,
  product_type,
  fornitore_url,
  short_description,
  http_method,
  category,
  subcategory
) VALUES (
  gen_random_uuid(),
  'GET-OAUTH2-TOKEN',
  'digital',
  'internal://get-oauth2-token',
  'Token-based service for retrieving OAuth2 tokens using email credentials. Supports Outlook and Hotmail accounts.',
  'POST',
  'Services',
  'OAuth2'
) ON CONFLICT (name) DO NOTHING;
