-- 🛵 مناديب الدفع المقدم — تحديث 4: المندوب يعدّل السعر اللي اتحصّل ويكتب قيمة الشحن
--   collected = المبلغ اللي اتحصّل فعلاً من العميل (فاضي = سعر الأوردر كامل) — للاستلام الجزئي
--   ship_fee  = قيمة الشحن (مصاريف المندوب) — سعر الأوردر بيتقسم لوحده: المنتج = المحصّل − الشحن
--   💰 حسابات المناديب: الحساب = اللي دفعه مقدم − (اللي اتحصّل من المتسلم − الشحن)  → موجب = ليه · سالب = لينا
-- شغّله مرة واحدة في Supabase → SQL Editor (بعد prepaid_orders_3.sql). مش بيلغي أي حاجة موجودة.

alter table public.prepaid_orders add column if not exists collected numeric;
alter table public.prepaid_orders add column if not exists ship_fee numeric;
alter table public.prepaid_orders add column if not exists money_at timestamptz;
alter table public.prepaid_orders add column if not exists money_by text;

-- المندوب يعدّل المحصّل والشحن لأوردراته بس (من غير ما يعدّل أي بيانات تانية)
create or replace function public.prepaid_set_money(p_id bigint, p_collected numeric, p_ship numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; nm text;
begin
  if coalesce(p_collected, 0) < 0 or coalesce(p_ship, 0) < 0 then raise exception 'bad amount'; end if;
  select coalesce(full_name, username) into nm from public.profiles where id = auth.uid();
  update public.prepaid_orders set
    collected = p_collected,
    ship_fee = p_ship,
    money_at = now(),
    money_by = nm
  where id = p_id and (courier_id = auth.uid() or public.app_has_section('prepaid') or public.app_has_section('prepaid_admin'));
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.prepaid_set_money(bigint, numeric, numeric) to authenticated;
