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

function selectedRange(query) {
  if (query.from != null || query.to != null) {
    const from = String(query.from || '');
    const to = String(query.to || '');
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
      new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
    if (!validDate(from) || !validDate(to)) return null;
    const length = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
    const yesterday = localDate(new Date(Date.now() - 86400000));
    if (length < 1 || length > 90 || to > yesterday) return null;
    return { from, to };
  }
  const days = [7, 28, 90].includes(Number(query.days)) ? Number(query.days) : 28;
  return range(days);
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
  const channelId = 'UC317OcRhcw3g54WanVKFS4Q';
  const report = extra => jsonFetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({
    ids: `channel==${channelId}`, startDate: from, endDate: to, ...extra
  })}`, { headers: { Authorization: `Bearer ${token}` } });
  const params = new URLSearchParams({
    ids: `channel==${channelId}`, startDate: from, endDate: to,
    dimensions: 'day,insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched', sort: 'day'
  });
  const [data, totals, videos] = await Promise.all([
    jsonFetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
    report({ metrics: 'views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,averageViewDuration' }),
    report({ dimensions: 'video', metrics: 'views,estimatedMinutesWatched,likes,comments,shares,subscribersGained', sort: '-views', maxResults: '10' })
  ]);
  const videoRows = (videos.rows || []).map(([id, views, minutes, likes, comments, shares, gained]) => ({
    id, views: number(views), watchHours: Math.round(number(minutes) / 6) / 10,
    likes: number(likes), comments: number(comments), shares: number(shares), subscribersGained: number(gained)
  }));
  const metadata = await Promise.allSettled([
    jsonFetch(`https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({ part: 'statistics', id: channelId })}`, { headers: { Authorization: `Bearer ${token}` } }),
    videoRows.length ? jsonFetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: 'snippet', id: videoRows.map(video => video.id).join(',') })}`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ items: [] })
  ]);
  const videoMetadata = new Map((metadata[1].status === 'fulfilled' ? metadata[1].value.items || [] : []).map(item => [item.id, item.snippet]));
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
    totalViews: number(totals.rows?.[0]?.[0]), totalWatchHours: Math.round(number(totals.rows?.[0]?.[1]) / 6) / 10,
    likes: number(totals.rows?.[0]?.[2]), comments: number(totals.rows?.[0]?.[3]), shares: number(totals.rows?.[0]?.[4]),
    subscribersGained: number(totals.rows?.[0]?.[5]),
    averageViewDuration: number(totals.rows?.[0]?.[6]),
    subscribers: metadata[0].status === 'fulfilled' && metadata[0].value.items?.[0]?.statistics?.subscriberCount != null
      ? number(metadata[0].value.items[0].statistics.subscriberCount) : null,
    videos: videoRows.map(video => ({ ...video,
      title: videoMetadata.get(video.id)?.title || `Vídeo ${video.id}`,
      thumbnail: videoMetadata.get(video.id)?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
      publishedAt: videoMetadata.get(video.id)?.publishedAt || null
    })),
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
  const endpoint = `https://googleads.googleapis.com/v26/customers/${customer}/googleAds:searchStream`;
  const search = statement => jsonFetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ query: statement }) });
  const [chunks, conversionChunks] = await Promise.all([
    search(query),
    search(`SELECT campaign.id, segments.conversion_action_name, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}' AND campaign.status != 'REMOVED'`)
  ]);
  const rows = (Array.isArray(chunks) ? chunks : [chunks]).flatMap(chunk => chunk.results || []);
  const youtubeRows = rows.filter(row => row.campaign?.advertisingChannelType === 'VIDEO' || /\bYT\b|you\s?tube/i.test(row.campaign?.name || ''));
  const campaignIds = new Set(youtubeRows.map(row => row.campaign?.id));
  const conversions = (Array.isArray(conversionChunks) ? conversionChunks : [conversionChunks]).flatMap(chunk => chunk.results || []);
  const subscriptionConversions = conversions.filter(row => campaignIds.has(row.campaign?.id) && /youtube channel subscriptions/i.test(row.segments?.conversionActionName || ''));
  const paidSubscribers = sum(subscriptionConversions.map(row => ({ value: row.metrics?.conversions })), 'value');
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
    subscribers: paidSubscribers,
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

