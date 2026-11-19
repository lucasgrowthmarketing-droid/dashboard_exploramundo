// Dados da página /monetizcaoyoutube: horas de vídeos longos por origem (YouTube Analytics)
// cruzadas com o gasto diário do Google Ads. Se uma fonte falhar, volta ao retrato de 19/11/2026.

const CHANNEL_ID = 'UC317OcRhcw3g54WanVKFS4Q';

// Retrato verificado no YouTube Studio e no Google Ads em 19/11/2026.
// day, horas totais (vídeos longos), horas de publicidade, views totais, views de publicidade
const SNAPSHOT_YT = [
  ['2026-10-07', 1.3, 0, 58, 0], ['2026-10-08', 1.3, 0, 56, 0], ['2026-10-09', 11.2, 10.5, 1564, 1519],
  ['2026-10-10', 24.4, 24.1, 30842, 30806], ['2026-10-11', 10.8, 10.3, 661, 636], ['2026-10-12', 51.4, 50.1, 2090, 2030],
  ['2026-10-13', 44.6, 43.9, 15645, 15604], ['2026-10-14', 12.3, 11.4, 4629, 4574], ['2026-10-15', 13.5, 12.9, 4586, 4547],
  ['2026-10-16', 17.7, 15.3, 3808, 3703], ['2026-10-17', 47.4, 46.2, 7555, 7463], ['2026-10-18', 60.6, 60.1, 7150, 7109],
  ['2026-10-19', 91.5, 91.0, 9817, 9770], ['2026-10-20', 124.6, 124.5, 15905, 15880], ['2026-10-21', 58.0, 57.3, 7966, 7923],
  ['2026-10-22', 176.9, 175.7, 22879, 22819], ['2026-10-23', 0.6, 0, 26, 0], ['2026-10-24', 28.8, 27.7, 4180, 4091],
  ['2026-10-25', 210.0, 209.1, 26947, 26877], ['2026-10-26', 2.0, 0.7, 320, 267], ['2026-10-27', 2.5, 0.9, 776, 711],
  ['2026-10-28', 2.1, 1.0, 1191, 1127], ['2026-10-29', 2.1, 1.7, 1496, 1477], ['2026-10-30', 1.9, 1.6, 1496, 1471],
  ['2026-10-31', 2.2, 1.7, 2146, 2121], ['2026-11-01', 4.0, 3.6, 2880, 2880], ['2026-11-02', 3.9, 3.0, 3181, 3107],
  ['2026-11-03', 2.7, 2.0, 1683, 1630], ['2026-11-04', 2.5, 2.3, 1583, 1541], ['2026-11-05', 4.2, 3.4, 2933, 2818],
  ['2026-11-06', 30.2, 29.1, 5820, 5728], ['2026-11-07', 9.5, 7.9, 3271, 3058], ['2026-11-08', 19.6, 18.5, 6135, 5886],
  ['2026-11-09', 34.1, 33.0, 7392, 6964], ['2026-11-10', 37.7, 36.9, 7371, 7126], ['2026-11-11', 0.8, 0, 32, 0],
  ['2026-11-12', 1.5, 0, 120, 0], ['2026-11-13', 211.2, 159.4, 19753, 15495], ['2026-11-14', 259.2, 142.1, 20857, 11011],
  ['2026-11-15', 304.4, 190.0, 25938, 15731], ['2026-11-16', 87.6, 44.0, 6773, 3143], ['2026-11-17', 51.3, 0, 4299, 0],
  ['2026-11-18', 69.7, 0, 5375, 0]
];
// day, gasto (R$), views do Ads
const SNAPSHOT_ADS = [
  ['2026-10-09', 25, 731], ['2026-10-10', 289, 8812], ['2026-10-11', 97, 3470], ['2026-10-12', 64, 1150], ['2026-10-13', 190, 3867],
  ['2026-10-14', 92, 2627], ['2026-10-15', 101, 4135], ['2026-10-16', 99, 2334], ['2026-10-17', 135, 4829], ['2026-10-18', 143, 5416],
  ['2026-10-19', 142, 6538], ['2026-10-20', 134, 6555], ['2026-10-21', 182, 5880], ['2026-10-22', 145, 6564], ['2026-10-23', 171, 7898],
  ['2026-10-24', 225, 10875], ['2026-10-25', 298, 14340], ['2026-10-26', 100, 3656], ['2026-10-27', 105, 4203], ['2026-10-28', 103, 4154],
  ['2026-10-29', 52, 1862], ['2026-10-30', 53, 1978], ['2026-10-31', 75, 2894], ['2026-11-01', 152, 5408], ['2026-11-02', 213, 8438],
  ['2026-11-03', 127, 4423], ['2026-11-04', 147, 5582], ['2026-11-05', 190, 6821], ['2026-11-06', 302, 12680], ['2026-11-07', 430, 14439],
  ['2026-11-08', 481, 17141], ['2026-11-09', 208, 5370], ['2026-11-10', 152, 4851], ['2026-11-11', 75, 1725], ['2026-11-12', 96, 2773],
  ['2026-11-13', 301, 13937], ['2026-11-14', 410, 20988], ['2026-11-15', 432, 24766], ['2026-11-16', 167, 8557], ['2026-11-17', 151, 6730],
  ['2026-11-18', 193, 9566]
];

