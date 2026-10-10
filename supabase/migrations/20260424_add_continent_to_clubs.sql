-- Migration to add continent column to clubs table
ALTER TABLE public.clubs 
ADD COLUMN continent text;

-- Add comment for documentation
COMMENT ON COLUMN public.clubs.continent IS 'The continent where the club is located (e.g. Afrique, Europe, Amérique, Asie/Océanie)';
