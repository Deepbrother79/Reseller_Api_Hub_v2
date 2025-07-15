-- Create Processed-Used-Goods table
CREATE TABLE public.processed_used_goods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digit_item_ref UUID NOT NULL,
  used_items TEXT NOT NULL,
  start_check_time INTEGER NOT NULL,
  last_check_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.processed_used_goods ENABLE ROW LEVEL SECURITY;

-- Create policies for full access
CREATE POLICY "Allow all operations on processed_used_goods" 
ON public.processed_used_goods 
FOR ALL 
USING (true)
WITH CHECK (true);