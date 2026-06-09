# Bolao da Copa

App estatico para Cloudflare Pages com Supabase.

## Configurar

1. Crie um projeto no Supabase.
2. Rode `schema.sql` no SQL Editor.
3. Em Authentication > Providers, habilite email/senha. Para um bolao interno, voce pode desativar confirmacao de e-mail.
4. Abra `app.js` e troque:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Suba esta pasta no Cloudflare Pages.

## Primeiro admin

Depois de criar seu cadastro pelo app, rode no SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'seu-email@exemplo.com';
```

## Importar jogos

Entre em `admin.html`, cole o conteudo de `worldcup-2026-seed.csv` no campo de importacao e clique em importar.

Cada palpite vale 1 ponto quando o usuario acerta: casa, empate ou visitante.
