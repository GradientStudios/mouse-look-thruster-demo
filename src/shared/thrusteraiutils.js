/*jshint browser:true*/

define(function() {
  var stepRate = 60;
  var dt = 1 / stepRate;

  var iterateOnce = (function() {
    var current      = new Float64Array([ 0, 0, 0 ]);
    var target       = new Float64Array([ 0, 0, 0 ]);
    var origin       = new Float64Array([ 0, 0, 0 ]);
    var dirAlongLine = new Float64Array([ 0, 0, 0 ]);
    var potential    = new Float64Array([ 0, 0, 0 ]);
    var error        = new Float64Array([ 0, 0, 0 ]);

    var dot = function( a, b ) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    };

    var clamp01 = function( n ) {
      if ( n > 1 ) { return 1; }
      if ( n < 0 ) { return 0; }
      return n;
    };

    return function( thrusters, tgtF, tgtR, tgtT, weightF, weightR, weightT ) {
      if ( !thrusters.length ) {
        return true;
      }

      target[0] = tgtF * weightF;
      target[1] = tgtR * weightR;
      target[2] = tgtT * weightT;

      // compute forces based on current thruster coefficients
      current[0] = 0;
      current[1] = 0;
      current[2] = 0;
      thrusters.forEach(function( thruster ) {
        var coeff = thruster.coeff;
        current[0] += thruster.localForce[0] * coeff * weightF;
        current[1] += thruster.localForce[1] * coeff * weightR;
        current[2] += thruster.torque        * coeff * weightT;
      });

      // loop over all the thrusters and figure out which one we
      // should adjust to move us closest to the target
      var closest = Infinity;
      var closestIdx = 0;
      var closestCoeff = 0;
      thrusters.forEach(function( thruster, index ) {
        // The thruster's maximum contribution represents the
        // direction of a 3D line in space.  Adjusting the coefficient
        // will slide the "current" total forces along that line as we
        // increase or decrease this thruster's contributions.
        dirAlongLine[0] = thruster.localForce[0] * weightF;
        dirAlongLine[1] = thruster.localForce[1] * weightR;
        dirAlongLine[2] = thruster.torque        * weightT;

        var dirDot = dot( dirAlongLine, dirAlongLine );
        if ( dirDot === 0 ) { return; }

        var coeff = thruster.coeff;
        // We subtract off our current contribution to get the
        // "origin", that is, the forces provided by the other
        // thrusters when our coefficent is 0.
        origin[0] = current[0] - dirAlongLine[0] * coeff;
        origin[1] = current[1] - dirAlongLine[1] * coeff;
        origin[2] = current[2] - dirAlongLine[2] * coeff;

        // The difference between the target and the origin is the
        // "ideal" change that we must try to achieve by adjusting our
        // coefficient. We find the coefficient that gets us as close
        // as possible by projecting the ideal onto dirAlongLine
        // (which represents the actual change we can make.)
        var t = ( dirAlongLine[0] * (target[0] - origin[0]) +
                  dirAlongLine[1] * (target[1] - origin[1]) +
                  dirAlongLine[2] * (target[2] - origin[2]) ) / dirDot;
        t = clamp01( t );

        // Current coeff is already at closest point, so pointless to
        // consider further.
        if ( Math.abs(coeff - t) < 1e-16 ) { return; }

        // Compute what the new total force would be with our new
        // coefficient.
        potential[0] = origin[0] + dirAlongLine[0] * t;
        potential[1] = origin[1] + dirAlongLine[1] * t;
        potential[2] = origin[2] + dirAlongLine[2] * t;

        // Compute the error between the new total force and the
        // target.
        error[0] = potential[0] - target[0];
        error[1] = potential[1] - target[1];
        error[2] = potential[2] - target[2];

        var distSq = dot( error, error );
        if ( distSq < closest ) {
          // Remember this adjustment as the best so far.
          closest = distSq;
          closestIdx = index;
          closestCoeff = t;
        }
      });

      if ( closest !== Infinity ) {
        // Found an adjustment that improves the results, so set the
        // coefficient to its new value.
        thrusters[ closestIdx ].coeff = closestCoeff;

        return false;
      } else {
        // No adjustment was found, so we have converged.
        return true;
      }
    };
  }());

  var findTargetTorque = (function() {
    var result = {
      angle: 0,
      brakeDist: 0,
      ccw: true,
      frozen: false,
      torque: 0
    };

    var nonZeroSign = function( value ) {
      return value > 0 ? 1 : -1;
    };

    return function( angularVelocity, targetAngle, inverseInertia, maxCCW, maxCW ) {
      // Target angle is closest via CW.
      var brakeTorque, desiredTorque;
      if ( targetAngle < 0 ) {
        if ( targetAngle < -Math.PI ) {
          console.warn( 'targetAngle < -π: targetAngle =', targetAngle );
        }

        desiredTorque = maxCW;
        brakeTorque = maxCCW;
        result.ccw = false;
      }

      // Target angle is closest via CCW.
      else if ( targetAngle > 0 ) {
        if ( targetAngle > Math.PI ) {
          console.warn( 'targetAngle > π: targetAngle =', targetAngle );
        }

        desiredTorque = maxCCW;
        brakeTorque = maxCW;
        result.ccw = true;
      }

      result.angle = targetAngle;

      if ( Math.abs(targetAngle) < 0.01 ) {
        var freeze = false;
        var freezeAccel;
        if ( angularVelocity > 0 ) {
          freezeAccel = maxCW * inverseInertia;
          freeze = angularVelocity + freezeAccel * dt < 0;
        } else {
          freezeAccel = maxCCW * inverseInertia;
          freeze = angularVelocity + freezeAccel * dt > 0;
        }

        if ( freeze ) {
          result.torque = -angularVelocity / ( dt * inverseInertia );
          result.brakeDist = 0;
          result.frozen = true;
          return result;
        }
      }
      result.frozen = false;

      // We're traveling in the same direction we want to go, so do we
      // need to brake?
      var brakeDist = 0;
      var wantsBrake = false;
      if ( result.ccw === angularVelocity > 0 ) {
        var brakeTime = -angularVelocity / ( brakeTorque * inverseInertia );
        brakeDist = brakeTime * angularVelocity * 0.5;
        wantsBrake = Math.abs(brakeDist) - Math.abs(targetAngle) > -0.01;
      }

      if ( wantsBrake ) {
        result.brakeDist = brakeDist;

        var tmp = desiredTorque;
        desiredTorque = brakeTorque;
        brakeTorque = tmp;
      } else {
        result.brakeDist = 0;
      }

      // The "optimal" velocity is the velocity needed to bring us to
      // the target angle in a single physics step.
      var optimalVelocity = targetAngle / dt;

      // The "optimal" torque is the amount of torque needed this
      // frame to achieve the "optimal" velocity.
      var optimalTorque = ( optimalVelocity - angularVelocity ) / ( dt * inverseInertia );
      var desiredTorqueSign = nonZeroSign( desiredTorque );

      if ( desiredTorqueSign === nonZeroSign(optimalTorque) ) {
        // If the torque we desire is greater than the "optimal"
        // torque, we obviously don't need all of it.
        if ( Math.abs(desiredTorque) > Math.abs(optimalTorque) ) {

          // We look forward to the following physics step and predict
          // the amount of braking force required to "freeze" the
          // mouse look.
          var requiredBrakeTorque = -optimalVelocity / ( dt * inverseInertia );

          var availableBrakeTorque;
          if ( desiredTorqueSign === nonZeroSign(requiredBrakeTorque) ) {
            availableBrakeTorque = desiredTorque;
          } else {
            availableBrakeTorque = brakeTorque;
          }

          // If the amount of available braking torque is enough, then
          // it will be possible to stop immediately, so we use the
          // optimal torque.

          if ( Math.abs(requiredBrakeTorque) <= Math.abs(availableBrakeTorque) ) {
            desiredTorque = optimalTorque;
          }
        }
      }

      result.torque = desiredTorque;
      return result;
    };
  }());

  return {
    stepRate: stepRate,
    dt: dt,

    findTargetTorque: findTargetTorque,
    iterateOnce: iterateOnce
  };
});
