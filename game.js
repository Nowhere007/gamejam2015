/* globals Phaser, GetNames */
var WIDTH = 800;
var HEIGHT = 640;
var SCORE_LIMIT = 10;
var PLAYER_SPEED = 325;
var DASH_SPEED = 600;
var game = new Phaser.Game(WIDTH, HEIGHT, Phaser.CANVAS, 'game');

var ScrollText = function (game, x, y, text) {
  Phaser.Text.call(this, game, x, y, text);
  this.speed = 1.02;
};

ScrollText.prototype = Object.create(Phaser.Text.prototype);
ScrollText.prototype.constructor = ScrollText;
ScrollText.prototype.update = function () {
  this.x *= this.speed;

  if (this.x > WIDTH * 2) {
    game.world.remove(this);
  }
};

var PhaserGame = function () {
  this.platforms = null;
  this.hazards = null;
  this.distractions = null;
  this.sky = null;
  this.emitter = null;

  this.cursors = null;
  this.wasd = null;
  this.spaceBar = null;
  this.spaceDown = false;

  this.gameState = null;

  this.powerupLocations = [];
  this.powerupTargets = [];
  this.powerupEffects = [];
  this.powerups = null;
  this.powerupTimer = null;
  this.powerupOnScreen = false;

  this.overlayText = null;

  this.avatarList = [];
};

