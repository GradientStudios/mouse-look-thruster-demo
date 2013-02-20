define(function() {
  // Atoms should only be created by the model when it is first being
  // loaded.
  //
  // `data` is from JSON.
  var Atom = function( i, j, gfxID, data ) {
    this.gizmo = null;
    this.gfxID = gfxID;
    this.i = i;
    this.j = j;
    this.w = data.w;
    this.h = data.h;
    this.maxHp = data.hp;
    this.hp = data.hp;
  };

  Atom.prototype.setGizmo = function( gizmo ) {
    if ( this.gizmo ) {
      throw new Error( 'Gizmo is already set' );
    }

    this.gizmo = gizmo;
    return this;
  };

  return Atom;
});
