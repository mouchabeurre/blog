const mongoose = require('mongoose');
const config = require('../config/database');
const shortid = require('shortid');
const assert = require('assert');

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
  shortPostId: {
    type: String,
    default: shortid.generate
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

getUserVoteByCommentId = function(cid, uid, callback) {
  Comment.findOne({
    shortCommentId: cid
  }, {'_id': 1}, function(err, comment_id) {
    User.findById(uid, {'cvotes': 1}).
    populate([{
      path: 'cvotes.commentId',
      select: '_id'
    }]).
    exec(function(err, res) {
      if (err) {
        let loadout = {
          isNew: false,
          vote: 0
        };
        callback(loadout);
        return null;
      } else if (res !== null) {
        for (votedComment of res.cvotes) {
          if (votedComment.commentId._id.equals(comment_id._id)) {
            let loadout = {
              isNew: false,
              vote: votedComment.vote
            };
            callback(loadout);
            return null;
          }
        }
        let loadout = {
          isNew: true,
          vote: 0
        };
        callback(loadout);
        return null;
      }
    });
  });
}

module.exports.addComment = function(newComment, callback) {
  newComment.save(function(err, comment) {
    User.findByIdAndUpdate(newComment.authorId, {
      $push: {
        comments: {
          _id: comment._id
        }
      }
    }, function(err, res) {
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
  });
}

module.exports.voteComment = function(commentId, vote, userId, callback) {
  getUserVoteByCommentId(commentId, userId, function(loadout) {
    let processedVote;
    if (loadout.vote == vote) {
      processedVote = -vote;
    } else if (loadout.vote == -vote) {
      processedVote = 2 * vote;
    } else {
      processedVote = vote;
    }
    if (loadout.vote > vote) {
      vote = -1;
    } else if (loadout.vote < vote) {
      vote = 1
    } else {
      vote = 0
    }
    Comment.findOneAndUpdate({
      shortCommentId: commentId
    }, {
      $inc: {
        karma: processedVote
      }
    }, function(err, comment) {
      if (loadout.isNew) {
        User.findByIdAndUpdate(userId, {
          $push: {
            cvotes: {
              commentId: comment._id,
              vote: processedVote
            }
          }
        }, function(err, user) {
          callback(err, processedVote);
        });
      } else {
        User.findOneAndUpdate({
          _id: userId,
          "cvotes.commentId": comment._id
        }, {
          $set: {
            "cvotes.$.vote": vote
          }
        }, function(err, user) {
          callback(err, processedVote);
        });
      }
    });
  });
}
