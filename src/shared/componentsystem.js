// // Example:
// var $ = require( './componentsystem' );
//
// $.c( '2D', {
//   __propertyName__: 'transform',
//
//   x: 0,
//   y: 0,
//   rotation: 0,
//
//   getPosition: function() {
//     return [ this.x, this.y ];
//   }
// });
//
// var obj = $.e( '2D' );
// console.log( obj.transform.getPosition() );
// console.log( obj.transform.entity === obj );

define([ 'Events' ], function( Events ) {
  var components = {};

  var extend = function( sub, base ) {
    // We create a dummy constructor to bypass any of the base constructor's
    // side effects.
    function Dummy() {}
    Dummy.prototype = base.prototype;

    // Set up the prototype chain.
    sub.prototype = new Dummy();

    // Set up some convenience references.
    sub._super = base;
    sub.prototype._super = base.prototype;
    sub.prototype.constructor = sub;

    return sub;
  };

  var reList = /\s*,\s*/;
  var push = [].push;
  var newComponents = [];

  var Entity = function() {
    this.__components__ = [];
  };

  Entity.prototype.addComponent = function( componentString ) {
    // An array of strings that contain the components to be added.
    var comps;

    // Multiple components.
    if ( arguments.length > 1 ) {
      comps = arguments;
    } else if ( componentString.indexOf( ',' ) !== -1 ) {
      comps = componentString.split( reList );
    } else {
      comps = [ componentString ];
    }

    var i;
    newComponents.length = 0;
    var numComponents = comps.length;
    for ( i = 0; i < numComponents; ++i ) {
      // The identifier for the component, e.g. 'Physics' or '3D'.
      var componentId = comps[i];

      if ( componentId === '' ) { continue; }

      var MyComponent = components[ componentId ];

      if ( !MyComponent ) { throw new Error( 'Component "' + componentId + '" not found' ); }

      var newComponent = new MyComponent();

      // The property name on the entity with which the component is attached
      // to, e.g. `physics` or `renderer`. Other components would then be able
      // to access the component via `this.entity.renderer` and similar.
      var componentName = newComponent.__propertyName__;
      var componentPath = this[ componentName ];
      var allowMultiple = newComponent.__allowMultiple__;
      var added = true;

      if ( allowMultiple ) {
        if ( !componentPath ) {
          this[ componentName ] = [ newComponent ];
        } else {
          this[ componentName ].push( newComponent );
        }
      }

      // There can only be one. Of these components.
      else {
        if ( !componentPath ) {
          this[ componentName ] = newComponent;
        } else {
          // This component should not be added.
          added = false;
        }
      }

      if ( added ) {
        newComponent.entity = this;

        if ( newComponent.init ) {
          newComponent.init();
        }

        newComponents.push( newComponent );
      }
    }

    numComponents = newComponents.length;
    for ( i = 0; i < numComponents; ++i ) {
      var component = newComponents[i];
      if ( component.start ) {
        component.start();
      }
    }

    push.apply( this.__components__, newComponents );
  };

  // call `enable` on all components
  Entity.prototype.enable = function() {
    for ( var i = 0; i < this.__components__.length; ++i ) {
      this.__components__[i].enable();
    }
  };

  // call `disable` on all components
  Entity.prototype.disable = function() {
    for ( var i = 0; i < this.__components__.length; ++i ) {
      this.__components__[i].disable();
    }
  };

  // iterate through components and call dispose
  Entity.prototype.dispose = function() {
    for ( var i = 0; i < this.__components__.length; ++i ) {
      if( !this.__components__[i].isDisposed ) {
        this.__components__[i].dispose();
        this.__components__[i].isDisposed = true;
      }
    }
  };

  var Component = function Component( entity ) {
    this.entity = entity;
    this.isDisposed = false;
  };

  Component.prototype.__propertyName__ = null;
  Component.prototype.__allowMultiple__ = false;

  Component.prototype.init = null;
  Component.prototype.start = null;

  // note: we might consider adding an `isEnabled` state that
  // gets set appropriately by these functions
  Component.prototype.enable = function() {};
  Component.prototype.disable = function() {};

  // cleanup the component under the assumption that it will
  // no longer be used
  Component.prototype.dispose = function() {};

  var EmitterComponent = function EmitterComponent( entity ) {
    Component.call( this, entity );
  };

  EmitterComponent.prototype = Object.create( Component.prototype );
  Events.mixin( EmitterComponent.prototype );

  var registerComponent = function( name, component ) {
    if ( components[name] != null ) {
      // console.warn( 'Ignoring duplicate component' );
      return;
    }

    if ( typeof component === 'object' ) {
      var componentProto = component;
      component = function() {};
      extend( component, Component );
      for ( var prop in componentProto ) {
        component.prototype[ prop ] = componentProto[ prop ];
      }
    }

    if ( !(component.prototype instanceof Component) ) {
      throw new Error( 'Invalid argument: expected Component subclass' );
    }

    if ( typeof component.prototype.__propertyName__ !== 'string' ) {
      throw new Error( 'Component lacks __propertyName__ property' );
    }

    components[ name ] = component;
  };

  var createEntity = function() {
    var entity = new Entity();
    if ( arguments.length > 0 ) {
      entity.addComponent.apply( entity,  arguments );
    }
    return entity;
  };

  return {
    components: components,
    Component: Component,
    EmitterComponent: EmitterComponent,
    Entity: Entity,
    extend: extend,
    registerComponent: registerComponent,
    createEntity: createEntity,
    c: registerComponent,
    e: createEntity
  };
});
