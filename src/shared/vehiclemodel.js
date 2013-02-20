define([
  'ComponentSystem', 'Model',
  'Atom', 'Gizmo', 'Core', 'Thruster', 'BaseThruster',
  'ArrayPool', 'Vec2', 'Mat2'
], function(
  $, Model,
  Atom, Gizmo, Core, Thruster, BaseThruster,
  ArrayPool, Vec2, Mat2
) {
  var ATOM_GRID_SIZE = 24;
  var NUM_CELLS = ATOM_GRID_SIZE * ATOM_GRID_SIZE;
  var CELL_SIZE = 0.2;

  var VehicleModel = function() {
    Model.call( this );

    // An unordered collection of Atoms with one entry per Atom.
    this.atoms = [];

    // A spatial hash of Atoms by cell coordinates (i,j). An Atom may
    // have multiple entries, one for each cell.
    this.cells = new Array( NUM_CELLS );

    this.gizmos = [];
    this.cellCount = 0;

    this.core = null;
    this.weapons = [];
    this.isAlive = false;
    this.isLoaded = false;

    // Set the registration point of the model.
    // For a vehicle, the local point (0,0) is the top left
    // corner of the 24x24 cell grid.
    Vec2.setFromValues(
      this.reg,
      ATOM_GRID_SIZE / 2 * CELL_SIZE,
      ATOM_GRID_SIZE / 2 * CELL_SIZE
    );
  };

  $.extend( VehicleModel, Model );

  VehicleModel.ATOM_GRID_SIZE = ATOM_GRID_SIZE;
  VehicleModel.prototype.ATOM_GRID_SIZE = ATOM_GRID_SIZE;

  VehicleModel.CELL_SIZE = CELL_SIZE;
  VehicleModel.prototype.CELL_SIZE = CELL_SIZE;

  VehicleModel.CELL2WORLD = CELL_SIZE;
  VehicleModel.prototype.CELL2WORLD = CELL_SIZE;

  VehicleModel.prototype.getAtom = function( i, j ) {
    return this.cells[ i + j * ATOM_GRID_SIZE ];
  };

  // get the local position of the cell coordinate at (i,j)
  VehicleModel.prototype.getCellLocalPosition = function( src, dest ) {
    Vec2.scale( src, CELL_SIZE, dest );
    Vec2.subtract( dest, this.reg, dest );

    return dest;
  };

  // get the world position of the cell coordinate at (i,j)
  VehicleModel.prototype.getCellWorldPosition = function( i, j, dest ) {
    var pos = Vec2.setFromValues( dest, i, j );
    Vec2.scale( pos, CELL_SIZE, pos );
    Vec2.subtract( pos, this.reg, pos );

    Mat2.multVec2( this.entity.transform.rotation, pos, pos );
    Vec2.add( pos, this.entity.transform.position, pos );

    return pos;
  };

  // Get the atom at the given local position
  var _tmpVec2 = Vec2.createFloat64();
  var _tmpMat2 = Mat2.createFloat64();

  VehicleModel.prototype.getAtomAtLocalPosition = function( localPos ) {
    // convert local position to (i,j)
    localPos = Vec2.add( localPos, this.reg, _tmpVec2 );
    Vec2.scale( localPos, 1/CELL_SIZE, localPos );

    return this.getAtom(
      Math.floor( localPos[ 0 ] ),
      Math.floor( localPos[ 1 ] )
    );
  };

  // convert local position to world position
  VehicleModel.prototype.localToWorld = function( localPos, dest ) {
    var worldPos = Mat2.multVec2(
      this.entity.transform.rotation,
      localPos,
      dest
    );

    Vec2.add( worldPos, this.entity.transform.position, worldPos );

    return worldPos;
  };

  // convert world position to local position
  VehicleModel.prototype.worldToLocal = function( worldPos, dest ) {
    var localPos = Vec2.subtract(
      worldPos,
      this.entity.transform.position,
      dest
    );

    var inverseRotation = _tmpMat2;
    Mat2.invert( this.entity.transform.rotation, inverseRotation );
    Mat2.multVec2( inverseRotation, localPos, localPos );

    return localPos;
  };

  // Get the atom at the given world position
  VehicleModel.prototype.getAtomAtWorldPosition = function( worldPos ) {
    // convert world position to local position
    var localPos = this.worldToLocal( worldPos, _tmpVec2 );

    return this.getAtomAtLocalPosition( localPos );
  };

  // "protected" helper for applying damage to a single atom
  VehicleModel.prototype._applyDamageToAtom = function(
    atom,
    damage,
    detachedAtomsDest, // optional destination array
    detachedGizmosDest // optional destination array
  ) {
    // if the Atom is already destroyed, ignore it
    if( atom.hp <= 0 ) {
      return null;
    }

    // arrays for holding atoms and gizmos that need to be detached:
    // only allocate these if destination arrays were not specified
    var detachedAtoms = detachedAtomsDest || ArrayPool.allocate();
    var detachedGizmos = detachedGizmosDest || ArrayPool.allocate();

    // Apply damage to atoms.
    atom.hp -= damage;
    if ( atom.hp <= 0 ) {
      atom.hp = 0;
      detachedAtoms.push( atom );
    }

    var gizmo = atom.gizmo;
    if ( gizmo && gizmo.isAttached && gizmo.isDead() ) {
      gizmo.isAttached = false;
      gizmo.atoms.forEach(function( atom ) {
        if ( atom.hp > 0 ) {
          atom.hp = 0;
          detachedAtoms.push( atom );
        }
      });
      detachedGizmos.push( gizmo );
    }

    if ( detachedAtoms.length || detachedGizmos.length ) {
      _detachParts.call( this, detachedAtoms, detachedGizmos );
    }

    // if no destination arrays were given, release the ones we created
    if( !detachedGizmosDest ) {
      detachedGizmos.release();
    }
    if( !detachedAtomsDest ) {
      detachedAtoms.release();
    }
  };

  // "protected" helper for applying damage to multiple atoms
  VehicleModel.prototype._applyDamageToAtoms = function(
    atoms,
    damageValues,
    detachedAtomsDest, // optional destination array
    detachedGizmosDest // optional destination array
  ) {
    for( var i = 0; i < atoms.length; i++ ) {
      this._applyDamageToAtom(
        atoms[ i ],
        damageValues[ i ],
        detachedAtomsDest,
        detachedGizmosDest
      );
    }
  };

  // internal helper for detaching the given atoms and gizmos
  var _detachParts = function( atoms, gizmos ) {
    // This is more correct with a map-reduce, but just trying to save
    // on function calls.
    this.cellCount -= atoms.reduce(function( prev, curr ) {
      return prev + curr.w * curr.h;
    }, 0 );

    // fire event
    this.publish( 'shape:loss', atoms, gizmos );

    // adjust the base thrusters to always be centered around the COM
    this.clearBaseThrusters();
    this.setupBaseThrusters();
    for( var i = 0; i < this.thrusters.length; i++ ) {
      this.thrusters[ i ].init( this );
    }

    this.updateThrusters();

    this.publish( 'thrusters:update' );
  };

  VehicleModel.prototype.addGizmo = function( gizmo ) {
    gizmo.key = this.gizmos.length;
    this.gizmos.push( gizmo );
  };

  VehicleModel.prototype.clearBaseThrusters = function() {
    for( var i = 0; i < this.thrusters.length; ) {
      if( this.thrusters[ i ].isBaseThruster ) {
        this.thrusters.splice( i, 1 );
      } else {
        i++;
      }
    }
  };

  VehicleModel.prototype.setupBaseThrusters = (function() {

    var angles = {
      forward: 0,
      backward: Math.PI,
      left: 3 * Math.PI / 2,
      right: Math.PI / 2
    };

    var instanceData = {
      modelName: 'base-thruster',
      position: [ 0, 0 ],
      atoms: [],
      angle: 0
    };

    var setupThruster = function( model, x, y, angle, force ) {
      instanceData.position[ 0 ] = x;
      instanceData.position[ 1 ] = y;
      instanceData.angle = angle;

      var gizmo = new BaseThruster( model.entity, instanceData );
      gizmo.isAttached = true;
      gizmo.force = force;

      model.thrusters.push( gizmo );
      model.addGizmo( gizmo );
    };

    var _com = Vec2.createFloat64();

    // useful constants
    var _sin135 = Math.sin( 3/4 * Math.PI );
    var _sqrt2 = Math.sqrt( 2 );

    return function() {

      // Directional thrust will involve 2 thrusters for each
      // direction, so we divide the base force by 2.
      var force = this.core.baseForce / 2;

      // Turning will involve 4 thrusters for each direction, so we
      // divide the base torque by 4.
      var torque = this.core.baseTorque / 4;

      // We want to position the 8 thrusters at a specific distance
      // from the COM in order to produce the desired torque when
      // turning, given that each thruster will form a 135 degree
      // angle with the "lever" vector from the COM to the thruster.
      var radius = torque / ( force * _sin135 );

      // The radius is the length of the hypotenuse of a 45/45/90
      // triangle. To get the offset in each direction, we need the
      // length of each leg, in cell units.
      var offset = radius / ( _sqrt2 * CELL_SIZE );

      // Compute positions of each thruster based on COM, in cell
      // units, and offset.
      var com = Vec2.add( this.entity.physics.localCOM, this.reg, _com );
      Vec2.scale( com, 1 / CELL_SIZE, com );

      var front = com[ 0 ] + offset;
      var back = com[ 0 ] - offset;
      var left = com[ 1 ] - offset;
      var right = com[ 1 ] + offset;

      // Setup 8 base thrusters around the COM.
      setupThruster( this, front, left, angles.backward, force );
      setupThruster( this, front, left, angles.right, force );
      setupThruster( this, front, right, angles.backward, force );
      setupThruster( this, front, right, angles.left, force );
      setupThruster( this, back, left, angles.forward, force );
      setupThruster( this, back, left, angles.right, force );
      setupThruster( this, back, right, angles.forward, force );
      setupThruster( this, back, right, angles.left, force );
    };
  }());

  VehicleModel.prototype.updateThrusters = function() {
    for( var i = 0; i < this.thrusters.length; i++ ) {
      this.thrusters[ i ].computeTorque( this.entity.physics.localCOM );
    }
  };

  VehicleModel.prototype.clearData = function() {
    // TODO: recycle all the atoms and gizmos
    this.atoms.length = 0;
    this.cells.length = 0;
    this.cells.length = NUM_CELLS;
    this.gizmos.length = 0;
    this.thrusters.length = 0;
    this.weapons.length = 0;
    this.core = null;
    this.cellCount = 0;

    this.isLoaded = false;
  };

  // `vehicleData` corresponds to the "vehicle" property in the
  // example JSON file.
  //
  // `atomData` corresponds to the "atoms" property in the example
  // JSON file.
  VehicleModel.prototype.loadFromData = function( vehicleData, atomData ) {
    if( this.isLoaded ) {
      this.clearData();
    }

    // Create Atoms.
    this.cellCount = 0;
    for ( var atomIdx = 0; atomIdx < vehicleData[ 'atoms' ].length; ++atomIdx ) {
      var atomID = vehicleData[ 'atoms' ][ atomIdx ];
      if ( atomID ) {
        var i = atomIdx % ATOM_GRID_SIZE;
        var j = ~~( atomIdx / ATOM_GRID_SIZE );
        var newAtom = new Atom( i, j, atomID, atomData[atomID] );
        this.atoms.push( newAtom );

        // Add entries to the spatial hash
        for( i = newAtom.i; i < newAtom.i + newAtom.w; i++ ) {
          for( j = newAtom.j; j < newAtom.j + newAtom.h; j++ ) {
            this.cells[ i + j * ATOM_GRID_SIZE ] = newAtom;
          }
        }

        this.cellCount += newAtom.w * newAtom.h;
      }
    }

    // Create Gizmos.
    for ( var gizmoIdx = 0; gizmoIdx < vehicleData[ 'gizmos' ].length; ++gizmoIdx ) {
      var gizmo, instanceData = vehicleData[ 'gizmos' ][ gizmoIdx ];
      var modelData = Gizmo.lookup( instanceData[ 'modelName' ] );

      switch ( modelData.type ) {
      case 'core':
        this.core = gizmo = new Core( this.entity, instanceData );
        break;

      case 'thruster':
        this.thrusters.push( gizmo = new Thruster( this.entity, instanceData) );
        break;

      case 'weapon':
        break;

      default:
        throw new Error( 'Unexpected type in vehicle JSON: ' + modelData.type );
      }

      gizmo.isAttached = true;
      this.addGizmo( gizmo );

      // Attach Atoms.
      for ( atomIdx = 0; atomIdx < instanceData['atoms'].length; ++atomIdx ) {
        var coord = instanceData['atoms'][ atomIdx ];
        gizmo.addAtom( this.getAtom(coord[0], coord[1]) );
      }
    }

    if ( !this.core ) {
      throw new Error( 'Loaded vehicle has no core.' );
    }

    this.publish( 'atoms:load' );

    // now that we have loaded the new shape, set up the base thrusters
    this.setupBaseThrusters();

    // now init all of the thrusters
    for( var t = 0; t < this.thrusters.length; t++ ) {
      this.thrusters[ t ].init( this );
    }
    this.updateThrusters();

    this.isLoaded = true;
    this.publish( 'gizmos:load' );
  };

  // spawn the vehicle
  VehicleModel.prototype.spawn = function( opts ) {
    if( opts.position ) {
      Vec2.setFromArray( this.entity.transform.position, opts.position );
    }

    if( opts.angle !== undefined ) {
      this.entity.transform.setRotation( opts.angle );
    }

    // Reset cellCount and atoms’ hp.
    this.cellCount = 0;
    var i;
    for ( i = 0; i < this.atoms.length; i++ ) {
      var atom = this.atoms[i];
      atom.hp = atom.maxHp;
      this.cellCount += atom.w * atom.h;
    }

    // reattach all gizmos
    for( i = 0; i < this.gizmos.length; i++ ) {
      this.gizmos[ i ].isAttached = true;
    }

    this.isAlive = true;
    this.publish( 'spawn' );

    this.updateThrusters();
  };

  // Dispose of the vehicle (for permanent deletion)
  VehicleModel.prototype.dispose = function() {
    this.publish( 'dispose' );
  };

  // Kill the vehicle (opposite of spawning)
  VehicleModel.prototype.kill = function() {
    this.isAlive = false;
    this.publish( 'kill' );
  };

  // Cause the vehicle to explode, which will also `kill` the vehicle.
  // The Client-side subclass of VehicleModel will overwrite this
  // function in order to spawn scrap pieces.
  VehicleModel.prototype.explode = function( opts ) {
    opts = opts || {};

    this.kill();
  };

  return VehicleModel;
});
