var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/asteroids', { useNewUrlParser: true });
var scores = require('./models/scores');
var db = mongoose.connection; //Saves the connection as a variable to use
db.on('error', console.error.bind(console, 'connection error:')); //Checks for connection errors
db.once('open', function() { //Lets us know when we're connected
    console.log('Connected to database');
});

var players = {};
var star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};
var asteroid = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};
var scores = {
  blue: 0,
  red: 0
};

var Schema = mongoose.Schema;
var scoreSchema = new Schema({
  blue: { type: Number, default: 0 },
  red: { type: Number, default: 0 }
});

var teamScores = mongoose.model("Score", scoreSchema);

var wins = new teamScores({
  blue: 0,
  red: 0
});

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  console.log('a user connected: ', socket.id);
  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // send the star object to the new player
  socket.emit('starLocation', star);
  
  socket.emit('asteroidLocation', asteroid);
  // send the current scores
  socket.emit('scoreUpdate', scores);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  socket.emit("winUpdate", wins);

  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function() {
    console.log('user disconnected: ', socket.id);
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', function(movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('starCollected', function() {
    if (players[socket.id].team === 'red') {
      scores.red += 10;
    }
    else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * 700) + 50;
    star.y = Math.floor(Math.random() * 500) + 50;
    io.emit('starLocation', star);
    io.emit('scoreUpdate', scores);
    if(scores.red >= 300) {
      scores.red = 0;
      scores.blue = 0;
      io.emit("scoreUpdate", scores);
      wins.red += 1;
      io.emit("winUpdate", wins);
    }
    if(scores.blue >= 300) {
      scores.red = 0;
      scores.blue = 0;
      io.emit("scoreUpdate", scores);
      wins.blue += 1;
      io.emit("winUpdate", wins);
    }
  });

  socket.on('asteroidCollected', function() {
    if (players[socket.id].team === 'red') {
      scores.red -= 10;
    }
    else {
      scores.blue -= 10;
    }
    asteroid.x = Math.floor(Math.random() * 700) + 50;
    asteroid.y = Math.floor(Math.random() * 500) + 50;
    io.emit('asteroidLocation', asteroid);
    io.emit('scoreUpdate', scores);
  });
});



server.listen(8081, function() {
  console.log(`Listening on ${server.address().port}`);
});
