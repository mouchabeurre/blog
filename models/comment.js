const mongoose = require('mongoose');
const config = require('../config/database');
const shortid = require('shortid');

// Comment Schema
// TODO: add a parent param to nest replies
const CommentSchema = mongoose.Schema({
  shortCommentId: {
    type: String,
    default: shortid.generate
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  karma: {
    type: Number,
    default: 0
  },
  modified: {
    type: Boolean,
    default: false
  }
});

const Comment = module.exports = mongoose.model('Comment', CommentSchema);

const User = require('../models/user');
const Post = require('../models/post');

module.exports.addComment = function(newComment, callback) {
  newComment.save(function(err, comment) {
    Post.findByIdAndUpdate(comment.postId, {
      $push: {
        comments: {
          _id: comment._id
        }
      }
    }, function(err, res) {
      let populateQuery = [{
        path: 'authorId',
        select: 'shortUserId username'
      }];
      Comment.findById(comment._id).
      populate(populateQuery).
      exec(callback);
    });
  });
}
