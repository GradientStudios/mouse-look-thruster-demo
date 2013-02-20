define([ 'Vec2' ], function( Vec2 ) {

  // formalized input map
  function InputMap () {
    this.thrustHeading = 0;
    this.thrustPower = 0;
    this.faceHeading = 0;
  }

  InputMap.prototype.set = function( other ) {
    this.thrustHeading = other.thrustHeading;
    this.thrustPower = other.thrustPower;
    this.faceHeading = other.faceHeading;

    return this;
  };

  return InputMap;
});
