import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  (error) => {
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

export default api;
