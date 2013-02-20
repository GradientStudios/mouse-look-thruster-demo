/*jshint browser:true*/

define([ 'ComponentSystem', 'Vec2', 'Mat2' ], function( $, Vec2, Mat2 ) {
  var Transform = function() {
    this.position = Vec2.createFloat64();
    this.angle = 0;
    this.rotation = Mat2.createFloat64Identity();
  };

  $.extend( Transform, $.Component );
  Transform.prototype.__propertyName__ = 'transform';

  Transform.prototype.setRotation = function( angle ) {
    this.angle = angle;
    Mat2.makeRotate( this.rotation, angle );
  };

  Transform.prototype.setRotationDeg = function( degrees ) {
    var radians = degrees / 180 * Math.PI;
    this.angle = radians;
    Mat2.makeRotate( this.rotation, radians );
  };

  $.c( '2D', Transform );
  return Transform;
});
