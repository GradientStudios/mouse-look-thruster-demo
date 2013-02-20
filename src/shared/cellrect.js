define( function() {

  function CellRect( l, t, w, h ) {
    this.left = l;
    this.top = t;
    this.width = w;
    this.height = h;
  }

  // right and bottom aren't stored, but computed
  CellRect.prototype.getRight = function() {
    return this.left + this.width - 1;
  };
  CellRect.prototype.getBottom = function() {
    return this.top + this.height - 1;
  };

  // for consistency with getRight() and getBottom()
  CellRect.prototype.getLeft = function() {
    return this.left;
  };
  CellRect.prototype.getTop = function() {
    return this.top;
  };
  CellRect.prototype.getWidth = function() {
    return this.width;
  };
  CellRect.prototype.getHeight = function() {
    return this.height;
  };

  CellRect.prototype.setFromRect = function( other ) {
    this.left = other.left;
    this.top = other.top;
    this.width = other.width;
    this.height = other.height;
    return this;
  };

  CellRect.prototype.setLTWH = function( l, t, w, h ) {
    this.left = l;
    this.top = t;
    this.width = w;
    this.height = h;
    return this;
  };

  CellRect.prototype.setLRTB = function( l, r, t, b ) {
    this.left = l;
    this.top = t;
    this.width = r - l + 1;
    this.height = b - t + 1;
    return this;
  };

  CellRect.prototype.combine = function( other, dest ) {
    return ( dest || new CellRect() ).setLRTB(
      Math.min( this.left, other.left ),
      Math.max( this.getRight(), other.getRight() ),
      Math.min( this.top, other.top ),
      Math.max( this.getBottom(), other.getBottom() )
    );
  };

  CellRect.prototype.clip = function( other, dest ) {
    return ( dest || new CellRect() ).setLRTB(
      Math.max( this.left, other.left ),
      Math.min( this.getRight(), other.getRight() ),
      Math.max( this.top, other.top ),
      Math.min( this.getBottom(), other.getBottom() )
    );
  };

  CellRect.prototype.getArea = function() {
    return this.width * this.height;
  };


  // Collection of algorithms for simplifying a collection of cells
  // into a smaller number of CellRects.
  CellRect.FillAlgorithms = {};

  CellRect.FillAlgorithms.basic = function( cells, gridSize ) {
    var rects = new Array( cells.length );
    var r, c, a;
    for( a = 0, r = 0; r < gridSize; r++ ) {
      for( c = 0; c < gridSize; c++, a++ ){
        if( cells[ a ] ) {
          rects[ a ] = new CellRect( c, r, 1, 1 );
        }
      }
    }

    return rects;
  };

  CellRect.FillAlgorithms.mergeRows = function( cells, gridSize ) {
    var rects = new Array( cells.length );
    // first scan each row
    var r, c, a, rect;
    for( a = 0, r = 0; r < gridSize; r++ ) {
      rect = null;
      for( c = 0; c < gridSize; c++, a++ ){
        if( cells[ a ] ) {
          if( rect ) {
            rect.width++;
          } else {
            rect = new CellRect( c, r, 1, 1 );
            rects[ a ] = rect;
          }
        } else {
          rect = null;
        }
      }
    }

    // now combine
    var b;
    for( r = gridSize - 2; r >= 0; r-- ) {
      a = r * gridSize;
      b = a + gridSize;
      for( c = 0; c < gridSize; c++, a++, b++ ) {
        if( rects[ a ] && rects[ b ] && rects[ a ].width === rects[ b ].width ) {
          // merge
          rects[ a ].height += rects[ b ].height;
          delete rects[ b ];
        }
      }
    }

    return rects;
  };

  return CellRect;
});
