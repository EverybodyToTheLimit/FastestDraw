// bin/migrate.js

var db = require('../database');
db.sequelize.sync();