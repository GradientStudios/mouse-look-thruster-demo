define([
  'CellRect',
  'Vec2'
], function(
  CellRect,
  Vec2
) {
  var GRID_SIZE = 24;

  function BufferCellState() {
    this.damage = 0;
  }

  BufferCellState.prototype.reset = function() {
    this.damage = 0;
  };

  BufferCellState.prototype.copy = function( other ) {
    this.damage = other.damage;
  };

  function BufferCell( i, j ) {
    this.atom = null;

    this.i = i;
    this.j = j;
    this.center = Vec2.createFloat64FromValues(
      this.i + 0.5,
      this.j + 0.5
    );

    this.distance = null;

    this.state = new BufferCellState();
    this.next = new BufferCellState();
  }

  BufferCell.prototype.reset = function() {
    this.atom = null;

    this.distance = null;

    this.state.reset();
    this.next.reset();

    return this;
  };

  // calling step will overwrite the current state values with those
  // of the next step
  BufferCell.prototype.step = function() {
    this.state.copy( this.next );
  };

  // calling clearNext will overwrite the next state values with the
  // current ones, effectively throwing away any leftover values from
  // previous computation
  BufferCell.prototype.clearNext = function() {
    this.next.copy( this.state );
  };


  // compute and store the squared distance from this cell to the
  // given position
  BufferCell.prototype.computeDistanceSquared = (function() {
    var tmp = Vec2.createFloat64();
    return function ( position ) {
      var diff = Vec2.subtract( this.center, position, tmp );
      this.distanceSquared = Vec2.magnitudeSquared( diff );
    };
  }());

  // compute and store the distance from this cell to the given
  // position
  BufferCell.prototype.computeDistance = (function() {
    var tmp = Vec2.createFloat64();
    return function ( position ) {
      var diff = Vec2.subtract( this.center, position, tmp );
      this.distanceSquared = Vec2.magnitude( diff );
    };
  }());

  function getIndex( i, j ) {
    return j * GRID_SIZE + i;
  }

  function DamageBuffer( width, height ) {
    this.width = width;
    this.height = height;

    // the master buffer exists so that we won't have to reallocate
    // BufferCell objects every time we need to process a new damage
    // event
    var __masterBuffer__ = [];

    (function(){
      for( var j = 0; j < GRID_SIZE; j++ ) {
        for( var i = 0; i < GRID_SIZE; i++ ) {
          __masterBuffer__.push( new BufferCell( i, j ) );
        }
      }
    }());

    var _buffer = new Array( width * height );

    this.reset = function( rect, model ) {
      var index, atom;

      var right = rect.getRight();
      var bottom = rect.getBottom();

      for( var i = rect.left; i <= right; i++ ) {
        for( var j = rect.top; j <= bottom; j++ ) {
          index = this.getIndex( i, j );

          atom = model.getAtom( i, j );
          if ( atom && ( atom.hp > 0 )) {
            _buffer[ index ] = __masterBuffer__[ index ].reset();
            _buffer[ index ].atom = atom;
          } else {
            _buffer[ index ] = null;
          }
        }
      }
    };

    this.get = function( i, j ) {
      return _buffer[ j * this.width + i ];
    };
  }

  DamageBuffer.prototype.getIndex = function( i, j ) {
    return j * this.width + i;
  };

  DamageBuffer.prototype.operateOnRect = function( rect, func ) {
    var args = Array.prototype.slice.call( arguments, 2 );
    var right = rect.getRight();
    var bottom = rect.getBottom();
    for( var i = rect.left; i <= right; i++ ) {
      for( var j = rect.top; j <= bottom; j++ ) {
        var cell = this.get( i, j );
        if( cell ) {
          func.apply( cell, args );
        }
      }
    }
  };

  DamageBuffer.prototype.step = function( rect ) {
    this.operateOnRect(
      rect,
      BufferCell.prototype.step
    );
  };

  DamageBuffer.prototype.clearNext = function( rect ) {
    this.operateOnRect(
      rect,
      BufferCell.prototype.clearNext
    );
  };

  function DamagePolicy() {
    this.calc = null; // the calculator that is using this policy
    this.rect = new CellRect();
    this.damageMod = 1;
  }

  DamagePolicy.prototype.setDamageModifier = function( mod ) {
    this.damageMod = mod;
    return this;
  };

  DamagePolicy.prototype.computeRect = function(){
    return this.rect;
  };

  DamagePolicy.prototype.execute = function(){};

  function RadialDamagePolicy() {
    DamagePolicy.apply( this, arguments );
    this.radius = 0;
  }

  RadialDamagePolicy.prototype = Object.create( DamagePolicy.prototype );

  RadialDamagePolicy.prototype.setRadius = function( radius ) {
    this.radius = radius;
    return this;
  };

  RadialDamagePolicy.prototype.computeRect = function() {
    this.radius = this.radius || this.calc.baseDamage;
    return this.rect.setLRTB(
      Math.max( 0, Math.floor( this.calc.position[ 0 ] - this.radius )),
      Math.min( GRID_SIZE - 1, Math.floor( this.calc.position[ 0 ] + this.radius )),
      Math.max( 0, Math.floor( this.calc.position[ 1 ] - this.radius )),
      Math.min( GRID_SIZE - 1, Math.floor( this.calc.position[ 1 ] + this.radius ))
    );
  };

  RadialDamagePolicy.prototype.execute = (function() {
    var _sqrt2pi = Math.sqrt( 2 * Math.PI );

    var _computeDamageFromDistance = function( baseDamage, radius ) {
      var radiusSquared = radius * radius;

      if( this.distanceSquared > radiusSquared ) {
        // outside of damage radius
        return;
      }

      // inside the radius, so apply damage in a Gaussian distribution
      var sigma = radius;
      var sigmaSquared = radiusSquared;
      var damage = baseDamage * Math.exp( -0.5 * this.distanceSquared / sigmaSquared ); // / ( sigma * _sqrt2pi );

      this.state.damage += Math.ceil( damage );
    };

    return function() {

      this.calc.buffer.operateOnRect(
        this.rect,
        BufferCell.prototype.computeDistanceSquared,
        this.calc.position
      );

      this.calc.buffer.operateOnRect(
        this.rect,
        _computeDamageFromDistance,
        this.calc.baseDamage * this.damageMod,
        this.radius
      );
    };
  }());

  function DamageCalculator() {
    this.position = Vec2.createFloat64();
    this.cell = Vec2.createFloat64();
    this.baseDamage = 0;

    this.policies = [];
    this.rect = new CellRect();

    this.buffer = new DamageBuffer( GRID_SIZE, GRID_SIZE );
  }

  // Adds the given DamagePolicy to be executed after any other
  // policies that have been previously added.
  DamageCalculator.prototype.addPolicy = function( policy ) {
    this.policies.push( policy );
    policy.calc = this;

    return this;
  };

  // Execute all policies in order. Each policy uses the same
  // baseDamage value, so controlling the overall damage should be
  // done by setting each policy's individual damage modifier.
  DamageCalculator.prototype.execute = (function() {

    function _gatherDamages( atoms, damages ) {
      if( this.state.damage ) {
        atoms.push( this.atom );
        damages.push( this.state.damage );
      }
    }

    return function( model, worldPos, baseDamage, atoms, damages ) {

      // convert world position to local cell coordinates
      model.worldToLocal( worldPos, this.position );
      Vec2.add( this.position, model.reg, this.position );
      Vec2.scale( this.position, 1/model.CELL_SIZE, this.position );

      this.cell[ 0 ] = Math.floor( this.position[ 0 ] );
      this.cell[ 1 ] = Math.floor( this.position[ 1 ] );

      this.baseDamage = baseDamage;

      var i;
      // now compute the total rect for all policies
      this.rect.setFromRect( this.policies[ 0 ].computeRect() );
      for( i = 1; i < this.policies.length; i++ ) {
        this.rect.combine( this.policies[ i ].computeRect(), this.rect );
      }

      // set up the buffer on that rect
      this.buffer.reset( this.rect, model );

      // now execute each policy in order
      for( i = 0; i < this.policies.length; i++ ) {
        this.policies[ i ].execute();
      }

      // now get the atoms and damage values from the buffer
      atoms.length = 0;
      damages.length = 0;

      this.buffer.operateOnRect( this.rect, _gatherDamages, atoms, damages );
    };
  }());

  // Consider breaking off each of these into a separate module
  DamageCalculator.Policies = {
    Radial: RadialDamagePolicy
  };

  return DamageCalculator;
});
