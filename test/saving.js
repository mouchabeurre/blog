const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/user');
const Post = require('../models/post');

describe('Saving things to the database', function () {

    it('Adds 1 user', function (done) {
        let newUser = new User({
            name: 'John',
            username: 'JDoe',
            email: 'jdoe@doe.com',
            password: '123'
        });

        User.addUser(newUser, function () {
            assert(newUser.isNew === false);
            done();
        });
    });

    var _id = mongoose.Types.ObjectId();

    it('Adds 1 post', function (done) {
        let newPost = new Post({
            title: 'Autoloc',
            authorId: _id
        });

        Post.addPost(newPost, function () {
            assert(newPost.isNew === false);
            done();
        });
    });

    // Add comment to post

    // Add comment to comment
});