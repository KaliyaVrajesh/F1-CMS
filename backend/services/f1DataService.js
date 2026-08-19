/**
 * F1 Data Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates data from multiple free F1 APIs with in-memory caching.
 *
 * APIs Used:
 *  1. Jolpica F1 API           — https://api.jolpi.ca/ergast/f1
 *     Drop-in replacement for Ergast (which shut down end of 2024).
 *     Identical URL structure and response format. Free, no API key.
 *
 *  2. OpenF1 API               — https://openf1.org/
 *     Live/session telemetry: pit stops, intervals, car data, weather, radio
 *     Free, no API key, covers 2023+ sessions.
 *
 * Cache TTLs are tuned for the data's update frequency:
 *  - Schedule / static info  : 6 hours
 *  - Standings                : 10 minutes (live session) / 30 min (otherwise)
 *  - Race results             : 30 minutes
 *  - Live session data        : 30 seconds
 *  - Telemetry                : 15 seconds
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// ── Cache instances ───────────────────────────────────────────────────────────
const longCache   = new NodeCache({ stdTTL: 60 * 60 * 6,  checkperiod: 300 }); // 6h
const medCache    = new NodeCache({ stdTTL: 60 * 30,       checkperiod: 60  }); // 30m
const shortCache  = new NodeCache({ stdTTL: 60 * 10,       checkperiod: 30  }); // 10m
const liveCache   = new NodeCache({ stdTTL: 30,            checkperiod: 10  }); // 30s
const microCache  = new NodeCache({ stdTTL: 15,            checkperiod: 5   }); // 15s

// ── HTTP clients ──────────────────────────────────────────────────────────────
const ergast = axios.create({
  baseURL: 'https://api.jolpi.ca/ergast/f1',  // Jolpica: drop-in Ergast replacement (Ergast shut down end of 2024)
  timeout: 12000,
  headers: { 'Accept': 'application/json' },
});

const openf1 = axios.create({
  baseURL: 'https://api.openf1.org/v1',
  timeout: 10000,
  headers: { 'Accept': 'application/json' },
});

// ── Generic cached fetch ──────────────────────────────────────────────────────
async function cachedFetch(cache, key, fetchFn) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const data = await fetchFn();
  cache.set(key, data);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERGAST — helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Current F1 season year */
const currentYear = () => new Date().getFullYear();

/**
 * Current season race schedule with circuit details.
 */
async function getSchedule(year = currentYear()) {
  return cachedFetch(longCache, `schedule:${year}`, async () => {
    const { data } = await ergast.get(`/${year}.json`);
    const races = data?.MRData?.RaceTable?.Races || [];
    return races.map(r => ({
      round:       parseInt(r.round, 10),
      name:        r.raceName,
      circuitId:   r.Circuit.circuitId,
      circuitName: r.Circuit.circuitName,
      locality:    r.Circuit.Location.locality,
      country:     r.Circuit.Location.country,
      lat:         parseFloat(r.Circuit.Location.lat),
      lng:         parseFloat(r.Circuit.Location.long),
      date:        r.date,
      time:        r.time || null,
      // Sprint / qualifying sub-sessions when present
      qualifying:  r.Qualifying ? { date: r.Qualifying.date, time: r.Qualifying.time } : null,
      sprint:      r.Sprint      ? { date: r.Sprint.date,      time: r.Sprint.time      } : null,
    }));
  });
}

/**
 * Driver World Championship standings for a given season.
 */
async function getDriverStandings(year = currentYear()) {
  return cachedFetch(shortCache, `driverStandings:${year}`, async () => {
    const { data } = await ergast.get(`/${year}/driverStandings.json`);
    const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    return list.map(s => ({
      position:    parseInt(s.position, 10),
      points:      parseFloat(s.points),
      wins:        parseInt(s.wins, 10),
      driverId:    s.Driver.driverId,
      code:        s.Driver.code,
      number:      s.Driver.permanentNumber,
      firstName:   s.Driver.givenName,
      lastName:    s.Driver.familyName,
      nationality: s.Driver.nationality,
      dateOfBirth: s.Driver.dateOfBirth,
      url:         s.Driver.url,
      constructor: s.Constructors?.[0]?.name || null,
      constructorId: s.Constructors?.[0]?.constructorId || null,
    }));
  });
}

