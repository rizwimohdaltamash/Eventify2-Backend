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
