
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.team_invites REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.generations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;