/**
 * Constructor World Championship standings for a given season.
 */
async function getConstructorStandings(year = currentYear()) {
  return cachedFetch(shortCache, `constructorStandings:${year}`, async () => {
    const { data } = await ergast.get(`/${year}/constructorStandings.json`);
    const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
    return list.map(s => ({
      position:      parseInt(s.position, 10),
      points:        parseFloat(s.points),
      wins:          parseInt(s.wins, 10),
      constructorId: s.Constructor.constructorId,
      name:          s.Constructor.name,
      nationality:   s.Constructor.nationality,
    }));
  });
}

/**
 * Full race results for a specific round.
 */
async function getRaceResults(year = currentYear(), round) {
  return cachedFetch(medCache, `raceResults:${year}:${round}`, async () => {
    const { data } = await ergast.get(`/${year}/${round}/results.json`);
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
      round:       parseInt(race.round, 10),
      name:        race.raceName,
      date:        race.date,
      circuitName: race.Circuit.circuitName,
      country:     race.Circuit.Location.country,
      results: race.Results.map(r => ({
        position:     parseInt(r.position, 10),
        positionText: r.positionText,
        points:       parseFloat(r.points),
        grid:         parseInt(r.grid, 10),
        laps:         parseInt(r.laps, 10),
        status:       r.status,
        time:         r.Time?.time || null,
        fastestLap:   r.FastestLap ? {
          rank:  parseInt(r.FastestLap.rank, 10),
          lap:   parseInt(r.FastestLap.lap, 10),
          time:  r.FastestLap.Time?.time || null,
          speed: r.FastestLap.AverageSpeed?.speed || null,
        } : null,
        driver: {
          driverId:    r.Driver.driverId,
          code:        r.Driver.code,
          number:      r.Driver.permanentNumber,
          firstName:   r.Driver.givenName,
          lastName:    r.Driver.familyName,
          nationality: r.Driver.nationality,
        },
        constructor: {
          constructorId: r.Constructor.constructorId,
          name:          r.Constructor.name,
          nationality:   r.Constructor.nationality,
        },
      })),
    };
  });
}

/**
 * Qualifying results for a specific round.
 */
async function getQualifyingResults(year = currentYear(), round) {
  return cachedFetch(medCache, `qualifying:${year}:${round}`, async () => {
    const { data } = await ergast.get(`/${year}/${round}/qualifying.json`);
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
      round:       parseInt(race.round, 10),
      name:        race.raceName,
      date:        race.date,
      results: race.QualifyingResults.map(r => ({
        position: parseInt(r.position, 10),
        q1:       r.Q1 || null,
        q2:       r.Q2 || null,
        q3:       r.Q3 || null,
        driver: {
          driverId:  r.Driver.driverId,
          code:      r.Driver.code,
          firstName: r.Driver.givenName,
          lastName:  r.Driver.familyName,
        },
        constructor: {
          constructorId: r.Constructor.constructorId,
          name:          r.Constructor.name,
        },
      })),
    };
  });
}

/**
 * Last completed race results (convenience).
 */
async function getLastRaceResults() {
  return cachedFetch(shortCache, 'lastRaceResults', async () => {
    const { data } = await ergast.get('/current/last/results.json');
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
      round:       parseInt(race.round, 10),
      name:        race.raceName,
      date:        race.date,
      circuitName: race.Circuit.circuitName,
      country:     race.Circuit.Location.country,
      results: race.Results.map(r => ({
        position:    parseInt(r.position, 10),
        points:      parseFloat(r.points),
        status:      r.status,
        time:        r.Time?.time || null,
        fastestLap:  r.FastestLap?.Time?.time || null,
        driver: {
          driverId:  r.Driver.driverId,
          code:      r.Driver.code,
          number:    r.Driver.permanentNumber,
          firstName: r.Driver.givenName,
          lastName:  r.Driver.familyName,
        },
        constructor: r.Constructor.name,
      })),
    };
  });
}

/**
 * Next upcoming race on the calendar.
 */
