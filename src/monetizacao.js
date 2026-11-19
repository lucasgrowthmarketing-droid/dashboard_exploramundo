import './style.css';
import './monetizacao.css';

const GOAL = 4000;
const fmt = value => value == null || Number.isNaN(value) ? '—' : Math.round(value).toLocaleString('pt-BR');
const dec = (value, digits = 1) => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (value, digits = 2) => value == null || !Number.isFinite(value) ? '—' : `R$ ${dec(value, digits)}`;
const moneyRound = value => value == null || !Number.isFinite(value) ? '—' : `R$ ${fmt(value)}`;
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const parseDay = day => new Date(`${day}T12:00:00`);
const dayLabel = day => { const d = typeof day === 'string' ? parseDay(day) : day; return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const fullLabel = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

let data = null;
let sim = { budget: null, cost: null };

function analyse(payload) {
  const ref = payload.reference;
  const yt = payload.youtube.series || [];
  const ads = new Map((payload.ads.series || []).map(row => [row.day, row]));
  const joined = yt.filter(row => ads.has(row.day)).map(row => ({ ...row, spend: ads.get(row.day).spend, adViews: ads.get(row.day).views }));
  const after = joined.filter(row => row.day >= ref.playlistChangeDate);
  const before = joined.filter(row => row.day < ref.playlistChangeDate && row.spend > 0);
  const block = rows => {
    const spend = sum(rows, 'spend'), hours = sum(rows, 'organicHours'), views = sum(rows, 'organicViews'), adViews = sum(rows, 'adViews');
    return {
      days: rows.length, spend, hours, views, adViews,
      costPerHour: hours > 0 ? spend / hours : null,
      hoursPerDay: rows.length ? hours / rows.length : 0,
      spendPerDay: rows.length ? spend / rows.length : 0,
      cpv: adViews ? spend / adViews : null,
      costPerOrganicView: views ? spend / views : null,
      organicPerAdView: adViews ? views / adViews : null,
      secondsPerOrganicView: views ? hours * 3600 / views : null,
      organicSecondsPerAdView: adViews ? hours * 3600 / adViews : null,
      organicMinutesPerReal: spend ? hours * 60 / spend : null
    };
  };
  const adsSeries = payload.ads.series || [];
  const last7 = adsSeries.slice(-7);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const deadline = parseDay(ref.deadline);
  const approvalTarget = parseDay('2027-01-01');
  const qualified = payload.youtube.qualifiedHours;
  const remaining = Math.max(0, GOAL - qualified);
  return {
    ref, joined, after: block(after), before: block(before),
    spend7: sum(last7, 'spend') / Math.max(last7.length, 1),
    qualified, remaining, today, deadline, approvalTarget,
    daysToDeadline: daysBetween(today, deadline),
    daysToApproval: daysBetween(today, approvalTarget)
  };
}

function metric(label, value, note, color = 'purple') {
  return `<article class="metric-card ${color}"><div class="metric-card-top"><span>${label}</span><span class="metric-spark" aria-hidden="true">✦</span></div><strong>${value}</strong><small>${note}</small></article>`;
}

function stateBadge(state) {
  return state === 'live'
    ? '<span class="source-state live"><i></i> Ao vivo</span>'
    : '<span class="source-state snapshot"><i></i> Retrato 19/11</span>';
}

function dailyChart(a) {
  const rows = a.joined;
  if (!rows.length) return '<div class="no-data">Sem dados diários.</div>';
  const W = 900, H = 260, L = 44, R = 50, T = 18, B = 30;
  const maxH = Math.max(...rows.map(r => r.organicHours), 10) * 1.1;
  const maxS = Math.max(...rows.map(r => r.spend), 10) * 1.1;
  const bw = (W - L - R) / rows.length;
  const x = i => L + i * bw;
  const yH = v => T + (1 - v / maxH) * (H - T - B);
  const yS = v => T + (1 - v / maxS) * (H - T - B);
  const ticks = [0, .5, 1].map(f => Math.round(maxH / 1.1 * f));
  let s = '';
  ticks.forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${yH(v)}" y2="${yH(v)}" class="grid"/><text x="${L - 8}" y="${yH(v) + 4}" text-anchor="end" class="axis">${fmt(v)}h</text>`; });
  [0, .5, 1].forEach(f => { const v = Math.round(maxS / 1.1 * f); s += `<text x="${W - R + 8}" y="${yS(v) + 4}" class="axis pink">R$${fmt(v)}</text>`; });
  const changeIndex = rows.findIndex(r => r.day >= a.ref.playlistChangeDate);
  if (changeIndex > 0) {
    const cx = x(changeIndex);
    s += `<rect x="${cx}" y="${T}" width="${W - R - cx}" height="${H - T - B}" class="after-zone"/><line x1="${cx}" x2="${cx}" y1="${T - 6}" y2="${H - B}" class="change-line"/><text x="${cx - 6}" y="${T + 8}" text-anchor="end" class="axis strong">anúncio → playlist</text>`;
  }
  rows.forEach((r, i) => {
    const h = Math.max(1.5, (H - B) - yH(r.organicHours));
    s += `<rect x="${x(i) + bw * .18}" y="${(H - B) - h}" width="${bw * .64}" height="${h}" rx="${Math.min(4, bw * .3)}" class="bar-organic"><title>${dayLabel(r.day)}: ${dec(r.organicHours)} h orgânicas · ${money(r.spend, 0)} no Ads</title></rect>`;
  });
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${(x(i) + bw / 2).toFixed(1)} ${yS(r.spend).toFixed(1)}`).join(' ');
  s += `<path d="${line}" class="spend-line"/>`;
  const step = Math.ceil(rows.length / 6);
  rows.forEach((r, i) => { if (i % step === 0 || i === rows.length - 1) s += `<text x="${x(i) + bw / 2}" y="${H - 8}" text-anchor="middle" class="axis">${dayLabel(r.day)}</text>`; });
  return `<div class="chart-scroll"><svg class="mz-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas orgânicas por dia e gasto diário no Google Ads">${s}</svg></div>`;
}

function projection(a) {
  const perDay = sim.budget / sim.cost;
  const days = perDay > 0 ? Math.ceil(a.remaining / perDay) : Infinity;
  const hit = Number.isFinite(days) ? addDays(a.today, days) : null;
  return { perDay, days, hit, total: Number.isFinite(days) ? days * sim.budget : null };
}

function projectionChart(a, p) {
  const W = 900, H = 280, L = 52, R = 18, T = 22, B = 34;
  const end = parseDay('2027-03-01');
  const span = daysBetween(a.today, end);
  const maxY = 4500;
  const x = d => L + (d / span) * (W - L - R);
  const y = v => T + (1 - v / maxY) * (H - T - B);
  let s = '';
  [0, 1000, 2000, 3000, 4000].forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`; });
  s += `<line x1="${L}" x2="${W - R}" y1="${y(GOAL)}" y2="${y(GOAL)}" class="goal-line"/><text x="${L + 6}" y="${y(GOAL) - 7}" class="axis strong">4.000 h</text>`;
  [['2026-12-01', '1 dez'], ['2027-01-01', '1 jan · alvo p/ revisão'], ['2027-02-01', '1 fev · meta'], ['2027-03-01', '1 mar']].forEach(([d, label], i) => {
    const xx = x(daysBetween(a.today, parseDay(d)));
    const key = d === '2027-02-01', soft = d === '2027-01-01';
    s += `<line x1="${xx}" x2="${xx}" y1="${T}" y2="${H - B}" class="${key ? 'deadline-line' : soft ? 'target-line' : 'grid dashed'}"/>`;
    s += `<text x="${xx}" y="${H - 10}" text-anchor="${i === 3 ? 'end' : 'middle'}" class="axis ${key ? 'red' : ''}">${label}</text>`;
  });
  const pts = [];
  for (let d = 0; d <= span; d += 1) pts.push([x(d), y(Math.min(GOAL, a.qualified + p.perDay * d))]);
  const path = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(' ');
  s += `<path d="${path} L${x(span)} ${y(0)} L${x(0)} ${y(0)} Z" class="proj-area"/><path d="${path}" class="proj-line"/>`;
  s += `<circle cx="${x(0)}" cy="${y(a.qualified)}" r="5" class="dot"/><text x="${x(0) + 12}" y="${y(a.qualified) + 18}" class="axis strong">hoje · ${fmt(a.qualified)} h</text>`;
  if (p.hit && p.days <= span) {
    const anchor = p.days > span * .75 ? 'end' : 'middle';
    s += `<circle cx="${x(p.days)}" cy="${y(GOAL)}" r="7" class="dot hit"/><text x="${x(p.days)}" y="${y(GOAL) - 14}" text-anchor="${anchor}" class="axis hit-label">${dayLabel(p.hit)}</text>`;
  }
  return `<div class="chart-scroll"><svg class="mz-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção das horas qualificadas acumuladas">${s}</svg></div>`;
}

