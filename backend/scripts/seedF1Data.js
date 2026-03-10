const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');
const Season = require('../models/Season');
const Race = require('../models/Race');
const RaceResult = require('../models/RaceResult');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/f1cms';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await Driver.deleteMany({});
    await Constructor.deleteMany({});
    await Season.deleteMany({});
    await Race.deleteMany({});
    await RaceResult.deleteMany({});
    console.log('✓ Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

// Seed data
const seedData = async () => {
  try {
    await connectDB();
    await clearData();

    // 1. Create Constructors
    console.log('\n📦 Creating Constructors...');
    const constructors = await Constructor.insertMany([
      { name: 'Red Bull Racing', country: 'Austria', points: 0 },
      { name: 'Mercedes', country: 'Germany', points: 0 },
      { name: 'Ferrari', country: 'Italy', points: 0 },
      { name: 'McLaren', country: 'United Kingdom', points: 0 },
      { name: 'Aston Martin', country: 'United Kingdom', points: 0 },
      { name: 'Alpine', country: 'France', points: 0 },
      { name: 'AlphaTauri', country: 'Italy', points: 0 },
      { name: 'Williams', country: 'United Kingdom', points: 0 },
      { name: 'Alfa Romeo', country: 'Switzerland', points: 0 },
      { name: 'Haas', country: 'United States', points: 0 },
    ]);
    console.log(`✓ Created ${constructors.length} constructors`);

    // Map constructors by name for easy reference
    const constructorMap = {};
    constructors.forEach(c => {
      constructorMap[c.name] = c;
    });

    // 2. Create Drivers
    console.log('\n🏎️  Creating Drivers...');
    const drivers = await Driver.insertMany([
      { name: 'Max Verstappen', number: 1, nationality: 'Dutch', team: constructorMap['Red Bull Racing']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Sergio Perez', number: 11, nationality: 'Mexican', team: constructorMap['Red Bull Racing']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Lewis Hamilton', number: 44, nationality: 'British', team: constructorMap['Mercedes']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'George Russell', number: 63, nationality: 'British', team: constructorMap['Mercedes']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Charles Leclerc', number: 16, nationality: 'Monegasque', team: constructorMap['Ferrari']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Carlos Sainz', number: 55, nationality: 'Spanish', team: constructorMap['Ferrari']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Lando Norris', number: 4, nationality: 'British', team: constructorMap['McLaren']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Oscar Piastri', number: 81, nationality: 'Australian', team: constructorMap['McLaren']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Fernando Alonso', number: 14, nationality: 'Spanish', team: constructorMap['Aston Martin']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Lance Stroll', number: 18, nationality: 'Canadian', team: constructorMap['Aston Martin']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Pierre Gasly', number: 10, nationality: 'French', team: constructorMap['Alpine']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Esteban Ocon', number: 31, nationality: 'French', team: constructorMap['Alpine']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Yuki Tsunoda', number: 22, nationality: 'Japanese', team: constructorMap['AlphaTauri']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Daniel Ricciardo', number: 3, nationality: 'Australian', team: constructorMap['AlphaTauri']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Alexander Albon', number: 23, nationality: 'Thai', team: constructorMap['Williams']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Logan Sargeant', number: 2, nationality: 'American', team: constructorMap['Williams']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Valtteri Bottas', number: 77, nationality: 'Finnish', team: constructorMap['Alfa Romeo']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Zhou Guanyu', number: 24, nationality: 'Chinese', team: constructorMap['Alfa Romeo']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Kevin Magnussen', number: 20, nationality: 'Danish', team: constructorMap['Haas']._id, points: 0, wins: 0, podiums: 0 },
      { name: 'Nico Hulkenberg', number: 27, nationality: 'German', team: constructorMap['Haas']._id, points: 0, wins: 0, podiums: 0 },
    ]);
    console.log(`✓ Created ${drivers.length} drivers`);

    // Map drivers by name
    const driverMap = {};
    drivers.forEach(d => {
      driverMap[d.name] = d;
    });

    // 3. Create Season
    console.log('\n📅 Creating Season...');
    const season = await Season.create({ year: 2023, races: [] });
    console.log(`✓ Created season ${season.year}`);

    // 4. Create Races
    console.log('\n🏁 Creating Races...');
    const racesData = [
      { name: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', date: new Date('2023-03-05'), country: 'Bahrain', city: 'Sakhir', lat: 26.0325, lng: 50.5106 },
      { name: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit', date: new Date('2023-03-19'), country: 'Saudi Arabia', city: 'Jeddah', lat: 21.6319, lng: 39.1044 },
      { name: 'Australian Grand Prix', circuit: 'Albert Park Circuit', date: new Date('2023-04-02'), country: 'Australia', city: 'Melbourne', lat: -37.8497, lng: 144.968 },
      { name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', date: new Date('2023-04-30'), country: 'Azerbaijan', city: 'Baku', lat: 40.3725, lng: 49.8533 },
      { name: 'Miami Grand Prix', circuit: 'Miami International Autodrome', date: new Date('2023-05-07'), country: 'United States', city: 'Miami', lat: 25.9581, lng: -80.2389 },
      { name: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', date: new Date('2023-05-28'), country: 'Monaco', city: 'Monte Carlo', lat: 43.7347, lng: 7.4206 },
      { name: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', date: new Date('2023-06-04'), country: 'Spain', city: 'Barcelona', lat: 41.57, lng: 2.2611 },
      { name: 'Canadian Grand Prix', circuit: 'Circuit Gilles Villeneuve', date: new Date('2023-06-18'), country: 'Canada', city: 'Montreal', lat: 45.5, lng: -73.5228 },
      { name: 'Austrian Grand Prix', circuit: 'Red Bull Ring', date: new Date('2023-07-02'), country: 'Austria', city: 'Spielberg', lat: 47.2197, lng: 14.7647 },
      { name: 'British Grand Prix', circuit: 'Silverstone Circuit', date: new Date('2023-07-09'), country: 'United Kingdom', city: 'Silverstone', lat: 52.0786, lng: -1.0169 },
      { name: 'Hungarian Grand Prix', circuit: 'Hungaroring', date: new Date('2023-07-23'), country: 'Hungary', city: 'Budapest', lat: 47.5789, lng: 19.2486 },
      { name: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', date: new Date('2023-07-30'), country: 'Belgium', city: 'Spa', lat: 50.4372, lng: 5.9714 },
      { name: 'Dutch Grand Prix', circuit: 'Circuit Zandvoort', date: new Date('2023-08-27'), country: 'Netherlands', city: 'Zandvoort', lat: 52.3888, lng: 4.5409 },
      { name: 'Italian Grand Prix', circuit: 'Autodromo Nazionale di Monza', date: new Date('2023-09-03'), country: 'Italy', city: 'Monza', lat: 45.6156, lng: 9.2811 },
      { name: 'Singapore Grand Prix', circuit: 'Marina Bay Street Circuit', date: new Date('2023-09-17'), country: 'Singapore', city: 'Singapore', lat: 1.2914, lng: 103.864 },
      { name: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course', date: new Date('2023-09-24'), country: 'Japan', city: 'Suzuka', lat: 34.8431, lng: 136.5407 },
      { name: 'Qatar Grand Prix', circuit: 'Lusail International Circuit', date: new Date('2023-10-08'), country: 'Qatar', city: 'Lusail', lat: 25.49, lng: 51.4542 },
      { name: 'United States Grand Prix', circuit: 'Circuit of the Americas', date: new Date('2023-10-22'), country: 'United States', city: 'Austin', lat: 30.1328, lng: -97.6411 },
      { name: 'Mexico City Grand Prix', circuit: 'Autódromo Hermanos Rodríguez', date: new Date('2023-10-29'), country: 'Mexico', city: 'Mexico City', lat: 19.4042, lng: -99.0907 },
      { name: 'Brazilian Grand Prix', circuit: 'Autódromo José Carlos Pace', date: new Date('2023-11-05'), country: 'Brazil', city: 'São Paulo', lat: -23.7036, lng: -46.6997 },
      { name: 'Las Vegas Grand Prix', circuit: 'Las Vegas Street Circuit', date: new Date('2023-11-18'), country: 'United States', city: 'Las Vegas', lat: 36.1147, lng: -115.1728 },
      { name: 'Abu Dhabi Grand Prix', circuit: 'Yas Marina Circuit', date: new Date('2023-11-26'), country: 'United Arab Emirates', city: 'Abu Dhabi', lat: 24.4672, lng: 54.6031 },
    ];

    const races = [];
    for (const raceData of racesData) {
      const race = await Race.create({
        name: raceData.name,
        circuit: raceData.circuit,
        date: raceData.date,
        season: season._id,
        latitude: raceData.lat,
        longitude: raceData.lng,
        circuitCountry: raceData.country,
        circuitCity: raceData.city,
      });
      races.push(race);
      season.races.push(race._id);
    }
    await season.save();
    console.log(`✓ Created ${races.length} races`);

    // 5. Create Race Results for first 5 races
    console.log('\n🏆 Creating Race Results...');
    
    // Bahrain GP Results
    const bahrainResults = [
      { driver: driverMap['Max Verstappen'], position: 1, points: 25 },
      { driver: driverMap['Sergio Perez'], position: 2, points: 18 },
      { driver: driverMap['Fernando Alonso'], position: 3, points: 15 },
      { driver: driverMap['Carlos Sainz'], position: 4, points: 12 },
      { driver: driverMap['Lewis Hamilton'], position: 5, points: 10 },
      { driver: driverMap['Lance Stroll'], position: 6, points: 8 },
      { driver: driverMap['George Russell'], position: 7, points: 6 },
      { driver: driverMap['Valtteri Bottas'], position: 8, points: 4 },
      { driver: driverMap['Pierre Gasly'], position: 9, points: 2 },
      { driver: driverMap['Alexander Albon'], position: 10, points: 1 },
    ];

    for (const result of bahrainResults) {
      const raceResult = await RaceResult.create({
        race: races[0]._id,
        driver: result.driver._id,
        position: result.position,
        pointsAwarded: result.points,
      });
      races[0].results.push(raceResult._id);
      
      // Update driver stats
      result.driver.points += result.points;
      if (result.position === 1) result.driver.wins += 1;
      if (result.position <= 3) result.driver.podiums += 1;
      await result.driver.save();
      
      // Update constructor points
      const constructor = constructors.find(c => c._id.equals(result.driver.team));
      constructor.points += result.points;
      await constructor.save();
    }
    await races[0].save();

    // Saudi Arabia GP Results
    const saudiResults = [
      { driver: driverMap['Sergio Perez'], position: 1, points: 25 },
      { driver: driverMap['Max Verstappen'], position: 2, points: 18 },
      { driver: driverMap['Fernando Alonso'], position: 3, points: 15 },
      { driver: driverMap['George Russell'], position: 4, points: 12 },
      { driver: driverMap['Lewis Hamilton'], position: 5, points: 10 },
      { driver: driverMap['Carlos Sainz'], position: 6, points: 8 },
      { driver: driverMap['Charles Leclerc'], position: 7, points: 6 },
      { driver: driverMap['Esteban Ocon'], position: 8, points: 4 },
      { driver: driverMap['Lando Norris'], position: 9, points: 2 },
      { driver: driverMap['Pierre Gasly'], position: 10, points: 1 },
    ];

    for (const result of saudiResults) {
      const raceResult = await RaceResult.create({
        race: races[1]._id,
        driver: result.driver._id,
        position: result.position,
        pointsAwarded: result.points,
      });
      races[1].results.push(raceResult._id);
      
      result.driver.points += result.points;
      if (result.position === 1) result.driver.wins += 1;
      if (result.position <= 3) result.driver.podiums += 1;
      await result.driver.save();
      
      const constructor = constructors.find(c => c._id.equals(result.driver.team));
      constructor.points += result.points;
      await constructor.save();
    }
    await races[1].save();

    // Australia GP Results
    const australiaResults = [
      { driver: driverMap['Max Verstappen'], position: 1, points: 25 },
      { driver: driverMap['Lewis Hamilton'], position: 2, points: 18 },
      { driver: driverMap['Fernando Alonso'], position: 3, points: 15 },
      { driver: driverMap['Lance Stroll'], position: 4, points: 12 },
      { driver: driverMap['Sergio Perez'], position: 5, points: 10 },
      { driver: driverMap['Lando Norris'], position: 6, points: 8 },
      { driver: driverMap['Nico Hulkenberg'], position: 7, points: 6 },
      { driver: driverMap['Oscar Piastri'], position: 8, points: 4 },
      { driver: driverMap['Zhou Guanyu'], position: 9, points: 2 },
      { driver: driverMap['Yuki Tsunoda'], position: 10, points: 1 },
    ];

    for (const result of australiaResults) {
      const raceResult = await RaceResult.create({
        race: races[2]._id,
        driver: result.driver._id,
        position: result.position,
        pointsAwarded: result.points,
      });
      races[2].results.push(raceResult._id);
      
      result.driver.points += result.points;
      if (result.position === 1) result.driver.wins += 1;
      if (result.position <= 3) result.driver.podiums += 1;
      await result.driver.save();
      
      const constructor = constructors.find(c => c._id.equals(result.driver.team));
      constructor.points += result.points;
      await constructor.save();
    }
    await races[2].save();

    console.log(`✓ Created race results for 3 races`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${constructors.length} Constructors`);
    console.log(`   - ${drivers.length} Drivers`);
    console.log(`   - 1 Season (${season.year})`);
    console.log(`   - ${races.length} Races`);
    console.log(`   - Race results for 3 races`);
    console.log('\n🏁 Top 5 Drivers:');
    const topDrivers = await Driver.find().sort({ points: -1 }).limit(5);
    topDrivers.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name} - ${d.points} points`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run seed
seedData();
