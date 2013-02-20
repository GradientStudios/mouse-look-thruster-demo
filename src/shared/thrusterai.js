define([ 'ComponentSystem' ], function( $ ) {
  var ThrusterAI = function() {
    this.thrusters = null;
  };

  $.extend( ThrusterAI, $.Component );
  ThrusterAI.prototype.__propertyName__ = 'thrusterAI';

  ThrusterAI.prototype.start = function() {
    this.thrusters = this.entity.model.thrusters;
  };

  ThrusterAI.prototype.dispose = function() {
    this.entity.model.unsubscribe( null, null, this );
  };

  ThrusterAI.prototype.setThrustersFromInput = function( input ) {
    for ( var i = 0; i < this.thrusters.length; ++i ) {
      var thruster = this.thrusters[i];

      // for now fly forward
      thruster.coeff = ( input.thrustPower && thruster.angle === 0 ) ? 1 : 0;
    }
  };

  $.c( 'Thruster AI', ThrusterAI );

  return ThrusterAI;
});
