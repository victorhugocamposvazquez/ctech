-- Permitir insert en wallet_scores cuando el wallet pertenece al usuario
-- (necesario para SmartMoneySimulator y Arkham wallet-scorer)
create policy "wallet_scores_insert_via_wallet" on public.wallet_scores for insert
with check (
  exists (
    select 1 from public.tracked_wallets tw
    where tw.id = wallet_id and tw.user_id = auth.uid()
  )
);
