const SNAPSHOT = {
  instagram: { views: 2827, interactions: 244, followers: 25, reach: 1581 },
  facebook: { views: 270, interactions: 6, followers: 0, reach: 200 },
  youtube: { views: 1638, watchHours: 14.4, paidViews: 123018 },
  ads: {
    spend: 1094.31, impressions: 182520, views: 31977, clicks: 2026,
    campaigns: [
      { name: 'O que vai virar', views: 21095, spend: 752.92 },
      { name: '2 vídeos + 3 shorts', views: 7415, spend: 214.84 },
      { name: 'Como se forma um arco-íris', views: 3467, spend: 126.55 }
    ]
  }
};

const SOURCE_DATES = {
  instagram: '20 set – 17 out 2026', facebook: '20 set – 17 out 2026',
  youtube: '20 set – 17 out 2026', ads: '8–17 out 2026'
};

const number = value => Number(value || 0);
const sum = (items, field) => items.reduce((total, item) => total + number(item[field]), 0);
const localDate = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date);

function range(days) {
  const today = new Date();
  const end = new Date(today.getTime() - 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { from: localDate(start), to: localDate(end) };
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || body?.error_description || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function googleAccessToken(refreshToken) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !refreshToken) {
    throw new Error('Credenciais Google pendentes');
  }
  const form = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const result = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
  });
  return result.access_token;
}

async function getYouTube(from, to) {
  const token = await googleAccessToken(process.env.YOUTUBE_REFRESH_TOKEN);
  const params = new URLSearchParams({
    ids: 'channel==UC317OcRhcw3g54WanVKFS4Q', startDate: from, endDate: to,
    dimensions: 'day,insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched', sort: 'day'
  });
  const data = await jsonFetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const organic = new Map();
  const paid = new Map();
  let organicMinutes = 0;
  for (const [day, type, views, minutes] of data.rows || []) {
    if (type === 'ADVERTISING') paid.set(day, (paid.get(day) || 0) + number(views));
    else {
      organic.set(day, (organic.get(day) || 0) + number(views));
      organicMinutes += number(minutes);
    }
  }
  const series = [...new Set([...organic.keys(), ...paid.keys()])].sort().map(day => ({
    day, organic: organic.get(day) || 0, paid: paid.get(day) || 0
  }));
  return {
    views: [...organic.values()].reduce((a, b) => a + b, 0),
    paidViews: [...paid.values()].reduce((a, b) => a + b, 0),
    watchHours: Math.round(organicMinutes / 6) / 10,
    series
  };
}

async function getAds(from, to) {
  if (!process.env.GOOGLE_ADS_CUSTOMER_ID) {
    throw new Error('Credenciais Google Ads pendentes');
  }
  const token = await googleAccessToken(process.env.GOOGLE_ADS_REFRESH_TOKEN);
  const customer = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');
  const query = `SELECT campaign.id, campaign.name, campaign.advertising_channel_type, segments.date, metrics.impressions, metrics.clicks, metrics.video_trueview_views, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}' AND campaign.status != 'REMOVED'`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }
  const chunks = await jsonFetch(`https://googleads.googleapis.com/v26/customers/${customer}/googleAds:searchStream`, {
    method: 'POST', headers, body: JSON.stringify({ query })
  });
  const rows = (Array.isArray(chunks) ? chunks : [chunks]).flatMap(chunk => chunk.results || []);
  const youtubeRows = rows.filter(row => row.campaign?.advertisingChannelType === 'VIDEO' || /\bYT\b|you\s?tube/i.test(row.campaign?.name || ''));
  const byCampaign = new Map();
  const byDay = new Map();
  for (const row of youtubeRows) {
    const name = row.campaign?.name || 'Campanha sem nome';
    const day = row.segments?.date;
    const metric = row.metrics || {};
    const point = byCampaign.get(name) || { name, views: 0, spend: 0 };
    point.views += number(metric.videoTrueviewViews);
    point.spend += number(metric.costMicros) / 1e6;
    byCampaign.set(name, point);
    if (day) {
      const daily = byDay.get(day) || { day, views: 0, spend: 0 };
      daily.views += number(metric.videoTrueviewViews);
      daily.spend += number(metric.costMicros) / 1e6;
      byDay.set(day, daily);
    }
  }
  return {
    spend: sum(youtubeRows.map(row => ({ value: number(row.metrics?.costMicros) / 1e6 })), 'value'),
    impressions: sum(youtubeRows.map(row => ({ value: row.metrics?.impressions })), 'value'),
    views: sum(youtubeRows.map(row => ({ value: row.metrics?.videoTrueviewViews })), 'value'),
    clicks: sum(youtubeRows.map(row => ({ value: row.metrics?.clicks })), 'value'),
    campaigns: [...byCampaign.values()].sort((a, b) => b.views - a.views).slice(0, 5),
    series: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
  };
}

