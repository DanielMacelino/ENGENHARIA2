# Sistema de Agendamento de Consultas (BACKEND) #

Este é o backend para o **Sistema de Agendamento do Posto de Saúde do IFCE - Campus Crato**.

O projeto utiliza a plataforma **SUPABASE**, a qual roda Postgres.

O código foi preparado de forma didática para que desenvolvedores iniciantes consigam facilmente plugar Banco de Dados e Backend reais.

## Passo a Passo Inicial

1. Instalar o SDK do Supabase
    ```bash
    npm install @supabase/supabase-js dotenv
    ```
2. Criar o arquivo `.env`[add ao .gitignore]
    (guardar credenciais de forma segura)
    > URL e a Anon Key no painel do Supabase (Project Settings > API). 
    ```bash
    SUPABASE_URL = https://xxxxx.supabase.co
    SUPABASE_KEY = xxxxxxxxxxxx
    ```
3. Estruturar o projeto
    📦 
    src
    ├── config
    │   └── supabaseClient.js
    ├── controllers
    │   └── userController.js
    ├── services
    │   └── userService.js
    ├── routes
    │   └── userRoutes.js
    └──  server.js


## Perfis e Navegação

O sistema foi estruturado para dois tipos de usuário fictícios durante o login:
- **Login "aluno@ifce.br"**: Redireciona para o fluxo do Aluno (`/aluno/dashboard` e `/aluno/agendamentos`), onde é possível visualizar a grade de profissionais da semana e buscar/marcar horários.
- **Outro Email (Profissional)**: Redireciona para o fluxo Médico/Dentista (`/profissional/disponibilidade`), onde exibe o calendário e os blocos de horário onde ele atua.

## Rotas Mapeadas (Apenas Simulações)

As seguintes rotas da API serão documentadas em comentários ao longo do arquivo `src/controllers/userController.js`:

* `POST /login` -> Recebe email/senha e devolve um token (e o tipo do usuário).
* `GET /agendamentos/usuario/:id` -> Retorna os agendamentos marcados para a tabela do Aluno.
* `GET /profissionais/horarios` -> Pesquisa os profissionais e a grade de horários deles para o Aluno marcar.
* `POST /agendamentos` -> Efetiva o agendamento de uma consulta (Aluno).
* `POST /disponibilidade` -> Salva a agenda de dias e horários selecionados (Profissional).



