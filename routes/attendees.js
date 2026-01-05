const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// POST /api/attendees - Register attendee for event
router.post('/', async (req, res) => {
  try {
    const { name, email, eventId } = req.body;
    
    // Validate that event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { attendees: true },
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if event is at capacity
    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({ error: 'Event is at full capacity' });
    }
    
    const attendee = await prisma.attendee.create({
      data: {
        name,
        email,
        eventId,
      },
      include: {
        event: true,
      },
    });
    
    res.status(201).json(attendee);
  } catch (error) {
    console.error('Create attendee error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendees - Get all attendees
router.get('/', async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      include: {
        event: true,
      },
    });
    
    res.json(attendees);
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendees/event/:eventId - Get attendees by event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const attendees = await prisma.attendee.findMany({
      where: { eventId },
      include: {
        event: true,
      },
    });
    
    res.json(attendees);
  } catch (error) {
    console.error('Get attendees by event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/attendees/:id - Update attendee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    
    const attendee = await prisma.attendee.update({
      where: { id },
      data: {
        name,
        email,
      },
      include: {
        event: true,
      },
    });
    
    res.json(attendee);
  } catch (error) {
    console.error('Update attendee error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/attendees/:id - Delete attendee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.attendee.delete({
      where: { id },
    });
    
    res.json({ message: 'Attendee deleted successfully' });
  } catch (error) {
    console.error('Delete attendee error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
