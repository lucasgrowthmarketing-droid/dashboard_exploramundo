import './style.css';

const snapshot = {
  data: {
    instagram: { views: 2827, interactions: 244, followers: 25, reach: 1581 },
    facebook: { views: 270, interactions: 6, followers: 0, reach: 200 },
    youtube: { views: 1638, watchHours: 14.4, paidViews: 123018 },
    ads: { spend: 1094.31, impressions: 182520, views: 31977, clicks: 2026, campaigns: [
      { name: 'O que vai virar', views: 21095, spend: 752.92 },
      { name: '2 vídeos + 3 shorts', views: 7415, spend: 214.84 },
      { name: 'Como se forma um arco-íris', views: 3467, spend: 126.55 }
    ] }
  },
  status: {
    instagram: { state: 'snapshot', period: '20 set – 17 out 2026' },
    facebook: { state: 'snapshot', period: '20 set – 17 out 2026' },
    youtube: { state: 'snapshot', period: '20 set – 17 out 2026' },
    ads: { state: 'snapshot', period: '8–17 out 2026' }
  },
  updatedAt: null
};

const links = {
  instagram: 'https://business.facebook.com/latest/insights/overview?business_id=3409993882514924&asset_id=1342627422257090&platform=Instagram',
  facebook: 'https://business.facebook.com/latest/insights/overview?business_id=3409993882514924&asset_id=1342627422257090&platform=Facebook',
  youtube: 'https://studio.youtube.com/channel/UC317OcRhcw3g54WanVKFS4Q/analytics',
  ads: 'https://ads.google.com/aw/campaigns?ocid=8591712937&workspaceId=0&euid=625647548&__u=2652908252&uscid=8591712937&__c=2404068513&authuser=0'
};

let state = snapshot;
let days = 28;
let activeNetwork = 'instagram';
let loading = false;

const fmt = value => value == null ? '—' : new Intl.NumberFormat('pt-BR').format(value);
const money = value => value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);
const short = value => value >= 1000000 ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value / 1000000)} mi` : value >= 10000 ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value / 1000)} mil` : fmt(value);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const status = name => `<span class="source-state ${state.status[name].state}"><i></i>${state.status[name].state === 'live' ? 'Ao vivo' : 'Histórico'}</span>`;
const period = name => esc(state.status[name].period);
const external = name => `<a class="source-arrow" href="${links[name]}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${name} na plataforma">↗</a>`;

function metric(label, value, note, color = 'purple') {
  return `<article class="metric-card ${color}"><div class="metric-card-top"><span>${label}</span><span class="metric-spark" aria-hidden="true">✦</span></div><strong>${value}</strong><small>${note}</small></article>`;
}

