// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/*jshint eqeqeq:false browser:true expr:true*/

/**
 * @fileoverview Implements 2x2 matrices and their related functions which are
 * compatible with WebGL. The API is structured to avoid unnecessary memory
 * allocations.  The last parameter will typically be the output vector and
 * an object can be both an input and output parameter to all methods except
 * where noted. Matrix operations follow the mathematical form when multiplying
 * vectors as follows: resultVec = matrix * vec.
 *
 * The matrices are stored in column-major order.
 *
 */

define(function() {
  var Mat2 = {};


  /**
   * Creates the array representation of a 2x2 matrix of Float32.
   * The use of the array directly instead of a class reduces overhead.
   * The returned matrix is cleared to all zeros.
   *
   * @return {!Float32Array} The new matrix.
   */
  Mat2.createFloat32 = function() {
    return new Float32Array(4);
  };


  /**
   * Creates the array representation of a 2x2 matrix of Float64.
   * The returned matrix is cleared to all zeros.
   *
   * @return {!Float64Array} The new matrix.
   */
  Mat2.createFloat64 = function() {
    return new Float64Array(4);
  };


  /**
   * Creates the array representation of a 2x2 matrix of Number.
   * The returned matrix is cleared to all zeros.
   *
   * @return {!Array.<number>} The new matrix.
   */
  Mat2.createNumber = function() {
    var a = new Array(4);
    Mat2.setFromValues(a,
                       0, 0,
                       0, 0);
    return a;
  };


  /**
   * Creates a 2x2 identity matrix of Float32.
   *
   * @return {!Float32Array} The new 4 element array.
   */
  Mat2.createFloat32Identity = function() {
    var mat = Mat2.createFloat32();
    mat[0] = mat[3] = 1;
    return mat;
  };


  /**
   * Creates a 2x2 identity matrix of Float64.
   *
   * @return {!Float64Array} The new 4 element array.
   */
  Mat2.createFloat64Identity = function() {
    var mat = Mat2.createFloat64();
    mat[0] = mat[3] = 1;
    return mat;
  };


  /**
   * Creates a 2x2 identity matrix of Number.
   * The returned matrix is cleared to all zeros.
   *
   * @return {!Array.<number>} The new 4 element array.
   */
  Mat2.createNumberIdentity = function() {
    var a = new Array(4);
    Mat2.setFromValues(a,
                       1, 0,
                       0, 1);
    return a;
  };


  /**
   * Creates a 2x2 matrix of Float32 initialized from the given array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} matrix The array containing the
   *     matrix values in column major order.
   * @return {!Float32Array} The new, nine element array.
   */
  Mat2.createFloat32FromArray = function(matrix) {
    var newMatrix = Mat2.createFloat32();
    Mat2.setFromArray(newMatrix, matrix);
    return newMatrix;
  };


  /**
   * Creates a 2x2 matrix of Float32 initialized from the given values.
   *
   * @param {number} v00 The values at (0, 0).
   * @param {number} v10 The values at (1, 0).
   * @param {number} v01 The values at (0, 1).
   * @param {number} v11 The values at (1, 1).
   * @return {!Float32Array} The new, nine element array.
   */
  Mat2.createFloat32FromValues = function(
    v00, v10, v01, v11) {
    var newMatrix = Mat2.createFloat32();
    Mat2.setFromValues(
      newMatrix, v00, v10, v01, v11);
    return newMatrix;
  };


  /**
   * Creates a clone of a 2x2 matrix of Float32.
   *
   * @param {Float32Array} matrix The source 2x2 matrix.
   * @return {!Float32Array} The new 2x2 element matrix.
   */
  Mat2.cloneFloat32 = Mat2.createFloat32FromArray;


  /**
   * Creates a 2x2 matrix of Float64 initialized from the given array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} matrix The array containing the
   *     matrix values in column major order.
   * @return {!Float64Array} The new, nine element array.
   */
  Mat2.createFloat64FromArray = function(matrix) {
    var newMatrix = Mat2.createFloat64();
    Mat2.setFromArray(newMatrix, matrix);
    return newMatrix;
  };


  /**
   * Creates a 2x2 matrix of Float64 initialized from the given values.
   *
   * @param {number} v00 The values at (0, 0).
   * @param {number} v10 The values at (1, 0).
   * @param {number} v01 The values at (0, 1).
   * @param {number} v11 The values at (1, 1).
   * @return {!Float64Array} The new, nine element array.
   */
  Mat2.createFloat64FromValues = function(
    v00, v10, v01, v11) {
    var newMatrix = Mat2.createFloat64();
    Mat2.setFromValues(
      newMatrix, v00, v10, v01, v11);
    return newMatrix;
  };


  /**
   * Creates a clone of a 2x2 matrix of Float64.
   *
   * @param {Float64Array} matrix The source 2x2 matrix.
   * @return {!Float64Array} The new 2x2 element matrix.
   */
  Mat2.cloneFloat64 = Mat2.createFloat64FromArray;


  /**
   * Retrieves the element at the requested row and column.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix containing the value to
   *     retrieve.
   * @param {number} row The row index.
   * @param {number} column The column index.
   * @return {number} The element value at the requested row, column indices.
   */
  Mat2.getElement = function(mat, row, column) {
    return mat[row + column * 2];
  };


  /**
   * Sets the element at the requested row and column.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix containing the value to
   *     retrieve.
   * @param {number} row The row index.
   * @param {number} column The column index.
   * @param {number} value The value to set at the requested row, column.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setElement = function(mat, row, column, value) {
    mat[row + column * 2] = value;
    return mat;
  };


  /**
   * Initializes the matrix from the set of values. Note the values supplied are
   * in column major order.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the
   *     values.
   * @param {number} v00 The values at (0, 0).
   * @param {number} v10 The values at (1, 0).
   * @param {number} v01 The values at (0, 1).
   * @param {number} v11 The values at (1, 1).
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setFromValues = function(mat, v00, v10, v01, v11) {
    mat[0] = v00;
    mat[1] = v10;
    mat[2] = v01;
    mat[3] = v11;
    return mat;
  };


  /**
   * Sets the matrix from the array of values stored in column major order.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} values The column major ordered
   *     array of values to store in the matrix.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setFromArray = function(mat, values) {
    mat[0] = values[0];
    mat[1] = values[1];
    mat[2] = values[2];
    mat[3] = values[3];
    return mat;
  };


  /**
   * Sets the matrix from the array of values stored in row major order.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} values The row major ordered array
   *     of values to store in the matrix.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setFromRowMajorArray = function(mat, values) {
    mat[0] = values[0];
    mat[1] = values[2];
    mat[2] = values[1];
    mat[3] = values[3];
    return mat;
  };


  /**
   * Sets the diagonal values of the matrix from the given values.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {number} v00 The values for (0, 0).
   * @param {number} v11 The values for (1, 1).
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setDiagonalValues = function(mat, v00, v11) {
    mat[0] = v00;
    mat[3] = v11;
    return mat;
  };


  /**
   * Sets the diagonal values of the matrix from the given vector.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector containing the values.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setDiagonal = function(mat, vec) {
    mat[0] = vec[0];
    mat[3] = vec[1];
    return mat;
  };


  /**
   * Sets the specified column with the supplied values.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to recieve the values.
   * @param {number} column The column index to set the values on.
   * @param {number} v0 The value for row 0.
   * @param {number} v1 The value for row 1.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setColumnValues = function(mat, column, v0, v1) {
    var i = column * 2;
    mat[i] = v0;
    mat[i + 1] = v1;
    return mat;
  };


  /**
   * Sets the specified column with the value from the supplied array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {number} column The column index to set the values on.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector elements for the column.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setColumn = function(mat, column, vec) {
    var i = column * 2;
    mat[i] = vec[0];
    mat[i + 1] = vec[1];
    return mat;
  };


  /**
   * Retrieves the specified column from the matrix into the given vector
   * array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix supplying the values.
   * @param {number} column The column to get the values from.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector elements to receive the
   *     column.
   * @return {(Float32Array|Float64Array|Array.<number>)} return vec so that operations can be
   *     chained together.
   */
  Mat2.getColumn = function(mat, column, vec) {
    var i = column * 2;
    vec[0] = mat[i];
    vec[1] = mat[i + 1];
    return vec;
  };


  /**
   * Sets the columns of the matrix from the set of vector elements.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The values for column 0.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The values for column 1.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setColumns = function(mat, vec0, vec1) {
    Mat2.setColumn(mat, 0, vec0);
    Mat2.setColumn(mat, 1, vec1);
    return mat;
  };


  /**
   * Retrieves the column values from the given matrix into the given vector
   * elements.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix supplying the columns.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector to receive column 0.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The vector to receive column 1.
   */
  Mat2.getColumns = function(mat, vec0, vec1) {
    Mat2.getColumn(mat, 0, vec0);
    Mat2.getColumn(mat, 1, vec1);
  };


  /**
   * Sets the row values from the supplied values.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {number} row The index of the row to receive the values.
   * @param {number} v0 The value for column 0.
   * @param {number} v1 The value for column 1.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setRowValues = function(mat, row, v0, v1) {
    mat[row] = v0;
    mat[row + 2] = v1;
    return mat;
  };


  /**
   * Sets the row values from the supplied vector.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the row values.
   * @param {number} row The index of the row.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector containing the values.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setRow = function(mat, row, vec) {
    mat[row] = vec[0];
    mat[row + 2] = vec[1];
    return mat;
  };


  /**
   * Retrieves the row values into the given vector.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix supplying the values.
   * @param {number} row The index of the row supplying the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector to receive the row.
   * @return {(Float32Array|Float64Array|Array.<number>)} return vec so that operations can be
   *     chained together.
   */
  Mat2.getRow = function(mat, row, vec) {
    vec[0] = mat[row];
    vec[1] = mat[row + 2];
    return vec;
  };


  /**
   * Sets the rows of the matrix from the supplied vectors.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to receive the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The values for row 0.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The values for row 1.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained together.
   */
  Mat2.setRows = function(mat, vec0, vec1) {
    Mat2.setRow(mat, 0, vec0);
    Mat2.setRow(mat, 1, vec1);
    return mat;
  };


  /**
   * Retrieves the rows of the matrix into the supplied vectors.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to supplying the values.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector to receive row 0.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The vector to receive row 1.
   */
  Mat2.getRows = function(mat, vec0, vec1) {
    Mat2.getRow(mat, 0, vec0);
    Mat2.getRow(mat, 1, vec1);
  };


  /**
   * Makes the given 2x2 matrix the zero matrix.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so operations can be chained.
   */
  Mat2.makeZero = function(mat) {
    mat[0] = 0;
    mat[1] = 0;
    mat[2] = 0;
    mat[3] = 0;
    return mat;
  };


  /**
   * Makes the given 2x2 matrix the identity matrix.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so operations can be chained.
   */
  Mat2.makeIdentity = function(mat) {
    mat[0] = 1;
    mat[1] = 0;
    mat[2] = 0;
    mat[3] = 1;
    return mat;
  };


  /**
   * Performs a per-component addition of the matrices mat0 and mat1, storing
   * the result into resultMat.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat0 The first addend.
   * @param {(Float32Array|Float64Array|Array.<number>)} mat1 The second addend.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to
   *     receive the results (may be either mat0 or mat1).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultMat so that operations can be
   *     chained together.
   */
  Mat2.addMat = function(mat0, mat1, resultMat) {
    resultMat[0] = mat0[0] + mat1[0];
    resultMat[1] = mat0[1] + mat1[1];
    resultMat[2] = mat0[2] + mat1[2];
    resultMat[3] = mat0[3] + mat1[3];
    return resultMat;
  };


  /**
   * Performs a per-component subtraction of the matrices mat0 and mat1,
   * storing the result into resultMat.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat0 The minuend.
   * @param {(Float32Array|Float64Array|Array.<number>)} mat1 The subtrahend.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to receive
   *     the results (may be either mat0 or mat1).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultMat so that operations can be
   *     chained together.
   */
  Mat2.subMat = function(mat0, mat1, resultMat) {
    resultMat[0] = mat0[0] - mat1[0];
    resultMat[1] = mat0[1] - mat1[1];
    resultMat[2] = mat0[2] - mat1[2];
    resultMat[3] = mat0[3] - mat1[3];
    return resultMat;
  };


  /**
   * Multiplies matrix mat0 with the given scalar, storing the result
   * into resultMat.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix.
   * @param {number} scalar The scalar value to multiple to each element of mat.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to receive
   *     the results (may be mat).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultMat so that operations can be
   *     chained together.
   */
  Mat2.multScalar = function(mat, scalar, resultMat) {
    resultMat[0] = mat[0] * scalar;
    resultMat[1] = mat[1] * scalar;
    resultMat[2] = mat[2] * scalar;
    resultMat[3] = mat[3] * scalar;
    return resultMat;
  };


  /**
   * Multiplies the two matrices mat0 and mat1 using matrix multiplication,
   * storing the result into resultMat.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat0 The first (left hand) matrix.
   * @param {(Float32Array|Float64Array|Array.<number>)} mat1 The second (right hand) matrix.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to receive
   *     the results (may be either mat0 or mat1).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultMat so that operations can be
   *     chained together.
   */
  Mat2.multMat = function(mat0, mat1, resultMat) {
    var a00 = mat0[0], a10 = mat0[1];
    var a01 = mat0[2], a11 = mat0[3];

    var b00 = mat1[0], b10 = mat1[1];
    var b01 = mat1[2], b11 = mat1[3];

    resultMat[0] = a00 * b00 + a01 * b10;
    resultMat[1] = a10 * b00 + a11 * b10;
    resultMat[2] = a00 * b01 + a01 * b11;
    resultMat[3] = a10 * b01 + a11 * b11;
    return resultMat;
  };


  /**
   * Transposes the given matrix mat storing the result into resultMat.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix to transpose.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to receive
   *     the results (may be mat).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultMat so that operations can be
   *     chained together.
   */
  Mat2.transpose = function(mat, resultMat) {
    if (resultMat == mat) {
      var a10 = mat[1];
      resultMat[1] = mat[2];
      resultMat[2] = a10;
    } else {
      resultMat[0] = mat[0];
      resultMat[1] = mat[2];
      resultMat[2] = mat[1];
      resultMat[3] = mat[3];
    }
    return resultMat;
  };


  /**
   * Computes the inverse of mat0 storing the result into resultMat. If the
   * inverse is defined, this function returns true, false otherwise.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat0 The matrix to invert.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultMat The matrix to receive
   *     the result (may be mat0).
   * @return {boolean} True if the inverse is defined. If false is returned,
   *     resultMat is not modified.
   */
  Mat2.invert = function(mat0, resultMat) {
    var a00 = mat0[0], a10 = mat0[1];
    var a01 = mat0[2], a11 = mat0[3];

    var det = a00 * a11 - a10 * a01;
    if (det === 0) {
      return false;
    }

    var idet = 1 / det;
    resultMat[0] = a11 * idet;
    resultMat[1] = -a10 * idet;
    resultMat[2] = -a01 * idet;
    resultMat[3] = a00 * idet;
    return true;
  };


  /**
   * Returns true if the components of mat0 are equal to the components of mat1.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat0 The first matrix.
   * @param {(Float32Array|Float64Array|Array.<number>)} mat1 The second matrix.
   * @return {boolean} True if the the two matrices are equivalent.
   */
  Mat2.equals = function(mat0, mat1) {
    return mat0.length == mat1.length &&
      mat0[0] == mat1[0] && mat0[1] == mat1[1] &&
      mat0[2] == mat1[2] && mat0[3] == mat1[3];
  };


  /**
   * Transforms the given vector with the given matrix storing the resulting,
   * transformed matrix into resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix supplying the transformation.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector to transform.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the results (may be vec).
   * @return {(Float32Array|Float64Array|Array.<number>)} return resultVec so that operations can be
   *     chained together.
   */
  Mat2.multVec2 = function(mat, vec, resultVec) {
    var x = vec[0], y = vec[1];
    resultVec[0] = x * mat[0] + y * mat[2];
    resultVec[1] = x * mat[1] + y * mat[3];
    return resultVec;
  };


  /**
   * Makes the given 2x2 matrix a scale matrix with x, y, and z scale factors.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The 2x2 (4-element) matrix
   *     array to receive the new scale matrix.
   * @param {number} x The scale along the x axis.
   * @param {number} y The scale along the y axis.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained.
   */
  Mat2.makeScale = function(mat, x, y) {
    Mat2.makeIdentity(mat);
    return Mat2.setDiagonalValues(mat, x, y);
  };


  /**
   * Makes the given 2x2 matrix a rotation matrix with the given rotation
   * angle about the axis defined by the vector (ax, ay).
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix.
   * @param {number} angle The rotation angle in radians.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained.
   */
  Mat2.makeRotate = function(mat, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);

    return Mat2.setFromValues(mat,
                              c, s,
                              -s, c);
  };


  /**
   * Rotate the given matrix by angle.  Equivalent to:
   * Mat2.multMat(
   *     mat,
   *     Mat2.makeRotate(Mat2.create(), angle),
   *     mat);
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} mat The matrix.
   * @param {number} angle The angle in radians.
   * @return {(Float32Array|Float64Array|Array.<number>)} return mat so that operations can be
   *     chained.
   */
  Mat2.rotate = function(mat, angle) {
    var m00 = mat[0], m10 = mat[1];
    var m01 = mat[2], m11 = mat[3];

    var c = Math.cos(angle);
    var s = Math.sin(angle);

    var r00 = c;
    var r10 = s;
    var r01 = -s;
    var r11 = c;

    return Mat2.setFromValues(
      mat,
      m00 * r00 + m01 * r10,
      m10 * r00 + m11 * r10,
      m00 * r01 + m01 * r11,
      m10 * r01 + m11 * r11);
  };

  return Mat2;
});
