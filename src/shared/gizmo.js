define([
  'Junkyard', 'Vec2', 'Mat2'
], function( Junkyard, Vec2, Mat2 ) {

  // Used to look up top-level Gizmo data shared by all Gizmos with
  // the same type and modelName.
  var junkyard = new Junkyard();

  // Gizmos (and its subclasses) should only be created by the model
  // when it is first being loaded.
  var Gizmo = function( vehicle, instanceData ) {
    this.vehicle = vehicle;
    this.modelName = instanceData[ 'modelName' ];

    var typeData = Gizmo.lookup( this.modelName );

    this.gfxID = ( instanceData[ 'gfxID' ] !== undefined ) ?
      instanceData[ 'gfxID' ] : typeData.graphics;
    this.position = Vec2.createFloat64FromArray( instanceData[ 'position' ] );
    this.key = -1;
    this.isAttached = false;

    // set the registration point
    this.reg = Vec2.createFloat64FromArray( typeData['reg'] );

    // 0 is forward. Angle is in radians.
    this.angle = instanceData[ 'angle' ];
    this.rotation = Mat2.makeRotate( Mat2.createFloat64(), this.angle );

    this.atoms = [];
  };

  Gizmo.register = junkyard._addGizmo.bind( junkyard );
  Gizmo.loadJunkyardJSON = junkyard.loadJSONData.bind( junkyard );
  Gizmo.lookup = junkyard.lookup.bind( junkyard );

  // `atom` is of type Atom.
  Gizmo.prototype.addAtom = function( atom ) {
    this.atoms.push( atom );
    atom.setGizmo( this );
    return this;
  };

  // By default, a Gizmo is dead only when all of its Atoms are have
  // zero HP.
  Gizmo.prototype.isDead = function() {
    var numAliveAtoms = this.atoms.reduce(function( prev, curr ) {
      return prev + ( curr.hp > 0 );
    }, 0 );
    return numAliveAtoms <= 0;
  };

  return Gizmo;
});
