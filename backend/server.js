const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/constructors', require('./routes/constructorRoutes'));
app.use('/api/seasons', require('./routes/seasonRoutes'));
app.use('/api/races', require('./routes/raceRoutes'));
app.use('/api/standings', require('./routes/standingsRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'F1-CMS API is running' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
