// Eventify Backend - Simple MERN Stack
require('dotenv').config();

// Add these at the very top to catch any exit attempts
process.on('exit', (code) => {
  console.log(`⚠️ Process exiting with code: ${code}`);
});

process.on('beforeExit', (code) => {
  console.log(`⚠️ Process about to exit with code: ${code}`);
});

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting server setup...');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ AUTH ROUTES ============
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // First user becomes admin
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';
    
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), emailVerified: true, role }
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: 'email',
        accountId: email.toLowerCase(),
        password: hashedPassword,
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'email' }
    });

    if (!account || !account.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EVENT ROUTES ============
// Get public events
app.get('/api/events/public', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;
    let userEmail = null;

    // Try to extract userId from token if provided (optional)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
        
        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });
        userEmail = user?.email?.toLowerCase();
      } catch (err) {
        // Token invalid or expired, continue without userId
      }
    }

    const events = await prisma.event.findMany({
      include: { 
        _count: { select: { attendees: true } },
        attendees: userId ? {
          where: {
            OR: [
              { userId: userId },
              { email: userEmail || '' }
            ]
          },
          select: { id: true }
        } : false
      },
      orderBy: { date: 'asc' },
    });

    const eventsWithAvailability = events.map(event => ({
      ...event,
      attendeeCount: event._count.attendees,
      availableSlots: event.capacity - event._count.attendees,
      isFull: event._count.attendees >= event.capacity,
      userHasBooked: userId && event.attendees ? event.attendees.length > 0 : false,
      _count: undefined,
      attendees: undefined
    }));

    console.log('User ID:', userId);
    console.log('User Email:', userEmail);
    console.log('Events with booking status:', eventsWithAvailability.map(e => ({ 
      title: e.title, 
      userHasBooked: e.userHasBooked 
    })));

    res.json(eventsWithAvailability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all events (admin)
app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: { attendees: true },
      orderBy: { date: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { attendees: true },
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, location, date, capacity } = req.body;
    
    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        date: new Date(date),
        capacity: parseInt(capacity),
      },
    });
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  try {
    const { title, description, location, date, capacity } = req.body;
    
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        location,
        date: date ? new Date(date) : undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
      },
    });
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ATTENDEE ROUTES ============
// Get all attendees
app.get('/api/attendees', async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      include: { event: true },
    });
    res.json(attendees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendees by event
app.get('/api/attendees/event/:eventId', async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      where: { eventId: req.params.eventId },
      include: { event: true },
    });
    res.json(attendees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book event
app.post('/api/attendees/book', async (req, res) => {
  try {
    const { eventId, name, email, userId } = req.body;

    if (!eventId || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { attendees: true } } }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event._count.attendees >= event.capacity) {
      return res.status(400).json({ error: 'Event is full' });
    }

    const existingBooking = await prisma.attendee.findFirst({
      where: { eventId, email: email.toLowerCase() }
    });

    if (existingBooking) {
      return res.status(409).json({ error: 'Already booked this event' });
    }

    const attendee = await prisma.attendee.create({
      data: {
        name,
        email: email.toLowerCase(),
        eventId,
        userId: userId || null
      },
      include: { event: true }
    });

    res.status(201).json({ message: 'Successfully booked', attendee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel booking endpoint
app.delete('/api/attendees/cancel/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the booking
    const booking = await prisma.attendee.findFirst({
      where: {
        eventId,
        OR: [
          { userId },
          { email: user.email.toLowerCase() }
        ]
      }
    });

    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found. You have not booked this event.' 
      });
    }

    // Delete the booking
    await prisma.attendee.delete({
      where: { id: booking.id }
    });

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      details: error.message 
    });
  }
});

// Create attendee (admin)
app.post('/api/attendees', async (req, res) => {
  try {
    const { name, email, eventId } = req.body;
    
    const attendee = await prisma.attendee.create({
      data: { name, email, eventId },
      include: { event: true },
    });
    
    res.status(201).json(attendee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update attendee
app.put('/api/attendees/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const attendee = await prisma.attendee.update({
      where: { id: req.params.id },
      data: { name, email },
      include: { event: true },
    });
    
    res.json(attendee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete attendee
app.delete('/api/attendees/:id', async (req, res) => {
  try {
    await prisma.attendee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Attendee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
});

// Keep server alive
setInterval(() => {
  // Just a heartbeat to prevent process from exiting
}, 10000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
  });
});
