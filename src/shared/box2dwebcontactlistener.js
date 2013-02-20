/*jshint newcap:false*/

define( [ 'Box2D' ], function( Box2D ) {

  var b2WorldManifold = Box2D.Collision.b2WorldManifold;

  // Implement Box2D's contact listener interface.
  // The ContactListener receives events from the simulation and accumulates data
  // into a single CollisionInfo object, which it obtains from a CollisionManager.
  function ContactListener( collisionManager ){
    this.collisionManager = collisionManager;
  }

  ContactListener.prototype.BeginContact = function( contact ) {
    var idA = contact.GetFixtureA().GetBody().GetUserData().id;
    var idB = contact.GetFixtureB().GetBody().GetUserData().id;

    var collisionInfo = this.collisionManager.getCollisionInfo( idA, idB );
    if ( collisionInfo ) {
      collisionInfo.begin = true;
    }
  };

  ContactListener.prototype.EndContact = function( contact ) {
    var idA = contact.GetFixtureA().GetBody().GetUserData().id;
    var idB = contact.GetFixtureB().GetBody().GetUserData().id;

    var collisionInfo = this.collisionManager.getCollisionInfo( idA, idB );
    if ( collisionInfo ) {
      collisionInfo.end = true;
    }
  };

  ContactListener.prototype.PostSolve = function( contact, impulse ) {
    var idA = contact.GetFixtureA().GetBody().GetUserData().id;
    var idB = contact.GetFixtureB().GetBody().GetUserData().id;

    // hold onto stuff until the contact info is processed
    var collisionInfo = this.collisionManager.getCollisionInfo( idA, idB );
    if ( collisionInfo && collisionInfo.shouldStoreContacts()) {

      // this contact might be "flipped" with respect to the
      // CollisionInfo's notion of A and B
      var flipped = idB < idA;
      collisionInfo.addContactInfo( contact, impulse, flipped );
    }
  };

  ContactListener.prototype.PreSolve = function( contact, oldManifold ){};

  return ContactListener;
});
