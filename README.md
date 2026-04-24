# 🏥 Sistema de Agendamento - Posto de Saúde (IFCE Campus Crato)

Este projeto é uma solução completa para a gestão de atendimentos na enfermaria do IFCE Campus Crato, integrando perfis de Aluno, Profissional de Saúde e Gestão.

---

## 🛠️ Tecnologias Utilizadas
- **Frontend**: HTML5, Vanilla CSS3 (Design Premium com Micro-animações), JavaScript (ES6+).
- **Backend**: Node.js com Express.
- **Banco de Dados**: Supabase (PostgreSQL) com integração via `@supabase/supabase-js`.
- **Segurança**: 
  - JWT (JSON Web Tokens) para controle de sessão.
  - Criptografia PBKDF2 com Salt para armazenamento de senhas.
  - **MFA (2FA)**: Autenticação em dois fatores simulada via e-mail.
  - **CORS Restrito**: Configurado para aceitar apenas requisições da mesma origem.

---

## 📈 Funcionalidades Principais

### 👤 Perfil Aluno
- **Dashboard de Agendamentos**: Visualização em tempo real do status das consultas.
- **Novo Agendamento**: Interface intuitiva para marcação de consultas por especialidade.
- **Mapa e Distância**: Cálculo de distância (Haversine) entre o aluno e o campus via Leaflet.

### 🩺 Perfil Profissional & Gestão
- **Agenda Diária**: Controle de pacientes atendidos, confirmados e pendentes.
- **Gestão de Inventário**: Controle de estoque com upload de imagens para a nuvem.
- **Dashboard de Estatísticas**:
  - Gráfico de Tendência Mensal (Volume de atendimentos).
  - Distribuição de Demanda por Especialidade.
  - Alerta de Estoque Crítico e Valor Patrimonial.
- **Logs de Auditoria**: Registro completo de ações no sistema para segurança e transparência.

---

## 📑 Documentação da API (REST)

### Autenticação
- `POST /api/cadastro`: Cadastra novos usuários.
- `POST /api/login`: Gera pré-autenticação e envia código 2FA.
- `POST /api/login/verify`: Valida código 2FA e retorna o Token JWT.

### Agendamentos
- `GET /api/agendamentos/usuario/:id`: Lista histórico do aluno.
- `GET /api/agendamentos/profissional/:id`: Lista agenda do profissional.
- `POST /api/agendamentos`: Cria uma nova solicitação.
- `PUT /api/agendamentos/:id/status`: **(PUT)** Atualiza o status (Confirmado/Cancelado/Atendido).

### Gestão & Inventário
- `GET /api/itens`: Lista todos os itens.
- `POST /api/itens`: Cadastra item com foto (Cloud Storage).
- `GET /api/estatisticas`: Retorna dados analíticos para os gráficos.
- `GET /api/logs`: Lista logs de auditoria do sistema.

---

## 🧪 Testes Automatizados
O sistema utiliza **Jest** e **Supertest** para garantir a integridade das rotas.
Para rodar os testes:
```bash
npm install
npm test
```

---

## ⚙️ Configuração do Ambiente
1. Clone o repositório.
2. Crie um arquivo `.env` na raiz com:
   ```env
   SUPABASE_URL=seu_url
   SUPABASE_KEY=seu_service_role_key
   ```
3. Execute `npm install` e `npm run dev`.
