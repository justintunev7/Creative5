var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var scoreSchema = new Schema({
  blue: { type: Number, default: 0 },
  red: { type: Number, default: 0 }
});

mongoose.model('scores', scoreSchema);