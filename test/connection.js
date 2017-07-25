const config = require('../config/database');
const mongoose = require('mongoose');

// ES6 promises
mongoose.Promise = global.Promise;

// Connect to db before tests run
before(function (done) {
    // Connect to mongoose
    mongoose.connect(config.database);
    mongoose.connection.once('open', function () {
        console.log('Connection established');
        done();
    }).on('error', function (err) {
        console.log('Connection error:', err);
    });
});

// Drop collection before each test
beforeEach(function (done) {
    // console.log(mongoose.connection.collections);
    if (mongoose.connection.collections.users) {
        mongoose.connection.collections.users.drop();
    }
    else if (mongoose.connection.collections.posts) {
        mongoose.connection.collections.posts.drop();
    }
    done();
});