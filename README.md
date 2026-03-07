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

## Project Structure

```
f1-cms/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── postController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── Post.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── postRoutes.js
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
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
