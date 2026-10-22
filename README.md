# Salas de Chat e Chamadas

Chat por ID de sala, voz e transmissão de tela em 1080p60, hospedado no GitHub Pages.

## 1. Supabase
1. Crie um projeto em supabase.com.
2. Abra SQL Editor, cole `supabase/schema.sql` e execute.
3. Em Project Settings > API, copie a URL e a chave `anon public`.

## 2. LiveKit
1. Crie um projeto em livekit.io (Cloud).
2. Copie a URL `wss://...` e a API Key e API Secret.

## 3. Worker de token
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put LK_KEY
npx wrangler secret put LK_SECRET
npx wrangler deploy
```
Anote a URL gerada (`https://salas-token.SEU-USUARIO.workers.dev`).
Em `wrangler.toml`, ajuste `ALLOWED_ORIGINS` para o seu domínio do Pages.

## 4. Configurar o frontend
Edite `js/config.js` com as URLs e a chave anônima. Não coloque a API Secret do LiveKit aqui.

## 5. Publicar no GitHub Pages
1. Crie um repositório e envie todos os arquivos da raiz do projeto (não envie a pasta `worker/` se preferir mantê-la separada; ela não é servida pelo Pages).
2. Em Settings > Pages, escolha Deploy from a branch, branch `main`, pasta `/ (root)`.
3. Acesse `https://SEU-USUARIO.github.io/NOME-DO-REPO/?sala=123`.

## Testes
- Abra a página em duas janelas do Chrome com IDs de sala iguais.
- Confira o painel "Tela" após compartilhar: deve mostrar 1920×1080 a 60 fps.
- Para 1080p60 é preciso upload de pelo menos 8 Mbps e encoder por hardware.