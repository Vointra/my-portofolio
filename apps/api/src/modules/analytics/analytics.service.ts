import { createHmac } from 'node:crypto';
import Bowser from 'bowser';
import type { Document } from 'mongodb';
import { mongo } from '../../db.js';
import { config } from '../../config.js';

type Visit = {
  ts: Date;
  path: string;
  referrer: string | null;
  visitorId: string;
  ua: { browser: string; os: string; device: string };
};

const visits = () => mongo.db().collection<Visit>('visits');

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|preview/i;
const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' menurut waktu Jakarta
const jakartaDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

function normalizePath(raw: string): string {
  const clean = raw.split(/[?#]/)[0].slice(0, 200) || '/';
  return clean.length > 1 ? clean.replace(/\/+$/, '') || '/' : clean;
}

function referrerHost(raw?: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function parseUA(raw: string) {
  const r = Bowser.parse(raw);
  return {
    browser: r.browser.name ?? 'unknown',
    os: r.os.name ?? 'unknown',
    device: r.platform.type ?? 'unknown',
  };
}

export async function recordVisit(input: {
  path: string;
  referrer?: string;
  ip: string;
  userAgent?: string;
}): Promise<void> {
  const userAgent = input.userAgent ?? '';
  if (!userAgent || BOT_RE.test(userAgent)) return; // diam-diam diabaikan

  const visitorId = createHmac('sha256', config.analyticsSalt)
    .update(`${jakartaDate(new Date())}|${input.ip}|${userAgent}`)
    .digest('hex')
    .slice(0, 32);

  await visits().insertOne({
    ts: new Date(), // harus tipe Date agar TTL index bekerja
    path: normalizePath(input.path),
    referrer: referrerHost(input.referrer),
    visitorId,
    ua: parseUA(userAgent),
  });
}

type Counted = { views: number };
type Summary = {
  byDay: { date: string; views: number; visitors: number }[];
  topPages: (Counted & { path: string })[];
  topReferrers: (Counted & { referrer: string })[];
  browsers: (Counted & { name: string })[];
  os: (Counted & { name: string })[];
  devices: (Counted & { name: string })[];
};

const breakdown = (field: string): Document[] => [
  { $group: { _id: field, views: { $sum: 1 } } },
  { $sort: { views: -1 } },
  { $limit: 10 },
  { $project: { _id: 0, name: '$_id', views: 1 } },
];

export async function getSummary(days: number) {
  // Awal hari ini (00:00 WIB), mundur (days - 1) hari
  const [y, m, d] = jakartaDate(new Date()).split('-').map(Number);
  const since = new Date(Date.UTC(y, m - 1, d) - WIB_MS - (days - 1) * DAY_MS);

  const pipeline: Document[] = [
    { $match: { ts: { $gte: since } } },
    {
      $facet: {
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$ts', timezone: 'Asia/Jakarta' } },
              views: { $sum: 1 },
              visitors: { $addToSet: '$visitorId' },
            },
          },
          { $project: { _id: 0, date: '$_id', views: 1, visitors: { $size: '$visitors' } } },
        ],
        topPages: [
          { $group: { _id: '$path', views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, path: '$_id', views: 1 } },
        ],
        topReferrers: [
          { $match: { referrer: { $ne: null } } },
          { $group: { _id: '$referrer', views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, referrer: '$_id', views: 1 } },
        ],
        browsers: breakdown('$ua.browser'),
        os: breakdown('$ua.os'),
        devices: breakdown('$ua.device'),
      },
    },
  ];

  const [res] = await visits().aggregate<Summary>(pipeline).toArray();

  const byDay = new Map(res.byDay.map((x) => [x.date, x]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = jakartaDate(new Date(since.getTime() + i * DAY_MS));
    const row = byDay.get(date);
    return { date, views: row?.views ?? 0, visitors: row?.visitors ?? 0 };
  });

  return {
    range: { days, since: since.toISOString() },
    totals: {
      pageviews: daily.reduce((s, x) => s + x.views, 0),
      dailyUniqueVisitors: daily.reduce((s, x) => s + x.visitors, 0),
    },
    daily,
    topPages: res.topPages,
    topReferrers: res.topReferrers,
    browsers: res.browsers,
    os: res.os,
    devices: res.devices,
  };
}
