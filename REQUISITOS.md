# 🩺 Sistema de Agendamento - Posto de Saúde (IFCE - Campus Crato)
### 📑 Seminário Eng. Software 2 - Mapeamento de Requisitos da API

Para facilitar a apresentação, este documento mapeia cada requisito obrigatório do projeto diretamente para sua implementação no código, incluindo trechos de exemplo.

---

## 🔑 A. Autenticação e Login (`POST /logar`)
Implementa o mecanismo de geração de Tokens JWT para acesso seguro.

| Arquivo | Trecho Implicado |
| :--- | :--- |
| `backend/src/routes/userRoutes.js:L9` | `router.post("/logar", Controller.login);` |
| `backend/userController.js:L31` | Função `login` que valida `usuarios` mockados e retorna o token. |

**Exemplo de Lógica:**
```javascript
const token = jwt.sign(
    { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
    JWT_SECRET, { expiresIn: "1h" }
);
return res.json({ token, tipo_usuario: usuario.tipo_usuario });
```

---

## 📋 B. & C. Gerenciamento de Itens (`GET` / `POST` /itens)
Controle completo de serviços/itens do sistema utilizando o tema de "Agendamentos".

- **Listar Itens (GET):** Retorna o array global `itens`.
- **Inserir Item (POST):** Adiciona dinamicamente um novo objeto ao array.

**Localização:** `backend/userController.js` (Funções `getItens` e `criarItem`).

---

## 🗑️ D. & F. Operações de Exclusão e Pesquisa (`DELETE` / `GET`)
Manipulação e busca de informações por ID ou Código Identificador.

> **Regra de Negócio:** Pode excluir tanto por ID decimal quanto por Código (ex: `CC001`).

| Requisito | Rota | Controller (Código) |
| :--- | :--- | :--- |
| **Exclusão** | `DELETE /itens/:id` | `itens.splice(index, 1);` |
| **Pesquisa** | `GET /itens/:codigo` | `itens.find(i => i.codigo === codigo || i.id === codigo);` |

---

## 🛡️ D. Middleware de Horário Comercial (Segunda a Sexta)
Garante que a API só aceite requisições em dias de trabalho.

**Arquivo:** `backend/src/middlewares/appMiddleware.js:L10`
```javascript
export const workingDaysOnly = (req, res, next) => {
    const day = new Date().getDay(); 
    if (day === 0 || day === 6) { // 0=Domingo, 6=Sábado
        return res.status(403).json({ error: "Acesso disponível apenas de segunda a sexta-feira." });
    }
    next();
};
```

---

## ✍️ E. & F. Registro de Auditoria (Logs por Data)
Sistema que registra cada movimento na API para fins de auditoria detalhada.

- **E (Registro):** Captura horário, método e rota em cada requisição (`logRequest`).
- **F (Listagem):** Rota `GET /logs/:data` (ex: `/logs/2026-03-24`) retorna as atividades do dia.

**Onde Ver:** `backend/userController.js` (Array `logsRequisicoes` L21).

---

## 📄 G. Geração de Relatório PDF (`GET /relatorio`)
Gera dinamicamente um documento PDF com a lista técnica de itens cadastrados.

**Biblioteca:** `pdfkit`
**Arquivo:** `backend/userController.js:L102`

```javascript
export const gerarPDF = (req, res) => {
    const doc = new PDFDocument();
    // Preenche cabeçalho e dados dos itens...
    doc.pipe(res);
    doc.end();
};
```

---

## 📦 H. & I. & J. Estrutura e Deploy
- **H (Mocks):** Todos os dados estão no `backend/userController.js` em arrays globais (Sem necessidade de BD externo para teste).
- **I (GitHub):** Repositório `https://github.com/DanielMacelino/ENGENHARIA2`.
- **J (Cloud):** Configurado para **Vercel** via `ENGENHARIA2/vercel.json`.

---
*Apresentado por Daniel Macelino - Eng. Software 2026*
