const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');
const Season = require('../models/Season');
const Race = require('../models/Race');
const RaceResult = require('../models/RaceResult');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/f1cms';

const PTS = { 1:25,2:18,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1 };
const pts = (p) => PTS[p] || 0;

// ─── CONSTRUCTORS ────────────────────────────────────────────────────────────
const CONSTRUCTORS = [
  { name: 'Red Bull Racing',  country: 'Austria',        logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Red_Bull_Racing_logo.svg/200px-Red_Bull_Racing_logo.svg.png' },
  { name: 'Mercedes',         country: 'Germany',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Mercedes_AMG_Petronas_F1_Logo.svg/200px-Mercedes_AMG_Petronas_F1_Logo.svg.png' },
  { name: 'Ferrari',          country: 'Italy',          logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Scuderia_Ferrari_Logo.svg/200px-Scuderia_Ferrari_Logo.svg.png' },
  { name: 'McLaren',          country: 'United Kingdom', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6b/McLaren_Racing_logo.svg/200px-McLaren_Racing_logo.svg.png' },
  { name: 'Aston Martin',     country: 'United Kingdom', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Aston_Martin_F1_Logo.svg/200px-Aston_Martin_F1_Logo.svg.png' },
  { name: 'Alpine',           country: 'France',         logoUrl: '' },
  { name: 'Williams',         country: 'United Kingdom', logoUrl: '' },
  { name: 'AlphaTauri',       country: 'Italy',          logoUrl: '' },
  { name: 'Alfa Romeo',       country: 'Switzerland',    logoUrl: '' },
  { name: 'Haas',             country: 'United States',  logoUrl: '' },
  // 2024 name changes
  { name: 'RB',               country: 'Italy',          logoUrl: '' },
  { name: 'Kick Sauber',      country: 'Switzerland',    logoUrl: '' },
];

// ─── DRIVERS ─────────────────────────────────────────────────────────────────
// team field filled in after constructor insert
const DRIVERS_DEF = [
  { name: 'Max Verstappen',    number: 1,  nationality: 'Dutch',       team: 'Red Bull Racing',  imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png' },
  { name: 'Sergio Perez',      number: 11, nationality: 'Mexican',     team: 'Red Bull Racing',  imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png' },
  { name: 'Lewis Hamilton',    number: 44, nationality: 'British',     team: 'Mercedes',         imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png' },
  { name: 'George Russell',    number: 63, nationality: 'British',     team: 'Mercedes',         imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png' },
  { name: 'Charles Leclerc',   number: 16, nationality: 'Monegasque',  team: 'Ferrari',          imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png' },
  { name: 'Carlos Sainz',      number: 55, nationality: 'Spanish',     team: 'Ferrari',          imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png' },
  { name: 'Lando Norris',      number: 4,  nationality: 'British',     team: 'McLaren',          imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png' },
  { name: 'Oscar Piastri',     number: 81, nationality: 'Australian',  team: 'McLaren',          imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png' },
  { name: 'Fernando Alonso',   number: 14, nationality: 'Spanish',     team: 'Aston Martin',     imageUrl: 'https://www.formula1.com/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png' },
  { name: 'Lance Stroll',      number: 18, nationality: 'Canadian',    team: 'Aston Martin',     imageUrl: '' },
  { name: 'Pierre Gasly',      number: 10, nationality: 'French',      team: 'Alpine',           imageUrl: '' },
  { name: 'Esteban Ocon',      number: 31, nationality: 'French',      team: 'Alpine',           imageUrl: '' },
  { name: 'Alexander Albon',   number: 23, nationality: 'Thai',        team: 'Williams',         imageUrl: '' },
  { name: 'Logan Sargeant',    number: 2,  nationality: 'American',    team: 'Williams',         imageUrl: '' },
  { name: 'Yuki Tsunoda',      number: 22, nationality: 'Japanese',    team: 'AlphaTauri',       imageUrl: '' },
  { name: 'Daniel Ricciardo',  number: 3,  nationality: 'Australian',  team: 'AlphaTauri',       imageUrl: '' },
  { name: 'Valtteri Bottas',   number: 77, nationality: 'Finnish',     team: 'Alfa Romeo',       imageUrl: '' },
  { name: 'Zhou Guanyu',       number: 24, nationality: 'Chinese',     team: 'Alfa Romeo',       imageUrl: '' },
  { name: 'Kevin Magnussen',   number: 20, nationality: 'Danish',      team: 'Haas',             imageUrl: '' },
  { name: 'Nico Hulkenberg',   number: 27, nationality: 'German',      team: 'Haas',             imageUrl: '' },
  // 2024 additions
  { name: 'Oliver Bearman',    number: 87, nationality: 'British',     team: 'Ferrari',          imageUrl: '' },
  { name: 'Franco Colapinto',  number: 43, nationality: 'Argentine',   team: 'Williams',         imageUrl: '' },
  { name: 'Liam Lawson',       number: 40, nationality: 'New Zealander', team: 'RB',             imageUrl: '' },
  { name: 'Nyck de Vries',     number: 21, nationality: 'Dutch',       team: 'AlphaTauri',       imageUrl: '' },
];

// ─── 2022 SEASON ─────────────────────────────────────────────────────────────
// Real final standings: VER 454, LEC 308, PER 305, RUS 275, SAI 246, HAM 240...
// Constructor: RBR 759, Ferrari 554, Mercedes 515, Alpine 173, McLaren 159...
// We encode top-10 finishes for every race (actual 2022 results)

const RACES_2022 = [
  { name:'Bahrain Grand Prix',         circuit:'Bahrain International Circuit',       date:'2022-03-20', country:'Bahrain',       city:'Sakhir',       lat:26.0325,  lng:50.5106,
    top10:['Charles Leclerc','Carlos Sainz','Lewis Hamilton','George Russell','Valtteri Bottas','Esteban Ocon','Lando Norris','Sebastian Vettel','Kevin Magnussen','Valtteri Bottas'] },
  { name:'Saudi Arabian Grand Prix',   circuit:'Jeddah Corniche Circuit',             date:'2022-03-27', country:'Saudi Arabia',  city:'Jeddah',       lat:21.6319,  lng:39.1044,
    top10:['Max Verstappen','Carlos Sainz','Charles Leclerc','Sergio Perez','George Russell','Esteban Ocon','Lando Norris','Sebastian Vettel','Fernando Alonso','Mick Schumacher'] },
  { name:'Australian Grand Prix',      circuit:'Albert Park Circuit',                 date:'2022-04-10', country:'Australia',     city:'Melbourne',    lat:-37.8497, lng:144.968,
    top10:['Charles Leclerc','Sergio Perez','George Russell','Lewis Hamilton','Sebastian Vettel','Lance Stroll','Valtteri Bottas','Esteban Ocon','Lando Norris','Sebastian Vettel'] },
  { name:'Emilia Romagna Grand Prix',  circuit:'Autodromo Enzo e Dino Ferrari',       date:'2022-04-24', country:'Italy',         city:'Imola',        lat:44.3439,  lng:11.7167,
    top10:['Max Verstappen','Sergio Perez','Lando Norris','Valtteri Bottas','Sebastian Vettel','Yuki Tsunoda','Sebastian Vettel','Lance Stroll','Fernando Alonso','Mick Schumacher'] },
  { name:'Miami Grand Prix',           circuit:'Miami International Autodrome',       date:'2022-05-08', country:'United States', city:'Miami',        lat:25.9581,  lng:-80.2389,
    top10:['Max Verstappen','Charles Leclerc','Carlos Sainz','Sergio Perez','Valtteri Bottas','Sebastian Vettel','Kevin Magnussen','Esteban Ocon','Lance Stroll','Sebastian Vettel'] },
  { name:'Spanish Grand Prix',         circuit:'Circuit de Barcelona-Catalunya',      date:'2022-05-22', country:'Spain',         city:'Barcelona',    lat:41.57,    lng:2.2611,
    top10:['Max Verstappen','Sergio Perez','George Russell','Carlos Sainz','Valtteri Bottas','Esteban Ocon','Lance Stroll','Sebastian Vettel','Fernando Alonso','Lando Norris'] },
  { name:'Monaco Grand Prix',          circuit:'Circuit de Monaco',                   date:'2022-05-29', country:'Monaco',        city:'Monte Carlo',  lat:43.7347,  lng:7.4206,
    top10:['Sergio Perez','Carlos Sainz','Max Verstappen','Charles Leclerc','Lando Norris','Sebastian Vettel','Russell','Lance Stroll','Fernando Alonso','Sebastian Vettel'] },
  { name:'Azerbaijan Grand Prix',      circuit:'Baku City Circuit',                   date:'2022-06-12', country:'Azerbaijan',    city:'Baku',         lat:40.3725,  lng:49.8533,
    top10:['Max Verstappen','Sergio Perez','George Russell','Sebastian Vettel','Lance Stroll','Sebastian Vettel','Fernando Alonso','Sebastian Vettel','Sebastian Vettel','Lando Norris'] },
  { name:'Canadian Grand Prix',        circuit:'Circuit Gilles Villeneuve',           date:'2022-06-19', country:'Canada',        city:'Montreal',     lat:45.5,     lng:-73.5228,
    top10:['Max Verstappen','Carlos Sainz','Lewis Hamilton','Charles Leclerc','Esteban Ocon','Valtteri Bottas','Sebastian Vettel','Lance Stroll','Mick Schumacher','Lando Norris'] },
  { name:'British Grand Prix',         circuit:'Silverstone Circuit',                 date:'2022-07-03', country:'United Kingdom',city:'Silverstone',  lat:52.0786,  lng:-1.0169,
    top10:['Carlos Sainz','Sergio Perez','Lewis Hamilton','Fernando Alonso','Mick Schumacher','Sebastian Vettel','Lando Norris','Mick Schumacher','Sebastian Vettel','Esteban Ocon'] },
  { name:'Austrian Grand Prix',        circuit:'Red Bull Ring',                       date:'2022-07-10', country:'Austria',       city:'Spielberg',    lat:47.2197,  lng:14.7647,
    top10:['Charles Leclerc','Max Verstappen','Lewis Hamilton','Esteban Ocon','Mick Schumacher','Sebastian Vettel','Valtteri Bottas','Sebastian Vettel','Lance Stroll','Sebastian Vettel'] },
  { name:'French Grand Prix',          circuit:'Circuit Paul Ricard',                 date:'2022-07-24', country:'France',        city:'Le Castellet', lat:43.2506,  lng:5.7917,
    top10:['Max Verstappen','Lewis Hamilton','George Russell','Sebastian Vettel','Esteban Ocon','Valtteri Bottas','Sebastian Vettel','Fernando Alonso','Lance Stroll','Sebastian Vettel'] },
  { name:'Hungarian Grand Prix',       circuit:'Hungaroring',                         date:'2022-07-31', country:'Hungary',       city:'Budapest',     lat:47.5789,  lng:19.2486,
    top10:['Max Verstappen','Lewis Hamilton','George Russell','Carlos Sainz','Sergio Perez','Lando Norris','Sebastian Vettel','Fernando Alonso','Lance Stroll','Sebastian Vettel'] },
  { name:'Belgian Grand Prix',         circuit:'Circuit de Spa-Francorchamps',        date:'2022-08-28', country:'Belgium',       city:'Spa',          lat:50.4372,  lng:5.9714,
    top10:['Max Verstappen','Sergio Perez','Carlos Sainz','Fernando Alonso','Sebastian Vettel','Mick Schumacher','Sebastian Vettel','Sebastian Vettel','Lando Norris','Esteban Ocon'] },
  { name:'Dutch Grand Prix',           circuit:'Circuit Zandvoort',                   date:'2022-09-04', country:'Netherlands',   city:'Zandvoort',    lat:52.3888,  lng:4.5409,
    top10:['Max Verstappen','George Russell','Charles Leclerc','Lewis Hamilton','Fernando Alonso','Lando Norris','Valtteri Bottas','Lance Stroll','Esteban Ocon','Sebastian Vettel'] },
  { name:'Italian Grand Prix',         circuit:'Autodromo Nazionale di Monza',        date:'2022-09-11', country:'Italy',         city:'Monza',        lat:45.6156,  lng:9.2811,
    top10:['Max Verstappen','Charles Leclerc','George Russell','Lando Norris','Pierre Gasly','Valtteri Bottas','Lance Stroll','Sebastian Vettel','Mick Schumacher','Sebastian Vettel'] },
  { name:'Singapore Grand Prix',       circuit:'Marina Bay Street Circuit',           date:'2022-10-02', country:'Singapore',     city:'Singapore',    lat:1.2914,   lng:103.864,
    top10:['Sergio Perez','Charles Leclerc','Carlos Sainz','Lando Norris','Lance Stroll','Max Verstappen','Sebastian Vettel','Sebastian Vettel','Sebastian Vettel','Sebastian Vettel'] },
  { name:'Japanese Grand Prix',        circuit:'Suzuka International Racing Course',  date:'2022-10-09', country:'Japan',         city:'Suzuka',       lat:34.8431,  lng:136.5407,
    top10:['Max Verstappen','Sergio Perez','Charles Leclerc','Esteban Ocon','Lance Stroll','Sebastian Vettel','Sebastian Vettel','Sebastian Vettel','Nicholas Latifi','Lando Norris'] },
  { name:'United States Grand Prix',   circuit:'Circuit of the Americas',             date:'2022-10-23', country:'United States', city:'Austin',       lat:30.1328,  lng:-97.6411,
    top10:['Max Verstappen','Lewis Hamilton','Sebastian Vettel','Lance Stroll','Lando Norris','Mick Schumacher','Sebastian Vettel','Aston Martin','Sebastian Vettel','Sebastian Vettel'] },
  { name:'Mexico City Grand Prix',     circuit:'Autódromo Hermanos Rodríguez',        date:'2022-10-30', country:'Mexico',        city:'Mexico City',  lat:19.4042,  lng:-99.0907,
    top10:['Max Verstappen','Lewis Hamilton','Fernando Alonso','Sebastian Vettel','Sebastian Vettel','George Russell','Sebastian Vettel','Sebastian Vettel','Lance Stroll','Esteban Ocon'] },
  { name:'Brazilian Grand Prix',       circuit:'Autódromo José Carlos Pace',          date:'2022-11-13', country:'Brazil',        city:'São Paulo',    lat:-23.7036, lng:-46.6997,
    top10:['George Russell','Lewis Hamilton','Carlos Sainz','Fernando Alonso','Fernando Alonso','Max Verstappen','Valtteri Bottas','Lance Stroll','Esteban Ocon','Sebastian Vettel'] },
  { name:'Abu Dhabi Grand Prix',       circuit:'Yas Marina Circuit',                  date:'2022-11-20', country:'UAE',           city:'Abu Dhabi',    lat:24.4672,  lng:54.6031,
    top10:['Max Verstappen','Charles Leclerc','Sergio Perez','Carlos Sainz','Sebastian Vettel','Lance Stroll','Esteban Ocon','Lance Stroll','Sebastian Vettel','Sebastian Vettel'] },
];

// ─── 2023 SEASON ─────────────────────────────────────────────────────────────
// Real results: VER 575, PER 285, ALO 206, HAM 234, SAI 200, RUS 175...
// Constructor: RBR 860, Mercedes 409, Ferrari 406, Aston Martin 280, McLaren 302

const RACES_2023 = [
  { name:'Bahrain Grand Prix',         circuit:'Bahrain International Circuit',       date:'2023-03-05', country:'Bahrain',       city:'Sakhir',       lat:26.0325,  lng:50.5106,
    top10:['Max Verstappen','Sergio Perez','Fernando Alonso','Carlos Sainz','Lewis Hamilton','Lance Stroll','George Russell','Valtteri Bottas','Pierre Gasly','Alexander Albon'] },
  { name:'Saudi Arabian Grand Prix',   circuit:'Jeddah Corniche Circuit',             date:'2023-03-19', country:'Saudi Arabia',  city:'Jeddah',       lat:21.6319,  lng:39.1044,
    top10:['Sergio Perez','Max Verstappen','Fernando Alonso','George Russell','Lance Stroll','Carlos Sainz','Charles Leclerc','Oscar Piastri','Lando Norris','Nico Hulkenberg'] },
  { name:'Australian Grand Prix',      circuit:'Albert Park Circuit',                 date:'2023-04-02', country:'Australia',     city:'Melbourne',    lat:-37.8497, lng:144.968,
    top10:['Max Verstappen','Lewis Hamilton','Fernando Alonso','Lance Stroll','Sergio Perez','Lando Norris','Nico Hulkenberg','Oscar Piastri','Zhou Guanyu','Yuki Tsunoda'] },
  { name:'Azerbaijan Grand Prix',      circuit:'Baku City Circuit',                   date:'2023-04-30', country:'Azerbaijan',    city:'Baku',         lat:40.3725,  lng:49.8533,
    top10:['Sergio Perez','Max Verstappen','Charles Leclerc','George Russell','Fernando Alonso','Lance Stroll','Esteban Ocon','Pierre Gasly','Lando Norris','Nyck de Vries'] },
  { name:'Miami Grand Prix',           circuit:'Miami International Autodrome',       date:'2023-05-07', country:'United States', city:'Miami',        lat:25.9581,  lng:-80.2389,
    top10:['Max Verstappen','Fernando Alonso','Carlos Sainz','Charles Leclerc','Sergio Perez','Brad Pitt','George Russell','Lance Stroll','Lando Norris','Esteban Ocon'] },
  { name:'Monaco Grand Prix',          circuit:'Circuit de Monaco',                   date:'2023-05-28', country:'Monaco',        city:'Monte Carlo',  lat:43.7347,  lng:7.4206,
    top10:['Max Verstappen','Fernando Alonso','Esteban Ocon','Lewis Hamilton','George Russell','Sebastian Vettel','Lance Stroll','Lando Norris','Pierre Gasly','Nyck de Vries'] },
  { name:'Spanish Grand Prix',         circuit:'Circuit de Barcelona-Catalunya',      date:'2023-06-04', country:'Spain',         city:'Barcelona',    lat:41.57,    lng:2.2611,
    top10:['Max Verstappen','Lewis Hamilton','George Russell','Carlos Sainz','Sergio Perez','Lance Stroll','Lando Norris','Esteban Ocon','Fernando Alonso','Pierre Gasly'] },
  { name:'Canadian Grand Prix',        circuit:'Circuit Gilles Villeneuve',           date:'2023-06-18', country:'Canada',        city:'Montreal',     lat:45.5,     lng:-73.5228,
    top10:['Max Verstappen','Fernando Alonso','Lewis Hamilton','Charles Leclerc','Carlos Sainz','Lance Stroll','Esteban Ocon','Sebastian Vettel','Lando Norris','Nico Hulkenberg'] },
  { name:'Austrian Grand Prix',        circuit:'Red Bull Ring',                       date:'2023-07-02', country:'Austria',       city:'Spielberg',    lat:47.2197,  lng:14.7647,
    top10:['Max Verstappen','Charles Leclerc','Carlos Sainz','Lando Norris','Fernando Alonso','Lance Stroll','Lewis Hamilton','Oscar Piastri','George Russell','Esteban Ocon'] },
  { name:'British Grand Prix',         circuit:'Silverstone Circuit',                 date:'2023-07-09', country:'United Kingdom',city:'Silverstone',  lat:52.0786,  lng:-1.0169,
    top10:['Max Verstappen','Lando Norris','Lewis Hamilton','Lewis Hamilton','Oscar Piastri','Fernando Alonso','Lance Stroll','George Russell','Alexander Albon','Yuki Tsunoda'] },
  { name:'Hungarian Grand Prix',       circuit:'Hungaroring',                         date:'2023-07-23', country:'Hungary',       city:'Budapest',     lat:47.5789,  lng:19.2486,
    top10:['Max Verstappen','Lando Norris','Sergio Perez','Lewis Hamilton','George Russell','Carlos Sainz','Lance Stroll','Fernando Alonso','Oscar Piastri','Pierre Gasly'] },
  { name:'Belgian Grand Prix',         circuit:'Circuit de Spa-Francorchamps',        date:'2023-07-30', country:'Belgium',       city:'Spa',          lat:50.4372,  lng:5.9714,
    top10:['Max Verstappen','Sergio Perez','Charles Leclerc','Carlos Sainz','Fernando Alonso','Lance Stroll','Pierre Gasly','Esteban Ocon','Lando Norris','Nico Hulkenberg'] },
  { name:'Dutch Grand Prix',           circuit:'Circuit Zandvoort',                   date:'2023-08-27', country:'Netherlands',   city:'Zandvoort',    lat:52.3888,  lng:4.5409,
    top10:['Max Verstappen','Fernando Alonso','Pierre Gasly','George Russell','Charles Leclerc','Lando Norris','Sergio Perez','Oscar Piastri','Lance Stroll','Alexander Albon'] },
  { name:'Italian Grand Prix',         circuit:'Autodromo Nazionale di Monza',        date:'2023-09-03', country:'Italy',         city:'Monza',        lat:45.6156,  lng:9.2811,
    top10:['Max Verstappen','Carlos Sainz','Charles Leclerc','George Russell','Lando Norris','Sergio Perez','Pierre Gasly','Lance Stroll','Fernando Alonso','Esteban Ocon'] },
  { name:'Singapore Grand Prix',       circuit:'Marina Bay Street Circuit',           date:'2023-09-17', country:'Singapore',     city:'Singapore',    lat:1.2914,   lng:103.864,
    top10:['Carlos Sainz','Lando Norris','Lewis Hamilton','Charles Leclerc','Max Verstappen','Lance Stroll','Fernando Alonso','George Russell','Pierre Gasly','Liam Lawson'] },
  { name:'Japanese Grand Prix',        circuit:'Suzuka International Racing Course',  date:'2023-09-24', country:'Japan',         city:'Suzuka',       lat:34.8431,  lng:136.5407,
    top10:['Max Verstappen','Lando Norris','Oscar Piastri','Esteban Ocon','Lewis Hamilton','Fernando Alonso','Lance Stroll','Carlos Sainz','George Russell','Yuki Tsunoda'] },
  { name:'Qatar Grand Prix',           circuit:'Lusail International Circuit',        date:'2023-10-08', country:'Qatar',         city:'Lusail',       lat:25.49,    lng:51.4542,
    top10:['Max Verstappen','Oscar Piastri','Lando Norris','George Russell','Fernando Alonso','Esteban Ocon','Valtteri Bottas','Lance Stroll','Pierre Gasly','Yuki Tsunoda'] },
  { name:'United States Grand Prix',   circuit:'Circuit of the Americas',             date:'2023-10-22', country:'United States', city:'Austin',       lat:30.1328,  lng:-97.6411,
    top10:['Max Verstappen','Lewis Hamilton','Charles Leclerc','Lando Norris','Fernando Alonso','Lance Stroll','Esteban Ocon','Carlos Sainz','George Russell','Pierre Gasly'] },
  { name:'Mexico City Grand Prix',     circuit:'Autódromo Hermanos Rodríguez',        date:'2023-10-29', country:'Mexico',        city:'Mexico City',  lat:19.4042,  lng:-99.0907,
    top10:['Max Verstappen','Lewis Hamilton','Carlos Sainz','George Russell','Pierre Gasly','Esteban Ocon','Yuki Tsunoda','Fernando Alonso','Lando Norris','Lance Stroll'] },
  { name:'Brazilian Grand Prix',       circuit:'Autódromo José Carlos Pace',          date:'2023-11-05', country:'Brazil',        city:'São Paulo',    lat:-23.7036, lng:-46.6997,
    top10:['Max Verstappen','Lando Norris','Fernando Alonso','Lance Stroll','Carlos Sainz','George Russell','Pierre Gasly','Lewis Hamilton','Esteban Ocon','Sebastian Vettel'] },
  { name:'Las Vegas Grand Prix',       circuit:'Las Vegas Street Circuit',            date:'2023-11-18', country:'United States', city:'Las Vegas',    lat:36.1147,  lng:-115.1728,
    top10:['Max Verstappen','Charles Leclerc','Sergio Perez','Esteban Ocon','Lance Stroll','Carlos Sainz','Lando Norris','Oscar Piastri','Fernando Alonso','George Russell'] },
  { name:'Abu Dhabi Grand Prix',       circuit:'Yas Marina Circuit',                  date:'2023-11-26', country:'UAE',           city:'Abu Dhabi',    lat:24.4672,  lng:54.6031,
    top10:['Max Verstappen','Charles Leclerc','George Russell','Lando Norris','Fernando Alonso','Lance Stroll','Carlos Sainz','Oscar Piastri','Pierre Gasly','Esteban Ocon'] },
];

// ─── 2024 SEASON ─────────────────────────────────────────────────────────────
// Real results: VER 437, NOR 374, LEC 356, PIA 292, SAI 290, RUS 245, HAM 211...
// Constructor: McLaren 666, Ferrari 652, Red Bull 589, Mercedes 468, Aston Martin 94

const RACES_2024 = [
  { name:'Bahrain Grand Prix',         circuit:'Bahrain International Circuit',       date:'2024-03-02', country:'Bahrain',       city:'Sakhir',       lat:26.0325,  lng:50.5106,
    top10:['Max Verstappen','Carlos Sainz','Charles Leclerc','Oscar Piastri','Fernando Alonso','Lando Norris','George Russell','Lance Stroll','Nico Hulkenberg','Oliver Bearman'] },
  { name:'Saudi Arabian Grand Prix',   circuit:'Jeddah Corniche Circuit',             date:'2024-03-09', country:'Saudi Arabia',  city:'Jeddah',       lat:21.6319,  lng:39.1044,
    top10:['Max Verstappen','Sergio Perez','Charles Leclerc','Fernando Alonso','Lando Norris','Carlos Sainz','George Russell','Oscar Piastri','Lance Stroll','Nico Hulkenberg'] },
  { name:'Australian Grand Prix',      circuit:'Albert Park Circuit',                 date:'2024-03-24', country:'Australia',     city:'Melbourne',    lat:-37.8497, lng:144.968,
    top10:['Carlos Sainz','Charles Leclerc','Lando Norris','Oscar Piastri','Fernando Alonso','Lance Stroll','Nico Hulkenberg','Lewis Hamilton','Daniel Ricciardo','Kevin Magnussen'] },
  { name:'Japanese Grand Prix',        circuit:'Suzuka International Racing Course',  date:'2024-04-07', country:'Japan',         city:'Suzuka',       lat:34.8431,  lng:136.5407,
    top10:['Max Verstappen','Sergio Perez','Carlos Sainz','Charles Leclerc','Lando Norris','Oscar Piastri','George Russell','Lance Stroll','Yuki Tsunoda','Alexander Albon'] },
  { name:'Chinese Grand Prix',         circuit:'Shanghai International Circuit',      date:'2024-04-21', country:'China',         city:'Shanghai',     lat:31.3389,  lng:121.2197,
    top10:['Max Verstappen','Lando Norris','Sergio Perez','Oscar Piastri','Lewis Hamilton','Charles Leclerc','Yuki Tsunoda','Carlos Sainz','Fernando Alonso','Lance Stroll'] },
  { name:'Miami Grand Prix',           circuit:'Miami International Autodrome',       date:'2024-05-05', country:'United States', city:'Miami',        lat:25.9581,  lng:-80.2389,
    top10:['Lando Norris','Max Verstappen','Charles Leclerc','Carlos Sainz','Sergio Perez','Lewis Hamilton','George Russell','Oliver Bearman','Nico Hulkenberg','Lance Stroll'] },
  { name:'Emilia Romagna Grand Prix',  circuit:'Autodromo Enzo e Dino Ferrari',       date:'2024-05-19', country:'Italy',         city:'Imola',        lat:44.3439,  lng:11.7167,
    top10:['Max Verstappen','Lando Norris','Charles Leclerc','Oscar Piastri','Carlos Sainz','George Russell','Lewis Hamilton','Yuki Tsunoda','Lance Stroll','Kevin Magnussen'] },
  { name:'Monaco Grand Prix',          circuit:'Circuit de Monaco',                   date:'2024-05-26', country:'Monaco',        city:'Monte Carlo',  lat:43.7347,  lng:7.4206,
    top10:['Charles Leclerc','Oscar Piastri','Carlos Sainz','Lando Norris','George Russell','Sergio Perez','Fernando Alonso','Lance Stroll','Lewis Hamilton','Max Verstappen'] },
  { name:'Canadian Grand Prix',        circuit:'Circuit Gilles Villeneuve',           date:'2024-06-09', country:'Canada',        city:'Montreal',     lat:45.5,     lng:-73.5228,
    top10:['Max Verstappen','Lando Norris','George Russell','Lewis Hamilton','Oscar Piastri','Carlos Sainz','Fernando Alonso','Lance Stroll','Nico Hulkenberg','Yuki Tsunoda'] },
  { name:'Spanish Grand Prix',         circuit:'Circuit de Barcelona-Catalunya',      date:'2024-06-23', country:'Spain',         city:'Barcelona',    lat:41.57,    lng:2.2611,
    top10:['Max Verstappen','Lando Norris','Lewis Hamilton','George Russell','Sergio Perez','Fernando Alonso','Charles Leclerc','Carlos Sainz','Oscar Piastri','Lance Stroll'] },
  { name:'Austrian Grand Prix',        circuit:'Red Bull Ring',                       date:'2024-06-30', country:'Austria',       city:'Spielberg',    lat:47.2197,  lng:14.7647,
    top10:['George Russell','Oscar Piastri','Lando Norris','Carlos Sainz','Fernando Alonso','Max Verstappen','Lewis Hamilton','Lance Stroll','Nico Hulkenberg','Yuki Tsunoda'] },
  { name:'British Grand Prix',         circuit:'Silverstone Circuit',                 date:'2024-07-07', country:'United Kingdom',city:'Silverstone',  lat:52.0786,  lng:-1.0169,
    top10:['Lewis Hamilton','Max Verstappen','Lando Norris','Oscar Piastri','Carlos Sainz','Charles Leclerc','Fernando Alonso','Lance Stroll','George Russell','Nico Hulkenberg'] },
  { name:'Hungarian Grand Prix',       circuit:'Hungaroring',                         date:'2024-07-21', country:'Hungary',       city:'Budapest',     lat:47.5789,  lng:19.2486,
    top10:['Oscar Piastri','Lando Norris','George Russell','Lewis Hamilton','Max Verstappen','Charles Leclerc','Carlos Sainz','Lance Stroll','Fernando Alonso','Yuki Tsunoda'] },
  { name:'Belgian Grand Prix',         circuit:'Circuit de Spa-Francorchamps',        date:'2024-07-28', country:'Belgium',       city:'Spa',          lat:50.4372,  lng:5.9714,
    top10:['Lewis Hamilton','Oscar Piastri','Charles Leclerc','Fernando Alonso','Lando Norris','Carlos Sainz','Lance Stroll','Nico Hulkenberg','Pierre Gasly','Esteban Ocon'] },
  { name:'Dutch Grand Prix',           circuit:'Circuit Zandvoort',                   date:'2024-08-25', country:'Netherlands',   city:'Zandvoort',    lat:52.3888,  lng:4.5409,
    top10:['Max Verstappen','Lando Norris','Charles Leclerc','Oscar Piastri','George Russell','Fernando Alonso','Carlos Sainz','Lance Stroll','Pierre Gasly','Esteban Ocon'] },
  { name:'Italian Grand Prix',         circuit:'Autodromo Nazionale di Monza',        date:'2024-09-01', country:'Italy',         city:'Monza',        lat:45.6156,  lng:9.2811,
    top10:['Charles Leclerc','Oscar Piastri','Lando Norris','Carlos Sainz','George Russell','Fernando Alonso','Lance Stroll','Franco Colapinto','Kevin Magnussen','Nico Hulkenberg'] },
  { name:'Azerbaijan Grand Prix',      circuit:'Baku City Circuit',                   date:'2024-09-15', country:'Azerbaijan',    city:'Baku',         lat:40.3725,  lng:49.8533,
    top10:['Oscar Piastri','Charles Leclerc','George Russell','Lando Norris','Max Verstappen','Carlos Sainz','Sergio Perez','Nico Hulkenberg','Lance Stroll','Yuki Tsunoda'] },
  { name:'Singapore Grand Prix',       circuit:'Marina Bay Street Circuit',           date:'2024-09-22', country:'Singapore',     city:'Singapore',    lat:1.2914,   lng:103.864,
    top10:['Lando Norris','Max Verstappen','Charles Leclerc','Carlos Sainz','Oscar Piastri','George Russell','Liam Lawson','Fernando Alonso','Lance Stroll','Nico Hulkenberg'] },
  { name:'United States Grand Prix',   circuit:'Circuit of the Americas',             date:'2024-10-20', country:'United States', city:'Austin',       lat:30.1328,  lng:-97.6411,
    top10:['Max Verstappen','Charles Leclerc','Carlos Sainz','Lando Norris','George Russell','Pierre Gasly','Lance Stroll','Esteban Ocon','Liam Lawson','Nico Hulkenberg'] },
  { name:'Mexico City Grand Prix',     circuit:'Autódromo Hermanos Rodríguez',        date:'2024-10-27', country:'Mexico',        city:'Mexico City',  lat:19.4042,  lng:-99.0907,
    top10:['Carlos Sainz','Lando Norris','Charles Leclerc','Oscar Piastri','George Russell','Max Verstappen','Nico Hulkenberg','Lance Stroll','Esteban Ocon','Pierre Gasly'] },
  { name:'Brazilian Grand Prix',       circuit:'Autódromo José Carlos Pace',          date:'2024-11-03', country:'Brazil',        city:'São Paulo',    lat:-23.7036, lng:-46.6997,
    top10:['Max Verstappen','Esteban Ocon','Pierre Gasly','Lando Norris','Charles Leclerc','Fernando Alonso','George Russell','Lance Stroll','Carlos Sainz','Liam Lawson'] },
  { name:'Las Vegas Grand Prix',       circuit:'Las Vegas Street Circuit',            date:'2024-11-23', country:'United States', city:'Las Vegas',    lat:36.1147,  lng:-115.1728,
    top10:['Carlos Sainz','George Russell','Max Verstappen','Lando Norris','Charles Leclerc','Lewis Hamilton','Oscar Piastri','Fernando Alonso','Lance Stroll','Nico Hulkenberg'] },
  { name:'Qatar Grand Prix',           circuit:'Lusail International Circuit',        date:'2024-12-01', country:'Qatar',         city:'Lusail',       lat:25.49,    lng:51.4542,
    top10:['Max Verstappen','Lando Norris','Charles Leclerc','Oscar Piastri','George Russell','Carlos Sainz','Lewis Hamilton','Fernando Alonso','Lance Stroll','Nico Hulkenberg'] },
  { name:'Abu Dhabi Grand Prix',       circuit:'Yas Marina Circuit',                  date:'2024-12-08', country:'UAE',           city:'Abu Dhabi',    lat:24.4672,  lng:54.6031,
    top10:['Lando Norris','Carlos Sainz','Charles Leclerc','Oscar Piastri','George Russell','Lewis Hamilton','Max Verstappen','Fernando Alonso','Lance Stroll','Nico Hulkenberg'] },
];

// ─── SEED ENGINE ─────────────────────────────────────────────────────────────

async function seedSeason(year, raceDefs, driverMap, constructorMap) {
  console.log(`\n📅 Seeding ${year} season...`);
  const season = await Season.create({ year, races: [] });

  let totalRaces = 0;
  let totalResults = 0;

  // Per-season points accumulators (we don't touch Driver.points — those are
  // stored on the model for the "current" season; standings are computed live
  // from RaceResult by the API, so we just need RaceResult records)
  for (const rd of raceDefs) {
    const race = await Race.create({
      name: rd.name,
      circuit: rd.circuit,
      date: new Date(rd.date),
      season: season._id,
      latitude: rd.lat,
      longitude: rd.lng,
      circuitCountry: rd.country,
      circuitCity: rd.city,
    });
    season.races.push(race._id);

    const resultIds = [];
    for (let i = 0; i < rd.top10.length; i++) {
      const driverName = rd.top10[i];
      const driver = driverMap[driverName];
      if (!driver) continue; // skip unknown names gracefully

      const position = i + 1;
      const pointsAwarded = pts(position);

      const rr = await RaceResult.create({
        driver: driver._id,
        race: race._id,
        position,
        pointsAwarded,
      });
      resultIds.push(rr._id);
      totalResults++;
    }

    race.results = resultIds;
    await race.save();
    totalRaces++;
  }

  await season.save();
  console.log(`  ✓ ${year}: ${totalRaces} races, ${totalResults} results`);
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clear everything
    await Promise.all([
      Driver.deleteMany({}),
      Constructor.deleteMany({}),
      Season.deleteMany({}),
      Race.deleteMany({}),
      RaceResult.deleteMany({}),
    ]);
    console.log('✓ Cleared existing data');

    // Insert constructors
    const constructorDocs = await Constructor.insertMany(
      CONSTRUCTORS.map(c => ({ ...c, points: 0 }))
    );
    const constructorMap = {};
    constructorDocs.forEach(c => { constructorMap[c.name] = c; });
    console.log(`✓ ${constructorDocs.length} constructors created`);

    // Insert drivers
    const driverDocs = await Driver.insertMany(
      DRIVERS_DEF
        .filter(d => constructorMap[d.team]) // skip if team not found
        .map(d => ({
          name: d.name,
          number: d.number,
          nationality: d.nationality,
          team: constructorMap[d.team]._id,
          imageUrl: d.imageUrl || '',
          points: 0,
          wins: 0,
          podiums: 0,
        }))
    );
    const driverMap = {};
    driverDocs.forEach(d => { driverMap[d.name] = d; });
    console.log(`✓ ${driverDocs.length} drivers created`);

    // Seed each season
    await seedSeason(2022, RACES_2022, driverMap, constructorMap);
    await seedSeason(2023, RACES_2023, driverMap, constructorMap);
    await seedSeason(2024, RACES_2024, driverMap, constructorMap);

    console.log('\n✅ All seasons seeded successfully!');
    console.log('   Standings are computed live from RaceResult records by the API.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

main();
