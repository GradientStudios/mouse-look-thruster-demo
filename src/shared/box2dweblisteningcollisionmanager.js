define([
  'Box2D',
  'CollisionManager',
  'ContactListener'
], function(
  Box2D,
  CollisionManager,
  ContactListener
) {

  // A ListeningContactManager populates its ContactInfo data
  // using a ContactListener.
  function ListeningCollisionManager() {
    CollisionManager.apply( this, arguments );

    this.contactListener = new ContactListener( this );
    this.simulation.world.SetContactListener( this.contactListener );
  }

  ListeningCollisionManager.prototype = Object.create(
    CollisionManager.prototype
  );

  // Clear all stored CollisionInfo
  ListeningCollisionManager.prototype._clear = function() {
    for( var key in this.collisionInfo ) {
      this.collisionInfo[ key ].clear();
      this.collisionInfo[ key ].free();
      delete this.collisionInfo[ key ];
    }
  };

  // Since the CollisionInfo is populated on an event basis, we
  // clear all the contact info after each step
  ListeningCollisionManager.prototype.fireCollisionEvents = function() {
    CollisionManager.prototype.fireCollisionEvents.apply( this, arguments );

    this._clear();
  };

  return ListeningCollisionManager;
});
