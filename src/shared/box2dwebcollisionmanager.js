/*jshint newcap:false*/

define( [
  'vendor/underscore', 'Box2D', 'ContactListener', 'Vec2'
], function( _, Box2D, ContactListener, Vec2 ) {
  var b2WorldManifold = Box2D.Collision.b2WorldManifold;

  // flags for signifying what collision events to listen for
  var ConditionFlag = {
    BEGIN: 1,
    END: 2,
    CONTINUE: 4,
    ANY: 7
  };

  var ConditionFlagsByName = {
    'begin': ConditionFlag.BEGIN,
    'end': ConditionFlag.END,
    'continue': ConditionFlag.CONTINUE,
    'any': ConditionFlag.ANY
  };

  // Flags for requesting specific collision-related data as callback arguments:
  // for points and normals, "A", "B", and "world" refer to the desired
  // coordinate system.
  var ArgumentFlag = {
    NONE: 0,
    POINTS_A: 1 << 0,
    POINTS_B: 1 << 1,
    POINTS_WORLD: 1 << 2,
    POINT_AVERAGE_A: 1 << 3,
    POINT_AVERAGE_B: 1 << 4,
    POINT_AVERAGE_WORLD: 1 << 5,
    NORMAL_A: 1 << 6,
    NORMAL_B: 1 << 7,
    NORMAL_WORLD_A: 1 << 8,
    NORMAL_WORLD_B: 1 << 9,
    IMPULSES_NORMAL: 1 << 10,
    IMPULSE_NORMAL_AVERAGE: 1 << 11,
    IMPULSES_TANGENT: 1 << 12,
    IMPULSE_TANGENT_AVERAGE: 1 << 13
  };

  ArgumentFlag.WORLD_ANY =
    ArgumentFlag.POINTS_WORLD |
    ArgumentFlag.POINT_AVERAGE_WORLD |
    ArgumentFlag.NORMAL_WORLD_A |
    ArgumentFlag.NORMAL_WORLD_B;

  function _addMemoryPool( Ctor ) {
    var pool = [];

    Ctor.allocate = function() {
      return pool.pop() || new Ctor();
    };

    Ctor.prototype.free = function() {
      pool.push( this );
    };
  }

  // contact combines the data for b2Manifold and b2WorldManifold, so
  // that this data can be safely copied over and converted to Vec2
  // form
  function ContactInfo() {
    this.numPoints = 0;
    this.flipped = false; // are A and B flipped in this contact?

    // TODO : store the local-space points

    this.worldManifold = new b2WorldManifold();
    this.worldPoints = [
      Vec2.createFloat64(),
      Vec2.createFloat64()
    ];
    this.averageWorldPoint = Vec2.createFloat64();

    // TODO : store the local-space normals
    this.worldNormalA = Vec2.createFloat64();
    this.worldNormalB = Vec2.createFloat64();

    this.normalImpulses = [ 0, 0 ];
    this.averageNormalImpulse = 0;
    this.tangentImpulses = [ 0, 0 ];
    this.tangentNormalImpulse = 0;
  }

  _addMemoryPool( ContactInfo );

  // When we gather, we collect the bare minimum of information
  // specified by the given argument flags. Typically this will be
  // done using the set of flags for all potential event handlers,
  // which means it is possible that we will gather more information
  // than is necessary (in the event that one or more handler doesn't
  // actually match the condition for the collision event.)
  ContactInfo.prototype.gather = function( contact, impulse, flipped, flags ) {
    var manifold = contact.GetManifold();
    this.numPoints = manifold.m_pointCount;
    this.flipped = flipped;

    // compute the world manifold if needed
    if( flags & ( ArgumentFlag.WORLD_ANY )) {
      contact.GetWorldManifold( this.worldManifold );
    }

    var i;

    // store the impulse values if needed
    if( flags & ( ArgumentFlag.IMPULSES_NORMAL |
                  ArgumentFlag.IMPULSE_NORMAL_AVERAGE )) {
      for( i = 0; i < this.numPoints; i++ ) {
        this.normalImpulses[ i ] = impulse.normalImpulses[ i ];
      }
    }

    if( flags & ( ArgumentFlag.IMPULSES_TANGENT |
                  ArgumentFlag.IMPULSE_TANGENT_AVERAGE )) {
      for( i = 0; i < this.numPoints; i++ ) {
        this.tangentImpulses[ i ] = impulse.tangentImpulses[ i ];
      }
    }

    return this;
  };

  // After we have gathered information based on all possible argument
  // flags, we compute the remaining information based on the set of
  // argument flags for only the events that match the conditions.
  ContactInfo.prototype.computeArguments = function( flags ) {
    var i;

    // copy the world points from the manifold to Vec2
    if( flags & ArgumentFlag.POINTS_WORLD ) {
      for( i = 0; i < this.numPoints; i++ ) {
        Vec2.setFromValues(
          this.worldPoints[ i ],
          this.worldManifold.m_points[ i ].x,
          this.worldManifold.m_points[ i ].y
        );
      }
    }

    // compute the average world point if needed
    if( flags & ArgumentFlag.POINT_AVERAGE_WORLD ) {
      if( this.numPoints === 1 ) {
        Vec2.setFromValues(
          this.averageWorldPoint,
          this.worldManifold.m_points[ 0 ].x,
          this.worldManifold.m_points[ 0 ].y
        );
      } else {
        Vec2.setFromValues(
          this.averageWorldPoint,
          ( this.worldManifold.m_points[ 0 ].x +
            this.worldManifold.m_points[ 1 ].x ) / 2,
          ( this.worldManifold.m_points[ 0 ].y +
            this.worldManifold.m_points[ 1 ].y ) / 2
        );
      }
    }

    var flip = this.flipped ? -1 : 1;

    // store the world-space normal if needed
    if( flags & ArgumentFlag.NORMAL_WORLD_A ) {
      Vec2.setFromValues(
        this.worldNormalA,
        this.worldManifold.m_normal.x * flip,
        this.worldManifold.m_normal.y * flip
      );
    }
    if( flags & ArgumentFlag.NORMAL_WORLD_B ) {
      Vec2.setFromValues(
        this.worldNormalB,
        this.worldManifold.m_normal.x * -flip,
        this.worldManifold.m_normal.y * -flip
      );
    }

    // compute the average impulses if needed
    if( flags & ArgumentFlag.IMPULSE_NORMAL_AVERAGE ) {
      if( this.numPoints === 1 ) {
        this.averageNormalImpulse = this.normalImpulses[ 0 ];
      } else {
        this.averageNormalImpulse =
          ( this.normalImpulses[ 0 ] +
            this.normalImpulses[ 1 ] ) / 2;
      }
    }

    if( flags & ArgumentFlag.IMPULSE_TANGENT_AVERAGE ) {
      if( this.numPoints === 1 ) {
        this.averageTangentImpulse = this.tangentImpulses[ 0 ];
      } else {
        this.averageTangentImpulse =
          ( this.tangentImpulses[ 0 ] +
            this.tangentImpulses[ 1 ] ) / 2;
      }
    }

    // TODO: cache / compute remaining arguments
  };

  // Each ContactReport is built from a ContactInfo, but organizes the
  // data from the perspective of object A vs object B, since we want
  // our collision event handlers to not have to worry about whether
  // their associated actor is considered object A or B in the
  // collision. For example, when building a report for object B, we
  // use the inverse normal instead of the regular normal.
  function ContactReport() {
    this.numPoints = 0;

    // TODO: store the local points
    this.worldPoints = null;
    this.averageWorldPoint = null;

    // TODO: store the local normals
    this.worldNormal = null;

    this.normalImpulses = null;
    this.averageNormalImpulse = null;
    this.tangentImpulses = null;
    this.averageTangentImpulse = null;
  }

  _addMemoryPool( ContactReport );

  ContactReport.prototype.set = function( info, reportForA, flags ) {
    this.numPoints = info.numPoints;

    // TODO: store the local points
    this.worldPoints = info.worldPoints;
    this.averageWorldPoint = info.averageWorldPoint;

    // TODO: store the local normals
    this.worldNormal = reportForA ? info.worldNormalA : info.worldNormalB;

    this.normalImpulses = info.normalImpulses;
    this.averageNormalImpulse = info.averageNormalImpulse;
    this.tangentImpulses = info.tangentImpulses;
    this.averageTangentImpulse = info.tangentNormalImpulse;

    return this;
  };


  // CollisionInfo is an object for summarizing the collision between
  // two objects, A and B, which potentially includes multiple
  // ContactInfo objects.
  function CollisionInfo() {
    this.proxyA = null;
    this.proxyB = null;
    this.begin = false;
    this.end = false;

    this.gatherArgsMask = 0;

    this.contacts = [];

    this.reportA = null;
    this.reportB = null;
  }

  _addMemoryPool( CollisionInfo );

  CollisionInfo.prototype.clear = function() {
    this.proxyA = null;
    this.proxyB = null;
    this.begin = false;
    this.end = false;

    this.gatherArgsMask = 0;

    for( var i = 0; i < this.contacts.length; i++ ) {
      this.contacts[ i ].free();
    }
    this.contacts.length = 0;

    if( this.reportA ) {
      this.reportA.clear();
      this.reportA.free();
      this.reportA = null;
    }

    if( this.reportB ) {
      this.reportB.clear();
      this.reportB.free();
      this.reportB = null;
    }
  };

  CollisionInfo.prototype.shouldStoreContacts = function() {
    return this.gatherArgsMask !== ArgumentFlag.NONE;
  };

  CollisionInfo.prototype.addContactInfo = function( contact, impulse, flipped ) {
    var info = ContactInfo.allocate();
    this.contacts.push( info.gather( contact, impulse, flipped, this.gatherArgsMask ));
  };

  CollisionInfo.prototype.computeArguments = function( flags ) {
    for( var i = 0; i < this.contacts.length; i++ ) {
      this.contacts[ i ].computeArguments( flags );
    }
  };

  CollisionInfo.prototype.getReport = function( reportForA ) {
    var report = CollisionReport.allocate().set( this, reportForA );
    if( reportForA ) {
      this.reportA = report;
    } else {
      this.reportB = report;
    }
    return report;
  };


  // CollisionReport is the object that will actually be handed down
  // to collision event handlers. It contains all the relevant
  // information from CollisionInfo, reorganized to remove references
  // to A and B. This includes an Array of ContactReport objects built
  // from the original ContactInfo objects.
  function CollisionReport() {
    this.other = null;
    this.contacts = [];
  }

  _addMemoryPool( CollisionReport );

  CollisionReport.prototype.set = function( info, reportForA, flags ) {
    this.other = reportForA ? info.proxyB.actor : info.proxyA.actor;

    if( flags !== ArgumentFlag.NONE ) {
      for( var i = 0; i < info.contacts.length; i++ ) {
        var contactReport = ContactReport.allocate();
        this.contacts.push(
          contactReport.set( info.contacts[ i ], reportForA, flags )
        );
      }
    }

    return this;
  };

  CollisionReport.prototype.clear = function() {
    this.other = null;
    for( var i = 0; i < this.contacts.length; i++ ) {
      this.contacts[ i ].free();
    }
    this.contacts.length = 0;

    return this;
  };



  // Base mapping of collision event name segments to the
  // corresponding argument flags.
  var ArgumentFlagsByName = {
    'world-points': ArgumentFlag.POINTS_WORLD,
    'average-world-point': ArgumentFlag.POINT_AVERAGE_WORLD,
    'normal-impulses': ArgumentFlag.IMPULSES_NORMAL,
    'average-normal-impulse': ArgumentFlag.IMPULSE_NORMAL_AVERAGE,
    'tangent-impulses': ArgumentFlag.IMPULSES_TANGENT,
    'average-tangent-impulse': ArgumentFlag.IMPULSE_TANGENT_AVERAGE
  };

  // We actually need 2 mappings, one for object A and one for object
  // B, since the arguments passed down will be different.
  var ArgumentFlagsByNameA = _.defaults({
    'world-normal': ArgumentFlag.NORMAL_WORLD_A
  }, ArgumentFlagsByName );

  var ArgumentFlagsByNameB = _.defaults({
    'world-normal': ArgumentFlag.NORMAL_WORLD_B
  }, ArgumentFlagsByName );


  // CollisionEvent is an object for storing the conditions under which a specific
  // event with the given name should fire, as well as what arguments should be
  // passed to that event's handlers.
  function CollisionEvent( name, condition, argsA, argsB ) {
    this.name = name;
    this.conditionMask = condition;
    this.argumentMaskA = argsA;
    this.argumentMaskB = argsB;
  }

  CollisionEvent.createFromName = function( eventName ) {
    var names = eventName.split( ':' );

    var conditionMask = 0;
    var argumentMaskA = 0;
    var argumentMaskB = 0;

    // if the event doesn't start with 'collision' than we should ignore it
    if( names[ 0 ] !== 'collision' ) {
      return false;
    }

    // check the condition name
    conditionMask = ConditionFlagsByName[ names[ 1 ] ];
    if( conditionMask === undefined ) {
      // invalid condition
      return false;
    }

    // build the argument mask from argument names
    for( var i = 2; i < names.length; i++ ) {
      if( ArgumentFlagsByNameA[ names[ i ] ] !== undefined ) {
        argumentMaskA |= ArgumentFlagsByNameA[ names[ i ] ];
        argumentMaskB |= ArgumentFlagsByNameB[ names[ i ] ];
      } else {
        // invalid argument name
        throw new Error( 'Invalid collision argument name:' + names[ i ] );
        // return false;
      }
    }

    return new CollisionEvent( eventName, conditionMask, argumentMaskA, argumentMaskB );
  };


  // The CollisionManager is an object responsible for gathering and managing
  // contact info as collisions happen in the simulation. It provides functions
  // for registering specific events for specific actors, and knows how to
  // fire off the events under the specified conditions, passing the correct set
  // of arguments along to the event handlers.
  function CollisionManager( simulation ) {
    this.simulation = simulation;

    // collection of all contact info objects
    this.collisionInfo = {};
    this._free = []; // contacts for recycling
  }

  var filterEvents = function( events, conditionMask, filtered ) {
    if( filtered ) {
      filtered.length = 0;
    } else {
      filtered = [];
    }

    // avoid using Array.prototype.filter so that we don't allocate a new Array
    for( var i = 0; i < events.length; i++ ) {
      if( events[ i ].conditionMask & conditionMask ) {
        filtered.push( events[ i ] );
      }
    }

    return filtered;
  };

  var getArgumentMask = (function() {
    var _combineFlagsA = function( prev, curr ) {
      return prev | curr.argumentMaskA;
    };
    var _combineFlagsB = function( prev, curr ) {
      return prev | curr.argumentMaskB;
    };

    return function( events, getFlagsForA ) {
      var combine = getFlagsForA ? _combineFlagsA : _combineFlagsB;
      return events.reduce( combine, ArgumentFlag.NONE );
    };
  }());

  // If we care about the collision between A and B, then return back
  // a ContactInfo object for the given combination of ids, allocating
  // a new ContactInfo if needed. If we don't care, then return null.
  CollisionManager.prototype.getCollisionInfo = function( id0, id1 ) {

    // figure out "canonical" labelling of objects as A and B
    var idA = Math.min( id0, id1 );
    var idB = Math.max( id0, id1 );

    var key = idA + '-' + idB;
    var info = this.collisionInfo[ key ];
    if( !info ) {

      // Check that both proxies exist and that at least one of them
      // has one or more collision event handlers. Note that the case
      // in which one of the proxies does not exist could correspond
      // to a collision end event, but there is currently no use case
      // for this.
      var proxyA = this.simulation.proxies[ idA ];
      var proxyB = this.simulation.proxies[ idB ];

      if(( !proxyA || !proxyB ) ||
         ( !proxyA.collisionEvents.length && !proxyB.collisionEvents.length )) {
        return null;
      }

      // Now gather the argument flags for the event handlers and
      // combine into one mask. Note that none of the event handlers
      // have been filtered by condition yet (which we don't have
      // enough information to do at this point), which means that
      // some of the flags included here might not be needed in the
      // long run.
      var maskA = getArgumentMask( proxyA.collisionEvents, true );
      var maskB = getArgumentMask( proxyB.collisionEvents, false );
      var mask = maskA | maskB;

      info = CollisionInfo.allocate();
      info.proxyA = proxyA;
      info.proxyB = proxyB;

      // set the argument mask for gathering data during contact events
      info.gatherArgsMask = mask;

      this.collisionInfo[ key ] = info;
    }

    return info;
  };

  // Register collison events: This involves constructing a CollisionEvent
  // from the event name and then storing that event on the ActorProxy.
  CollisionManager.prototype.registerEvent = function( actor, eventName ) {
    var proxy = this.simulation.proxies[ actor.id ];

    var event = proxy.findEventByName( eventName );

    if( !event ) {
      // create new event for this event name
      event = CollisionEvent.createFromName( eventName );
      if( event ) {
        proxy.addEvent( event );
      }
    }
  };

  CollisionManager.prototype.unregisterEvent = function( actor, eventName ) {
    var proxy = this.simulation.proxies[ actor.id ];

    var event = proxy.findEventByName( eventName );

    if( event ) {
      proxy.removeEvent( event );
      return true;
    }

    return false;
  };

  var _tmpArrayA = [];
  var _tmpArrayB = [];

  // Fire collision events for the frame. The `timeInfo` and `actionList` are
  // provided for as arguments for the events so that they can perform game
  // logic and generate Actions for later execution.
  CollisionManager.prototype.fireCollisionEvents = function( timeInfo, actionList ) {
    var info, i, name, report;
    var condMask, argsMask, argsMaskA, argsMaskB;

    var eventsA = _tmpArrayA;
    var eventsB = _tmpArrayB;
    // iterate over all contact info records
    for( var key in this.collisionInfo ) {
      info = this.collisionInfo[ key ];

      // condition mask for this collision
      condMask =
        info.begin ? ConditionFlag.BEGIN : 0 |
        info.end ? ConditionFlag.END : 0 |
        ( info.begin === info.end ) ? ConditionFlag.CONTINUE : 0;

      // get the events that match the condition mask
      filterEvents( info.proxyA.collisionEvents, condMask, eventsA );
      filterEvents( info.proxyB.collisionEvents, condMask, eventsB );

      if( !eventsA.length && !eventsB.length ) {
        // no events match this contact so we don't care
        continue;
      }

      // build arguments masks for all the needed arguments
      argsMaskA = getArgumentMask( eventsA, true );
      argsMaskB = getArgumentMask( eventsB, false );
      argsMask = argsMaskA | argsMaskB;

      // compute all needed argument values from the given masks
      info.computeArguments( argsMask );

      // now fire off each event with the arguments needed
      if( eventsA.length ) {
        report = info.getReport( true );
        for( i = 0; i < eventsA.length; i++ ) {
          info.proxyA.actor.publish( eventsA[ i ].name, timeInfo, actionList, report );
        }
      }

      if( eventsB.length ) {
        report = info.getReport( false );
        for( i = 0; i < eventsB.length; i++ ) {
          info.proxyB.actor.publish( eventsB[ i ].name, timeInfo, actionList, report );
        }
      }
    }
  };

  return CollisionManager;
});
