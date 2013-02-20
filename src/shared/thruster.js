define([ 'Gizmo', 'Vec2', 'Mat2' ], function( Gizmo, Vec2, Mat2 ) {
  // `data` is from JSON.
  var Thruster = function( vehicle, instanceData ) {
    Gizmo.call( this, vehicle, instanceData );

    this.coeff = 0;
    this.torque = 0;

    // local position and force-scaled direction of force
    this.localPos = Vec2.createFloat64();
    this.localForce = Vec2.createFloat64();

    var data = Gizmo.lookup( this.modelName );

    this.force = data[ 'force' ];

    // From top left of location indicated by the coordinate
    // ( this.i, this.j ). Angle is applied after offset.
    this.thrustOffset = Vec2.createFloat64FromArray(
      data[ 'thrustOffset' ]
    );
  };

  Thruster.prototype = Object.create( Gizmo.prototype );

  Thruster.prototype.init = function( model ) {
    // compute the local position relative to the model
    Mat2.multVec2( this.rotation, this.thrustOffset, this.localPos );
    Vec2.add( this.reg, this.localPos, this.localPos );
    Vec2.add( this.position, this.localPos, this.localPos );
    model.getCellLocalPosition( this.localPos, this.localPos );

    // compute the local force vector
    Vec2.setFromValues(
      this.localForce,
      Math.cos( this.angle ) * this.force,
      Math.sin( this.angle ) * this.force
    );

    return this;
  };

  Thruster.prototype.computeTorque = (function() {
    var tmpV = Vec2.createFloat64();

    return function( localCOM ) {
      var pos = Vec2.subtract( this.localPos, localCOM, tmpV );
      this.torque =
        pos[ 0 ] * this.localForce[ 1 ] - pos[ 1 ] * this.localForce[ 0 ];
      return this.torque;
    };
  }());

  return Thruster;
});
