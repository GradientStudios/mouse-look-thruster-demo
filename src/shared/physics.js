/*jshint browser:true*/

define([ 'ComponentSystem', 'Vec2', 'Mat2' ], function( $, Vec2, Mat2 ) {

  // component defines properties for a physics actor
  function Physics() {
    this.id = -1;

    this.linearVelocity = Vec2.createFloat64();
    this.angularVelocity = 0;
    this.dynamic = true;

    // the local center of mass as computed by the
    // physics simulation
    this.localCOM = Vec2.createFloat64FromValues( 0, 0 );

    this.shapeInfo = {
      type: null,
      dirty: true
    };

    // Collision group is used for adding special collision rules
    // according to Box2D collision groups:
    // All objects that share a positive group number will always collide
    // with each other.
    // All objects that share a negative group number will never collide
    // with each other.
    this.collisionGroupIndex = 0;

    this.simulation = null;
  }

  $.extend( Physics, $.EmitterComponent );
  Physics.prototype.__propertyName__ = 'physics';

  // enum for types of shapes
  Physics.ShapeType = {
    Rect: 'Rect',
    Atom: 'Atom', // used for anything made of atoms
    Chain: 'Chain'
  };

  // enum for categories of actors
  Physics.Category = {
    None: 0,
    Vehicle: 1 << 0,
    Scrap: 1 << 1,
    Arena: 1 << 2,
    All: -1
  };

  Physics.prototype.category = Physics.Category.All;
  Physics.prototype.collisionMask = Physics.Category.All;

  Physics.prototype.init = function() {
    this.transform = this.entity.transform;
    this.model = this.entity.model;
  };

  Physics.prototype.setSimulation = function( simulation ) {
    this.simulation = simulation;
    this.id = simulation.addActor( this );
  };

  Physics.prototype.dispose = function() {
    this.unsubscribe(); // unsubscribe all events
    this.simulation.removeActor( this );
  };

  // tell the simulation to start / stop simulation this object
  Physics.prototype.enable = function(){
    this.simulation.enableActor( this );
  };

  Physics.prototype.disable = function(){
    this.simulation.disableActor( this );
  };

  // tell the simulation to apply the force to this body at the given
  // world position
  Physics.prototype.applyForce = function( force, position ) {
    this.simulation.applyForceToActor( this, force, position );
  };

  Physics.prototype.getDensity = function() {
    return 1;
  };

  Physics.prototype.updateShape = function() {
    this.shapeInfo.dirty = true;
  };

  // Overwrite subscribe / unsubscribe so that collision events are
  // registered with the simulation.
  (function() {
    var _before = [];
    var _after = [];
    var _diff = [];

    // FIX ME: Backbone's API allows for fancy things like
    // unsubscribing for a given callback / context. The API for
    // registering / unregistering an event on the simulation does not
    // do this. To mimic the same behavior, we let Backbone subscribe
    // / unsubscribe handlers as normal, and then afterwards dig into
    // the _callbacks property of the event emitter to find which
    // event names have been added or removed.
    function _getEventNames( emitter, dest ) {
      dest.length = 0;
      var calls = emitter._callbacks;
      if( calls ) {
        for( var name in calls ) {
          var node = calls[ name ];
          if( node && node !== node.tail ) {
            dest.push( name );
          }
        }
      }
      return dest;
    }

    // Given a sorted `shorter` array, whose contents are a subset of
    // the contents of the sorted `longer` array, return back the
    // extra elements that longer contains (ie, the set difference. )
    function _sortedArrayDiff( longer, shorter, dest ) {
      dest.length = 0;
      var diff = dest;

      // assert that longer.length >= shorter.length
      if( longer.length < shorter.length ) {
        throw new Error( 'Failed assertion: longer.length >= shorter.length' );
      }

      for( var i = 0, j = 0; i < longer.length; i++ ) {
        if( longer[ i ] === shorter[ j ] ) {
          j++;
        } else {
          diff.push( longer[ i ] );
        }
      }

      return diff;
    }

    // functions for listening on collision events
    Physics.prototype.subscribe = function() {

      var before = _getEventNames( this, _before );

      $.EmitterComponent.prototype.on.apply( this, arguments );

      var after = _getEventNames( this, _after );

      // register new event names
      if( before.length !== after.length ) {
        before.sort();
        after.sort();
        var newNames = _sortedArrayDiff( after, before, _diff );
        for( var i = 0; i < newNames.length; i++ ) {
          this.simulation.registerEvent( this, newNames[ i ] );
        }
      }
    };

    Physics.prototype.unsubscribe = function() {

      var before = _getEventNames( this, _before );

      $.EmitterComponent.prototype.unsubscribe.apply( this, arguments );

      var after = _getEventNames( this, _after );

      // unregister the event names that were removed
      if( before.length !== after.length ) {
        before.sort();
        after.sort();
        var removedNames = _sortedArrayDiff( before, after, _diff );
        for( var i = 0; i < removedNames.length; i++ ) {
          this.simulation.unregisterEvent( this, removedNames[ i ] );
        }
      }
    };
  }());

  $.c( 'Physics', Physics );

  return Physics;
});
