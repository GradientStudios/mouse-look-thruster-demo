define([
  'ComponentSystem', 'Model', 'VehicleModel', 'Vec2'
], function(
  $, Model, VehicleModel, Vec2
) {

  var CELL_SIZE = VehicleModel.CELL_SIZE;

  // for assigning a random time to live
  var MIN_TTL = 3;
  var TTL_RANGE = 2;

  var getRandomScrapTTL = function() {
    return MIN_TTL + Math.random() * TTL_RANGE;
  };

  function ScrapModel() {
    Model.call( this );

    this.atom = null;

    // how long wil this scrap live?
    this.ttl = getRandomScrapTTL();
  }

  $.extend( ScrapModel, Model );

  var onTimedDeath = function( model ) {
    model.die();
  };

  ScrapModel.prototype.start = function() {
    // dispose of the scrap after its lifespan has ended
    setTimeout( onTimedDeath, this.ttl * 1000, this );
  };

  ScrapModel.prototype.setAtom = function( atom ) {
    this.atom = atom;
    this.entity.physics.setShapeFromAtom( atom );

    // set the reg point to be the center of the atom
    Vec2.setFromValues(
      this.reg,
      this.atom.w * CELL_SIZE / 2,
      this.atom.h * CELL_SIZE / 2
    );
  };

  ScrapModel.prototype.die = function() {
    // cleanup the entity components
    if( !this.isDisposed ) {
      this.entity.dispose();
    }
  };

  ScrapModel.prototype.dispose = function() {
    this.publish( 'dispose' );
  };

  $.c( 'Scrap', ScrapModel );

  return ScrapModel;
});