function simulatorResults(a) {
  const p = projection(a);
  let tone = 'bad', verdict = 'Não chega a tempo';
  if (p.hit && p.hit <= a.approvalTarget) { tone = 'good'; verdict = 'Dá tempo para a revisão'; }
  else if (p.hit && p.hit <= a.deadline) { tone = 'warn'; verdict = 'Chega, mas sem folga'; }
  return `
    <div class="sim-kpis">
      <div><span>Horas orgânicas por dia</span><b>${dec(p.perDay)} h</b></div>
      <div><span>Chega a 4.000 h</span><b>${p.hit ? fullLabel(p.hit) : 'nunca'}</b></div>
      <div><span>Investimento até lá</span><b>${moneyRound(p.total)}</b></div>
      <div class="verdict ${tone}"><span>Situação</span><b>${verdict}</b></div>
    </div>
    ${projectionChart(a, p)}`;
}

function scenarioRows(a) {
  const budgets = [
    ['Ritmo atual (média 7 dias)', a.spend7],
    ['Mínimo para 1º/fev', a.remaining / Math.max(a.daysToDeadline, 1) * sim.cost],
    ['Para chegar em 1º/jan', a.remaining / Math.max(a.daysToApproval, 1) * sim.cost],
    ['Acelerado', 400]
  ];
  return budgets.map(([label, budget]) => {
    const perDay = budget / sim.cost;
    const days = Math.ceil(a.remaining / perDay);
    const hit = addDays(a.today, days);
    const ok = hit <= a.approvalTarget ? 'good' : hit <= a.deadline ? 'warn' : 'bad';
    return `<tr><td>${label}</td><td>${moneyRound(budget)}/dia</td><td>${dec(perDay)} h</td><td><span class="pill ${ok}">${fullLabel(hit)}</span></td><td>${moneyRound(budget * days)}</td></tr>`;
  }).join('');
}

