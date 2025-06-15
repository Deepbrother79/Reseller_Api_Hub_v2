
-- Add category and subcategory columns to products table
ALTER TABLE public.products 
ADD COLUMN category TEXT DEFAULT 'Services',
ADD COLUMN subcategory TEXT DEFAULT 'General';

-- Update existing products with sample categories for testing
-- You can adjust these based on your actual products
UPDATE public.products 
SET category = 'Services', subcategory = 'General'
WHERE category IS NULL;
