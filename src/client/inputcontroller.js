/*jshint browser:true*/

define([
  'Events', 'Vec2', 'vendor/underscore'
], function( Events, Vec2, _ ) {
  var START_SUFFIX = ':start';
  var END_SUFFIX = ':end';

  var KEYCODE_ALIAS = [];
  KEYCODE_ALIAS[8]  = 'backspace';
  KEYCODE_ALIAS[9]  = 'tab';
  KEYCODE_ALIAS[13] = 'enter';
  KEYCODE_ALIAS[16] = 'shift';
  KEYCODE_ALIAS[27] = 'escape';
  KEYCODE_ALIAS[32] = 'space';
  KEYCODE_ALIAS[33] = 'pgup';
  KEYCODE_ALIAS[34] = 'pgdn';
  KEYCODE_ALIAS[37] = 'left_arrow';
  KEYCODE_ALIAS[38] = 'up_arrow';
  KEYCODE_ALIAS[39] = 'right_arrow';
  KEYCODE_ALIAS[40] = 'down_arrow';
  KEYCODE_ALIAS[188] = 'comma';
  KEYCODE_ALIAS[190] = 'period';

  // Aliasing for numbers 0-9.
  var i;
  for ( i = 48; i <= 57; ++i ) {
    KEYCODE_ALIAS[i] = String.fromCharCode( i );
  }

  // Aliasing for letters a-z.
  for ( i = 65; i <= 90; ++i ) {
    KEYCODE_ALIAS[i] = String.fromCharCode( i + 97 - 65 );
  }

  var MOUSEBUTTON_ALIAS = [
    'mouse0',
    'mouse1',
    'mouse2'
  ];

  var PREVENTS = {
    'tab': true,
    'space': true,
    'pgup': true,
    'pgdn': true,
    'mouse0': true
  };

  var ControlSet = (function() {
    var GUID = 0;

    var ControlSet = function( name ) {
      this.name = name;
      // This guid is used to prevent cross-talk if the same commands
      // are registered to different ControlSets.
      this.guid = ( GUID++ ) + ':';

      this.defaultSet = {};
      this.actualSet  = {};

      this.ongoingHoldCommands = {};
    };

    ControlSet.prototype.endAllOngoingHoldCommandsFrom = function( eventEmitter ) {
      for ( var command in this.ongoingHoldCommands ) {
        this.endHoldCommand( eventEmitter, command );
      }
    };

    ControlSet.prototype.endHoldCommand = function( eventEmitter, commandName ) {
      if ( this.ongoingHoldCommands[ commandName ] ) {
        eventEmitter.publish( this.guid + commandName + END_SUFFIX );
        this.ongoingHoldCommands[ commandName ] = false;
      }
    };

    ControlSet.prototype.registerCommand = function( options ) {
      var commandName = options.commandName.toLowerCase();
      var defaultKeys = options.defaultKeys;

      for ( var key in this.defaultSet ) {
        if ( this.defaultSet[ key ] === commandName ) {
          throw new Error( 'Command “' + commandName + '” already registered' );
        }
      }

      if ( !Array.isArray(defaultKeys) ) {
        defaultKeys = [ defaultKeys ];
      }

      defaultKeys.forEach(function( defaultKey ) {
        if ( typeof defaultKey !== 'string' ) {
          throw new Error( 'Non-string key given' );
        }

        defaultKey = defaultKey.toLowerCase();

        if ( !~KEYCODE_ALIAS.indexOf( defaultKey ) && !~MOUSEBUTTON_ALIAS.indexOf( defaultKey ) ) {
          throw new Error( 'Unknown key “' + defaultKey + '” given' );
        }

        if ( this.defaultSet[ defaultKey ] ) {
          throw new Error(
            'Default key “' + defaultKey + '”' +
              ' already bound to command “' + this.defaultSet[ defaultKey ] + '”'
          );
        }

        this.defaultSet[ defaultKey ] = commandName;
      }, this );
    };

    ControlSet.prototype.unregisterCommand = function( eventEmitter, commandName ) {
      for ( var key in this.defaultSet ) {
        if ( this.defaultSet[ key ] === commandName ) {
          this.defaultSet[ key ] = undefined;
          this.endHoldCommand( eventEmitter, commandName );
        }
      }
    };

    return ControlSet;
  }());

  var InputController = function( gameplayElement, canvasElement ) {
    this.gameplayElement = gameplayElement;
    this.canvasElement = canvasElement;
    this.currentMouseHandlerElem = null;

    this.mouseCanvasPosition = Vec2.createFloat64FromValues(
      this.canvasElement.width / 2, this.canvasElement.height / 2
    );
    this.mouseHeading = 0;
    this.mouseMap = {
      'mouse0': false,
      'mouse1': false,
      'mouse2': false
    };

    this.controlSets = [];
    this._actualKeybinds = {};

    this._keydown   = this.keydown.bind( this );
    this._keyup     = this.keyup.bind( this );
    this._mousedown = this.mousedown.bind( this );
    this._mouseup   = this.mouseup.bind( this );
    this._mousemove = this.mousemove.bind( this );

    document.addEventListener( 'keydown', this._keydown );
    document.addEventListener( 'keyup',   this._keyup   );

    // Prevent right clicks on the gameplay area from coming up, since
    // we use that for secondary weapons by default.
    this.gameplayElement.addEventListener( 'contextmenu', function( event ) {
      event.preventDefault();
      event.stopPropagation();
    });
  };

  Events.mixin( InputController.prototype );

  InputController.START_SUFFIX = InputController.prototype.START_SUFFIX = START_SUFFIX;
  InputController.END_SUFFIX = InputController.prototype.END_SUFFIX = END_SUFFIX;

  // Returns a duck-typed Object that allows for registration of
  // commands to the specific control set.
  InputController.prototype.pushControlSet = function( name ) {
    var controlSet = this.controlSets[0];
    if ( controlSet ) {
      controlSet.endAllOngoingHoldCommandsFrom( this );
    }

    if ( !name ) { name = ''; }
    var newControlSet = new ControlSet( name );
    this.controlSets.unshift( newControlSet );
    this._updateActualKeybinds();

    return {
      registerHoldCommand: this.__registerHoldCommand.bind( this, newControlSet ),
      registerInstantCommand: this.__registerInstantCommand.bind( this, newControlSet ),
      unregisterCommand: function() {
        var commands = Array.prototype.slice.call( arguments, 0 );
        this.__unregisterCommand( newControlSet, commands );
      }.bind( this )
    };
  };

  InputController.prototype.popControlSet = function() {
    var controlSet = this.controlSets.shift();

    if ( controlSet ) {
      controlSet.endAllOngoingHoldCommandsFrom( this );
    }

    this._updateActualKeybinds();
  };

  InputController.prototype._updateActualKeybinds = function() {
    var controlSet = this.controlSets[0];
    if ( controlSet ) {
      this._actualKeybinds = _.defaults(
        {},
        controlSet.actualSet,
        controlSet.defaultSet
      );
    } else {
      this._actualKeybinds = {};
    }
  };

  InputController.prototype.setKeybinds = function( _keybinds ) {
    var keybinds = {};
    var keys = Object.keys( _keybinds || {} );
    keys.forEach(function( key ) {
      var lowercaseKey = key.toLowerCase();
      if ( typeof _keybinds[ key ] !== 'string' ) { return; }

      keybinds[ lowercaseKey ] = _keybinds[ key ].toLowerCase();
    });

    this.controlSets[0].actualSet = keybinds;
    this._updateActualKeybinds();
  };

  // A hold command is one that is held for a duration. The
  // InputController will announce events for the start and end of the
  // keybind.
  InputController.prototype.registerHoldCommand = function( options, startFn, endFn, context ) {
    this.__registerHoldCommand( this.controlSets[0], options, startFn, endFn, context );
  };

  InputController.prototype.__registerHoldCommand = function( controlSet, options, startFn, endFn, context ) {
    controlSet.registerCommand( options );

    var guid = controlSet.guid;
    var commandName = options.commandName.toLowerCase();
    this.subscribeOnOff( guid + commandName, startFn, endFn, context );

    if ( controlSet === this.controlSets[0] ) {
      this._updateActualKeybinds();
    }
  };

  // An instant command is one that is excuted immediately upon key
  // down or mouse down. InputController will trigger the start event
  // of the equivalent hold command before triggering the instant form
  // of the command.
  InputController.prototype.registerInstantCommand = function( options, fn, context ) {
    this.__registerInstantCommand( this.controlSets[0], options, fn, context );
  };

  InputController.prototype.__registerInstantCommand = function( controlSet, options, fn, context ) {
    controlSet.registerCommand( options );

    var guid = controlSet.guid;
    var commandName = options.commandName.toLowerCase();
    this.subscribe( guid + commandName, fn, context );

    if ( controlSet === this.controlSets[0] ) {
      this._updateActualKeybinds();
    }
  };

  InputController.prototype.unregisterCommand = function() {
    var commands = Array.prototype.slice.call( arguments, 0 );
    this.__unregisterCommand( this.controlSets[0], commands );
  };

  InputController.prototype.__unregisterCommand = function( controlSet, commands ) {
    var guid = controlSet.guid;

    commands.forEach(function( commandName ) {
      commandName = commandName.toLowerCase();
      controlSet.unregisterCommand( this, commandName );

      this.unsubscribe( guid + commandName );
      this.unsubscribe( guid + commandName + START_SUFFIX );
      this.unsubscribe( guid + commandName + END_SUFFIX );
    }, this );

    if ( controlSet === this.controlSets[0] ) {
      this._updateActualKeybinds();
    }
  };

  InputController.prototype.subscribeOnOff = function( commandName, startFn, endFn, context ) {
    this.subscribe( commandName + START_SUFFIX, startFn, context );
    this.subscribe( commandName + END_SUFFIX, endFn, context );
  };

  var inputHandlerGenerator = (function() {
    var aliasMapLookup = {
      'keyCode': KEYCODE_ALIAS,
      'button': MOUSEBUTTON_ALIAS
    };

    return function( codePropertyName, eventSuffix, hook ) {
      if ( !(codePropertyName in aliasMapLookup) ) {
        throw new Error( 'Unexpected codePropertyName ' + codePropertyName );
      }

      if ( !hook ) {
        hook = function() {};
      }

      var ALIAS_MAP = aliasMapLookup[ codePropertyName ];

      return function( event ) {
        if ( event.ctrlKey || event.metaKey ) { return; }

        var code = event[ codePropertyName ];
        var alias = ALIAS_MAP[ code ];
        if ( !alias ) { return; }

        var command = this._actualKeybinds[ alias ];
        if ( !command ) { return; }

        hook.call( this, event, alias, command );

        var controlSet = this.controlSets[0];
        var commandWithGUID = controlSet.guid + command;
        this.publish( commandWithGUID + eventSuffix );
        if ( eventSuffix === START_SUFFIX ) {
          this.publish( commandWithGUID );
          controlSet.ongoingHoldCommands[ command ] = true;
        } else if ( eventSuffix === END_SUFFIX ) {
          controlSet.ongoingHoldCommands[ command ] = false;
        }

        if ( PREVENTS[alias] ) {
          event.preventDefault();
        }

        event.stopPropagation();
      };
    };
  }());

  InputController.prototype.keydown   = inputHandlerGenerator( 'keyCode', START_SUFFIX );
  InputController.prototype.keyup     = inputHandlerGenerator( 'keyCode', END_SUFFIX   );
  InputController.prototype.mousedown = inputHandlerGenerator( 'button',  START_SUFFIX );
  InputController.prototype.mouseup   = inputHandlerGenerator( 'button',  END_SUFFIX   );

  InputController.prototype.moveMouseHandlers = function( elem ) {
    if ( this.currentMouseHandlerElem === elem ) {
      return;
    }

    if ( this.currentMouseHandlerElem ) {
      this.currentMouseHandlerElem.removeEventListener( 'mousemove', this._mousemove );
      this.currentMouseHandlerElem.removeEventListener( 'mouseup',   this._mouseup   );
      this.currentMouseHandlerElem.removeEventListener( 'mousedown', this._mousedown );
    }

    this.currentMouseHandlerElem = elem;

    if ( this.currentMouseHandlerElem ) {
      this.currentMouseHandlerElem.addEventListener( 'mousedown', this._mousedown );
      this.currentMouseHandlerElem.addEventListener( 'mouseup',   this._mouseup   );
      this.currentMouseHandlerElem.addEventListener( 'mousemove', this._mousemove );
    }
  };

  InputController.prototype.mousemove = (function() {
    var tmp = Vec2.createFloat64();

    return function( event ) {
      // Calculate cumulative offset.
      var offsetLeft = 0, offsetTop = 0;
      var el = this.canvasElement;
      do {
        offsetLeft += el.offsetLeft;
        offsetTop  += el.offsetTop;
        el = el.offsetParent;
      } while ( el );

      var devicePixelRatio = window.devicePixelRatio || 1;
      Vec2.setFromValues(
        this.mouseCanvasPosition,
        ( event.pageX - offsetLeft ) * devicePixelRatio,
        ( event.pageY - offsetTop  ) * devicePixelRatio
      );

      var targetVectorFromCenter = Vec2.setFromValues(
        tmp,
        this.mouseCanvasPosition[0] - this.canvasElement.width / 2,
        this.mouseCanvasPosition[1] - this.canvasElement.height / 2
      );

      this.publish( 'mouse-move-hudspace', tmp );

      this.mouseHeading = Math.atan2( targetVectorFromCenter[1], targetVectorFromCenter[0] );
    };
  }());

  InputController.prototype.getMouseHeading = function() {
    return this.mouseHeading;
  };

  var RAD2DEG = 180 / Math.PI;
  InputController.prototype.getMouseHeadingDegrees = function() {
    return this.mouseHeading * RAD2DEG;
  };

  InputController.prototype.getMouseHeadingDegreesShort = function() {
    return Math.round( this.mouseHeading * RAD2DEG );
  };

  return InputController;
});
