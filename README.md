# Explora Mundo · Dashboard

Painel de desempenho orgânico do Instagram, Facebook e YouTube e de mídia paga no YouTube. A interface consulta `/api/metrics` ao abrir e a cada cinco minutos. Cada fonte mostra se está ao vivo ou se exibe o último retrato verificado em 18/10/2026.

O filtro permite períodos rápidos de 7, 28 e 90 dias ou datas inicial e final escolhidas no calendário. A API aceita `?from=AAAA-MM-DD&to=AAAA-MM-DD` (datas inclusivas, até ontem, no máximo 90 dias). O cartão de inscritos do YouTube mostra o total atual do canal e os inscritos ganhos no período.

## Desenvolvimento

```bash
npm install
npm run dev
```

`npm run build` gera a interface em `dist/`. A pasta `api/` contém a Function do Vercel.

## Conexões

Configure as variáveis de `.env.example` no projeto do Vercel. O cliente OAuth do Google precisa dos escopos `yt-analytics.readonly`, `youtube.readonly` e `adwords`, com YouTube Analytics, YouTube Data API v3 e Google Ads API ativadas no projeto Cloud. Para o Ads, o projeto precisa de acesso à API de produção. Publique a tela de consentimento OAuth antes de gerar o refresh token: no modo de teste externo, ele expira em sete dias. Use um token de acesso da Meta com permissão para ler Insights e os IDs da conta profissional do Instagram e da página do Facebook. Tokens e segredos não devem ser enviados para o GitHub.

O painel pode funcionar com fontes conectadas individualmente. Quando uma consulta falha ou falta autorização, somente aquela fonte volta ao retrato histórico, com identificação visível. O retrato do Google Ads tem uma janela diferente das demais fontes, informada na interface.

## Fontes e definições

- YouTube orgânico e pago: YouTube Analytics, tráfego de publicidade (`ADVERTISING`) separado dos demais tipos de origem. Inscritos ganhos, curtidas, horas e métricas por vídeo vêm do Analytics. O relatório de inscritos é consultado por dia para indicar a última data processada. O Analytics costuma fechar os dias recentes com 48–72 horas de atraso; nesses casos o cartão mostra “Ganhos parciais” e o período efetivo da fonte termina na última data disponível. Total atual de inscritos e metadados dos vídeos vêm da YouTube Data API; a contagem pública de inscritos é arredondada para três algarismos significativos. A tabela por vídeo inclui tráfego total. Views do Studio não são equivalentes a TrueView do Google Ads.
- YouTube Ads: Google Ads API, campanhas de vídeo da conta configurada; custo, impressões, cliques, visualizações TrueView e a conversão `YouTube channel subscriptions`. Custo por inscrito usa investimento dividido pelas inscrições atribuídas pelo Ads, que podem diferir dos inscritos ganhos no Studio.
- Instagram: Meta Graph API, Insights da conta profissional, seguidores atuais e curtidas/comentários atuais de publicações feitas no período selecionado. Esses totais das publicações são acumulados até a consulta, não interações ocorridas somente no período.
- Facebook: Meta Graph API, Insights diários da Página, reações “curtir” em posts e totais atuais de seguidores e curtidas da Página.

As três integrações exigem autorização da conta proprietária. Nenhuma credencial é incluída neste repositório.
