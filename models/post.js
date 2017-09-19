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
  newPost.save(function(errpost, post) {
    User.findByIdAndUpdate(post.authorId, {
      $push: {
        posts: post._id
      }
    }, function(erruser, user) {
      console.log(erruser, errpost);
      callback(errpost);
    });
  });
}

module.exports.modifyPost = function(newPost, callback) {
  newPost.save(callback);
}

module.exports.getPost = function(id, callback) {
  Post.findOneAndUpdate({
    shortPostId: id
  }, {
    $inc: {
      views: 1
    }
  }).
  populate([{
    path: 'authorId',
    select: 'shortUserId username'
  }, {
    path: 'comments',
    select: 'authorId postId shortCommentId content date karma modified',
    options: {
      sort: {
        'date': -1
      }
    },
    populate: {
      path: 'authorId',
      select: 'shortUserId username'
    }
  }]).
  exec(callback);
}

module.exports.getPostCommentVotes = function(postId, userId, callback) {
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

module.exports.getPostVote = function(postId, userId, callback) {
  Post.findOne({
    shortPostId: postId
  }, {
    '_id': 1
  }, function(errpost, post) {
    User.findById(userId, {
      'pvotes': 1
    }, function(erruser, user) {
      for (userPost of user.pvotes) {
        if (userPost.postId.equals(post._id)) {
          let loadout = {
            isNew: false,
            vote: userPost.vote
          };
          callback(false, loadout);
          return null;
        }
      }
      let loadout = {
        isNew: true,
        vote: 0
      };
      callback(false, loadout);
      return null;
    });
  });
}

module.exports.votePost = function(postId, vote, userId, callback) {
  Post.getPostVote(postId, userId, function(err, loadout) {
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
    Post.findOneAndUpdate({
      shortPostId: postId
    }, {
      $inc: {
        karma: processedVote
      }
    }, function(errpost, post) {
      if (loadout.isNew) {
        User.findByIdAndUpdate(userId, {
          $push: {
            pvotes: {
              postId: post._id,
              vote: processedVote
            }
          }
        }, function(erruser, user) {
          callback(erruser, processedVote);
        });
      } else {
        User.findOneAndUpdate({
          _id: userId,
          "pvotes.postId": post._id
        }, {
          $set: {
            "pvotes.$.vote": vote
          }
        }, function(erruser, user) {
          callback(erruser, processedVote);
        });
      }
    });
  });
}

/**
 * Multiple posts actions
 */

module.exports.getPostsFeed = function(callback) {
  Post.find({}, null, {
    skip: 0,
    limit: 16,
    sort: {
      date: -1
    }
  }).
  populate([{
    path: 'authorId',
    select: 'shortUserId username'
  }]).
  exec(callback);
}
