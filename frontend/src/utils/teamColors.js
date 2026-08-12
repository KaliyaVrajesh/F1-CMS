/**
 * Formula 1 Team & Driver Color and Information Engine
 * Handles modern (2026, 2025, 2024, etc.) & historical team liveries,
 * constructor IDs, display names, and driver names.
 */

export const TEAM_COLORS = {
  // Mercedes
  mercedes: '#27F4D2',
  mercedes_amg: '#27F4D2',
  mercedes_amg_petronas: '#27F4D2',
  
  // Ferrari
  ferrari: '#E8002D',
  scuderia_ferrari: '#E8002D',
  
  // McLaren
  mclaren: '#FF8000',
  mclaren_f1: '#FF8000',
  
  // Red Bull
  red_bull: '#3671C6',
  redbull: '#3671C6',
  red_bull_racing: '#3671C6',
  
  // Aston Martin
  aston_martin: '#229971',
  aston_martin_aramco: '#229971',
  aston: '#229971',
  
  // Alpine
  alpine: '#0093CC',
  alpine_f1_team: '#0093CC',
  
  // Williams
  williams: '#64C4FF',
  williams_racing: '#64C4FF',
  
  // RB / VCARB / AlphaTauri / Toro Rosso
  rb: '#6692FF',
  vcarb: '#6692FF',
  racing_bulls: '#6692FF',
  visa_cash_app_rb: '#6692FF',
  alphatauri: '#5E8FAA',
  toro_rosso: '#469BFF',
  
  // Kick Sauber / Audi / Alfa Romeo
  kick_sauber: '#52E252',
  stake_f1_team: '#52E252',
  stake_f1_team_kick_sauber: '#52E252',
  sauber: '#52E252',
  kick: '#52E252',
  audi: '#E00400',
  alfa_romeo: '#C92D4B',
  alfa: '#C92D4B',
  
  // Haas
  haas: '#B6BABD',
  haas_f1_team: '#B6BABD',
  moneygram_haas: '#B6BABD',
  
  // Historical
  renault: '#FFF500',
  lotus: '#FFB800',
  brawn: '#BFFF00',
  benetton: '#00A859',
  jordan: '#FFE000',
  tyrrell: '#002D72',
  brabham: '#0047AB',
  force_india: '#F596C7',
  racing_point: '#F596C7',
  marussia: '#E03A3E',
  manor: '#E03A3E',
  caterham: '#00502F',
  minardi: '#FF8800',
  super_aguri: '#E10600',
  toyota: '#E10600',
  honda: '#FFFFFF',
  bmw_sauber: '#002B49',
  jaguar: '#00553A',
  arrows: '#FF6600',
  prost: '#002D72',
  stewart: '#FFFFFF',
  ligier: '#002D72',
  march: '#00A859',
  shadow: '#555555',
  hesketh: '#FFFFFF',
  matra: '#002D72',
  cooper: '#004225',
  vanwall: '#004225',
  brm: '#004225',
  maserati: '#CC0000',
  lancia: '#800000',
};

export const TEAM_NAMES = {
  mercedes: 'Mercedes',
  ferrari: 'Ferrari',
  mclaren: 'McLaren',
  red_bull: 'Red Bull',
  redbull: 'Red Bull',
  red_bull_racing: 'Red Bull',
  aston_martin: 'Aston Martin',
  aston: 'Aston Martin',
  alpine: 'Alpine',
  williams: 'Williams',
  rb: 'RB',
  vcarb: 'RB',
  racing_bulls: 'RB',
  visa_cash_app_rb: 'RB',
  alphatauri: 'AlphaTauri',
  toro_rosso: 'Toro Rosso',
  kick_sauber: 'Kick Sauber',
  stake_f1_team: 'Kick Sauber',
  sauber: 'Sauber',
  alfa_romeo: 'Alfa Romeo',
  alfa: 'Alfa Romeo',
  haas: 'Haas',
  haas_f1_team: 'Haas',
  racing_point: 'Racing Point',
  force_india: 'Force India',
  renault: 'Renault',
  lotus: 'Lotus',
  brawn: 'Brawn GP',
  benetton: 'Benetton',
  jordan: 'Jordan',
  tyrrell: 'Tyrrell',
  brabham: 'Brabham',
  marussia: 'Marussia',
  manor: 'Manor',
  caterham: 'Caterham',
  bmw_sauber: 'BMW Sauber',
  toyota: 'Toyota',
  jaguar: 'Jaguar',
  minardi: 'Minardi',
  prost: 'Prost',
  arrows: 'Arrows',
  stewart: 'Stewart',
  ligier: 'Ligier',
  march: 'March',
  shadow: 'Shadow',
  hesketh: 'Hesketh',
  matra: 'Matra',
  cooper: 'Cooper',
  vanwall: 'Vanwall',
  brm: 'BRM',
  maserati: 'Maserati',
  lancia: 'Lancia',
};

