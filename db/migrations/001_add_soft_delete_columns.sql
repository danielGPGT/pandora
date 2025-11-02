-- Migration: Add soft delete support to all main tables
-- This migration adds deleted_at columns for soft delete functionality

-- Products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Product options table
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Selling rates table
ALTER TABLE public.selling_rates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Create partial indexes for performance (only index non-deleted records)
-- These indexes are optimized for queries that filter out deleted records

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_deleted_at 
ON public.products(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_not_deleted 
ON public.products(organization_id, is_active) 
WHERE deleted_at IS NULL;

-- Product options indexes
CREATE INDEX IF NOT EXISTS idx_product_options_deleted_at 
ON public.product_options(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_options_active_not_deleted 
ON public.product_options(product_id, is_active) 
WHERE deleted_at IS NULL;

-- Selling rates indexes
CREATE INDEX IF NOT EXISTS idx_selling_rates_deleted_at 
ON public.selling_rates(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selling_rates_active_not_deleted 
ON public.selling_rates(organization_id, is_active) 
WHERE deleted_at IS NULL;

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at 
ON public.suppliers(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_active_not_deleted 
ON public.suppliers(organization_id, is_active) 
WHERE deleted_at IS NULL;

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_deleted_at 
ON public.events(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_active_not_deleted 
ON public.events(organization_id) 
WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.products.deleted_at IS 'Timestamp when the product was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN public.product_options.deleted_at IS 'Timestamp when the product option was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN public.selling_rates.deleted_at IS 'Timestamp when the selling rate was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN public.suppliers.deleted_at IS 'Timestamp when the supplier was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN public.events.deleted_at IS 'Timestamp when the event was soft deleted. NULL means not deleted.';

