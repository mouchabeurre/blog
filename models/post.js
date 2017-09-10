const mongoose = require('mongoose');
const config = require('../config/database');
const shortid = require('shortid');

// Post Schema
const PostSchema = mongoose.Schema({
  shortPostId: {
    type: String,
    default: shortid.generate
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageURL: {
    type: String
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  karma: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
});

const Post = module.exports = mongoose.model('Post', PostSchema);

const Comment = require('../models/comment');
const User = require('../models/user');

/**
 * Single post actions
 */

module.exports.addPost = function(newPost, callback) {
  newPost.save(callback);
}

module.exports.modifyPost = function(newPost, callback) {
  newPost.save(callback);
}

module.exports.getPost = function(id, callback) {
  let populateQuery = [{
    path: 'authorId',
    select: 'shortUserId username'
  }, {
    path: 'comments',
    select: 'authorId postId shortCommentId content date karma modified',
    populate: {
      path: 'authorId',
      select: 'shortUserId username'
    }
  }];
  Post.findOneAndUpdate({
    shortPostId: id
  }, {
    $inc: {
      views: 1
    }
  }).
  populate(populateQuery).
  exec(callback);
}

module.exports.votePost = function(id, vote, callback) {
  Post.findOneAndUpdate({
    shortPostId: id
  }, {
    $inc: {
      karma: vote * 1
    }
  }, callback);
}

/**
 * Multiple posts actions
 */

module.exports.getPostsFeed = function(callback) {
  let populateQuery = [{
    path: 'authorId',
    select: 'shortUserId username'
  }];
  Post.find({}, null, {
    skip: 0,
    limit: 10,
    sort: {
      date: -1
    }
  }).
  populate(populateQuery).
  exec(callback);
}