// Driver name substrings mapped to livery colors
export const DRIVER_COLORS = {
  // Mercedes
  antonelli: '#27F4D2',
  kimi: '#27F4D2',
  russell: '#27F4D2',
  
  // Ferrari
  hamilton: '#E8002D',
  leclerc: '#E8002D',
  
  // McLaren
  norris: '#FF8000',
  piastri: '#FF8000',
  
  // Red Bull
  verstappen: '#3671C6',
  lawson: '#3671C6',
  perez: '#3671C6',
  
  // Aston Martin
  alonso: '#229971',
  stroll: '#229971',
  
  // Williams
  sainz: '#64C4FF',
  albon: '#64C4FF',
  colapinto: '#64C4FF',
  sargeant: '#64C4FF',
  
  // Alpine
  gasly: '#0093CC',
  doohan: '#0093CC',
  
  // Haas
  bearman: '#B6BABD',
  ocon: '#B6BABD',
  magnussen: '#B6BABD',
  
  // Kick Sauber / Audi
  hulkenberg: '#52E252',
  bortoleto: '#52E252',
  bottas: '#52E252',
  zhou: '#52E252',
  
  // RB (VCARB)
  tsunoda: '#6692FF',
  hadjar: '#6692FF',
  ricciardo: '#6692FF',
  devries: '#6692FF',
};

// Driver name substrings mapped to default Team Names
export const DRIVER_TEAMS = {
  antonelli: 'Mercedes',
  russell: 'Mercedes',
  hamilton: 'Mercedes',
  leclerc: 'Ferrari',
  norris: 'McLaren',
  piastri: 'McLaren',
  verstappen: 'Red Bull',
  lawson: 'Red Bull',
  perez: 'Red Bull',
  alonso: 'Aston Martin',
  stroll: 'Aston Martin',
  sainz: 'Ferrari',
  albon: 'Williams',
  colapinto: 'Williams',
  gasly: 'Alpine',
  doohan: 'Alpine',
  bearman: 'Haas',
  ocon: 'Haas',
  magnussen: 'Haas',
  hulkenberg: 'Kick Sauber',
  bortoleto: 'Kick Sauber',
  bottas: 'Kick Sauber',
  zhou: 'Kick Sauber',
  tsunoda: 'RB',
  hadjar: 'RB',
  ricciardo: 'RB',
  vettel: 'Aston Martin',
  raikkonen: 'Alfa Romeo',
  latifi: 'Williams',
  mazepin: 'Haas',
  mick_schumacher: 'Haas',
  schumacher: 'Ferrari',
  senna: 'McLaren',
  mansell: 'Williams',
  piquet: 'Williams',
  lauda: 'Ferrari',
  hunt: 'McLaren',
  fangio: 'Mercedes',
  clark: 'Lotus',
};

/**
 * Intelligent team color resolver.
 * @param {string|object} team - Constructor ID, team name, or object with name/_id
 * @param {string|object} driver - Driver name, driverId, or code
 * @param {string} fallback - Default fallback color if unresolvable
 * @returns {string} HEX color string
 */
export function getTeamColor(team, driver = null, fallback = '#E10600') {
  let rawTeam = '';
  if (typeof team === 'string') {
    rawTeam = team;
  } else if (team && typeof team === 'object') {
    rawTeam = team.name || team._id || team.constructorId || '';
  }

  const teamSlug = rawTeam.toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (teamSlug && TEAM_COLORS[teamSlug]) {
    return TEAM_COLORS[teamSlug];
  }

  // Fuzzy substring check for team name
  if (teamSlug) {
    if (teamSlug.includes('mercedes')) return TEAM_COLORS.mercedes;
    if (teamSlug.includes('ferrari')) return TEAM_COLORS.ferrari;
    if (teamSlug.includes('mclaren')) return TEAM_COLORS.mclaren;
    if (teamSlug.includes('red_bull') || teamSlug.includes('redbull')) return TEAM_COLORS.red_bull;
    if (teamSlug.includes('aston')) return TEAM_COLORS.aston_martin;
    if (teamSlug.includes('alpine')) return TEAM_COLORS.alpine;
    if (teamSlug.includes('williams')) return TEAM_COLORS.williams;
    if (teamSlug.includes('kick') || teamSlug.includes('sauber') || teamSlug.includes('stake') || teamSlug.includes('audi')) return TEAM_COLORS.kick_sauber;
    if (teamSlug.includes('haas')) return TEAM_COLORS.haas;
    if (teamSlug.includes('rb') || teamSlug.includes('vcarb') || teamSlug.includes('racing_bull') || teamSlug.includes('alphatauri') || teamSlug.includes('toro')) return TEAM_COLORS.rb;
    if (teamSlug.includes('alfa')) return TEAM_COLORS.alfa_romeo;
    if (teamSlug.includes('renault')) return TEAM_COLORS.renault;
    if (teamSlug.includes('lotus')) return TEAM_COLORS.lotus;
    if (teamSlug.includes('brawn')) return TEAM_COLORS.brawn;
    if (teamSlug.includes('benetton')) return TEAM_COLORS.benetton;
    if (teamSlug.includes('jordan')) return TEAM_COLORS.jordan;
    if (teamSlug.includes('force_india') || teamSlug.includes('racing_point')) return TEAM_COLORS.force_india;
  }

  // Check driver fallback mapping
  let rawDriver = '';
  if (typeof driver === 'string') {
    rawDriver = driver;
  } else if (driver && typeof driver === 'object') {
    rawDriver = `${driver.firstName || ''} ${driver.lastName || ''} ${driver.name || ''} ${driver.driverId || ''}`;
  }

  const driverSlug = rawDriver.toLowerCase().trim();
  if (driverSlug) {
    for (const [key, color] of Object.entries(DRIVER_COLORS)) {
      if (driverSlug.includes(key)) {
        return color;
      }
    }
  }

  return fallback;
}

