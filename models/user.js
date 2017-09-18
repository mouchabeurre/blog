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
    required: true
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  pvotes: [{
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    vote: {
      type: Number
    }
  }],
  cvotes: [{
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    },
    vote: {
      type: Number
    }
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
});

const User = module.exports = mongoose.model('User', UserSchema);

const Post = require('../models/post');
const Comment = require('../models/comment');

module.exports.usernameAvail = function(username, callback) {
  User.findOne({
    username: username
  }, "username", function(err, data) {
    if (data !== null) {
      callback(err, false);
    } else {
      callback(err, true);
    }
  });
}

module.exports.emailAvail = function(email, callback) {
  User.findOne({
    email: email
  }, "email", function(err, data) {
    if (data !== null) {
      callback(err, false);
    } else {
      callback(err, true);
    }
  });
}

module.exports._authUserById = function(id, callback) {
  User.findById(id, {
    "shortUserId": 1,
    "username": 1
  }, callback);
}

module.exports.getUserById = function(id, callback) {
  User.findById(id, {
    "password": 0
  }).
  populate([{
    path: 'comments',
    select: 'date shortPostId content karma',
    options: {
      sort: {
        'date': -1
      }
    },
  }, {
    path: 'posts',
    select: 'date shortPostId title karma',
    options: {
      sort: {
        'date': -1
      }
    },
  }]).
  lean().
  exec(function(erruser, user) {
    let totalKarma = 0;
    for (comment of user.comments) {
      totalKarma += comment.karma;
    }
    for (post of user.posts) {
      totalKarma += post.karma;
    }
    user.karma = totalKarma;
    callback(erruser, user);
  });
}

module.exports.getUserByUsername = function(username, auth, callback) {
  if (!auth) {
    User.findOne({
      username: username
    }, {
      'password': 0,
      '_id': 0,
      'email': 0,
      'name': 0
    }).
    populate([{
      path: 'comments',
      select: 'date shortPostId content karma',
      options: {
        sort: {
          'date': -1
        }
      },
    }, {
      path: 'posts',
      select: 'date shortPostId title karma',
      options: {
        sort: {
          'date': -1
        }
      },
    }]).
    lean().
    exec(function(erruser, user) {
      let totalKarma = 0;
      for (comment of user.comments) {
        totalKarma += comment.karma;
      }
      for (post of user.posts) {
        totalKarma += post.karma;
      }
      user.karma = totalKarma;
      callback(erruser, user);
    });
  } else {
    User.findOne({
      username: username
    }, {
      'shortUserId': 1,
      'name': 1,
      'username': 1,
      'email': 1,
      'password': 1
    }, callback);
  }
}

module.exports.addUser = function(newUser, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if (err) throw err;
      newUser.password = hash;
      newUser.save(callback);
    });
  });
}

module.exports.comparePassword = function(candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
}

// for future use
// module.exports.getUserPosts = function(userId, callback) {
//   findOne({
//     shortUserId: userId
//   }, {
//     'posts': 1
//   }, callback(err, user.posts));
// }
//
// module.exports.getUserComments = function(userId, callback) {
//   findOne({
//     shortUserId: userId
//   }, {
//     'comments': 1
//   }, callback(err, user.comments));
// }
