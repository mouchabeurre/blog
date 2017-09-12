const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');

const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');

// register
router.post('/user/register', (req, res, next) => {
  let newUser = new User({
    name: req.body.name,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password
  });

  User.addUser(newUser, function(err) {
    if (err) {
      res.json({
        success: false,
        msg: 'Something went wrong: ' + err,
        feedback: 3 // danger
      });
    } else {
      res.json({
        success: true,
        msg: 'You are now registered and can log in',
        feedback: 0 // success
      });
    }
  });
});

// check if username is available
router.post('/user/username', (req, res, next) => {
  const username = req.body.username;
  User.usernameAvail(username, (err, exists) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to check username availability: ' + err
      });
    } else {
      if (exists) {
        res.json({
          success: true,
          msg: 'Username available'
        });
      } else {
        res.json({
          success: false,
          msg: 'Username unavailable'
        });
      }
    }
  });
});

// check if email is available
router.post('/user/email', (req, res, next) => {
  const email = req.body.email;
  User.emailAvail(email, (err, exists) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to check email availability: ' + err
      });
    } else {
      if (exists) {
        res.json({
          success: true,
          msg: 'email available'
        });
      } else {
        res.json({
          success: false,
          msg: 'email unavailable'
        });
      }
    }
  });
});

// authenticate
router.post('/user/authenticate', (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  User.getUserByUsername(username, true, (err, user) => {
    if (err) throw err;
    if (!user) {
      if (req.body.username) {
        return res.json({
          success: false,
          msg: 'User <b>' + username + '</b> not found or wrong password!',
          feedback: 3 // danger
        });
      } else {
        return res.json({
          success: false,
          msg: 'User not found or wrong password!',
          feedback: 3 // danger
        });
      }
    }

    User.comparePassword(password, user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        const token = jwt.sign({
          userId: user._id
        }, config.secret, {
          expiresIn: 604800 // 1 week
        });

        res.json({
          success: true,
          msg: 'Welcome back <b>' + user.name + '</b>!',
          feedback: 0, // success,
          token: 'JWT ' + token,
          user: {
            id: user._id,
            name: user.name,
            username: user.username,
            email: user.email
          }
        });
      } else {
        return res.json({
          success: false,
          msg: 'User not found or wrong password!',
          feedback: 3 // danger
        });
      }
    });
  });
});

// get own profile
router.get('/profile', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  res.json(req.user);
  // User.getUserById(req._id, (err, profile) => {
  // 	if (err) {
  // 		res.json({ success: false, msg: 'Failed to retrieve profile' });
  // 	} else {
  // 		res.json(profile);
  // 	}
  // });
});

// get specific profile
router.get('/user/:username', (req, res, next) => {
  let username = req.params.username;
  User.getUserByUsername(username, false, (err, profile) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to retrieve profile'
      });
    } else {
      res.json(profile);
    }
  });
});

// get posts feed
// TODO: return {qty: 15} and offset when reaching end
router.get('/feed', (req, res, next) => {
  Post.getPostsFeed((err, feed) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to retrieve feed'
      });
    } else {
      res.json(feed);
    }
  });
});

// get specific post
router.get('/post/:id', (req, res, next) => {
  let postId = req.params.id;
  Post.getPost(postId, (err, post) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to retrieve post'
      });
    } else {
      res.json(post);
    }
  });
});

// post
router.post('/post/submit', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let newPost = new Post({
    title: req.body.title,
    content: req.body.content,
    imageURL: req.body.imageURL,
    authorId: req.user._id
  });

  Post.addPost(newPost, (err) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to submit',
        feedback: 3 // danger
      });
    } else {
      res.json({
        success: true,
        msg: 'Submitted',
        feedback: 0 // success
      });
    }
  });
});

// comment
router.post('/post/:id/comment', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let id = req.params.id;
  let content = req.body.content;
  let authorId = req.user._id;
  Post.getPost(id, (err, post) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to comment',
        feedback: 3 // danger
      });
    } else {
      let newComment = new Comment({
        authorId: authorId,
        postId: post._id,
        content: content
      });

      Comment.addComment(newComment, (err, comment) => {
        if (err) {
          res.json({
            success: false,
            msg: 'Failed to comment',
            feedback: 3 // danger
          });
        } else {
          res.json({
            success: true,
            msg: 'Commented',
            feedback: 0, // success
            newComment: comment
          });
        }
      });
    }
  });
});

// vote post
// upvote
router.put('/post/:id/upvote', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let postId = req.params.id;
  let userId = req.user._id;
  Post.votePost(postId, 1, userId, (err, post) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to vote'
      });
    } else {
      res.json({
        success: true,
        msg: 'Upvoted'
      });
    }
  });
});

// downvote
router.put('/post/:id/downvote', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let postId = req.params.id;
  let userId = req.user._id;
  Post.votePost(postId, -1, userId, (err, post) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to vote'
      });
    } else {
      res.json({
        success: true,
        msg: 'Downvoted'
      });
    }
  });
});

// // vote comment
// // upvote
router.put('/comment/:id/upvote', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let commentId = req.params.id;
  let userId = req.user._id;
  Comment.voteComment(commentId, 1, userId, (err, processedVote) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to vote' + err
      });
    } else {
      res.json({
        success: true,
        msg: 'Upvoted',
        voted: processedVote
      });
    }
  });
});

// downvote
router.put('/comment/:id/downvote', passport.authenticate('jwt', {
  session: false
}), (req, res, next) => {
  let commentId = req.params.id;
  let userId = req.user._id;
  Comment.voteComment(commentId, -1, userId, (err, processedVote) => {
    if (err) {
      res.json({
        success: false,
        msg: 'Failed to vote'
      });
    } else {
      res.json({
        success: true,
        msg: 'Downvoted',
        voted: processedVote
      });
    }
  });
});

module.exports = router;
