const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// POST /api/events - Create a new event
router.post('/', async (req, res) => {
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
      include: {
        attendees: true,
      },
    });
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events - Get all events including attendees
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        attendees: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
    
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        attendees: true,
      },
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, date, capacity } = req.body;
    
    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        location,
        date: date ? new Date(date) : undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
      },
      include: {
        attendees: true,
      },
    });
    
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.event.delete({
      where: { id },
    });
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