/**
 * Intelligent team name resolver.
 * Ensures team name is never empty or missing across any season.
 */
export function getTeamName(team, driver = null) {
  let rawTeam = '';
  if (typeof team === 'string') {
    rawTeam = team;
  } else if (team && typeof team === 'object') {
    rawTeam = team.name || team._id || team.constructorId || '';
  }

  if (rawTeam && typeof rawTeam === 'string' && !rawTeam.includes('function Object') && !rawTeam.includes('[object')) {
    const teamSlug = rawTeam.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (TEAM_NAMES[teamSlug]) return TEAM_NAMES[teamSlug];
    if (teamSlug.includes('mercedes')) return 'Mercedes';
    if (teamSlug.includes('ferrari')) return 'Ferrari';
    if (teamSlug.includes('mclaren')) return 'McLaren';
    if (teamSlug.includes('red_bull') || teamSlug.includes('redbull')) return 'Red Bull';
    if (teamSlug.includes('aston')) return 'Aston Martin';
    if (teamSlug.includes('alpine')) return 'Alpine';
    if (teamSlug.includes('williams')) return 'Williams';
    if (teamSlug.includes('kick') || teamSlug.includes('sauber') || teamSlug.includes('stake')) return 'Kick Sauber';
    if (teamSlug.includes('haas')) return 'Haas';
    if (teamSlug.includes('rb') || teamSlug.includes('vcarb')) return 'RB';
    if (teamSlug.includes('racing_point')) return 'Racing Point';
    if (teamSlug.includes('force_india')) return 'Force India';
    if (teamSlug.includes('renault')) return 'Renault';
    if (teamSlug.includes('alphatauri')) return 'AlphaTauri';
    if (teamSlug.includes('toro_rosso')) return 'Toro Rosso';
    if (teamSlug.includes('alfa_romeo') || teamSlug.includes('alfa')) return 'Alfa Romeo';
    return rawTeam;
  }

  // Driver fallback
  let rawDriver = '';
  if (typeof driver === 'string') {
    rawDriver = driver;
  } else if (driver && typeof driver === 'object') {
    rawDriver = `${driver.firstName || ''} ${driver.lastName || ''} ${driver.name || ''} ${driver.driverId || ''}`;
  }

  const driverSlug = rawDriver.toLowerCase().trim();
  if (driverSlug) {
    for (const [key, name] of Object.entries(DRIVER_TEAMS)) {
      if (driverSlug.includes(key)) {
        return name;
      }
    }
  }

  return '';
}

/**
 * Generate photo URL candidate for a driver.
 */
export function getDriverPhotoUrl(driver) {
  if (typeof driver === 'string') {
    const slug = driver.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return `/images/drivers/${slug}.png`;
  }
  if (driver?.imageUrl) return driver.imageUrl;
  const name = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || driver?.name || driver?._id || '';
  const slug = name.toLowerCase().replace(/[\s-]+/g, '_');
  return `/images/drivers/${slug}.png`;
}

/**
 * Generate logo URL candidate for a team.
 */
export function getTeamLogoUrl(team) {
  if (typeof team === 'string') {
    const slug = team.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return `/images/teams/${slug}.png`;
  }
  if (team?.logoUrl) return team.logoUrl;
  const name = team?.name || team?._id || team?.constructorId || '';
  const slug = name.toLowerCase().replace(/[\s-]+/g, '_');
  return `/images/teams/${slug}.png`;
}