function lineChart(series, key, color) {
  if (!series?.length) return `<div class="empty-chart"><div class="empty-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>Curva disponível após conectar a fonte</span></div>`;
  const width = 650, height = 195, padding = 10;
  const max = Math.max(...series.map(point => Number(point[key] ?? point.value) || 0), 1);
  const points = series.map((point, index) => {
    const x = padding + index * (width - padding * 2) / Math.max(series.length - 1, 1);
    const y = height - padding - ((Number(point[key] ?? point.value) || 0) / max) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const first = points[0]?.split(',')[0] || padding;
  const last = points.at(-1)?.split(',')[0] || width - padding;
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Evolução diária"><defs><linearGradient id="area-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".24"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M ${points.join(' L ')} L ${last},${height} L ${first},${height} Z" fill="url(#area-${key})"/><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="chart-axis"><span>${esc(series[0]?.day?.slice(5) || '')}</span><span>${esc(series.at(-1)?.day?.slice(5) || '')}</span></div></div>`;
}

function render() {
  const d = state.data;
  const o = d[activeNetwork];
  const organicViews = d.instagram.views + d.facebook.views + d.youtube.views;
  const organicStatuses = ['instagram', 'facebook', 'youtube'].map(key => state.status[key]);
  const comparableOrganic = organicStatuses.every(item => item.state === 'live') || organicStatuses.every(item => item.state === 'snapshot');
  const comparableFollowers = state.status.instagram.state === state.status.facebook.state;
  const totalConnections = Object.values(state.status).filter(item => item.state === 'live').length;
  const organicBars = [
    ['Instagram', d.instagram.views, 'instagram'],
    ['YouTube', d.youtube.views, 'youtube'],
    ['Facebook', d.facebook.views, 'facebook']
  ];
  const maxOrganic = Math.max(...organicBars.map(item => item[1]), 1);
  const campaigns = d.ads.campaigns || [];
  const maxCampaign = Math.max(...campaigns.map(item => item.views), 1);
  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#visao" aria-label="Explora Mundo, início"><img src="/logo.png" alt="Explora Mundo"/><span>Explora<br/>Mundo<small>analytics</small></span></a>
        <nav aria-label="Seções"><a class="nav-link active" href="#visao"><b>◉</b><span>Visão geral</span></a><a class="nav-link" href="#organico"><b>✳</b><span>Orgânico</span></a><a class="nav-link" href="#pago"><b>▶</b><span>Pago</span></a></nav>
        <div class="sidebar-bottom"><div class="orb">✦</div><b>${totalConnections}/4 fontes</b><span>conectadas à API</span></div>
      </aside>
      <main id="visao">
        <header class="topbar"><div class="top-title"><span class="eyebrow">PAINEL DE RESULTADOS</span><h1>Explora Mundo <span>✦</span></h1></div><div class="top-actions"><div class="date-switch" role="group" aria-label="Período">${[7,28,90].map(value => `<button data-days="${value}" class="${days === value ? 'selected' : ''}" aria-pressed="${days === value}">${value} dias</button>`).join('')}</div><button id="refresh" class="refresh" title="Atualizar dados" aria-label="Atualizar dados">${loading ? '◌' : '↻'}</button></div></header>
        <div class="data-banner"><span class="pulse ${totalConnections ? 'on' : ''}"></span><b>${totalConnections ? `${totalConnections} fonte${totalConnections > 1 ? 's' : ''} atualizando automaticamente` : 'Retrato histórico'}</b><span>${totalConnections ? 'Consulta automática a cada 5 min' : 'As APIs serão ativadas quando as contas forem autorizadas'}</span><button id="connection-detail">Ver fontes ↗</button></div>
        <section class="overview" aria-label="Indicadores principais">
          ${metric('Orgânico · visualizações', comparableOrganic ? short(organicViews) : '—', comparableOrganic ? 'Instagram + Facebook + YouTube' : 'Fontes em períodos diferentes', 'purple')}
          ${metric('YouTube · mídia paga', short(d.youtube.paidViews), `Studio · ${period('youtube')}`, 'pink')}
          ${metric('Investimento', money(d.ads.spend), `Google Ads · ${period('ads')}`, 'yellow')}
          ${metric('Seguidores', comparableFollowers ? fmt(d.instagram.followers + d.facebook.followers) : '—', comparableFollowers ? 'Instagram + Facebook' : 'Fontes em datas diferentes', 'green')}
        </section>
        <section class="content-grid" id="organico">
          <article class="panel trend-panel"><div class="panel-heading"><div><span class="eyebrow">ORGÂNICO</span><h2>Evolução <span>↗</span></h2></div><div class="network-tabs" role="tablist" aria-label="Rede social">${[['instagram','Instagram'],['facebook','Facebook'],['youtube','YouTube']].map(([key,label]) => `<button role="tab" data-network="${key}" aria-selected="${activeNetwork === key}" class="${activeNetwork === key ? 'selected' : ''}">${label}</button>`).join('')}</div></div><div class="trend-stat"><strong>${fmt(o.views)}</strong><span>visualizações ${status(activeNetwork)}</span></div>${lineChart(o.series, activeNetwork === 'youtube' ? 'organic' : 'value', activeNetwork === 'instagram' ? '#a34dc3' : activeNetwork === 'youtube' ? '#ff6679' : '#6390eb')}<div class="panel-foot"><span>${period(activeNetwork)}</span>${external(activeNetwork)}</div></article>
          <article class="panel split-panel"><div class="panel-heading"><div><span class="eyebrow">MIX DE CANAIS</span><h2>Onde acontece</h2></div><span class="decor-star">✳</span></div><div class="organic-bars">${organicBars.map(([name,value,key]) => `<div class="bar-item"><div><b>${name}</b><strong>${fmt(value)}</strong></div><span class="bar-track"><i class="${key}" style="width:${Math.max(2, value / maxOrganic * 100)}%"></i></span><small>${period(key)}</small></div>`).join('')}</div><div class="split-footer"><span>Visualizações orgânicas</span><strong>${comparableOrganic ? fmt(organicViews) : '—'}</strong></div></article>
        </section>
        <section class="network-grid" aria-label="Detalhes de canais">
          <article class="mini-card instagram"><div class="mini-card-head"><span class="platform-icon">◎</span><b>Instagram</b>${status('instagram')}</div><div class="mini-values"><div><strong>${fmt(d.instagram.views)}</strong><span>Visualizações</span></div><div><strong>${fmt(d.instagram.interactions)}</strong><span>Interações</span></div><div><strong>${fmt(d.instagram.followers)}</strong><span>Seguidores</span></div></div>${external('instagram')}</article>
          <article class="mini-card facebook"><div class="mini-card-head"><span class="platform-icon">f</span><b>Facebook</b>${status('facebook')}</div><div class="mini-values"><div><strong>${fmt(d.facebook.views)}</strong><span>Visualizações</span></div><div><strong>${fmt(d.facebook.interactions)}</strong><span>Interações</span></div><div><strong>${fmt(d.facebook.followers)}</strong><span>Seguidores</span></div></div>${external('facebook')}</article>
          <article class="mini-card youtube"><div class="mini-card-head"><span class="platform-icon">▶</span><b>YouTube</b>${status('youtube')}</div><div class="mini-values"><div><strong>${fmt(d.youtube.views)}</strong><span>Orgânicas</span></div><div><strong>${short(d.youtube.paidViews)}</strong><span>Pagas</span></div><div><strong>${fmt(d.youtube.watchHours)}h</strong><span>Exibição orgânica</span></div></div>${external('youtube')}</article>
        </section>
        <section class="paid-section" id="pago"><div class="section-title"><div><span class="eyebrow">MÍDIA PAGA</span><h2>YouTube Ads <span>✦</span></h2></div>${status('ads')}</div><div class="paid-grid"><div class="paid-metrics">${metric('Views TrueView', fmt(d.ads.views), 'Google Ads', 'pink')}${metric('Impressões', short(d.ads.impressions), 'Google Ads', 'purple')}${metric('Cliques', fmt(d.ads.clicks), 'Google Ads', 'green')}${metric('CPV médio', d.ads.views ? money(d.ads.spend / d.ads.views) : '—', 'Custo / view', 'yellow')}</div><article class="panel campaign-panel"><div class="panel-heading"><div><span class="eyebrow">CAMPANHAS</span><h3>Mais visualizadas</h3></div>${external('ads')}</div>${campaigns.length ? campaigns.map((item,index) => `<div class="campaign"><span class="campaign-index">0${index+1}</span><div><b>${esc(item.name)}</b><span class="bar-track"><i style="width:${Math.max(2,item.views / maxCampaign * 100)}%"></i></span></div><strong>${fmt(item.views)}</strong></div>`).join('') : '<div class="no-data">Sem campanhas no período</div>'}<div class="panel-foot"><span>${period('ads')}</span><span>Views do Ads ≠ views do Studio</span></div></article></div></section>
        <footer id="fontes"><span>Explora Mundo · dados por plataforma</span><a href="/privacidade.html">Privacidade</a><button id="footer-sources">Status das fontes ↗</button></footer>
      </main>
    </div>
    <dialog id="sources-dialog"><div class="dialog-heading"><div><span class="eyebrow">CONEXÕES</span><h2>Fontes de dados</h2></div><button id="close-dialog" aria-label="Fechar">×</button></div>${[['instagram','Instagram · Meta'],['facebook','Facebook · Meta'],['youtube','YouTube Studio'],['ads','Google Ads']].map(([key,label]) => `<div class="source-row"><div><b>${label}</b><span>${period(key)}</span></div>${status(key)}</div>`).join('')}<p>Os números históricos foram consultados em 18/10/2026. Quando a API de uma fonte estiver autorizada, ela passa a atualizar automaticamente.</p></dialog>
  `;
  document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => { days = Number(button.dataset.days); render(); refresh(); }));
  document.querySelectorAll('[data-network]').forEach(button => button.addEventListener('click', () => { activeNetwork = button.dataset.network; render(); }));
  document.querySelector('#refresh').addEventListener('click', refresh);
  const dialog = document.querySelector('#sources-dialog');
  document.querySelector('#connection-detail').addEventListener('click', () => dialog.showModal());
  document.querySelector('#footer-sources').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
}

async function refresh() {
  if (loading) return;
  loading = true;
  document.querySelector('#refresh')?.classList.add('spinning');
  try {
    const response = await fetch(`/api/metrics?days=${days}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const next = await response.json();
    if (next?.data && next?.status) state = next;
  } catch (error) {
    console.warn('API de métricas indisponível:', error.message);
  } finally {
    loading = false;
    render();
  }
}

render();
refresh();
setInterval(refresh, 5 * 60 * 1000);
