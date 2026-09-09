# F1-CMS – Formula 1 Content Management System

A modern, production-ready MERN stack application for managing Formula 1 content with JWT authentication, role-based access control, and full Docker support.

## Tech Stack

- MongoDB - Database
- Express.js - Backend framework
- React.js (Vite) - Frontend framework
- Node.js - Runtime environment
- JWT - Authentication
- Mongoose - ODM
- Tailwind CSS - Styling
- Framer Motion - Animations
- Docker & Docker Compose - Containerization

## Features

### Blog Management
- JWT-based authentication
- Role-based access control (Admin/User)
- Admin dashboard for content management
- Create, read, update, delete posts
- Responsive F1-themed UI with glassmorphism
- Smooth animations
- Protected routes
- Toast notifications
- Fully Dockerized

### Championship Management (NEW)
- Complete F1 Championship tracking system
- Driver management (CRUD operations)
- Constructor/Team management (CRUD operations)
- Season and race management
- Race results submission with automatic points calculation
- Official F1 points system (25-18-15-12-10-8-6-4-2-1)
- Real-time driver standings
- Real-time constructor standings
- Automatic wins and podiums tracking
- Dynamic leaderboards sorted by points

### F1 Legends Hall of Fame
- Interactive 3D flip cards showcasing F1 legends
- Tilt and mouse interaction effects
- Admin image upload/override system (Base64 & URL support)
- Career statistics and legacy information
- Responsive design with smooth animations

### AI-Powered Race Predictions (NEW)
- Statistical prediction engine for race outcomes
- Qualifying predictions with pole position probability
- Multi-factor analysis:
  - Circuit-specific historical performance (30%)
  - Current season form and points (25%)
  - Recent 5-race momentum (20%)
  - Season wins and podiums (10% each)
- Win probability and podium probability calculations
- Confidence ratings and detailed reasoning
- Support for all F1 circuits and seasons

## Project Structure

```
f1-cms/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── constructorController.js
│   │   ├── driverController.js
│   │   ├── f1DataController.js
│   │   ├── legendController.js
│   │   ├── postController.js
│   │   ├── predictionController.js
│   │   ├── raceController.js
│   │   ├── seasonController.js
│   │   └── standingsController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── Constructor.js
│   │   ├── Driver.js
│   │   ├── Legend.js
│   │   ├── Post.js
│   │   ├── Race.js
│   │   ├── RaceResult.js
│   │   ├── Season.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── constructorRoutes.js
│   │   ├── driverRoutes.js
│   │   ├── f1DataRoutes.js
│   │   ├── legendRoutes.js
│   │   ├── postRoutes.js
│   │   ├── raceRoutes.js
│   │   ├── seasonRoutes.js
│   │   └── standingsRoutes.js
│   ├── services/
│   │   ├── f1DataService.js
│   │   ├── pointsService.js
│   │   └── predictionService.js
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   ├── circuits/
│   │   ├── images/
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── SEOHead.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── Predictions.jsx
│   │   │   └── ...
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

## Running Locally (Without Docker)

### Prerequisites
- Node.js 18+
- MongoDB installed and running

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```bash
cp .env.example .env
```

4. Update .env with your MongoDB URI:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/f1cms
JWT_SECRET=your_super_secret_jwt_key
```

5. Start the server:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on http://localhost:3000

## Running with Docker (Production)

### Prerequisites
- Docker
- Docker Compose

### Steps

1. Build and start all services:
```bash
docker-compose build
docker-compose up
```

Or in one command:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

3. Stop the services:
```bash
docker-compose down
```

4. Stop and remove volumes:
```bash
docker-compose down -v
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Posts (Blog)
- GET `/api/posts` - Get all posts (Public)
- GET `/api/posts/:id` - Get single post (Public)
- POST `/api/posts` - Create post (Admin only)
- PUT `/api/posts/:id` - Update post (Admin only)
- DELETE `/api/posts/:id` - Delete post (Admin only)

### Drivers
- GET `/api/drivers` - Get all drivers (Public)
- GET `/api/drivers/:id` - Get single driver (Public)
- POST `/api/drivers` - Create driver (Admin only)
- PUT `/api/drivers/:id` - Update driver (Admin only)
- DELETE `/api/drivers/:id` - Delete driver (Admin only)

### Constructors
- GET `/api/constructors` - Get all constructors (Public)
- GET `/api/constructors/:id` - Get single constructor (Public)
- POST `/api/constructors` - Create constructor (Admin only)
- PUT `/api/constructors/:id` - Update constructor (Admin only)
- DELETE `/api/constructors/:id` - Delete constructor (Admin only)

### Seasons
- GET `/api/seasons` - Get all seasons (Public)
- GET `/api/seasons/:year` - Get season by year (Public)
- POST `/api/seasons` - Create season (Admin only)

### Races
- GET `/api/races` - Get all races (Public)
- POST `/api/races` - Create race (Admin only)
- POST `/api/races/:id/results` - Submit race results (Admin only)

### Standings
- GET `/api/standings/drivers/:seasonYear` - Get driver standings (Public)
- GET `/api/standings/constructors/:seasonYear` - Get constructor standings (Public)

### Legends
- GET `/api/legends` - Get all legend image overrides (Public)
- PUT `/api/legends/:legendId` - Update legend images (Admin only)

### F1 Live Data & Predictions
- GET `/api/f1/schedule` - Get race schedule
- GET `/api/f1/next-race` - Get next upcoming race
- GET `/api/f1/standings/drivers/:year?` - Get official driver standings
- GET `/api/f1/standings/constructors/:year?` - Get official constructor standings
- GET `/api/f1/predict/:circuitId?year=2026&type=race` - Get race predictions (Public)
- GET `/api/f1/predict/:circuitId?year=2026&type=qualifying` - Get qualifying predictions (Public)
- GET `/api/f1/dashboard` - Get compound dashboard data

## Default Users

After registration, you can create users with different roles:

Admin User:
- Role: admin (select during registration)
- Can create, edit, delete posts

Regular User:
- Role: user (default)
- Can only view posts

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://mongo:27017/f1cms
JWT_SECRET=your_super_secret_jwt_key
```

## Docker Services

- `mongo` - MongoDB database (port 27017)
- `backend` - Express API server (port 5000)
- `frontend` - React app served by Nginx (port 80)

## Development Notes

- Backend uses nodemon for hot reloading
- Frontend uses Vite for fast development
- JWT tokens stored in localStorage
- Passwords hashed with bcrypt
- CORS enabled for development

## Production Considerations

- Change JWT_SECRET to a strong random string
- Use environment-specific MongoDB URI
- Enable HTTPS
- Set up proper logging
- Configure rate limiting
- Add input validation
- Implement refresh tokens
- Set up monitoring

## License

MIT
