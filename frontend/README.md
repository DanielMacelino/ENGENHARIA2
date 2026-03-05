# Sistema de Agendamento - Posto de Saúde IFCE (Frontend)

Este é o frontend puramente visual e estático para o **Sistema de Agendamento do Posto de Saúde do IFCE - Campus Crato**.

O projeto utiliza **Node.js/Express.js** estritamente para servir as páginas, garantindo que tudo funcione com **HTML, CSS e JavaScript puros (Vanilla JS)**, sem frameworks complexos.

O código foi preparado de forma didática com chamadas `fetch()` falsas (mocks) para que desenvolvedores iniciantes ou futuros consigam facilmente plugar um Banco de Dados e Backend reais.

## Como rodar o sistema localmente

1. Tenha o **Node.js** instalado na sua máquina.
2. Acesse a pasta `frontend` pelo seu terminal.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Suba o servidor:
   ```bash
   npm start
   ```
5. Acesse no navegador: `http://localhost:8080`

## Perfis e Navegação

O sistema foi estruturado para dois tipos de usuário fictícios durante o login:

- **Login "aluno@ifce.br"**: Redireciona para o fluxo do Aluno (`/aluno/dashboard` e `/aluno/agendamentos`), onde é possível visualizar a grade de profissionais da semana e buscar/marcar horários.
- **Outro Email (Profissional)**: Redireciona para o fluxo Médico/Dentista (`/profissional/disponibilidade`), onde exibe o calendário e os blocos de horário onde ele atua.

## Rotas Mapeadas (Apenas Simulações)

As seguintes rotas da API foram deixadas documentadas em comentários ao longo do arquivo `public/script.js`:

* `POST /login` -> Recebe email/senha e devolve um token (e o tipo do usuário).
* `GET /agendamentos/usuario/:id` -> Retorna os agendamentos marcados para a tabela do Aluno.
* `GET /profissionais/horarios` -> Pesquisa os profissionais e a grade de horários deles para o Aluno marcar.
* `POST /agendamentos` -> Efetiva o agendamento de uma consulta (Aluno).
* `POST /disponibilidade` -> Salva a agenda de dias e horários selecionados (Profissional).

## Como Integrar Oficialmente

1. Modifique o arquivo `config.js` substituindo a URL em `config.API_BASE_URL` para o endereço do seu backend real.
2. Abra o arquivo `public/script.js`.
3. Procure pelos comentários escritos explicitamente como: `// IMPLEMENTAÇÃO REAL FUTURA`.
4. Descomente a função `fetch` respectiva, removendo os `setTimeout` e mocks que estão lá apenas para finalidade de testes visuais.
