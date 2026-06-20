(function () {
  "use strict";

  const G = 9.8;
  const colors = {
    gold: "#d4af37",
    goldSoft: "#f0cf68",
    teal: "#2dd4bf",
    sky: "#38bdf8",
    orange: "#f59e0b",
    rose: "#fb7185",
    green: "#34d399",
    violet: "#a78bfa",
    white: "#ffffff",
    dim: "#9fb2d8"
  };

  const commonMoves = {
    suvat: [
      "List s, u, v, a, t before choosing an equation.",
      "Use signs consistently: choose a positive direction first.",
      "Only use constant-acceleration formulae when acceleration is constant."
    ],
    vectors: [
      "Resolve into i and j components first.",
      "Add horizontal components separately from vertical components.",
      "Convert back to magnitude and direction only at the end."
    ],
    forces: [
      "Draw every force before writing equations.",
      "Resolve horizontally and vertically, then set the resultant rule.",
      "For equilibrium, the resultant force is zero."
    ]
  };

  const TOPICS = [
    {
      id: "modelling",
      label: "01 Modelling",
      title: "Quantities, Units and Modelling",
      subtitle: "Change the assumptions and watch the mathematical model change.",
      cases: [
        caseDef("scalar-vector", "Scalar or vector quantity?", "units", "Classify speed, velocity, force, weight, distance and displacement before choosing signs or components.", ["scalar", "vector"], {
          quantity: 1, scale: 4
        }, [
          "Scalars have size only.",
          "Vectors have size and direction.",
          "Displacement, velocity, acceleration, force and weight are vectors."
        ], [
          "Ask whether direction changes the meaning.",
          "Use signs/components only for vector quantities.",
          "Do not call speed negative; velocity may be negative."
        ]),
        caseDef("ideal-projectile", "Ideal projectile model", "projectile", "Air resistance is ignored, so the path is a parabola and horizontal speed stays constant.", ["particle", "constant g"], {
          u: 26, angle: 38, height: 0, drag: 0
        }, [
          "Horizontal: <b>x = u cos(&theta;) t</b>",
          "Vertical: <b>y = h + u sin(&theta;) t - 1/2 gt<sup>2</sup></b>",
          "Model assumptions: particle, no air resistance, constant gravity."
        ], commonMoves.suvat),
        caseDef("air-resistance", "Air resistance bends the model", "projectile", "The same launch is compared with a drag model, making the real path lower and shorter.", ["non-ideal", "comparison"], {
          u: 30, angle: 42, height: 0, drag: 0.06
        }, [
          "Ideal path is a parabola; drag makes acceleration depend on velocity.",
          "Horizontal speed is no longer constant when resistance is included.",
          "Use this to decide whether a simplified model is reasonable."
        ], [
          "State the ideal assumptions clearly.",
          "Compare prediction with the realistic effect.",
          "Explain whether the model overestimates or underestimates."
        ]),
        caseDef("particle-rigid", "Particle or rigid body?", "modelling", "A particle model ignores size and rotation; a rigid body model keeps where the force acts.", ["particle", "rigid body"], {
          force: 24, angle: 0, offset: 1.4
        }, [
          "Particle model: only resultant force matters.",
          "Rigid body model: position of the force also creates a moment.",
          "Moment = force &times; perpendicular distance."
        ], [
          "Ask whether size/rotation matters.",
          "Use particle model for translation only.",
          "Use rigid body model when pivots, beams or tipping appear."
        ]),
        caseDef("smooth-rough", "Smooth vs rough contact", "incline", "Switch from a smooth model to a rough model and see friction oppose the likely motion.", ["friction", "reaction"], {
          theta: 18, mass: 5, mu: 0.32, push: 0
        }, [
          "Smooth contact: friction = 0.",
          "Rough contact: friction can act up to <b>&mu;R</b>.",
          "Normal reaction on a slope: <b>R = mg cos(&theta;)</b>."
        ], [
          "Decide the likely direction of motion.",
          "Put friction opposite that direction.",
          "Check if limiting friction is large enough to hold."
        ]),
        caseDef("light-string", "Light inextensible string", "dynamics", "The string transmits the same tension and both connected bodies share the same acceleration magnitude.", ["tension", "pulley"], {
          m1: 5, m2: 3, mu: 0.15, force: 0
        }, [
          "Light string: no mass, so tension is the same throughout.",
          "Inextensible string: connected particles share acceleration magnitude.",
          "Smooth pulley: no extra frictional loss."
        ], [
          "Use one acceleration for the connected bodies.",
          "Use the same tension in both equations.",
          "Add equations to eliminate internal tension."
        ]),
        caseDef("smooth-pulley", "Light smooth pulley", "dynamics", "A smooth pulley changes the direction of the string without changing the tension.", ["pulley", "same tension"], {
          mode: "atwood", m1: 6, m2: 4, mu: 0, force: 60, resistance: 0, duration: 6
        }, [
          "Same light string means the same tension on both sides.",
          "Smooth pulley means no frictional loss at the pulley.",
          "Connected particles share acceleration magnitude."
        ], [
          "Choose motion direction before writing equations.",
          "Use the same T in both particle equations.",
          "Add equations when you want to eliminate T."
        ]),
        caseDef("rod-beam", "Rod, beam, light rod and uniform rod", "modelling", "A rod/beam keeps length and rotation, while a light rod has no weight and a uniform rod has weight at its midpoint.", ["rod", "beam"], {
          force: 28, angle: 0, offset: 1.8
        }, [
          "Light rod: weight is ignored.",
          "Uniform rod: weight acts at the midpoint.",
          "Non-uniform rod: centre of mass must be found or given."
        ], [
          "Use a particle only if rotation is irrelevant.",
          "Use a rod/beam model when moments are possible.",
          "Mark centre of mass before taking moments."
        ]),
        caseDef("units", "Units and dimensions check", "units", "A quick unit-lab for distinguishing scalar/vector quantities and checking formula consistency.", ["units", "vectors"], {
          quantity: 1, scale: 4
        }, [
          "Force unit: <b>N = kg m s<sup>-2</sup></b>.",
          "Momentum unit: <b>kg m s<sup>-1</sup></b>.",
          "Impulse unit: <b>N s</b>, same as momentum."
        ], [
          "Check base units when a formula looks unfamiliar.",
          "Keep scalar quantities separate from vector quantities.",
          "A valid equation must have matching units on both sides."
        ])
      ]
    },
    {
      id: "vectors",
      label: "02 Vectors",
      title: "Working with Vectors",
      subtitle: "Add, resolve, measure and balance vectors using the i-j plane.",
      cases: [
        vectorCase("vector-add", "Vector addition and subtraction", "Build a + b, a - b, and the resultant triangle.", "add", ["components", "resultant"]),
        vectorCase("several-resultant", "Resultant of several vectors", "Add several displacement or force steps into one final resultant.", "add", ["multi-step"], { ax: 6, ay: -2, bx: -4, by: 7 }),
        vectorCase("magnitude-direction", "Magnitude and direction", "Convert a component vector into length and angle.", "direction", ["magnitude", "angle"]),
        vectorCase("bearings", "Bearings and resolving", "Resolve a force or journey from bearing notation into i and j components.", "bearing", ["bearing", "resolve"], { ax: 5, ay: 8, bx: -3, by: 2, bearing: 42 }),
        vectorCase("relative-position", "Relative position and velocity", "See AB = b - a and relative motion as a moving vector.", "relative", ["position vector"], { ax: -5, ay: 2, bx: 7, by: 6 }),
        vectorCase("relative-velocity", "Relative velocity", "Subtract velocity vectors to see how one object moves as viewed from another.", "relative", ["relative motion"], { ax: 10, ay: -3, bx: 2, by: 2 }),
        vectorCase("equilibrant", "Equilibrium and the equilibrant", "Find the missing force that closes the force polygon.", "equilibrium", ["equilibrium", "force polygon"], { ax: 6, ay: 2, bx: -2, by: 7 }),
        vectorCase("force-vector-resultant", "Forces in i-j notation", "Treat force vectors exactly like displacement vectors, then read the resultant force.", "add", ["force vectors"], { ax: 14, ay: 3, bx: -12, by: 7 }),
        vectorCase("position-path", "Position vector pathway", "Move from one point to another using a chain of vector steps.", "relative", ["path"], { ax: -7, ay: 5, bx: 4, by: -3 }),
        vectorCase("parallel", "Parallel vectors condition", "Change components until one vector is a scalar multiple of another.", "parallel", ["parallel", "ratio"], { ax: 4, ay: 6, bx: 2, by: 3 }),
        vectorCase("zero-vector", "Zero vector and opposite vectors", "Add a vector to its negative and watch the resultant collapse to zero.", "equilibrium", ["zero vector"], { ax: 5, ay: -4, bx: -5, by: 4 })
      ]
    },
    {
      id: "graphs",
      label: "03 Graphs",
      title: "Kinematics Graphs",
      subtitle: "Read motion from gradient, area and graph shape.",
      cases: [
        graphCase("displacement-time", "Displacement-time graph", "Gradient of displacement-time gives velocity.", "disp", ["s-t graph"]),
        graphCase("gradient-area", "Gradient vs area hierarchy", "The golden rule: gradient gives rate, area gives accumulated quantity.", "acb", ["gradient", "area"]),
        graphCase("constant-velocity", "Constant velocity", "A flat velocity-time graph gives constant speed and rectangular area.", "const", ["rectangle area"]),
        graphCase("accelerate-cruise-brake", "Accelerate, cruise, brake", "The standard exam journey: triangle + rectangle + triangle.", "acb", ["piecewise motion"]),
        graphCase("speed-vs-velocity", "Speed-time vs velocity-time", "Speed is never negative; velocity can be negative.", "speed", ["speed"]),
        graphCase("reverse-motion", "Forward then reverse", "Negative velocity means motion in the opposite direction.", "reverse", ["distance vs displacement"]),
        graphCase("acceleration-time", "Acceleration-time sketch", "Area under an acceleration-time graph changes velocity.", "accel", ["a-t graph"]),
        graphCase("graph-sketching", "Sketch one motion graph from another", "Use gradient and area to move between displacement, velocity and acceleration graphs.", "sketch", ["sketch"]),
        graphCase("displacement-distance", "Displacement vs distance", "Areas below the time axis subtract from displacement but add to distance.", "reverse", ["signed area"])
      ]
    },
    {
      id: "suvat1d",
      label: "04 SUVAT 1D",
      title: "Constant Acceleration in 1D",
      subtitle: "Choose signs, choose the equation, and watch the motion.",
      cases: [
        suvat1("from-rest", "Starting from rest", "u = 0, so distance grows with t squared.", { u: 0, a: 2, duration: 6 }, ["from rest"]),
        suvat1("braking", "Braking and deceleration", "Acceleration is opposite to velocity, so the object slows to rest.", { u: 22, a: -4, duration: 5.5 }, ["deceleration"]),
        suvat1("vertical-up", "Thrown vertically upwards", "Positive upward first; gravity is negative.", { u: 18, a: -9.8, duration: 3.7 }, ["gravity"]),
        suvat1("dropped", "Dropped or thrown down", "Choose downward positive or upward positive, then stay consistent.", { u: -3, a: -9.8, duration: 3 }, ["sign convention"]),
        suvat1("from-height", "Dropped or thrown from a height", "If the particle starts h metres above ground, ground level is a negative displacement when upward is positive.", { u: 4, a: -9.8, height: 18, duration: 3.2 }, ["height"]),
        suvat1("return-ground", "Return to ground", "When a particle starts and finishes at ground level, use s = 0 for the return time.", { u: 20, a: -9.8, height: 0, duration: 4.2 }, ["s = 0"]),
        suvat1("multi-stage", "Multi-stage journey", "Break motion when acceleration changes, then link final velocity to the next stage.", { u: 8, a: 1.8, duration: 5 }, ["stages"]),
        suvat1("meeting", "Meeting and overtaking", "Compare two position-time traces and find where their displacements match.", { u: 4, a: 1.2, duration: 7 }, ["two particles"]),
        suvat1("equation-choice", "Equation choice from known variables", "Pick the SUVAT equation that avoids the missing quantity.", { u: 10, a: 2, duration: 6 }, ["equation picker"])
      ]
    },
    {
      id: "suvat2d",
      label: "05 SUVAT 2D",
      title: "Constant Acceleration in 2D",
      subtitle: "Run SUVAT as vector equations and split into components when needed.",
      cases: [
        suvat2("vector-suvat", "Vector SUVAT", "s, u, v and a are vectors; time stays scalar.", { ux: 3, uy: 4, ax: 1, ay: -2, height: 0, duration: 5 }, ["vector equation"]),
        suvat2("split-components", "Split into i and j components", "The safest method is to write one scalar SUVAT equation for i and one for j.", { ux: 8, uy: -2, ax: -1, ay: 3, height: 5, duration: 5 }, ["components"]),
        suvat2("projectile-level", "Projectile from level ground", "Horizontal motion is constant; vertical motion uses gravity.", { ux: 20, uy: 16, ax: 0, ay: -9.8, height: 0, duration: 3.5 }, ["projectile"]),
        suvat2("projectile-height", "Projectile from a height", "Initial position matters: y starts above ground.", { ux: 15, uy: 8, ax: 0, ay: -9.8, height: 18, duration: 3.2 }, ["position vector"]),
        suvat2("constant-velocity-2d", "Constant velocity in 2D", "When a = 0, the velocity vector is constant and the path is a straight line.", { ux: 8, uy: 5, ax: 0, ay: 0, height: 2, duration: 6 }, ["a = 0"]),
        suvat2("parallel-i", "Velocity parallel to i", "Velocity is parallel to i when its j-component is zero.", { ux: 8, uy: 20, ax: 0, ay: -9.8, height: 0, duration: 4.1 }, ["vy = 0"]),
        suvat2("parallel-j", "Velocity parallel to j", "Velocity is parallel to j when its i-component is zero.", { ux: 16, uy: 8, ax: -4, ay: -2, height: 4, duration: 5 }, ["vx = 0"]),
        suvat2("speed-magnitude", "Speed and magnitude from vectors", "Speed is the magnitude of the velocity vector, not the vector itself.", { ux: 10, uy: 12, ax: -1, ay: -2, height: 3, duration: 5 }, ["magnitude"]),
        suvat2("target", "Target challenge", "Adjust the launch so the curve passes through the target.", { ux: 18, uy: 14, ax: 0, ay: -9.8, height: 0, duration: 3.5, targetX: 35, targetY: 4 }, ["challenge"]),
        suvat2("position-displacement", "Position vector vs displacement", "Displacement is change in position; position vector is measured from the origin.", { ux: 5, uy: 7, ax: 1, ay: -1, height: 6, duration: 6 }, ["r = r0 + s"])
      ]
    },
    {
      id: "forces",
      label: "06 Forces",
      title: "Forces and Equilibrium",
      subtitle: "Build free-body diagrams and watch the resultant close or fail to close.",
      cases: [
        forceCase("vertical-equilibrium", "1D equilibrium: vertical forces", "Upward forces balance downward forces.", "vertical", ["R = mg"]),
        forceCase("horizontal-equilibrium", "1D equilibrium: horizontal forces", "Forces to the right balance forces to the left.", "horizontal", ["left = right"]),
        forceCase("two-d-equilibrium", "2D equilibrium: multiple forces", "Resolve in two perpendicular directions.", "multi", ["resolve"]),
        forceCase("expressions", "Forces as expressions", "Unknown coefficients are found by equating components.", "expressions", ["algebra"]),
        forceCase("resultant", "Resultant force, not equilibrium", "The net force points in the acceleration direction.", "resultant", ["unbalanced"]),
        forceCase("vector-resultant", "Vector resultant", "Add force vectors in i and j notation.", "vector", ["i-j"]),
        forceCase("vector-unknown", "Vector equilibrium with unknown force", "The missing vector is the negative of the resultant.", "unknown", ["equilibrant"]),
        forceCase("parallel-condition", "Parallel vector condition", "Parallel vectors have matching component ratios.", "parallel", ["ratio"]),
        forceCase("force-direction", "Magnitude and direction of force", "Turn a force vector into magnitude and bearing/angle.", "direction", ["bearing"]),
        forceCase("angle-axis", "Angle with an axis", "Choose the correct adjacent/opposite components.", "axis", ["trig"]),
        forceCase("relationships", "Multiple forces with relationships", "Use given relationships before resolving.", "relationships", ["simultaneous"]),
        forceCase("magnitude-components", "Magnitude given, find components", "Use magnitude plus a direction condition to find components.", "components", ["Pythagoras"])
      ]
    },
    {
      id: "newton",
      label: "07 F = ma",
      title: "Newton's Second Law",
      subtitle: "From free-body diagram to acceleration and tension.",
      cases: [
        dynCase("single-body", "Single body on a horizontal plane", "A driving force competes with resistance.", "single", ["F = ma"]),
        dynCase("car-trailer", "Connected bodies: car and trailer", "Use the whole system for acceleration, then one body for tension.", "towbar", ["internal tension"]),
        dynCase("lift", "Vertical motion and lifts", "Reaction is bigger than mg when accelerating upward.", "lift", ["apparent weight"]),
        dynCase("atwood", "Pulley: vertical Atwood machine", "Two hanging masses share acceleration magnitude.", "atwood", ["tension"]),
        dynCase("table-pulley", "Pulley with a horizontal table", "Friction on the table competes with the hanging weight.", "table", ["rough table"]),
        dynCase("vector-fma", "Newton's Second Law in vector form", "Resultant force vector equals mass times acceleration vector.", "vector", ["vector acceleration"]),
        dynCase("safety", "Kinematics plus dynamics", "Find acceleration from motion, then test a tension/safety limit.", "safety", ["multi-stage"])
      ]
    },
    {
      id: "inclines",
      label: "08 Inclines",
      title: "Resolving Forces and Inclined Planes",
      subtitle: "Resolve weight into slope and normal components, then decide motion.",
      cases: [
        inclineCase("horizontal-smooth", "Horizontal surface: smooth", "No friction, so the horizontal resultant is simple.", { theta: 0, mass: 5, mu: 0, push: 20 }, ["smooth"]),
        inclineCase("horizontal-rough", "Horizontal surface: rough", "Friction equals mu R when limiting or sliding.", { theta: 0, mass: 5, mu: 0.3, push: 20 }, ["rough"]),
        inclineCase("weight-components", "Inclined plane: weight components", "mg sin(theta) acts down the slope; mg cos(theta) into the plane.", { theta: 32, mass: 5, mu: 0, push: 0 }, ["resolve mg"]),
        inclineCase("incline-smooth", "Inclined plane: smooth", "The only slope component is mg sin(theta).", { theta: 25, mass: 4, mu: 0, push: 0 }, ["smooth plane"]),
        inclineCase("rough-down", "Rough plane moving down", "Friction acts up the slope when motion is down.", { theta: 35, mass: 6, mu: 0.2, push: 0 }, ["friction up"]),
        inclineCase("rough-up", "Rough plane moving up", "Friction acts down the slope when motion is up.", { theta: 30, mass: 6, mu: 0.25, push: 50 }, ["friction down"]),
        inclineCase("limiting", "Limiting equilibrium on a slope", "At the point of sliding, friction is exactly mu R.", { theta: 22, mass: 5, mu: 0.4, push: 0 }, ["limiting"]),
        inclineCase("force-angle", "Force at an angle to the slope", "A pulling force changes both slope component and reaction.", { theta: 25, mass: 5, mu: 0.25, push: 45, pullAngle: 25 }, ["angled pull"]),
        inclineCase("connected-pulley", "Connected particles with pulley", "Resolve the block on the slope and link it to a hanging mass.", { theta: 28, mass: 5, mu: 0.2, push: 30 }, ["pulley"]),
        inclineCase("two-slopes", "Two particles on different slopes", "Each mass has its own slope component; the string links their accelerations.", { theta: 35, mass: 4, mu: 0.15, push: -22 }, ["two planes"])
      ]
    },
    {
      id: "momentum",
      label: "09 Momentum",
      title: "Momentum, Impulse and Collisions",
      subtitle: "Watch momentum transfer before, during and after impact.",
      cases: [
        momCase("momentum", "Calculating momentum", "Momentum is mass times velocity.", "basic", ["p = mv"]),
        momCase("impulse-force-time", "Impulse from force and time", "Impulse is force multiplied by time.", "impulse", ["J = Ft"]),
        momCase("impulse-change", "Impulse-momentum principle", "Impulse equals change in momentum.", "change", ["J = mv - mu"]),
        momCase("same-direction", "Collision: same direction", "A faster object catches a slower object.", "same", ["conservation"]),
        momCase("opposite-direction", "Collision: opposite directions", "Head-on collision with signed velocities.", "opposite", ["signs"]),
        momCase("coalescing", "Coalescing: stick together", "After impact, the bodies move as one mass.", "stick", ["inelastic"]),
        momCase("explosion", "Explosion: object splits in two", "Total momentum is conserved during separation.", "explosion", ["separation"]),
        momCase("wall", "Rebound from wall or floor", "Momentum of the ball changes; the wall is external.", "wall", ["rebound"]),
        momCase("force-time", "Impulse, force and time", "A driving or braking force changes velocity over time.", "forceTime", ["constant force"]),
        momCase("collision-dynamics", "Collision followed by dynamics", "Find post-collision speed, then use forces/SUVAT.", "follow", ["multi-stage"]),
        momCase("ambiguous-direction", "Ambiguity in direction", "Two possible directions mean two possible signs.", "ambiguous", ["two cases"])
      ]
    },
    {
      id: "moments",
      label: "10 Moments",
      title: "Moments",
      subtitle: "Balance rotation by comparing clockwise and anticlockwise turning effects.",
      cases: [
        momentCase("single", "Calculating a single moment", "Moment equals force times perpendicular distance.", "single", ["Fd"]),
        momentCase("angle", "Force acting at an angle", "Use the perpendicular component of the force.", "angle", ["F sin theta"]),
        momentCase("resultant", "Resultant moment of multiple forces", "Add clockwise moments and anticlockwise moments with signs.", "multi", ["sum moments"]),
        momentCase("rigid-equilibrium", "Rigid bodies in equilibrium", "Both resultant force and resultant moment are zero.", "supports", ["two equations"]),
        momentCase("uniform-rod", "Uniform rods", "The weight acts through the midpoint.", "rod", ["centre of mass"]),
        momentCase("nonuniform-com", "Non-uniform rod: centre of mass", "Use moments to locate the unknown centre of mass.", "nonuniform", ["COM"]),
        momentCase("tilting", "Rod on the point of tilting", "At tipping, one support reaction becomes zero.", "tilt", ["reaction zero"]),
        momentCase("seesaw", "Seesaw symmetric equilibrium", "Equal and opposite moments balance about the pivot.", "seesaw", ["pivot"]),
        momentCase("lamina", "Moments on laminas", "Treat a 2D shape as parts with their own centres of mass.", "lamina", ["2D shape"]),
        momentCase("two-case", "Non-uniform rod: two-case tilting", "Use two tipping positions to find unknowns.", "twoCase", ["two pivots"])
      ]
    }
  ];

  function caseDef(id, title, stage, purpose, tags, defaults, formula, moves) {
    return { id, title, stage, purpose, tags, defaults, formula, moves };
  }

  function vectorCase(id, title, purpose, mode, tags, overrides) {
    return caseDef(id, title, "vectors", purpose, tags, Object.assign({
      ax: 4, ay: 3, bx: -2, by: 5, bearing: 55
    }, overrides || {}, { mode }), [
      "Component form: <b>a = x i + y j</b>.",
      "Magnitude: <b>|a| = &radic;(x<sup>2</sup> + y<sup>2</sup>)</b>.",
      "Direction: use <b>tan(&theta;) = |y/x|</b> with the correct quadrant."
    ], commonMoves.vectors);
  }

  function graphCase(id, title, purpose, shape, tags) {
    return caseDef(id, title, "graphs", purpose, tags, { shape, duration: 10 }, graphFormula(shape), graphMoves(shape));
  }

  function graphFormula(shape) {
    if (shape === "disp") {
      return [
        "Displacement-time gradient gives velocity.",
        "A steeper tangent means a larger speed.",
        "Turning points show instantaneously zero velocity."
      ];
    }
    if (shape === "accel") {
      return [
        "Acceleration-time area gives change in velocity.",
        "Area above the axis increases velocity.",
        "Area below the axis decreases velocity."
      ];
    }
    if (shape === "speed") {
      return [
        "Speed-time area gives total distance.",
        "Speed is never negative.",
        "Velocity keeps direction; speed only keeps magnitude."
      ];
    }
    if (shape === "sketch") {
      return [
        "Move between graphs using gradient and area.",
        "Flat displacement-time means zero velocity.",
        "Flat velocity-time means zero acceleration."
      ];
    }
    return [
      "Velocity-time gradient gives acceleration.",
      "Area under a velocity-time graph gives displacement.",
      "Area below the axis is negative displacement."
    ];
  }

  function graphMoves(shape) {
    if (shape === "disp") {
      return [
        "Read the displacement axis first.",
        "Estimate velocity from the tangent gradient.",
        "Look for flat points where velocity is zero."
      ];
    }
    if (shape === "accel") {
      return [
        "Split the acceleration graph into simple areas.",
        "Add signed areas to find change in velocity.",
        "Combine with the starting velocity if it is given."
      ];
    }
    if (shape === "speed") {
      return [
        "Use area for distance travelled.",
        "Do not subtract any area below an axis because speed is non-negative.",
        "Compare with velocity-time only when direction matters."
      ];
    }
    return [
      "Read the axis labels first.",
      "Split compound shapes into triangles and rectangles.",
      "Use signed area for displacement and total area for distance."
    ];
  }

  function suvat1(id, title, purpose, defaults, tags) {
    return caseDef(id, title, "suvat1d", purpose, tags, defaults, [
      "v = u + at",
      "s = ut + 1/2 at<sup>2</sup>",
      "v<sup>2</sup> = u<sup>2</sup> + 2as"
    ], commonMoves.suvat);
  }

  function suvat2(id, title, purpose, defaults, tags) {
    return caseDef(id, title, "suvat2d", purpose, tags, defaults, [
      "v = u + at as a vector equation.",
      "r = r<sub>0</sub> + ut + 1/2 at<sup>2</sup>.",
      "Split into i and j components whenever a condition targets one direction."
    ], commonMoves.suvat);
  }

  function forceCase(id, title, purpose, mode, tags) {
    return caseDef(id, title, "forces", purpose, tags, {
      mode, f1: 12, f2: 9, f3: 7, angle1: 0, angle2: 120, angle3: 240
    }, [
      "Resolve each force into components.",
      "Equilibrium means <b>&Sigma;F<sub>x</sub> = 0</b> and <b>&Sigma;F<sub>y</sub> = 0</b>.",
      "Resultant force is the vector sum of all forces."
    ], commonMoves.forces);
  }

  function dynCase(id, title, purpose, mode, tags) {
    return caseDef(id, title, "dynamics", purpose, tags, {
      mode, m1: 6, m2: 4, force: 60, resistance: 8, mu: 0.2, liftA: 1.6, duration: 6
    }, [
      "Resultant force = mass &times; acceleration.",
      "Internal tensions cancel when considering the whole system.",
      "Use a separate equation on one body to find tension or reaction."
    ], [
      "Choose the positive direction.",
      "Write F = ma for the whole system if bodies are connected.",
      "Isolate one body to find the internal force."
    ]);
  }

  function inclineCase(id, title, purpose, defaults, tags) {
    return caseDef(id, title, "incline", purpose, tags, Object.assign({ pullAngle: 0, resolvedView: 0, duration: 6 }, defaults), [
      "Component down slope: <b>mg sin(&theta;)</b>.",
      "Normal reaction: <b>R = mg cos(&theta;)</b> unless another angled force changes it.",
      "Friction limit: <b>F &le; &mu;R</b>."
    ], [
      "Resolve parallel and perpendicular to the plane.",
      "Put friction opposite the actual or impending motion.",
      "Use limiting friction only when the question says limiting or about to move."
    ]);
  }

  function momCase(id, title, purpose, mode, tags) {
    return caseDef(id, title, "momentum", purpose, tags, {
      mode, m1: 4, u1: 6, m2: 3, u2: -2, e: 0.6, force: 18, duration: 5
    }, [
      "Momentum: <b>p = mv</b>.",
      "Impulse: <b>J = Ft = mv - mu</b>.",
      "Direct impact with restitution: <b>v<sub>2</sub> - v<sub>1</sub> = e(u<sub>1</sub> - u<sub>2</sub>)</b>."
    ], [
      "Choose a positive direction and keep signs.",
      "Conserve momentum for the colliding system.",
      "Use restitution only for direct collisions."
    ]);
  }

  function momentCase(id, title, purpose, mode, tags) {
    return caseDef(id, title, "moments", purpose, tags, {
      mode, beam: 8, pivot: 4, f1: 30, x1: 2, f2: 20, x2: 7, angle: 55, weight: 40
    }, [
      "Moment = force &times; perpendicular distance.",
      "Equilibrium: clockwise moments = anticlockwise moments.",
      "At the point of tilting, the reaction at the other support is zero."
    ], [
      "Choose a pivot that removes an unknown reaction.",
      "Use perpendicular distance, not slanted distance.",
      "State clockwise and anticlockwise moments clearly."
    ]);
  }

  const controlSets = {
    projectile: [
      c("u", "speed", 5, 50, 1), c("angle", "angle", 5, 80, 1), c("height", "height", 0, 30, 1), c("drag", "drag", 0, 0.12, 0.01)
    ],
    modelling: [c("force", "force", 0, 60, 1), c("angle", "angle", -70, 70, 1), c("offset", "offset", -2.5, 2.5, 0.1)],
    units: [c("quantity", "quantity", 1, 6, 1), c("scale", "scale", 1, 10, 1)],
    vectors: [c("ax", "a x", -10, 10, 0.5), c("ay", "a y", -10, 10, 0.5), c("bx", "b x", -10, 10, 0.5), c("by", "b y", -10, 10, 0.5), c("bearing", "bearing", 0, 360, 1)],
    graphs: [c("duration", "duration", 4, 16, 1)],
    suvat1d: [c("u", "u", -30, 30, 0.5), c("a", "a", -12, 12, 0.2), c("height", "height", 0, 50, 1), c("duration", "duration", 1, 12, 0.5)],
    suvat2d: [c("ux", "u x", -20, 35, 0.5), c("uy", "u y", -10, 35, 0.5), c("ax", "a x", -5, 5, 0.1), c("ay", "a y", -12, 5, 0.1), c("height", "height", 0, 30, 1), c("duration", "duration", 1, 10, 0.5), c("targetX", "target x", 10, 70, 1), c("targetY", "target y", 0, 30, 1)],
    forces: [c("f1", "F1", 0, 40, 1), c("angle1", "angle 1", 0, 360, 1), c("f2", "F2", 0, 40, 1), c("angle2", "angle 2", 0, 360, 1), c("f3", "F3", 0, 40, 1), c("angle3", "angle 3", 0, 360, 1)],
    dynamics: [c("m1", "mass 1", 1, 20, 0.5), c("m2", "mass 2", 1, 20, 0.5), c("force", "force", 0, 160, 1), c("resistance", "resist", 0, 50, 1), c("mu", "mu", 0, 0.8, 0.02), c("liftA", "lift a", -4, 4, 0.1), c("duration", "duration", 2, 10, 0.5)],
    incline: [c("theta", "theta", 0, 50, 1), c("mass", "mass", 1, 20, 0.5), c("mu", "mu", 0, 0.8, 0.02), c("push", "push", -80, 80, 1), c("pullAngle", "pull angle", -45, 45, 1), c("duration", "duration", 2, 10, 0.5)],
    momentum: [c("m1", "m1", 1, 12, 0.5), c("u1", "u1", -12, 12, 0.5), c("m2", "m2", 1, 12, 0.5), c("u2", "u2", -12, 12, 0.5), c("e", "e", 0, 1, 0.05), c("force", "force", 0, 60, 1), c("duration", "duration", 2, 10, 0.5)],
    moments: [c("beam", "beam", 4, 12, 0.5), c("pivot", "pivot", 0.5, 11.5, 0.5), c("f1", "F1", 0, 80, 1), c("x1", "x1", 0, 12, 0.5), c("f2", "F2", 0, 80, 1), c("x2", "x2", 0, 12, 0.5), c("angle", "angle", 0, 90, 1), c("weight", "weight", 0, 100, 1)]
  };

  const LAB_SYMBOLS = [
    sym("s", "displacement", "m", ["suvat1d", "suvat2d", "graphs"], ["distance", "position"]),
    sym("u", "initial velocity", "m s<sup>-1</sup>", ["suvat1d", "suvat2d", "projectile"], ["launch", "start"]),
    sym("v", "final velocity", "m s<sup>-1</sup>", ["suvat1d", "suvat2d", "projectile"], ["speed", "tangent"]),
    sym("a", "acceleration", "m s<sup>-2</sup>", ["suvat1d", "suvat2d", "graphs", "dynamics"], ["gradient", "resultant"]),
    sym("t", "time", "s", ["projectile", "graphs", "suvat1d", "suvat2d", "momentum"], ["duration"]),
    sym("g", "acceleration due to gravity", "9.8 m s<sup>-2</sup>", ["projectile", "suvat1d", "suvat2d", "incline", "dynamics"], ["weight"]),
    sym("F", "force", "N", ["forces", "dynamics", "incline", "moments"], ["push", "pull"]),
    sym("R", "normal reaction or resultant", "N", ["forces", "dynamics", "incline"], ["reaction", "resultant"]),
    sym("T", "tension", "N", ["dynamics", "forces"], ["string", "pulley"]),
    sym("m", "mass", "kg", ["dynamics", "incline", "momentum"], ["particle", "body"]),
    sym("&mu;", "coefficient of friction", "no unit", ["incline", "dynamics"], ["rough", "friction"]),
    sym("&theta;", "angle", "degrees", ["projectile", "vectors", "incline", "moments"], ["bearing", "slope"]),
    sym("p", "momentum", "kg m s<sup>-1</sup>", ["momentum"], ["collision"]),
    sym("J", "impulse", "N s", ["momentum"], ["force time"]),
    sym("e", "coefficient of restitution", "no unit", ["momentum"], ["bounce", "impact"]),
    sym("M", "moment", "N m", ["moments"], ["pivot", "turning"]),
    sym("&Sigma;F", "sum of forces", "N", ["forces", "dynamics", "incline"], ["equilibrium"]),
    sym("&Sigma;M", "sum of moments", "N m", ["moments"], ["clockwise", "anticlockwise"]),
    sym("i, j", "unit vectors", "unitless", ["vectors", "suvat2d"], ["components"]),
    sym("|a|", "vector magnitude", "same as vector", ["vectors", "suvat2d"], ["length"])
  ];

  const QUICK_STARTS = [
    quick("projectile-level", "Projectile flight", "Split horizontal and vertical motion.", "suvat2d", "projectile-level"),
    quick("rough-incline", "Rough incline", "Resolve weight and friction on a slope.", "inclines", "rough-down"),
    quick("atwood", "Pulley system", "Use one acceleration and shared tension.", "dynamics", "atwood"),
    quick("collision", "Collision lab", "Compare before and after momentum.", "momentum", "same-direction"),
    quick("beam", "Moment balance", "Turn about a pivot and test tipping.", "moments", "rigid-equilibrium")
  ];

  function sym(mark, name, unit, stages, keywords) {
    return { mark, name, unit, stages, keywords };
  }

  function quick(id, title, detail, topicId, caseId) {
    return { id, title, detail, topicId, caseId };
  }

  function c(key, label, min, max, step) {
    return { key, label, min, max, step };
  }

  const el = {
    labSearch: document.getElementById("labSearch"),
    clearSearch: document.getElementById("clearSearch"),
    labStats: document.getElementById("labStats"),
    matchCount: document.getElementById("matchCount"),
    quickLabGrid: document.getElementById("quickLabGrid"),
    experimentCards: document.getElementById("experimentCards"),
    topicRail: document.getElementById("topicRail"),
    topicTitle: document.getElementById("topicTitle"),
    topicSubtitle: document.getElementById("topicSubtitle"),
    caseChip: document.getElementById("caseChip"),
    caseSelect: document.getElementById("caseSelect"),
    casePurpose: document.getElementById("casePurpose"),
    caseTags: document.getElementById("caseTags"),
    caseSequence: document.getElementById("caseSequence"),
    prevCase: document.getElementById("prevCase"),
    nextCase: document.getElementById("nextCase"),
    controlStack: document.getElementById("controlStack"),
    symbolGrid: document.getElementById("symbolGrid"),
    readouts: document.getElementById("readouts"),
    dataTable: document.getElementById("dataTable"),
    copySnapshot: document.getElementById("copySnapshot"),
    formulaTrail: document.getElementById("formulaTrail"),
    examMoves: document.getElementById("examMoves"),
    canvas: document.getElementById("labCanvas"),
    hud: document.getElementById("hud"),
    timeSlider: document.getElementById("timeSlider"),
    timeOut: document.getElementById("timeOut"),
    speed: document.getElementById("speed"),
    playPause: document.getElementById("playPause"),
    playIcon: document.getElementById("playIcon"),
    stagePlay: document.getElementById("stagePlay"),
    stageReset: document.getElementById("stageReset"),
    reset: document.getElementById("reset"),
    stepBack: document.getElementById("stepBack")
  };

  const ctx = el.canvas.getContext("2d");
  const app = {
    topicIndex: 0,
    caseIndex: 0,
    values: {},
    t: 0,
    playing: false,
    last: 0,
    speed: 1,
    query: "",
    lastReadouts: [],
    raf: null
  };

  function init() {
    buildTopicRail();
    buildLabStats();
    buildQuickLabs();
    bindLabSearch();
    const params = new URLSearchParams(location.search);
    const requested = params.get("topic");
    const idx = TOPICS.findIndex((topic) => topic.id === requested);
    if (idx >= 0) app.topicIndex = idx;
    selectTopic(app.topicIndex);
    bindTransport();
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(loop);
  }

  function buildTopicRail() {
    el.topicRail.innerHTML = TOPICS.map((topic, index) => (
      `<button class="topic-tab" type="button" data-index="${index}">${topic.label}</button>`
    )).join("");
    el.topicRail.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectTopic(Number(button.dataset.index)));
    });
  }

  function selectTopic(index) {
    app.topicIndex = index;
    app.caseIndex = 0;
    el.topicRail.querySelectorAll("button").forEach((button, i) => {
      button.classList.toggle("is-active", i === index);
    });
    const topic = currentTopic();
    el.topicTitle.textContent = topic.title;
    el.topicSubtitle.textContent = topic.subtitle;
    el.caseSelect.innerHTML = topic.cases.map((item, i) => (
      `<option value="${i}">${String(i + 1).padStart(2, "0")} | ${escapeHtml(item.title)}</option>`
    )).join("");
    el.caseSelect.onchange = () => selectCase(Number(el.caseSelect.value));
    renderExperimentCards();
    selectCase(0);
  }

  function selectCase(index) {
    app.caseIndex = index;
    app.t = 0;
    setPlaying(false);
    el.caseSelect.value = String(index);
    const item = currentCase();
    app.values = Object.assign({}, item.defaults || {});
    el.caseChip.textContent = item.title;
    el.casePurpose.textContent = item.purpose;
    el.caseTags.innerHTML = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    buildControls(item);
    buildFormula(item);
    updateCaseSequence();
    updateSymbolPanel();
    syncBrowserActive();
    render();
  }

  function buildControls(item) {
    const controls = (controlSets[item.stage] || []).filter((control) => Object.prototype.hasOwnProperty.call(app.values, control.key));
    if (!controls.length) {
      el.controlStack.innerHTML = `<p class="case-purpose">This case is controlled from the case selector and timeline.</p>`;
      return;
    }
    el.controlStack.innerHTML = controls.map((control) => {
      const value = app.values[control.key];
      return `
        <div class="control-row">
          <label for="ctl-${control.key}">${escapeHtml(control.label)}</label>
          <input id="ctl-${control.key}" data-key="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}">
          <input data-key="${control.key}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}">
        </div>`;
    }).join("") + buildModeControls(item);
    el.controlStack.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (event) => {
        const key = event.target.dataset.key;
        app.values[key] = Number(event.target.value);
        el.controlStack.querySelectorAll(`[data-key="${key}"]`).forEach((peer) => {
          if (peer !== event.target) peer.value = event.target.value;
        });
        setPlaying(false);
        render();
      });
    });
    el.controlStack.querySelectorAll(".toggle-button").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.key;
        app.values[key] = Number(button.dataset.value);
        el.controlStack.querySelectorAll(`[data-key="${key}"]`).forEach((peer) => {
          peer.classList.toggle("is-active", peer === button);
        });
        setPlaying(false);
        render();
      });
    });
  }

  function buildModeControls(item) {
    if (item.stage !== "incline") return "";
    const value = Number(app.values.resolvedView || 0);
    const active = (mode) => value === mode ? " is-active" : "";
    return `
      <div class="toggle-row">
        <div class="toggle-label">View</div>
        <div class="segmented" role="group" aria-label="Inclined plane view">
          <button class="toggle-button${active(0)}" type="button" data-key="resolvedView" data-value="0">Forces</button>
          <button class="toggle-button${active(1)}" type="button" data-key="resolvedView" data-value="1">Resolved</button>
        </div>
      </div>`;
  }

  function buildFormula(item) {
    el.formulaTrail.innerHTML = (item.formula || []).map((line) => `<div class="formula">${line}</div>`).join("");
    el.examMoves.innerHTML = (item.moves || []).map((line) => `<li>${line}</li>`).join("");
  }

  function bindTransport() {
    el.playPause.addEventListener("click", () => {
      setPlaying(!app.playing);
    });
    el.reset.addEventListener("click", () => {
      resetSimulation();
    });
    el.stepBack.addEventListener("click", () => {
      app.t = Math.max(0, app.t - 0.25);
      setPlaying(false);
      render();
    });
    el.timeSlider.addEventListener("input", () => {
      app.t = duration() * Number(el.timeSlider.value) / 1000;
      setPlaying(false);
      render();
    });
    el.speed.addEventListener("change", () => {
      app.speed = Number(el.speed.value);
    });
    if (el.stagePlay) {
      el.stagePlay.addEventListener("click", () => {
        setPlaying(!app.playing);
      });
    }
    if (el.stageReset) {
      el.stageReset.addEventListener("click", resetSimulation);
    }
    if (el.prevCase) {
      el.prevCase.addEventListener("click", () => shiftCase(-1));
    }
    if (el.nextCase) {
      el.nextCase.addEventListener("click", () => shiftCase(1));
    }
    if (el.copySnapshot) {
      el.copySnapshot.addEventListener("click", copySnapshot);
    }
  }

  function startPlayback() {
    setPlaying(true);
  }

  function resetSimulation() {
    app.t = 0;
    setPlaying(false);
    render();
  }

  function setPlaying(value) {
    app.playing = Boolean(value);
    if (app.playing) app.last = performance.now();
    updatePlayButtons();
  }

  function updatePlayButtons() {
    const label = app.playing ? "Pause" : "Play";
    if (el.playIcon) el.playIcon.textContent = label;
    if (el.stagePlay) el.stagePlay.textContent = label;
  }

  function resize() {
    const rect = el.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    el.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    el.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function loop(now) {
    if (app.playing) {
      const dt = Math.min(0.05, (now - app.last) / 1000 || 0) * app.speed;
      app.t += dt;
      if (app.t >= duration()) {
        app.t = duration();
        setPlaying(false);
      }
      render();
    }
    app.last = now;
    app.raf = requestAnimationFrame(loop);
  }

  function duration() {
    return Math.max(1, Number(app.values.duration || projectileFlight(app.values).time || 6));
  }

  function render() {
    const item = currentCase();
    const rect = el.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);
    drawBackdrop(W, H);
    const t = Math.min(app.t, duration());
    let readouts = [];
    let hud = [];
    switch (item.stage) {
      case "projectile":
        readouts = drawProjectile(W, H, t);
        hud = ["Ideal path is pale. Active model is bright.", "Velocity arrow is tangent to the path; acceleration points downward."];
        break;
      case "modelling":
        readouts = drawModelling(W, H);
        hud = ["Particle model ignores the place where the force is applied.", "Rigid body model keeps the turning effect."];
        break;
      case "units":
        readouts = drawUnits(W, H);
        hud = ["A unit check is often the fastest way to catch impossible formulae."];
        break;
      case "vectors":
        readouts = drawVectors(W, H, t);
        hud = ["Drag the sliders to change components.", "The resultant is drawn from the same origin unless the case uses tip-to-tail."];
        break;
      case "graphs":
        readouts = drawGraphs(W, H, t);
        hud = graphHud(app.values.shape || "acb");
        break;
      case "suvat1d":
        readouts = drawSuvat1(W, H, t);
        hud = ["The track position follows s = ut + 1/2 at^2.", "Watch velocity reverse when v changes sign."];
        break;
      case "suvat2d":
        readouts = drawSuvat2(W, H, t);
        hud = ["Each component obeys its own 1D SUVAT equation.", "Position vector is measured from the origin."];
        break;
      case "forces":
        readouts = drawForces(W, H);
        hud = ["Close the vector polygon for equilibrium.", "The red arrow is the current resultant."];
        break;
      case "dynamics":
        readouts = drawDynamics(W, H, t);
        hud = ["Use the whole system for acceleration.", "Then isolate one body for tension or reaction."];
        break;
      case "incline":
        readouts = drawIncline(W, H, t);
        hud = ["Resolve parallel and perpendicular to the plane.", "Friction opposes motion or impending motion."];
        break;
      case "momentum":
        readouts = drawMomentum(W, H, t);
        hud = ["Momentum is signed.", "The brief flash is the impulse interval."];
        break;
      case "moments":
        readouts = drawMoments(W, H);
        hud = ["Clockwise and anticlockwise moments compete about the pivot.", "At tipping, one support reaction is zero."];
        break;
      default:
        readouts = [];
    }
    paintReadouts(readouts);
    app.lastReadouts = readouts;
    paintHud(hud);
    paintDataSnapshot(readouts);
    updateTimeUi();
  }

  function buildLabStats() {
    if (!el.labStats) return;
    const totalCases = allCaseEntries().length;
    const totalTags = new Set(allCaseEntries().flatMap((entry) => entry.item.tags || [])).size;
    el.labStats.innerHTML = [
      ["10", "mechanics topics"],
      [String(totalCases), "working cases"],
      [String(LAB_SYMBOLS.length), "symbol cards"],
      [String(totalTags), "exam tags"],
      ["5", "quick starts"],
      ["live", "canvas lab"]
    ].map(([value, label]) => `
      <div class="lab-stat">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `).join("");
  }

  function buildQuickLabs() {
    if (!el.quickLabGrid) return;
    el.quickLabGrid.innerHTML = QUICK_STARTS.map((item) => `
      <article class="quick-lab" data-topic-id="${escapeHtml(item.topicId)}" data-case-id="${escapeHtml(item.caseId)}">
        <div class="card-title-row">
          <strong>${escapeHtml(item.title)}</strong>
          <div class="case-card-actions" aria-label="${escapeHtml(item.title)} controls">
            <button class="case-action-btn play" type="button" data-action="play">Play</button>
            <button class="case-action-btn reset" type="button" data-action="reset">Reset</button>
          </div>
        </div>
        <p>${escapeHtml(item.detail)}</p>
      </article>
    `).join("");
    bindCardControls(el.quickLabGrid);
  }

  function bindLabSearch() {
    if (!el.labSearch) return;
    el.labSearch.addEventListener("input", () => {
      app.query = normalise(el.labSearch.value);
      renderExperimentCards();
    });
    if (el.clearSearch) {
      el.clearSearch.addEventListener("click", () => {
        el.labSearch.value = "";
        app.query = "";
        renderExperimentCards();
        el.labSearch.focus();
      });
    }
  }

  function renderExperimentCards() {
    if (!el.experimentCards) return;
    const current = currentTopic();
    const query = app.query;
    const entries = allCaseEntries().filter((entry) => {
      if (!query) return entry.topic.id === current.id;
      return searchableText(entry).includes(query);
    });
    if (el.matchCount) {
      const scope = query ? "matching cases" : current.label + " cases";
      el.matchCount.textContent = entries.length + " " + scope;
    }
    if (!entries.length) {
      el.experimentCards.innerHTML = `<div class="no-results">No experiment matched this search. Try a symbol like mu, theta, F, impulse, projectile, or moments.</div>`;
      return;
    }
    el.experimentCards.innerHTML = entries.map((entry) => experimentCard(entry)).join("");
    bindCardControls(el.experimentCards);
    syncBrowserActive();
  }

  function experimentCard(entry) {
    const symbols = symbolsForCase(entry.item).slice(0, 4);
    return `
      <article class="experiment-card" data-topic-index="${entry.topicIndex}" data-case-index="${entry.caseIndex}">
        <div class="experiment-meta">
          <span class="experiment-symbol experiment-topic">${escapeHtml(entry.topic.label)}</span>
          <span class="experiment-symbol">${escapeHtml(entry.item.stage)}</span>
        </div>
        <div class="card-title-row">
          <strong>${escapeHtml(entry.item.title)}</strong>
          <div class="case-card-actions" aria-label="${escapeHtml(entry.item.title)} controls">
            <button class="case-action-btn play" type="button" data-action="play">Play</button>
            <button class="case-action-btn reset" type="button" data-action="reset">Reset</button>
          </div>
        </div>
        <p>${escapeHtml(entry.item.purpose)}</p>
        <div class="symbol-tags">
          ${symbols.map((item) => `<span class="symbol-chip">${item.mark}</span>`).join("")}
        </div>
      </article>
    `;
  }

  function bindCardControls(root) {
    root.querySelectorAll(".case-action-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        runCardAction(button.closest(".quick-lab, .experiment-card"), button.dataset.action);
      });
    });
    root.querySelectorAll(".quick-lab, .experiment-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        runCardAction(card, "reset");
      });
    });
  }

  function runCardAction(card, action) {
    if (!card) return;
    if (card.classList.contains("quick-lab")) {
      selectByIds(card.dataset.topicId, card.dataset.caseId);
    } else {
      selectByIndexes(Number(card.dataset.topicIndex), Number(card.dataset.caseIndex));
    }
    if (action === "play") {
      startPlayback();
    } else {
      resetSimulation();
    }
    scrollStageIntoView();
  }

  function updateCaseSequence() {
    if (!el.caseSequence) return;
    const topic = currentTopic();
    const rows = [
      { label: "Previous", index: app.caseIndex - 1 },
      { label: "Now running", index: app.caseIndex },
      { label: "Next variation", index: app.caseIndex + 1 },
      { label: "After that", index: app.caseIndex + 2 }
    ].filter((row) => row.index >= 0 && row.index < topic.cases.length);
    el.caseSequence.innerHTML = rows.map((row) => {
      const item = topic.cases[row.index];
      const active = row.index === app.caseIndex ? " is-active" : "";
      return `
        <div class="case-step${active}">
          <div class="step-k">${escapeHtml(row.label)}</div>
          <div class="step-v">${String(row.index + 1).padStart(2, "0")} | ${escapeHtml(item.title)}</div>
        </div>
      `;
    }).join("");
    if (el.prevCase) el.prevCase.disabled = app.caseIndex === 0;
    if (el.nextCase) el.nextCase.disabled = app.caseIndex >= topic.cases.length - 1;
  }

  function updateSymbolPanel() {
    if (!el.symbolGrid) return;
    const symbols = symbolsForCase(currentCase()).slice(0, 8);
    el.symbolGrid.innerHTML = symbols.map((item) => `
      <div class="symbol-card">
        <strong>${item.mark}</strong>
        <span>${escapeHtml(item.name)}</span>
        <span>${item.unit}</span>
      </div>
    `).join("");
  }

  function paintDataSnapshot(readouts) {
    if (!el.dataTable) return;
    const item = currentCase();
    const rows = [
      ["case", item.title],
      ["time", fmt(app.t) + " s"],
      ...readouts.slice(0, 6).map((row) => [row.key, row.value])
    ];
    el.dataTable.innerHTML = `
      <thead><tr><th>Quantity</th><th>Value</th></tr></thead>
      <tbody>
        ${rows.map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}
      </tbody>
    `;
  }

  function copySnapshot() {
    const item = currentCase();
    const lines = [
      "WME01 Mechanics Lab",
      currentTopic().title + " - " + item.title,
      "t = " + fmt(app.t) + " s"
    ].concat(app.lastReadouts.map((row) => row.key + ": " + row.value));
    const text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flashCopyButton("Copied")).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    flashCopyButton("Copied");
  }

  function flashCopyButton(label) {
    if (!el.copySnapshot) return;
    const old = el.copySnapshot.textContent;
    el.copySnapshot.textContent = label;
    window.setTimeout(() => {
      el.copySnapshot.textContent = old;
    }, 1100);
  }

  function shiftCase(step) {
    const next = clamp(app.caseIndex + step, 0, currentTopic().cases.length - 1);
    if (next !== app.caseIndex) selectCase(next);
  }

  function selectByIds(topicId, caseId) {
    const topicIndex = TOPICS.findIndex((topic) => topic.id === topicId);
    if (topicIndex < 0) return;
    const caseIndex = TOPICS[topicIndex].cases.findIndex((item) => item.id === caseId);
    selectByIndexes(topicIndex, caseIndex >= 0 ? caseIndex : 0);
  }

  function selectByIndexes(topicIndex, caseIndex) {
    if (topicIndex < 0 || topicIndex >= TOPICS.length) return;
    selectTopic(topicIndex);
    selectCase(clamp(caseIndex, 0, currentTopic().cases.length - 1));
  }

  function syncBrowserActive() {
    if (el.experimentCards) {
      el.experimentCards.querySelectorAll(".experiment-card").forEach((card) => {
        card.classList.toggle("is-active", Number(card.dataset.topicIndex) === app.topicIndex && Number(card.dataset.caseIndex) === app.caseIndex);
      });
    }
    if (el.quickLabGrid) {
      el.quickLabGrid.querySelectorAll(".quick-lab").forEach((button) => {
        const topic = TOPICS.find((item) => item.id === button.dataset.topicId);
        const caseItem = topic ? topic.cases.find((item) => item.id === button.dataset.caseId) : null;
        button.classList.toggle("is-active", topic === currentTopic() && caseItem === currentCase());
      });
    }
  }

  function scrollStageIntoView() {
    const target = document.querySelector(".stage-panel");
    if (target && window.matchMedia("(min-width: 721px)").matches) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function allCaseEntries() {
    const rows = [];
    TOPICS.forEach((topic, topicIndex) => {
      topic.cases.forEach((item, caseIndex) => {
        rows.push({ topic, item, topicIndex, caseIndex });
      });
    });
    return rows;
  }

  function searchableText(entry) {
    const symbols = symbolsForCase(entry.item).map((item) => [item.mark, item.name, item.unit, ...(item.keywords || [])].join(" ")).join(" ");
    return normalise([
      entry.topic.label,
      entry.topic.title,
      entry.topic.subtitle,
      entry.item.title,
      entry.item.purpose,
      entry.item.stage,
      (entry.item.tags || []).join(" "),
      symbols
    ].join(" "));
  }

  function symbolsForCase(item) {
    const tagText = normalise([item.stage, item.title, item.purpose, (item.tags || []).join(" ")].join(" "));
    const direct = LAB_SYMBOLS.filter((symbol) => (
      symbol.stages.includes(item.stage) ||
      symbol.keywords.some((keyword) => tagText.includes(normalise(keyword))) ||
      tagText.includes(normalise(symbol.name))
    ));
    return direct.length ? direct : LAB_SYMBOLS.slice(0, 6);
  }

  function normalise(value) {
    return String(value || "")
      .replace(/&mu;/g, "mu")
      .replace(/&theta;/g, "theta")
      .replace(/&Sigma;/g, "sigma")
      .replace(/<[^>]+>/g, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function drawBackdrop(W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#10275d");
    g.addColorStop(0.58, "#08142f");
    g.addColorStop(1, "#050b1d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "rgba(255,255,255,.075)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) line(x, 0, x, H);
    for (let y = 0; y < H; y += 40) line(0, y, W, y);
    ctx.restore();
  }

  function drawProjectile(W, H, t) {
    const v = app.values;
    const ideal = projectilePath(Object.assign({}, v, { drag: 0 }), duration());
    const active = projectilePath(v, duration());
    const pts = ideal.concat(active);
    const bounds = boundsFor(pts, 3);
    const map = mapper(W, H, bounds);
    drawAxes(map, bounds, "x", "y");
    drawGround(map, bounds);
    drawPath(map, ideal, "rgba(255,255,255,.35)", 2);
    drawPath(map, active, colors.teal, 4);
    const p = pointAtPath(active, t / duration());
    const sp = map(p.x, p.y);
    ctx.fillStyle = colors.goldSoft;
    circle(sp.x, sp.y, 9);
    const vel = velocityNear(active, t / duration());
    arrow(sp.x, sp.y, sp.x + vel.x * 1.4, sp.y - vel.y * 1.4, colors.teal, 3);
    arrow(sp.x, sp.y, sp.x, sp.y + 54, colors.orange, 3);
    label(sp.x + 14, sp.y - 15, "v", colors.teal);
    label(sp.x + 8, sp.y + 66, "g", colors.orange);
    if (v.targetX != null) {
      const target = map(v.targetX, v.targetY || 0);
      ctx.strokeStyle = colors.rose;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      label(target.x + 18, target.y - 12, "target", colors.rose);
    }
    const flight = projectileFlight(v);
    return [
      ro("time", fmt(t) + " s"),
      ro("x", fmt(p.x) + " m"),
      ro("y", fmt(p.y) + " m"),
      ro("flight", fmt(flight.time) + " s"),
      ro("range", fmt(flight.range) + " m"),
      ro("model", Number(v.drag) ? "drag on" : "ideal")
    ];
  }

  function drawModelling(W, H) {
    const v = app.values;
    const cx = W * 0.48;
    const cy = H * 0.56;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    rounded(cx - 165, cy - 70, 330, 140, 14, true);
    ctx.fillStyle = "#172f68";
    rounded(cx - 110, cy - 30, 220, 60, 10, true);
    ctx.fillStyle = colors.goldSoft;
    circle(cx - 70, cy + 38, 18);
    circle(cx + 70, cy + 38, 18);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 2;
    line(cx, cy - 85, cx, cy + 88);
    line(cx - 180, cy, cx + 180, cy);
    const x = cx;
    const y = cy - v.offset * 45;
    const len = v.force * 3;
    const a = rad(v.angle);
    arrow(x - Math.cos(a) * len * 0.4, y + Math.sin(a) * len * 0.4, x + Math.cos(a) * len * 0.6, y - Math.sin(a) * len * 0.6, colors.teal, 4);
    label(x + 70, y - 12, "force applied away from centre", colors.teal);
    const moment = v.force * Math.abs(v.offset);
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 72, -0.6, 1.2);
    ctx.stroke();
    label(cx + 82, cy + 38, "turning effect", colors.orange);
    return [
      ro("force", fmt(v.force) + " N"),
      ro("offset", fmt(v.offset) + " m"),
      ro("moment", fmt(moment) + " Nm"),
      ro("particle model", "moment ignored"),
      ro("rigid model", "moment kept")
    ];
  }

  function drawUnits(W, H) {
    const cards = [
      ["Velocity", "m s^-1", "vector if direction is included"],
      ["Acceleration", "m s^-2", "rate of change of velocity"],
      ["Force", "kg m s^-2", "newton, N"],
      ["Momentum", "kg m s^-1", "mass x velocity"],
      ["Impulse", "N s", "same units as momentum"],
      ["Moment", "N m", "force x distance"]
    ];
    const active = Math.max(0, Math.min(cards.length - 1, Math.round((app.values.quantity || 1) - 1)));
    const cw = Math.min(230, W / 3.6);
    const gap = 16;
    const startX = W / 2 - (cw * 3 + gap * 2) / 2;
    const startY = H / 2 - 140;
    cards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (cw + gap);
      const y = startY + row * 132;
      ctx.fillStyle = i === active ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.08)";
      ctx.strokeStyle = i === active ? colors.gold : "rgba(255,255,255,.12)";
      ctx.lineWidth = 2;
      rounded(x, y, cw, 104, 12, true, true);
      label(x + 16, y + 28, card[0], colors.white, "bold 15px Inter");
      label(x + 16, y + 56, card[1], colors.goldSoft, "bold 18px Inter");
      label(x + 16, y + 82, card[2], colors.dim, "12px Inter");
    });
    return [
      ro("selected", cards[active][0]),
      ro("unit", cards[active][1]),
      ro("scale", fmt(app.values.scale || 1)),
      ro("rule", "same units both sides")
    ];
  }

  function drawVectors(W, H) {
    const v = app.values;
    const a = { x: v.ax, y: v.ay };
    const b = { x: v.bx, y: v.by };
    let r = { x: a.x + b.x, y: a.y + b.y };
    if (v.mode === "sub") r = { x: a.x - b.x, y: a.y - b.y };
    if (v.mode === "equilibrium") r = { x: -(a.x + b.x), y: -(a.y + b.y) };
    if (v.mode === "relative") r = { x: b.x - a.x, y: b.y - a.y };
    if (v.mode === "bearing") {
      const br = rad(90 - v.bearing);
      a.x = Math.cos(br) * 8;
      a.y = Math.sin(br) * 8;
      r = a;
    }
    const pts = [{ x: 0, y: 0 }, a, b, r, { x: a.x + b.x, y: a.y + b.y }];
    const bounds = boundsFor(pts, 2);
    const map = mapper(W, H, bounds);
    drawAxes(map, bounds, "i", "j");
    const origin = map(0, 0);
    if (v.mode === "relative") {
      const A = map(a.x, a.y);
      const B = map(b.x, b.y);
      dot(A.x, A.y, colors.goldSoft, "A");
      dot(B.x, B.y, colors.sky, "B");
      arrow(A.x, A.y, B.x, B.y, colors.teal, 4);
      label((A.x + B.x) / 2 + 10, (A.y + B.y) / 2 - 8, "AB = b - a", colors.teal);
    } else if (v.mode === "equilibrium") {
      drawVectorArrow(map, { x: 0, y: 0 }, a, colors.sky, "F1");
      drawVectorArrow(map, a, { x: a.x + b.x, y: a.y + b.y }, colors.violet, "F2");
      drawVectorArrow(map, { x: a.x + b.x, y: a.y + b.y }, { x: 0, y: 0 }, colors.green, "F3");
      label(origin.x + 12, origin.y - 14, "closed polygon", colors.green);
    } else {
      drawVectorArrow(map, { x: 0, y: 0 }, a, colors.sky, "a");
      drawVectorArrow(map, { x: 0, y: 0 }, b, colors.violet, "b");
      drawVectorArrow(map, { x: 0, y: 0 }, r, colors.teal, v.mode === "bearing" ? "resolved" : "resultant");
      if (v.mode === "parallel") {
        drawVectorArrow(map, { x: 0, y: 0 }, { x: b.x * 2, y: b.y * 2 }, colors.green, "2b");
      }
    }
    return [
      ro("x", fmt(r.x)),
      ro("y", fmt(r.y)),
      ro("magnitude", fmt(Math.hypot(r.x, r.y))),
      ro("angle", fmt(deg(Math.atan2(r.y, r.x))) + " deg"),
      ro("bearing", fmt((450 - deg(Math.atan2(r.y, r.x))) % 360) + " deg")
    ];
  }

  function drawGraphs(W, H, t) {
    const shape = app.values.shape || "acb";
    const meta = graphMeta(shape);
    const T = duration();
    const pts = graphPoints(shape, T);
    const pad = { l: 72, r: 28, t: 48, b: 118 };
    const minV = Math.min(-4, ...pts.map((p) => p.v));
    const maxV = Math.max(10, ...pts.map((p) => p.v));
    const mx = (time) => pad.l + time / T * (W - pad.l - pad.r);
    const my = (vel) => H - pad.b - (vel - minV) / (maxV - minV) * (H - pad.t - pad.b);
    drawGraphGrid(pad, W, H, minV, maxV, T, mx, my, meta.axisLabel);
    const nowX = mx(t);
    const value = valueOnGraph(pts, t);
    const gradient = gradientOnGraph(pts, t);
    if (meta.fillArea) {
      ctx.fillStyle = meta.areaColor;
      ctx.beginPath();
      ctx.moveTo(mx(0), my(0));
      pts.forEach((p) => ctx.lineTo(mx(p.t), my(p.v)));
      ctx.lineTo(mx(T), my(0));
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(245,158,11,.48)";
      ctx.lineWidth = 2;
      line(nowX, my(0), nowX, my(value));
      label(nowX + 8, (my(0) + my(value)) / 2, "read gradient", colors.orange);
    }
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = mx(p.t);
      const y = my(p.v);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.strokeStyle = colors.teal;
    ctx.lineWidth = 4;
    ctx.stroke();
    drawGraphTangent(mx, my, t, value, gradient, T);
    ctx.strokeStyle = colors.gold;
    ctx.lineWidth = 2;
    line(nowX, pad.t, nowX, H - pad.b);
    label(nowX + 8, pad.t + 16, "t = " + fmt(t) + " s", colors.goldSoft);
    const s = integrateGraph(pts, t);
    const dist = integrateGraph(pts, t, true);
    drawMotionStrip(W, H, shape, pts, t, T, meta);
    if (shape === "disp") {
      return [
        ro("displacement", fmt(value) + " m"),
        ro("velocity", fmt(gradient) + " m/s"),
        ro("tangent", "gradient at t"),
        ro("shape", "s-t graph")
      ];
    }
    if (shape === "accel") {
      return [
        ro("acceleration", fmt(value) + " m/s^2"),
        ro("change in v", fmt(s) + " m/s"),
        ro("signed area", fmt(s)),
        ro("shape", "a-t graph")
      ];
    }
    if (shape === "speed") {
      return [
        ro("speed", fmt(value) + " m/s"),
        ro("distance", fmt(dist) + " m"),
        ro("area", "always positive"),
        ro("shape", "speed-time")
      ];
    }
    return [
      ro("velocity", fmt(value) + " m/s"),
      ro("acceleration", fmt(gradient) + " m/s^2"),
      ro("displacement", fmt(s) + " m"),
      ro("distance", fmt(dist) + " m"),
      ro("shape", shape)
    ];
  }

  function graphHud(shape) {
    if (shape === "disp") {
      return ["Gradient gives velocity on a displacement-time graph.", "Read the tangent; do not use area on this graph."];
    }
    if (shape === "accel") {
      return ["Area under acceleration-time gives change in velocity.", "Signed area tells whether velocity increases or decreases."];
    }
    if (shape === "speed") {
      return ["Area under speed-time gives distance.", "Speed is non-negative, so area is not subtracted."];
    }
    if (shape === "sketch") {
      return ["Move from one graph to another using gradient and area.", "Flat sections and turning points are the main clues."];
    }
    return ["Gradient gives acceleration.", "Signed area gives displacement."];
  }

  function drawSuvat1(W, H, t) {
    const v = app.values;
    const id = currentCase().id;
    if (["vertical-up", "dropped", "from-height", "return-ground"].includes(id)) {
      return drawVerticalSuvat1(W, H, t, v, id);
    }
    if (id === "equation-choice") {
      return drawEquationChoice(W, H, t, v);
    }
    const s = v.u * t + 0.5 * v.a * t * t;
    const vel = v.u + v.a * t;
    const endS = v.u * duration() + 0.5 * v.a * duration() * duration();
    const minS = Math.min(0, s, endS, v.u < 0 ? endS : 0) - 8;
    const maxS = Math.max(20, s, endS, 0) + 8;
    const y = H * 0.58;
    const x = map1(s, minS, maxS, 80, W - 80);
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 4;
    line(70, y, W - 70, y);
    for (let i = Math.ceil(minS / 10) * 10; i <= maxS; i += 10) {
      const tx = map1(i, minS, maxS, 80, W - 80);
      line(tx, y - 8, tx, y + 8);
      label(tx - 8, y + 28, String(i), colors.dim, "11px Inter");
    }
    ctx.fillStyle = colors.goldSoft;
    rounded(x - 26, y - 28, 52, 32, 8, true);
    circle(x - 15, y + 10, 8);
    circle(x + 15, y + 10, 8);
    arrow(x, y - 54, x + vel * 4, y - 54, colors.teal, 4);
    arrow(x, y - 88, x + v.a * 7, y - 88, colors.orange, 4);
    label(x + vel * 4 + 8, y - 50, "v", colors.teal);
    label(x + v.a * 7 + 8, y - 84, "a", colors.orange);
    if (currentCase().id === "meeting") {
      const s2 = 36 - 3 * t;
      const x2 = map1(s2, minS, maxS, 80, W - 80);
      ctx.fillStyle = colors.sky;
      rounded(x2 - 22, y + 48, 44, 28, 8, true);
      label(x2 - 18, y + 95, "B", colors.sky);
    }
    return [
      ro("s", fmt(s) + " m"),
      ro("u", fmt(v.u) + " m/s"),
      ro("v", fmt(vel) + " m/s"),
      ro("a", fmt(v.a) + " m/s^2"),
      ro("time", fmt(t) + " s")
    ];
  }

  function drawVerticalSuvat1(W, H, t, v, id) {
    const h0 = Number(v.height || 0);
    const s = v.u * t + 0.5 * v.a * t * t;
    const yValue = h0 + s;
    const vel = v.u + v.a * t;
    const T = duration();
    const samples = [];
    for (let i = 0; i <= 70; i++) {
      const tt = T * i / 70;
      samples.push(h0 + v.u * tt + 0.5 * v.a * tt * tt);
    }
    const minY = Math.min(0, ...samples) - 4;
    const maxY = Math.max(12, h0, ...samples) + 5;
    const x = W * 0.52;
    const bottom = H * 0.82;
    const top = H * 0.16;
    const sy = (height) => map1(height, minY, maxY, bottom, top);
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 3;
    line(W * 0.25, sy(0), W * 0.82, sy(0));
    label(W * 0.26, sy(0) - 10, "ground: y = 0", colors.goldSoft);
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 2;
    line(x - 75, top, x - 75, bottom);
    for (let y = Math.ceil(minY / 5) * 5; y <= maxY; y += 5) {
      const yy = sy(y);
      line(x - 85, yy, x - 65, yy, "rgba(255,255,255,.18)", 1);
      label(x - 125, yy + 4, fmt(y) + " m", colors.dim);
    }
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const tt = T * i / 90;
      const yy = sy(h0 + v.u * tt + 0.5 * v.a * tt * tt);
      const xx = x;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.strokeStyle = colors.teal;
    ctx.lineWidth = 4;
    ctx.stroke();
    const py = sy(yValue);
    ctx.fillStyle = colors.goldSoft;
    circle(x, py, 13);
    arrow(x + 34, py, x + 34, py - vel * 2.8, colors.teal, 4);
    arrow(x + 64, py - 10, x + 64, py + 72, colors.orange, 4);
    label(x + 44, py - vel * 2.8 - 8, "v", colors.teal);
    label(x + 74, py + 66, "g", colors.orange);
    if (id === "from-height") {
      ctx.fillStyle = "rgba(56,189,248,.18)";
      rounded(W * 0.28, sy(h0), W * 0.18, sy(0) - sy(h0), 10, true);
      label(W * 0.3, sy(h0) - 12, "starting height", colors.sky);
    }
    if (id === "return-ground") {
      label(W * 0.48, sy(0) + 28, "return condition: s = 0", colors.green, "bold 13px Inter");
    }
    return [
      ro("height", fmt(yValue) + " m"),
      ro("s", fmt(s) + " m"),
      ro("v", fmt(vel) + " m/s"),
      ro("a", fmt(v.a) + " m/s^2"),
      ro("time", fmt(t) + " s")
    ];
  }

  function drawEquationChoice(W, H, t, v) {
    const s = v.u * t + 0.5 * v.a * t * t;
    const vel = v.u + v.a * t;
    const cards = [
      ["s = ut + 1/2 at^2", "uses s, u, a, t", true],
      ["v = u + at", "uses v, u, a, t", true],
      ["v^2 = u^2 + 2as", "avoid when t is known", false],
      ["s = (u + v)t / 2", "needs v as well", false]
    ];
    const cols = W < 760 ? 1 : 2;
    const cardW = cols === 1 ? W * 0.78 : Math.min(330, W * 0.34);
    const gap = 18;
    const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
    const startY = H * 0.18;
    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * 112;
      ctx.fillStyle = card[2] ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.08)";
      ctx.strokeStyle = card[2] ? colors.gold : "rgba(255,255,255,.15)";
      ctx.lineWidth = 2;
      rounded(x, y, cardW, 86, 10, true, true);
      label(x + 16, y + 32, card[0], card[2] ? colors.goldSoft : colors.white, "bold 15px Inter");
      label(x + 16, y + 60, card[1], colors.dim);
    });
    const y = H * 0.78;
    drawTrack(y, W);
    const x = map1(s, 0, Math.max(20, s + 12), 92, W - 92);
    ctx.fillStyle = colors.goldSoft;
    rounded(x - 28, y - 30, 56, 30, 8, true);
    arrow(x, y - 56, x + vel * 3, y - 56, colors.teal, 4);
    label(W * 0.12, H * 0.12, "Known: u, a, t. Choose an equation without the missing quantity.", colors.goldSoft, "bold 14px Inter");
    return [
      ro("u", fmt(v.u) + " m/s"),
      ro("a", fmt(v.a) + " m/s^2"),
      ro("t", fmt(t) + " s"),
      ro("s", fmt(s) + " m"),
      ro("v", fmt(vel) + " m/s")
    ];
  }

  function drawSuvat2(W, H, t) {
    const v = app.values;
    const pts = [];
    const T = duration();
    for (let i = 0; i <= 90; i++) {
      const tt = T * i / 90;
      pts.push({
        x: v.ux * tt + 0.5 * v.ax * tt * tt,
        y: v.height + v.uy * tt + 0.5 * v.ay * tt * tt
      });
    }
    return drawProjectileLike(W, H, t, pts, v);
  }

  function drawProjectileLike(W, H, t, pts, v) {
    const bounds = boundsFor(pts.concat([{ x: 0, y: 0 }, { x: v.targetX || 0, y: v.targetY || 0 }]), 3);
    const map = mapper(W, H, bounds);
    drawAxes(map, bounds, "i", "j");
    drawGround(map, bounds);
    drawPath(map, pts, colors.teal, 4);
    const p = {
      x: v.ux * t + 0.5 * v.ax * t * t,
      y: v.height + v.uy * t + 0.5 * v.ay * t * t
    };
    const sp = map(p.x, p.y);
    ctx.fillStyle = colors.goldSoft;
    circle(sp.x, sp.y, 9);
    const vx = v.ux + v.ax * t;
    const vy = v.uy + v.ay * t;
    arrow(sp.x, sp.y, sp.x + vx * 1.6, sp.y - vy * 1.6, colors.teal, 3);
    arrow(sp.x, sp.y, sp.x + v.ax * 8, sp.y - v.ay * 8, colors.orange, 3);
    if (v.targetX != null) {
      const target = map(v.targetX, v.targetY || 0);
      ctx.strokeStyle = colors.rose;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    return [
      ro("r", "(" + fmt(p.x) + ", " + fmt(p.y) + ")"),
      ro("v", "(" + fmt(vx) + ", " + fmt(vy) + ")"),
      ro("speed", fmt(Math.hypot(vx, vy)) + " m/s"),
      ro("a", "(" + fmt(v.ax) + ", " + fmt(v.ay) + ")"),
      ro("time", fmt(t) + " s")
    ];
  }

  function drawForces(W, H) {
    const v = app.values;
    const origin = { x: W * 0.48, y: H * 0.52 };
    ctx.fillStyle = "rgba(255,255,255,.08)";
    rounded(origin.x - 54, origin.y - 38, 108, 76, 12, true);
    label(origin.x - 28, origin.y + 5, "particle", colors.white, "bold 13px Inter");
    const forces = forceList(v);
    let sum = { x: 0, y: 0 };
    forces.forEach((f, index) => {
      sum.x += f.x;
      sum.y += f.y;
      arrow(origin.x, origin.y, origin.x + f.x * 8, origin.y - f.y * 8, f.color, 4);
      label(origin.x + f.x * 8 + 8, origin.y - f.y * 8, "F" + (index + 1), f.color);
    });
    arrow(origin.x, origin.y, origin.x + sum.x * 8, origin.y - sum.y * 8, colors.rose, 5);
    label(origin.x + sum.x * 8 + 8, origin.y - sum.y * 8 - 8, "R", colors.rose);
    drawMiniPolygon(W, H, forces);
    return [
      ro("Rx", fmt(sum.x) + " N"),
      ro("Ry", fmt(sum.y) + " N"),
      ro("|R|", fmt(Math.hypot(sum.x, sum.y)) + " N"),
      ro("angle", fmt(deg(Math.atan2(sum.y, sum.x))) + " deg"),
      ro("state", Math.hypot(sum.x, sum.y) < 0.5 ? "equilibrium" : "unbalanced")
    ];
  }

  function drawDynamics(W, H, t) {
    const v = app.values;
    const mode = v.mode;
    if (mode === "lift") return drawLift(W, H);
    if (mode === "vector") return drawVectorFma(W, H);
    if (mode === "atwood") return drawAtwood(W, H, t, false);
    if (mode === "table") return drawAtwood(W, H, t, true);
    if (mode === "towbar") return drawTowbar(W, H, t);
    return drawSingleDynamics(W, H, t);
  }

  function drawSingleDynamics(W, H, t) {
    const v = app.values;
    const net = v.force - v.resistance;
    const a = net / Math.max(0.1, v.m1);
    const s = 0.5 * a * t * t;
    const x = map1(s, 0, Math.max(30, 0.5 * Math.abs(a) * duration() * duration()), 95, W - 95);
    const y = H * 0.6;
    drawTrack(y, W);
    ctx.fillStyle = colors.goldSoft;
    rounded(x - 36, y - 40, 72, 40, 8, true);
    arrow(x - 45, y - 55, x + 55, y - 55, colors.teal, 4);
    arrow(x + 42, y - 20, x - 35, y - 20, colors.rose, 4);
    label(x + 60, y - 56, "driving", colors.teal);
    label(x - 98, y - 18, "resistance", colors.rose);
    return [
      ro("net force", fmt(net) + " N"),
      ro("mass", fmt(v.m1) + " kg"),
      ro("a", fmt(a) + " m/s^2"),
      ro("s", fmt(s) + " m")
    ];
  }

  function drawTowbar(W, H, t) {
    const v = app.values;
    const total = v.m1 + v.m2;
    const a = (v.force - v.resistance) / total;
    const T = v.m2 * a;
    const s = 0.5 * a * t * t;
    const x = map1(s, 0, Math.max(40, 0.5 * Math.abs(a) * duration() * duration()), 120, W - 190);
    const y = H * 0.61;
    drawTrack(y, W);
    ctx.fillStyle = colors.sky;
    rounded(x - 56, y - 48, 112, 48, 8, true);
    ctx.fillStyle = colors.goldSoft;
    rounded(x + 100, y - 38, 84, 38, 8, true);
    line(x + 56, y - 24, x + 100, y - 24, colors.goldSoft, 4);
    arrow(x - 62, y - 66, x + 70, y - 66, colors.teal, 4);
    label(x + 78, y - 63, "F", colors.teal);
    label(x + 68, y - 30, "T", colors.goldSoft);
    return [
      ro("a", fmt(a) + " m/s^2"),
      ro("towbar T", fmt(T) + " N"),
      ro("total mass", fmt(total) + " kg"),
      ro("distance", fmt(s) + " m")
    ];
  }

  function drawAtwood(W, H, t, table) {
    const v = app.values;
    const drive = table ? v.m2 * G - v.mu * v.m1 * G : (v.m1 - v.m2) * G;
    const total = v.m1 + v.m2;
    const a = drive / total;
    const T = table ? v.m2 * (G - a) : v.m1 * (G - Math.abs(a));
    const move = 0.5 * a * t * t * 14;
    const cx = W * 0.5;
    const top = H * 0.24;
    ctx.strokeStyle = "rgba(255,255,255,.42)";
    ctx.lineWidth = 4;
    if (table) {
      drawTrack(H * 0.58, W);
      rounded(cx - 210 + move, H * 0.58 - 42, 82, 42, 8, true);
      line(cx - 128 + move, H * 0.58 - 24, cx + 70, H * 0.58 - 24, colors.goldSoft, 3);
      circle(cx + 86, H * 0.58 - 24, 18, false, colors.goldSoft);
      line(cx + 104, H * 0.58 - 24, cx + 104, H * 0.58 + 90 + move, colors.goldSoft, 3);
      rounded(cx + 74, H * 0.58 + 90 + move, 60, 52, 8, true);
    } else {
      circle(cx, top, 28, false, colors.goldSoft);
      line(cx - 28, top, cx - 120, top + 190 + move, colors.goldSoft, 3);
      line(cx + 28, top, cx + 120, top + 190 - move, colors.goldSoft, 3);
      rounded(cx - 150, top + 190 + move, 60, 58, 8, true);
      rounded(cx + 90, top + 190 - move, 60, 58, 8, true);
      label(cx - 143, top + 225 + move, "m1", colors.white);
      label(cx + 98, top + 225 - move, "m2", colors.white);
    }
    return [
      ro("drive", fmt(drive) + " N"),
      ro("a", fmt(a) + " m/s^2"),
      ro("tension", fmt(T) + " N"),
      ro("system", table ? "table + hanger" : "Atwood")
    ];
  }

  function drawLift(W, H) {
    const v = app.values;
    const R = v.m1 * (G + v.liftA);
    const cx = W * 0.5;
    const cy = H * 0.54;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    rounded(cx - 120, cy - 170, 240, 300, 12, true);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 3;
    line(cx - 120, cy - 125, cx + 120, cy - 125);
    ctx.fillStyle = colors.sky;
    rounded(cx - 38, cy - 12, 76, 84, 12, true);
    arrow(cx, cy + 72, cx, cy - 80, colors.green, 5);
    arrow(cx, cy - 2, cx, cy + 120, colors.rose, 5);
    label(cx + 16, cy - 68, "R", colors.green);
    label(cx + 18, cy + 112, "mg", colors.rose);
    return [
      ro("mass", fmt(v.m1) + " kg"),
      ro("lift a", fmt(v.liftA) + " m/s^2"),
      ro("reaction", fmt(R) + " N"),
      ro("weight", fmt(v.m1 * G) + " N")
    ];
  }

  function drawVectorFma(W, H) {
    const v = app.values;
    const a = { x: v.force / Math.max(1, v.m1), y: (v.m2 - 5) / Math.max(1, v.m1) };
    const map = mapper(W, H, { minX: -4, maxX: 16, minY: -8, maxY: 8 });
    drawAxes(map, { minX: -4, maxX: 16, minY: -8, maxY: 8 }, "i", "j");
    drawVectorArrow(map, { x: 0, y: 0 }, { x: v.force / 10, y: v.m2 - 5 }, colors.teal, "R");
    drawVectorArrow(map, { x: 0, y: 0 }, a, colors.orange, "a = R/m");
    return [
      ro("Rx", fmt(v.force) + " N"),
      ro("Ry", fmt((v.m2 - 5) * 10) + " N"),
      ro("ax", fmt(a.x) + " m/s^2"),
      ro("ay", fmt(a.y) + " m/s^2")
    ];
  }

  function drawIncline(W, H, t) {
    const v = app.values;
    const theta = rad(v.theta);
    const resolvedView = Number(v.resolvedView || 0) === 1;
    const cx = W * 0.5;
    const baseY = H * 0.72;
    const len = Math.min(W * 0.66, H * 0.8);
    const x1 = cx - len * 0.48;
    const y1 = baseY;
    const x2 = x1 + Math.cos(theta) * len;
    const y2 = y1 - Math.sin(theta) * len;
    ctx.strokeStyle = "rgba(255,255,255,.32)";
    ctx.lineWidth = 7;
    line(x1, y1, x2, y2);
    const R = v.mass * G * Math.cos(theta);
    const down = v.mass * G * Math.sin(theta);
    const frictionLimit = v.mu * R;
    const pull = v.push || 0;
    const along = pull - down - Math.sign(pull - down || down) * frictionLimit;
    const a = along / Math.max(0.1, v.mass);
    const slide = clamp(0.5 * a * t * t * 26, -110, 120);
    const px = x1 + Math.cos(theta) * (len * 0.45 + slide);
    const py = y1 - Math.sin(theta) * (len * 0.45 + slide);
    drawBlockOnSlope(px, py, theta);
    const nx = -Math.sin(theta);
    const ny = -Math.cos(theta);
    const tx = Math.cos(theta);
    const ty = -Math.sin(theta);
    if (resolvedView) {
      arrow(px, py, px + tx * -down * 1.15, py + ty * -down * 1.15, colors.orange, 4);
      arrow(px, py, px - nx * R * 0.9, py - ny * R * 0.9, colors.violet, 4);
      arrow(px, py, px, py + 64, "rgba(251,113,133,.45)", 2);
      label(px + tx * -down * 1.2 - 72, py + ty * -down * 1.2, "mg sin theta", colors.orange);
      label(px - nx * R * 0.92 + 8, py - ny * R * 0.92, "mg cos theta", colors.violet);
      label(px + 12, py + 72, "mg", colors.rose);
    } else {
      arrow(px, py, px, py + 78, colors.rose, 4);
      arrow(px, py, px + nx * 78, py + ny * 78, colors.sky, 4);
      if (pull !== 0) arrow(px, py, px + tx * pull * 1.3, py + ty * pull * 1.3, colors.teal, 4);
      const tendency = pull - down;
      const frictionDir = tendency >= 0 ? -1 : 1;
      if (frictionLimit > 0.1) {
        const fLen = Math.min(78, frictionLimit * 1.2);
        arrow(px, py, px + tx * frictionDir * fLen, py + ty * frictionDir * fLen, colors.violet, 4);
        label(px + tx * frictionDir * (fLen + 8), py + ty * frictionDir * (fLen + 8) - 6, "friction", colors.violet);
      }
      label(px + 12, py + 86, "mg", colors.rose);
      label(px + nx * 84, py + ny * 84, "R", colors.sky);
      if (pull !== 0) label(px + tx * pull * 1.3 + 8, py + ty * pull * 1.3, "pull/push", colors.teal);
    }
    label(W * 0.1, H * 0.24, resolvedView ? "Resolved view" : "Force view", colors.goldSoft, "bold 15px Inter");
    label(W * 0.1, H * 0.28, resolvedView ? "Weight has been split parallel and perpendicular to the plane." : "Friction opposes the likely motion along the plane.", colors.dim);
    return [
      ro("mg sin theta", fmt(down) + " N"),
      ro("R", fmt(R) + " N"),
      ro("mu R", fmt(frictionLimit) + " N"),
      ro("net along", fmt(along) + " N"),
      ro("a", fmt(a) + " m/s^2")
    ];
  }

  function drawMomentum(W, H, t) {
    const v = app.values;
    const mode = v.mode;
    if (mode === "wall") return drawWallBounce(W, H, t);
    if (mode === "explosion") return drawExplosion(W, H, t);
    if (mode === "impulse" || mode === "change" || mode === "forceTime") return drawImpulse(W, H, t);
    const data = collision(v);
    const y = H * 0.58;
    drawTrack(y, W);
    const before = t < duration() * 0.5;
    const local = before ? t : t - duration() * 0.5;
    const scale = 24;
    const x1 = W * 0.38 + (before ? v.u1 : data.v1) * local * scale;
    const x2 = W * 0.62 + (before ? v.u2 : data.v2) * local * scale;
    if (Math.abs(t - duration() * 0.5) < 0.15) {
      ctx.fillStyle = "rgba(245,158,11,.2)";
      circle(W * 0.5, y - 25, 64);
    }
    drawCart(x1, y, colors.sky, "A");
    drawCart(x2, y, colors.goldSoft, "B");
    arrow(x1, y - 72, x1 + (before ? v.u1 : data.v1) * 9, y - 72, colors.sky, 3);
    arrow(x2, y - 112, x2 + (before ? v.u2 : data.v2) * 9, y - 112, colors.goldSoft, 3);
    return [
      ro("momentum before", fmt(v.m1 * v.u1 + v.m2 * v.u2)),
      ro("v1 after", fmt(data.v1) + " m/s"),
      ro("v2 after", fmt(data.v2) + " m/s"),
      ro("e", fmt(v.e)),
      ro("mode", mode)
    ];
  }

  function drawImpulse(W, H, t) {
    const v = app.values;
    const y = H * 0.58;
    drawTrack(y, W);
    const impulse = v.force * Math.min(t, 2);
    const dv = impulse / Math.max(0.1, v.m1);
    const x = W * 0.28 + (v.u1 * t + 0.5 * dv * t) * 16;
    drawCart(x, y, colors.sky, "A");
    arrow(x - 70, y - 78, x + 70, y - 78, colors.orange, 5);
    label(x + 78, y - 76, "force over time", colors.orange);
    return [
      ro("impulse", fmt(impulse) + " N s"),
      ro("change in v", fmt(dv) + " m/s"),
      ro("momentum change", fmt(impulse)),
      ro("time", fmt(t) + " s")
    ];
  }

  function drawExplosion(W, H, t) {
    const y = H * 0.58;
    drawTrack(y, W);
    const split = Math.max(0, t - 0.8);
    const x1 = W * 0.5 - split * 90;
    const x2 = W * 0.5 + split * 120;
    drawCart(x1, y, colors.sky, "A");
    drawCart(x2, y, colors.goldSoft, "B");
    if (t < 0.8) label(W * 0.45, y - 95, "before: one system", colors.goldSoft);
    return [
      ro("total momentum", "0"),
      ro("A momentum", "left"),
      ro("B momentum", "right"),
      ro("principle", "equal/opposite")
    ];
  }

  function drawWallBounce(W, H, t) {
    const v = app.values;
    const y = H * 0.58;
    drawTrack(y, W);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    rounded(W * 0.74, y - 130, 22, 130, 4, true);
    const before = t < duration() * 0.5;
    const x = before ? W * 0.25 + t * 95 : W * 0.74 - (t - duration() * 0.5) * 80;
    drawCart(x, y, colors.sky, "ball");
    return [
      ro("before", fmt(v.m1 * Math.abs(v.u1))),
      ro("after", "opposite sign"),
      ro("impulse", "change in p"),
      ro("wall", "external")
    ];
  }

  function drawMoments(W, H) {
    const v = app.values;
    const beam = Math.max(1, v.beam);
    const x0 = W * 0.16;
    const x1 = W * 0.84;
    const y = H * 0.55;
    const sx = (x) => map1(x, 0, beam, x0, x1);
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 9;
    line(x0, y, x1, y);
    const pivot = Math.min(beam, Math.max(0, v.pivot));
    const px = sx(pivot);
    drawPivot(px, y + 8);
    drawLoad(sx(v.x1), y, v.f1, colors.sky, "F1");
    drawLoad(sx(v.x2), y, v.f2, colors.goldSoft, "F2");
    if (v.mode === "angle") {
      const fx = sx(v.x1);
      const a = rad(v.angle);
      arrow(fx, y - 65, fx + Math.cos(a) * 78, y - 65 + Math.sin(a) * 78, colors.teal, 4);
      label(fx + 75, y - 36, "angled force", colors.teal);
    }
    if (["supports", "rod", "nonuniform", "tilt", "twoCase"].includes(v.mode)) {
      drawSupport(sx(beam * 0.15), y + 10, "A");
      drawSupport(sx(beam * 0.85), y + 10, "B");
    }
    const m1 = v.f1 * (v.x1 - pivot);
    const m2 = v.f2 * (v.x2 - pivot);
    const resultant = m1 + m2;
    ctx.strokeStyle = resultant >= 0 ? colors.orange : colors.violet;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(px, y - 8, 58, resultant >= 0 ? -1.5 : 1.5, resultant >= 0 ? 1.2 : -1.2, resultant < 0);
    ctx.stroke();
    return [
      ro("F1 moment", fmt(m1) + " Nm"),
      ro("F2 moment", fmt(m2) + " Nm"),
      ro("resultant", fmt(resultant) + " Nm"),
      ro("state", Math.abs(resultant) < 1 ? "balanced" : "turning")
    ];
  }

  function currentTopic() {
    return TOPICS[app.topicIndex];
  }

  function currentCase() {
    return currentTopic().cases[app.caseIndex];
  }

  function paintReadouts(items) {
    el.readouts.innerHTML = items.map((item) => `
      <div class="readout"><div class="k">${escapeHtml(item.key)}</div><div class="v">${escapeHtml(item.value)}</div></div>
    `).join("");
  }

  function paintHud(lines) {
    el.hud.innerHTML = lines.map((line) => `<div class="hud-line">${escapeHtml(line)}</div>`).join("");
  }

  function updateTimeUi() {
    const T = duration();
    el.timeSlider.value = String(Math.round(1000 * app.t / T));
    el.timeOut.textContent = fmt(app.t) + " s";
  }

  function ro(key, value) {
    return { key, value: String(value) };
  }

  function projectilePath(v, T) {
    if (!Number(v.drag)) {
      const u = v.u || Math.hypot(v.ux || 0, v.uy || 0) || 20;
      const angle = rad(v.angle || 0);
      const ux = v.ux != null ? v.ux : u * Math.cos(angle);
      const uy = v.uy != null ? v.uy : u * Math.sin(angle);
      const ay = v.ay != null ? v.ay : -G;
      const ax = v.ax || 0;
      const pts = [];
      for (let i = 0; i <= 110; i++) {
        const t = T * i / 110;
        pts.push({ x: ux * t + 0.5 * ax * t * t, y: (v.height || 0) + uy * t + 0.5 * ay * t * t });
      }
      return pts;
    }
    const pts = [];
    const dt = T / 160;
    const u = v.u || 20;
    const angle = rad(v.angle || 0);
    let x = 0;
    let y = v.height || 0;
    let vx = u * Math.cos(angle);
    let vy = u * Math.sin(angle);
    for (let i = 0; i <= 160; i++) {
      pts.push({ x, y });
      const drag = Number(v.drag);
      vx += -drag * vx * dt;
      vy += (-G - drag * vy) * dt;
      x += vx * dt;
      y += vy * dt;
      if (y < -3) break;
    }
    return pts;
  }

  function projectileFlight(v) {
    const u = v.u || Math.hypot(v.ux || 0, v.uy || 0) || 20;
    const angle = rad(v.angle || 0);
    const ux = v.ux != null ? v.ux : u * Math.cos(angle);
    const uy = v.uy != null ? v.uy : u * Math.sin(angle);
    const h = v.height || 0;
    const a = 0.5 * G;
    const disc = uy * uy + 4 * a * h;
    const time = Math.max(1, (uy + Math.sqrt(Math.max(0, disc))) / G);
    return { time, range: ux * time };
  }

  function pointAtPath(path, ratio) {
    const i = clamp(Math.round(ratio * (path.length - 1)), 0, path.length - 1);
    return path[i] || { x: 0, y: 0 };
  }

  function velocityNear(path, ratio) {
    const i = clamp(Math.round(ratio * (path.length - 1)), 1, path.length - 2);
    const a = path[i - 1];
    const b = path[i + 1];
    return { x: (b.x - a.x) * 6, y: (b.y - a.y) * 6 };
  }

  function boundsFor(points, pad) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((p) => {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    if (!Number.isFinite(minX)) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    const px = Math.max(pad, (maxX - minX) * 0.1);
    const py = Math.max(pad, (maxY - minY) * 0.16);
    return { minX: minX - px, maxX: maxX + px, minY: minY - py, maxY: maxY + py };
  }

  function mapper(W, H, bounds) {
    const pad = 52;
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const ox = (W - spanX * scale) / 2;
    const oy = (H - spanY * scale) / 2;
    return (x, y) => ({ x: ox + (x - bounds.minX) * scale, y: H - oy - (y - bounds.minY) * scale });
  }

  function drawAxes(map, bounds, xLabel, yLabel) {
    ctx.strokeStyle = "rgba(212,175,55,.42)";
    ctx.lineWidth = 2;
    const xA = map(bounds.minX, 0);
    const xB = map(bounds.maxX, 0);
    const yA = map(0, bounds.minY);
    const yB = map(0, bounds.maxY);
    line(xA.x, xA.y, xB.x, xB.y);
    line(yA.x, yA.y, yB.x, yB.y);
    label(xB.x - 18, xB.y - 8, xLabel, colors.goldSoft, "bold 14px Inter");
    label(yB.x + 8, yB.y + 16, yLabel, colors.goldSoft, "bold 14px Inter");
  }

  function drawGround(map, bounds) {
    const a = map(bounds.minX, 0);
    const b = map(bounds.maxX, 0);
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 3;
    line(a.x, a.y, b.x, b.y);
  }

  function drawPath(map, points, color, width) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const q = map(p.x, p.y);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawVectorArrow(map, start, end, color, text) {
    const a = map(start.x, start.y);
    const b = map(end.x, end.y);
    arrow(a.x, a.y, b.x, b.y, color, 4);
    label(b.x + 8, b.y - 8, text, color, "bold 13px Inter");
  }

  function graphMeta(shape) {
    if (shape === "disp") {
      return {
        axisLabel: "displacement / m",
        fillArea: false,
        areaColor: "rgba(245,158,11,.12)",
        stripLabel: "particle position from s(t)"
      };
    }
    if (shape === "accel") {
      return {
        axisLabel: "acceleration / m s^-2",
        fillArea: true,
        areaColor: "rgba(167,139,250,.17)",
        stripLabel: "velocity change from area"
      };
    }
    if (shape === "speed") {
      return {
        axisLabel: "speed / m s^-1",
        fillArea: true,
        areaColor: "rgba(52,211,153,.17)",
        stripLabel: "distance from positive area"
      };
    }
    return {
      axisLabel: "velocity / m s^-1",
      fillArea: true,
      areaColor: "rgba(45,212,191,.16)",
      stripLabel: "position from signed area"
    };
  }

  function drawGraphTangent(mx, my, t, value, gradient, T) {
    const dt = Math.max(0.3, T * 0.055);
    const t1 = clamp(t - dt, 0, T);
    const t2 = clamp(t + dt, 0, T);
    const y1 = value + gradient * (t1 - t);
    const y2 = value + gradient * (t2 - t);
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 3;
    line(mx(t1), my(y1), mx(t2), my(y2));
    label(mx(t2) + 8, my(y2) - 8, "gradient", colors.orange);
  }

  function drawMotionStrip(W, H, shape, pts, t, T, meta) {
    const samples = [];
    for (let i = 0; i <= 60; i++) {
      samples.push(graphMotionValue(shape, pts, T * i / 60));
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const y = H - 42;
    const left = 92;
    const right = W - 92;
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 4;
    line(left, y, right, y);
    for (let i = 0; i <= 8; i++) {
      const x = left + (right - left) * i / 8;
      line(x, y - 7, x, y + 7, "rgba(255,255,255,.18)", 1);
    }
    const pos = graphMotionValue(shape, pts, t);
    const x = map1(pos, min, max, left, right);
    ctx.fillStyle = colors.goldSoft;
    rounded(x - 25, y - 30, 50, 30, 8, true);
    circle(x - 14, y + 5, 7);
    circle(x + 14, y + 5, 7);
    label(left, y - 18, meta.stripLabel, colors.dim);
    label(x + 32, y - 12, "motion", colors.goldSoft);
  }

  function graphMotionValue(shape, pts, t) {
    if (shape === "disp") return valueOnGraph(pts, t);
    if (shape === "accel") return integrateGraph(pts, t);
    return integrateGraph(pts, t);
  }

  function drawGraphGrid(pad, W, H, minV, maxV, T, mx, my, axisLabel) {
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = mx(T * i / 10);
      line(x, pad.t, x, H - pad.b);
    }
    for (let i = 0; i <= 8; i++) {
      const y = pad.t + i / 8 * (H - pad.t - pad.b);
      line(pad.l, y, W - pad.r, y);
    }
    ctx.strokeStyle = "rgba(212,175,55,.55)";
    ctx.lineWidth = 2;
    line(pad.l, my(0), W - pad.r, my(0));
    line(pad.l, pad.t, pad.l, H - pad.b);
    label(W - 70, H - 78, "time / s", colors.goldSoft);
    label(22, pad.t + 18, axisLabel, colors.goldSoft);
  }

  function graphPoints(shape, T) {
    const table = {
      acb: [{ t: 0, v: 0 }, { t: T * 0.25, v: 10 }, { t: T * 0.68, v: 10 }, { t: T, v: 0 }],
      const: [{ t: 0, v: 7 }, { t: T, v: 7 }],
      disp: [{ t: 0, v: 0 }, { t: T * 0.28, v: 12 }, { t: T * 0.55, v: 12 }, { t: T * 0.78, v: 4 }, { t: T, v: 18 }],
      speed: [{ t: 0, v: 2 }, { t: T * 0.25, v: 8 }, { t: T * 0.62, v: 4 }, { t: T, v: 10 }],
      reverse: [{ t: 0, v: 8 }, { t: T * 0.45, v: 0 }, { t: T, v: -4 }],
      accel: [{ t: 0, v: 2 }, { t: T * 0.28, v: 6 }, { t: T * 0.58, v: -3 }, { t: T, v: 1 }],
      sketch: [{ t: 0, v: 0 }, { t: T * 0.22, v: 8 }, { t: T * 0.5, v: 8 }, { t: T * 0.76, v: -4 }, { t: T, v: 0 }]
    };
    return table[shape] || table.acb;
  }

  function valueOnGraph(pts, t) {
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i].t) {
        const a = pts[i - 1];
        const b = pts[i];
        const r = (t - a.t) / Math.max(0.001, b.t - a.t);
        return a.v + (b.v - a.v) * r;
      }
    }
    return pts[pts.length - 1].v;
  }

  function gradientOnGraph(pts, t) {
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i].t) {
        return (pts[i].v - pts[i - 1].v) / Math.max(0.001, pts[i].t - pts[i - 1].t);
      }
    }
    return 0;
  }

  function integrateGraph(pts, t, absolute) {
    let area = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const end = Math.min(t, b.t);
      if (end <= a.t) continue;
      const va = valueOnGraph(pts, a.t);
      const vb = valueOnGraph(pts, end);
      const segment = 0.5 * (va + vb) * (end - a.t);
      area += absolute ? Math.abs(segment) : segment;
      if (t <= b.t) break;
    }
    return area;
  }

  function forceList(v) {
    const arr = [
      polar(v.f1, v.angle1, colors.sky),
      polar(v.f2, v.angle2, colors.goldSoft),
      polar(v.f3, v.angle3, colors.violet)
    ];
    if (v.mode === "vertical") return [polar(v.f1, 90, colors.sky), polar(v.f2, 270, colors.goldSoft)];
    if (v.mode === "horizontal") return [polar(v.f1, 0, colors.sky), polar(v.f2, 180, colors.goldSoft)];
    if (v.mode === "unknown") {
      const sum = { x: arr[0].x + arr[1].x, y: arr[0].y + arr[1].y };
      arr[2] = { x: -sum.x, y: -sum.y, color: colors.green };
    }
    if (v.mode === "parallel") {
      arr[1] = { x: arr[0].x * 0.65, y: arr[0].y * 0.65, color: colors.goldSoft };
    }
    return arr;
  }

  function drawMiniPolygon(W, H, forces) {
    let p = { x: W * 0.74, y: H * 0.72 };
    label(p.x - 20, p.y - 42, "tip-to-tail", colors.dim);
    forces.forEach((f) => {
      const n = { x: p.x + f.x * 5, y: p.y - f.y * 5 };
      arrow(p.x, p.y, n.x, n.y, f.color, 2.5);
      p = n;
    });
  }

  function collision(v) {
    const denom = v.m1 + v.m2;
    const v1 = ((v.m1 - v.e * v.m2) * v.u1 + (1 + v.e) * v.m2 * v.u2) / denom;
    const v2 = ((v.m2 - v.e * v.m1) * v.u2 + (1 + v.e) * v.m1 * v.u1) / denom;
    if (v.mode === "stick" || v.mode === "coalescing" || currentCase().id === "coalescing") {
      const common = (v.m1 * v.u1 + v.m2 * v.u2) / denom;
      return { v1: common, v2: common };
    }
    return { v1, v2 };
  }

  function drawTrack(y, W) {
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineWidth = 4;
    line(64, y, W - 64, y);
    ctx.strokeStyle = "rgba(255,255,255,.09)";
    ctx.lineWidth = 1;
    for (let x = 80; x < W - 64; x += 52) line(x, y - 8, x, y + 8);
  }

  function drawCart(x, y, color, name) {
    ctx.fillStyle = color;
    rounded(x - 38, y - 36, 76, 36, 8, true);
    ctx.fillStyle = "#071127";
    circle(x - 22, y + 4, 7);
    circle(x + 22, y + 4, 7);
    label(x - 16, y - 13, name, "#071127", "bold 12px Inter");
  }

  function drawBlockOnSlope(x, y, theta) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-theta);
    ctx.fillStyle = colors.goldSoft;
    rounded(-34, -24, 68, 48, 8, true);
    ctx.restore();
  }

  function drawLoad(x, y, force, color, name) {
    arrow(x, y - 76, x, y - 8, color, 4);
    label(x + 8, y - 72, name + " = " + fmt(force) + " N", color);
  }

  function drawPivot(x, y) {
    ctx.fillStyle = colors.goldSoft;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 24, y + 44);
    ctx.lineTo(x + 24, y + 44);
    ctx.closePath();
    ctx.fill();
  }

  function drawSupport(x, y, name) {
    ctx.fillStyle = "rgba(56,189,248,.85)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 20, y + 34);
    ctx.lineTo(x + 20, y + 34);
    ctx.closePath();
    ctx.fill();
    label(x - 5, y + 54, name, colors.sky);
  }

  function polar(mag, degrees, color) {
    const a = rad(degrees);
    return { x: mag * Math.cos(a), y: mag * Math.sin(a), color };
  }

  function dot(x, y, color, text) {
    ctx.fillStyle = color;
    circle(x, y, 7);
    if (text) label(x + 10, y - 10, text, color, "bold 13px Inter");
  }

  function arrow(x1, y1, x2, y2, color, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const a = Math.atan2(dy, dx);
    const head = Math.min(14, len * 0.38);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
    ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  function line(x1, y1, x2, y2, color, width) {
    if (color) ctx.strokeStyle = color;
    if (width) ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function circle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill === false) {
      ctx.strokeStyle = stroke || colors.white;
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }

  function rounded(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function label(x, y, text, color, font) {
    ctx.fillStyle = color || colors.white;
    ctx.font = font || "12px Inter, sans-serif";
    ctx.fillText(text, x, y);
  }

  function map1(v, a, b, c, d) {
    if (Math.abs(b - a) < 1e-9) return (c + d) / 2;
    return c + (v - a) / (b - a) * (d - c);
  }

  function rad(degrees) {
    return degrees * Math.PI / 180;
  }

  function deg(radians) {
    let value = radians * 180 / Math.PI;
    if (value < 0) value += 360;
    return value;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fmt(value) {
    if (!Number.isFinite(Number(value))) return "0";
    const rounded = Math.round(Number(value) * 100) / 100;
    return Math.abs(rounded) < 1e-9 ? "0" : String(rounded);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
}());
