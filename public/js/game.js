var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 1200,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
    this.load.image('bullet', 'assets/bullet.png', 4, 4);
    this.load.image('asteroid', 'assets/asteroid.png', 1, 1);
}

var lasers;
var mouseTouchDown = false;


function resetLaser(laser) {
    // Destroy the laser
    laser.kill();
}


function create() {
    var self = this;
    this.socket = io();

    this.otherPlayers = this.physics.add.group();

    this.socket.on('currentPlayers', function(players) {
        Object.keys(players).forEach(function(id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            }
            else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on('newPlayer', function(playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('disconnect', function(playerId) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });
    this.socket.on('playerMoved', function(playerInfo) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.click = game.input.activePointer;

    this.blueScoreText = this.add.text(48, 42, '', { fontSize: '28px', fill: '#0000FF' });
    this.redScoreText = this.add.text(700, 42, '', { fontSize: '28px', fill: '#FF0000' });

    this.socket.on('scoreUpdate', function(scores) {
        self.blueScoreText.setText('Current Score: ' + scores.blue);
        self.redScoreText.setText('Current Score: ' + scores.red);
    });
    
    this.blueWinsText = this.add.text(48, 8, '', { fontSize: '42px', fill: '#0000FF' });
    this.redWinsText = this.add.text(700, 8, '', { fontSize: '42px', fill: '#FF0000' });

    this.socket.on('winUpdate', function(wins) {
        self.blueWinsText.setText('Blue Wins: ' + wins.blue);
        self.redWinsText.setText('Red Wins: ' + wins.red);
    });

    this.socket.on('starLocation', function(starLocation) {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        self.physics.add.overlap(self.ship, self.star, function() {
            this.socket.emit('starCollected');
        }, null, self);
    });

    this.socket.on('asteroidLocation', function(asteroidLocation) {
        if (self.asteroid) self.asteroid.destroy();
        self.asteroid = self.physics.add.image(asteroidLocation.x, asteroidLocation.y, 'asteroid');
        self.physics.add.overlap(self.ship, self.asteroid, function() {
            this.socket.emit('asteroidCollected');
        }, null, self);
    });

}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        self.ship.setTint(0x0000ff);
    }
    else {
        self.ship.setTint(0xff0000);
    }
    self.ship.setDrag(500);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(500);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    }
    else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}


function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-350);
        }
        else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(350);
        }
        else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 300, this.ship.body.acceleration);
        }
        else {
            this.ship.setAcceleration(0);
        }

        if (this.click.isDown) {
            console.log("Mouse click");
            fireLaser();
            //     weapon.fire();
        }

        // Game.input.activePointer is either the first finger touched, or the mouse
        if (game.input.activePointer.isDown) {
            // We'll manually keep track if the pointer wasn't already down
            if (!mouseTouchDown) {
                touchDown();
            }
        }
        else {
            if (mouseTouchDown) {
                touchUp();
            }
        }
        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }
        // save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
}

function touchDown() {
    // Set touchDown to true, so we only trigger this once
    mouseTouchDown = true;
    fireLaser();
}

function touchUp() {
    // Set touchDown to false, so we can trigger touchDown on the next click
    mouseTouchDown = false;
}

function fireLaser() {
    console.log("Mouse Down");
    // Get the first laser that's inactive, by passing 'false' as a parameter
    //var laser = lasers.getFirstExists(false);
    //if (laser) {
    // If we have a laser, set it to the starting position
    //    laser.reset(this.ship.x, this.ship.y - 20);
    // Give it a velocity of -500 so it starts shooting
    //    laser.body.velocity.y = -500;
    //}
}
