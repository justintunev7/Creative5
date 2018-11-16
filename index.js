var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var TeamScore = mongoose.model('scores');

router.get('/scores', function(req, res, next) {
  TeamScore.find(function(err, comments){
    if(err){ return next(err); }
    res.json(comments);
  });
});

router.post('/scores', function(req, res, next) {
  var comment = new TeamScore(req.body);
  comment.save(function(err, comment){
    if(err){ return next(err); }
    res.json(comment);
  });
});

/*
router.param('score', function(req, res, next, id) {
  var query = TeamScore.findById(id);
  query.exec(function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error("can't find comment")); }
    req.comment = comment;
    return next();
  });
});

router.get('/scores/:score', function(req, res) {
  res.json(req.comment);
});

router.put('/scores/:score/increase', function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err); }
    res.json(comment);
  });
});
*/
module.exports = router;