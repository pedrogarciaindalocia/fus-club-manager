alter table public.club_users
  add column if not exists allowed_actions text[] not null default '{}';

alter table public.user_category_assignments
  add column if not exists allowed_actions text[] not null default '{}';

update public.club_users
set allowed_actions = case permission_level
  when 'reporter' then array['report']::text[]
  when 'editor' then array['report', 'edit', 'live_track']::text[]
  when 'live_tracker' then array['live_track']::text[]
  else '{}'::text[]
end
where allowed_actions = '{}'::text[] or allowed_actions is null;

update public.user_category_assignments
set allowed_actions = case permission_level
  when 'reporter' then array['report']::text[]
  when 'editor' then array['report', 'edit', 'live_track']::text[]
  when 'live_tracker' then array['live_track']::text[]
  else '{}'::text[]
end
where allowed_actions = '{}'::text[] or allowed_actions is null;
