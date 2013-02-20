define(
  [ 'Gizmo' ],
  function( Gizmo ) {
    // `data` is from JSON.
    var Core = function( vehicle, instanceData ) {
      Gizmo.call( this, vehicle, instanceData );

      var data = Gizmo.lookup( this.modelName );

      // the amount of damage that can be taken across all of the
      // Core's Atoms
      this.maxHp = data[ 'maxHp' ];

      // properties of the Core's base thrusters
      this.baseForce = data[ 'baseForce' ];
      this.baseTorque = data[ 'baseTorque' ];

      if( this.baseForce === undefined ) {
        throw new Error( 'Vehicle data: Core does not specify base thruster force.' );
      }
      if( !this.baseForce ) {
        throw new Error( 'Vehicle data: Core specifies base thruster force of 0.' );
      }
   };

    Core.prototype = Object.create( Gizmo.prototype );

    // count up the total missing hp from across all the Core's
    // Atoms and compare with the Core's max hp
    Core.prototype.isDead = function() {
      return false;
    };

    Core.prototype.addAtom = function( atom ) {
      Gizmo.prototype.addAtom.apply( this, arguments );

      // The atom's max hp needs to not be lower than the core's max
      // hp, since atoms belonging to the core are not intended to
      // break off individually until the entire core is deemed dead
      // by the `isDead` function. Ideally this should be accounted
      // for in the JSON already, but a check here shouldn't hurt.
      if( atom.maxHp < this.maxHp ) {
        atom.maxHp = Infinity; //this.maxHp;
        atom.hp = atom.maxHp;
      }
    };

    return Core;
  }
);
