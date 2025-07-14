-- Enable realtime for products table
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- Add products table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;