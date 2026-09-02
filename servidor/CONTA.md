# Conta (Supabase) — já ligada

A conta está a funcionar. Este ficheiro fica como registo do que foi feito e de onde
mexer se for preciso.

## O que existe

- **Organização:** MovePulse (plano gratuito)
- **Projeto:** `movepulse` — West Europe (London), `eu-west-2`
- **URL:** <https://zieekpjgkkrxnzuhbwhp.supabase.co>
- **Chave usada na app:** a *publishable* (`sb_publishable_...`), em `js/nuvem.js`

A chave publishable é pública por natureza — quem protege os dados são as regras de
segurança por linha (RLS). **A chave `secret` / `service_role` nunca entra na app nem
se partilha**: essa ignora todas as regras.

## Base de dados

O [`supabase.sql`](supabase.sql) já foi corrido no **SQL Editor**. Criou:

- a tabela `public.perfis` — uma linha por utilizador (`id`, `dados` em JSON, `atualizado`)
- RLS ligado, com três regras: cada pessoa só lê, cria e atualiza a **sua** linha

Verificado por teste real: com sessão iniciada lê-se e grava-se a própria linha; sem
sessão a resposta vem vazia.

## Autenticação

- **Site URL:** `https://gustavo-cripto.github.io/movepulse-ai/`
  (Authentication → URL Configuration) — é para onde apontam os links de email.
- **Confirm email:** **desligado** (Authentication → Sign In / Providers → User Signups).
  O registo fica imediato, sem esperar por email. O serviço de email gratuito da Supabase
  só deixa enviar meia dúzia de mensagens por hora, por isso a confirmação tornava o
  registo pouco fiável. Se um dia isto for para outras pessoas, volta a ligar e configura
  um SMTP próprio.
- Utilizadores: **Authentication → Users**. Existe lá um `teste.movepulse+setup@gmail.com`,
  criado só para validar a ligação — podes apagá-lo à vontade.

## Onde mexer no código

`js/nuvem.js`, no topo:

```js
const NUVEM = {
  url: 'https://zieekpjgkkrxnzuhbwhp.supabase.co',
  chaveAnon: 'sb_publishable_...',
  tabela: 'perfis',
};
```

A app usa a conta em **Definições → A minha conta**.
