/*jshint browser:true*/

define([
  'ComponentSystem', 'Physics', 'VehicleModel', 'Vec2', 'Mat2',
  'DamageCalculator', 'ArrayPool'
], function(
  $, Physics, VehicleModel, Vec2, Mat2,
  DamageCalculator, ArrayPool
) {

  var ATOM_GRID_SIZE = VehicleModel.ATOM_GRID_SIZE;
  var CELL_SIZE = VehicleModel.CELL_SIZE;

  function VehiclePhysics() {
    Physics.apply( this, arguments );
  }

  $.extend( VehiclePhysics, Physics );
  $.c( 'Vehicle Physics', VehiclePhysics );

  VehiclePhysics.CELL_SIZE = CELL_SIZE;
  VehiclePhysics.prototype.CELL_SIZE = CELL_SIZE;

  // cached tmp variables to avoid repeated allocation
  var _tmpPos = Vec2.createFloat64();
  var _tmpForce = Vec2.createFloat64();

  VehiclePhysics.prototype.category = Physics.Category.Vehicle;

  // event handlers
  var _onSpawn = function() {
    Vec2.setFromValues( this.linearVelocity, 0, 0 );
    this.angularVelocity = 0;
    this.updateShape();
    this.enable();
  };

  var _onKill = function() {
    this.disable();
  };

  VehiclePhysics.prototype.init = function() {
    Physics.prototype.init.call( this );

    // Atom shape tells the physics to build a shape
    // from the atoms in the given model
    this.shapeInfo.type = Physics.ShapeType.Atom;

    this.model.subscribe('atoms:load', this.updateShape, this );
    this.model.subscribe('shape:loss', this.updateShape, this );
    this.model.subscribe('spawn', _onSpawn, this );
    this.model.subscribe('kill', _onKill, this );
  };

  VehiclePhysics.prototype.dispose = function() {
    _onKill.call( this );
    Physics.prototype.dispose.call( this );
  };

  VehiclePhysics.prototype.updateShape = function() {
    // default Physics behavior is to just set a dirty flag and let
    // the sim update when needed, but we need to ask for an immediate
    // update so that our COM will be accurate
    this.simulation.updateActorShape( this );
  };

  VehiclePhysics.prototype.setSimulation = function() {
    Physics.prototype.setSimulation.apply( this, arguments );

    // set up event for damaging the vehicle on collision
    this.subscribe(
      'collision:begin:average-world-point:world-normal:average-normal-impulse',
      _handleCollisionDamage,
      this
    );
  };

  // callback for handling collision damage
  var _handleCollisionDamage = (function() {

    // arbitrary constant for determining the minimum impulse for doing collision damage
    var IMPULSE_DAMAGE_THRESHOLD = 1;

    // for calculating damage against normal hull
    var radialDamagePolicy = new DamageCalculator.Policies.Radial();
    var damageCalculator = new DamageCalculator()
      .addPolicy( radialDamagePolicy );

    // modifier for reducing damage for hardened hull
    var hardenedHullMod = 0.1;

    // hack for now
    var isHardened = function( atom ) {
      return atom.maxHp > 6;
    };

    return function ( timeInfo, actionList, report ) {
      // first determine if we should even be applying damage

      // ignore scrap
      if( report.other.category & Physics.Category.Scrap ) {
        return;
      }

      // get the contact with the most impulse
      var contact = report.contacts[ 0 ];
      for( var i = 1; i < report.contacts.length; i++ ) {
        if( report.contacts[ i ].averageNormalImpulse >
            contact.averageNormalImpulse ) {
          contact = report.contacts[ i ];
        }
      }

      var damage = contact.averageNormalImpulse;
      if( damage < IMPULSE_DAMAGE_THRESHOLD ) {
        return;
      }

      // First step back along the normal by half of the CELL_SIZE to
      // get a more accurate query point.
      var queryPosition = Vec2.setFromArray( _tmpPos, contact.worldNormal );
      Vec2.scale( queryPosition, CELL_SIZE / 2, queryPosition );
      Vec2.subtract( contact.averageWorldPoint, queryPosition, queryPosition );

      // Figure out which Atoms were hit.
      var atoms = ArrayPool.allocate();
      var damageValues = ArrayPool.allocate();

      // Set a reasonable radius for damage to propagate.
      var radius = Math.sqrt( damage ) * 0.5;
      radialDamagePolicy.setRadius( radius );

      // Now use the damage calculator to figure out how much damage
      // to apply to which atoms.
      damageCalculator.execute(
        this.model,
        queryPosition,
        damage,
        atoms,
        damageValues
      );

      this.model.receiveHit({
        atoms: atoms,
        damageValues: damageValues
      });

      atoms.release();
      damageValues.release();
    };
  }());

  // iterate over all thrusters and apply forces according to
  // their set coefficients: should be called after the coefficients
  // have been set by another object, such as thruster AI
  // TODO: consider moving this elsewhere
  VehiclePhysics.prototype.applyThrusterForces = function() {
    var thrusters = this.entity.model.thrusters;

    var length = thrusters.length;
    var thruster, pos, force, localRotation;
    for( var i = 0; i < length; i++ ) {
      thruster = thrusters[ i ];
      if ( thruster.isAttached && thruster.coeff > 0 ) {

        // compute the world position
        pos = this.model.localToWorld( thruster.localPos, _tmpPos );

        // TODO: consider adding an applyLocalForce function which passes in
        // a position and force in local coordinates and allows the physics
        // to transform it into world coordinates

        // now compute the thrust force vector
        // rotate local force vector into world coords
        force = Mat2.multVec2(
          this.transform.rotation,
          thruster.localForce,
          _tmpForce
        );

        // now scale by coefficient value
        Vec2.scale( force, thruster.coeff, force );

        // now apply the force at the world position
        this.applyForce( force, pos );
      }
    }
  };

  return VehiclePhysics;
});
