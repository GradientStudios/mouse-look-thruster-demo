define([
  'Gizmo',
  'Thruster',
  'Vec2'
], function(
  Gizmo,
  Thruster,
  Vec2
) {

  var BaseThruster = function( vehicle, instanceData ) {
    Thruster.call( this, vehicle, instanceData );

    // base thrusters will not be rendered
    this.gfxID = null;
  };

  BaseThruster.prototype = Object.create( Thruster.prototype );

  // base thrusters are immortal
  BaseThruster.prototype.isDead = function() {
    return false;
  };

  BaseThruster.prototype.isBaseThruster = true;

  // base thrusters are not loaded from JSON, so instead we register their
  // data here for the Gizmo lookup
  Gizmo.register( 'base-thruster', {
    // note that property names listed here must use quotes to avoid
    // being minimized
    'type': 'thruster',
    'reg': [ 0, 0 ],
    'thrustOffset': [ 0, 0 ],
    'force': 2
  });

  return BaseThruster;
});
