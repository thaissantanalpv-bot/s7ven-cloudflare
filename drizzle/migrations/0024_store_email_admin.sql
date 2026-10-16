insert into public.admin_invites(email) values ('7tabacariaelounge@gmail.com') on conflict do nothing;--> statement-breakpoint
insert into public.user_roles(user_id, role) select id, 'admin' from auth.users where lower(email)='7tabacariaelounge@gmail.com' and email_confirmed_at is not null on conflict (user_id, role) do nothing;