async function graph(path, params) {
  if (!process.env.META_ACCESS_TOKEN) throw new Error('Token Meta pendente');
  const query = new URLSearchParams(params);
  return jsonFetch(`https://graph.facebook.com/v25.0/${path}?${query}`, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
  });
}

function insightSeries(response, metric) {
  const item = response.data?.find(entry => entry.name === metric);
  return (item?.values || []).map(entry => ({
    day: entry.end_time?.slice(0, 10), value: number(entry.value)
  })).filter(entry => entry.day);
}

async function getInstagram(from, to) {
  const id = process.env.META_INSTAGRAM_ID;
  if (!id) throw new Error('ID do Instagram pendente');
  const until = new Date(`${to}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  const params = { metric: 'views,reach,total_interactions', period: 'day', since: from, until: until.toISOString().slice(0, 10) };
  const [insights, account] = await Promise.all([
    graph(`${id}/insights`, params), graph(id, { fields: 'followers_count' })
  ]);
  const views = insightSeries(insights, 'views');
  const reach = insightSeries(insights, 'reach');
  const interactions = insightSeries(insights, 'total_interactions');
  return {
    views: sum(views, 'value'), reach: sum(reach, 'value'),
    interactions: sum(interactions, 'value'), followers: number(account.followers_count), series: views
  };
}

async function getFacebook(from, to) {
  const id = process.env.META_PAGE_ID;
  if (!id) throw new Error('ID da página pendente');
  const until = new Date(`${to}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  const params = { metric: 'page_media_view,page_post_engagements', period: 'day', since: from, until: until.toISOString().slice(0, 10) };
  const [insights, page] = await Promise.all([
    graph(`${id}/insights`, params), graph(id, { fields: 'followers_count' })
  ]);
  const views = insightSeries(insights, 'page_media_view');
  const interactions = insightSeries(insights, 'page_post_engagements');
  return {
    views: sum(views, 'value'), interactions: sum(interactions, 'value'),
    followers: number(page.followers_count), reach: null, series: views
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido' });
  const days = [7, 28, 90].includes(Number(request.query.days)) ? Number(request.query.days) : 28;
  const period = range(days);
  const names = ['instagram', 'facebook', 'youtube', 'ads'];
  const tasks = [
    getInstagram(period.from, period.to), getFacebook(period.from, period.to),
    getYouTube(period.from, period.to), getAds(period.from, period.to)
  ];
  const results = await Promise.allSettled(tasks);
  const data = {};
  const status = {};
  results.forEach((result, index) => {
    const name = names[index];
    if (result.status === 'fulfilled') {
      data[name] = result.value;
      status[name] = { state: 'live', period: `${period.from} – ${period.to}` };
    } else {
      data[name] = SNAPSHOT[name];
      status[name] = { state: 'snapshot', period: SOURCE_DATES[name] };
      console.error(`${name} indisponível: ${result.reason?.message || 'erro desconhecido'}`);
    }
  });
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return response.status(200).json({ data, status, period, updatedAt: new Date().toISOString() });
}
