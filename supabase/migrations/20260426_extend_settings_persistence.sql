-- Migration to add visual branding and system preferences to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#e03d3d',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS pagination_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS preferred_view_mode TEXT DEFAULT 'list';

-- Ensure we can save these in our service
COMMENT ON COLUMN settings.primary_color IS 'Hex code for the club primary brand color';
COMMENT ON COLUMN settings.secondary_color IS 'Hex code for the club secondary brand color';
COMMENT ON COLUMN settings.pagination_limit IS 'User preference for items per page';
COMMENT ON COLUMN settings.preferred_view_mode IS 'User preference for listing views (grid/list)';
