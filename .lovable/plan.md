## Plano

1. **Atualizar preço do iPhone 12 64GB Branco** para R$ 900 (price_cents = 90000) na tabela `listings`.

2. **Investigar site não abrindo**:
   - Verificar logs do dev server e console
   - Checar variáveis `.env` (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
   - Verificar status do Lovable Cloud (`cloud_status`)
   - Conferir se há erro de build recente em `src/routes/chat.tsx` (última edição) ou route tree
   - Aplicar correção conforme causa identificada (reconectar Cloud, restart dev server, ou fix de código)