const express = require('express');
const router = express.Router();
const attendeeController = require('../controllers/attendeeController');

router.get('/', attendeeController.getAllAttendees);
router.get('/event/:eventId', attendeeController.getAttendeesByEvent);
router.post('/', attendeeController.createAttendee);
router.post('/book', attendeeController.bookEvent); // New booking endpoint
router.put('/:id', attendeeController.updateAttendee);
router.delete('/:id', attendeeController.deleteAttendee);

module.exports = router;
