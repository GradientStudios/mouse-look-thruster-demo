define( [ 'CellRect' ], function( CellRect ) {

  // AtomShape is a module for simplifying a number of Atoms occupying
  // grid-aligned cells into a (hopefully) smaller number of
  // rectangular shapes, using the CellRect module. This is useful for
  // reducing the complexity of compound physics shapes generated for
  // vehicles.

  function AtomShape() {
    // cells: binary representation of atoms
    this.cells = [];
    // string representation of cells for comparison
    this.string = '';

    // set of rectangles for respresenting the shape
    // (possibly simplified into fewer rectangles than atoms)
    this.rects = [];
  }

  AtomShape.prototype.setFromModel = function( model ) {
    var GRID_SIZE = model.ATOM_GRID_SIZE;

    var c, i, j;
    this.cells.length = 0;
    for( i = 0; i < model.cells.length; i++ ) {
      this.cells.push( model.cells[ i ] ? model.cells[ i ].hp : 0 );
    }

    // fill holes
    var rows = this.cells;
    var cols = this.cells.slice();

    _fillRows( rows, GRID_SIZE );
    _fillCols( cols, GRID_SIZE );

    for( i = 0; i < this.cells.length; i++ ) {
      this.cells[ i ] = ( rows[ i ] && cols[ i ] ) ? 1 : 0;
    }

    // for easy shape comparison
    var newString = this.cells.join('');

    // we don't want to do the work of rebuilding the rects
    // if the hole-filled shape hasn't changed
    if( this.string !== newString ) {
      this.string = newString;

      // compute the set of CellRects for the shape
      // TODO: recycle CellRect objects to avoid reallocation
      var newRects = CellRect.FillAlgorithms.mergeRows( this.cells, GRID_SIZE );

      this.rects.length = 0;
      for( i = 0; i < newRects.length; i++ ) {
        if( newRects[ i ] ) {
          this.rects.push( newRects[ i ] );
        }
      }
    }

    return this;
  };

  // helper functions for hole filling logic
  function _fillRows( cells, gridSize ) {
    var c, i, j, start, end;

    for( j = 0; j < gridSize; j++ ) {
      // find the first i value for which there is no hole
      c = j * gridSize;
      for( i = 0; (i < gridSize) && !cells[ c ]; i++, c++ ){}

      if( i >= gridSize ) {
        // entire row is empty, to skip
        continue;
      }

      // now find the first i value after that for which there is a hole
      for( ; (i < gridSize) && cells[ c ]; i++, c++ ){}

      if( i >= gridSize ) {
        // no holes so skip this row
        continue;
      }

      start = c;

      c = ( j + 1 ) * gridSize - 1;
      // now find the last i value for which there is no hole
      for( i = gridSize - 1; ( i >= 0 ) && !cells[ c ]; i--, c-- ){}
      // now find the last i value for which there is a hole
      for( ; ( i >= 0 ) && cells[ c ]; i--, c-- ){}

      end = c;

      // now fill the holes between start and end
      for( c = start; c <= end; c++ ) {
        cells[ c ] = 1;
      }
    }
  }

  function _fillCols( cells, gridSize ) {
    var c, i, j, start, end;

    for( i = 0; i < gridSize; i++ ) {
      // find the first j value for which there is no hole
      c = i;
      for( j = 0; (j < gridSize) && !cells[ c ]; j++, c += gridSize ){}

      if( j >= gridSize ) {
        // entire col is empty, to skip
        continue;
      }

      // now find the first j value after that for which there is a hole
      for( ; (j < gridSize) && cells[ c ]; j++, c += gridSize ){}

      if( j >= gridSize ) {
        // no holes so skip this row
        continue;
      }

      start = c;

      c = cells.length - gridSize + i;
      // now find the last j value for which there is no hole
      for( j = gridSize - 1; ( j >= 0 ) && !cells[ c ]; j--, c -= gridSize ){}
      // now find the last i value for which there is a hole
      for( ; ( j >= 0 ) && cells[ c ]; j--, c -= gridSize ){}

      end = c;

      // now fill the holes between start and end
      for( c = start; c <= end; c += gridSize ) {
        cells[ c ] = 1;
      }
    }
  }

  return AtomShape;
});
