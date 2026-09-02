/* ============================================================
   Conta e sincronização (Supabase).

   Falamos com a API REST diretamente, sem biblioteca externa:
   a app tem de continuar a funcionar offline e sem dependências.

   A chave "anon" é pública por natureza — protege-se com as regras
   de acesso por linha (RLS) definidas na base de dados, que só
   deixam cada utilizador ver e escrever a sua própria linha.
   ============================================================ */

const NUVEM = {
  url: '',            // https://xxxx.supabase.co
  chaveAnon: '',      // chave "anon public" do projeto
  tabela: 'perfis',
};

const CHAVE_SESSAO = 'movepulse.sessao';

const Nuvem = {
  get configurada(){ return !!(NUVEM.url && NUVEM.chaveAnon); },

  sessao(){
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null'); }
    catch { return null; }
  },
  get email(){ return Nuvem.sessao()?.email || null; },
  get autenticado(){ return !!Nuvem.sessao()?.access_token; },

  guardarSessao(s){
    if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
    else localStorage.removeItem(CHAVE_SESSAO);
  },

  /* ---------- autenticação ---------- */
  async registar(email, senha){
    const d = await pedirAuth('signup', { email, password: senha });
    // com confirmação de email ligada, ainda não vem sessão
    if (d.access_token) Nuvem.guardarSessao(sessaoDe(d));
    return { precisaConfirmar: !d.access_token };
  },

  async entrar(email, senha){
    const d = await pedirAuth('token?grant_type=password', { email, password: senha });
    Nuvem.guardarSessao(sessaoDe(d));
  },

  async recuperar(email){
    await pedirAuth('recover', { email });
  },

  sair(){ Nuvem.guardarSessao(null); },

  /** Renova a sessão quando o token expira. */
  async renovar(){
    const s = Nuvem.sessao();
    if (!s?.refresh_token) throw new Error('Sessão terminada.');
    const d = await pedirAuth('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
    Nuvem.guardarSessao(sessaoDe(d));
    return Nuvem.sessao();
  },

  /* ---------- dados ---------- */
  async guardar(dados){
    const corpo = { id: Nuvem.sessao().id, dados, atualizado: new Date().toISOString() };
    await pedirDados('POST', `${NUVEM.tabela}`, corpo, { Prefer: 'resolution=merge-duplicates' });
  },

  async ler(){
    const linhas = await pedirDados('GET',
      `${NUVEM.tabela}?id=eq.${Nuvem.sessao().id}&select=dados,atualizado`);
    return linhas?.[0] || null;
  },
};

function sessaoDe(d){
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    id: d.user?.id,
    email: d.user?.email,
    expira: Date.now() + (d.expires_in || 3600) * 1000,
  };
}

async function pedirAuth(caminho, corpo){
  const r = await fetch(`${NUVEM.url}/auth/v1/${caminho}`, {
    method:'POST',
    headers:{ 'content-type':'application/json', apikey: NUVEM.chaveAnon },
    body: JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(traduzirErro(d.error_description || d.msg || d.message || `erro ${r.status}`));
  return d;
}

async function pedirDados(metodo, caminho, corpo, extra = {}, jaRenovou = false){
  let s = Nuvem.sessao();
  if (!s) throw new Error('Não há sessão iniciada.');
  if (s.expira && Date.now() > s.expira - 30000) s = await Nuvem.renovar();

  const r = await fetch(`${NUVEM.url}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      'content-type':'application/json',
      apikey: NUVEM.chaveAnon,
      Authorization: `Bearer ${s.access_token}`,
      ...extra,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (r.status === 401 && !jaRenovou){
    await Nuvem.renovar();
    return pedirDados(metodo, caminho, corpo, extra, true);
  }
  if (!r.ok) throw new Error(`A nuvem respondeu com erro ${r.status}.`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

function traduzirErro(mensagem){
  const m = String(mensagem).toLowerCase();
  if (m.includes('invalid login')) return 'Email ou palavra-passe errados.';
  if (m.includes('already registered')) return 'Já existe conta com esse email.';
  if (m.includes('password') && m.includes('6')) return 'A palavra-passe precisa de pelo menos 6 caracteres.';
  if (m.includes('email')) return 'Email inválido.';
  return mensagem;
}
