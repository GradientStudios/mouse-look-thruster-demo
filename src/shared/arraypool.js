define(function() {

  var free = [];

  function allocate() {
    var array = free.pop() || [];
    array._pooled = true;
    array._retainCount = 1;
    return array;
  }

  var size = function() {
    return free.length;
  };

  // Retaining an array adds to the known count of objects that are
  // using it.
  Array.prototype.retain = function() {
    if ( !this._pooled ) {
      throw new Error( 'Calling retain from non-pooled Array' );
    }
    this._retainCount += 1;
  };

  // If the count indicates that no known objects are still using the
  // array, then releasing it will wipe its contents and add it to the
  // collection of free arrays.
  Array.prototype.release = function() {
    if ( !this._pooled ) {
      throw new Error( 'Calling release from non-pooled Array' );
    }

    this._retainCount -= 1;
    if ( this._retainCount <= 0 ) {
      this.length = 0;
      free.push( this );
    }
  };

  // the "singleton" to be exposed
  var ArrayPool = {
    allocate: allocate,
    size: size
  };

  return ArrayPool;
});
