# Explora Mundo · Dashboard

Painel de desempenho orgânico do Instagram, Facebook e YouTube e de mídia paga no YouTube. A interface consulta `/api/metrics` ao abrir e a cada cinco minutos. Cada fonte mostra se está ao vivo ou se exibe o último retrato verificado em 18/10/2026.

## Desenvolvimento

```bash
npm install
npm run dev
```

`npm run build` gera a interface em `dist/`. A pasta `api/` contém a Function do Vercel.

## Conexões

Configure as variáveis de `.env.example` no projeto do Vercel. Use um cliente OAuth do Google com acesso ao YouTube Analytics e Google Ads. Para o Ads, o projeto do Google Cloud precisa de um nível de acesso à API de produção; tokens de desenvolvedor deixaram de ser exigidos em setembro de 2026. Publique a tela de consentimento OAuth antes de gerar o refresh token: no modo de teste externo, ele expira em sete dias. Use um token de acesso da Meta com permissão para ler Insights e os IDs da conta profissional do Instagram e da página do Facebook. Tokens e segredos não devem ser enviados para o GitHub.

O painel pode funcionar com fontes conectadas individualmente. Quando uma consulta falha ou falta autorização, somente aquela fonte volta ao retrato histórico, com identificação visível. O retrato do Google Ads tem uma janela diferente das demais fontes, informada na interface.

## Fontes e definições

- YouTube orgânico e pago: YouTube Analytics, tráfego de publicidade (`ADVERTISING`) separado dos demais tipos de origem. Views do Studio não são equivalentes a TrueView do Google Ads.
- YouTube Ads: Google Ads API, campanhas de vídeo da conta configurada; custo, impressões, cliques e visualizações de vídeo.
- Instagram e Facebook: Meta Graph API, Insights diários da conta profissional e da página.

As três integrações exigem autorização da conta proprietária. Nenhuma credencial é incluída neste repositório.