function insightSeries(response, metric, offsetDays = 0) {
  const item = response.data?.find(entry => entry.name === metric);
  return (item?.values || []).map(entry => ({
    day: entry.end_time ? new Date(Date.parse(entry.end_time) + offsetDays * 86400000).toISOString().slice(0, 10) : null,
    value: number(entry.value)
  })).filter(entry => entry.day);
}

async function getInstagram(from, to) {
  const id = process.env.META_INSTAGRAM_ID;
  if (!id) throw new Error('ID do Instagram pendente');
  const addDays = (day, count) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
  const spans = [];
  for (let start = from; start <= to; start = addDays(start, 30)) {
    spans.push({ period: 'day', since: start, until: addDays(start, 30) <= to ? addDays(start, 30) : addDays(to, 1) });
  }
  const [account, ...insights] = await Promise.all([
    graph(id, { fields: 'followers_count' }),
    ...spans.flatMap(span => [
      graph(`${id}/insights`, { ...span, metric: 'views,reach,total_interactions', metric_type: 'total_value' }),
      graph(`${id}/insights`, { ...span, metric: 'reach' })
    ])
  ]);
  const totals = insights.filter((_, index) => index % 2 === 0);
  const dailyReach = insights.filter((_, index) => index % 2 === 1);
  const total = metric => sum(totals.map(chunk => ({ value: number(chunk.data?.find(entry => entry.name === metric)?.total_value?.value) })), 'value');
  let media = [];
  try {
    const feed = await graph(`${id}/media`, { fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count,thumbnail_url', limit: '100' });
    media = (feed.data || []).filter(item => item.timestamp?.slice(0, 10) >= from && item.timestamp?.slice(0, 10) <= to)
      .map(item => ({ id: item.id, title: item.caption?.split('\n')[0]?.slice(0, 95) || 'Publicação', type: item.media_type,
        date: item.timestamp?.slice(0, 10), url: item.permalink, thumbnail: item.thumbnail_url || null,
        likes: number(item.like_count), comments: number(item.comments_count) }));
  } catch (error) { console.warn(`Publicações Instagram indisponíveis: ${error.message}`); }
  return {
    views: total('views'), reach: spans.length === 1 ? total('reach') : null,
    interactions: total('total_interactions'), followers: number(account.followers_count),
    postLikes: sum(media, 'likes'), postComments: sum(media, 'comments'), postCount: media.length,
    posts: media.sort((a, b) => b.likes - a.likes).slice(0, 6),
    series: dailyReach.flatMap(chunk => insightSeries(chunk, 'reach')), seriesMetric: 'reach'
  };
}

async function getFacebook(from, to) {
  const id = process.env.META_PAGE_ID;
  if (!id) throw new Error('ID da página pendente');
  const until = new Date(`${to}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  const params = { metric: 'page_media_view,page_post_engagements,page_actions_post_reactions_total', period: 'day', since: from, until: until.toISOString().slice(0, 10) };
  const [insights, page] = await Promise.all([
    graph(`${id}/insights`, params), graph(id, { fields: 'followers_count,fan_count' })
  ]);
  const views = insightSeries(insights, 'page_media_view', -1);
  const interactions = insightSeries(insights, 'page_post_engagements', -1);
  const reactions = insights.data?.find(item => item.name === 'page_actions_post_reactions_total');
  const postLikes = (reactions?.values || []).reduce((total, entry) => total + number(entry.value?.like), 0);
  return {
    views: sum(views, 'value'), interactions: sum(interactions, 'value'),
    followers: number(page.followers_count), pageLikes: number(page.fan_count), postLikes,
    reach: null, series: views
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido' });
  const period = selectedRange(request.query || {});
  if (!period) return response.status(400).json({ error: 'Selecione datas válidas até ontem, em um intervalo de no máximo 90 dias.' });
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
