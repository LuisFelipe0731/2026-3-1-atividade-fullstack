# 2026.3.1 - POS - Frondend web e Backend api restfull

## Informações gerais

- **Público alvo**: alunos da disciplina de **Programação orientada a serviços** do curso de [Infoweb](https://diatinf.ifrn.edu.br/cursos/tecnico-em-informatica-para-internet/) na [DIATINF](https://diatinf.ifrn.edu.br/) no [CNAT-IFRN](https://portal.ifrn.edu.br/campus/natalcentral/)
- **Professor**: [L A Minora](https://github.com/leonardo-minora/)
- **Objetivo**:
  1. Atividade avaliativa para construção de aplicativo com frontend web e backend api restfull

[A descrição da atividade](atividade.md)

---
## Relato da atividade
**Aluno:** Luís Felipe  
**GitHub:** [LuisFelipe0731](https://github.com/LuisFelipe0731)  

### Componentes e tecnologias

- **Frontend:** HTML semântico, CSS responsivo mobile-first e JavaScript moderno;
- **Backend:** Node.js com o módulo HTTP nativo, organizado como API REST;
- **Persistência planejada:** PostgreSQL via variável `DATABASE_URL` para a próxima etapa de produção; a demonstração local usa dados em memória para poder ser executada sem infraestrutura adicional;
- **Hospedagem:** o frontend pode ser publicado na Vercel/Netlify e a API em um serviço Node compatível.
- **Identidade visual:** azul-marinho `#0C3453`, laranja `#CE701B` / `#F1881D`, amarelo `#FDC616`, creme `#F9EBC2` e azul-claro `#A4BCCC`.

O protótipo foi baseado em [diatinf-x.jpg](diatinf-x.jpg), adaptando a navegação para telas pequenas e mantendo uma coluna de contexto em telas maiores.

### Agente de IA

O GitHub Copilot foi utilizado como agente de pair programming para estruturar a API, criar a interface mobile-first, revisar o contrato entre frontend e backend e executar as validações locais. As decisões de produto e a revisão final do código continuam sendo responsabilidade do aluno.


### Execução do projeto

Requisitos: Node.js 20 ou superior e PostgreSQL 14 ou superior.

```bash
npm install
npm run db:start
npm run start:local
```

Acesse <http://localhost:3000>. A API executa automaticamente o schema em [api/schema.sql](api/schema.sql) e cria dados iniciais quando o banco está vazio. O modelo usa PostgreSQL para usuários, posts, comentários e avaliações; não há SQLite nem armazenamento de posts em memória. Consulte [.env.example](.env.example) para o formato da conexão.

Para parar o banco depois do uso, execute `npm run db:stop`. Em outro ambiente, defina `DATABASE_URL` e use `npm start`.

A mesma aplicação serve a interface e os endpoints REST. O feed (`GET /api/posts`) é público. Publicação, comentários e avaliações exigem `Authorization: Bearer <token>` obtido em `POST /api/auth/login`.

Para testar o login de demonstração, use o usuário `pedrolima` e a senha `demo`. A integração SUAP deve substituir esse fluxo em ambiente de produção, conforme a documentação oficial indicada em [atividade.md](atividade.md).

**Vídeo:** https://drive.google.com/file/d/1Ajsl2EfPwL5W9azQUVgLtbnp9xCk8x7X/view?usp=sharing

---
