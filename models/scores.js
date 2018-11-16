var mongoose = require('mongoose');
var Schema = mongoose.Schema ({
  blue: { type: Number, default: 0 },
  red: { type: Number, default: 0 }
});

mongoose.model('scores', Schema);