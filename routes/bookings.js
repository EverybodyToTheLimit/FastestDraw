// bookings.js

var express = require('express');
var router = express.Router();
var db = require('../database');
const bookClass = require('../modules/bookClass');
const cancelClass = require('../modules/cancelClass');

router.get("/all", function(req, res) {
    db.Booking.findAll()
        .then( bookings => {
            res.status(200).send(JSON.stringify(bookings));
        })
        .catch( err => {
            res.status(500).send(JSON.stringify(err));
        });
});

router.post("/:uid", async function (req, res) {
    const requestedUid = req.params.uid;
    try {
        const booking = await db.Booking.findOne({ where: { bookingUid: requestedUid } })
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
          }
        const response = await cancelClass({booking: booking})
        booking.bookingType = response.bookingType
        booking.save()
        res.status(200).send((booking));
    } catch (err) {
        res.status(500).send({ error: err.message || "An error occurred" });
    }
});

router.post("/", async function (req, res) {
    try {
        const response = await bookClass({className: req.body.className, startTime: req.body.startTime});
        const booking = await db.Booking.create({
            className: req.body.className,
            startTime: req.body.startTime,
            bookingUid: response.uid,
            bookingType: response.bookingType
        });
        res.status(200).send(booking);
    } catch (err) {
        res.status(500).send({ error: err.message || "An error occurred" });
    }
});

router.delete("/:id", function(req, res) {
    db.Booking.destroy({
        where: {
            bookingUid: req.params.bookingUid
        }
        })
        .then( () => {
            res.status(200).send();
        })
        .catch( err => {
            res.status(500).send(JSON.stringify(err));
        });
});

module.exports = router;