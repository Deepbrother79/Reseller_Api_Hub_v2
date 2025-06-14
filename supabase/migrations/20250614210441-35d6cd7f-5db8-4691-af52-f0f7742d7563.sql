
-- Create table for associating email senders with code extraction patterns
CREATE TABLE public.email_extraction_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL UNIQUE,
  pattern_name TEXT NOT NULL,
  regex_pattern TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert some common patterns to start with
INSERT INTO public.email_extraction_patterns (from_email, pattern_name, regex_pattern, description) VALUES
('noreply@account.tiktok.com', 'TikTok Code', '\b\d{6}\b', 'TikTok 6-digit verification code'),
('account-security-noreply@accountprotection.microsoft.com', 'Microsoft General', '\b\d{4,8}\b', 'Microsoft general numeric codes'),
('no-reply@accounts.google.com', 'Google Code', '\b\d{6}\b', 'Google 6-digit verification code'),
('security@facebookmail.com', 'Facebook Code', '\b\d{5,8}\b', 'Facebook verification code'),
('account@instagram.com', 'Instagram Code', '\b\d{6}\b', 'Instagram 6-digit verification code');

-- Enable RLS on the table
ALTER TABLE public.email_extraction_patterns ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all (since it will be used by edge function)
CREATE POLICY "Allow read access to email patterns" 
  ON public.email_extraction_patterns 
  FOR SELECT 
  USING (true);

-- Create policy to allow insert and update (for pattern management)
CREATE POLICY "Allow insert and update of email patterns" 
  ON public.email_extraction_patterns 
  FOR ALL 
  USING (true);
