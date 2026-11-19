-- 🎯 صلاحيات سجل المتابعة (أيام تحت هدف التسليم) + كارت مهام اليوم في Squad
-- أي حد داخل يقدر يسجّل حالة لأي أوردر في المتابعة (حتى لو اليوم متوزع على بنت تانية)
-- وأي حد داخل يقدر يحدّث أرقام كارت مهام اليوم (sq_daily_fu) وأرقام الريتارجت (sq_daily_cfg)
-- شغّله مرة واحدة في Supabase → SQL Editor. مش بيلغي أي صلاحية موجودة (بيزوّد بس).

drop policy if exists "app_kv: recov read"   on public.app_kv;
drop policy if exists "app_kv: recov insert" on public.app_kv;
drop policy if exists "app_kv: recov update" on public.app_kv;

create policy "app_kv: recov read" on public.app_kv for select to authenticated
  using (key like 'recov\_%' or key like 'kd\_score\_%' or key in ('sq_daily_fu', 'sq_daily_cfg', 'ersal_focus', 'custom_brands'));

create policy "app_kv: recov insert" on public.app_kv for insert to authenticated
  with check (key like 'recov\_%' or key in ('sq_daily_fu', 'sq_daily_cfg'));

create policy "app_kv: recov update" on public.app_kv for update to authenticated
  using (key like 'recov\_%' or key in ('sq_daily_fu', 'sq_daily_cfg'))
  with check (key like 'recov\_%' or key in ('sq_daily_fu', 'sq_daily_cfg'));
