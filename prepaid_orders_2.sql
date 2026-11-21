-- 🛵 مناديب الدفع المقدم — تحديث 2: الأوردرات بتتبعت للقسم (مسؤول واحد)
-- - تقدر تبعت أوردرات حتى لو المسؤول لسه ماعملش حساب (courier_id فاضي)
-- - أي حد معاه صلاحية "🛵 أوردراتي (مندوب دفع مقدم)" بيشوف كل أوردرات القسم ويعلّم عليها
-- شغّله مرة واحدة في Supabase → SQL Editor (بعد prepaid_orders.sql)

alter table public.prepaid_orders alter column courier_id drop not null;

drop policy if exists "prepaid: read" on public.prepaid_orders;
create policy "prepaid: read" on public.prepaid_orders for select to authenticated
  using (courier_id = auth.uid() or public.app_has_section('prepaid') or public.app_has_section('prepaid_admin') or public.app_has_section('qp_upload'));

create or replace function public.prepaid_set_status(p_id bigint, p_status text, p_note text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; nm text; is_c boolean;
begin
  if p_status not in ('pending','delivered','failed') then raise exception 'bad status'; end if;
  -- is_c = المسؤول نفسه (معاه صلاحية prepaid) — مش الأدمن
  select coalesce(full_name, username), coalesce(to_jsonb(allowed_sections) ? 'prepaid', false) into nm, is_c from public.profiles where id = auth.uid();
  update public.prepaid_orders set
    status = p_status,
    status_note = case when p_status = 'pending' then null else nullif(trim(coalesce(p_note, '')), '') end,
    status_at = case when p_status = 'pending' then null else now() end,
    status_by_name = case when p_status = 'pending' then null else nm end,
    -- الأوردر اللي اتبعت قبل ما المسؤول يعمل حساب بيتسجل باسمه أول ما يعلّم عليه
    courier_id = coalesce(courier_id, case when is_c then auth.uid() end),
    courier_name = coalesce(courier_name, case when is_c then nm end)
  where id = p_id and (courier_id = auth.uid() or public.app_has_section('prepaid') or public.app_has_section('prepaid_admin'));
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.prepaid_set_status(bigint, text, text) to authenticated;
