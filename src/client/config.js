// requirejs config
require.config({
  deps: [ 'client' ],

  paths: {
    shared: '../shared',
    vendor: '../../vendor',

    // vendor modules
    Box2D: '../../vendor/box2dweb',
    when: '../../vendor/when/when',
    jQuery: '../../vendor/jquery',
    Backbone: '../../vendor/backbone',

    // shared modules
    '2D': '../shared/2d',
    ArrayPool: '../shared/arraypool',
    Atom: '../shared/atom',
    AtomShape: '../shared/atomshape',
    BaseThruster: '../shared/basethruster',
    CellRect: '../shared/cellrect',
    CollisionManager: '../shared/box2dwebcollisionmanager',
    ComponentSystem: '../shared/componentsystem',
    ContactListener: '../shared/box2dwebcontactlistener',
    Core: '../shared/core',
    DamageCalculator: '../shared/damagecalculator',
    Events: '../shared/events',
    Gizmo: '../shared/gizmo',
    InputMap: '../shared/inputmap',
    Junkyard: '../shared/junkyard',
    ListeningCollisionManager: '../shared/box2dweblisteningcollisionmanager',
    Mat2: '../shared/mat2',
    Model: '../shared/model',
    MouseLookThrusterAI: '../shared/mouselookthrusterai',
    Physics: '../shared/physics',
    Simulation: '../shared/box2dwebsimulation',
    Thruster: '../shared/thruster',
    ThrusterAI: '../shared/thrusterai',
    ThrusterAIUtils: '../shared/thrusteraiutils',
    Vec2: '../shared/vec2',
    VehicleController: '../shared/vehiclecontroller',
    VehicleModelBase: '../shared/vehiclemodel',
    VehiclePhysics: '../shared/vehiclephysics',

    // client modules
    InputController: '../client/inputcontroller',
    ScrapModel: '../client/scrapmodel',
    ScrapPhysics: '../client/scrapphysics',
    VehicleModel: '../client/vehiclemodelclient',
    VehicleView: '../client/vehicleview'
  },

  shim: {
    jQuery: {
      exports: 'jQuery'
    },
    'vendor/underscore': {
      exports: '_'
    },
    Backbone: {
      deps: [ 'jQuery', 'vendor/underscore' ],
      exports: 'Backbone'
    }
  }
});
