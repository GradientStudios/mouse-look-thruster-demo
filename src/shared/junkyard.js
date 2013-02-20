define(function() {
  var REQUIRED_KEYS = [
    'manifest',
    'assets',
    'gizmos'
  ];

  var Junkyard = function() {
    this.clear();
  };

  Junkyard.prototype.clear = function() {
    this._gizmoDataLookup = {};
  };

  Junkyard.prototype.lookup = function( gizmoIdentifier ) {
    return this._gizmoDataLookup[ gizmoIdentifier ];
  };

  // Check JSON object. Only looks at the top level attributes.
  Junkyard.prototype.checkJSONData = function( data ) {
    var requiredKeys = REQUIRED_KEYS.slice(0);
    var keys = Object.keys( data );
    var extraKeys = keys.filter(function( key ) {
      var keyIndex = requiredKeys.indexOf( key );
      var isRequiredKey = !!~keyIndex;
      if ( isRequiredKey ) {
        requiredKeys.splice( keyIndex, 1 );
      }
      return !isRequiredKey;
    });

    if ( requiredKeys.length ) {
      throw new Error( 'Missing keys from junkyard JSON: ' + requiredKeys.join(', ') );
    }

    if ( extraKeys.length ) {
      throw new Error( 'Unexpected keys in junkyardJSON: ' + extraKeys.join(', ') );
    }
  };

  Junkyard.prototype.loadJSONData = function( data ) {
    var gizmoIdentifiers = Object.keys( data['gizmos'] );
    gizmoIdentifiers.forEach(function( gizmoIdentifier ) {
      var gizmoData = data['gizmos'][ gizmoIdentifier ];
      this._addGizmo( gizmoIdentifier, gizmoData );
    }, this );
    return this;
  };

  Junkyard.prototype._addGizmo = function( identifier, data ) {
    if ( !this._gizmoDataLookup[ identifier ] ) {
      this._gizmoDataLookup[ identifier ] = data;
    }
  };

  return Junkyard;
});