const number = value => Number(value || 0);
const round1 = value => Math.round(value * 10) / 10;
const localDate = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date);
const daysAgo = count => localDate(new Date(Date.now() - count * 86400000));

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || body?.error_description || `HTTP ${response.status}`);
  return body;
}

async function googleAccessToken(refreshToken) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !refreshToken) {
    throw new Error('Credenciais Google pendentes');
  }
  const result = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken, grant_type: 'refresh_token'
    })
  });
  return result.access_token;
}

async function getYouTube() {
  const token = await googleAccessToken(process.env.YOUTUBE_REFRESH_TOKEN);
  const headers = { Authorization: `Bearer ${token}` };
  const report = params => jsonFetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({
    ids: `channel==${CHANNEL_ID}`, ...params
  })}`, { headers });
  const longForm = { filters: 'creatorContentType==VIDEO_ON_DEMAND' };
  const end = daysAgo(1);
  const [daily, yearly, channel] = await Promise.all([
    report({ ...longForm, startDate: daysAgo(90), endDate: end, dimensions: 'day,insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched', sort: 'day' }),
    report({ ...longForm, startDate: daysAgo(365), endDate: end, dimensions: 'insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched' }),
    jsonFetch(`https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({ part: 'statistics', id: CHANNEL_ID })}`, { headers })
      .catch(() => null)
  ]);
  const byDay = new Map();
  for (const [day, type, views, minutes] of daily.rows || []) {
    const row = byDay.get(day) || { day, organicHours: 0, paidHours: 0, organicViews: 0, paidViews: 0 };
    if (type === 'ADVERTISING') { row.paidHours += number(minutes) / 60; row.paidViews += number(views); }
    else { row.organicHours += number(minutes) / 60; row.organicViews += number(views); }
    byDay.set(day, row);
  }
  const sources = (yearly.rows || []).map(([type, views, minutes]) => ({ type, views: number(views), hours: round1(number(minutes) / 60) }))
    .sort((a, b) => b.hours - a.hours);
  const series = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
    .map(row => ({ ...row, organicHours: round1(row.organicHours), paidHours: round1(row.paidHours) }));
  return {
    series,
    sources365: sources,
    qualifiedHours: round1(sources.filter(row => row.type !== 'ADVERTISING').reduce((total, row) => total + row.hours, 0)),
    paidHours365: round1(sources.filter(row => row.type === 'ADVERTISING').reduce((total, row) => total + row.hours, 0)),
    through: series.at(-1)?.day || null,
    subscribers: channel?.items?.[0]?.statistics?.subscriberCount != null ? number(channel.items[0].statistics.subscriberCount) : null
  };
}

async function getAds() {
  if (!process.env.GOOGLE_ADS_CUSTOMER_ID) throw new Error('Credenciais Google Ads pendentes');
  const token = await googleAccessToken(process.env.GOOGLE_ADS_REFRESH_TOKEN);
  const customer = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  const from = daysAgo(90), to = daysAgo(1);
  const query = `SELECT campaign.name, campaign.status, campaign.advertising_channel_type, segments.date, metrics.impressions, metrics.clicks, metrics.video_trueview_views, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}' AND campaign.status != 'REMOVED'`;
  const chunks = await jsonFetch(`https://googleads.googleapis.com/v26/customers/${customer}/googleAds:searchStream`, {
    method: 'POST', headers, body: JSON.stringify({ query })
  });
  const rows = (Array.isArray(chunks) ? chunks : [chunks]).flatMap(chunk => chunk.results || [])
    .filter(row => row.campaign?.advertisingChannelType === 'VIDEO' || /\bYT\b|you\s?tube/i.test(row.campaign?.name || ''));
  const byDay = new Map();
  const campaigns = new Map();
  const weekStart = daysAgo(7);
  for (const row of rows) {
    const day = row.segments?.date;
    const m = row.metrics || {};
    const spend = number(m.costMicros) / 1e6;
    const point = byDay.get(day) || { day, spend: 0, views: 0, clicks: 0, impressions: 0 };
    point.spend += spend; point.views += number(m.videoTrueviewViews); point.clicks += number(m.clicks); point.impressions += number(m.impressions);
    byDay.set(day, point);
    if (day >= weekStart) {
      const name = row.campaign?.name || 'Campanha sem nome';
      const item = campaigns.get(name) || { name, status: row.campaign?.status || '', spend: 0, views: 0 };
      item.spend += spend; item.views += number(m.videoTrueviewViews);
      campaigns.set(name, item);
    }
  }
  return {
    series: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map(row => ({ ...row, spend: Math.round(row.spend * 100) / 100 })),
    campaigns7d: [...campaigns.values()].filter(item => item.spend > 0).sort((a, b) => b.spend - a.spend),
    through: to
  };
}

