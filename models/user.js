const mongoose = require('mongoose');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const shortid = require('shortid');

// User Schema
// TODO: add profile history (viewed, favorited, upvoted/downvoted posts)
const UserSchema = mongoose.Schema({
	shortUserId: {
		type: String,
		default: shortid.generate
	},
	name: {
		type: String
	},
	email: {
		type: String,
		required: true
	},
	username: {
		type: String,
		required: true,
		validate: {
			validator: function (v, cb) {
				User.find({ username: v }, "username", function (err, data) {
					data.length > 0 ? cb(false) : cb(true);
				});
			},
			message: 'Username already taken'
		}
	},
	password: {
		type: String,
		required: true
	},
	date: {
		type: Date,
		default: Date.now
	},
	karma: {
		type: Number,
		default: 0
	},
	comments: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Comment'
	}],
	favorites: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Post'
	}],
});

const User = module.exports = mongoose.model('User', UserSchema);

const Post = require('../models/post');
const Comment = require('../models/comment');

module.exports.getUserById = function (id, callback) {
	User.findById(id, { "password": 0 }, callback);
}

module.exports.getUserByUsername = function (username, auth, callback) {
	let data = null;
	if (!auth) {
		data = { 'password': 0, '_id': 0, 'email': 0, 'name': 0 };
	}
	const query = { username: username };
	User.findOne(query, data, callback);
}

module.exports.addUser = function (newUser, callback) {
	bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(newUser.password, salt, (err, hash) => {
			if (err) throw err;
			newUser.password = hash;
			newUser.save(callback);
		});
	});
}

module.exports.comparePassword = function (candidatePassword, hash, callback) {
	bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
		if (err) throw err;
		callback(null, isMatch);
	});
}