async function getNextRace() {
  return cachedFetch(longCache, `nextRace:${currentYear()}`, async () => {
    const { data } = await ergast.get('/current/next.json');
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
      round:       parseInt(race.round, 10),
      name:        race.raceName,
      circuitId:   race.Circuit.circuitId,
      circuitName: race.Circuit.circuitName,
      locality:    race.Circuit.Location.locality,
      country:     race.Circuit.Location.country,
      lat:         parseFloat(race.Circuit.Location.lat),
      lng:         parseFloat(race.Circuit.Location.long),
      date:        race.date,
      time:        race.time || null,
      firstPractice: race.FirstPractice ? { date: race.FirstPractice.date, time: race.FirstPractice.time } : null,
      secondPractice: race.SecondPractice ? { date: race.SecondPractice.date, time: race.SecondPractice.time } : null,
      thirdPractice: race.ThirdPractice ? { date: race.ThirdPractice.date, time: race.ThirdPractice.time } : null,
      sprintQualifying: race.SprintQualifying ? { date: race.SprintQualifying.date, time: race.SprintQualifying.time } : null,
      sprint:      race.Sprint      ? { date: race.Sprint.date,     time: race.Sprint.time     } : null,
      qualifying:  race.Qualifying ? { date: race.Qualifying.date, time: race.Qualifying.time } : null,
    };
  });
}

/**
 * Driver career stats (all-time wins, podiums, poles via multiple queries).
 */
async function getDriverCareerStats(driverId) {
  return cachedFetch(longCache, `driverCareer:${driverId}`, async () => {
    const [wins, poles, podiums] = await Promise.allSettled([
      ergast.get(`/drivers/${driverId}/results/1.json?limit=1`),
      ergast.get(`/drivers/${driverId}/qualifying/1.json?limit=1`),
      ergast.get(`/drivers/${driverId}/results.json?limit=1`),
    ]);

    return {
      driverId,
      wins:    parseInt(wins.status === 'fulfilled'    ? wins.value.data?.MRData?.total    || 0 : 0, 10),
      poles:   parseInt(poles.status === 'fulfilled'   ? poles.value.data?.MRData?.total   || 0 : 0, 10),
      entries: parseInt(podiums.status === 'fulfilled' ? podiums.value.data?.MRData?.total || 0 : 0, 10),
    };
  });
}

/**
 * Lap times for a specific race.
 */
async function getLapTimes(year = currentYear(), round, lap = 'all') {
  const key = `laps:${year}:${round}:${lap}`;
  return cachedFetch(medCache, key, async () => {
    const url = lap === 'all'
      ? `/${year}/${round}/laps.json?limit=2000`
      : `/${year}/${round}/laps/${lap}.json`;
    const { data } = await ergast.get(url);
    return data?.MRData?.RaceTable?.Races?.[0]?.Laps || [];
  });
}

/**
 * Pit stop data for a specific race.
 */
async function getPitStops(year = currentYear(), round) {
  return cachedFetch(medCache, `pitStops:${year}:${round}`, async () => {
    const { data } = await ergast.get(`/${year}/${round}/pitstops.json?limit=200`);
    const race = data?.MRData?.RaceTable?.Races?.[0];
    return race?.PitStops || [];
  });
}

/**
 * All circuits that have hosted an F1 race (optionally filtered by season).
 * Returns deduplicated by circuitId with full location data.
 */
async function getCircuits(year = null) {
  const key = `circuits:${year || 'all'}`;
  return cachedFetch(longCache, key, async () => {
    const url = year
      ? `/${year}/circuits.json?limit=30`
      : '/circuits.json?limit=100';
    const { data } = await ergast.get(url);
    const circuits = data?.MRData?.CircuitTable?.Circuits || [];
    return circuits.map(c => ({
      circuitId:   c.circuitId,
      name:        c.circuitName,
      locality:    c.Location.locality,
      country:     c.Location.country,
      lat:         parseFloat(c.Location.lat),
      lng:         parseFloat(c.Location.long),
      url:         c.url,
    }));
  });
}

/**
 * Current season schedule enriched with circuit + last race result.
 * This is what the CircuitsMap page needs: one entry per race, with coords.
 */