function render() {
  const a = analyse(data);
  const { ref } = a;
  if (sim.cost == null) sim.cost = Math.round((a.after.costPerHour || 3.5) * 10) / 10;
  if (sim.budget == null) sim.budget = Math.round(a.spend7 / 10) * 10;
  const pct = Math.min(100, a.qualified / GOAL * 100);
  const officialPct = Math.min(100, ref.officialQualifiedHours / GOAL * 100);
  const requiredDeadline = a.remaining / Math.max(a.daysToDeadline, 1);
  const requiredApproval = a.remaining / Math.max(a.daysToApproval, 1);
  const subs = data.youtube.subscribers;
  const campaigns = data.ads.campaigns7d || [];
  const maxCampaign = Math.max(...campaigns.map(c => c.spend || c.views), 1);
  const sources = (data.youtube.sources365 || []).filter(s => s.hours > 0);
  const sourceNames = { ADVERTISING: 'Publicidade (não conta)', PLAYLIST: 'Playlists', EXT_URL: 'Externa', YT_CHANNEL: 'Páginas do canal', NO_LINK_OTHER: 'Direta ou desconhecida', SUBSCRIBER: 'Recursos de navegação', YT_SEARCH: 'Pesquisa do YouTube', RELATED_VIDEO: 'Vídeos sugeridos', YT_OTHER_PAGE: 'Outros recursos', NOTIFICATION: 'Notificações', END_SCREEN: 'Telas finais', SHORTS: 'Feed dos Shorts', HASHTAGS: 'Hashtags', PLAYLIST_PAGE: 'Página da playlist' };
  const totalSourceHours = Math.max(sum(sources, 'hours'), 1);

  document.querySelector('#app').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="/#visao" aria-label="Explora Mundo, início"><img src="/logo.png" alt="Explora Mundo"/><span>Explora<br/>Mundo<small>analytics</small></span></a>
      <nav aria-label="Seções"><a aria-label="Visão geral" class="nav-link" href="/#visao"><b>◉</b><span>Visão geral</span></a><a aria-label="YouTube" class="nav-link" href="/#youtube"><b>▶</b><span>YouTube</span></a><a aria-label="Instagram" class="nav-link" href="/#instagram"><b>◎</b><span>Instagram</span></a><a aria-label="Facebook" class="nav-link" href="/#facebook"><b>f</b><span>Facebook</span></a><a aria-label="Monetização" class="nav-link active" href="/monetizcaoyoutube"><b>$</b><span>Monetização</span></a></nav>
      <div class="sidebar-bottom"><div class="orb">✦</div><b>${fmt(pct)}%</b><span>da meta de 4.000 h</span></div>
    </aside>
    <main class="mz">
      <header class="topbar"><div class="top-title"><span class="eyebrow">YOUTUBE PARTNER PROGRAM</span><h1>Rumo à monetização <span>✦</span></h1></div><div class="top-actions">${stateBadge(data.status.youtube)}${stateBadge(data.status.ads)}</div></header>
      <div class="data-banner"><span class="pulse ${data.status.youtube === 'live' ? 'on' : ''}"></span><b>Meta: 4.000 horas qualificadas até 1º de fevereiro de 2027</b><span>YouTube até ${dayLabel(data.youtube.through)} · Ads até ${dayLabel(data.ads.through)} · atualiza a cada 10 min</span></div>

      <section class="mz-hero">
        <div class="mz-hero-main">
          <span>HORAS QUALIFICADAS · VÍDEOS LONGOS · 365 DIAS</span>
          <strong>${fmt(a.qualified)}<em> / 4.000 h</em></strong>
          <div class="mz-progress" role="img" aria-label="${dec(pct)}% da meta"><i style="width:${officialPct}%" class="official"></i><i style="width:${Math.max(0, pct - officialPct)}%" class="estimate"></i></div>
          <small>Tudo que não veio de publicidade, só em vídeos longos. Contador oficial do Studio: ${fmt(ref.officialQualifiedHours)} h em ${dayLabel(ref.officialDate)} (atualiza com atraso).</small>
        </div>
        <div class="mz-hero-side">
          <div><span>Faltam</span><b>${fmt(a.remaining)} h</b><small>para liberar os anúncios</small></div>
          <div><span>Dias até 1º/fev</span><b>${fmt(a.daysToDeadline)}</b><small>${dec(requiredDeadline)} h/dia necessárias</small></div>
          <div><span>Para aprovar até lá</span><b>${dec(requiredApproval, 0)} h/dia</b><small>chegando em 1º/jan, com tempo para a revisão</small></div>
        </div>
      </section>

      <div class="detail-subhead"><div><span class="eyebrow">REQUISITOS</span><h3>Onde estamos</h3></div><span>Anúncios exigem 1.000 inscritos + 4.000 h ou 10 mi de views de Shorts</span></div>
      <div class="req-grid">
        <article class="panel req"><div class="req-head"><b>Inscritos</b><span class="pill good">Cumprido</span></div><strong>${fmt(subs)}</strong><span class="bar-track"><i style="width:100%;background:#7dbe36"></i></span><small>de 1.000 necessários</small></article>
        <article class="panel req"><div class="req-head"><b>Horas qualificadas</b><span class="pill warn">${dec(pct)}%</span></div><strong>${fmt(a.qualified)} h</strong><span class="bar-track"><i style="width:${pct}%"></i></span><small>de 4.000 · janela de 365 dias</small></article>
        <article class="panel req"><div class="req-head"><b>Views de Shorts</b><span class="pill bad">${dec(ref.shortsQualifiedViews / 1e7 * 100)}%</span></div><strong>${fmt(ref.shortsQualifiedViews / 1000)} mil</strong><span class="bar-track"><i style="width:${Math.max(1, ref.shortsQualifiedViews / 1e7 * 100)}%;background:#f274a9"></i></span><small>de 10 milhões em 90 dias · fora de alcance</small></article>
      </div>

      <div class="detail-subhead"><div><span class="eyebrow">CUSTO DA HORA</span><h3>Quanto o anúncio gera de hora orgânica</h3></div><span>Desde ${dayLabel(ref.playlistChangeDate)}, quando os anúncios passaram a abrir a playlist</span></div>
      <div class="detail-metrics">
        ${metric('Custo por hora orgânica', money(a.after.costPerHour), `${money(a.after.spend, 0)} ÷ ${fmt(a.after.hours)} h em ${a.after.days} dias`, 'purple')}
        ${metric('Horas orgânicas por dia', `${dec(a.after.hoursPerDay)} h`, `com ${money(a.after.spendPerDay, 0)}/dia de anúncio`, 'green')}
        ${metric('Minutos orgânicos por R$ 1', dec(a.after.organicMinutesPerReal), 'tempo que conta para a meta', 'yellow')}
        ${metric('Antes da mudança', money(a.before.costPerHour, 0), `por hora orgânica · ${fmt(a.before.hours)} h com ${money(a.before.spend, 0)}`, 'pink')}
      </div>

      <article class="panel detail-chart-panel">
        <div class="panel-heading"><div><span class="eyebrow">DIA A DIA</span><h3>Horas orgânicas × gasto no Ads</h3></div><div class="legend"><span><i class="organic"></i> Horas orgânicas (vídeos longos)</span><span><i class="paid"></i> Gasto diário</span></div></div>
        ${dailyChart(a)}
        <div class="panel-foot"><span>Antes de ${dayLabel(ref.playlistChangeDate)} o anúncio levava ao vídeo solto e a criança saía ao fim dele: ~1 h orgânica por dia. Com a playlist ela segue para o próximo episódio, e essa continuação conta.</span></div>
      </article>

      <div class="detail-subhead"><div><span class="eyebrow">FUNIL POR PESSOA</span><h3>Do clique ao minuto que conta</h3></div><span>Média desde ${dayLabel(ref.playlistChangeDate)}</span></div>
      <div class="funnel">
        <div class="step"><span>1 · Custo para alguém ver o anúncio</span><b>${money(a.after.cpv, 3)}</b><small>por view paga (CPV)</small></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="step"><span>2 · Quem segue assistindo</span><b>${dec(a.after.organicPerAdView, 2)}</b><small>views orgânicas por view paga</small></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="step"><span>3 · Quanto cada view orgânica dura</span><b>${dec(a.after.secondsPerOrganicView, 0)} s</b><small>média por visualização orgânica</small></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="step hl"><span>4 · Resultado por pessoa alcançada</span><b>${dec(a.after.organicSecondsPerAdView, 0)} s</b><small>de tempo qualificado por view paga</small></div>
      </div>
      <div class="detail-metrics small-metrics">
        ${metric('Custo por view orgânica', money(a.after.costPerOrganicView, 3), 'gasto ÷ views orgânicas geradas', 'purple')}
        ${metric('Público mensal', `${dec(ref.monthlyAudience / 1000, 1)} mil`, `espectadores únicos · ${fmt(ref.newViewersShare * 100)}% novos · ${ref.audienceWindow}`, 'green')}
        ${metric('Custo por espectador', money(sum(a.joined.slice(-28), 'spend') / ref.monthlyAudience, 3), 'gasto 28 dias ÷ público mensal', 'yellow')}
        ${metric('Pagas que não contam', `${fmt(data.youtube.paidHours365)} h`, 'assistidas via anúncio, fora da meta', 'pink')}
      </div>

      <section class="panel sim-panel" id="simulador">
        <div class="panel-heading"><div><span class="eyebrow">PROJEÇÃO</span><h3>Quanto investir e quando chegamos</h3></div><span class="table-note">Horas por dia = orçamento ÷ custo por hora orgânica</span></div>
        <div class="sim-controls">
          <label for="budget"><span>Orçamento diário no Ads</span><output id="budget-out">${moneyRound(sim.budget)}/dia</output><input id="budget" type="range" min="50" max="600" step="10" value="${sim.budget}"/></label>
          <label for="cost"><span>Custo por hora orgânica</span><output id="cost-out">${money(sim.cost)}</output><input id="cost" type="range" min="1.5" max="8" step="0.1" value="${sim.cost}"/></label>
        </div>
        <div id="sim-results">${simulatorResults(a)}</div>
        <div class="table-scroll"><table class="mz-table"><thead><tr><th>Cenário</th><th>Orçamento</th><th>Horas/dia</th><th>Chega em</th><th>Investimento total</th></tr></thead><tbody id="scenarios">${scenarioRows(a)}</tbody></table></div>
        <div class="panel-foot"><span>Custo inicial = custo medido desde ${dayLabel(ref.playlistChangeDate)}. Sem anúncio, a base orgânica de vídeos longos é ~1 h/dia, então quase tudo depende do investimento. A revisão do YouTube costuma levar algumas semanas: por isso o alvo de 1º/jan.</span></div>
      </section>

      <div class="content-grid mz-bottom">
        <article class="panel">
          <div class="panel-heading"><div><span class="eyebrow">ORIGEM DAS HORAS · 365 DIAS</span><h3>O que conta e o que não conta</h3></div></div>
          <div class="organic-bars">${sources.slice(0, 7).map(s => `<div class="bar-item"><div><b>${esc(sourceNames[s.type] || s.type)}</b><strong>${fmt(s.hours)} h</strong></div><span class="bar-track"><i style="width:${Math.max(1.5, s.hours / totalSourceHours * 100)}%;background:${s.type === 'ADVERTISING' ? '#f274a9' : '#7dbe36'}"></i></span></div>`).join('')}</div>
          <div class="panel-foot"><span>Vídeos longos. Horas de Shorts não contam para as 4.000 h.</span></div>
        </article>
        <article class="panel campaign-panel">
          <div class="panel-heading"><div><span class="eyebrow">ÚLTIMOS 7 DIAS</span><h3>Campanhas</h3></div></div>
          ${campaigns.length ? campaigns.map((c, i) => `<div class="campaign"><span class="campaign-index">0${i + 1}</span><div><b>${esc(c.name.replace(/\[EM\] \[ENGAJ\] \[YT\] ?-? ?/g, ''))}</b><span class="bar-track"><i style="width:${Math.max(3, (c.spend || c.views) / maxCampaign * 100)}%"></i></span></div><strong>${c.spend ? money(c.spend, 0) : fmt(c.views)}</strong></div>`).join('') : '<div class="no-data">Sem campanhas no período.</div>'}
          <div class="panel-foot"><span>Todas as campanhas levam para um vídeo longo dentro da playlist (URL final com &amp;list=). Por isso até as de Shorts geram horas que contam.</span></div>
        </article>
      </div>

      <article class="panel mz-actions">
        <div class="panel-heading"><div><span class="eyebrow">PRÓXIMOS PASSOS</span><h3>O que move o ponteiro</h3></div></div>
        <ol>
          <li><b>Manter todo anúncio apontando para a playlist.</b> Essa única mudança levou as horas orgânicas de ~1 para ${dec(a.after.hoursPerDay, 0)} por dia. Anúncio novo sem <code>&amp;list=</code> na URL não gera hora qualificada.</li>
          <li><b>Subir o orçamento para ~${moneyRound(requiredApproval * sim.cost)}/dia.</b> É o ritmo para chegar em 4.000 h perto de 1º/jan e ter a aprovação antes de 1º/fev. Com ~${moneyRound(requiredDeadline * sim.cost)}/dia chega exatamente no prazo, sem folga.</li>
          <li><b>Publicar uma compilação de 15 a 25 minutos e colocá-la no topo da playlist.</b> Hoje cada view orgânica dura ${dec(a.after.secondsPerOrganicView, 0)} s. Se a sessão durar mais, o custo por hora cai na mesma proporção.</li>
          <li><b>Acompanhar o custo por hora toda semana.</b> Se passar de R$ 5, trocar os criativos antes de aumentar a verba. Orçamento muito alto tende a encarecer a view.</li>
          <li><b>Pedir a revisão no dia em que o contador oficial passar de 4.000 h.</b></li>
        </ol>
      </article>

      <footer><span>Fontes: YouTube Analytics (vídeos longos por origem de tráfego), Google Ads API e YouTube Studio (público mensal, contador oficial). Conteúdo para crianças: Clubes dos Canais e Supers não ficam disponíveis, então só o nível de anúncios gera receita.</span><a href="/">← Painel principal</a></footer>
    </main>
  </div>`;

  const update = () => {
    sim.budget = Number(document.querySelector('#budget').value);
    sim.cost = Number(document.querySelector('#cost').value);
    document.querySelector('#budget-out').textContent = `${moneyRound(sim.budget)}/dia`;
    document.querySelector('#cost-out').textContent = money(sim.cost);
    document.querySelector('#sim-results').innerHTML = simulatorResults(a);
    document.querySelector('#scenarios').innerHTML = scenarioRows(a);
  };
  document.querySelector('#budget').addEventListener('input', update);
  document.querySelector('#cost').addEventListener('input', update);
}

async function load() {
  document.querySelector('#app').innerHTML = '<div class="mz-loading"><img src="/logo.png" alt=""/><span>Carregando dados do canal…</span></div>';
  try {
    const response = await fetch('/api/monetizacao');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    render();
  } catch (error) {
    document.querySelector('#app').innerHTML = `<div class="mz-loading"><img src="/logo.png" alt=""/><span>Não foi possível carregar os dados (${esc(error.message)}). Atualize a página em instantes.</span></div>`;
  }
}

load();
setInterval(() => { if (document.visibilityState === 'visible' && data) fetch('/api/monetizacao').then(r => r.ok ? r.json() : null).then(next => { if (next) { data = next; render(); } }).catch(() => {}); }, 600000);
