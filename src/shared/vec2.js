// Copyright 2012 The Closure Library Authors. All Rights Reserved.
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

/*jshint eqeqeq:false browser:true*/

/**
 * @fileoverview Definition of 2 element vectors.  This follows the same design
 * patterns as Vec3 and Vec4.
 */

define(function() {
  var Vec2 = {};

  /**
   * Creates a 2 element vector of Float32. The array is initialized to zero.
   *
   * @return {!Float32Array} The new 2 element array.
   */
  Vec2.createFloat32 = function() {
    return new Float32Array(2);
  };


  /**
   * Creates a 2 element vector of Float64. The array is initialized to zero.
   *
   * @return {!Float64Array} The new 2 element array.
   */
  Vec2.createFloat64 = function() {
    return new Float64Array(2);
  };


  /**
   * Creates a 2 element vector of Number. The array is initialized to zero.
   *
   * @return {!Array.<number>} The new 2 element array.
   */
  Vec2.createNumber = function() {
    var a = new Array(2);
    Vec2.setFromValues(a, 0, 0);
    return a;
  };


  /**
   * Creates a new 2 element FLoat32 vector initialized with the value from the
   * given array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The source 2 element array.
   * @return {!Float32Array} The new 2 element array.
   */
  Vec2.createFloat32FromArray = function(vec) {
    var newVec = Vec2.createFloat32();
    Vec2.setFromArray(newVec, vec);
    return newVec;
  };


  /**
   * Creates a new 2 element Float32 vector initialized with the supplied values.
   *
   * @param {number} vec0 The value for element at index 0.
   * @param {number} vec1 The value for element at index 1.
   * @return {!Float32Array} The new vector.
   */
  Vec2.createFloat32FromValues = function(vec0, vec1) {
    var a = Vec2.createFloat32();
    Vec2.setFromValues(a, vec0, vec1);
    return a;
  };


  /**
   * Creates a clone of the given 2 element Float32 vector.
   *
   * @param {Float32Array} vec The source 2 element vector.
   * @return {!Float32Array} The new cloned vector.
   */
  Vec2.cloneFloat32 = Vec2.createFloat32FromArray;


  /**
   * Creates a new 2 element Float64 vector initialized with the value from the
   * given array.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The source 2 element array.
   * @return {!Float64Array} The new 2 element array.
   */
  Vec2.createFloat64FromArray = function(vec) {
    var newVec = Vec2.createFloat64();
    Vec2.setFromArray(newVec, vec);
    return newVec;
  };


  /**
   * Creates a new 2 element Float64 vector initialized with the supplied values.
   *
   * @param {number} vec0 The value for element at index 0.
   * @param {number} vec1 The value for element at index 1.
   * @return {!Float64Array} The new vector.
   */
  Vec2.createFloat64FromValues = function(vec0, vec1) {
    var vec = Vec2.createFloat64();
    Vec2.setFromValues(vec, vec0, vec1);
    return vec;
  };


  /**
   * Creates a clone of the given 2 element vector.
   *
   * @param {Float64Array} vec The source 2 element vector.
   * @return {!Float64Array} The new cloned vector.
   */
  Vec2.cloneFloat64 = Vec2.createFloat64FromArray;


  /**
   * Initializes the vector with the given values.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector to receive the values.
   * @param {number} vec0 The value for element at index 0.
   * @param {number} vec1 The value for element at index 1.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return vec so that operations can be
   *     chained together.
   */
  Vec2.setFromValues = function(vec, vec0, vec1) {
    vec[0] = vec0;
    vec[1] = vec1;
    return vec;
  };


  /**
   * Initializes the vector with the given array of values.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec The vector to receive the
   *     values.
   * @param {(Float32Array|Float64Array|Array.<number>)} values The array of values.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return vec so that operations can be
   *     chained together.
   */
  Vec2.setFromArray = function(vec, values) {
    vec[0] = values[0];
    vec[1] = values[1];
    return vec;
  };


  /**
   * Performs a component-wise addition of vec0 and vec1 together storing the
   * result into resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The first addend.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The second addend.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the result. May be vec0 or vec1.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.add = function(vec0, vec1, resultVec) {
    resultVec[0] = vec0[0] + vec1[0];
    resultVec[1] = vec0[1] + vec1[1];
    return resultVec;
  };


  /**
   * Performs a component-wise subtraction of vec1 from vec0 storing the
   * result into resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The minuend.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The subtrahend.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the result. May be vec0 or vec1.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.subtract = function(vec0, vec1, resultVec) {
    resultVec[0] = vec0[0] - vec1[0];
    resultVec[1] = vec0[1] - vec1[1];
    return resultVec;
  };


  /**
   * Negates vec0, storing the result into resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector to negate.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the result. May be vec0.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.negate = function(vec0, resultVec) {
    resultVec[0] = -vec0[0];
    resultVec[1] = -vec0[1];
    return resultVec;
  };


  /**
   * Multiplies each component of vec0 with scalar storing the product into
   * resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The source vector.
   * @param {number} scalar The value to multiply with each component of vec0.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the result. May be vec0.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.scale = function(vec0, scalar, resultVec) {
    resultVec[0] = vec0[0] * scalar;
    resultVec[1] = vec0[1] * scalar;
    return resultVec;
  };


  /**
   * Returns the magnitudeSquared of the given vector.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector.
   * @return {number} The magnitude of the vector.
   */
  Vec2.magnitudeSquared = function(vec0) {
    var x = vec0[0], y = vec0[1];
    return x * x + y * y;
  };


  /**
   * Returns the magnitude of the given vector.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector.
   * @return {number} The magnitude of the vector.
   */
  Vec2.magnitude = function(vec0) {
    var x = vec0[0], y = vec0[1];
    return Math.sqrt(x * x + y * y);
  };


  /**
   * Normalizes the given vector storing the result into resultVec.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The vector to normalize.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to
   *     receive the result. May be vec0.
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.normalize = function(vec0, resultVec) {
    var ilen = 1 / Vec2.magnitude(vec0);
    resultVec[0] = vec0[0] * ilen;
    resultVec[1] = vec0[1] * ilen;
    return resultVec;
  };


  /**
   * Returns the scalar product of vectors vec0 and vec1.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The first vector.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The second vector.
   * @return {number} The scalar product.
   */
  Vec2.dot = function(vec0, vec1) {
    return vec0[0] * vec1[0] + vec0[1] * vec1[1];
  };


  /**
   * Returns the squared distance between two points.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 First point.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 Second point.
   * @return {number} The squared distance between the points.
   */
  Vec2.distanceSquared = function(vec0, vec1) {
    var x = vec0[0] - vec1[0];
    var y = vec0[1] - vec1[1];
    return x * x + y * y;
  };


  /**
   * Returns the distance between two points.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 First point.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 Second point.
   * @return {number} The distance between the points.
   */
  Vec2.distance = function(vec0, vec1) {
    return Math.sqrt(Vec2.distanceSquared(vec0, vec1));
  };


  /**
   * Returns a unit vector pointing from one point to another.
   * If the input points are equal then the result will be all zeros.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 Origin point.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 Target point.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to receive the
   *     results (may be vec0 or vec1).
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.direction = function(vec0, vec1, resultVec) {
    var x = vec1[0] - vec0[0];
    var y = vec1[1] - vec0[1];
    var d = Math.sqrt(x * x + y * y);
    if (d) {
      d = 1 / d;
      resultVec[0] = x * d;
      resultVec[1] = y * d;
    } else {
      resultVec[0] = resultVec[1] = 0;
    }
    return resultVec;
  };


  /**
   * Linearly interpolate from vec0 to vec1 according to f. The value of f should
   * be in the range [0..1] otherwise the results are undefined.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The first vector.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The second vector.
   * @param {number} f The interpolation factor.
   * @param {(Float32Array|Float64Array|Array.<number>)} resultVec The vector to receive the
   *     results (may be vec0 or vec1).
   * @return {!(Float32Array|Float64Array|Array.<number>)} Return resultVec so that operations can be
   *     chained together.
   */
  Vec2.lerp = function(vec0, vec1, f, resultVec) {
    var x = vec0[0], y = vec0[1];
    resultVec[0] = (vec1[0] - x) * f + x;
    resultVec[1] = (vec1[1] - y) * f + y;
    return resultVec;
  };


  /**
   * Returns true if the components of vec0 are equal to the components of vec1.
   *
   * @param {(Float32Array|Float64Array|Array.<number>)} vec0 The first vector.
   * @param {(Float32Array|Float64Array|Array.<number>)} vec1 The second vector.
   * @return {boolean} True if the vectors are equal, false otherwise.
   */
  Vec2.equals = function(vec0, vec1) {
    return vec0.length == vec1.length &&
      vec0[0] == vec1[0] && vec0[1] == vec1[1];
  };

  return Vec2;
});