async function getCurrentSeasonCircuits(year = currentYear()) {
  const key = `seasonCircuits:${year}`;
  return cachedFetch(longCache, key, async () => {
    const { data } = await ergast.get(`/${year}.json?limit=30`);
    const races = data?.MRData?.RaceTable?.Races || [];
    return races.map(r => ({
      round:       parseInt(r.round, 10),
      name:        r.raceName,
      circuitId:   r.Circuit.circuitId,
      circuitName: r.Circuit.circuitName,
      locality:    r.Circuit.Location.locality,
      country:     r.Circuit.Location.country,
      lat:         parseFloat(r.Circuit.Location.lat),
      lng:         parseFloat(r.Circuit.Location.long),
      date:        r.date,
      time:        r.time || null,
      season:      parseInt(r.season, 10),
    }));
  });
}

/**
 * Season list (all years F1 has run) - paginates to get all results.
 */
async function getAllSeasons() {
  return cachedFetch(longCache, 'allSeasons', async () => {
    const limit = 100;
    const { data: first } = await ergast.get(`/seasons.json?limit=${limit}&offset=0`);
    const total = parseInt(first?.MRData?.total || '0', 10);
    let seasons = [...(first?.MRData?.SeasonTable?.Seasons || [])];

    // Fetch remaining pages if total > 100
    const pages = Math.ceil(total / limit);
    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          ergast.get(`/seasons.json?limit=${limit}&offset=${(i + 1) * limit}`)
        )
      );
      for (const { data } of rest) {
        seasons = seasons.concat(data?.MRData?.SeasonTable?.Seasons || []);
      }
    }

    return seasons
      .map(s => parseInt(s.season, 10))
      .sort((a, b) => b - a); // newest first
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENF1 — Live session data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Latest session info (current or most recent).
 */
async function getLatestSession() {
  return cachedFetch(liveCache, 'openf1:latestSession', async () => {
    const { data } = await openf1.get('/sessions?session_key=latest');
    return data?.[0] || null;
  });
}

/**
 * Live/recent driver positions (race or practice).
 */
async function getLivePositions(sessionKey = 'latest') {
  return cachedFetch(microCache, `openf1:positions:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/position?session_key=${sessionKey}`);
    // Return only the latest position per driver
    const byDriver = {};
    for (const entry of (data || [])) {
      const key = entry.driver_number;
      if (!byDriver[key] || entry.date > byDriver[key].date) {
        byDriver[key] = entry;
      }
    }
    return Object.values(byDriver).sort((a, b) => a.position - b.position);
  });
}

/**
 * Live intervals (gaps between drivers) for current session.
 */
async function getLiveIntervals(sessionKey = 'latest') {
  return cachedFetch(microCache, `openf1:intervals:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/intervals?session_key=${sessionKey}`);
    const byDriver = {};
    for (const entry of (data || [])) {
      const key = entry.driver_number;
      if (!byDriver[key] || entry.date > byDriver[key].date) {
        byDriver[key] = entry;
      }
    }
    return Object.values(byDriver);
  });
}

/**
 * Pit stop data from OpenF1 (live-granular, covers 2023+).
 */
async function getLivePitStops(sessionKey = 'latest') {
  return cachedFetch(liveCache, `openf1:pitstops:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/pit?session_key=${sessionKey}`);
    return data || [];
  });
}

/**
 * Session weather data.
 */
async function getSessionWeather(sessionKey = 'latest') {
  return cachedFetch(liveCache, `openf1:weather:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/weather?session_key=${sessionKey}`);
    // Return most recent weather reading
    return data?.length ? data[data.length - 1] : null;
  });
}

/**
 * Stints (tyre usage) per driver for a session.
 */
async function getStints(sessionKey = 'latest') {
  return cachedFetch(liveCache, `openf1:stints:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/stints?session_key=${sessionKey}`);
    return data || [];
  });
}

/**
 * Driver radio messages for a session.
 */
async function getTeamRadio(sessionKey = 'latest') {
  return cachedFetch(liveCache, `openf1:radio:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/team_radio?session_key=${sessionKey}`);
    return (data || []).slice(-50); // last 50 messages
  });
}

/**
 * Current tyre info (latest stint) per driver.
 */
