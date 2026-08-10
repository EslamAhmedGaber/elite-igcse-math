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

  const TOPIC_VISUALS = {
    modelling: { icon: "boxes", accent: "#e1b84f", short: "Modelling" },
    vectors: { icon: "move-up-right", accent: "#46b5f7", short: "Vectors" },
    graphs: { icon: "chart-spline", accent: "#7767d8", short: "Graphs" },
    suvat1d: { icon: "timer", accent: "#0f9f8f", short: "SUVAT 1D" },
    suvat2d: { icon: "orbit", accent: "#155eef", short: "SUVAT 2D" },
    forces: { icon: "move-3d", accent: "#e96852", short: "Forces" },
    newton: { icon: "equal", accent: "#209f6f", short: "F = ma" },
    inclines: { icon: "triangle-right", accent: "#dc7c31", short: "Inclines" },
    momentum: { icon: "arrow-left-right", accent: "#2c8cbf", short: "Momentum" },
    moments: { icon: "scale", accent: "#9a5dba", short: "Moments" }
  };

  const STAGE_VISUALS = {
    projectile: { icon: "send", label: "Trajectory" },
    modelling: { icon: "boxes", label: "Model" },
    units: { icon: "ruler", label: "Units" },
    vectors: { icon: "move-up-right", label: "Vectors" },
    graphs: { icon: "chart-spline", label: "Graph" },
    suvat1d: { icon: "timer", label: "Motion" },
    suvat2d: { icon: "orbit", label: "2D motion" },
    forces: { icon: "move-3d", label: "Force system" },
    dynamics: { icon: "gauge", label: "Dynamics" },
    incline: { icon: "triangle-right", label: "Inclined plane" },
    momentum: { icon: "arrow-left-right", label: "Momentum" },
    moments: { icon: "scale", label: "Moments" }
  };

  const analysisColors = {
    cyan: "#46b5f7",
    teal: "#2dd4bf",
    gold: "#f0cf68",
    coral: "#fb7185",
    violet: "#a78bfa",
    green: "#34d399",
    white: "#eaf2ff",
    grid: "rgba(185, 207, 231, 0.13)",
    muted: "#9fb2c9"
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
          mode: "table", m1: 5, m2: 3, mu: 0.15, force: 0, resistance: 0, duration: 6
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

  const CASE_PALETTES = [
    { accent: "#46b5f7", secondary: "#e1b84f", deep: "#06172b", surface: "#10345a", material: "#d7e8f7" },
    { accent: "#2dd4bf", secondary: "#f0cf68", deep: "#061b29", surface: "#0c3b49", material: "#d5f3ed" },
    { accent: "#6ea8ff", secondary: "#fb9b82", deep: "#09182f", surface: "#173865", material: "#d9e7ff" },
    { accent: "#a78bfa", secondary: "#46b5f7", deep: "#10162d", surface: "#302a60", material: "#ebe4ff" },
    { accent: "#34d399", secondary: "#f0cf68", deep: "#071c26", surface: "#17473e", material: "#d8f7e9" },
    { accent: "#fb8f72", secondary: "#46b5f7", deep: "#11182c", surface: "#493047", material: "#ffe1d8" }
  ];

  const PHASE_LABELS = {
    projectile: ["Launch", "Flight", "Apex", "Landing"],
    modelling: ["Assume", "Apply", "Compare", "Decide"],
    units: ["Identify", "Convert", "Check", "Verify"],
    vectors: ["Resolve", "Combine", "Resultant", "Read"],
    graphs: ["Read", "Trace", "Measure", "Conclude"],
    suvat1d: ["Set signs", "Move", "Key event", "Result"],
    suvat2d: ["Resolve", "Flight", "Condition", "Result"],
    forces: ["Isolate", "Resolve", "Balance", "Result"],
    dynamics: ["Free body", "Accelerate", "Link", "Result"],
    incline: ["Resolve", "Friction", "Motion", "Result"],
    momentum: ["Before", "Approach", "Impact", "After"],
    moments: ["Choose pivot", "Load", "Turn", "Balance"]
  };

  const STAGE_ENVIRONMENTS = {
    projectile: "range",
    modelling: "apparatus",
    units: "metrology",
    vectors: "vector-grid",
    graphs: "data-lab",
    suvat1d: "track",
    suvat2d: "range",
    forces: "force-table",
    dynamics: "workshop",
    incline: "incline-rig",
    momentum: "impact-lane",
    moments: "structures"
  };

  const CASE_VISUAL_PROFILES = Object.freeze(buildCaseVisualProfiles());
  const CASE_VISUAL_PROFILE_MAP = new Map(CASE_VISUAL_PROFILES.map((profile) => [profile.key, profile]));

  function buildCaseVisualProfiles() {
    const profiles = [];
    let ordinal = 0;
    TOPICS.forEach((topic, topicIndex) => {
      topic.cases.forEach((item, caseIndex) => {
        ordinal += 1;
        const key = topic.id + ":" + item.id;
        const seed = visualHash(key);
        const palette = CASE_PALETTES[(seed + ordinal + topicIndex) % CASE_PALETTES.length];
        profiles.push(Object.freeze({
          key,
          ordinal,
          signature: "EL-WME01-" + String(ordinal).padStart(3, "0"),
          accent: palette.accent,
          secondary: palette.secondary,
          deep: palette.deep,
          surface: palette.surface,
          material: palette.material,
          environment: STAGE_ENVIRONMENTS[item.stage] || "apparatus",
          phases: casePhaseLabels(item),
          grid: 32 + (seed % 3) * 8,
          cameraShift: ((seed % 9) - 4) * 0.008,
          objectScale: 0.94 + (seed % 7) * 0.018,
          impactRatio: 0.48 + (seed % 7) * 0.012,
          topicIndex,
          caseIndex
        }));
      });
    });
    return profiles;
  }

  function visualHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function casePhaseLabels(item) {
    if (item.stage === "momentum") {
      const mode = item.defaults && item.defaults.mode;
      if (mode === "basic") return ["Ready", "Motion", "Measure", "Result"];
      if (["impulse", "change", "forceTime"].includes(mode)) return ["Initial", "Force acts", "Impulse set", "Coast"];
      if (mode === "explosion") return ["Together", "Stored", "Separation", "Apart"];
      if (mode === "wall") return ["Ready", "Approach", "Contact", "Rebound"];
    }
    return (PHASE_LABELS[item.stage] || ["Set up", "Run", "Observe", "Result"]).slice();
  }

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
    const presets = {
      vertical: { f1: 12, f2: 12, f3: 0, angle1: 90, angle2: 270, angle3: 0 },
      horizontal: { f1: 12, f2: 12, f3: 0, angle1: 0, angle2: 180, angle3: 0 },
      multi: { f1: 12, f2: 12, f3: 12, angle1: 0, angle2: 120, angle3: 240 },
      expressions: { f1: 12, f2: 12, f3: 12, angle1: 0, angle2: 120, angle3: 240 },
      relationships: { f1: 12, f2: 12, f3: 12, angle1: 0, angle2: 120, angle3: 240 }
    };
    return caseDef(id, title, "forces", purpose, tags, Object.assign({
      mode, f1: 12, f2: 9, f3: 7, angle1: 0, angle2: 120, angle3: 240
    }, presets[mode] || {}), [
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
    const presets = {
      basic: { m1: 5, u1: 7, m2: 3, u2: 0, e: 0.6, force: 18, duration: 5 },
      impulse: { m1: 4, u1: 2, m2: 3, u2: 0, e: 0.6, force: 16, duration: 5 },
      change: { m1: 6, u1: -2, m2: 3, u2: 0, e: 0.6, force: 24, duration: 5 },
      same: { m1: 4, u1: 8, m2: 3, u2: 3, e: 0.65, force: 18, duration: 6 },
      opposite: { m1: 5, u1: 7, m2: 3, u2: -5, e: 0.72, force: 18, duration: 6 },
      stick: { m1: 4, u1: 7, m2: 5, u2: -2, e: 0, force: 18, duration: 6 },
      explosion: { m1: 3, u1: -5, m2: 5, u2: 3, e: 0, force: 28, duration: 5 },
      wall: { m1: 2, u1: 8, m2: 3, u2: 0, e: 0.7, force: 18, duration: 5 },
      forceTime: { m1: 5, u1: 1, m2: 3, u2: 0, e: 0.6, force: 20, duration: 6 },
      follow: { m1: 4, u1: 9, m2: 6, u2: 2, e: 0.45, force: 14, duration: 7 },
      ambiguous: { m1: 3, u1: 6, m2: 4, u2: -3, e: 0.8, force: 18, duration: 6 }
    };
    return caseDef(id, title, "momentum", purpose, tags, Object.assign({ mode }, presets[mode]), [
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
    const presets = {
      single: { f2: 0, x1: 7 },
      angle: { f2: 0, x1: 7 },
      supports: { f1: 30, x1: 2, f2: 30, x2: 6, weight: 0 },
      rod: { f1: 24, x1: 7, f2: 0, weight: 40, pivot: 2 },
      nonuniform: { f1: 24, x1: 1, f2: 0, x2: 5.5, weight: 40 },
      tilt: { f1: 70, x1: 8, f2: 0, weight: 30 },
      seesaw: { f1: 30, x1: 2, f2: 30, x2: 6, weight: 0 },
      lamina: { f1: 30, x1: 2, f2: 18, x2: 6, weight: 34 },
      twoCase: { f1: 35, x1: 1, f2: 22, x2: 7, weight: 42 }
    };
    return caseDef(id, title, "moments", purpose, tags, Object.assign({
      mode, beam: 8, pivot: 4, f1: 30, x1: 2, f2: 20, x2: 7, angle: 55, weight: 40
    }, presets[mode] || {}), [
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
    eventJumps: document.getElementById("eventJumps"),
    pinMeasurementA: document.getElementById("pinMeasurementA"),
    pinMeasurementB: document.getElementById("pinMeasurementB"),
    clearMeasurements: document.getElementById("clearMeasurements"),
    exportMeasurements: document.getElementById("exportMeasurements"),
    comparisonTable: document.getElementById("comparisonTable"),
    measurementStatus: document.getElementById("measurementStatus"),
    formulaTrail: document.getElementById("formulaTrail"),
    examMoves: document.getElementById("examMoves"),
    canvas: document.getElementById("labCanvas"),
    analysisCanvas: document.getElementById("analysisCanvas"),
    analysisTitle: document.getElementById("analysisTitle"),
    analysisLegend: document.getElementById("analysisLegend"),
    analysisSummary: document.getElementById("analysisSummary"),
    visualStage: document.getElementById("visualStage"),
    viewModes: document.getElementById("viewModes"),
    sceneState: document.getElementById("sceneState"),
    experimentPhase: document.getElementById("experimentPhase"),
    caseOrdinal: document.getElementById("caseOrdinal"),
    caseSignature: document.getElementById("caseSignature"),
    phaseRail: document.getElementById("phaseRail"),
    hud: document.getElementById("hud"),
    timeSlider: document.getElementById("timeSlider"),
    timeOut: document.getElementById("timeOut"),
    speed: document.getElementById("speed"),
    speedButtons: document.getElementById("speedButtons"),
    playPause: document.getElementById("playPause"),
    playIcon: document.getElementById("playIcon"),
    stagePlay: document.getElementById("stagePlay"),
    stageReset: document.getElementById("stageReset"),
    stageStepBack: document.getElementById("stageStepBack"),
    stageCapture: document.getElementById("stageCapture"),
    stageFullscreen: document.getElementById("stageFullscreen"),
    reset: document.getElementById("reset"),
    stepBack: document.getElementById("stepBack"),
    inspectorTabs: document.querySelector(".inspector-tabs")
  };

  const ctx = el.canvas.getContext("2d");
  const analysisCtx = el.analysisCanvas.getContext("2d");
  const app = {
    topicIndex: 0,
    caseIndex: 0,
    values: {},
    t: 0,
    playing: false,
    last: 0,
    speed: 1,
    query: "",
    viewMode: window.matchMedia("(max-width: 720px)").matches ? "scene" : "split",
    inspectorTab: "overview",
    lastReadouts: [],
    measurements: { a: null, b: null },
    raf: null
  };

  function init() {
    document.documentElement.dataset.labRelease = "20260809i";
    document.documentElement.dataset.labTopics = String(TOPICS.length);
    document.documentElement.dataset.labCases = String(TOPICS.reduce((sum, topic) => sum + topic.cases.length, 0));
    document.documentElement.dataset.labProfiles = String(CASE_VISUAL_PROFILES.length);
    document.documentElement.dataset.labUniqueProfiles = String(new Set(CASE_VISUAL_PROFILES.map((profile) => profile.signature)).size);
    document.documentElement.dataset.labMeasurementSlots = "2";
    buildTopicRail();
    buildLabStats();
    buildQuickLabs();
    bindLabSearch();
    bindStudioControls();
    const params = new URLSearchParams(location.search);
    const requested = params.get("topic");
    const idx = TOPICS.findIndex((topic) => topic.id === requested);
    if (idx >= 0) app.topicIndex = idx;
    selectTopic(app.topicIndex);
    bindTransport();
    applyViewMode(app.viewMode);
    refreshIcons();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    requestAnimationFrame(loop);
  }

  function buildTopicRail() {
    el.topicRail.innerHTML = TOPICS.map((topic, index) => {
      const visual = topicVisual(topic.id);
      const number = String(index + 1).padStart(2, "0");
      return `
        <button class="topic-tab" type="button" data-index="${index}" aria-label="${escapeHtml(topic.title)}" style="--topic-accent:${visual.accent}">
          <span class="topic-icon"><i data-lucide="${visual.icon}" aria-hidden="true"></i></span>
          <span class="topic-number">${number}</span>
          <span class="topic-name">${escapeHtml(visual.short)}</span>
        </button>`;
    }).join("");
    el.topicRail.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectTopic(Number(button.dataset.index)));
    });
    refreshIcons();
  }

  function selectTopic(index) {
    app.topicIndex = index;
    app.caseIndex = 0;
    el.topicRail.querySelectorAll("button").forEach((button, i) => {
      button.classList.toggle("is-active", i === index);
      button.setAttribute("aria-current", i === index ? "true" : "false");
    });
    const topic = currentTopic();
    const visual = topicVisual(topic.id);
    document.documentElement.style.setProperty("--active-topic", visual.accent);
    el.topicTitle.textContent = topic.title;
    el.topicSubtitle.textContent = topic.subtitle;
    el.caseSelect.innerHTML = topic.cases.map((item, i) => (
      `<option value="${i}">${String(i + 1).padStart(2, "0")} | ${escapeHtml(item.title)}</option>`
    )).join("");
    el.caseSelect.onchange = () => selectCase(Number(el.caseSelect.value));
    renderExperimentCards();
    selectCase(0);
    refreshIcons();
  }

  function selectCase(index) {
    app.caseIndex = index;
    app.t = 0;
    setPlaying(false);
    el.caseSelect.value = String(index);
    const item = currentCase();
    const profile = currentProfile();
    app.values = Object.assign({}, item.defaults || {});
    clearMeasurementData(false);
    el.caseChip.textContent = "Lab " + String(profile.ordinal).padStart(2, "0") + " / " + CASE_VISUAL_PROFILES.length;
    document.documentElement.style.setProperty("--case-accent", profile.accent);
    document.documentElement.style.setProperty("--case-secondary", profile.secondary);
    if (el.caseOrdinal) el.caseOrdinal.textContent = String(profile.ordinal).padStart(2, "0") + " / " + CASE_VISUAL_PROFILES.length;
    if (el.caseSignature) el.caseSignature.textContent = profile.signature;
    el.casePurpose.textContent = item.purpose;
    if (el.analysisTitle) {
      el.analysisTitle.textContent = (STAGE_VISUALS[item.stage] || { label: "Live" }).label + " analysis";
    }
    if (el.sceneState) el.sceneState.textContent = "Ready";
    el.caseTags.innerHTML = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    buildControls(item);
    buildFormula(item);
    updateCaseSequence();
    updateSymbolPanel();
    syncBrowserActive();
    render();
    refreshIcons();
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
        clearMeasurementData(false);
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
        clearMeasurementData(false);
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

  function bindStudioControls() {
    if (el.viewModes) {
      el.viewModes.querySelectorAll("[data-view-mode]").forEach((button) => {
        button.addEventListener("click", () => applyViewMode(button.dataset.viewMode));
      });
    }
    if (el.inspectorTabs) {
      const tabs = Array.from(el.inspectorTabs.querySelectorAll("[data-inspector-tab]"));
      tabs.forEach((button, index) => {
        button.addEventListener("click", () => selectInspectorTab(button.dataset.inspectorTab, false));
        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = tabs.length - 1;
          selectInspectorTab(tabs[next].dataset.inspectorTab, true);
        });
      });
    }
    selectInspectorTab(app.inspectorTab, false);
  }

  function selectInspectorTab(name, focus) {
    const valid = ["overview", "variables", "method"];
    app.inspectorTab = valid.includes(name) ? name : "overview";
    document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
      const active = button.dataset.inspectorTab === app.inspectorTab;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    document.querySelectorAll("[data-inspector-panel]").forEach((panel) => {
      const active = panel.dataset.inspectorPanel === app.inspectorTab;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function applyViewMode(mode) {
    const valid = ["scene", "split", "graph"];
    app.viewMode = valid.includes(mode) ? mode : "split";
    if (el.visualStage) el.visualStage.dataset.view = app.viewMode;
    if (el.viewModes) {
      el.viewModes.querySelectorAll("[data-view-mode]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.viewMode === app.viewMode ? "true" : "false");
      });
    }
    requestAnimationFrame(resize);
  }

  function topicVisual(id) {
    return TOPIC_VISUALS[id] || { icon: "activity", accent: "#155eef", short: id };
  }

  function stageVisual(stage) {
    return STAGE_VISUALS[stage] || { icon: "activity", label: "Experiment" };
  }

  function currentProfile() {
    const topic = currentTopic();
    const item = currentCase();
    return CASE_VISUAL_PROFILE_MAP.get(topic.id + ":" + item.id) || CASE_VISUAL_PROFILES[0];
  }

  function phaseBoundaries() {
    const profile = currentProfile();
    const contactRatio = Math.max(0.2, Math.min(0.48, duration() * 0.065)) / duration();
    let boundaries = [0.08, 0.48, 0.76];
    if (currentCase().stage === "momentum") {
      const mode = app.values.mode;
      if (mode === "explosion") {
        boundaries = [0.06, 0.25, 0.32];
      } else if (["impulse", "change", "forceTime"].includes(mode)) {
        const pulseRatio = Math.min(2, duration() * 0.4) / duration();
        boundaries = [0.02, pulseRatio, Math.min(0.9, pulseRatio + 0.08)];
      } else if (mode === "basic") {
        boundaries = [0.06, 0.52, 0.84];
      } else {
        boundaries = [0.08, profile.impactRatio, Math.min(0.9, profile.impactRatio + contactRatio)];
      }
    }
    return boundaries;
  }

  function simulationPhase(t) {
    const profile = currentProfile();
    const progress = clamp(t / Math.max(0.001, duration()), 0, 1);
    const boundaries = phaseBoundaries();
    let index = 0;
    if (progress >= boundaries[0]) index = 1;
    if (progress >= boundaries[1]) index = 2;
    if (progress >= boundaries[2]) index = 3;
    return { index, progress, label: profile.phases[index] };
  }

  function paintPhaseRail(t) {
    if (!el.phaseRail) return;
    const profile = currentProfile();
    const phase = simulationPhase(t);
    el.phaseRail.style.setProperty("--phase-progress", Math.round(phase.progress * 100) + "%");
    el.phaseRail.innerHTML = profile.phases.map((name, index) => {
      const state = index < phase.index ? " is-complete" : (index === phase.index ? " is-active" : "");
      return `<span class="phase-step${state}"><span>${escapeHtml(name)}</span></span>`;
    }).join("");
    document.documentElement.dataset.labPhase = phase.label;
    document.documentElement.dataset.labSignature = profile.signature;
    document.documentElement.dataset.labCase = currentCase().id;
    if (el.sceneState) el.sceneState.textContent = app.playing ? phase.label : (t > 0 ? phase.label : "Ready");
  }

  function refreshIcons() {
    if (!window.lucide || typeof window.lucide.createIcons !== "function") return;
    try {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    } catch (error) {
      // Text labels remain usable when an icon name is unavailable.
    }
  }

  function bindTransport() {
    const stepBack = () => {
      app.t = Math.max(0, app.t - 0.25);
      setPlaying(false);
      render();
    };
    el.playPause.addEventListener("click", () => {
      setPlaying(!app.playing);
    });
    el.reset.addEventListener("click", () => {
      resetSimulation();
    });
    el.stepBack.addEventListener("click", () => {
      stepBack();
    });
    el.timeSlider.addEventListener("input", () => {
      app.t = duration() * Number(el.timeSlider.value) / 1000;
      setPlaying(false);
      render();
    });
    el.speed.addEventListener("change", () => {
      app.speed = Number(el.speed.value);
      syncSpeedButtons();
    });
    if (el.speedButtons) {
      el.speedButtons.querySelectorAll("[data-speed]").forEach((button) => {
        button.addEventListener("click", () => {
          app.speed = Number(button.dataset.speed);
          el.speed.value = String(app.speed);
          syncSpeedButtons();
        });
      });
      syncSpeedButtons();
    }
    if (el.stagePlay) {
      el.stagePlay.addEventListener("click", () => {
        setPlaying(!app.playing);
      });
    }
    if (el.stageReset) {
      el.stageReset.addEventListener("click", resetSimulation);
    }
    if (el.stageStepBack) {
      el.stageStepBack.addEventListener("click", stepBack);
    }
    if (el.stageCapture) {
      el.stageCapture.addEventListener("click", captureLabImage);
    }
    if (el.stageFullscreen) {
      el.stageFullscreen.addEventListener("click", toggleStageFullscreen);
      document.addEventListener("fullscreenchange", updateFullscreenButton);
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
    if (el.pinMeasurementA) {
      el.pinMeasurementA.addEventListener("click", () => captureMeasurement("a"));
    }
    if (el.pinMeasurementB) {
      el.pinMeasurementB.addEventListener("click", () => captureMeasurement("b"));
    }
    if (el.clearMeasurements) {
      el.clearMeasurements.addEventListener("click", () => clearMeasurementData(true));
    }
    if (el.exportMeasurements) {
      el.exportMeasurements.addEventListener("click", exportMeasurementCsv);
    }
    if (el.eventJumps) {
      el.eventJumps.addEventListener("click", (event) => {
        const button = event.target.closest("[data-event-time]");
        if (!button) return;
        app.t = clamp(Number(button.dataset.eventTime || 0), 0, duration());
        setPlaying(false);
        render();
      });
    }
  }

  function startPlayback() {
    setPlaying(true);
  }

  function resetSimulation() {
    app.t = 0;
    setPlaying(false);
    if (el.sceneState) el.sceneState.textContent = "Ready";
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
    if (el.stagePlay) {
      const text = el.stagePlay.querySelector("span");
      if (text) text.textContent = label;
    }
    updateControlIcon(el.playPause, app.playing ? "pause" : "play");
    updateControlIcon(el.stagePlay, app.playing ? "pause" : "play");
    if (el.sceneState) {
      el.sceneState.textContent = app.playing ? "Running" : (app.t > 0 ? "Paused" : "Ready");
      el.sceneState.classList.toggle("is-running", app.playing);
    }
    refreshIcons();
  }

  function syncSpeedButtons() {
    if (!el.speedButtons) return;
    el.speedButtons.querySelectorAll("[data-speed]").forEach((button) => {
      const active = Number(button.dataset.speed) === Number(app.speed);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateControlIcon(button, name) {
    if (!button) return;
    const current = button.querySelector("svg, [data-lucide]");
    if (!current || current.getAttribute("data-lucide") === name) return;
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    icon.setAttribute("aria-hidden", "true");
    if (current.id) icon.id = current.id;
    current.replaceWith(icon);
  }

  function toggleStageFullscreen() {
    const stage = document.querySelector(".stage-panel");
    if (!stage) return;
    if (stage.classList.contains("is-theatre")) {
      setTheatreMode(false);
      return;
    }
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        const exit = document.exitFullscreen();
        if (exit && typeof exit.catch === "function") exit.catch(() => setTheatreMode(false));
      }
    } else if (stage.requestFullscreen) {
      const request = stage.requestFullscreen();
      if (request && typeof request.catch === "function") request.catch(() => setTheatreMode(true));
    } else {
      setTheatreMode(true);
    }
  }

  function updateFullscreenButton() {
    const stage = document.querySelector(".stage-panel");
    const active = Boolean(document.fullscreenElement) || Boolean(stage && stage.classList.contains("is-theatre"));
    updateControlIcon(el.stageFullscreen, active ? "minimize-2" : "maximize-2");
    if (el.stageFullscreen) {
      el.stageFullscreen.setAttribute("aria-label", active ? "Exit experiment fullscreen" : "Open experiment fullscreen");
      el.stageFullscreen.title = active ? "Exit experiment fullscreen" : "Open experiment fullscreen";
    }
    refreshIcons();
    requestAnimationFrame(resize);
  }

  function setTheatreMode(active) {
    const stage = document.querySelector(".stage-panel");
    const studio = document.querySelector(".lab-studio");
    if (!stage || !studio) return;
    stage.classList.toggle("is-theatre", Boolean(active));
    studio.classList.toggle("is-theatre-mode", Boolean(active));
    updateFullscreenButton();
  }

  function captureLabImage() {
    const output = document.createElement("canvas");
    output.width = 1600;
    output.height = 900;
    const outputCtx = output.getContext("2d");
    outputCtx.fillStyle = "#061526";
    outputCtx.fillRect(0, 0, output.width, output.height);
    outputCtx.fillStyle = "#e1b84f";
    outputCtx.font = "700 18px Sora, sans-serif";
    outputCtx.fillText("ELITE MECHANICS 1 LAB", 40, 42);
    outputCtx.fillStyle = "#ffffff";
    outputCtx.font = "700 30px Sora, sans-serif";
    outputCtx.fillText(currentTopic().title, 40, 82);
    outputCtx.fillStyle = "#aebed1";
    outputCtx.font = "18px Sora, sans-serif";
    outputCtx.fillText(currentProfile().signature + " | " + currentCase().title + " | t = " + fmt(app.t) + " s", 40, 112);
    outputCtx.drawImage(el.canvas, 40, 140, 930, 680);
    outputCtx.drawImage(el.analysisCanvas, 990, 140, 570, 680);
    outputCtx.fillStyle = "#aebed1";
    outputCtx.font = "15px Sora, sans-serif";
    outputCtx.fillText("Edexcel IAL WME01 | Dr Eslam Ahmed", 40, 862);
    const save = (url) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = "elite-wme01-" + currentCase().id.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
    save(output.toDataURL("image/png"));
    updateControlIcon(el.stageCapture, "check");
    refreshIcons();
    window.setTimeout(() => {
      updateControlIcon(el.stageCapture, "camera");
      refreshIcons();
    }, 900);
  }

  function resize() {
    resizeCanvas(el.canvas, ctx);
    resizeCanvas(el.analysisCanvas, analysisCtx);
    render();
  }

  function resizeCanvas(canvas, context) {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    const W = Math.max(360, rect.width);
    const H = Math.max(320, rect.height);
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
        readouts = drawModelling(W, H, t);
        hud = ["Particle model ignores the place where the force is applied.", "Rigid body model keeps the turning effect."];
        break;
      case "units":
        readouts = drawUnits(W, H, t);
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
        readouts = drawForces(W, H, t);
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
        hud = ["Momentum is signed, so direction stays visible.", "The contact interval transfers impulse; the energy gauge shows what is retained."];
        break;
      case "moments":
        readouts = drawMoments(W, H, t);
        hud = ["Clockwise and anticlockwise moments compete about the pivot.", "At tipping, one support reaction is zero."];
        break;
      default:
        readouts = [];
    }
    drawMotionTelemetry(W, H, t);
    drawCaseStamp(W, H);
    const analysisRect = el.analysisCanvas.getBoundingClientRect();
    drawAnalysis(Math.max(280, analysisRect.width), Math.max(280, analysisRect.height), t, readouts);
    paintReadouts(readouts);
    app.lastReadouts = readouts;
    paintHud(hud);
    paintDataSnapshot(readouts);
    updateTimeUi();
    paintPhaseRail(t);
    paintMeasurementBench(readouts, t);
  }

  function buildLabStats() {
    if (!el.labStats) return;
    const totalCases = allCaseEntries().length;
    const totalTags = new Set(allCaseEntries().flatMap((entry) => entry.item.tags || [])).size;
    const stats = [
      ["10", "mechanics topics"],
      [String(totalCases), "working cases"],
      [String(LAB_SYMBOLS.length), "symbol cards"],
      [String(totalTags), "exam tags"],
      ["5", "quick starts"],
      ["live", "canvas lab"]
    ];
    const accents = ["#155eef", "#0f9f8f", "#7767d8", "#e96852", "#e1b84f", "#209f6f"];
    el.labStats.innerHTML = stats.map(([value, label], index) => `
      <div class="lab-stat" style="--stat-accent:${accents[index]}">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `).join("");
  }

  function buildQuickLabs() {
    if (!el.quickLabGrid) return;
    el.quickLabGrid.innerHTML = QUICK_STARTS.map((item) => {
      const topic = TOPICS.find((entry) => entry.id === item.topicId);
      const experiment = topic ? topic.cases.find((entry) => entry.id === item.caseId) : null;
      const visual = topicVisual(item.topicId);
      const stage = stageVisual(experiment ? experiment.stage : "");
      return `
        <article class="quick-lab" data-topic-id="${escapeHtml(item.topicId)}" data-case-id="${escapeHtml(item.caseId)}" style="--card-accent:${visual.accent}">
          <span class="quick-icon"><i data-lucide="${stage.icon}" aria-hidden="true"></i></span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <div class="case-card-actions" aria-label="${escapeHtml(item.title)} controls">
            <button class="case-action-btn play" type="button" data-action="play"><i data-lucide="play" aria-hidden="true"></i><span>Play</span></button>
            <button class="case-action-btn reset" type="button" data-action="reset"><i data-lucide="rotate-ccw" aria-hidden="true"></i><span>Reset</span></button>
          </div>
        </article>`;
    }).join("");
    bindCardControls(el.quickLabGrid);
    refreshIcons();
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
    refreshIcons();
  }

  function experimentCard(entry) {
    const symbols = symbolsForCase(entry.item).slice(0, 4);
    const profile = CASE_VISUAL_PROFILE_MAP.get(entry.topic.id + ":" + entry.item.id);
    const stage = stageVisual(entry.item.stage);
    return `
      <article class="experiment-card" data-topic-index="${entry.topicIndex}" data-case-index="${entry.caseIndex}" style="--card-accent:${profile.accent};--card-secondary:${profile.secondary}">
        <div class="experiment-meta">
          <span class="experiment-symbol experiment-topic">${escapeHtml(entry.topic.label)}</span>
          <span class="experiment-symbol">${escapeHtml(profile.signature)}</span>
        </div>
        <span class="experiment-icon"><i data-lucide="${stage.icon}" aria-hidden="true"></i></span>
        <div class="card-title-row">
          <strong>${escapeHtml(entry.item.title)}</strong>
          <div class="case-card-actions" aria-label="${escapeHtml(entry.item.title)} controls">
            <button class="case-action-btn play" type="button" data-action="play"><i data-lucide="play" aria-hidden="true"></i><span>Play</span></button>
            <button class="case-action-btn reset" type="button" data-action="reset"><i data-lucide="rotate-ccw" aria-hidden="true"></i><span>Reset</span></button>
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

  function measurementEvents() {
    const profile = currentProfile();
    const starts = [0, ...phaseBoundaries()].slice(0, profile.phases.length);
    return profile.phases.map((label, index) => ({
      label,
      time: starts[index] * duration()
    }));
  }

  function paintEventJumps(t) {
    if (!el.eventJumps) return;
    const events = measurementEvents();
    const key = currentProfile().signature + ":" + fmt(duration());
    if (el.eventJumps.dataset.eventKey !== key) {
      el.eventJumps.dataset.eventKey = key;
      el.eventJumps.innerHTML = events.map((event, index) => `
        <button type="button" data-event-time="${event.time}" data-event-index="${index}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(event.label)}</strong>
          <em>${fmt(event.time)} s</em>
        </button>
      `).join("");
    }
    const active = simulationPhase(t).index;
    el.eventJumps.querySelectorAll("[data-event-index]").forEach((button) => {
      const isActive = Number(button.dataset.eventIndex) === active;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "step" : "false");
    });
  }

  function captureMeasurement(slot) {
    const key = slot === "b" ? "b" : "a";
    app.measurements[key] = {
      caseId: currentCase().id,
      signature: currentProfile().signature,
      topic: currentTopic().title,
      title: currentCase().title,
      time: app.t,
      readouts: Object.fromEntries(app.lastReadouts.map((row) => [row.key, row.value]))
    };
    paintMeasurementBench(app.lastReadouts, app.t);
  }

  function clearMeasurementData(announce) {
    app.measurements = { a: null, b: null };
    updateMeasurementButtons();
    if (el.measurementStatus) {
      el.measurementStatus.textContent = announce ? "Pinned measurements cleared" : "No measurements pinned";
    }
    document.documentElement.dataset.labMeasurements = "0";
  }

  function updateMeasurementButtons() {
    const a = Boolean(app.measurements.a);
    const b = Boolean(app.measurements.b);
    if (el.pinMeasurementA) {
      el.pinMeasurementA.classList.toggle("is-pinned", a);
      el.pinMeasurementA.setAttribute("aria-pressed", String(a));
    }
    if (el.pinMeasurementB) {
      el.pinMeasurementB.classList.toggle("is-pinned", b);
      el.pinMeasurementB.setAttribute("aria-pressed", String(b));
    }
    if (el.clearMeasurements) el.clearMeasurements.disabled = !a && !b;
    if (el.exportMeasurements) el.exportMeasurements.disabled = !a && !b;
  }

  function parsedMeasurement(value) {
    const text = String(value || "").trim();
    const match = text.match(/^([-+]?(?:\d+(?:\.\d+)?|\.\d+))(.*)$/);
    if (!match) return null;
    return { number: Number(match[1]), unit: match[2].trim() };
  }

  function measurementDelta(aValue, bValue) {
    if (aValue == null || bValue == null) return "-";
    const a = parsedMeasurement(aValue);
    const b = parsedMeasurement(bValue);
    if (!a || !b || a.unit !== b.unit) return aValue === bValue ? "0" : "changed";
    const delta = b.number - a.number;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${fmt(delta)}${a.unit ? " " + a.unit : ""}`;
  }

  function paintMeasurementBench(readouts, t) {
    paintEventJumps(t);
    if (!el.comparisonTable) return;
    const live = Object.fromEntries((readouts || []).map((row) => [row.key, row.value]));
    const a = app.measurements.a?.readouts || {};
    const b = app.measurements.b?.readouts || {};
    const keys = [...new Set([...Object.keys(live), ...Object.keys(a), ...Object.keys(b)])].slice(0, 8);
    const body = keys.length ? keys.map((key) => `
      <tr>
        <th scope="row">${escapeHtml(key)}</th>
        <td>${escapeHtml(live[key] ?? "-")}</td>
        <td>${escapeHtml(a[key] ?? "-")}</td>
        <td>${escapeHtml(b[key] ?? "-")}</td>
        <td>${escapeHtml(measurementDelta(a[key], b[key]))}</td>
      </tr>
    `).join("") : `<tr><td colspan="5">No numerical readouts for this frame.</td></tr>`;
    el.comparisonTable.innerHTML = `
      <thead><tr><th>Quantity</th><th>Live</th><th>A</th><th>B</th><th>&Delta; B-A</th></tr></thead>
      <tbody>${body}</tbody>
    `;

    const labels = [];
    if (app.measurements.a) labels.push(`A ${fmt(app.measurements.a.time)} s`);
    if (app.measurements.b) labels.push(`B ${fmt(app.measurements.b.time)} s`);
    if (el.measurementStatus) {
      el.measurementStatus.textContent = labels.length ? labels.join(" | ") : `Live ${fmt(t)} s | No measurements pinned`;
    }
    document.documentElement.dataset.labMeasurements = String(labels.length);
    updateMeasurementButtons();
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportMeasurementCsv() {
    const a = app.measurements.a;
    const b = app.measurements.b;
    if (!a && !b) return;
    const aRows = a?.readouts || {};
    const bRows = b?.readouts || {};
    const keys = [...new Set([...Object.keys(aRows), ...Object.keys(bRows)])];
    const rows = [
      ["Elite WME01 Mechanics Lab"],
      ["Topic", currentTopic().title],
      ["Experiment", currentCase().title],
      ["Signature", currentProfile().signature],
      ["A time (s)", a ? fmt(a.time) : ""],
      ["B time (s)", b ? fmt(b.time) : ""],
      [],
      ["Quantity", "A", "B", "Delta B-A"],
      ...keys.map((key) => [key, aRows[key] || "", bRows[key] || "", measurementDelta(aRows[key], bRows[key])])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `elite-wme01-${currentCase().id}-measurements.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    const profile = currentProfile();
    const horizon = H * (0.67 + profile.cameraShift);
    const light = ctx.createLinearGradient(0, 0, 0, H);
    light.addColorStop(0, profile.surface);
    light.addColorStop(0.58, profile.deep);
    light.addColorStop(1, "#030b16");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);

    drawEnvironment(profile.environment, W, H, horizon, profile);

    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = "rgba(220,236,252,.075)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += profile.grid) line(x, 0, x, H);
    for (let y = 0; y < H; y += profile.grid) line(0, y, W, y);
    ctx.restore();

    const shade = ctx.createLinearGradient(0, 0, W, 0);
    shade.addColorStop(0, "rgba(1,8,18,.34)");
    shade.addColorStop(0.18, "rgba(1,8,18,0)");
    shade.addColorStop(0.82, "rgba(1,8,18,0)");
    shade.addColorStop(1, "rgba(1,8,18,.34)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEnvironment(environment, W, H, horizon, profile) {
    ctx.save();
    if (environment === "range") {
      const ground = ctx.createLinearGradient(0, horizon, 0, H);
      ground.addColorStop(0, "rgba(30,72,86,.74)");
      ground.addColorStop(1, "rgba(5,24,35,.94)");
      ctx.fillStyle = ground;
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.strokeStyle = "rgba(202,231,243,.22)";
      ctx.lineWidth = 2;
      line(0, horizon, W, horizon);
      for (let x = 0; x < W; x += Math.max(48, profile.grid * 2)) {
        line(x, horizon, W * 0.5 + (x - W * 0.5) * 1.8, H, "rgba(170,214,226,.08)", 1);
      }
    } else if (["track", "impact-lane", "workshop"].includes(environment)) {
      ctx.fillStyle = "rgba(6,23,38,.82)";
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.strokeStyle = "rgba(198,220,239,.13)";
      ctx.lineWidth = 1;
      for (let y = horizon; y < H; y += 28) line(0, y, W, y);
      for (let x = 0; x <= W; x += 90) line(W * 0.5, horizon, x, H, "rgba(198,220,239,.08)", 1);
      ctx.fillStyle = "rgba(255,255,255,.035)";
      for (let x = 22; x < W; x += 92) rounded(x, 72, 64, 26, 4, true);
    } else if (environment === "incline-rig") {
      ctx.fillStyle = "rgba(6,24,40,.78)";
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.strokeStyle = "rgba(213,230,246,.12)";
      line(0, horizon, W, horizon);
      for (let x = 40; x < W; x += 88) {
        line(x, horizon, x + 40, H, "rgba(213,230,246,.07)", 1);
      }
    } else if (environment === "structures") {
      ctx.strokeStyle = "rgba(195,218,239,.12)";
      ctx.lineWidth = 6;
      line(W * 0.08, horizon, W * 0.08, H);
      line(W * 0.92, horizon, W * 0.92, H);
      line(W * 0.08, horizon, W * 0.92, horizon);
      ctx.lineWidth = 1;
      for (let x = W * 0.16; x < W * 0.92; x += W * 0.12) line(x, horizon, x - W * 0.08, H);
    } else {
      ctx.fillStyle = "rgba(4,18,33,.46)";
      ctx.fillRect(W * 0.045, H * 0.13, W * 0.91, H * 0.7);
      ctx.strokeStyle = "rgba(205,226,244,.11)";
      ctx.lineWidth = 2;
      rounded(W * 0.045, H * 0.13, W * 0.91, H * 0.7, 7, false, true);
      ctx.fillStyle = "rgba(255,255,255,.04)";
      ctx.fillRect(0, horizon, W, H - horizon);
    }
    ctx.fillStyle = profile.accent;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, 4, H);
    ctx.restore();
  }

  function drawCaseStamp(W, H) {
    const profile = currentProfile();
    const item = currentCase();
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(220,235,248,.5)";
    ctx.font = "700 9px Sora, sans-serif";
    ctx.fillText(profile.signature + " | " + item.title, W - 12, H - 13);
    ctx.restore();
  }

  function motionProgress(t) {
    return clamp(Number(t || 0) / duration(), 0, 1);
  }

  function revealProgress(t, fraction) {
    const windowSize = Math.max(0.45, duration() * (fraction || 0.35));
    return smoothStep(clamp(Number(t || 0) / windowSize, 0, 1));
  }

  function drawMotionTelemetry(W, H, t) {
    const progress = motionProgress(t);
    const profile = currentProfile();
    const x = Math.max(12, W - 154);
    const y = Math.max(64, H - 58);
    const pulse = app.playing ? 0.72 + 0.28 * Math.sin(Number(t || 0) * 8) : 0.62;
    ctx.save();
    ctx.fillStyle = "rgba(2,12,24,.78)";
    rounded(x, y, 140, 34, 6, true);
    ctx.strokeStyle = app.playing ? profile.accent : "rgba(215,231,246,.18)";
    ctx.lineWidth = 1;
    rounded(x, y, 140, 34, 6, false, true);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = app.playing ? profile.secondary : colors.dim;
    circle(x + 13, y + 12, 4);
    ctx.globalAlpha = 1;
    label(x + 23, y + 15, app.playing ? "RUNNING" : (t > 0 ? "PAUSED" : "READY"), app.playing ? "#fff" : colors.dim, "800 8px Sora");
    ctx.fillStyle = "rgba(255,255,255,.12)";
    rounded(x + 10, y + 23, 120, 4, 2, true);
    if (progress > 0) {
      const fill = ctx.createLinearGradient(x + 10, 0, x + 130, 0);
      fill.addColorStop(0, profile.accent);
      fill.addColorStop(1, profile.secondary);
      ctx.fillStyle = fill;
      rounded(x + 10, y + 23, Math.max(3, 120 * progress), 4, 2, true);
    }
    ctx.textAlign = "right";
    label(x + 130, y + 15, fmt(t) + " s", colors.goldSoft, "800 8px Sora");
    ctx.restore();
  }

  function drawMotionTrace(x1, y1, x2, y2, color, progress) {
    const q = clamp(progress, 0, 1);
    ctx.save();
    ctx.setLineDash([5, 7]);
    line(x1, y1, x2, y2, color, 1.5);
    ctx.setLineDash([]);
    for (let i = 1; i <= 4; i += 1) {
      const lag = clamp(q - i * 0.08, 0, 1);
      ctx.globalAlpha = Math.max(0.12, 0.5 - i * 0.08);
      ctx.fillStyle = color;
      circle(x1 + (x2 - x1) * lag, y1 + (y2 - y1) * lag, Math.max(2, 5 - i * 0.6));
    }
    ctx.restore();
  }

  function drawAnimatedVectorArrow(map, start, end, color, text, progress) {
    const q = clamp(progress, 0, 1);
    const liveEnd = {
      x: start.x + (end.x - start.x) * q,
      y: start.y + (end.y - start.y) * q
    };
    const a = map(start.x, start.y);
    const b = map(end.x, end.y);
    const live = map(liveEnd.x, liveEnd.y);
    ctx.save();
    ctx.setLineDash([5, 6]);
    line(a.x, a.y, b.x, b.y, "rgba(220,235,248,.2)", 1.5);
    ctx.restore();
    arrow(a.x, a.y, live.x, live.y, color, 4);
    if (q > 0.12) label(live.x + 8, live.y - 8, text, color, "bold 13px Inter");
    ctx.fillStyle = color;
    circle(live.x, live.y, 4);
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
    drawPath(map, ideal, "rgba(255,255,255,.3)", 2);
    drawPath(map, active, "rgba(45,212,191,.2)", 2);
    drawPathProgress(map, active, t / duration(), colors.teal, 4);
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

  function drawModelling(W, H, t) {
    const v = app.values;
    const q = revealProgress(t, 0.42);
    const a = rad(v.angle);
    const signedMoment = v.force * v.offset;
    const moment = Math.abs(signedMoment);
    const startX = W * 0.47;
    const startY = H * 0.57;
    const travel = clamp(v.force / 60, 0, 1) * 42 * q;
    const cx = startX + Math.cos(a) * travel;
    const cy = startY - Math.sin(a) * travel;
    const rotation = Math.sign(signedMoment || 1) * clamp(moment / 90, 0, 1) * 0.24 * q;
    const isRod = currentCase().id === "rod-beam";

    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = "rgba(220,235,248,.2)";
    ctx.lineWidth = 2;
    if (isRod) rounded(startX - 150, startY - 14, 300, 28, 5, false, true);
    else rounded(startX - 110, startY - 30, 220, 60, 10, false, true);
    ctx.restore();
    drawMotionTrace(startX, startY, cx, cy, colors.teal, q);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.fillStyle = "rgba(255,255,255,.075)";
    rounded(-170, -70, 340, 140, 14, true);
    const body = ctx.createLinearGradient(-150, -30, 150, 30);
    body.addColorStop(0, "#4ea6da");
    body.addColorStop(0.55, "#173d75");
    body.addColorStop(1, "#0a233f");
    ctx.fillStyle = body;
    if (isRod) {
      rounded(-150, -14, 300, 28, 5, true);
      ctx.fillStyle = "rgba(255,255,255,.42)";
      for (let x = -135; x <= 135; x += 30) rounded(x, -8, 14, 16, 2, true);
    } else {
      rounded(-110, -30, 220, 60, 10, true);
      ctx.fillStyle = colors.goldSoft;
      circle(-70, 38, 18);
      circle(70, 38, 18);
      ctx.fillStyle = "#071525";
      circle(-70, 38, 8);
      circle(70, 38, 8);
    }
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 2;
    line(0, -85, 0, 88);
    line(-180, 0, 180, 0);
    ctx.fillStyle = colors.goldSoft;
    circle(0, 0, 7);
    label(10, -8, "centre of mass", colors.goldSoft, "700 10px Sora");

    const forceY = -v.offset * 45;
    const forceLength = v.force * 3 * (0.12 + 0.88 * q);
    arrow(-Math.cos(a) * forceLength * 0.4, forceY + Math.sin(a) * forceLength * 0.4, Math.cos(a) * forceLength * 0.6, forceY - Math.sin(a) * forceLength * 0.6, colors.teal, 4);
    label(Math.min(72, Math.cos(a) * forceLength * 0.62 + 8), forceY - Math.sin(a) * forceLength * 0.62 - 8, "applied force", colors.teal, "700 10px Sora");
    ctx.restore();

    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const arcSweep = 1.8 * (0.12 + 0.88 * q);
    ctx.arc(startX, startY, 76, -0.75, -0.75 + Math.sign(signedMoment || 1) * arcSweep, signedMoment < 0);
    ctx.stroke();
    label(startX + 84, startY + 42, "rotation from F x d", colors.orange, "700 10px Sora");
    return [
      ro("force", fmt(v.force) + " N"),
      ro("offset", fmt(v.offset) + " m"),
      ro("moment", fmt(moment) + " Nm"),
      ro("rotation", fmt(deg(rotation)) + " deg"),
      ro("model", isRod ? "rigid rod" : "particle vs rigid")
    ];
  }

  function drawUnits(W, H, t) {
    const cards = [
      ["Velocity", "m s\u207b\u00b9", "vector if direction is included"],
      ["Acceleration", "m s\u207b\u00b2", "rate of change of velocity"],
      ["Force", "kg m s\u207b\u00b2", "newton, N"],
      ["Momentum", "kg m s\u207b\u00b9", "mass \u00d7 velocity"],
      ["Impulse", "N s", "same units as momentum"],
      ["Moment", "N m", "force \u00d7 distance"]
    ];
    const active = Math.max(0, Math.min(cards.length - 1, Math.round((app.values.quantity || 1) - 1)));
    const narrow = W < 520;
    const columns = narrow ? 2 : 3;
    const gap = narrow ? 10 : 16;
    const cardHeight = narrow ? 94 : 104;
    const cw = Math.min(230, (W - 44 - gap * (columns - 1)) / columns);
    const rows = Math.ceil(cards.length / columns);
    const startX = W / 2 - (cw * columns + gap * (columns - 1)) / 2;
    const startY = H / 2 - (cardHeight * rows + gap * (rows - 1)) / 2;
    const progress = motionProgress(t);
    const scan = 0.5 - 0.5 * Math.cos(progress * Math.PI * 3);
    const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 8);
    cards.forEach((card, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = startX + col * (cw + gap);
      const y = startY + row * (cardHeight + gap);
      ctx.fillStyle = i === active ? "rgba(212,175,55," + (0.13 + pulse * 0.1) + ")" : "rgba(255,255,255,.08)";
      ctx.strokeStyle = i === active ? colors.gold : "rgba(255,255,255,.12)";
      ctx.lineWidth = 2;
      rounded(x, y, cw, cardHeight, 12, true, true);
      label(x + 12, y + 24, card[0], colors.white, narrow ? "bold 12px Inter" : "bold 15px Inter");
      label(x + 12, y + 49, card[1], colors.goldSoft, narrow ? "bold 15px Inter" : "bold 18px Inter");
      drawCanvasWrappedText(card[2], x + 12, y + 68, cw - 24, narrow ? 10 : 12, narrow ? 2 : 1, colors.dim);
      if (i === active) {
        const scanX = x + 9 + (cw - 18) * scan;
        const beam = ctx.createLinearGradient(scanX - 12, 0, scanX + 12, 0);
        beam.addColorStop(0, "rgba(45,212,191,0)");
        beam.addColorStop(0.5, "rgba(45,212,191,.72)");
        beam.addColorStop(1, "rgba(45,212,191,0)");
        ctx.fillStyle = beam;
        ctx.fillRect(scanX - 12, y + 5, 24, cardHeight - 10);
        ctx.fillStyle = colors.teal;
        circle(scanX, y + cardHeight - 9, 4);
      }
    });
    const pipelineY = Math.min(H - 24, startY + rows * cardHeight + (rows - 1) * gap + 25);
    const pipelineX0 = Math.max(28, startX);
    const pipelineX1 = Math.min(W - 28, startX + columns * cw + (columns - 1) * gap);
    ctx.save();
    ctx.setLineDash([5, 7]);
    line(pipelineX0, pipelineY, pipelineX1, pipelineY, "rgba(220,235,248,.24)", 2);
    ctx.restore();
    const packetX = pipelineX0 + (pipelineX1 - pipelineX0) * progress;
    ctx.fillStyle = colors.teal;
    circle(packetX, pipelineY, 6);
    label(pipelineX0, pipelineY - 10, "identify", colors.dim, "700 9px Sora");
    ctx.save();
    ctx.textAlign = "right";
    label(pipelineX1, pipelineY - 10, "units verified", colors.green, "700 9px Sora");
    ctx.restore();
    return [
      ro("selected", cards[active][0]),
      ro("unit", cards[active][1]),
      ro("scale", fmt(app.values.scale || 1)),
      ro("rule", "same units both sides"),
      ro("check", progress > 0.72 ? "dimensionally consistent" : "scanning")
    ];
  }

  function drawVectors(W, H, t) {
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
    const reveal = 0.06 + 0.94 * revealProgress(t, 0.4);
    if (v.mode === "relative") {
      const AFinal = map(a.x, a.y);
      const BFinal = map(b.x, b.y);
      const A = map(a.x * reveal, a.y * reveal);
      const B = map(b.x * reveal, b.y * reveal);
      ctx.save();
      ctx.setLineDash([5, 6]);
      line(origin.x, origin.y, AFinal.x, AFinal.y, "rgba(240,207,104,.24)", 1.5);
      line(origin.x, origin.y, BFinal.x, BFinal.y, "rgba(56,189,248,.24)", 1.5);
      ctx.restore();
      drawMotionTrace(origin.x, origin.y, AFinal.x, AFinal.y, colors.goldSoft, reveal);
      drawMotionTrace(origin.x, origin.y, BFinal.x, BFinal.y, colors.sky, reveal);
      dot(A.x, A.y, colors.goldSoft, "A");
      dot(B.x, B.y, colors.sky, "B");
      arrow(A.x, A.y, B.x, B.y, colors.teal, 4);
      label((A.x + B.x) / 2 + 10, (A.y + B.y) / 2 - 8, "AB = b - a", colors.teal);
    } else if (v.mode === "equilibrium") {
      drawAnimatedVectorArrow(map, { x: 0, y: 0 }, a, colors.sky, "F1", clamp(reveal * 3, 0, 1));
      drawAnimatedVectorArrow(map, a, { x: a.x + b.x, y: a.y + b.y }, colors.violet, "F2", clamp(reveal * 3 - 1, 0, 1));
      drawAnimatedVectorArrow(map, { x: a.x + b.x, y: a.y + b.y }, { x: 0, y: 0 }, colors.green, "F3", clamp(reveal * 3 - 2, 0, 1));
      label(origin.x + 12, origin.y - 14, "closed polygon", colors.green);
    } else {
      drawAnimatedVectorArrow(map, { x: 0, y: 0 }, a, colors.sky, "a", reveal);
      drawAnimatedVectorArrow(map, { x: 0, y: 0 }, b, colors.violet, "b", reveal);
      drawAnimatedVectorArrow(map, { x: 0, y: 0 }, r, colors.teal, v.mode === "bearing" ? "resolved" : "resultant", reveal);
      if (v.mode === "parallel") {
        drawAnimatedVectorArrow(map, { x: 0, y: 0 }, { x: b.x * 2, y: b.y * 2 }, colors.green, "2b", reveal);
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
    drawMotionTrace(x, sy(h0), x, py, colors.goldSoft, motionProgress(t));
    ctx.fillStyle = colors.goldSoft;
    circle(x, py, 13);
    arrow(x + 34, py, x + 34, py - vel * 2.8, colors.teal, 4);
    arrow(x + 64, py - 10, x + 64, py + 72, colors.orange, 4);
    label(x + 44, py - vel * 2.8 - 8, "v", colors.teal);
    label(x + 74, py + 66, "g", colors.orange);
    const velocitySamples = samples.map((_, index) => v.u + v.a * (T * index / Math.max(1, samples.length - 1)));
    const minVelocity = Math.min(...velocitySamples, v.u) - 1;
    const maxVelocity = Math.max(...velocitySamples, v.u) + 1;
    const gaugeX = W * 0.78;
    const gaugeTop = H * 0.24;
    const gaugeBottom = H * 0.73;
    const velocityY = map1(vel, minVelocity, maxVelocity, gaugeBottom, gaugeTop);
    const initialVelocityY = map1(v.u, minVelocity, maxVelocity, gaugeBottom, gaugeTop);
    line(gaugeX, gaugeTop, gaugeX, gaugeBottom, "rgba(220,235,248,.3)", 3);
    ctx.save();
    ctx.setLineDash([5, 5]);
    line(gaugeX - 26, initialVelocityY, gaugeX + 26, initialVelocityY, "rgba(240,207,104,.34)", 2);
    ctx.restore();
    line(gaugeX - 34, velocityY, gaugeX + 34, velocityY, vel >= 0 ? colors.green : colors.rose, 5);
    ctx.fillStyle = vel >= 0 ? colors.green : colors.rose;
    circle(gaugeX, velocityY, 7);
    label(gaugeX - 38, gaugeTop - 12, "velocity gauge", colors.dim, "700 9px Sora");
    label(gaugeX + 42, velocityY + 4, fmt(vel) + " m/s", vel >= 0 ? colors.green : colors.rose, "700 9px Sora");
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
    drawPath(map, pts, "rgba(45,212,191,.22)", 2);
    drawPathProgress(map, pts, t / duration(), colors.teal, 4);
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

  function drawForces(W, H, t) {
    const v = app.values;
    const forces = forceList(v);
    let sum = { x: 0, y: 0 };
    forces.forEach((f) => {
      sum.x += f.x;
      sum.y += f.y;
    });
    const magnitude = Math.hypot(sum.x, sum.y);
    const q = revealProgress(t, 0.42);
    const moveQ = smoothStep(motionProgress(t));
    const start = { x: W * 0.46, y: H * 0.52 };
    const travel = magnitude < 0.5 ? 0 : clamp(magnitude * 1.25, 20, 58) * moveQ;
    const origin = {
      x: start.x + (magnitude ? sum.x / magnitude * travel : 0),
      y: start.y - (magnitude ? sum.y / magnitude * travel : 0)
    };

    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = "rgba(220,235,248,.2)";
    ctx.lineWidth = 2;
    rounded(start.x - 54, start.y - 38, 108, 76, 12, false, true);
    ctx.restore();
    if (travel > 0) drawMotionTrace(start.x, start.y, origin.x, origin.y, colors.rose, moveQ);
    const particleFill = ctx.createLinearGradient(origin.x - 54, origin.y - 38, origin.x + 54, origin.y + 38);
    particleFill.addColorStop(0, "#edf8ff");
    particleFill.addColorStop(0.12, currentProfile().accent);
    particleFill.addColorStop(1, "#12314e");
    ctx.fillStyle = particleFill;
    rounded(origin.x - 54, origin.y - 38, 108, 76, 12, true);
    ctx.strokeStyle = "rgba(255,255,255,.38)";
    rounded(origin.x - 54, origin.y - 38, 108, 76, 12, false, true);
    label(origin.x - 28, origin.y + 5, magnitude < 0.5 ? "balanced" : "particle", colors.white, "bold 13px Inter");

    forces.forEach((f, index) => {
      const forceQ = clamp(q * forces.length - index * 0.42, 0.08, 1);
      const fx = origin.x + f.x * 8 * forceQ;
      const fy = origin.y - f.y * 8 * forceQ;
      arrow(origin.x, origin.y, fx, fy, f.color, 4);
      label(fx + 8, fy, "F" + (index + 1), f.color);
    });
    const resultantQ = clamp(q * 1.7 - 0.45, 0, 1);
    if (magnitude >= 0.05 && resultantQ > 0) {
      const rx = origin.x + sum.x * 8 * resultantQ;
      const ry = origin.y - sum.y * 8 * resultantQ;
      arrow(origin.x, origin.y, rx, ry, colors.rose, 5);
      label(rx + 8, ry - 8, "R", colors.rose);
    } else if (magnitude < 0.5) {
      ctx.strokeStyle = colors.green;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6);
      circle(origin.x, origin.y, 50 + 5 * Math.sin(t * 4), false, colors.green);
      ctx.globalAlpha = 1;
    }
    drawMiniPolygon(W, H, forces, q);
    return [
      ro("Rx", fmt(sum.x) + " N"),
      ro("Ry", fmt(sum.y) + " N"),
      ro("|R|", fmt(Math.hypot(sum.x, sum.y)) + " N"),
      ro("angle", fmt(deg(Math.atan2(sum.y, sum.x))) + " deg"),
      ro("state", magnitude < 0.5 ? "equilibrium" : "unbalanced"),
      ro("motion", magnitude < 0.5 ? "no translation" : "along resultant")
    ];
  }

  function drawDynamics(W, H, t) {
    const v = app.values;
    const mode = v.mode;
    if (mode === "lift") return drawLift(W, H, t);
    if (mode === "vector") return drawVectorFma(W, H, t);
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

  function drawLift(W, H, t) {
    const v = app.values;
    const R = v.m1 * (G + v.liftA);
    const cx = W * 0.5;
    const baseY = H * 0.56;
    const displacement = 0.5 * v.liftA * t * t;
    const travel = clamp(displacement * 18, -72, 72);
    const cy = baseY - travel;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    rounded(cx - 120, H * 0.12, 240, H * 0.73, 12, true);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 3;
    line(cx - 120, H * 0.2, cx + 120, H * 0.2);
    line(cx - 70, H * 0.2, cx - 70, cy - 12, "rgba(215,231,246,.3)", 2);
    line(cx + 70, H * 0.2, cx + 70, cy - 12, "rgba(215,231,246,.3)", 2);
    ctx.save();
    ctx.setLineDash([6, 7]);
    rounded(cx - 48, baseY - 20, 96, 104, 12, false, true);
    ctx.restore();
    drawMotionTrace(cx, baseY + 28, cx, cy + 28, colors.sky, revealProgress(t, 0.42));
    const cabin = ctx.createLinearGradient(cx - 48, cy - 20, cx + 48, cy + 84);
    cabin.addColorStop(0, "#dff5ff");
    cabin.addColorStop(0.16, colors.sky);
    cabin.addColorStop(1, "#17344d");
    ctx.fillStyle = cabin;
    rounded(cx - 48, cy - 20, 96, 104, 12, true);
    ctx.fillStyle = "#071525";
    rounded(cx - 28, cy - 3, 56, 50, 7, true);
    ctx.fillStyle = colors.goldSoft;
    circle(cx, cy + 61, 8);
    const arrowQ = 0.12 + 0.88 * revealProgress(t, 0.35);
    arrow(cx, cy + 72, cx, cy + 72 - 152 * arrowQ, colors.green, 5);
    arrow(cx, cy - 2, cx, cy - 2 + 122 * arrowQ, colors.rose, 5);
    label(cx + 16, cy - 68, "R", colors.green);
    label(cx + 18, cy + 112, "mg", colors.rose);
    return [
      ro("mass", fmt(v.m1) + " kg"),
      ro("lift a", fmt(v.liftA) + " m/s^2"),
      ro("reaction", fmt(R) + " N"),
      ro("weight", fmt(v.m1 * G) + " N"),
      ro("displacement", fmt(displacement) + " m")
    ];
  }

  function drawVectorFma(W, H, t) {
    const v = app.values;
    const resultant = { x: v.force, y: (v.m2 - 5) * 10 };
    const a = { x: resultant.x / Math.max(1, v.m1), y: resultant.y / Math.max(1, v.m1) };
    const bounds = { minX: -4, maxX: 18, minY: -10, maxY: 10 };
    const map = mapper(W, H, bounds);
    drawAxes(map, bounds, "i", "j");
    const reveal = 0.08 + 0.92 * revealProgress(t, 0.38);
    drawAnimatedVectorArrow(map, { x: 0, y: 0 }, { x: resultant.x / 10, y: resultant.y / 10 }, colors.teal, "R", reveal);
    drawAnimatedVectorArrow(map, { x: 0, y: -2.3 }, { x: a.x / 2, y: a.y / 2 - 2.3 }, colors.orange, "a = R/m", reveal);
    const sampleTime = Math.min(t, 2.4);
    const world = {
      x: clamp(0.5 * a.x * sampleTime * sampleTime / 2, bounds.minX + 0.5, bounds.maxX - 0.5),
      y: clamp(0.5 * a.y * sampleTime * sampleTime / 2, bounds.minY + 0.5, bounds.maxY - 0.5)
    };
    const motionLaneY = -5.2;
    const start = map(0, motionLaneY);
    const particle = map(world.x, clamp(motionLaneY + world.y, bounds.minY + 0.5, bounds.maxY - 0.5));
    drawMotionTrace(start.x, start.y, particle.x, particle.y, colors.goldSoft, reveal);
    label(start.x - 4, start.y - 13, "motion trace (scaled)", colors.dim, "700 9px Sora");
    ctx.fillStyle = colors.goldSoft;
    circle(particle.x, particle.y, 11);
    ctx.strokeStyle = "rgba(255,255,255,.52)";
    ctx.lineWidth = 2;
    circle(particle.x, particle.y, 11, false, "rgba(255,255,255,.52)");
    label(particle.x + 15, particle.y + 20, "particle", colors.goldSoft, "700 10px Sora");
    return [
      ro("Rx", fmt(v.force) + " N"),
      ro("Ry", fmt(resultant.y) + " N"),
      ro("ax", fmt(a.x) + " m/s^2"),
      ro("ay", fmt(a.y) + " m/s^2"),
      ro("r", "(" + fmt(world.x) + ", " + fmt(world.y) + ")")
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
    const startPx = x1 + Math.cos(theta) * len * 0.45;
    const startPy = y1 - Math.sin(theta) * len * 0.45;
    drawMotionTrace(startPx, startPy, px, py, colors.goldSoft, motionProgress(t));
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
    if (mode === "basic") return drawBasicMomentum(W, H, t);

    const motion = collisionTimeline(v, W, t);
    const metrics = collisionMetrics(v);
    const profile = currentProfile();
    const y = H * 0.58;
    drawTrack(y, W, profile);
    drawImpactZone(motion.contactX, y, motion.phase);

    drawVelocityTrail(motion.x1, y - 18, motion.velocity1, profile.accent, motion.phase === "impact" ? 0.35 : 1);
    drawVelocityTrail(motion.x2, y - 18, motion.velocity2, profile.secondary, motion.phase === "impact" ? 0.35 : 1);

    drawCart(motion.x1, y, profile.accent, "A", {
      mass: v.m1,
      velocity: motion.velocity1,
      compressed: motion.compression,
      scale: profile.objectScale
    });
    drawCart(motion.x2, y, profile.secondary, "B", {
      mass: v.m2,
      velocity: motion.velocity2,
      compressed: motion.compression,
      scale: profile.objectScale
    });

    if (motion.phase === "impact") {
      drawImpactPulse(motion.contactX, y - 24, motion.eventProgress, profile);
    }
    if (mode === "stick" && motion.phase === "after") {
      drawCoupler((motion.x1 + motion.x2) * 0.5, y - 18, profile.secondary);
    }

    drawVelocityIndicator(motion.x1, y - 78, motion.velocity1, profile.accent, motion.phase === "before" ? "u1" : "v1");
    drawVelocityIndicator(motion.x2, y - 116, motion.velocity2, profile.secondary, motion.phase === "before" ? "u2" : "v2");

    if (mode === "ambiguous" && motion.phase === "after") {
      ctx.save();
      ctx.setLineDash([6, 5]);
      drawVelocityIndicator(motion.x2, y - 150, -motion.velocity2, colors.violet, "alternate sign");
      ctx.restore();
    }

    return [
      ro("event", motion.phase),
      ro("p before", fmt(metrics.pBefore) + " kg m/s"),
      ro("p after", fmt(metrics.pAfter) + " kg m/s"),
      ro("momentum error", fmt(metrics.residual)),
      ro("KE retained", fmt(metrics.energyRetained) + "%")
    ];
  }

  function drawBasicMomentum(W, H, t) {
    const v = app.values;
    const profile = currentProfile();
    const y = H * 0.58;
    drawTrack(y, W, profile);
    const scale = Math.max(5, Math.min(14, (W - 160) / Math.max(1, Math.abs(v.u1) * duration())));
    const x = 82 + v.u1 * t * scale;
    const momentum = v.m1 * v.u1;
    drawVelocityTrail(x, y - 18, v.u1, profile.accent, 1);
    drawCart(x, y, profile.accent, "A", { mass: v.m1, velocity: v.u1, scale: profile.objectScale });
    drawVelocityIndicator(x, y - 86, v.u1, profile.accent, "velocity");
    drawSceneMetric(W - 150, H * 0.2, "p = mv", fmt(momentum) + " kg m/s", profile.secondary);
    return [
      ro("mass", fmt(v.m1) + " kg"),
      ro("velocity", fmt(v.u1) + " m/s"),
      ro("momentum", fmt(momentum) + " kg m/s"),
      ro("direction", momentum >= 0 ? "positive" : "negative")
    ];
  }

  function drawImpulse(W, H, t) {
    const v = app.values;
    const profile = currentProfile();
    const y = H * 0.58;
    drawTrack(y, W, profile);
    const pulseTime = Math.min(2, duration() * 0.4);
    const activeTime = Math.min(t, pulseTime);
    const acceleration = v.force / Math.max(0.1, v.m1);
    const distanceDuringPulse = v.u1 * activeTime + 0.5 * acceleration * activeTime * activeTime;
    const velocityAtPulseEnd = v.u1 + acceleration * pulseTime;
    const coastTime = Math.max(0, t - pulseTime);
    const distance = distanceDuringPulse + (t > pulseTime ? velocityAtPulseEnd * coastTime : 0);
    const velocity = t <= pulseTime ? v.u1 + acceleration * t : velocityAtPulseEnd;
    const scale = Math.max(3.5, Math.min(10, (W - 190) / Math.max(1, Math.abs(v.u1 * duration()) + Math.abs(acceleration * pulseTime * duration()))));
    const x = 88 + distance * scale;
    const impulse = v.force * activeTime;
    drawVelocityTrail(x, y - 18, velocity, profile.accent, 1);
    drawCart(x, y, profile.accent, "A", { mass: v.m1, velocity, scale: profile.objectScale });
    if (t <= pulseTime) {
      arrow(x - 86, y - 82, x + 54, y - 82, profile.secondary, 5);
      label(x - 82, y - 94, "F = " + fmt(v.force) + " N", profile.secondary, "700 11px Sora");
    } else {
      ctx.save();
      ctx.setLineDash([5, 5]);
      line(x - 82, y - 82, x + 50, y - 82, "rgba(240,207,104,.42)", 2);
      ctx.restore();
      label(x - 82, y - 94, "force interval complete", colors.dim, "700 10px Sora");
    }
    drawVelocityIndicator(x, y - 118, velocity, profile.accent, "v");
    drawImpulseMeter(W - 154, H * 0.2, impulse, v.force * pulseTime, profile);
    return [
      ro("impulse", fmt(impulse) + " N s"),
      ro("change in v", fmt(impulse / Math.max(0.1, v.m1)) + " m/s"),
      ro("velocity", fmt(velocity) + " m/s"),
      ro("momentum change", fmt(impulse)),
      ro("force state", t <= pulseTime ? "acting" : "complete")
    ];
  }

  function drawExplosion(W, H, t) {
    const v = app.values;
    const profile = currentProfile();
    const y = H * 0.58;
    drawTrack(y, W, profile);
    const eventTime = duration() * 0.25;
    const local = Math.max(0, t - eventTime);
    const scale = Math.max(6, Math.min(14, (W - 190) / Math.max(1, (Math.abs(v.u1) + Math.abs(v.u2)) * duration())));
    const centre = W * 0.5;
    const x1 = centre + v.u1 * local * scale;
    const x2 = centre + v.u2 * local * scale;
    if (t < eventTime) {
      const charge = clamp(t / Math.max(0.001, eventTime), 0, 1);
      const compression = 0.12 * Math.sin(charge * Math.PI * 3) * charge;
      drawCart(centre, y, profile.secondary, "A+B", { mass: v.m1 + v.m2, velocity: 0, scale: 1.08, compressed: Math.abs(compression) });
      ctx.save();
      ctx.globalAlpha = 0.28 + charge * 0.5;
      drawImpactPulse(centre, y - 22, 1 - charge * 0.75, profile);
      ctx.restore();
      drawSceneMetric(W - 154, H * 0.2, "system momentum", "0 kg m/s", profile.secondary);
      drawSceneMetric(W - 154, H * 0.2 + 66, "stored energy", fmt(charge * 100) + "%", profile.secondary);
    } else {
      drawCart(x1, y, profile.accent, "A", { mass: v.m1, velocity: v.u1, scale: 0.88 });
      drawCart(x2, y, profile.secondary, "B", { mass: v.m2, velocity: v.u2, scale: 0.96 });
      drawVelocityIndicator(x1, y - 82, v.u1, profile.accent, "vA");
      drawVelocityIndicator(x2, y - 118, v.u2, profile.secondary, "vB");
      if (local < 0.35) drawImpactPulse(centre, y - 22, clamp(local / 0.35, 0, 1), profile);
    }
    const p1 = v.m1 * v.u1;
    const p2 = v.m2 * v.u2;
    return [
      ro("event", t < eventTime ? "stored" : "separated"),
      ro("A momentum", fmt(p1)),
      ro("B momentum", fmt(p2)),
      ro("total momentum", fmt(p1 + p2)),
      ro("principle", "internal impulse")
    ];
  }

  function drawWallBounce(W, H, t) {
    const v = app.values;
    const profile = currentProfile();
    const y = H * 0.58;
    drawTrack(y, W, profile);
    const wallX = W * 0.79;
    drawImpactWall(wallX, y, profile);
    const impactTime = currentProfile().impactRatio * duration();
    const contactTime = Math.max(0.18, duration() * 0.055);
    const contactX = wallX - 25;
    const speedIn = Math.max(0.5, Math.abs(v.u1));
    const speedOut = -Math.max(0, Math.min(1, v.e)) * speedIn;
    const scale = Math.max(5, Math.min(16, (contactX - 54) / Math.max(1, speedIn * impactTime)));
    const startX = contactX - speedIn * impactTime * scale;
    let x;
    let velocity;
    let compression = 0;
    let state;
    if (t < impactTime) {
      x = startX + speedIn * t * scale;
      velocity = speedIn;
      state = "approach";
    } else if (t < impactTime + contactTime) {
      const q = clamp((t - impactTime) / contactTime, 0, 1);
      compression = Math.sin(Math.PI * q);
      x = contactX + compression * 5;
      velocity = speedIn + (speedOut - speedIn) * smoothStep(q);
      state = "contact";
      drawImpactPulse(wallX - 8, y - 24, q, profile);
    } else {
      const local = t - impactTime - contactTime;
      x = contactX + speedOut * local * scale;
      velocity = speedOut;
      state = "rebound";
    }
    drawVelocityTrail(x, y - 24, velocity, profile.accent, state === "contact" ? 0.25 : 1);
    drawBall(x, y - 24, 22, profile.accent, { compression, label: "m = " + fmt(v.m1) + " kg" });
    drawVelocityIndicator(x, y - 92, velocity, velocity >= 0 ? profile.accent : profile.secondary, state === "approach" ? "u" : "v");
    const impulse = v.m1 * (speedOut - speedIn);
    return [
      ro("event", state),
      ro("p before", fmt(v.m1 * speedIn)),
      ro("p after", fmt(v.m1 * speedOut)),
      ro("impulse", fmt(impulse) + " N s"),
      ro("KE retained", fmt(v.e * v.e * 100) + "%")
    ];
  }

  function drawMoments(W, H, t) {
    const v = app.values;
    if (v.mode === "lamina") return drawLaminaMoment(W, H, t);
    const beam = Math.max(1, v.beam);
    const x0 = W * 0.15;
    const x1 = W * 0.85;
    const y = H * 0.56;
    const sx = (x) => map1(x, 0, beam, x0, x1);
    let pivot = Math.min(beam, Math.max(0, v.pivot));
    if (v.mode === "seesaw") pivot = beam * 0.5;
    if (v.mode === "tilt") pivot = v.x1 >= beam * 0.5 ? beam * 0.85 : beam * 0.15;
    const px = sx(pivot);
    const loads = momentLoads(v, beam);
    const moments = loads.map((load) => load.force * (load.x - pivot));
    const resultant = moments.reduce((sum, value) => sum + value, 0);
    const q = revealProgress(t, 0.46);
    const turnLimit = v.mode === "tilt" ? 0.24 : 0.15;
    const rotation = Math.sign(resultant || 1) * turnLimit * clamp(Math.abs(resultant) / 210, 0, 1) * smoothStep(motionProgress(t));
    const point = (distance) => {
      const dx = sx(distance) - px;
      return {
        x: px + dx * Math.cos(rotation),
        y: y + dx * Math.sin(rotation)
      };
    };

    ctx.save();
    ctx.setLineDash([7, 7]);
    line(x0, y, x1, y, "rgba(220,235,248,.2)", 3);
    ctx.restore();
    const left = point(0);
    const right = point(beam);
    ctx.strokeStyle = "rgba(255,255,255,.62)";
    ctx.lineWidth = 10;
    line(left.x, left.y, right.x, right.y);
    ctx.strokeStyle = currentProfile().accent;
    ctx.lineWidth = 2;
    line(left.x, left.y - 4, right.x, right.y - 4);
    drawPivot(px, y + 8);

    const supportModes = ["supports", "rod", "nonuniform", "tilt", "twoCase"];
    if (supportModes.includes(v.mode)) {
      const supportA = sx(beam * 0.15);
      const supportB = sx(beam * 0.85);
      if (v.mode === "tilt") {
        const activeRight = pivot > beam * 0.5;
        ctx.save();
        ctx.globalAlpha = activeRight ? 0.24 : 1;
        drawSupport(supportA, y + 10, "A");
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = activeRight ? 1 : 0.24;
        drawSupport(supportB, y + 10, "B");
        ctx.restore();
        label(activeRight ? supportA - 30 : supportB - 30, y + 82, "reaction = 0", colors.rose, "700 9px Sora");
      } else {
        drawSupport(supportA, y + 10, "A");
        drawSupport(supportB, y + 10, "B");
      }
    }

    loads.forEach((load, index) => {
      const anchor = point(load.x);
      const loadQ = clamp(q * loads.length - index * 0.36, 0.08, 1);
      drawAnimatedLoad(anchor.x, anchor.y, load.force, load.color, load.name, loadQ);
    });

    if (v.mode === "angle") {
      const anchor = point(v.x1);
      const angle = rad(v.angle);
      const length = 86 * (0.12 + 0.88 * q);
      arrow(anchor.x - Math.cos(angle) * length, anchor.y - Math.sin(angle) * length, anchor.x, anchor.y, colors.teal, 4);
      label(anchor.x - 96, anchor.y - 70, "F sin(theta) turns the beam", colors.teal, "700 10px Sora");
    }

    if (Math.abs(resultant) < 1) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 5);
      ctx.strokeStyle = colors.green;
      ctx.lineWidth = 3;
      circle(px, y - 6, 56 + 4 * Math.sin(t * 4), false, colors.green);
      ctx.restore();
      label(px + 64, y - 20, v.mode === "tilt" ? "limiting balance" : "moments balanced", colors.green, "700 10px Sora");
    } else {
      const direction = Math.sign(resultant);
      const sweep = 2.35 * (0.1 + 0.9 * q);
      ctx.strokeStyle = direction > 0 ? colors.orange : colors.violet;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(px, y - 8, 58, direction > 0 ? -1.55 : 1.55, direction > 0 ? -1.55 + sweep : 1.55 - sweep, direction < 0);
      ctx.stroke();
      label(px + (direction > 0 ? 66 : -132), y - 56, direction > 0 ? "clockwise" : "anticlockwise", direction > 0 ? colors.orange : colors.violet, "700 10px Sora");
    }

    if (v.mode === "twoCase") {
      label(W * 0.12, H * 0.22, motionProgress(t) < 0.5 ? "Case A: test the left pivot" : "Case B: test the right pivot", colors.goldSoft, "800 12px Sora");
    }
    return [
      ro("moment 1", fmt(moments[0] || 0) + " Nm"),
      ro("other moments", fmt(moments.slice(1).reduce((sum, value) => sum + value, 0)) + " Nm"),
      ro("resultant", fmt(resultant) + " Nm"),
      ro("pivot", fmt(pivot) + " m"),
      ro("state", Math.abs(resultant) < 1 ? (v.mode === "tilt" ? "limiting balance" : "balanced") : (v.mode === "tilt" ? "tipping" : "turning"))
    ];
  }

  function momentLoads(v, beam) {
    if (v.mode === "single") return [{ force: v.f1, x: v.x1, color: colors.sky, name: "F" }];
    if (v.mode === "angle") return [{ force: v.f1 * Math.sin(rad(v.angle)), x: v.x1, color: colors.teal, name: "F perpendicular" }];
    if (v.mode === "rod") {
      return [
        { force: v.f1, x: v.x1, color: colors.sky, name: "load" },
        { force: v.weight, x: beam * 0.5, color: colors.rose, name: "rod weight" }
      ];
    }
    if (v.mode === "nonuniform") {
      return [
        { force: v.f1, x: v.x1, color: colors.sky, name: "load" },
        { force: v.weight, x: v.x2, color: colors.rose, name: "weight at COM" }
      ];
    }
    if (v.mode === "tilt") {
      return [
        { force: v.f1, x: v.x1, color: colors.sky, name: "edge load" },
        { force: v.weight, x: beam * 0.5, color: colors.rose, name: "rod weight" }
      ];
    }
    if (v.mode === "twoCase") {
      return [
        { force: v.f1, x: v.x1, color: colors.sky, name: "left load" },
        { force: v.f2, x: v.x2, color: colors.goldSoft, name: "right load" },
        { force: v.weight, x: beam * 0.5, color: colors.rose, name: "rod weight" }
      ];
    }
    return [
      { force: v.f1, x: v.x1, color: colors.sky, name: "F1" },
      { force: v.f2, x: v.x2, color: colors.goldSoft, name: "F2" }
    ];
  }

  function drawAnimatedLoad(x, y, force, color, name, progress) {
    const q = clamp(progress, 0, 1);
    const height = clamp(Math.abs(force) * 1.5, 48, 90) * q;
    arrow(x, y - height - 8, x, y - 8, color, 4);
    if (q > 0.12) label(x + 8, y - height - 10, name + " = " + fmt(force) + " N", color, "700 9px Sora");
  }

  function drawLaminaMoment(W, H, t) {
    const v = app.values;
    const q = revealProgress(t, 0.45);
    const pivot = { x: W * 0.5, y: H * 0.67 };
    const leftMoment = -v.f1 * 1.8;
    const rightMoment = v.f2 * 1.8;
    const weightMoment = v.weight * 0.45;
    const resultant = leftMoment + rightMoment + weightMoment;
    const rotation = Math.sign(resultant || 1) * 0.14 * clamp(Math.abs(resultant) / 100, 0, 1) * smoothStep(motionProgress(t));
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(rotation);
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = "rgba(220,235,248,.22)";
    rounded(-150, -150, 300, 150, 8, false, true);
    ctx.setLineDash([]);
    const fill = ctx.createLinearGradient(-150, -150, 150, 0);
    fill.addColorStop(0, "rgba(56,189,248,.5)");
    fill.addColorStop(0.58, "rgba(19,61,105,.88)");
    fill.addColorStop(1, "rgba(240,207,104,.45)");
    ctx.fillStyle = fill;
    rounded(-150, -150, 300, 150, 8, true);
    ctx.strokeStyle = "rgba(255,255,255,.42)";
    rounded(-150, -150, 300, 150, 8, false, true);
    ctx.fillStyle = colors.rose;
    circle(36, -72, 8);
    label(48, -78, "combined COM", colors.rose, "700 10px Sora");
    ctx.restore();
    drawPivot(pivot.x, pivot.y + 8);
    drawAnimatedLoad(pivot.x - 110, pivot.y - 105, v.f1, colors.sky, "part A", q);
    drawAnimatedLoad(pivot.x + 105, pivot.y - 95, v.f2, colors.goldSoft, "part B", q);
    drawMotionTrace(pivot.x, pivot.y - 70, pivot.x + 36, pivot.y - 72, colors.rose, q);
    return [
      ro("left moment", fmt(leftMoment) + " Nm"),
      ro("right moment", fmt(rightMoment) + " Nm"),
      ro("COM moment", fmt(weightMoment) + " Nm"),
      ro("resultant", fmt(resultant) + " Nm"),
      ro("state", Math.abs(resultant) < 1 ? "balanced" : "rotating")
    ];
  }

  function drawAnalysis(W, H, t, readouts) {
    analysisCtx.clearRect(0, 0, W, H);
    drawAnalysisBackdrop(W, H);
    const stage = currentCase().stage;
    if (stage === "projectile" || stage === "suvat2d") {
      drawTrajectoryAnalysis(W, H, t);
      return;
    }
    if (stage === "graphs") {
      drawGraphAnalysis(W, H, t);
      return;
    }
    if (stage === "suvat1d") {
      drawKinematicsAnalysis(W, H, t);
      return;
    }
    if (stage === "momentum") {
      drawMomentumAnalysis(W, H, t);
      return;
    }
    if (["vectors", "forces", "dynamics", "incline", "moments"].includes(stage)) {
      drawMetricAnalysis(W, H, readouts, stage);
      return;
    }
    drawConceptAnalysis(W, H);
  }

  function drawAnalysisBackdrop(W, H) {
    analysisCtx.fillStyle = "#081c31";
    analysisCtx.fillRect(0, 0, W, H);
    analysisCtx.save();
    analysisCtx.strokeStyle = analysisColors.grid;
    analysisCtx.lineWidth = 1;
    const spacing = W < 360 ? 32 : 40;
    for (let x = 0; x <= W; x += spacing) analysisLine(x, 0, x, H);
    for (let y = 0; y <= H; y += spacing) analysisLine(0, y, W, y);
    analysisCtx.restore();
  }

  function drawTrajectoryAnalysis(W, H, t) {
    const values = app.values;
    const T = duration();
    const active = projectilePath(values, T);
    const reference = projectilePath(Object.assign({}, values, { drag: 0 }), T);
    const all = active.concat(reference);
    const bounds = boundsFor(all, 1.5);
    bounds.minY = Math.min(bounds.minY, 0);
    const pad = { l: 44, r: 18, t: 28, b: 42 };
    const mx = (x) => map1(x, bounds.minX, bounds.maxX, pad.l, W - pad.r);
    const my = (y) => map1(y, bounds.minY, bounds.maxY, H - pad.b, pad.t);
    drawAnalysisAxes(W, H, pad, "x / m", "y / m", bounds, mx, my);
    analysisCtx.save();
    analysisCtx.setLineDash([6, 5]);
    drawAnalysisPath(reference.map((p) => ({ x: mx(p.x), y: my(p.y) })), "rgba(234,242,255,.42)", 2);
    analysisCtx.restore();
    drawAnalysisPath(active.map((p) => ({ x: mx(p.x), y: my(p.y) })), analysisColors.teal, 3);
    const point = pointAtPath(active, t / T);
    const px = mx(point.x);
    const py = my(point.y);
    analysisCtx.save();
    analysisCtx.setLineDash([3, 4]);
    analysisLine(px, py, px, H - pad.b, "rgba(240,207,104,.5)", 1);
    analysisLine(pad.l, py, px, py, "rgba(240,207,104,.5)", 1);
    analysisCtx.restore();
    analysisDot(px, py, 6, analysisColors.gold);
    analysisText("t = " + fmt(t) + " s", Math.min(W - 14, px + 10), Math.max(18, py - 10), analysisColors.gold, "11px Inter", "right");
    setAnalysisMeta(
      "Position trace",
      "The synchronized x-y trace shows the full path and the current particle position at " + fmt(t) + " seconds.",
      [
        [analysisColors.teal, "active path"],
        ["rgba(234,242,255,.65)", "ideal reference"],
        [analysisColors.gold, "current position"]
      ]
    );
  }

  function drawGraphAnalysis(W, H, t) {
    const shape = app.values.shape || "acb";
    const meta = graphMeta(shape);
    const T = duration();
    const values = graphPoints(shape, T).map((point) => ({ x: point.t, y: point.v }));
    drawSingleSeriesPlot(W, H, values, t, analysisColors.teal, meta.axisLabel || "value");
    const now = valueOnGraph(graphPoints(shape, T), t);
    setAnalysisMeta(
      "Gradient and area",
      "The marker follows the active graph at t = " + fmt(t) + " seconds, where the graph value is " + fmt(now) + ".",
      [[analysisColors.teal, meta.axisLabel || "motion graph"], [analysisColors.gold, "current time"]]
    );
  }

  function drawKinematicsAnalysis(W, H, t) {
    const values = app.values;
    const T = duration();
    const rows = [];
    for (let i = 0; i <= 80; i++) {
      const time = T * i / 80;
      rows.push({
        x: time,
        s: Number(values.height || 0) + Number(values.u || 0) * time + 0.5 * Number(values.a || 0) * time * time,
        v: Number(values.u || 0) + Number(values.a || 0) * time,
        a: Number(values.a || 0)
      });
    }
    const top = 24;
    const bottom = 26;
    const gap = 10;
    const laneH = (H - top - bottom - gap * 2) / 3;
    drawSeriesLane(W, top, laneH, rows.map((row) => ({ x: row.x, y: row.s })), t, "s / m", analysisColors.cyan);
    drawSeriesLane(W, top + laneH + gap, laneH, rows.map((row) => ({ x: row.x, y: row.v })), t, "v / m s^-1", analysisColors.teal);
    drawSeriesLane(W, top + (laneH + gap) * 2, laneH, rows.map((row) => ({ x: row.x, y: row.a })), t, "a / m s^-2", analysisColors.coral);
    analysisText("time / s", W - 12, H - 8, analysisColors.muted, "10px Inter", "right");
    setAnalysisMeta(
      "s-v-a dashboard",
      "Displacement, velocity, and acceleration are aligned on one time axis so their links remain visible.",
      [[analysisColors.cyan, "displacement"], [analysisColors.teal, "velocity"], [analysisColors.coral, "acceleration"]]
    );
  }

  function drawMomentumAnalysis(W, H, t) {
    const values = app.values;
    const mode = values.mode;
    let rows;
    if (mode === "explosion") {
      const splitMomentum = Math.max(1, Math.abs(Number(values.m1 || 4) * Number(values.u1 || 6)));
      rows = [ro("before total", "0"), ro("fragment A", fmt(-splitMomentum)), ro("fragment B", fmt(splitMomentum)), ro("after total", "0")];
    } else if (mode === "wall") {
      const before = Number(values.m1 || 4) * Math.abs(Number(values.u1 || 6));
      const after = -Number(values.e || 0.6) * before;
      rows = [ro("before p", fmt(before)), ro("after p", fmt(after)), ro("impulse", fmt(after - before)), ro("external", fmt(-(after - before)))];
    } else if (["impulse", "change", "forceTime"].includes(mode)) {
      const before = Number(values.m1 || 4) * Number(values.u1 || 0);
      const pulseTime = Math.min(2, duration() * 0.4);
      const impulse = Number(values.force || 0) * Math.min(t, pulseTime);
      rows = [ro("before p", fmt(before)), ro("impulse", fmt(impulse)), ro("after p", fmt(before + impulse)), ro("change", fmt(impulse))];
    } else if (mode === "basic") {
      const momentum = Number(values.m1 || 0) * Number(values.u1 || 0);
      rows = [ro("mass", fmt(values.m1)), ro("velocity", fmt(values.u1)), ro("momentum", fmt(momentum)), ro("direction", momentum >= 0 ? 1 : -1)];
    } else {
      drawMomentumComparison(W, H, values, t);
      return;
    }
    drawMetricAnalysis(W, H, rows, "momentum");
    if (el.analysisSummary) {
      el.analysisSummary.textContent = "Signed bars compare momentum before and after the active event; direction is retained by the sign.";
    }
  }

  function drawMomentumComparison(W, H, values, t) {
    const metrics = collisionMetrics(values);
    const before = [
      { label: "A", value: Number(values.m1) * Number(values.u1), color: analysisColors.cyan },
      { label: "B", value: Number(values.m2) * Number(values.u2), color: analysisColors.gold },
      { label: "TOTAL", value: metrics.pBefore, color: analysisColors.teal }
    ];
    const after = [
      { label: "A", value: Number(values.m1) * metrics.result.v1, color: analysisColors.cyan },
      { label: "B", value: Number(values.m2) * metrics.result.v2, color: analysisColors.gold },
      { label: "TOTAL", value: metrics.pAfter, color: analysisColors.teal }
    ];
    const maxAbs = Math.max(1, ...before.concat(after).map((item) => Math.abs(item.value)));
    const margin = 12;
    const gap = 10;
    const panelWidth = (W - margin * 2 - gap) / 2;
    const panelHeight = H - 66;
    drawMomentumPanel(margin, 12, panelWidth, panelHeight, "BEFORE", before, maxAbs);
    drawMomentumPanel(margin + panelWidth + gap, 12, panelWidth, panelHeight, "AFTER", after, maxAbs);

    const gaugeX = margin;
    const gaugeY = H - 39;
    const gaugeW = W - margin * 2;
    const retained = clamp(metrics.energyRetained / 100, 0, 1);
    analysisCtx.fillStyle = "rgba(255,255,255,.08)";
    analysisRoundedRect(gaugeX, gaugeY, gaugeW, 12, 4, "rgba(255,255,255,.08)");
    const energyFill = analysisCtx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
    energyFill.addColorStop(0, analysisColors.coral);
    energyFill.addColorStop(1, analysisColors.green);
    analysisRoundedRect(gaugeX, gaugeY, Math.max(3, gaugeW * retained), 12, 4, energyFill);
    analysisText("KINETIC ENERGY RETAINED " + fmt(metrics.energyRetained) + "%", gaugeX, H - 8, analysisColors.muted, "bold 9px Sora", "left");
    analysisText("momentum residual " + fmt(metrics.residual), W - margin, H - 8, Math.abs(metrics.residual) < 0.001 ? analysisColors.green : analysisColors.coral, "bold 9px Sora", "right");

    const phase = simulationPhase(t);
    setAnalysisMeta(
      "Impact balance | " + phase.label,
      "The two panels retain signs and verify momentum conservation. The lower gauge shows kinetic energy retained after impact.",
      [[analysisColors.cyan, "particle A"], [analysisColors.gold, "particle B"], [analysisColors.teal, "system total"]]
    );
  }

  function drawMomentumPanel(x, y, width, height, title, items, maxAbs) {
    analysisRoundedRect(x, y, width, height, 6, "rgba(255,255,255,.045)", "rgba(255,255,255,.11)");
    analysisText(title, x + 9, y + 17, analysisColors.white, "bold 9px Sora", "left");
    const zero = x + width * 0.5;
    const half = width * 0.37;
    const rowHeight = (height - 30) / items.length;
    analysisLine(zero, y + 24, zero, y + height - 8, "rgba(234,242,255,.22)", 1);
    items.forEach((item, index) => {
      const rowY = y + 34 + index * rowHeight + rowHeight * 0.36;
      const bar = item.value / maxAbs * half;
      analysisText(item.label, x + 8, rowY + 3, analysisColors.muted, "bold 8px Sora", "left");
      analysisCtx.fillStyle = "rgba(255,255,255,.065)";
      analysisCtx.fillRect(zero - half, rowY - 5, half * 2, 10);
      analysisCtx.fillStyle = item.color;
      analysisCtx.fillRect(Math.min(zero, zero + bar), rowY - 5, Math.abs(bar), 10);
      analysisDot(zero + bar, rowY, 3.5, item.color);
      analysisText(fmt(item.value), x + width - 7, rowY + 3, analysisColors.white, "bold 8px Sora", "right");
    });
  }

  function drawMetricAnalysis(W, H, readouts, stage) {
    const metrics = readouts.map((item) => ({
      key: item.key,
      value: Number.parseFloat(String(item.value).replace(/[^0-9+\-.]/g, "")),
      display: item.value
    })).filter((item) => Number.isFinite(item.value)).slice(0, 5);
    if (!metrics.length) {
      drawConceptAnalysis(W, H);
      return;
    }
    const palette = [analysisColors.cyan, analysisColors.teal, analysisColors.gold, analysisColors.coral, analysisColors.violet];
    const maxAbs = Math.max(1, ...metrics.map((item) => Math.abs(item.value)));
    const left = Math.min(98, W * 0.3);
    const right = 54;
    const zero = left + (W - left - right) * 0.5;
    const half = Math.max(30, (W - left - right) * 0.47);
    const rowH = (H - 54) / metrics.length;
    analysisLine(zero, 20, zero, H - 24, "rgba(234,242,255,.28)", 1);
    metrics.forEach((metric, index) => {
      const y = 34 + rowH * index + rowH * 0.36;
      const width = metric.value / maxAbs * half;
      analysisText(metric.key, left - 8, y + 4, analysisColors.muted, "10px Inter", "right");
      analysisCtx.fillStyle = "rgba(255,255,255,.07)";
      analysisCtx.fillRect(zero - half, y - 6, half * 2, 12);
      analysisCtx.fillStyle = palette[index];
      analysisCtx.fillRect(Math.min(zero, zero + width), y - 6, Math.abs(width), 12);
      analysisDot(zero + width, y, 4, palette[index]);
      analysisText(metric.display, W - 10, y + 4, analysisColors.white, "10px Inter", "right");
    });
    analysisText("negative", zero - half, H - 9, analysisColors.muted, "9px Inter", "left");
    analysisText("positive", zero + half, H - 9, analysisColors.muted, "9px Inter", "right");
    const labels = {
      vectors: "Component balance",
      forces: "Resultant components",
      dynamics: "System quantities",
      incline: "Resolved forces",
      momentum: "Signed momentum",
      moments: "Signed turning effects"
    };
    setAnalysisMeta(
      labels[stage] || "Live quantities",
      "Signed bars preserve direction while their lengths compare the current magnitudes.",
      metrics.map((metric, index) => [palette[index], metric.key])
    );
  }

  function drawConceptAnalysis(W, H) {
    const item = currentCase();
    const formula = (item.formula || []).slice(0, 2).map(plainFormula).join(" ");
    const rows = [
      { label: "OBSERVE", value: item.title, color: analysisColors.cyan },
      { label: "MODEL", value: formula || item.purpose, color: analysisColors.teal },
      { label: "DECIDE", value: (item.moves || ["Choose the matching exam rule."])[0], color: analysisColors.gold }
    ];
    const margin = 18;
    const gap = 12;
    const rowH = (H - margin * 2 - gap * 2) / 3;
    rows.forEach((row, index) => {
      const y = margin + index * (rowH + gap);
      analysisRoundedRect(margin, y, W - margin * 2, rowH, 7, "rgba(255,255,255,.055)", "rgba(255,255,255,.12)");
      analysisCtx.fillStyle = row.color;
      analysisCtx.fillRect(margin, y, 4, rowH);
      analysisText(row.label, margin + 16, y + 20, row.color, "bold 10px Inter", "left");
      analysisWrapText(row.value, margin + 16, y + 39, W - margin * 2 - 28, 14, 3);
      if (index < rows.length - 1) {
        analysisLine(W / 2, y + rowH, W / 2, y + rowH + gap, "rgba(234,242,255,.32)", 1);
      }
    });
    setAnalysisMeta(
      "Model decision map",
      "The active case is organized as observation, mathematical model, and exam decision.",
      [[analysisColors.cyan, "observe"], [analysisColors.teal, "model"], [analysisColors.gold, "decide"]]
    );
  }

  function drawSingleSeriesPlot(W, H, points, currentX, color, yLabel) {
    const pad = { l: 42, r: 16, t: 24, b: 38 };
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    let minY = Math.min(0, ...points.map((point) => point.y));
    let maxY = Math.max(0, ...points.map((point) => point.y));
    if (Math.abs(maxY - minY) < 0.001) {
      minY -= 1;
      maxY += 1;
    }
    const mx = (x) => map1(x, minX, maxX, pad.l, W - pad.r);
    const my = (y) => map1(y, minY, maxY, H - pad.b, pad.t);
    drawAnalysisAxes(W, H, pad, "time / s", yLabel, { minX, maxX, minY, maxY }, mx, my);
    drawAnalysisPath(points.map((point) => ({ x: mx(point.x), y: my(point.y) })), color, 3);
    const cx = clamp(currentX, minX, maxX);
    const current = interpolateSeries(points, cx);
    const px = mx(cx);
    const py = my(current);
    analysisLine(px, pad.t, px, H - pad.b, "rgba(240,207,104,.55)", 1);
    analysisDot(px, py, 6, analysisColors.gold);
  }

  function drawSeriesLane(W, top, height, points, currentX, labelText, color) {
    const left = 58;
    const right = 12;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    let minY = Math.min(...points.map((point) => point.y));
    let maxY = Math.max(...points.map((point) => point.y));
    if (Math.abs(maxY - minY) < 0.001) {
      minY -= 1;
      maxY += 1;
    }
    const mx = (x) => map1(x, minX, maxX, left, W - right);
    const my = (y) => map1(y, minY, maxY, top + height - 10, top + 10);
    analysisCtx.fillStyle = "rgba(255,255,255,.035)";
    analysisCtx.fillRect(left, top, W - left - right, height);
    const zeroY = clamp(my(0), top, top + height);
    analysisLine(left, zeroY, W - right, zeroY, "rgba(234,242,255,.16)", 1);
    drawAnalysisPath(points.map((point) => ({ x: mx(point.x), y: my(point.y) })), color, 2.5);
    const cx = clamp(currentX, minX, maxX);
    const cy = interpolateSeries(points, cx);
    analysisLine(mx(cx), top, mx(cx), top + height, "rgba(240,207,104,.4)", 1);
    analysisDot(mx(cx), my(cy), 4, analysisColors.gold);
    analysisText(labelText, 8, top + 18, color, "bold 10px Inter", "left");
    analysisText(fmt(cy), 8, top + 34, analysisColors.white, "10px Inter", "left");
  }

  function drawAnalysisAxes(W, H, pad, xLabel, yLabel, bounds, mx, my) {
    const zeroX = clamp(mx(0), pad.l, W - pad.r);
    const zeroY = clamp(my(0), pad.t, H - pad.b);
    analysisLine(pad.l, zeroY, W - pad.r, zeroY, "rgba(234,242,255,.3)", 1.2);
    analysisLine(zeroX, pad.t, zeroX, H - pad.b, "rgba(234,242,255,.3)", 1.2);
    analysisText(xLabel, W - pad.r, H - 12, analysisColors.muted, "10px Inter", "right");
    analysisText(yLabel, pad.l, 14, analysisColors.muted, "10px Inter", "left");
    analysisText(fmt(bounds.minX), pad.l, H - pad.b + 16, analysisColors.muted, "9px Inter", "left");
    analysisText(fmt(bounds.maxX), W - pad.r, H - pad.b + 16, analysisColors.muted, "9px Inter", "right");
  }

  function drawAnalysisPath(points, color, width) {
    if (!points.length) return;
    analysisCtx.beginPath();
    points.forEach((point, index) => {
      if (index) analysisCtx.lineTo(point.x, point.y);
      else analysisCtx.moveTo(point.x, point.y);
    });
    analysisCtx.strokeStyle = color;
    analysisCtx.lineWidth = width;
    analysisCtx.lineJoin = "round";
    analysisCtx.lineCap = "round";
    analysisCtx.stroke();
  }

  function analysisLine(x1, y1, x2, y2, color, width) {
    analysisCtx.beginPath();
    analysisCtx.moveTo(x1, y1);
    analysisCtx.lineTo(x2, y2);
    if (color) analysisCtx.strokeStyle = color;
    if (width) analysisCtx.lineWidth = width;
    analysisCtx.stroke();
  }

  function analysisDot(x, y, radius, color) {
    analysisCtx.beginPath();
    analysisCtx.arc(x, y, radius, 0, Math.PI * 2);
    analysisCtx.fillStyle = color;
    analysisCtx.fill();
    analysisCtx.strokeStyle = "rgba(6,21,38,.85)";
    analysisCtx.lineWidth = 2;
    analysisCtx.stroke();
  }

  function analysisText(text, x, y, color, font, align) {
    analysisCtx.fillStyle = color || analysisColors.white;
    analysisCtx.font = font || "10px Inter";
    analysisCtx.textAlign = align || "left";
    analysisCtx.textBaseline = "alphabetic";
    analysisCtx.fillText(String(text), x, y);
  }

  function analysisWrapText(text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let current = "";
    analysisCtx.font = "11px Inter";
    words.forEach((word) => {
      const test = current ? current + " " + word : word;
      if (analysisCtx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      visible[visible.length - 1] = visible[visible.length - 1].replace(/[.,;:]?$/, "...");
    }
    visible.forEach((lineText, index) => analysisText(lineText, x, y + index * lineHeight, analysisColors.white, "11px Inter", "left"));
  }

  function analysisRoundedRect(x, y, width, height, radius, fill, stroke) {
    const r = Math.min(radius, width / 2, height / 2);
    analysisCtx.beginPath();
    analysisCtx.moveTo(x + r, y);
    analysisCtx.lineTo(x + width - r, y);
    analysisCtx.quadraticCurveTo(x + width, y, x + width, y + r);
    analysisCtx.lineTo(x + width, y + height - r);
    analysisCtx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    analysisCtx.lineTo(x + r, y + height);
    analysisCtx.quadraticCurveTo(x, y + height, x, y + height - r);
    analysisCtx.lineTo(x, y + r);
    analysisCtx.quadraticCurveTo(x, y, x + r, y);
    analysisCtx.closePath();
    if (fill) {
      analysisCtx.fillStyle = fill;
      analysisCtx.fill();
    }
    if (stroke) {
      analysisCtx.strokeStyle = stroke;
      analysisCtx.lineWidth = 1;
      analysisCtx.stroke();
    }
  }

  function interpolateSeries(points, x) {
    if (!points.length) return 0;
    if (x <= points[0].x) return points[0].y;
    for (let i = 1; i < points.length; i++) {
      if (x <= points[i].x) {
        const a = points[i - 1];
        const b = points[i];
        const ratio = (x - a.x) / Math.max(0.000001, b.x - a.x);
        return a.y + (b.y - a.y) * ratio;
      }
    }
    return points[points.length - 1].y;
  }

  function plainFormula(value) {
    return String(value || "")
      .replace(/<sup>(.*?)<\/sup>/g, "^$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&times;/g, " x ")
      .replace(/&mu;/g, "mu")
      .replace(/&theta;/g, "theta")
      .replace(/&Sigma;/g, "sum")
      .replace(/&frac12;/g, "1/2")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setAnalysisMeta(title, summary, legend) {
    if (el.analysisTitle) el.analysisTitle.textContent = title;
    if (el.analysisSummary) el.analysisSummary.textContent = summary;
    if (el.analysisLegend) {
      el.analysisLegend.innerHTML = (legend || []).slice(0, 5).map(([color, labelText]) => `
        <span class="legend-item"><span class="legend-swatch" style="--legend-color:${color}"></span>${escapeHtml(labelText)}</span>
      `).join("");
    }
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

  function drawPathProgress(map, points, progress, color, width) {
    if (!points.length) return;
    const q = clamp(progress, 0, 1);
    const exact = q * (points.length - 1);
    const last = Math.floor(exact);
    const fraction = exact - last;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index > last) return;
      const mapped = map(point.x, point.y);
      if (index) ctx.lineTo(mapped.x, mapped.y);
      else ctx.moveTo(mapped.x, mapped.y);
    });
    if (last < points.length - 1 && fraction > 0) {
      const a = points[last];
      const b = points[last + 1];
      const mapped = map(a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction);
      ctx.lineTo(mapped.x, mapped.y);
    }
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

  function drawMiniPolygon(W, H, forces, progress) {
    let p = { x: W * 0.74, y: H * 0.72 };
    label(p.x - 20, p.y - 42, "tip-to-tail", colors.dim);
    forces.forEach((f, index) => {
      const n = { x: p.x + f.x * 5, y: p.y - f.y * 5 };
      const q = clamp(Number(progress == null ? 1 : progress) * forces.length - index, 0, 1);
      const live = { x: p.x + (n.x - p.x) * q, y: p.y + (n.y - p.y) * q };
      ctx.save();
      ctx.setLineDash([4, 5]);
      line(p.x, p.y, n.x, n.y, "rgba(220,235,248,.17)", 1);
      ctx.restore();
      if (q > 0.02) arrow(p.x, p.y, live.x, live.y, f.color, 2.5);
      p = n;
    });
  }

  function collision(v) {
    const m1 = Math.max(0.001, Number(v.m1));
    const m2 = Math.max(0.001, Number(v.m2));
    const u1 = Number(v.u1);
    const u2 = Number(v.u2);
    const e = clamp(Number(v.e), 0, 1);
    const denom = m1 + m2;
    const v1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / denom;
    const v2 = ((m2 - e * m1) * u2 + (1 + e) * m1 * u1) / denom;
    if (v.mode === "stick" || v.mode === "coalescing" || currentCase().id === "coalescing") {
      const common = (m1 * u1 + m2 * u2) / denom;
      return { v1: common, v2: common };
    }
    return { v1, v2 };
  }

  function collisionMetrics(v) {
    const result = collision(v);
    const m1 = Number(v.m1);
    const m2 = Number(v.m2);
    const u1 = Number(v.u1);
    const u2 = Number(v.u2);
    const pBefore = m1 * u1 + m2 * u2;
    const pAfter = m1 * result.v1 + m2 * result.v2;
    const keBefore = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
    const keAfter = 0.5 * m1 * result.v1 * result.v1 + 0.5 * m2 * result.v2 * result.v2;
    return {
      result,
      pBefore,
      pAfter,
      residual: pAfter - pBefore,
      keBefore,
      keAfter,
      energyRetained: keBefore > 1e-8 ? 100 * keAfter / keBefore : 100
    };
  }

  function collisionTimeline(v, W, t) {
    const profile = currentProfile();
    const T = duration();
    const impactTime = profile.impactRatio * T;
    const contactDuration = Math.max(0.2, Math.min(0.48, T * 0.065));
    const result = collision(v);
    const u1 = Number(v.u1);
    const u2 = Number(v.u2);
    const halfGap = 43 * profile.objectScale;
    const contactX = W * (0.5 + profile.cameraShift);
    const hitX1 = contactX - halfGap;
    const hitX2 = contactX + halfGap;
    const maxSpeed = Math.max(1, Math.abs(u1), Math.abs(u2), Math.abs(result.v1), Math.abs(result.v2));
    const scale = clamp((W * 0.28) / Math.max(1, maxSpeed * impactTime), 3.8, 16);
    const startX1 = hitX1 - u1 * impactTime * scale;
    const startX2 = hitX2 - u2 * impactTime * scale;
    let phase = "before";
    let eventProgress = 0;
    let compression = 0;
    let x1;
    let x2;
    let velocity1;
    let velocity2;

    if (t < impactTime) {
      x1 = startX1 + u1 * t * scale;
      x2 = startX2 + u2 * t * scale;
      velocity1 = u1;
      velocity2 = u2;
    } else if (t < impactTime + contactDuration) {
      phase = "impact";
      eventProgress = clamp((t - impactTime) / contactDuration, 0, 1);
      compression = Math.sin(Math.PI * eventProgress);
      x1 = hitX1 + compression * 7;
      x2 = hitX2 - compression * 7;
      const blend = smoothStep(eventProgress);
      velocity1 = u1 + (result.v1 - u1) * blend;
      velocity2 = u2 + (result.v2 - u2) * blend;
    } else {
      phase = "after";
      const afterTime = t - impactTime - contactDuration;
      velocity1 = result.v1;
      velocity2 = result.v2;
      x1 = hitX1 + result.v1 * afterTime * scale;
      x2 = hitX2 + result.v2 * afterTime * scale;
      if (v.mode === "follow") {
        const deceleration = Math.abs(Number(v.force || 0)) / Math.max(0.1, Number(v.m2));
        const stopTime = Math.abs(result.v2) / Math.max(0.001, deceleration);
        const active = Math.min(afterTime, stopTime);
        const signedA = -Math.sign(result.v2 || 1) * deceleration;
        x2 = hitX2 + (result.v2 * active + 0.5 * signedA * active * active) * scale;
        velocity2 = result.v2 + signedA * active;
      }
    }

    return { phase, eventProgress, compression, x1, x2, velocity1, velocity2, contactX, impactTime, contactDuration, scale };
  }

  function drawTrack(y, W, profile) {
    const activeProfile = profile || currentProfile();
    const floor = ctx.createLinearGradient(0, y - 6, 0, y + 34);
    floor.addColorStop(0, "rgba(175,204,225,.18)");
    floor.addColorStop(1, "rgba(4,15,27,.42)");
    ctx.fillStyle = floor;
    ctx.fillRect(42, y - 4, W - 84, 34);
    for (let x = 58; x < W - 48; x += 42) {
      ctx.fillStyle = "rgba(155,181,202,.18)";
      rounded(x, y + 8, 28, 7, 2, true);
    }
    const rail = ctx.createLinearGradient(0, y - 3, 0, y + 5);
    rail.addColorStop(0, "#e4edf5");
    rail.addColorStop(0.45, "#8ca2b7");
    rail.addColorStop(1, "#344a5e");
    ctx.strokeStyle = rail;
    ctx.lineWidth = 5;
    line(44, y, W - 44, y);
    ctx.strokeStyle = activeProfile.accent;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1;
    line(44, y - 7, W - 44, y - 7);
    ctx.globalAlpha = 1;
  }

  function drawCart(x, y, color, name, options) {
    const opts = options || {};
    const scale = Number(opts.scale || 1);
    const compression = clamp(Number(opts.compressed || 0), 0, 1);
    const width = 82 * scale * (1 - compression * 0.08);
    const height = 39 * scale * (1 + compression * 0.035);
    const wheel = 8 * scale;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#010713";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, width * 0.58, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const body = ctx.createLinearGradient(x - width / 2, y - height, x + width / 2, y);
    body.addColorStop(0, "#f6fbff");
    body.addColorStop(0.14, color);
    body.addColorStop(0.72, color);
    body.addColorStop(1, "#18324a");
    ctx.fillStyle = body;
    rounded(x - width / 2, y - height, width, height, 7, true);
    ctx.strokeStyle = "rgba(255,255,255,.52)";
    ctx.lineWidth = 1.2;
    rounded(x - width / 2, y - height, width, height, 7, false, true);

    ctx.fillStyle = "#071525";
    rounded(x - width * 0.2, y - height * 0.72, width * 0.4, height * 0.42, 4, true);
    ctx.fillStyle = "#dbe7f1";
    ctx.font = "800 " + Math.max(9, 11 * scale) + "px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - height * 0.42);

    [x - width * 0.29, x + width * 0.29].forEach((wheelX) => {
      ctx.fillStyle = "#030a13";
      circle(wheelX, y + wheel * 0.36, wheel);
      ctx.fillStyle = "#6f879c";
      circle(wheelX, y + wheel * 0.36, wheel * 0.47);
      ctx.fillStyle = "#dce7ef";
      circle(wheelX, y + wheel * 0.36, wheel * 0.16);
    });

    ctx.fillStyle = color;
    rounded(x - width / 2 - 4, y - height * 0.52, 6, height * 0.22, 2, true);
    rounded(x + width / 2 - 2, y - height * 0.52, 6, height * 0.22, 2, true);
    if (Number.isFinite(Number(opts.mass))) {
      ctx.textAlign = "center";
      label(x, y - height - 8, fmt(opts.mass) + " kg", "rgba(235,244,252,.82)", "700 9px Sora");
    }
    ctx.textAlign = "left";
  }

  function drawVelocityTrail(x, y, velocity, color, intensity) {
    const value = Number(velocity || 0);
    if (Math.abs(value) < 0.08) return;
    const direction = Math.sign(value);
    const strength = clamp(Number(intensity == null ? 1 : intensity), 0, 1);
    const length = clamp(Math.abs(value) * 6, 24, 82);
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 1; i <= 4; i += 1) {
      const offset = i * 8;
      ctx.globalAlpha = strength * (0.24 - i * 0.035);
      line(x - direction * offset, y + (i - 2.5) * 5, x - direction * (length + offset), y + (i - 2.5) * 5, color, Math.max(1, 5 - i));
    }
    ctx.restore();
  }

  function drawVelocityIndicator(x, y, velocity, color, name) {
    const value = Number(velocity || 0);
    const direction = value === 0 ? 1 : Math.sign(value);
    const length = value === 0 ? 14 : clamp(Math.abs(value) * 8, 24, 88);
    arrow(x, y, x + direction * length, y, color, 3);
    const tx = direction > 0 ? x + length + 7 : x - length - 7;
    ctx.save();
    ctx.textAlign = direction > 0 ? "left" : "right";
    label(tx, y - 6, name + " = " + fmt(value) + " m/s", color, "700 10px Sora");
    ctx.restore();
  }

  function drawImpactZone(x, y, phase) {
    ctx.save();
    ctx.setLineDash([5, 7]);
    line(x, y - 164, x, y + 27, phase === "impact" ? colors.goldSoft : "rgba(210,228,242,.2)", phase === "impact" ? 2 : 1);
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    label(x, y + 48, phase === "impact" ? "contact interval" : "impact plane", phase === "impact" ? colors.goldSoft : colors.dim, "700 9px Sora");
    ctx.restore();
  }

  function drawImpactPulse(x, y, progress, profile) {
    const q = clamp(progress, 0, 1);
    ctx.save();
    ctx.strokeStyle = profile.secondary;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9 - q * 0.45;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x, y, 14 + i * 13 + q * 12, -0.72, 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 14 + i * 13 + q * 12, Math.PI - 0.72, Math.PI + 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoupler(x, y, color) {
    ctx.fillStyle = color;
    rounded(x - 12, y - 5, 24, 10, 3, true);
    ctx.strokeStyle = "rgba(255,255,255,.58)";
    ctx.lineWidth = 1;
    rounded(x - 12, y - 5, 24, 10, 3, false, true);
  }

  function drawSceneMetric(x, y, key, value, accent) {
    ctx.fillStyle = "rgba(3,15,28,.82)";
    rounded(x, y, 138, 55, 6, true);
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    rounded(x, y, 138, 55, 6, false, true);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 4, 55);
    label(x + 13, y + 20, key, colors.dim, "700 9px Sora");
    label(x + 13, y + 41, value, "#fff", "800 12px Sora");
  }

  function drawImpulseMeter(x, y, value, maximum, profile) {
    const ratio = clamp(Math.abs(value) / Math.max(0.001, Math.abs(maximum)), 0, 1);
    ctx.fillStyle = "rgba(3,15,28,.82)";
    rounded(x, y, 142, 62, 6, true);
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    rounded(x, y, 142, 62, 6, false, true);
    label(x + 12, y + 20, "IMPULSE TRANSFER", colors.dim, "700 8px Sora");
    ctx.fillStyle = "rgba(255,255,255,.11)";
    rounded(x + 12, y + 31, 118, 10, 3, true);
    const fill = ctx.createLinearGradient(x + 12, 0, x + 130, 0);
    fill.addColorStop(0, profile.accent);
    fill.addColorStop(1, profile.secondary);
    ctx.fillStyle = fill;
    rounded(x + 12, y + 31, Math.max(3, 118 * ratio), 10, 3, true);
    label(x + 12, y + 55, fmt(value) + " N s", "#fff", "800 10px Sora");
  }

  function drawImpactWall(x, y, profile) {
    const wall = ctx.createLinearGradient(x, 0, x + 30, 0);
    wall.addColorStop(0, profile.material);
    wall.addColorStop(0.35, "#7d93a7");
    wall.addColorStop(1, "#24394d");
    ctx.fillStyle = wall;
    rounded(x, y - 154, 28, 154, 3, true);
    ctx.strokeStyle = "rgba(4,18,31,.44)";
    ctx.lineWidth = 1;
    for (let yy = y - 136; yy < y; yy += 22) {
      line(x, yy, x + 28, yy);
      const offset = ((yy - (y - 136)) / 22) % 2 ? 8 : 18;
      line(x + offset, yy - 22, x + offset, yy);
    }
    label(x - 3, y - 166, "fixed wall", profile.secondary, "700 9px Sora");
  }

  function drawBall(x, y, radius, color, options) {
    const opts = options || {};
    const compression = clamp(Number(opts.compression || 0), 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#010713";
    ctx.beginPath();
    ctx.ellipse(x, y + radius + 5, radius * 1.15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 - compression * 0.18, 1 + compression * 0.12);
    const ball = ctx.createLinearGradient(-radius, -radius, radius, radius);
    ball.addColorStop(0, "#ffffff");
    ball.addColorStop(0.2, color);
    ball.addColorStop(0.72, color);
    ball.addColorStop(1, "#18324a");
    ctx.fillStyle = ball;
    circle(0, 0, radius);
    ctx.strokeStyle = "rgba(255,255,255,.52)";
    ctx.lineWidth = 1.5;
    circle(0, 0, radius, false, "rgba(255,255,255,.52)");
    ctx.restore();
    if (opts.label) {
      ctx.save();
      ctx.textAlign = "center";
      label(x, y - radius - 10, opts.label, "rgba(235,244,252,.82)", "700 9px Sora");
      ctx.restore();
    }
  }

  function smoothStep(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
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

  function drawCanvasWrappedText(text, x, y, maxWidth, fontSize, maxLines, color) {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let current = "";
    ctx.save();
    ctx.fillStyle = color || colors.dim;
    ctx.font = fontSize + "px Inter, sans-serif";
    words.forEach((word) => {
      const test = current ? current + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) visible[visible.length - 1] += "...";
    visible.forEach((lineText, index) => ctx.fillText(lineText, x, y + index * (fontSize + 2)));
    ctx.restore();
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

  window.__ELITE_LAB_AUDIT__ = Object.freeze({
    release: "20260809i",
    topicCount: TOPICS.length,
    caseCount: TOPICS.reduce((sum, topic) => sum + topic.cases.length, 0),
    profileCount: CASE_VISUAL_PROFILES.length,
    uniqueProfileCount: new Set(CASE_VISUAL_PROFILES.map((profile) => profile.signature)).size,
    measurementSlots: 2,
    motionContract: "time-driven-98",
    caseIds: Object.freeze(TOPICS.flatMap((topic) => topic.cases.map((item) => item.id))),
    activateCase: function (caseId) {
      const topicIndex = TOPICS.findIndex((topic) => topic.cases.some((item) => item.id === caseId));
      if (topicIndex < 0) return false;
      const caseIndex = TOPICS[topicIndex].cases.findIndex((item) => item.id === caseId);
      selectTopic(topicIndex);
      selectCase(caseIndex);
      return true;
    },
    seek: function (time) {
      app.t = clamp(Number(time || 0), 0, duration());
      setPlaying(false);
      render();
      return app.t;
    },
    activeState: function () {
      const phase = simulationPhase(app.t);
      return {
        caseId: currentCase().id,
        signature: currentProfile().signature,
        phase: phase.label,
        time: app.t,
        playing: app.playing,
        readouts: app.lastReadouts.slice(),
        pinnedMeasurements: Number(Boolean(app.measurements.a)) + Number(Boolean(app.measurements.b)),
        eventCount: measurementEvents().length
      };
    }
  });

  init();
}());