PhaserGame.prototype = {
  init: function () {
    this.game.renderer.renderSession.roundPixels = true;
    this.world.resize(WIDTH, HEIGHT);
    this.physics.startSystem(Phaser.Physics.ARCADE);
    this.physics.arcade.gravity.y = 750;
    this.physics.arcade.skipQuadTree = false;
    this.gameState = "LOADING";
  },

  preload: function () {
    // Music
    game.load.audio('soundtrack', ['assets/audio/sdtk.mp3', 'assets/audio/sdtk.ogg']);
    game.load.audio('dead', ['assets/audio/dead.mp3', 'assets/audio/dead.ogg']);
    game.load.audio('jump1', ['assets/audio/jump1.mp3', 'assets/audio/jump1.ogg']);
    game.load.audio('jump2', ['assets/audio/jump2.mp3', 'assets/audio/jump2.ogg']);
    game.load.audio('rivalry', ['assets/audio/rivalry.mp3', 'assets/audio/rivalry.ogg']);
    game.load.audio('scrot', ['assets/audio/scrot.mp3', 'assets/audio/scrot.ogg']);

    this.load.image('background', 'assets/bg1.png');
    this.load.image('intro', 'assets/IntroScreen.png');
    this.load.image('loading', 'assets/loading.png');

    // Platforms
    this.load.image('box', 'assets/box_dirty.png');
    this.load.image('shortplatform', 'assets/shortplatform_dirty.png');
    this.load.image('longplatform', 'assets/longplatform_dirty.png');
    this.load.image('ice-platform', 'assets/ice-platform.png');
    this.load.image('fire-platform', 'assets/fire-platform_new.png');
    this.load.image('graboid', 'assets/graboid_glow.png');
    this.load.image('800pxwidesatanscrotum', 'assets/800pxwidedevilscrotum.png');
    this.load.image('particle', 'assets/particle1.png');

    game.load.image('fire1', 'assets/fire1.png');
    game.load.image('fire2', 'assets/fire2.png');
    game.load.image('fire3', 'assets/fire3.png');

    game.load.image('pube1', 'assets/pube1.png');
    game.load.image('pube2', 'assets/pube2.png');
    game.load.image('pube3', 'assets/pube3.png');

    // Characters
    this.load.spritesheet('dude', 'assets/metalslug_monster39x40_glow.png', 39, 40);
    this.load.spritesheet('evil-dude', 'assets/metalslug_mummy37x45_glow.png', 37, 45, 18);

    game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64);
  },

  createWorld: function () {
    this.stage.backgroundColor = '#000';
    this.add.sprite(0, 0, 'background');

    this.distractions = this.add.physicsGroup();
    this.hazards = this.add.physicsGroup();

    this.devilEmitters = [];
    var devilEmissions = ['pube1', 'pube2', 'pube3'];

    for (var i = 0; i < devilEmissions.length; i++) {
      this.devilEmitters[i] = this.add.emitter((i+1) * WIDTH/4,-700);
      this.devilEmitters[i].gravity = -250;
      this.devilEmitters[i].makeParticles(devilEmissions, 1, 100, false, false);
      this.devilEmitters[i].start(false, 1000, i % 2 === 0 ? 400 : 500, 0, false);
    }

    this.powerups = this.add.physicsGroup();
    this.spawnPowerup();

    this.powerups.setAll('body.allowGravity', false);
    this.powerups.setAll('body.immovable', true);

    this.platforms = this.add.physicsGroup();
    this.fires = this.add.physicsGroup();

    // Box: w184 h157
    // Bottom left and right boxes
    this.platforms.create(0, HEIGHT-107, 'box').scale.setTo(1,1);
    this.platforms.create(WIDTH-184, HEIGHT-107, 'box').scale.setTo(1,1);

    // Short Platform: w129 h66
    // Short middle platform, second level
    this.platforms.create(WIDTH/2-66, HEIGHT-167, 'shortplatform').scale.setTo(1,1);

    // Top left and right short platforms
    this.platforms.create(0, 145, 'shortplatform');
    this.platforms.create(WIDTH-129, 145, 'shortplatform');

    // Long Platform: w345 h65
    // Left and right long platforms, third level
    this.platforms.create(WIDTH-345, HEIGHT-330, 'longplatform').scale.setTo(1,1);
    this.platforms.create(0, HEIGHT-330, 'longplatform').scale.setTo(1,1);

    // Bobbing distraction layer
    this.distractions.create(0, 0, '800pxwidesatanscrotum').scale.setTo(1,1);

    // Moving lava platform, top
    this.hazards.create(WIDTH, HEIGHT-250, 'graboid').scale.setTo(0.3,0.3);


    var mpi = this.hazards.create(0, 190, 'fire-platform');
    mpi.body.velocity.x = this.rnd.between(50, 350);

    this.platforms.setAll('body.allowGravity', false);
    this.platforms.setAll('body.immovable', true);

    this.distractions.setAll('body.allowGravity', false);
    this.distractions.setAll('body.immovable', true);

    this.hazards.setAll('body.allowGravity', false);
    this.hazards.setAll('body.immovable', true);

    addFire.call(this, 33, 85, this.fires);
    addFire.call(this, WIDTH-96, 85, this.fires);
    this.fires.setAll('body.allowGravity', false);
    this.fires.setAll('body.immovable', true);

    function addFire(x, y, fires) {
      var fireEmitter = game.add.emitter(x + 30, y + 40, 500);
      fireEmitter.makeParticles( [ 'fire1', 'fire2', 'fire3'] );
      fireEmitter.gravity = -750;
      fireEmitter.setAlpha(1, 0, 2000);
      fireEmitter.setScale(0.25, 0, 0.25, 0, 1250);

      fireEmitter.x = fireEmitter.x + (0.75*fireEmitter.getBounds().width);
      fireEmitter.y = fireEmitter.y + (0.75*fireEmitter.getBounds().height);

      fireEmitter.start(false, 4000, 1);

      var fire = fires.create(x, y, 'kaboom', 23);
    }
  },

  definePowerupLocations: function () {
    this.powerupLocations[0] = new Phaser.Point(65,250);
    this.powerupLocations[1] = new Phaser.Point(WIDTH - 100,250);
    this.powerupLocations[2] = new Phaser.Point(WIDTH/2 - 25,HEIGHT/2 + 95);
    this.powerupLocations[3] = new Phaser.Point(65,HEIGHT/2 + 150);
    this.powerupLocations[4] = new Phaser.Point(WIDTH - 100,HEIGHT/2 + 150);
  },

  definePowerupEffects: function () {
    this.powerupEffects = ['boost', 'slow', 'freeze', 'kill', 'reverse', '1up'];
  },

  definePowerupTargets: function() {
    this.powerupTargets = ['self', 'others', 'everyone'];
  },

  setNames: function(players) {
    var names = GetNames(players.length);

    for(var i = 0; i < players.length; i++) {
      var nameStr = names[i].first + ' ' + names[i].last;
      if(names[i].suffix) nameStr += ', ' + names[i].suffix;
      players[i].playerName = nameStr;
      var offsetY = 0;
      var offsetX = 0;
      if(players[i].scores[0].x >= WIDTH / 2 ) {
        offsetY = 35;
        offsetX = 0;
      }

      var text = game.add.text(players[i].scores[0].x+offsetX, offsetY, nameStr);
      text.align = 'left';
      text.font = 'Impact';
      text.fontSize = 36;
      text.stroke = "#000000";
      text.strokeThickness = 4;

      var grd = text.context.createLinearGradient(0, 0, 0, text.height);
      grd.addColorStop(0, '#ff6e02');
      grd.addColorStop(1, '#ffff00');
      text.fill = grd;

      if(i > 0) {
        text.x -= (text.width - players[i].scores[0].width);
        text.align = 'right';
      }

      players[i].nameText = text;
    }

    // Same last name - send sparkles!
    if(names[0].last == names[1].last)
      this.setRivalryMode();
  },

  setRivalryMode: function() {
    this.startFullWidthEmitter(['particle'], 500);
    this.setRivalry();
  },

  setRushMode: function() {
    this.startFullWidthEmitter(['pube1', 'pube2', 'pube3'], 500);

  },

  startFullWidthEmitter: function(particles, number) {
    var emitter = this.add.emitter(0,0);
    emitter.gravity = -250;
    emitter.makeParticles(particles, 1, 100, false, false);
    emitter.start(false, 1000, 50, number, false);

    this.add.tween(emitter).to({ x: WIDTH }, number * 4, Phaser.Easing.Default,
      true, 0, 1, true).start();
    this.scrot = game.add.audio('scrot');
    this.scrot.play();
  },

  setBackgroundAudio: function() {
    this.soundtrack = game.add.audio('soundtrack');
    this.soundtrack.play();
  },

  setupInput: function() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors = {
      up: this.game.input.keyboard.addKey(Phaser.Keyboard.UP),
      down: this.game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
      left: this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
      right: this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
      dash: this.game.input.keyboard.addKey(Phaser.Keyboard.M)
    };
    this.wasd = {
      up: this.game.input.keyboard.addKey(Phaser.Keyboard.W),
      down: this.game.input.keyboard.addKey(Phaser.Keyboard.S),
      left: this.game.input.keyboard.addKey(Phaser.Keyboard.A),
      right: this.game.input.keyboard.addKey(Phaser.Keyboard.D),
      dash: this.game.input.keyboard.addKey(Phaser.Keyboard.F)
    };

    //  Register the keys.
    this.spaceBar = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    //  Stop the following keys from propagating up to the browser
    this.game.input.keyboard.addKeyCapture([ Phaser.Keyboard.SPACEBAR ]);
  },

  addAmbientFire: function(){
    var emitter1 = this.game.add.emitter(this.game.world.centerX/2 - 115, HEIGHT - 20, 65);
    emitter1.makeParticles( [ 'fire1', 'fire2', 'fire3'] );
    emitter1.gravity = -1750;
    emitter1.setAlpha(0.2, 0, 2000);
    emitter1.setScale(0.75, 0, 0.75, 0, 1250);

    emitter1.start(false, 4000, 1);

    var emitter2 = this.game.add.emitter(this.game.world.centerX * 1.5 + 115, HEIGHT - 20, 75);
    emitter2.makeParticles( [ 'fire1', 'fire2', 'fire3'] );
    emitter2.gravity = -1750;
    emitter2.setAlpha(0.2, 0, 2000);
    emitter2.setScale(0.75, 0, 0.75, 0, 1250);

    emitter2.start(false, 3000, 1);
  },

  create: function() {
    this.createLoading();
    this.setBackgroundAudio();
    this.setupInput();
  },

  createLoading: function() {
    this.loading = this.add.group();
    this.loading.create(0, 0, 'loading').scale.setTo(1, 1);
  },

  deleteLoading: function() {
    this.loading.destroy();
  },

  createIntro: function() {
    this.intro = this.add.group();
    this.intro.create(0, 0, 'intro').scale.setTo(1,1);
  },

  deleteIntro: function() {
    this.intro.destroy();
  },

  buildGameObjects: function(){
    var player1 = this.createPlayer('dude');
    player1 = this.setPlayerOne(player1);

    var player2 = this.createPlayer('evil-dude');
    player2 = this.setPlayerTwo(player2);

    this.setNames([player1, player2]);

    this.players = [player1, player2];
  },

  createPlayer: function(playerSprite){
    var player = this.add.sprite(WIDTH/2, HEIGHT-48, playerSprite);
    player.sprite = playerSprite;
    player.alive = true;
    this.physics.arcade.enable(player);
    player.body.collideWorldBounds = true;
    player.animations.add('move');
    player.animations.play('move', 30, true);
    player.edgeTimer = 0;
    player.dashTimer = 0;
    player.dashResetTimer = 0;
    player.jumpTimer = 0;
    player.speedMultiplier = 1;
    player.powerUpTimer = 0;
    player.isDashing = false;
    player.wasDashing = false;
    player.wasStanding = false;
    player.died = game.add.audio('dead');


    return player;
  },

  setPlayerOne: function(player){
    player.x -= 40;
    player.anchor.setTo(0.5, 1);
    player.facing = 'right';
    player.movement = this.wasd;
    player.side = 1;
    this.buildLives(player);
    player.jump = game.add.audio('jump1');
    return player;
  },

  setPlayerTwo: function(player){
    player.x += 40;
    player.anchor.setTo(0.5, 1);
    player.facing = 'left';
    player.scale.x *= -1;
    player.movement=this.cursors;
    player.side = -1;
    this.buildLives(player);
    player.jump = game.add.audio('jump2');
    return player;
  },

  wrapPlatform: function(hazard) {
    if (hazard.body.velocity.x < 0 && hazard.x <= -160) {
      hazard.x = WIDTH;
    } else if (hazard.body.velocity.x > 0 && hazard.x >= WIDTH) {
      hazard.x = -160;
    }
  },

  setFriction: function(player, platform) {
    if (platform.key === 'ice-platform') {
      player.body.x -= (platform.body.x - platform.body.prev.x) - (platform.body.x - platform.body.prev.x)/2;
    }
  },


  buildLives: function(player){
    player.scores = [];
    player.score = 0;
    var initialX = 5;
    var initialY = 45;
    if(player.side == -1){
      initialX = WIDTH - 30;
      initialY = 15;
    }
    for(var i = 0; i < SCORE_LIMIT; i++){
      var x = initialX + (player.side*i*25);
      var y = initialY;
      this.addLife(player,new Phaser.Point(x, y));
    }
  },

  addLife: function(player, location){
    var sprite = this.add.sprite(location.x, location.y, player.sprite);
    sprite.scale.setTo(0.5,0.5);
    player.scores[player.score] = sprite;
    player.score++;
  },

  spawnPowerup: function(){
    var location = Math.floor((Math.random() * new Date().getTime()) % this.powerupLocations.length);
    var effect = Math.floor((Math.random() * new Date().getTime()) % this.powerupEffects.length);
    var targets = Math.floor((Math.random() * new Date().getTime()) % this.powerupTargets.length);
    var powerup = this.powerups.create(this.powerupLocations[location].x, this.powerupLocations[location].y, 'particle');

    powerup.effect = this.powerupEffects[effect];
    powerup.targets = this.powerupTargets[targets];

    this.powerups.setAll('body.allowGravity', false);
    this.powerups.setAll('body.immovable', true);

    this.powerupOnScreen = true;
  },

  evalPlayerMovement: function(player){
    this.physics.arcade.collide(player, this.players, playerCollisionHandler, null, this);
    this.physics.arcade.collide(player, this.powerups, this.playerPowerupHandler, null, this);
    this.physics.arcade.collide(player, this.platforms, this.setFriction, null, this);
    this.physics.arcade.collide(player, this.hazards, this.playerScoreHandler, null, this);
    this.physics.arcade.collide(player, this.fires, this.playerScoreHandler, null, this);

    player.standing = player.body.blocked.down || player.body.touching.down;

    var modifiedSpeed = PLAYER_SPEED * player.speedMultiplier;

    if(player.isDashing){
      player.play('move');
      if( player.facing == 'left' )
        player.body.velocity.x = -1 * DASH_SPEED;
      else if( player.facing == 'right' )
        player.body.velocity.x = DASH_SPEED;
      else
        player.body.velocity.x = 0;

    }else{
      player.body.velocity.x = 0;

      if (player.movement.left.isDown) {
        player.play('move');
        if (player.facing !== 'left') {
          player.facing = 'left';
          player.scale.x = -1;
          player.body.velocity.x = modifiedSpeed;
        } else
          player.body.velocity.x = -1 * modifiedSpeed;

      } else if (player.movement.right.isDown) {
        player.play('move');

        if (player.facing !== 'right') {
          player.facing = 'right';
          player.scale.x = 1;
          player.body.velocity.x = -1 * modifiedSpeed;
        } else
          player.body.velocity.x = modifiedSpeed;

      } else {
        if (player.facing !== 'idle') {
          player.animations.stop();
        }
      }
    }

    if (player.movement.down.isDown) {
        player.play('move');
        player.body.velocity.y = player.body.velocity.y + (0.2 * modifiedSpeed);
      }

    if(player.speedMultiplier != 1){
      if(this.time.time > player.powerupTimer){
        player.speedMultiplier = 1;
      }
    }

    if(player.isDashing){
      if(this.time.time > player.dashTimer){
        player.wasDashing = true;
        player.isDashing = false;
        player.dashResetTimer = this.time.time + 1000;
      }
    }else{
      if(player.movement.dash.isDown && this.time.time > player.dashResetTimer){
        player.isDashing = true;
        player.dashTimer = this.time.time + 400;
      }
    }


    //  No longer standing on the edge, but were
    //  Give them a 50ms grace period to jump after falling
    if (!player.standing && player.wasStanding) {
      player.edgeTimer = this.time.time + 50;
    }

    if ((player.standing || this.time.time <= player.edgeTimer) && player.movement.up.isDown && this.time.time > player.jumpTimer) {
      player.body.velocity.y = -510 * player.speedMultiplier;
      player.jumpTimer = this.time.time + 550;
      player.jump.play();
    }

    player.wasStanding = player.standing;
  },

  gameStart: function() {
    this.definePowerupLocations();
    this.definePowerupTargets();
    this.definePowerupEffects();
    this.createWorld();
    this.addAmbientFire();

    this.buildGameObjects();
  },

  update: function() {
    if(!this.cache.isSoundDecoded('soundtrack')) {
      return;
    } else if(this.gameState == "LOADING") {
        this.deleteLoading();
        this.createIntro();
        this.gameState = "START";
    }

    if(this.gameState == "START"){
      if(this.spaceBar.isDown && !this.spaceDown){
        this.spaceDown = true;
        this.deleteIntro();
        this.gameState = "ACTIVE";
        this.gameStart();
      }
    }else if(this.gameState == "ACTIVE"){
      this.distractions.forEach(this.wrapPlatform, this);
      this.hazards.forEach(this.wrapPlatform, this);

      var hazardOffset = {};

      hazardOffset[0] = Math.cos(this.time.time / 1800 * Math.PI/3) * 750; // 800pxwidesatanscrotum
      hazardOffset[1] = Math.cos(this.time.time / 500 * Math.PI/5) * 90;   // Graboid
      hazardOffset[2] = Math.cos(this.time.time / 300 * Math.PI/3) * 15;   // Lava Platform

      this.distractions.children[0].y = -700 - hazardOffset[0];
      this.hazards.children[0].x = WIDTH - 60 - hazardOffset[1];
      this.hazards.children[1].y = 230 - hazardOffset[2];


      this.attachEmitterToSprite(this.distractions.children[0], this.devilEmitters[0]);
      this.attachEmitterToSprite(this.distractions.children[0], this.devilEmitters[1]);
      this.attachEmitterToSprite(this.distractions.children[0], this.devilEmitters[2]);

      for(var i = 0; i < this.players.length; i ++){
        this.evalPlayerMovement(this.players[i]);
      }

      if(this.time.time > this.powerupTimer && this.powerupOnScreen === false){
        this.spawnPowerup();
      }
    }else if(this.gameState == "END"){
      if(this.spaceBar.isDown && !this.spaceDown){
        this.spaceDown = true;
        this.resetGame();
        this.gameState = "START";
        this.createIntro();
      }
    }

    // reset spacebar detection
    if(this.spaceBar.isUp){
      this.spaceDown = false;
    }
  },

  resetGame: function(){
    this.overlayText.setText("");
    this.overlayText = null;

    this.destroyPlayers();
    this.gameState = "START";
    this.buildGameObjects();
  },

  destroyPlayers: function(){
    for(var i = 0; i < this.players.length; i++){
      var player = this.players[i];
      for(var j = 0; j < player.scores.length; j++){
        var life = player.scores[j];
        if(life !== null){
          life.kill();
        }
      }
      player.body.velocity.x = 0;
      player.body.velocity.y = 0;
      player.nameText.setText("");
      player.nameText = null;
      player.kill();
    }
    this.players = [];
  },

  attachEmitterToSprite: function(spriteObject, emitter){
    emitter.y = spriteObject.y + 500;
  },

  playerKill: function(player){
    this.playerScoreHandler(player);
  },

  grantPlayerLife: function(player){
    var x = player.scores[0].x;
    x = x + (player.side * (player.score) * 25);
    var y = player.scores[0].y;

    this.addLife(player, new Phaser.Point(x,y));
  },

  playerScoreHandler: function(player) {
    player.died.play();
    if(player.score >= 0) {
      player.scores[player.score-1].kill();
      player.scores[player.score-1] = null;
      player.score--;
      respawn(player);
    }
    if(player.score === 0){
      player.alive = false;
      player.kill();
      this.setGameOverText(player.playerName, true);
      this.gameState="END";
    }
  },

  setGameOverText: function(endText, hasWinner){
    var textString = endText;
    if(hasWinner){
      textString = endText + "\nGets to enjoy satan's scrotum for eternity!";
    }

    var text = game.add.text(WIDTH/2, HEIGHT/2, textString);
    text.align = 'center';
    text.font = 'Impact';
    text.fontSize = 36;
    text.stroke = "#000000";
    text.strokeThickness = 16;

    var grd = text.context.createLinearGradient(0, 0, 0, text.height);
    grd.addColorStop(0, '#ff6e02');
    grd.addColorStop(1, '#ffff00');
    text.fill = grd;

    text.x = WIDTH/2 - (text.getBounds().width/2);
    text.y = HEIGHT/2 - (text.getBounds().height/2);

    this.overlayText = text;
  },

  setPowerupText: function(ability, appliesTo){

    var textString = ability.toUpperCase();

    if(appliesTo !== 'self') {
      if(ability === "kill")
        textString = "YOU KILLED EVERYONE\nBUT YOURSELF.\n\nDUMMY";
      else
        textString += "\n LOOK OUT " + appliesTo.toUpperCase();
    }
    else {
      if(ability === "kill")
        textString = "ANOTHER ONE BITES\nTHE DUST!";
      else
        textString += "\n FOR YOU!";
    }

    if(ability === "kill" && appliesTo === "everyone")
      textString = "EVERYONE DIES! :)";

    var text = new ScrollText(game, 0, game.world.centerY, textString);
    game.add.existing(text);
    text.font = 'Impact';
    text.fontSize = 90;
    text.align = "center";
    text.stroke = "#000000";
    text.strokeThickness = 4;

    var grd = text.context.createLinearGradient(0, 0, 0, text.height);
    grd.addColorStop(0, '#ff6e02');
    grd.addColorStop(1, '#ffff00');
    text.fill = grd;

    text.x = WIDTH/2 - (text.getBounds().width/2);
    text.y = HEIGHT/2 - (text.getBounds().height/2);
  },

  setRivalry: function(){
    var textString = "SIBLING RIVALRY!";

    var text = new ScrollText(game, 0, game.world.centerY, textString);
    game.add.existing(text);
    text.font = 'Impact';
    text.fontSize = 90;
    text.stroke = "#000000";
    text.strokeThickness = 4;

    var grd = text.context.createLinearGradient(0, 0, 0, text.height);
    grd.addColorStop(0, '#ff6e02');
    grd.addColorStop(1, '#ffff00');
    text.fill = grd;

    text.x = WIDTH/2 - (text.getBounds().width/2);
    text.y = HEIGHT/2 - (text.getBounds().height/2);
    this.rivalry = game.add.audio('rivalry');
    this.rivalry.play();
  },

  applyPowerup: function(player, powerup){
    if(powerup.effect == 'boost'){
      player.speedMultiplier = 2.5;
      player.powerupTimer = game.time.time + 3000;
    }else if(powerup.effect == 'slow'){
      player.speedMultiplier = 0.3;
      player.powerupTimer = game.time.time + 3000;
    }else if(powerup.effect == 'freeze'){
      player.speedMultiplier = 0;
      player.powerupTimer = game.time.time + 3000;
    }else if(powerup.effect == 'reverse'){
      player.speedMultiplier = -1;
      player.powerupTimer = game.time.time + 3000;
    }else if(powerup.effect == 'kill'){
      this.playerKill(player);
    }else if(powerup.effect == '1up'){
      this.grantPlayerLife(player);
    }
  },

  playerPowerupHandler: function(player,powerup){
    var playerList = [];
    var i = 0;  // for loop iterator

    if(powerup.targets == 'self'){
      playerList[0] = player;
    } else if(powerup.targets == 'others'){
      for(i = 0; i < this.players.length; i++){
        if(this.players[i] != player)
          playerList[playerList.length] = this.players[i];
      }
    } else
      playerList = this.players;

    for(i = 0; i < playerList.length; i++)
      this.applyPowerup(playerList[i], powerup);

    this.setPowerupText(powerup.effect, powerup.targets);

    powerup.kill();
    this.powerupOnScreen = false;
    powerup = null;
    this.powerupTimer = this.time.time + this.rnd.between(5000, 8000);
  }

};

function playerCollisionHandler(player) {
  // do something
}

function respawn(player){
  player.body.x = WIDTH/2;
  player.body.y = HEIGHT - player.getBounds().height;

  resetTimers(player);
}

function resetTimers(player){
  player.edgeTimer = 0;
  player.dashTimer = 0;
  player.dashResetTimer = 0;
  player.jumpTimer = 0;
  player.isDashing = false;
  player.wasDashing = false;
  player.wasStanding = false;
}

game.state.add('Game', PhaserGame, true);
