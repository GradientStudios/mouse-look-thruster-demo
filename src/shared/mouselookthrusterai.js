/*jshint browser:true*/

define([
  'ComponentSystem', 'ThrusterAI', 'VehicleModel',
  'ThrusterAIUtils', 'Mat2', 'Vec2'
], function(
  $, ThrusterAI, VehicleModel, ThrusterAIUtils, Mat2, Vec2
) {
  var DEG2RAD = Math.PI / 180;

  var MLTS = function() {
    ThrusterAI.apply( this );

    this.model = null;

    this.maxForward  = 0;
    this.maxBackward = 0;
    this.maxRight    = 0;
    this.maxLeft     = 0;
    this.maxCCW      = 0;
    this.maxCW       = 0;

    this.weightF = 1;
    this.weightR = 1;
    this.weightT = 7;
  };

  $.extend( MLTS, ThrusterAI );

  MLTS.prototype.start = function() {
    ThrusterAI.prototype.start.call( this );

    this.model = this.entity.model;
    this.model.subscribe( 'gizmos:load', this.calculateThrusterValues, this );
    this.model.subscribe( 'thrusters:update', this.calculateThrusterValues, this );

    if ( this.model.isLoaded ) {
      this.calculateThrusterValues();
    }
  };

  MLTS.prototype.calculateThrusterValues = function() {
    this.maxForward  = 0;
    this.maxBackward = 0;
    this.maxRight    = 0;
    this.maxLeft     = 0;
    this.maxCCW      = 0;
    this.maxCW       = 0;

    this.model.thrusters.forEach(function( thruster ) {
      if ( thruster.isAttached ) {
        var eps = 0;
        this.maxForward  += thruster.localForce[0] >  eps ?  thruster.localForce[0] : 0;
        this.maxRight    += thruster.localForce[1] >  eps ?  thruster.localForce[1] : 0;
        this.maxBackward += thruster.localForce[0] < -eps ? -thruster.localForce[0] : 0;
        this.maxLeft     += thruster.localForce[1] < -eps ? -thruster.localForce[1] : 0;
        this.maxCCW      += thruster.torque >  eps ?  thruster.torque : 0;
        this.maxCW       += thruster.torque < -eps ? -thruster.torque : 0;
      }
    }, this );
  };

  MLTS.prototype.setThrustersFromInput = (function() {
    var LOCAL_FORWARD = Vec2.createFloat64FromValues( 1, 0 );
    var targetDir = Vec2.createFloat64();
    var forward = Vec2.createFloat64();

    return function( input ) {
      var xf = this.entity.transform;
      var physics = this.entity.physics;

      // Calculate normalized target vector to heading.
      var globalHeading = input.faceHeading;
      Vec2.setFromValues(
        targetDir,
        Math.cos( globalHeading ),
        Math.sin( globalHeading )
      );

      // Calculate angle between forward vector and target vector.
      Mat2.multVec2( xf.rotation, LOCAL_FORWARD, forward );
      var cross = targetDir[0] * forward[1] - targetDir[1] * forward[0];
      var sign = cross > 0 ? -1 : 1;
      var dot = Vec2.dot( targetDir, forward );
      var targetAngle = sign * Math.acos( dot );

      var currentAngularVelocity = physics.angularVelocity;

      // Calculate whether we want to go clockwise or
      // counter-clockwise to get to target vector, and what the
      // desired torque value will be.
      var target = ThrusterAIUtils.findTargetTorque(
        currentAngularVelocity,
        targetAngle,
        physics.body.m_invI,
        this.maxCCW, -this.maxCW
      );

      // Compute the desired longitudinal (F) and lateral (R) forces.
      var thrustPower = input.thrustPower / 255;
      var targetF = 0, targetR = 0;
      if ( thrustPower ) {
        var thrustAngleRelative = input.thrustHeading - xf.angle;
        var c = Math.cos( thrustAngleRelative );
        var s = Math.sin( thrustAngleRelative );
        targetF = c * ( c > 0 ? this.maxForward : this.maxBackward );
        targetR = s * ( s > 0 ? this.maxRight   : this.maxLeft     );
      }

      // Reset the thruster coefficients to 0, and filter out any
      // thrusters that are no longer attached.
      var thrusters = this.thrusters.filter(function( thruster ) {
        thruster.coeff = 0;
        return thruster.isAttached;
      });

      // Iteratively adjust the thruster coefficients, trying to get
      // as close as possible to our target (F, R, T) values.
      var count = 0;
      while (
        count < 2 * this.thrusters.length &&
          !ThrusterAIUtils.iterateOnce(
            thrusters,
            targetF, targetR, target.torque,
            this.weightF, this.weightR, this.weightT
          )
      ) {
        ++count;
      }
    };
  }());

  $.c( 'Mouse Look Thruster AI', MLTS );

  return MLTS;
});
