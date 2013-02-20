define([ 'ComponentSystem', 'Vec2' ], function( $, Vec2 ) {
  var Model = function() {
    this.thrusters = [];

    // The registration point of the model, which determines it's
    // local "center". Note that the reg point is stored in the
    // same world units used by the transform component.
    this.reg = Vec2.createFloat64();
  };

  $.extend( Model, $.EmitterComponent );
  Model.prototype.__propertyName__ = 'model';

  return Model;
});
