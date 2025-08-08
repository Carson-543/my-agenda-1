-- Create calendars table to store imported external calendars
CREATE TABLE public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color_code TEXT NOT NULL DEFAULT '#3B82F6',
  url TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  external_source TEXT NOT NULL DEFAULT 'google',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar access
CREATE POLICY "Users can manage own calendars" 
ON public.calendars 
FOR ALL 
USING (auth.uid() = user_id);

-- Add calendar_id to events table to link external events to their calendars
ALTER TABLE public.events 
ADD COLUMN calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates on calendars
CREATE TRIGGER update_calendars_updated_at
BEFORE UPDATE ON public.calendars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();