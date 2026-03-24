# 🩺 Sistema de Agendamento - Posto de Saúde (IFCE - Campus Crato)
### 📑 Seminário Eng. Software 2 - Mapeamento de Requisitos da API

Para facilitar a apresentação, este documento mapeia cada requisito obrigatório do projeto diretamente para sua implementação no código, com os trechos exatos e números de linha.

---

## 🔑 A. Autenticação e Login (`POST /logar`)
Implementa o mecanismo de geração de Tokens JWT para acesso seguro.

- **Rota:** `backend/src/routes/userRoutes.js:L10`
- **Código:** `backend/userController.js:L40-L60`

```javascript
// Exemplo de lógica aplicada (L53-L57):
const token = jwt.sign(
    { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
    JWT_SECRET,
    { expiresIn: "1h" }
);
```

---

## 📋 B. & C. Gerenciamento de Itens (`GET` / `POST` /itens)
Lista e insere novos itens no sistema.

- **Listar Itens (B):** `backend/userController.js:L62`
- **Inserir Item (C):** `backend/userController.js:L67`

```javascript
// Exemplo de lógica aplicada (L72-L73):
const novo = { id: String(itens.length + 1), nome, codigo, descricao };
itens.push(novo);
```

---

## 🗑️ D. Rota para Excluir um Item (`DELETE /itens/:id`)
Utiliza o banco de dados Supabase para remoção lógica ou física.

- **Rota:** `backend/src/routes/userRoutes.js:L20`
- **Código:** `backend/userController.js:L78-L83`

```javascript
// Exemplo de lógica aplicada (L80):
const { error } = await supabase.from("itens").delete().eq("id", id);
```

---

## 🔍 F. Pesquisar Item pelo Código (`GET /itens/:codigo`)
Busca detalhada utilizando filtros do Supabase.

- **Rota:** `backend/src/routes/userRoutes.js:L21`
- **Código:** `backend/userController.js:L86-L95`

```javascript
// Exemplo de lógica aplicada (L88-L90):
let query = supabase.from("itens").select("*");
if (codigo) query = query.eq("codigo", codigo);
const { data, error } = await query;
```

---

## 🛡️ D (Bis). Middleware de Horário Comercial
Garante acessos apenas de segunda a sexta.

- **Implementação:** `backend/src/middlewares/appMiddleware.js:L12`

```javascript
// Exemplo de lógica aplicada (L14):
if (day === 0 || day === 6) {
    return res.status(403).json({ error: "Acesso disponível apenas de segunda a sexta-feira." });
}
```

---

## ✍️ E. & F (Bis). Registro e Pesquisa de Auditoria (Logs)
Registra cada requisição e permite busca por data.

- **Registro (E):** `backend/src/middlewares/appMiddleware.js:L4`
- **Pesquisa por Data (F):** `backend/userController.js:L98`

```javascript
// Exemplo de Registro (L29-L35):
logsRequisicoes.push({
    data: agora.toISOString().split('T')[0],
    horario: agora.toLocaleTimeString(),
    metodo, rota
});
```

---

## 📄 G. Geração de Relatório PDF (`GET /relatorio`)
Gera um arquivo PDF para download para o usuário.

- **Rota:** `backend/src/routes/userRoutes.js:L30`
- **Código:** `backend/userController.js:L111-L118`

```javascript
// Exemplo de lógica aplicada (L116):
doc.fontSize(20).text("Relatório de Itens", { align: 'center' });
doc.end();
```

---

## 📦 H. & I. & J. Estrutura e Deploy
- **H (Mocks):** Dados base definidos em `backend/userController.js:L7` e `L14`.
- **I (GitHub):** Versionamento em `https://github.com/DanielMacelino/ENGENHARIA2`.
- **J (Nuvem):** Configuração de deploy em `ENGENHARIA2/vercel.json`.

---
*Apresentado por Daniel Macelino - Eng. Software 2 - 2026*
