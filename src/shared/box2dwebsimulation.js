/*jshint browser:true newcap:false*/

define([
  'ComponentSystem',
  'Box2D',
  'ListeningCollisionManager',
  'Physics',
  'AtomShape',
  'Vec2'
], function(
  $,
  Box2D,
  ListeningCollisionManager,
  Physics,
  AtomShape,
  Vec2
) {
  var b2Math = Box2D.Common.Math.b2Math;
  var b2Vec2 = Box2D.Common.Math.b2Vec2;
  var b2BodyDef = Box2D.Dynamics.b2BodyDef;
  var b2Body = Box2D.Dynamics.b2Body;
  var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
  var b2Fixture = Box2D.Dynamics.b2Fixture;
  var b2World = Box2D.Dynamics.b2World;
  var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
  var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
  var b2Color = Box2D.Common.b2Color;

  function ActorProxy( id, body, actor ) {
    this.id = id;
    this.body = body;
    this.actor = actor;

    // HACK: remove this later
    this.actor.body = body;

    this.collisionEvents = [];

    body.SetUserData( this );
  }

  ActorProxy.prototype.addEvent = function( event ) {
    this.collisionEvents.push ( event );
  };

  ActorProxy.prototype.removeEvent = function( event ) {
    var index = this.collisionEvents.indexOf( event );
    if( index !== -1 ) {
      this.collisionEvents.splice( index, 1 );
      return true;
    }
    return false;
  };

  ActorProxy.prototype.findEventByName = function( eventName ) {
    for( var i = 0; i < this.collisionEvents.length; i++ ) {
      if( this.collisionEvents[ i ].name === eventName ) {
        return this.collisionEvents[ i ];
      }
    }
    return null;
  };

  // The Simulation object manages the Box2D physics world, keeps track of
  // all `ActorProxy`s, and provides functions for stepping the simulation.
  function Simulation() {
    this.nextId = 0;

    this.dt = 1 / 60;
    this.velocityIterations = 10;
    this.positionIterations = 10;

    this.world = new b2World(
      new b2Vec2(0, 0),  // gravity
      false               // don't allow sleep
    );

    this.proxies = {};

    this.collisionManager = new ListeningCollisionManager( this );

    this._debugCameraTargetBody = null;
    this._drawCanvas = null;
    this._draw = null;
  }

  Simulation.prototype.addActor = function( actor, makeActive ) {
    var id = this.nextId++;

    // create the rigidbody
    var bodyDef = new b2BodyDef();
    bodyDef.position.x = actor.transform.position[ 0 ];
    bodyDef.position.y = actor.transform.position[ 1 ];
    if( actor.dynamic ) {
      bodyDef.type = b2Body.b2_dynamicBody;
    } else {
      bodyDef.type = b2Body.b2_staticBody;
    }

    var body = this.world.CreateBody( bodyDef );

    body.SetActive( makeActive || false ); // by default, we disable the body

    // create an actor proxy to hold onto the body and the actor
    var proxy = new ActorProxy( id, body, actor );
    this.proxies[ id ] = proxy;

    return id;
  };

  Simulation.prototype.removeActor = function( actor ) {
    // destroy the model
    var proxy = this.proxies[ actor.id ];
    delete this.proxies[ actor.id ];

    this.world.DestroyBody( proxy.body );
  };

  Simulation.prototype.enableActor = function( actor ) {
    this.proxies[ actor.id ].body.SetActive( true );
  };

  Simulation.prototype.disableActor = function( actor ) {
    this.proxies[ actor.id ].body.SetActive( false );
  };

  Simulation.prototype.updateActorShape = function( actor ) {
    _updateBodyShape( actor.body, actor );
  };

  Simulation.prototype.applyForceToActor = (function() {
    var _tmpForce = new b2Vec2();
    var _tmpPos = new b2Vec2();

    return function( actor, force, position ) {
      _tmpForce.x = force[ 0 ];
      _tmpForce.y = force[ 1 ];

      _tmpPos.x = position[ 0 ];
      _tmpPos.y = position[ 1 ];

      this.proxies[ actor.id ].body.ApplyForce( _tmpForce, _tmpPos );

      if( this._draw ) {
        this._drawForces.push({
          force: _tmpForce.Copy(),
          position: _tmpPos.Copy()
        });
      }
    };
  }());

  // clear all the fixtures on the body
  function _clearShape( body ) {
    var fixture = body.GetFixtureList();
    var tmp;
    while( fixture ) {
      tmp = fixture;
      fixture = fixture.GetNext();

      body.DestroyFixture( tmp );
    }
  }

  function _updateBodyShape( body, actor ) {
    // first clear the body's current shape
    _clearShape( body );

    // now build new fixtures from the shape info
    switch( actor.shapeInfo.type ) {
    case Physics.ShapeType.Rect:
      _setupRectShape( body, actor );
      break;
    case Physics.ShapeType.Atom:
      _setupAtomShape( body, actor );
      break;
    case Physics.ShapeType.Chain:
      _setupChainShape( body, actor );
    }

    // compute the new local COM and hand it to the actor
    var com = body.GetLocalCenter();

    Vec2.setFromValues( actor.localCOM, com.x, com.y );
  }

  // helper for setting up a base fixture definition
  function _createFixtureDefFromActor( actor ) {
    var fixDef = new b2FixtureDef();

    fixDef.density = actor.getDensity();
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;

    // set the collision filter category and mask
    fixDef.filter.categoryBits = actor.category;
    fixDef.filter.maskBits = actor.collisionMask;
    fixDef.filter.groupIndex = actor.collisionGroupIndex;

    return fixDef;
  }

  function _setupRectShape( body, actor ) {
    var fixDef = _createFixtureDefFromActor( actor );

    var halfWidth = actor.shapeInfo.halfWidth || 0.5;
    var halfHeight = actor.shapeInfo.halfHeight || 0.5;

    var center = new b2Vec2(
      (actor.shapeInfo.x || 0) - actor.model.reg[ 0 ] + halfWidth,
      (actor.shapeInfo.y || 0) - actor.model.reg[ 1 ] + halfHeight
    );

    fixDef.shape = new b2PolygonShape();
    fixDef.shape.SetAsOrientedBox(
      halfWidth,
      halfHeight,
      center,
      actor.shapeInfo.angle || 0
    );

    body.CreateFixture( fixDef );
  }

  // set up fixtures based on the atoms contained in the
  // actor's model
  // Since currently the AtomShape is not cached anywhere, we can
  // get away with recycling one.
  var _atomShape = new AtomShape();
  function _setupAtomShape( body, actor ) {
    var model = actor.model;
    var CELL_SIZE = actor.CELL_SIZE;
    if( model ) {
      // make a new AtomShape
      var shape = _atomShape.setFromModel( model );

      // create the set of fixtures from the AtomShape
      var fixDef = _createFixtureDefFromActor( actor );

      var reg = actor.model.reg;

      var rect;
      var length = shape.rects.length;
      for( var i = 0; i < length; i++ ) {
        rect = shape.rects[ i ];
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsOrientedBox(
          rect.width * CELL_SIZE / 2,
          rect.height * CELL_SIZE / 2,
          new b2Vec2(
            ( rect.left + 0.5 * rect.width ) * CELL_SIZE - reg[ 0 ],
            ( rect.top + 0.5 * rect.height ) * CELL_SIZE - reg[ 1 ]
          ),
          0
        );

        body.CreateFixture( fixDef );
      }
    }
  }

  // Note that currently we use multiple fixtures with b2PolygonShapes
  // because Box2DWeb doesn't have a working implementation for
  // b2EdgeShape or b2ChainShape.
  var _setupChainShape = (function(){
    var _v1 = new b2Vec2();
    var _v2 = new b2Vec2();

    return function( body, actor ) {
      var fixDef = _createFixtureDefFromActor( actor );

      var verts = actor.shapeInfo.verts;
      var len = verts.length;
      var i, current, next;

      var segments = actor.shapeInfo.loop ? len : len - 1;
      for( i = 0; i < segments; i++ ) {
        current = verts[ i ];
        next = verts[ ( i + 1 ) % len ];
        _v1.Set( current[ 0 ], current[ 1 ] );
        _v2.Set( next[ 0 ], next[ 1 ] );

        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsEdge( _v1, _v2 );

        body.CreateFixture( fixDef );
      }
    };
  }());

  var _updateBodyFromActor = (function(){
    var _tmpVec2 = new b2Vec2();

    return function( body, actor ) {
      // first update the fixtures if necessary
      if( actor.shapeInfo.dirty ) {
        actor.shapeInfo.dirty = false;
        _updateBodyShape( body, actor );
      }

      _tmpVec2.x = actor.transform.position[ 0 ];
      _tmpVec2.y = actor.transform.position[ 1 ];
      body.SetPosition( _tmpVec2 );

      _tmpVec2.x = actor.linearVelocity[ 0 ];
      _tmpVec2.y = actor.linearVelocity[ 1 ];
      body.SetLinearVelocity( _tmpVec2 );

      body.SetAngle( actor.transform.angle );
      body.SetAngularVelocity( actor.angularVelocity );
    };
  }());

  function _updateActorFromBody( actor, body ) {
    var pos = body.GetPosition();
    Vec2.setFromValues(
      actor.transform.position,
      pos.x,
      pos.y
    );

    var linvel = body.GetLinearVelocity();
    Vec2.setFromValues( actor.linearVelocity, linvel.x, linvel.y );

    actor.transform.setRotation( body.GetAngle() );
    actor.angularVelocity = body.GetAngularVelocity();
  }

  Simulation.prototype.step = function() {

    if( this._draw ) {
      var ctx;
      if ( this._debugCameraTargetBody ) {
        ctx = this._draw.m_ctx;
        ctx.clearRect( 0, 0, this._drawCanvas.width, this._drawCanvas.height );
        ctx.save();

        var xf = this._debugCameraTargetBody.GetTransform();

        var x = -xf.position.x * this._draw.m_drawScale;
        var y = -xf.position.y * this._draw.m_drawScale;
        var offsetX = this._drawCanvas.width / 2;
        var offsetY = this._drawCanvas.height / 2;
        ctx.translate( x + offsetX, y + offsetY );
      }
      this.world.DrawDebugData();

      // _renderForces( this._draw, this._drawForces );
      _renderThrusters( this._draw, this.world );

      if ( this._debugCameraTargetBody ) {
        ctx.restore();
      }

      this._drawForces.length = 0;
    }


    var id, proxy;
    // pre-step: update the bodies from the actors
    for( id in this.proxies ) {
      proxy = this.proxies[ id ];
      _updateBodyFromActor( proxy.body, proxy.actor );
    }

    this.world.Step( this.dt, this.velocityIterations, this.positionIterations );

    // post-step: update the actors from the bodies
    for( id in this.proxies ) {
      proxy = this.proxies[ id ];
      _updateActorFromBody( proxy.actor, proxy.body );
    }

    this.world.ClearForces();
  };

  // collision handling functions
  // Register collison event handlers, which will be fired for collisions
  // that satisfy the given `condition` mask, and will be handed the arguments
  // specified by the given `args` mask
  Simulation.prototype.registerEvent = function( actor, eventName ) {
    this.collisionManager.registerEvent( actor, eventName );
  };
  Simulation.prototype.unregisterEvent = function( actor, eventName ) {
    this.collisionManager.unregisterEvent( actor, eventName );
  };

  Simulation.prototype.fireCollisionEvents = function( timeInfo, actionList ) {
    this.collisionManager.fireCollisionEvents( timeInfo, actionList );
  };

  Simulation.prototype.enableDebugDraw = function( element ) {
    this._drawCanvas = element;

    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(element.getContext("2d"));
    debugDraw.SetDrawScale( 40 );
    debugDraw.SetFillAlpha(0.5);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    this.world.SetDebugDraw(debugDraw);

    this._draw = debugDraw;
    this._drawForces = [];
  };

  Simulation.prototype.setDebugCameraOnActor = function( actor ) {
    var proxy = this.proxies[ actor.id ];
    if( proxy ) {
      this._debugCameraTargetBody = proxy.body;
    }
  };

  var _forceColor = new b2Color( 0, 1, 0 );
  function _renderForces( debugDraw, forces ) {
    for( var i = 0; i < forces.length; i++ ) {
      forces[ i ].force.Add( forces[ i ].position );
      debugDraw.DrawSegment(
        forces[ i ].position,
        forces[ i ].force,
        _forceColor
      );
    }
  }

  var _renderThrusters = (function() {
    var thrusterColor = new b2Color( 1, 1, 1 );
    var coreThrusterColor = new b2Color( 0, 1, 0 );
    var flameColor = new b2Color( 1, 0.5, 0 );
    var axis = new b2Vec2( 0, 0 );
    var perpendicular = new b2Vec2( 0, 0 );
    var verts = [];
    var position = new b2Vec2( 0, 0 );
    var dir = new b2Vec2( 0, 0 );

    return function ( debugDraw, world ) {
      var body = world.GetBodyList();
      var proxy, worldPos, thruster;

      while( body ) {
        proxy = body.GetUserData();
        var thrusters = proxy && proxy.actor.model && proxy.actor.model.thrusters;
        if( thrusters ) {
          for( var i = 0; i < thrusters.length; i++ ) {
            // draw a triangle to represent the thruster
            thruster = thrusters[ i ];

            if( !thruster.isAttached ) {
              continue;
            }

            position.Set( thruster.localPos[ 0 ], thruster.localPos[ 1 ] );
            dir.Set( thruster.localForce[ 0 ], thruster.localForce[ 1 ] );
            dir.Normalize();
            dir.Multiply( 0.2 );

            verts[ 0 ] = body.GetWorldPoint( position );

            perpendicular.x = dir.y;
            perpendicular.y = -dir.x;
            perpendicular.Multiply( 0.5 );

            verts[ 1 ] = position.Copy();
            verts[ 1 ].Subtract( dir );
            verts[ 1 ].Subtract( perpendicular );
            verts[ 1 ] = body.GetWorldPoint( verts[ 1 ] );

            verts[ 2 ] = position.Copy();
            verts[ 2 ].Subtract( dir );
            verts[ 2 ].Add( perpendicular );
            verts[ 2 ] = body.GetWorldPoint( verts[ 2 ] );

            var color = thruster.isBaseThruster ? coreThrusterColor : thrusterColor;
            debugDraw.DrawSolidPolygon( verts, 3, color );

            if( thruster.coeff ) {
              // draw a "flame"
              position.Subtract( dir );
              verts[ 0 ] = body.GetWorldPoint( position );

              dir.Multiply( thruster.coeff );

              verts[ 1 ] = position.Copy();
              verts[ 1 ].Subtract( dir );
              verts[ 1 ].Subtract( perpendicular );
              verts[ 1 ] = body.GetWorldPoint( verts[ 1 ] );

              verts[ 3 ] = position.Copy();
              verts[ 3 ].Subtract( dir );
              verts[ 3 ].Add( perpendicular );
              verts[ 3 ] = body.GetWorldPoint( verts[ 3 ] );

              dir.Multiply( 4 );

              verts[ 2 ] = position.Copy();
              verts[ 2 ].Subtract( dir );
              verts[ 2 ] = body.GetWorldPoint( verts[ 2 ] );

              debugDraw.DrawSolidPolygon( verts, 4, flameColor );
            }
          }
        }
        body = body.GetNext();
      }
    };
  }());

  return Simulation;
});
