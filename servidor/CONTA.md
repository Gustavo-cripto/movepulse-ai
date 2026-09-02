# Ligar a conta (Supabase)

A app já tem tudo escrito — registo, início de sessão, recuperação de palavra-passe e
sincronização. Falta só criar o projeto, porque isso exige uma conta tua.

## 1. Criar o projeto (5 minutos)

1. Vai a <https://supabase.com> e cria conta (gratuita).
2. **New project** — dá-lhe um nome (por exemplo `movepulse`), escolhe uma região próxima
   (Frankfurt ou Londres) e guarda a palavra-passe da base de dados que ele gera.
3. Espera que o projeto acabe de arrancar.

## 2. Criar a tabela

No projeto: **SQL Editor → New query**, cola o conteúdo de [`supabase.sql`](supabase.sql)
e carrega em **Run**.

## 3. Copiar as duas chaves

Em **Project Settings → API**:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon public** — uma chave longa que começa por `eyJ...`

Estas duas podem ficar no código da app: a chave `anon` é pública por natureza e o acesso é
travado pelas regras de segurança por linha que o SQL acima criou.

**A chave `service_role` nunca sai daqui.** Essa dá acesso a tudo, ignorando as regras. Não a
ponhas na app nem a partilhes.

## 4. Colar na app

Em `js/nuvem.js`, no topo:

```js
const NUVEM = {
  url: 'https://abcdefgh.supabase.co',
  chaveAnon: 'eyJ...',
  tabela: 'perfis',
};
```

Depois `git push`, e a conta fica a funcionar em **Definições → A minha conta**.

## Confirmação de email

Por omissão, a Supabase envia um email de confirmação ao registar. Para testares mais depressa,
podes desligar em **Authentication → Providers → Email → Confirm email**. Para uso a sério com
clientes, deixa ligado.
