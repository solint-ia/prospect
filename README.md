# Extrator de Leads B2B — Alievi Prospect

Aplicação web multi-usuário para extrair leads B2B sob demanda, consumindo a API
da plataforma Alievi Prospect e persistindo pesquisas, extrações e contatos num
banco Supabase (PostgreSQL).

## Como rodar

```bash
npm install
npx prisma generate
npm run dev
```

Acesse http://localhost:3000 — sem sessão, o proxy leva para `/login`.

## Variáveis de ambiente (`.env`)

Tudo mora num único `.env`, porque o Prisma CLI não lê `.env.local`.

```env
ALIEVI_USERNAME="..."
ALIEVI_PASSWORD="..."

DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://<projeto>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."

JWT_SECRET="..."
```

## Banco de dados

Modelagem em [prisma/schema.prisma](prisma/schema.prisma): `User` → `Research` →
`Extraction` → `Lead`, todas em cascata na exclusão.

```bash
npx prisma db push     # aplica o schema no Supabase
npx prisma studio      # inspeciona os dados
```

> O projeto está fixado no **Prisma 6**. O Prisma 7+ removeu `url`/`directUrl` do
> schema e passou a exigir driver adapters, o que mudaria a modelagem.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `lib/alievi.ts` | Login, CNAEs, estimativa, criação de pesquisa e extração com polling |
| `lib/auth.ts` | Hash bcrypt, JWT em cookie httpOnly, `usuarioAtual()` / `exigirUsuario()` |
| `lib/prisma.ts` | Client do Prisma com cache global (evita estourar o pool em dev) |
| `lib/filtros.ts` | Validação dos filtros de pesquisa |
| `lib/leads.ts` | Achata o lead da Alievi para o formato da tabela `Lead` |
| `lib/erros.ts` | Traduz erros HTTP/rede em mensagens legíveis |
| `proxy.ts` | Redireciona quem não tem cookie de sessão para `/login` |
| `app/login/page.tsx` | Tela única de login e cadastro |
| `app/dashboard/page.tsx` | Grid de cards das pesquisas do usuário |
| `app/pesquisas/[id]/page.tsx` | Histórico de extrações, tabela de leads e export CSV |
| `app/admin/page.tsx` | Painel do admin: contas, saldos e créditos |
| `lib/creditos.ts` | Saldo da Alievi, reserva e estorno atômicos de créditos |
| `scripts/criar-admin.mjs` | Cria ou promove uma conta admin |
| `app/components/CnaeCombobox.tsx` | Autocomplete de CNAE por código ou atividade |
| `app/components/TabelaLeads.tsx` | Tabela interativa + geração do CSV |

## API

| Rota | O que faz |
| --- | --- |
| `POST /api/auth/register` | Cria a conta (1.000 créditos) e abre sessão |
| `POST /api/auth/login` | Valida credenciais e abre sessão |
| `POST /api/auth/logout` | Encerra a sessão |
| `GET /api/auth/eu` | Usuário logado e saldo |
| `GET /api/cnaes` | Lista os ~1.360 CNAEs (cache em memória de 1h) |
| `GET /api/pesquisas` | Pesquisas do usuário |
| `POST /api/pesquisas` | Estima, cria na Alievi e persiste a pesquisa |
| `GET/DELETE /api/pesquisas/{id}` | Detalhe ou exclusão da pesquisa |
| `POST /api/pesquisas/{id}/extracoes` | Extrai, faz o polling e salva os leads |
| `DELETE /api/extracoes/{id}` | Exclui uma extração e seus leads |
| `GET /api/extracoes/{id}/leads` | Leads persistidos de uma extração |
| `GET /api/admin/usuarios` | (admin) Contas, uso e resumo de créditos |
| `POST /api/admin/usuarios` | (admin) Cria uma conta de usuário |
| `PATCH /api/admin/usuarios/{id}` | (admin) Define `credits` e/ou `role` |
| `DELETE /api/admin/usuarios/{id}` | (admin) Exclui a conta em cascata |

Toda rota autenticada resolve o usuário pelo cookie e filtra por `userId`, então
uma conta nunca enxerga as pesquisas de outra.

## Fluxo

1. **Login / cadastro** — conta nova nasce com 1.000 créditos.
2. **Dashboard** — cards com nome, CNAE, UF, totais estimados e data.
3. **Nova pesquisa** — filtros → estimativa (gratuita) → a Alievi registra a
   pesquisa → card criado. O modal mostra *"Encontramos X empresas e Y sócios"*.
4. **Nova extração** — escolhe a quantidade → a Alievi processa (polling de 2,5s)
   → os leads são gravados no Supabase.
5. **Tabela** — sócio, empresa, CNPJ, telefones, e-mails e endereço, com botão
   **Exportar CSV** (separador `;` e BOM, para o Excel pt-BR abrir com acentos).

## Estimativa de oportunidades

`POST https://backsec.alievichat.com/webhook/estimativa` vive em outro host e
**não** usa o token da plataforma. Devolve os totais como string e grafa o campo
`totaleads` (com um L só).

## Créditos

1 lead extraído = 1 crédito. Existem dois saldos:

| Perfil | Saldo exibido | Quem desconta |
| --- | --- | --- |
| Admin | Saldo real da conta Alievi (lido no login da plataforma, cache de 30s) | A própria Alievi |
| Usuário | Campo `credits` do banco, definido pelo admin | A aplicação, na tabela `User` |

Na extração de um usuário, os créditos do pedido são **reservados antes** de
chamar a Alievi, numa única operação condicional no banco (`credits >= n`), o que
impede que duas extrações simultâneas gastem o mesmo saldo. Ao terminar, só os
leads entregues ficam debitados; a diferença (entrega parcial) e o total (falha)
voltam para o saldo. O valor cobrado fica em `Extraction.creditsCharged`.

## Administração

```bash
npm run admin:criar -- <email> <senha> [nome]
```

Cria uma conta admin ou promove uma existente (trocando a senha). Em `/admin` o
admin vê o saldo da Alievi, o total distribuído e consumido, e pode definir os
créditos de cada conta, promover/rebaixar admins e excluir contas. Um admin não
pode rebaixar nem excluir a si mesmo, o que garante que sempre sobra um.
