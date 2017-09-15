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
    select: 'karma'
  }, {
    path: 'posts',
    select: 'karma'
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
  let data = null;
  if (!auth) {
    data = {
      'password': 0,
      '_id': 0,
      'email': 0,
      'name': 0
    };
  }
  const query = {
    username: username
  };
  User.findOne(query, data, callback);
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

module.exports.getPostVotes = function(postId, userId, callback) {
  Post.findOne({
    shortPostId: postId
  }, {
    'comments': 1
  }).
  populate([{
    path: 'comments',
    select: 'shortCommentId'
  }]).
  exec(function(errpost, post) {
    User.findById(userId, {
      'cvotes': 1
    }).
    populate([{
      path: 'cvotes.commentId',
      select: '_id'
    }]).
    exec(function(erruser, user) {
      let areVoted = [];
      for (let i = 0; i < post.comments.length; i++) {
        for (let j = 0; j < user.cvotes.length; j++) {
          if (user.cvotes[j].commentId._id.equals(post.comments[i]._id)) {
            areVoted.push({
              id: post.comments[i].shortCommentId,
              vote: user.cvotes[j].vote
            });
          }
        }
      }
      callback(errpost, areVoted);
    });
  });
}
