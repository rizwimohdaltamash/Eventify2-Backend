const prisma = require('../lib/prisma');

// Get all attendees
exports.getAllAttendees = async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      include: {
        event: true,
      },
    });
    res.json(attendees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get attendees by event
exports.getAttendeesByEvent = async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
};

// Create attendee
exports.createAttendee = async (req, res) => {
  try {
    const { name, email, eventId } = req.body;
    
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
    res.status(500).json({ error: error.message });
  }
};

// Update attendee
exports.updateAttendee = async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
};

// Delete attendee
exports.deleteAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.attendee.delete({
      where: { id },
    });
    
    res.json({ message: 'Attendee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Book event - allows guest and authenticated users
exports.bookEvent = async (req, res) => {
  try {
    const { eventId, name, email, userId } = req.body;

    // Validate required fields
    if (!eventId || !name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, name, and email are required' 
      });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { attendees: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check capacity
    const attendeeCount = event._count.attendees;
    if (attendeeCount >= event.capacity) {
      return res.status(400).json({ 
        error: 'Event is full',
        capacity: event.capacity,
        currentAttendees: attendeeCount
      });
    }

    // Check for duplicate booking (same email for same event)
    const existingBooking = await prisma.attendee.findFirst({
      where: {
        eventId,
        email: email.toLowerCase()
      }
    });

    if (existingBooking) {
      return res.status(409).json({ 
        error: 'You have already booked this event with this email address' 
      });
    }

    // Create attendee (linked to user if userId provided)
    const attendee = await prisma.attendee.create({
      data: {
        name,
        email: email.toLowerCase(),
        eventId,
        userId: userId || null // Link to user if authenticated
      },
      include: {
        event: true,
        user: userId ? true : false
      }
    });

    res.status(201).json({
      message: 'Successfully booked event',
      attendee
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
