
-- Inserisci il nuovo prodotto INVITE-CAPCUT-PRO
INSERT INTO public.products (
  id,
  name,
  product_type,
  fornitore_url,
  short_description,
  http_method
) VALUES (
  gen_random_uuid(),
  'INVITE-CAPCUT-PRO',
  'digital',
  'https://prod-26.centralindia.logic.azure.com:443/workflows/90e7a65b425f4535913a8db865b9c8a2/triggers/manual/paths/invoke?api-version=2016-06-01',
  'Get free days on CapCut Pro, up to 70 days with your invite friend code. New accounts only. 24 hours to complete the order. One credit every seven days.',
  'POST'
) ON CONFLICT (name) DO NOTHING;