function snapshotYouTube() {
  const series = SNAPSHOT_YT.map(([day, total, paid, views, paidViews]) => ({
    day, organicHours: round1(Math.max(0, total - paid)), paidHours: paid,
    organicViews: Math.max(0, views - paidViews), paidViews
  }));
  return {
    series,
    sources365: [
      { type: 'ADVERTISING', hours: 1653.2 }, { type: 'PLAYLIST', hours: 249.2 }, { type: 'EXT_URL', hours: 189.0 },
      { type: 'YT_CHANNEL', hours: 19.4 }, { type: 'NO_LINK_OTHER', hours: 7.0 }, { type: 'SUBSCRIBER', hours: 6.1 },
      { type: 'YT_SEARCH', hours: 5.1 }, { type: 'RELATED_VIDEO', hours: 2.1 }, { type: 'YT_OTHER_PAGE', hours: 2.0 }
    ],
    qualifiedHours: round1(series.reduce((total, row) => total + row.organicHours, 0)),
    paidHours365: 1653.2,
    through: '2026-11-18',
    subscribers: 12157
  };
}

function snapshotAds() {
  return {
    series: SNAPSHOT_ADS.map(([day, spend, views]) => ({ day, spend, views, clicks: 0, impressions: 0 })),
    campaigns7d: [
      { name: '[CMP4] [EM] [ENGAJ] [YT] -Dente de leite - short', status: 'ENABLED', spend: 0, views: 21513 },
      { name: '[CMP1] [EM] [ENGAJ] [YT] - Borboleta - short', status: 'ENABLED', spend: 0, views: 18777 },
      { name: '[CMP7] [EM] [ENGAJ] [YT] - Átomos, Preguiça, Coração, planetas, petricor', status: 'ENABLED', spend: 0, views: 18650 },
      { name: '[CMP1] [EM] [ENGAJ] [YT] - De onde vem o vento', status: 'ENABLED', spend: 0, views: 7745 }
    ],
    through: '2026-11-18'
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido' });
  const [youtube, ads] = await Promise.allSettled([getYouTube(), getAds()]);
  const status = {
    youtube: youtube.status === 'fulfilled' ? 'live' : 'snapshot',
    ads: ads.status === 'fulfilled' ? 'live' : 'snapshot'
  };
  if (youtube.status === 'rejected') console.error(`youtube indisponível: ${youtube.reason?.message}`);
  if (ads.status === 'rejected') console.error(`ads indisponível: ${ads.reason?.message}`);
  response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
  return response.status(200).json({
    youtube: youtube.status === 'fulfilled' ? youtube.value : snapshotYouTube(),
    ads: ads.status === 'fulfilled' ? ads.value : snapshotAds(),
    status,
    reference: {
      officialQualifiedHours: 198, officialDate: '2026-11-14', shortsQualifiedViews: 33000,
      monthlyAudience: 201600, newViewersShare: 0.98, audienceWindow: '22/10 – 18/11/2026',
      playlistChangeDate: '2026-11-13', goalHours: 4000, deadline: '2027-02-01'
    },
    updatedAt: new Date().toISOString()
  });
}
