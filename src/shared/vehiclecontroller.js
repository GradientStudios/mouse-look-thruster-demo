define([
  'ComponentSystem',
  'when'
], function(
  ComponentSystem,
  when
) {
  var VehicleController = function() {
    this.model = null;

    // promises are resolved after we are done being loaded/spawned,
    // and reset whenever we are unloaded/killed
    this._postLoadDefer = when.defer();
    this._postSpawnDefer = when.defer();

    this.isDisposed = false;
  };

  ComponentSystem.extend( VehicleController, ComponentSystem.Component );
  VehicleController.prototype.__propertyName__ = 'controller';

  VehicleController.prototype.start = function() {
    this.model = this.entity.model;
  };

  VehicleController.prototype.isLoaded = function() {
    return this.model.isLoaded;
  };

  VehicleController.prototype.isAlive = function() {
    return this.model.isAlive;
  };

  // Tell the vehicle to spawn as soon as it is loaded.
  VehicleController.prototype.spawn = function( opts ) {
    if ( this.isAlive() ) {
      throw new Error(
        'Cannot spawn vehicle ' + this.entity.id.get() +
          ': Vehicle is already spawned.'
      );
    }

    // spawn as soon as we are loaded
    var self = this;
    this._postLoadDefer.then(function() {
      self.model.spawn( opts );
      self._postSpawnDefer.resolve();
    }).then( null, function( err ) {
      console.error( err.stack );
    });
  };

  // Kill the vehicle.
  VehicleController.prototype.kill = function( opts ) {
    if ( !this.isAlive() ) {
      throw new Error(
        'Cannot kill vehicle ' + this.entity.id.get() +
          ': Vehicle is already dead.'
      );
    }

    if ( opts.explode ) {
      this.model.explode( opts );
    } else {
      this.model.kill();
    }

    // since we are now dead, we need a new deferred to hold onto
    // stuff that should be done once we are alive again
    this._postSpawnDefer = when.defer();
  };

  // Clear out the vehicle's data.
  VehicleController.prototype.unload = function() {
    if ( !this.isLoaded() ) {
      throw new Error(
        'Cannot unload vehicle ' + this.entity.id.get() +
          ' data: Vehicle is not loaded.'
      );
    }

    // we are not allowed to be alive and not loaded
    if ( this.isAlive() ) {
      throw new Error(
        'Cannot unload vehicle ' + this.entity.id.get() +
          ' data: Vehicle is still spawned.'
      );
    }

    this.model.clearData();

    // since we are no longer loaded, we need a new deferred to hold
    // onto stuff that should be done once we are alive again
    this._postLoadDefer = when.defer();
  };

  // Load the given data into the vehicle.
  VehicleController.prototype.load = function( data ) {
    if ( this.isLoaded() ) {
      throw new Error(
        'Cannot load vehicle ' + this.entity.id.get() +
          ' data: Vehicle already has data loaded.'
      );
    }

    this.model.loadFromData( data.vehicle, data.atoms );
    this._postLoadDefer.resolve();
  };

  VehicleController.prototype.dispose = function() {
    this.isDisposed = true;
  };

  ComponentSystem.c( 'Vehicle Controller', VehicleController );

  return VehicleController;
});