async function getCurrentTyres(sessionKey = 'latest') {
  return cachedFetch(microCache, `openf1:tyres:${sessionKey}`, async () => {
    const stints = await getStints(sessionKey);
    const byDriver = {};
    for (const s of stints) {
      const key = s.driver_number;
      if (!byDriver[key] || s.stint_number > byDriver[key].stint_number) {
        byDriver[key] = s;
      }
    }
    return Object.values(byDriver);
  });
}

/**
 * Available OpenF1 sessions for a given year/event.
 */
async function getSessions(year = currentYear(), grandPrixName = null) {
  const key = `openf1:sessions:${year}:${grandPrixName || 'all'}`;
  return cachedFetch(longCache, key, async () => {
    const params = new URLSearchParams({ year });
    if (grandPrixName) params.set('country_name', grandPrixName);
    const { data } = await openf1.get(`/sessions?${params}`);
    return data || [];
  });
}

/**
 * Driver number → name mapping from OpenF1 (current season).
 */
async function getOpenF1Drivers(sessionKey = 'latest') {
  return cachedFetch(longCache, `openf1:drivers:${sessionKey}`, async () => {
    const { data } = await openf1.get(`/drivers?session_key=${sessionKey}`);
    const map = {};
    for (const d of (data || [])) {
      map[d.driver_number] = {
        number:      d.driver_number,
        code:        d.name_acronym,
        firstName:   d.first_name,
        lastName:    d.last_name,
        teamName:    d.team_name,
        teamColour:  d.team_colour ? `#${d.team_colour}` : null,
        country:     d.country_code,
        headshotUrl: d.headshot_url,
      };
    }
    return map;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Compound: Live dashboard snapshot
// Combines latest race + next race + current standings + live session
// ─────────────────────────────────────────────────────────────────────────────
async function getDashboardSnapshot() {
  return cachedFetch(shortCache, 'dashboardSnapshot', async () => {
    const [schedule, driverStandings, constructorStandings, lastRace, nextRace, latestSession] =
      await Promise.allSettled([
        getSchedule(),
        getDriverStandings(),
        getConstructorStandings(),
        getLastRaceResults(),
        getNextRace(),
        getLatestSession(),
      ]);

    return {
      season:               currentYear(),
      schedule:             schedule.status             === 'fulfilled' ? schedule.value             : [],
      driverStandings:      driverStandings.status      === 'fulfilled' ? driverStandings.value      : [],
      constructorStandings: constructorStandings.status === 'fulfilled' ? constructorStandings.value : [],
      lastRace:             lastRace.status             === 'fulfilled' ? lastRace.value             : null,
      nextRace:             nextRace.status             === 'fulfilled' ? nextRace.value             : null,
      latestSession:        latestSession.status        === 'fulfilled' ? latestSession.value        : null,
    };
  });
}

// ── Cache management ──────────────────────────────────────────────────────────
function getCacheStats() {
  return {
    long:  longCache.getStats(),
    med:   medCache.getStats(),
    short: shortCache.getStats(),
    live:  liveCache.getStats(),
    micro: microCache.getStats(),
  };
}

function clearCache(tier = 'all') {
  if (tier === 'all' || tier === 'long')  longCache.flushAll();
  if (tier === 'all' || tier === 'med')   medCache.flushAll();
  if (tier === 'all' || tier === 'short') shortCache.flushAll();
  if (tier === 'all' || tier === 'live')  liveCache.flushAll();
  if (tier === 'all' || tier === 'micro') microCache.flushAll();
}

module.exports = {
  // Ergast / Jolpica
  getSchedule,
  getCircuits,
  getCurrentSeasonCircuits,
  getDriverStandings,
  getConstructorStandings,
  getRaceResults,
  getQualifyingResults,
  getLastRaceResults,
  getNextRace,
  getDriverCareerStats,
  getLapTimes,
  getPitStops,
  getAllSeasons,
  // OpenF1
  getLatestSession,
  getLivePositions,
  getLiveIntervals,
  getLivePitStops,
  getSessionWeather,
  getStints,
  getTeamRadio,
  getCurrentTyres,
  getSessions,
  getOpenF1Drivers,
  // Compound
  getDashboardSnapshot,
  // Cache
  getCacheStats,
  clearCache,
};
