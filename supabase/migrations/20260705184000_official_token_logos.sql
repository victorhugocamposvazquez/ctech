-- Iconos oficiales de tokens (PNG locales desde Trust Wallet assets / BTCB)

update public.wallet_managed_tokens
set logo_url = '/wallet/icons/usdt.png', updated_at = now()
where symbol = 'USDT' and network = 'bsc';

update public.wallet_managed_tokens
set logo_url = '/wallet/icons/usdc.png', updated_at = now()
where symbol = 'USDC' and network = 'bsc';

update public.wallet_managed_tokens
set logo_url = '/wallet/icons/btc.png', updated_at = now()
where symbol = 'BTC' and network = 'bsc';

update public.wallet_managed_tokens
set logo_url = '/wallet/icons/eth.png', updated_at = now()
where symbol = 'ETH' and network = 'bsc';
