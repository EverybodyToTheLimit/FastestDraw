// bookings.js

var express = require('express');
var router = express.Router();
var db = require('../database');

router.get("/all", function(req, res) {
    db.Booking.findAll()
        .then( bookings => {
            res.status(200).send(JSON.stringify(bookings));
        })
        .catch( err => {
            res.status(500).send(JSON.stringify(err));
        });
});

router.get("/:id", function(req, res) {
    db.Booking.findByPk(req.params.id)
        .then( bookings => {
            res.status(200).send(JSON.stringify(bookings));
        })
        .catch( err => {
            res.status(500).send(JSON.stringify(err));
        });
});

router.put("/", function(req, res) {
    db.Booking.create({
        className: req.body.className,
        startTime: req.body.startTime,
        bookingUid: req.body.bookingUid
        })
        .then( booking => {
            res.status(200).send(JSON.stringify(booking));
        })
        .catch( err => {
            res.status(500).send(JSON.stringify(err));
        });
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