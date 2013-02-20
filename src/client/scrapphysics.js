define([
  'ComponentSystem', 'Physics', 'VehicleModel'
], function(
  $, Physics, VehicleModel
) {

  var CELL_SIZE = VehicleModel.CELL_SIZE;

  function ScrapPhysics() {
    Physics.apply( this, arguments );

    // consider switching this to a circle for performance
    this.shapeInfo.type = Physics.ShapeType.Rect;
  }

  $.extend( ScrapPhysics, Physics );

  ScrapPhysics.prototype.category = Physics.Category.Scrap;

  ScrapPhysics.prototype.setShapeFromAtom = function( atom ) {
    this.shapeInfo.halfWidth = CELL_SIZE * atom.w * 0.5;
    this.shapeInfo.halfHeight = CELL_SIZE * atom.h * 0.5;
  };

  ScrapPhysics.prototype.dispose = function() {
    Physics.prototype.dispose.apply( this, arguments );
  };


  $.c( 'Scrap Physics', ScrapPhysics );

  return ScrapPhysics;
});
