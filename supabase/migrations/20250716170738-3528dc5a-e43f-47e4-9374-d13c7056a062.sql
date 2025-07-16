-- Enable Row Level Security on Notification_Webapp table
ALTER TABLE public."Notification_Webapp" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to visible notifications
CREATE POLICY "Allow public read access to visible notifications" 
ON public."Notification_Webapp" 
FOR SELECT 
USING (visible = true);

-- Create policy to allow public update access (for marking as read)
CREATE POLICY "Allow public update access to notifications" 
ON public."Notification_Webapp" 
FOR UPDATE 
USING (true);