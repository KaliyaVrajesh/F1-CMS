import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://f1cms-backend.onrender.com/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);

// Posts API
export const getPosts = () => api.get('/posts');
export const getPostById = (id) => api.get(`/posts/${id}`);
export const createPost = (postData) => api.post('/posts', postData);
export const updatePost = (id, postData) => api.put(`/posts/${id}`, postData);
export const deletePost = (id) => api.delete(`/posts/${id}`);

// Drivers API
export const getDrivers = () => api.get('/drivers');
export const getDriverById = (id) => api.get(`/drivers/${id}`);
export const createDriver = (driverData) => api.post('/drivers', driverData);
export const updateDriver = (id, driverData) => api.put(`/drivers/${id}`, driverData);
export const deleteDriver = (id) => api.delete(`/drivers/${id}`);

// Constructors API
export const getConstructors = () => api.get('/constructors');
export const getConstructorById = (id) => api.get(`/constructors/${id}`);
export const createConstructor = (constructorData) => api.post('/constructors', constructorData);
export const updateConstructor = (id, constructorData) => api.put(`/constructors/${id}`, constructorData);
export const deleteConstructor = (id) => api.delete(`/constructors/${id}`);

// Seasons API
export const getSeasons = () => api.get('/seasons');
export const getSeasonByYear = (year) => api.get(`/seasons/${year}`);
export const createSeason = (seasonData) => api.post('/seasons', seasonData);

// Races API
export const getRaces = () => api.get('/races');
export const getRaceById = (id) => api.get(`/races/${id}`);
export const createRace = (raceData) => api.post('/races', raceData);
export const updateRace = (id, raceData) => api.put(`/races/${id}`, raceData);
export const submitRaceResults = (raceId, results) => api.post(`/races/${raceId}/results`, results);
export const updateRaceResults = (raceId, results) => api.put(`/races/${raceId}/results`, results);

// Standings API
export const getDriverStandings = (seasonYear) => api.get(`/standings/drivers/${seasonYear}`);
export const getConstructorStandings = (seasonYear) => api.get(`/standings/constructors/${seasonYear}`);

// Legends image overrides API
export const getLegendImages = () => api.get('/legends');
export const updateLegendImages = (legendId, data) => api.put(`/legends/${legendId}`, data);

// ── F1 Live Data API (Ergast + OpenF1 proxied through backend) ────────────────

// Schedule & seasons
export const getF1Schedule = (year) =>
  api.get('/f1/schedule', { params: year ? { year } : {} });
export const getF1AllSeasons = () => api.get('/f1/seasons');
export const getF1NextRace   = () => api.get('/f1/next-race');

// Circuits
export const getF1Circuits             = (year) =>
  api.get('/f1/circuits', { params: year ? { year } : {} });
export const getF1SeasonCircuits       = (year) =>
  api.get(`/f1/circuits/season${year ? `/${year}` : ''}`);

// Standings (live, official)
export const getF1DriverStandings      = (year) =>
  api.get(`/f1/standings/drivers${year ? `/${year}` : ''}`);
export const getF1ConstructorStandings = (year) =>
  api.get(`/f1/standings/constructors${year ? `/${year}` : ''}`);

// Race & qualifying results
export const getF1LastRaceResults     = () => api.get('/f1/results/last');
export const getF1RaceResults         = (year, round) => api.get(`/f1/results/${year}/${round}`);
export const getF1QualifyingResults   = (year, round) => api.get(`/f1/qualifying/${year}/${round}`);

// Lap & pit data
export const getF1LapTimes  = (year, round, lap) =>
  api.get(`/f1/laps/${year}/${round}${lap ? `/${lap}` : ''}`);
export const getF1PitStops  = (year, round) => api.get(`/f1/pitstops/${year}/${round}`);

// Driver career stats
export const getF1DriverCareer = (driverId) => api.get(`/f1/driver/${driverId}/career`);

// OpenF1 live session data
export const getF1LiveSession   = ()              => api.get('/f1/live/session');
export const getF1LiveSessions  = (year, gp)      =>
  api.get('/f1/live/sessions', { params: { ...(year && { year }), ...(gp && { gp }) } });
export const getF1LivePositions = (sessionKey)    =>
  api.get('/f1/live/positions', { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1LiveIntervals = (sessionKey)    =>
  api.get('/f1/live/intervals', { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1LivePitStops  = (sessionKey)    =>
  api.get('/f1/live/pitstops',  { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1Weather       = (sessionKey)    =>
  api.get('/f1/live/weather',   { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1Stints        = (sessionKey)    =>
  api.get('/f1/live/stints',    { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1TeamRadio     = (sessionKey)    =>
  api.get('/f1/live/radio',     { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1CurrentTyres  = (sessionKey)    =>
  api.get('/f1/live/tyres',     { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1LiveDrivers   = (sessionKey)    =>
  api.get('/f1/live/drivers',   { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1LiveLocations = (sessionKey)    =>
  api.get('/f1/live/locations', { params: sessionKey ? { session_key: sessionKey } : {} });
export const getF1LiveCarData   = (sessionKey)    =>
  api.get('/f1/live/car_data',  { params: sessionKey ? { session_key: sessionKey } : {} });

// Compound dashboard snapshot
export const getF1Dashboard = () => api.get('/f1/dashboard');

export default api;
