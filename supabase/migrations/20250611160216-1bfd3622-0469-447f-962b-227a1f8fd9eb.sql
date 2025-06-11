
-- Crea la tabella per le richieste di rimborso
CREATE TABLE public.refund_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  response_message text,
  refund_status text NOT NULL CHECK (refund_status IN ('approved', 'rejected', 'pending', 'failed', 'refunded')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraint per permettere solo una richiesta di rimborso per transazione
  CONSTRAINT unique_refund_per_transaction UNIQUE (transaction_id)
);

-- RLS policies per refund_transactions
ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere la lettura a tutti
CREATE POLICY "Allow read access to refund_transactions" 
ON public.refund_transactions 
FOR SELECT 
USING (true);

-- Policy per permettere l'inserimento a tutti
CREATE POLICY "Allow insert access to refund_transactions" 
ON public.refund_transactions 
FOR INSERT 
WITH CHECK (true);

-- Policy per permettere l'aggiornamento a tutti
CREATE POLICY "Allow update access to refund_transactions" 
ON public.refund_transactions 
FOR UPDATE 
USING (true);
