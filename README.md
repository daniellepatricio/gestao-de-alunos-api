# Gestão de Alunos API

[![Testes da API](https://github.com/daniellepatricio/gestao-de-alunos-api/actions/workflows/testes.yml/badge.svg)](https://github.com/daniellepatricio/gestao-de-alunos-api/actions/workflows/testes.yml)

API REST para gestão de alunos, disciplinas, notas e trabalhos, com banco de dados em memória.

## Descrição

A API modela um cenário simples de gestão escolar com dois tipos de uso:

- **Administrador**: cadastra alunos, cadastra disciplinas, matricula alunos em disciplinas e
  lança notas.
- **Aluno**: consulta as disciplinas em que está matriculado, consulta suas próprias notas e
  registra trabalhos (entregas) para as disciplinas cursadas.

Essas duas perspectivas são refletidas diretamente na organização das rotas:

- `/api/admin/*` — operações do administrador (CRUD de alunos, disciplinas, matrículas, notas e
  correção de trabalhos). **Restrito a usuários com papel `admin`.**
- `/api/alunos/*` — autoatendimento do aluno (consulta de disciplinas, consulta de notas e
  registro de trabalhos). **Restrito ao próprio aluno autenticado (dono do `alunoId`) ou a um
  administrador.**

Toda a API é protegida por autenticação **JWT**, exceto o endpoint de login. Não existe endpoint
de cadastro de administrador — ele já vem pré-cadastrado no banco em memória (veja
[Autenticação](#autenticação) abaixo).

O banco de dados é **em memória** (um objeto JavaScript mantido no processo Node) — os dados são
reiniciados sempre que o servidor é reiniciado, voltando ao conjunto de dados fake descrito abaixo.

## Stack utilizada

- **Node.js** com módulos ES (`"type": "module"` no `package.json`)
- **Express** — framework web e roteamento
- **jsonwebtoken** — emissão e verificação dos tokens JWT usados na autenticação
- **bcryptjs** — hash das senhas armazenadas no banco em memória
- **js-yaml** — carregamento do arquivo de documentação OpenAPI em YAML
- **swagger-ui-express** — renderização do Swagger UI a partir do YAML
- **cors** — liberação de CORS para consumo por outros clientes/origens
- **morgan** — log de requisições HTTP no console
- **nodemon** (dependência de desenvolvimento) — reinício automático do servidor durante o
  desenvolvimento

Testes automatizados:

- **Mocha** — executor dos testes
- **Chai** — asserções (`expect`)
- **Supertest** — requisições HTTP contra a API
- **Sinon** — stubs/mocks nos testes internos (ex.: simular falha do serviço de login)
- **dotenv** — leitura das variáveis do arquivo `.env` (URL da API e credenciais de teste)
- **GitHub Actions** — execução dos testes na pipeline a cada push/pull request

Sem banco de dados externo nem ORM — persistência é 100% em memória, propositalmente simples para
fins de estudo/demonstração. A autenticação, porém, é real: senhas com hash (bcrypt) e sessões
via JWT assinado.

## Arquitetura do código

```
src/
  app.js                 # configuração do Express: middlewares, Swagger, rotas, erros
  server.js              # ponto de entrada: sobe o servidor HTTP (separado do app)
  config/
    jwt.js                # segredo e tempo de expiração do JWT
  routes/                # definição das rotas (Express Router), sem lógica de negócio
    index.js
    auth.routes.js         # login -> /api/auth (público)
    aluno.routes.js       # rotas de autoatendimento do aluno -> /api/alunos (protegidas)
    admin/                # rotas do administrador -> /api/admin (protegidas, papel admin)
  controllers/            # lida com req/res, delega para os services
  services/               # regras de negócio e validações
  models/                 # formato/criação das entidades (factories), incluindo hash de senha
  database/
    db.js                 # banco de dados em memória (coleções + operações CRUD genéricas)
    seed.js                # dados fake carregados na inicialização (inclui o admin)
  middlewares/
    authenticate.js        # valida o JWT e popula req.user
    authorize.js            # restringe uma rota a um ou mais papéis (ex.: "admin")
    authorizeSelfOrAdmin.js # em /api/alunos/:alunoId, exige ser o próprio aluno ou um admin
    notFound.js
    errorHandler.js
  utils/
    ApiError.js
    asyncHandler.js
docs/
  openapi.yaml            # especificação Swagger/OpenAPI (fonte da documentação)
test/                     # testes automatizados (veja "Testes automatizados" abaixo)
  data/                   # massas de dados em JSON (Data-Driven Testing)
  external/               # testes que chamam a API rodando via HTTP (BASE_URL)
  internal/               # testes que sobem o app em memória (com stubs do Sinon)
  helpers/                # helpers compartilhados: cliente HTTP e login de admin/aluno
  factories/              # geradores de dados únicos (alunos, disciplinas)
.github/workflows/
  testes.yml              # pipeline de testes do GitHub Actions
.mocharc.json             # configuração do Mocha (arquivos, ordem e timeout)
.env.example              # modelo das variáveis de ambiente usadas nos testes
```

## Instalação e execução

Pré-requisito: Node.js 20.19+ ou 22.12+ (exigência do Mocha 12; a pipeline usa Node 24).

```bash
# instalar dependências
npm install

# subir em modo produção
npm start

# subir em modo desenvolvimento (reinício automático com nodemon)
npm run dev
```

O servidor sobe por padrão em `http://localhost:3000` (pode ser alterado com a variável de
ambiente `PORT`).

## Documentação da API (Swagger)

A documentação completa de todas as rotas, parâmetros, corpos de requisição e respostas está
disponível em:

- **Swagger UI (interface interativa):** `http://localhost:3000/api-docs`
- **Arquivo YAML bruto servido pela API:** `http://localhost:3000/api-docs.yaml`
- **Fonte do arquivo no repositório:** [`docs/openapi.yaml`](docs/openapi.yaml)

A raiz da API (`GET /`) também retorna um JSON simples com o nome, descrição e o link para a
documentação.

## Autenticação

A API usa **JWT** (`Authorization: Bearer <token>`). Todas as rotas exigem um token válido,
exceto `POST /api/auth/login`.

1. Faça login informando `email` e `senha` de um administrador ou de um aluno já cadastrado:

   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@escola.com","senha":"admin123"}'
   ```

   A resposta traz o `token` e os dados básicos do usuário autenticado (`id`, `nome`, `email`,
   `role`).

2. Envie o token nas próximas requisições:

   ```bash
   curl http://localhost:3000/api/admin/alunos \
     -H "Authorization: Bearer <token>"
   ```

No Swagger UI (`/api-docs`), clique em **Authorize** e informe `Bearer <token>` para testar as
rotas protegidas diretamente pela interface.

### Regras de autorização

- **`/api/admin/*`** — exige token com papel `admin`. É aqui que alunos, disciplinas e notas são
  cadastrados; apenas o administrador tem acesso.
- **`/api/alunos/{alunoId}/*`** — exige token válido (admin ou aluno). Um aluno só acessa quando
  `alunoId` é o seu próprio id; um administrador pode acessar os dados de qualquer aluno.
- Não existe endpoint para cadastrar administradores: o único admin do sistema já vem
  pré-cadastrado no banco em memória (credenciais na seção de dados fake abaixo).
- Quando um administrador cadastra um aluno (`POST /api/admin/alunos`), ele também define a senha
  inicial de acesso desse aluno (campo `senha`, obrigatório no cadastro).
- Senhas nunca são retornadas pela API — são armazenadas apenas como hash (bcrypt).

## Dados fake pré-carregados

Ao iniciar, o banco em memória já vem populado com os dados abaixo (ids legíveis, para facilitar
testes manuais via Swagger UI ou curl). Todas as senhas abaixo são apenas para demonstração.

### Administrador (`/api/auth/login`)

| id               | nome                       | email             | senha    |
|------------------|-----------------------------|-------------------|----------|
| `admin-principal`| Administrador do Sistema   | admin@escola.com  | admin123 |

### Alunos (`/api/admin/alunos`)

| id                   | nome          | email                       | matrícula | senha  |
|----------------------|---------------|------------------------------|-----------|--------|
| `aluno-ana-souza`    | Ana Souza     | ana.souza@example.com       | 2024001   | 123456 |
| `aluno-bruno-lima`   | Bruno Lima    | bruno.lima@example.com      | 2024002   | 123456 |
| `aluno-carla-mendes` | Carla Mendes  | carla.mendes@example.com    | 2024003   | 123456 |

### Disciplinas (`/api/admin/disciplinas`)

| id                            | nome              | código  | carga horária |
|--------------------------------|-------------------|---------|----------------|
| `disciplina-matematica`        | Matemática        | MAT101  | 60h            |
| `disciplina-historia`          | História          | HIS101  | 40h            |
| `disciplina-programacao-web`   | Programação Web   | PRW201  | 80h            |

### Matrículas

| aluno         | disciplina         |
|---------------|---------------------|
| Ana Souza     | Matemática          |
| Ana Souza     | Programação Web     |
| Bruno Lima    | Matemática          |
| Bruno Lima    | História            |
| Carla Mendes  | Programação Web     |

### Notas (`/api/admin/notas`)

| aluno         | disciplina         | tipo         | valor |
|---------------|---------------------|--------------|-------|
| Ana Souza     | Matemática          | prova        | 8.5   |
| Ana Souza     | Programação Web     | prova        | 9.2   |
| Bruno Lima    | Matemática          | prova        | 6.0   |
| Bruno Lima    | História            | participação | 7.5   |
| Carla Mendes  | Programação Web     | prova        | 10    |

### Trabalhos (`/api/admin/trabalhos`)

| aluno         | disciplina    | título                                  | status      |
|---------------|---------------|-------------------------------------------|-------------|
| Ana Souza     | Matemática    | Lista de Exercícios 1                     | entregue    |
| Bruno Lima    | História      | Linha do Tempo - Revolução Industrial     | corrigido (nota 8.0) |
| Carla Mendes  | Programação Web | Landing Page Responsiva                 | entregue    |

### Exemplos rápidos de uso

```bash
# Login como admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@escola.com","senha":"admin123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# Admin: listar alunos
curl http://localhost:3000/api/admin/alunos -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin: matricular a Carla em História
curl -X POST http://localhost:3000/api/admin/disciplinas/disciplina-historia/matriculas \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alunoId":"aluno-carla-mendes"}'

# Admin: lançar uma nota
curl -X POST http://localhost:3000/api/admin/notas \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alunoId":"aluno-ana-souza","disciplinaId":"disciplina-matematica","valor":7.8,"tipo":"trabalho"}'

# Login como aluno (Ana)
ALUNO_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana.souza@example.com","senha":"123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# Aluno: ver minhas disciplinas
curl http://localhost:3000/api/alunos/aluno-ana-souza/disciplinas -H "Authorization: Bearer $ALUNO_TOKEN"

# Aluno: ver minhas notas
curl http://localhost:3000/api/alunos/aluno-ana-souza/notas -H "Authorization: Bearer $ALUNO_TOKEN"

# Aluno: registrar um trabalho
curl -X POST http://localhost:3000/api/alunos/aluno-ana-souza/trabalhos \
  -H "Authorization: Bearer $ALUNO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disciplinaId":"disciplina-matematica","titulo":"Lista de Exercícios 2"}'
```

> Novos registros criados via API recebem ids no formato UUID (gerados com
> `crypto.randomUUID()`), diferente dos ids legíveis usados nos dados fake acima.

## Testes automatizados

### Estrutura

```
test/
  data/
    aluno.json                          # cenários de cadastro de aluno (admin)
    trabalho.json                       # cenários de entrega de trabalho (aluno)
  external/
    cadastrarAluno.test.js              # POST /api/admin/alunos — data-driven
    registrarEntregaTrabalho.test.js    # POST /api/alunos/{alunoId}/trabalhos — data-driven
    alunos.external.test.js
    login.external.test.js
    matricularAlunoDisciplina.test.js
    utils.js
  internal/
    login.test.js                       # usa o app em memória + Sinon (erro 500)
  helpers/
    api.js                              # cliente Supertest apontando para BASE_URL
    auth.js                             # helpers de login de Admin e de Aluno
  factories/
    alunosFactory.js
    disciplinasFactory.js
```

Os testes em `test/external/` chamam a API **em execução** pela URL definida em `BASE_URL`
(padrão `http://localhost:3000`). Por isso, a API precisa estar rodando antes de executar os
testes. Os testes em `test/internal/` importam o `app` diretamente e não dependem do servidor.

### Configuração (`.env`)

Copie o `.env.example` para `.env` e ajuste se necessário. Todas as variáveis são opcionais: sem
elas, os testes usam `http://localhost:3000` e as credenciais do seed (tabela de dados fake acima).

```bash
cp .env.example .env
```

| Variável      | Padrão                   | Uso                                            |
|---------------|--------------------------|------------------------------------------------|
| `BASE_URL`    | `http://localhost:3000`  | URL da API usada pelos testes externos         |
| `ADMIN_EMAIL` | `admin@escola.com`       | login do helper de administrador               |
| `ADMIN_SENHA` | `admin123`               | senha do helper de administrador               |
| `ALUNO_EMAIL` | `ana.souza@example.com`  | login do helper de aluno                       |
| `ALUNO_SENHA` | `123456`                 | senha do helper de aluno                       |

> O arquivo `.env` está no `.gitignore` e não deve ser versionado.

### Executando os testes

```bash
# 1. em um terminal, suba a API
npm start

# 2. em outro terminal, rode todos os testes
npx mocha          # ou: npm test
```

Também é possível rodar cada etapa separadamente (são os mesmos comandos usados na pipeline):

| Script                                   | O que executa                                              |
|------------------------------------------|------------------------------------------------------------|
| `npm test` / `npx mocha`                 | todos os testes, na ordem definida no `.mocharc.json`      |
| `npm run test:cadastrar-aluno`           | somente `cadastrarAluno.test.js`                           |
| `npm run test:registrar-entrega-trabalho`| somente `registrarEntregaTrabalho.test.js`                 |
| `npm run test:demais`                    | todos os outros testes, sem repetir os dois acima          |

O `.mocharc.json` define a ordem de execução: primeiro o **cadastro de aluno pelo admin**,
depois a **entrega de trabalho pelo aluno** e, por fim, os demais arquivos
(`test/**/*.test.js`). O Mocha ignora arquivos repetidos, então nenhum teste roda duas vezes. O
timeout de cada teste é de 10 segundos.

> Os scripts de arquivo único usam `--no-config`: caso contrário, o Mocha somaria o arquivo
> informado aos arquivos do `spec` do `.mocharc.json` e executaria a suíte inteira.

### Helpers de login (Admin e Aluno)

O arquivo [`test/helpers/auth.js`](test/helpers/auth.js) centraliza a autenticação:

| Helper                    | Retorno                                                   |
|---------------------------|-----------------------------------------------------------|
| `loginComoAdmin()`        | `{ token, usuario }` do administrador                     |
| `loginComoAluno()`        | `{ token, usuario }` do aluno                             |
| `comTokenDeAdmin()`       | `"Bearer <token>"` pronto para o header `Authorization`   |
| `comTokenDeAluno()`       | `"Bearer <token>"` pronto para o header `Authorization`   |
| `login(email, senha)`     | corpo completo da resposta de login                       |
| `getToken(email, senha)`  | apenas o token                                            |

As credenciais vêm do `.env` (ou dos valores padrão do seed). Se o login falhar, o helper lança
um erro dizendo qual usuário não conseguiu autenticar, em vez de seguir com um token vazio.

### Data-Driven Testing

Os testes de cadastro de aluno e de entrega de trabalho são **orientados a dados**: cada cenário
(dados enviados + resposta esperada) fica em um arquivo JSON em `test/data/`, e o teste gera um
`it` para cada cenário. Para incluir um novo caso, basta adicionar um objeto ao JSON — sem alterar
o código do teste.

Campos de cada cenário:

| Campo              | Descrição                                                                 |
|--------------------|---------------------------------------------------------------------------|
| `descricao`        | nome do teste exibido pelo Mocha                                          |
| `token`            | `admin`, `aluno`, `invalido` (token malformado) ou `ausente` (sem header) |
| `aluno`/`trabalho` | corpo enviado na requisição                                               |
| `alunoId`          | (somente trabalho) id da URL; `proprio` = id do aluno que fez login       |
| `statusEsperado`   | status HTTP esperado                                                      |
| `mensagemEsperada` | (cenários de falha) valor exato esperado em `body.error`                  |

#### Cadastrar aluno — `POST /api/admin/alunos` ([`test/data/aluno.json`](test/data/aluno.json))

O teste faz login como **admin** pelo helper e envia `{ nome, email, matricula, senha }`.

| Cenário                                               | Token      | Status |
|-------------------------------------------------------|------------|--------|
| Dados válidos                                         | admin      | 201    |
| Matrícula e e-mail já cadastrados                     | admin      | 409    |
| Matrícula já cadastrada                               | admin      | 409    |
| E-mail já cadastrado                                  | admin      | 409    |
| Sem `nome` / sem `email` / sem `matricula` / sem `senha` | admin   | 400    |
| Sem token                                             | ausente    | 401    |
| Token inválido                                        | invalido   | 401    |
| Aluno autenticado tentando cadastrar outro aluno      | aluno      | 403    |

No cenário de sucesso, o teste confere `id`, `nome`, `email`, `matricula`, `role: "aluno"` e que
a `senha` **não** é retornada. O e-mail e a matrícula recebem um sufixo único a cada execução,
para que o teste possa rodar várias vezes contra o mesmo servidor sem cair no 409.

#### Registrar entrega de trabalho — `POST /api/alunos/{alunoId}/trabalhos` ([`test/data/trabalho.json`](test/data/trabalho.json))

O teste faz login como **aluno** pelo helper e usa o `id` retornado no login como `alunoId`,
registrando a entrega em nome do próprio aluno. Corpo: `{ disciplinaId, titulo, descricao? }`.

| Cenário                                               | Token      | Status |
|-------------------------------------------------------|------------|--------|
| Entrega em disciplina em que o aluno está matriculado | aluno      | 201    |
| Entrega sem `descricao` (campo opcional)              | aluno      | 201    |
| Sem `titulo`                                          | aluno      | 400    |
| Sem `disciplinaId`                                    | aluno      | 400    |
| Sem token                                             | ausente    | 401    |
| Token inválido                                        | invalido   | 401    |
| Entrega em nome de outro aluno                        | aluno      | 403    |
| Disciplina inexistente                                | aluno      | 404    |
| Aluno não matriculado na disciplina                   | aluno      | 409    |

Nos cenários de sucesso, o teste confere `id`, `alunoId`, `disciplinaId`, `titulo`, `descricao`
(`null` quando não enviada), `status: "entregue"` e `nota`/`feedback` nulos.

### Pipeline (GitHub Actions)

O workflow [`.github/workflows/testes.yml`](.github/workflows/testes.yml) roda a cada `push`,
`pull_request` ou manualmente (`workflow_dispatch`), em `ubuntu-latest` com Node 24:

1. Faz checkout do código e instala as dependências com `npm ci`
2. Sobe a API em segundo plano (`npm start`) e aguarda `http://localhost:3000` responder
3. **Testes - Cadastrar novo aluno (admin)** → `npm run test:cadastrar-aluno`
4. **Testes - Registrar entrega de trabalho (aluno)** → `npm run test:registrar-entrega-trabalho`
5. Em caso de falha, exibe o log da API

As etapas são sequenciais: a entrega de trabalho só roda se o cadastro de aluno passar. A pipeline não precisa de `.env`
nem de secrets, pois usa os valores padrão (credenciais do seed).
