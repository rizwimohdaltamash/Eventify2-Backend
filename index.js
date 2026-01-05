require('dotenv').config();
const express = require('express');
const cors = require('cors');
const eventRoutes = require('./routes/events');
const attendeeRoutes = require('./routes/attendees');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Eventify API is running',
    version: '1.0.0',
    endpoints: {
      events: '/api/events',
      attendees: '/api/attendees',
      health: '/api/health'
    }
  });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/attendees', attendeeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`✅ API endpoints available at http://localhost:${PORT}/api`);
});
