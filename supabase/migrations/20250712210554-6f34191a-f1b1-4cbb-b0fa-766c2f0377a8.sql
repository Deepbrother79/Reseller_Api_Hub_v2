-- Add value column to products table for master token pricing
ALTER TABLE public.products 
ADD COLUMN value DECIMAL(10,4) DEFAULT 1.0000;

-- Create tokens_master table for universal tokens
CREATE TABLE public.tokens_master (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    credits DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    name TEXT NOT NULL DEFAULT '',
    note TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on tokens_master
ALTER TABLE public.tokens_master ENABLE ROW LEVEL SECURITY;

-- Create policies for tokens_master (similar to tokens table)
CREATE POLICY "Allow public access to tokens_master" 
ON public.tokens_master 
FOR ALL 
USING (true);

-- Create function to update timestamps for tokens_master
CREATE OR REPLACE FUNCTION public.update_tokens_master_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on tokens_master
CREATE TRIGGER update_tokens_master_updated_at
BEFORE UPDATE ON public.tokens_master
FOR EACH ROW
EXECUTE FUNCTION public.update_tokens_master_updated_at_column();