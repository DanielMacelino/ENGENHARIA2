# Sistema de Agendamento - Posto de Saúde (IFCE Campus Crato)

Este projeto é um sistema de agendamento de consultas para a enfermaria do IFCE Campus Crato, integrando perfis de Aluno e Profissional de Saúde.

## Arquitetura
- **Frontend**: HTML5, Vanilla CSS, JavaScript.
- **Backend**: Node.js com Express.
- **Banco de Dados**: Supabase (PostgreSQL).
- **Segurança**: JWT para sessões e Criptografia PBKDF2 para senhas.

## Requisitos Implementados
- [x] **Centralização**: Sidebar dinâmica carregada via script único.
- [x] **Criptografia**: Senhas salvas com Hash + Salt (Node Crypto).
- [x] **CORS**: Restrito para acesso apenas do servidor local.
- [x] **Mapas**: Integração com Leaflet + Cálculo de Distância (Haversine).
- [x] **Segurança**: Proteção de rotas baseada em prefixos (`/aluno`, `/profissional`).

## Documentação da API (Endpoints)

### Autenticação
- `POST /api/cadastro`: Realiza o cadastro de novos usuários.
    - Body: `{ nome, email, senha, tipo_usuario }`
- `POST /api/login`: Autentica usuários e retorna Token JWT.
    - Body: `{ email, senha }`

### Inventário (Privado: Profissional)
- `GET /api/itens`: Lista todo o estoque.
- `POST /api/itens`: Cadastra novo item.
- `DELETE /api/itens/:id`: Remove item do estoque.

### Agendamentos
- `GET /api/agendamentos/usuario/:id`: Lista agendamentos de um aluno.
- `GET /api/agendamentos/profissional/:id`: Lista pacientes do dia para o profissional.
- `POST /api/agendamentos`: Cria nova solicitação de consulta.
- `PUT /api/agendamentos/:id/status`: Atualiza o status (Confirmado, Atendido, etc).
