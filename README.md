# Bolao da Copa

App estatico para Cloudflare Pages com Supabase, sem Supabase Auth.

## Fluxo

- Cadastro: nome + e-mail.
- Login: e-mail cadastrado.
- O participante fica salvo no navegador via localStorage.
- Palpite: casa, empate ou visitante.
- Ranking: 1 ponto por acerto.

## Configurar

1. Crie ou abra seu projeto no Supabase.
2. Rode `simple-schema.sql` no SQL Editor.
3. Suba os arquivos desta pasta no Cloudflare Pages.
4. Abra `index.html`, cadastre seu nome/e-mail e entre.

As chaves do Supabase ja estao em `app.js`.

## Admin

O admin abre `admin.html`. O codigo padrao e:

```text
admin2026
```

Depois que voce se cadastrar, tambem pode marcar seu participante como admin:

```sql
update public.participants
set is_admin = true
where email = 'seu-email@exemplo.com';
```

## Importar jogos

Entre em `admin.html`, cole o conteudo de `worldcup-2026-seed.csv` no campo de importacao e clique em importar.
