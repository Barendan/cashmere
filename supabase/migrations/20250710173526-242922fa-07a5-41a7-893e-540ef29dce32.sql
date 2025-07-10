
-- Add active column to services table with default true
ALTER TABLE public.services 
ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Create index for performance on active services queries
CREATE INDEX idx_services_active ON public.services(active) WHERE active = true;

-- Update any existing services to be active (this is redundant due to default but explicit)
UPDATE public.services SET active = true WHERE active IS NULL;
