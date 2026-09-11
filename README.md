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
**LinkedIn:** adicione aqui o link do seu perfil

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

Requisitos: Node.js 20 ou superior.

```bash
npm start
```

Acesse <http://localhost:3000>. A mesma aplicação serve a interface e os endpoints REST. Os principais endpoints são `GET /api/posts`, `POST /api/posts`, `POST /api/posts/:id/comments`, `POST /api/posts/:id/ratings` e `POST /api/auth/login`.

Para testar o login de demonstração, use o usuário `pedrolima` e qualquer senha não vazia. A integração SUAP deve substituir esse fluxo em ambiente de produção, conforme a documentação oficial indicada em [atividade.md](atividade.md).

**Vídeo:** adicione aqui o link do vídeo publicado no GitHub.

---
