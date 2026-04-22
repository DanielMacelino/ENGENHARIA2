# Sistema de Agendamento de Consultas (BACKEND)

Este é o backend para o **Sistema de Agendamento do Posto de Saúde do IFCE - Campus Crato**.
O projeto utiliza Node.js, Express, Supabase (PostgreSQL) e implementa as seguintes funcionalidades:
- Cadastro e Autenticação de Usuários com JWT e senha criptografada (crypto)
- 2FA (Segundo Fator de Autenticação)
- Gerenciamento de Itens (com upload de imagens via multer)
- Cálculo de distâncias entre coordenadas (Haversine)
- Agendamento de Consultas
- Testes automatizados com JEST e Supertest

## Configuração Inicial

1. Instalar as dependências:
```bash
npm install
```

2. Crie um arquivo `.env` na pasta `backend` com as credenciais:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxxxxxxxxx
```

3. Rodar o projeto em desenvolvimento:
```bash
npm run dev
```

4. Rodar testes automatizados:
```bash
npm run test
```

## Documentação da API

### Autenticação & Usuários

* **`POST /api/cadastro`**
  * **Descrição:** Cria um novo usuário.
  * **Body:** `{ "nome": "...", "email": "...", "senha": "...", "tipo_usuario": "aluno" }`

* **`POST /api/login`**
  * **Descrição:** Realiza o login (Requisito F) e dispara o envio do código de 2FA (Requisito H).
  * **Body:** `{ "email": "...", "senha": "..." }`
  * **Retorno:** `{ "requires_2fa": true, "email": "...", "message": "..." }`

* **`POST /api/login/verify`**
  * **Descrição:** Verifica o código 2FA e retorna o token JWT.
  * **Body:** `{ "email": "...", "codigo": "123456" }`
  * **Retorno:** `{ "token": "...", "id": "...", "tipo_usuario": "...", "email": "..." }`

### Agendamentos (Profissionais e Alunos)

* **`GET /api/profissionais/horarios`**
  * **Descrição:** Retorna a grade de horários dos profissionais.
  * **Query Params:** `?especialidade=Geral` (opcional)

* **`POST /api/disponibilidade`**
  * **Descrição:** Salva ou atualiza a agenda de um profissional.
  * **Body:** `{ "profissional_id": 1, "dia_semana": "Segunda-feira", "horarios": ["08:00", "09:00"] }`

* **`POST /api/agendamentos`**
  * **Descrição:** Cria um novo agendamento.
  * **Body:** `{ "usuario_id": 1, "profissional_id": 2, "data": "2024-05-10", "hora": "08:00", "especialidade": "Geral" }`

* **`PUT /api/agendamentos/:id/status`**
  * **Descrição:** Atualiza o status do agendamento (Ex: Confirmado, Cancelado). (Requisito C).
  * **Body:** `{ "status": "Confirmado" }`

* **`GET /api/agendamentos/usuario/:usuario_id`**
  * **Descrição:** Retorna os agendamentos marcados pelo aluno.

* **`GET /api/agendamentos/profissional/:profissional_id`**
  * **Descrição:** Retorna os pacientes agendados para atender hoje.

### Gerenciamento de Itens e Imagens

* **`GET /api/itens`** - Retorna todos os itens cadastrados.
* **`POST /api/itens`** - Cria um novo item (nome, codigo, descricao).
* **`DELETE /api/itens/:id`** - Remove um item do banco.
* **`POST /api/upload`**
  * **Descrição:** Realiza o upload de uma imagem do item localmente (Preparado para Supabase Storage) (Requisito B).
  * **Form-Data:** `{ "imagem": <Arquivo de Imagem> }`
  * **Retorno:** `{ "url": "/uploads/nome-do-arquivo.png" }`

### Ferramentas (Distância e Relatórios)

* **`POST /api/distancia`**
  * **Descrição:** Calcula a distância em KM entre duas coordenadas geográficas (Requisito I).
  * **Body:** `{ "lat1": -7.2345, "lon1": -39.4123, "lat2": -7.2389, "lon2": -39.4167 }`
  * **Retorno:** `{ "distancia_km": 0.69 }`

* **`GET /api/relatorio`**
  * **Descrição:** Retorna um PDF com o relatório de itens.

* **`GET /api/logs/:data`**
  * **Descrição:** Retorna os logs de uma determinada data.
