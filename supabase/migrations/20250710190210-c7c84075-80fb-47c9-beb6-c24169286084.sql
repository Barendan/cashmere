
-- Add for_sale column to products table to distinguish between sellable and internal-use products
ALTER TABLE public.products 
ADD COLUMN for_sale BOOLEAN NOT NULL DEFAULT true;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN public.products.for_sale IS 'Indicates whether this product is available for sale to customers (true) or for internal use only (false)';
