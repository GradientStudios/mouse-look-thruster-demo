define([ 'vendor/underscore', 'Backbone' ], function( _, Backbone ) {
  var Events = Backbone.Events;

  var once = function(name, callback, context) {
    var self = this;
    var once = _.once(function() {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    this.on(name, once, context);
    return this;
  };

  return {
    mixin: function( prototype ) {
      // the preferred pubsub naming scheme for component events
      prototype.subscribe = Events.on;
      prototype.subscribeOnce = once;
      prototype.unsubscribe = Events.off;
      prototype.publish = Events.trigger;

      // we still need to have these because of calls that Backbone
      // may make internally
      prototype.on = Events.on;
      prototype.off = Events.off;
      prototype.trigger = Events.trigger;

      return prototype;
    }
  };
});
