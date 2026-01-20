var express = require('express');
var router = express.Router();
var db = require('../database');
const bookClass = require('../modules/bookClass');
const cancelClass = require('../modules/cancelClass');
const { v4: uuidv4 } = require('uuid');
const refreshSession = require('../modules/refreshSession');

// --- GET ALL ---
router.get("/all", function(req, res) {
    db.Booking.findAll()
        .then(bookings => res.status(200).json(bookings))
        .catch(err => res.status(500).json(err));
});

// --- STATUS CHECK ---
router.get("/:uid", async function (req, res) {
    try {
        const booking = await db.Booking.findOne({ where: { bookingUid: req.params.uid } });
        if (!booking) return res.status(404).json({ status: "NOT_FOUND" });

        const status = booking.bookingType === 'PENDING' ? 'PENDING' : 'COMPLETED';
        res.status(200).json({ 
            status: status, 
            detail: booking.bookingType
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CREATE BOOKING ---
router.post("/", async function (req, res) {
    const newUid = uuidv4();

    try {
        await db.Booking.create({
            className: req.body.className,
            startTime: req.body.startTime,
            bookingUid: newUid,
            bookingType: "PENDING"
        });

        res.status(202).json({ 
            message: "Request accepted", 
            uid: newUid,
            status: "PENDING"
        });

        bookClass({ 
            className: req.body.className, 
            startTime: req.body.startTime 
        }).then(async (result) => {
            console.log(`[${newUid}] Booking Success: ${result.bookingType}`);
            await db.Booking.update(
                { bookingType: result.bookingType },
                { where: { bookingUid: newUid } }
            );
        }).catch(async (err) => {
            console.error(`[${newUid}] Booking Failed:`, err.message);
            await db.Booking.update(
                { bookingType: `FAILED: ${err.message.substring(0, 50)}` },
                { where: { bookingUid: newUid } }
            );
        });

    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// --- CANCEL BOOKING ---
router.post("/:uid/cancel", async function (req, res) {
    try {
        const booking = await db.Booking.findOne({ where: { bookingUid: req.params.uid } });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const response = await cancelClass({ 
            className: booking.className, 
            startTime: booking.startTime 
        });

        booking.bookingType = "CANCELLED";
        await booking.save();
        
        res.status(200).json(booking);
    } catch (err) {
        console.error("Cancellation Route Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- REFRESH SESSION ---
router.post("/maintenance/refresh-session", async function (req, res) {
    try {
        const result = await refreshSession();
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;