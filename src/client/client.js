/**
 * @preserve co.llide
 * https://github.com/GradientStudios/co.llide
 *
 * Copyright (c) 2012 Gradient Studios
 * Licensed under the MIT license.
 */

/*jshint browser:true immed:false*/

require([
  'ComponentSystem',
  'shared/box2dwebsimulation',
  'Vec2',
  'Mat2',
  'InputMap',
  'jQuery',
  'when',
  'Gizmo',
  'InputController',
  'Physics',
  'GUI',
  // These don't need to be exported, we just need them loaded.
  '2D',
  'MouseLookThrusterAI',
  'ScrapModel',
  'ScrapPhysics',
  'VehicleController',
  'VehicleModel',
  'VehiclePhysics'
], function(
  ComponentSystem,
  Simulation,
  Vec2,
  Mat2,
  InputMap,
  jQuery,
  when,
  Gizmo,
  InputController,
  Physics,
  GUI
) {

  var junkyardPath = 'json/junkyard.json';

  var loadedJunkyard = when.defer();
  jQuery.get( junkyardPath )
    .done( loadedJunkyard.resolve.bind( loadedJunkyard ) )
    .fail( function() {
      console.error( 'Failed to load junkyard file:', junkyardPath );
      loadedJunkyard.resolve.bind( loadedJunkyard );
    });

  var blueprintFiles = [
    'vehicle-stingray.json',
    'vehicle-gnat.json',
    'vehicle-crow.json'
  ];

  var loadedJSON = [];

  blueprintFiles.forEach( function( filename ) {

    var path = 'json/' + filename;

    var deferred = when.defer();
    jQuery.get( path )
      .done( deferred.resolve.bind( deferred ))
      .fail( deferred.reject.bind( deferred, path ));

    loadedJSON.push( deferred.promise );
  });

  var mousePos = Vec2.createFloat64();

  var gameDiv = document.getElementById( 'canvas-wrapper' );
  var canvas = document.createElement( 'canvas' );
  canvas.id = 'gameplay-canvas';
  canvas.width = 768;
  canvas.height = 576;
  canvas.style.backgroundColor = '#333333';
  gameDiv.appendChild( canvas );

  // create the Box2D simulation
  var simulation = new Simulation();
  simulation.enableDebugDraw( canvas );

  // create the bounds of our scene
  (function() {
    var LEFT = -10;
    var RIGHT = 10;
    var TOP = -10;
    var BOTTOM = 10;

    var boundary = ComponentSystem.e( '2D, Physics' );
    boundary.physics.category = Physics.Category.Arena;
    boundary.physics.dynamic = false;
    boundary.physics.friction = 0;
    boundary.physics.shapeInfo.type = Physics.ShapeType.Chain;
    boundary.physics.shapeInfo.verts = [
      Vec2.createFloat64FromValues( LEFT, TOP ),
      Vec2.createFloat64FromValues( RIGHT, TOP ),
      Vec2.createFloat64FromValues( RIGHT, BOTTOM ),
      Vec2.createFloat64FromValues( LEFT, BOTTOM )
    ];
    boundary.physics.shapeInfo.loop = true;

    boundary.physics.setSimulation( simulation );
    boundary.physics.enable();
  }());

  // create a vehicle
  var vehicle = ComponentSystem.e( '2D, Vehicle, Vehicle Controller, Vehicle Physics, Mouse Look Thruster AI' );
  vehicle.physics.setSimulation( simulation );
  simulation.setDebugCameraOnActor( vehicle.physics );

  // create gui for adjusting thruster ai weights and hook up to vehicle
  var gui = new GUI();

  var weightSettings = gui.addFolder( 'Thruster AI Weights' );
  weightSettings.add( vehicle.thrusterAI, 'weightF' ).min( 0 );
  weightSettings.add( vehicle.thrusterAI, 'weightR' ).min( 0 );
  weightSettings.add( vehicle.thrusterAI, 'weightT' ).min( 0 );
  weightSettings.open();

  // load junkyard and initial vehicle
  loadedJunkyard.then( function( data ) {
    Gizmo.loadJunkyardJSON( data );
    loadVehicle( 0 );
  }).then( null, function( err ) {
    console.error( err.stack );
  });

  var spawnOptions = {
    position: Vec2.createFloat64FromValues( 0, 0 ),
    angle: 0
  };

  function loadVehicle( choice ) {
    loadedJSON[ choice ].then( function( data ) {
      vehicle.controller.load( data );
      vehicle.controller.spawn( spawnOptions );
    }, function( path ) {
      console.error( 'Could not load blueprint file:', path );
    }).then( null, function( err ) {
      console.error( err.stack );
    });
  }

  var resetting = false;
  var respawnTime = 2000;
  function resetVehicle( choice ) {
    if( !resetting ) {
      resetting = true;
      vehicle.controller.kill({
        explode: true,
        spawnScrap: true
      });
      vehicle.controller.unload();
      setTimeout( function() {
        loadVehicle( choice );
        resetting = false;
      }, respawnTime );
    }
  }

  // set up input handling
  var rawInput = {};
  var processedInput = new InputMap();

  var inputController = new InputController( gameDiv, canvas );
  var controlSet = inputController.pushControlSet( 'game controls' );

  // register input hold commands on the InputController
  [ [ 'thrustForward', 'w' ],
    [ 'thrustBackward', 's' ],
    [ 'thrustLeft', 'a' ],
    [ 'thrustRight', 'd' ]
  ].forEach( function( command ) {
    var name = command[ 0 ];
    var keys = command[ 1 ];

    rawInput[ name ] = false;

    var enable = function() {
      rawInput[ name ] = true;
    };
    var disable = function() {
      rawInput[ name ] = false;
    };

    controlSet.registerHoldCommand({
      commandName: name,
      defaultKeys: keys
    }, enable, disable );
  });

  inputController.moveMouseHandlers( document );

  var processRawInput = (function() {
    var headingVec = Vec2.createFloat64();
    return function() {
      var sumFB = rawInput.thrustForward - rawInput.thrustBackward;
      var sumRL = rawInput.thrustRight - rawInput.thrustLeft;
      if( sumFB || sumRL ) {
        Vec2.setFromValues( headingVec, sumFB, sumRL );
        Mat2.multVec2( vehicle.transform.rotation, headingVec, headingVec );
        processedInput.thrustHeading = Math.atan2( headingVec[ 1 ], headingVec[ 0 ] );
        processedInput.thrustPower = 1;
      } else {
        processedInput.thrustPower = 0;
      }
      processedInput.faceHeading = inputController.getMouseHeading();
    };
  }());

  // register commands for switching vehicles
  blueprintFiles.forEach( function( file, index ) {
    var name = 'choose-' + index;
    var keys = '' + ( index + 1 ) ;

    var enable = function(){};
    var disable = function() {
      resetVehicle( index );
    };

    controlSet.registerHoldCommand({
      commandName: name,
      defaultKeys: keys
    }, enable, disable );
  });

  var frameDuration = 1000 / 60;
  function _loop() {
    setTimeout( _loop, frameDuration );

    // process the raw input
    if( vehicle.controller.isAlive() ) {
      processRawInput();
      vehicle.thrusterAI.setThrustersFromInput( processedInput );
      vehicle.physics.applyThrusterForces();
    }

    simulation.step();
    simulation.fireCollisionEvents();
  }

  _loop();
});
