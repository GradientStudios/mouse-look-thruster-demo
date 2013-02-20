define([
  'ComponentSystem', 'VehicleModelBase', 'ArrayPool', 'Vec2', 'Mat2'
], function(
  $, VehicleModel, ArrayPool, Vec2, Mat2
) {

  function ClientVehicleModel() {
    VehicleModel.apply( this );
  }

  $.extend( ClientVehicleModel, VehicleModel );

  ClientVehicleModel.ATOM_GRID_SIZE = VehicleModel.ATOM_GRID_SIZE;
  ClientVehicleModel.CELL_SIZE = VehicleModel.CELL_SIZE;
  ClientVehicleModel.CELL2WORLD = VehicleModel.CELL2WORLD;

  // "hit" the VehicleModel in such a way as to damage it or apply
  // some other effect
  ClientVehicleModel.prototype.receiveHit = (function() {
    var detachedAtoms = [];
    var detachedGizmos = [];

    return function( hitInfo ) {

      // If we are already dead or dying from something else that
      // happened earlier this frame, then do not apply this damage.
      if( !this.isAlive || this.isDying ) {
        return;
      }

      if( hitInfo.atoms && hitInfo.atoms.length &&
          hitInfo.damageValues && hitInfo.damageValues.length ) {

        detachedAtoms.length = 0;
        detachedGizmos.length = 0;

        this._applyDamageToAtoms(
          hitInfo.atoms,
          hitInfo.damageValues,
          detachedAtoms,
          detachedGizmos
        );

        this.spawnScrap( detachedAtoms, true );
      }
    };
  }());

  // spawn scrap pieces from the given detachedAtoms
  ClientVehicleModel.prototype.spawnScrap = (function() {
    var vec1 = Vec2.createFloat64();
    var vec2 = Vec2.createFloat64();
    var vec3 = Vec2.createFloat64();

    return function( detachedAtoms, explode ) {
      // create scrap parts from the atoms
      var newScraps = ArrayPool.allocate();
      for( var i = 0; i < detachedAtoms.length; i++ ) {
        var atom = detachedAtoms[ i ];

        // make the scrap entity
        var scrap = $.e( '2D, Scrap, Scrap Physics' );

        var atomX = atom.i + atom.w / 2;
        var atomY = atom.j + atom.h / 2;

        // get the world position of the Atom's center
        var pos = this.getCellWorldPosition( atomX, atomY, vec1 );

        if ( explode ) {
          // Get the position of the scrap piece relative to the ship.
          var atomCoord = Vec2.setFromValues( vec2, atomX, atomY );
          var localPos = this.getCellLocalPosition( atomCoord, vec2 );
          var center = this.entity.physics.localCOM;
          var localPhysicsPos = Vec2.subtract( localPos, center, vec2 );

          // Offset the scrap pieces slightly to help improve
          // broadphase collision detection.
          var offset = Vec2.scale( localPhysicsPos, 0.25, vec3 );

          // now rotate the offset into world coordinates
          Mat2.multVec2( this.entity.transform.rotation, offset, offset );
          Vec2.add( pos, offset, pos );

          // Add a bit of randomness to the explosion vector.
          localPhysicsPos[0] += 2 * ( Math.random() - 0.5 );
          localPhysicsPos[1] += 2 * ( Math.random() - 0.5 );

          // Set the magnitude of the velocity for a scrap piece to be
          // inverse of how far it is from the center of mass. This
          // will make the inner ones faster.
          var explosionMagnitude = ( 1.5 + Math.random() ) / Vec2.magnitude( localPhysicsPos );
          var explosionVelocity = Vec2.scale( localPhysicsPos, explosionMagnitude, vec2 );

          // now rotate the velocity into world coordinates
          Mat2.multVec2( this.entity.transform.rotation, explosionVelocity, explosionVelocity );

          Vec2.add( explosionVelocity, this.entity.physics.linearVelocity, explosionVelocity );
          Vec2.setFromArray( scrap.physics.linearVelocity, explosionVelocity );

          // Set the angularVelocity with some randomness.
          scrap.physics.angularVelocity = this.entity.physics.angularVelocity + ( Math.random() - 0.5 ) * 20 * Math.PI;
        }

        // set up the scrap entity
        scrap.model.setAtom( atom );
        Vec2.setFromArray( scrap.transform.position, pos );
        scrap.transform.setRotation( this.entity.transform.angle );
        scrap.physics.setSimulation( this.entity.physics.simulation );
        scrap.physics.enable();

        newScraps.push( scrap );
      }

      // fire an event to tell things about the new scraps
      this.publish( 'scrap:spawn', newScraps );
      newScraps.release();
    };
  }());

  // Cause the vehicle to explode, spawning scrap pieces for each
  // remaining Atom. This will also `kill` the vehicle.
  ClientVehicleModel.prototype.explode = function( opts ) {
    opts = opts || {};

    VehicleModel.prototype.explode.apply( this, arguments );

    if( opts.spawnScrap ) {
      // detach all the remaining Atoms and Gizmos
      var remainingAtoms = ArrayPool.allocate();
      var remainingGizmos = ArrayPool.allocate();

      var i;
      for( i = 0; i < this.atoms.length; i++ ) {
        if( this.atoms[ i ].hp > 0 ) {
          this.atoms[ i ].hp = 0;
          remainingAtoms.push( this.atoms[ i ] );
        }
      }

      for( i = 0; i < this.gizmos.length; i++ ) {
        if( this.gizmos[ i ].isAttached ) {
          this.gizmos[ i ].isAttached = false;
          remainingGizmos.push( this.gizmos[ i ] );
        }
      }

      // make scrap parts for the remaining atoms
      this.spawnScrap( remainingAtoms, true );

      remainingAtoms.release();
      remainingGizmos.release();
    }
  };

  $.c( 'Vehicle', ClientVehicleModel );

  return ClientVehicleModel;
});
