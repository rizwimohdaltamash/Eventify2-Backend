const prisma = require('../lib/prisma');

// Get all events with attendee count and available slots (public endpoint)
exports.getPublicEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: { attendees: true }
        }
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Add computed fields for each event
    const eventsWithAvailability = events.map(event => ({
      ...event,
      attendeeCount: event._count.attendees,
      availableSlots: event.capacity - event._count.attendees,
      isFull: event._count.attendees >= event.capacity,
      _count: undefined // Remove internal count object
    }));

    res.json(eventsWithAvailability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
};

// Get single event
exports.getEventById = async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
};

// Create event
exports.createEvent = async (req, res) => {
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
};

// Update event
exports.updateEvent = async (req, res) => {
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
    });
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.event.delete({
      where: { id },
    });
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
