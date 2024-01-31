// database.js

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_SCHEMA || 'postgres',
                                process.env.DB_USER || 'postgres',
                                process.env.DB_PASSWORD || '',
                                {
                                    host: process.env.DB_HOST || 'localhost',
                                    port: process.env.DB_PORT || 5432,
                                    dialect: 'postgres',
                                    dialectOptions: {
                                        ssl: process.env.DB_SSL == "true"
                                    }
                                });
const Booking = sequelize.define('Bookings', {
    bookingUid: {
        type: Sequelize.STRING,
        allowNull: false
    },
    className: {
        type: Sequelize.STRING,
        allowNull: false
    },
    startTime: {
        type: Sequelize.STRING,
        allowNull: false
    },
});
module.exports = {
    sequelize: sequelize,
    Booking: Booking
};