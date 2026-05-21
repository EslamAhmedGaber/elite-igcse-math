window.TRIGGER_NOTES_DATA = [
  {
    id: "regular-polygon",
    keyword: "regular polygon",
    category: "Geometry",
    topics: ["Angles in Polygons & Parallel Lines"],
    aliases: ["regular pentagon", "regular hexagon", "regular n-sided polygon"],
    hint: "All sides are equal and all angles are equal. The examiner usually wants angle facts, not a drawing guess.",
    moves: [
      "If the polygon has n sides, exterior angle = 360 / n.",
      "Interior angle = 180 - exterior angle.",
      "Sum of interior angles = (n - 2) x 180, then divide by n if the polygon is regular."
    ],
    traps: [
      "Do not use one measured angle from the diagram.",
      "If they ask for n, use exterior angle first whenever possible."
    ],
    phrases: ["A regular pentagon...", "Each exterior angle of a regular polygon...", "A regular n-sided polygon..."]
  },
  {
    id: "parallel-lines",
    keyword: "parallel",
    category: "Geometry",
    topics: ["Angles in Polygons & Parallel Lines", "Coordinate Geometry", "Linear Graphs (y = mx + c)"],
    aliases: ["parallel lines", "parallel sides", "same gradient"],
    hint: "Parallel means equal angle patterns in geometry, or equal gradients in coordinate geometry.",
    moves: [
      "For angle questions: look for corresponding, alternate, and co-interior angles.",
      "For lines: parallel lines have the same gradient.",
      "If a polygon has parallel sides, mark equal angle families before calculating."
    ],
    traps: [
      "Do not mix up alternate and corresponding angles.",
      "For coordinate geometry, same gradient does not mean same line."
    ],
    phrases: ["AB is parallel to CD", "The lines are parallel", "Find the equation of a line parallel to..."]
  },
  {
    id: "perpendicular-lines",
    keyword: "perpendicular",
    category: "Geometry",
    topics: ["Coordinate Geometry", "Linear Graphs (y = mx + c)"],
    aliases: ["normal", "right angle", "negative reciprocal gradient"],
    hint: "Perpendicular lines meet at 90 degrees. In coordinate geometry, their gradients multiply to -1.",
    moves: [
      "Find the first gradient.",
      "Use m1 x m2 = -1 to get the perpendicular gradient.",
      "Use y - y1 = m(x - x1) or y = mx + c with the given point."
    ],
    traps: [
      "Do not only change the sign. You must also flip the fraction.",
      "A vertical line is perpendicular to a horizontal line."
    ],
    phrases: ["Find the equation of the perpendicular line", "The normal to the curve", "AB is perpendicular to CD"]
  },
  {
    id: "tangent",
    keyword: "tangent",
    category: "Geometry",
    topics: ["Circle Theorems", "Coordinate Geometry", "Differentiation"],
    aliases: ["touches the circle", "normal", "radius to tangent"],
    hint: "A tangent touches once. In circle geometry, radius to tangent is 90 degrees. In calculus, tangent gradient comes from the derivative.",
    moves: [
      "Circle theorem route: draw the radius to the point of contact and mark 90 degrees.",
      "Coordinate route: find the radius gradient, then use perpendicular gradient for the tangent.",
      "Calculus route: differentiate, substitute x, then use y = mx + c."
    ],
    traps: [
      "Do not assume a tangent is horizontal unless the question proves it.",
      "The tangent point is the only shared point with the circle."
    ],
    phrases: ["The tangent at A", "A line touches the circle", "Find the equation of the tangent"]
  },
  {
    id: "cyclic-quadrilateral",
    keyword: "cyclic quadrilateral",
    category: "Geometry",
    topics: ["Circle Theorems"],
    aliases: ["opposite angles in a cyclic quadrilateral", "points lie on a circle"],
    hint: "If four points lie on the same circle, opposite angles add to 180 degrees.",
    moves: [
      "Identify the four vertices on the circumference.",
      "Pair opposite angles.",
      "Use angle + opposite angle = 180."
    ],
    traps: [
      "Only use this when all four vertices are on the circle.",
      "Do not use it for a quadrilateral that merely touches a circle."
    ],
    phrases: ["ABCD is a cyclic quadrilateral", "A, B, C and D lie on a circle", "Opposite angles..."]
  },
  {
    id: "angle-semicircle",
    keyword: "diameter / semicircle",
    category: "Geometry",
    topics: ["Circle Theorems"],
    aliases: ["angle in a semicircle", "subtended by a diameter"],
    hint: "An angle standing on a diameter is 90 degrees.",
    moves: [
      "Find the diameter line.",
      "Look for a triangle whose third point is on the circumference.",
      "Mark the angle at the circumference as 90 degrees."
    ],
    traps: [
      "The angle must be at the circumference.",
      "The side opposite the right angle must be the diameter."
    ],
    phrases: ["AB is a diameter", "The angle in a semicircle", "A point on the circumference"]
  },
  {
    id: "same-segment",
    keyword: "same segment",
    category: "Geometry",
    topics: ["Circle Theorems"],
    aliases: ["angles in the same segment", "same chord"],
    hint: "Angles standing on the same chord are equal.",
    moves: [
      "Find the shared chord.",
      "Identify the two angles standing on it.",
      "Set the angles equal."
    ],
    traps: [
      "The two angles must be on the same side of the chord.",
      "Use the chord, not the arc label, to anchor your reasoning."
    ],
    phrases: ["Angles in the same segment", "Subtended by the same chord", "Find x in the circle"]
  },
  {
    id: "alternate-segment",
    keyword: "alternate segment",
    category: "Geometry",
    topics: ["Circle Theorems"],
    aliases: ["tangent-chord theorem", "angle between tangent and chord"],
    hint: "The angle between a tangent and a chord equals the angle in the opposite segment.",
    moves: [
      "Identify the tangent and chord at the point of contact.",
      "Find the angle in the opposite segment standing on the same chord.",
      "Set the two angles equal."
    ],
    traps: [
      "Do not use the radius-tangent 90 degree fact unless a radius is drawn or implied.",
      "Choose the angle in the opposite segment, not a nearby angle."
    ],
    phrases: ["The tangent at A", "Alternate segment theorem", "Angle between the tangent and chord"]
  },
  {
    id: "similar-shapes",
    keyword: "similar",
    category: "Geometry",
    topics: ["Congruence, Similarity & Geometrical Proof", "Area & Volume of Similar Shapes"],
    aliases: ["scale factor", "similar triangles", "similar solids"],
    hint: "Similar means same shape, different size. Length, area, and volume scale differently.",
    moves: [
      "Find the length scale factor first.",
      "Area scale factor = length scale factor squared.",
      "Volume scale factor = length scale factor cubed."
    ],
    traps: [
      "Do not use the area scale factor for lengths.",
      "Check direction: small to large or large to small."
    ],
    phrases: ["The shapes are similar", "Similar solids", "Find the scale factor"]
  },
  {
    id: "congruent",
    keyword: "congruent",
    category: "Geometry",
    topics: ["Congruence, Similarity & Geometrical Proof"],
    aliases: ["SSS", "SAS", "ASA", "RHS"],
    hint: "Congruent means same shape and same size. You need a valid reason, not just looks equal.",
    moves: [
      "Match equal sides and equal angles.",
      "Use a recognised test: SSS, SAS, ASA, or RHS.",
      "Write a short proof statement."
    ],
    traps: [
      "AAA proves similarity, not congruence.",
      "Be careful with side-angle-side order."
    ],
    phrases: ["Prove the triangles are congruent", "Show that triangle ABC is congruent to triangle DEF"]
  },
  {
    id: "bearing",
    keyword: "bearing",
    category: "Geometry",
    topics: ["Bearings, Scale Drawing & Constructions", "Sine, Cosine Rule & Area of Triangles"],
    aliases: ["three-figure bearing", "from north", "clockwise from north"],
    hint: "Bearing is measured clockwise from north and written with three digits.",
    moves: [
      "Draw a north line at the point named after 'from'.",
      "Measure clockwise from north.",
      "Use parallel north lines to transfer angles if needed."
    ],
    traps: [
      "Bearing of A from B is not the same as bearing of B from A.",
      "Always write three digits, for example 047 degrees."
    ],
    phrases: ["The bearing of A from B", "On a bearing of", "Three-figure bearing"]
  },
  {
    id: "bounds",
    keyword: "bounds",
    category: "Number",
    topics: ["Rounding, Estimation & Bounds"],
    aliases: ["upper bound", "lower bound", "maximum possible", "minimum possible"],
    hint: "Bounds questions ask for the extreme possible value after rounding.",
    moves: [
      "Write the upper and lower bounds for every rounded value.",
      "For maximum, choose the combination that makes the expression largest.",
      "For minimum, choose the combination that makes the expression smallest."
    ],
    traps: [
      "Division reverses which bound is useful in the denominator.",
      "Do not round early inside the calculation."
    ],
    phrases: ["Correct to the nearest...", "Upper bound", "Calculate the maximum possible value"]
  },
  {
    id: "estimate",
    keyword: "estimate",
    category: "Number",
    topics: ["Rounding, Estimation & Bounds"],
    aliases: ["approximate", "sensible estimate"],
    hint: "Estimate means round the numbers to make the calculation mental and quick.",
    moves: [
      "Round each number to 1 significant figure unless the question suggests otherwise.",
      "Do the simplified calculation.",
      "Check the answer is a sensible size."
    ],
    traps: [
      "Do not use the exact calculator answer.",
      "Do not over-round small decimals to zero."
    ],
    phrases: ["Estimate the value of", "By rounding each number", "Write down an estimate"]
  },
  {
    id: "standard-form",
    keyword: "standard form",
    category: "Number",
    topics: ["Powers, Roots & Standard Form"],
    aliases: ["scientific notation", "A x 10^n"],
    hint: "Standard form must be A x 10^n where 1 <= A < 10 and n is an integer.",
    moves: [
      "Put the number between 1 and 10.",
      "Count how many places the decimal point moved.",
      "Use positive powers for large numbers and negative powers for small decimals."
    ],
    traps: [
      "A cannot be 10 or more.",
      "Check negative powers for numbers less than 1."
    ],
    phrases: ["Give your answer in standard form", "Write in the form A x 10^n"]
  },
  {
    id: "exact",
    keyword: "exact",
    category: "Number",
    topics: ["Surds", "Sine, Cosine Rule & Area of Triangles", "Powers, Roots & Standard Form"],
    aliases: ["exact value", "leave in terms of pi", "leave as a surd"],
    hint: "Exact means do not turn the answer into a rounded decimal.",
    moves: [
      "Keep pi, fractions, and surds in the answer.",
      "Simplify surds if possible.",
      "Only use decimals if the question asks for them."
    ],
    traps: [
      "Do not press decimal and round.",
      "If pi appears, leave pi unless a decimal accuracy is requested."
    ],
    phrases: ["Give your answer exactly", "Leave your answer in terms of pi", "Write as a surd"]
  },
  {
    id: "surd-simplify",
    keyword: "surd",
    category: "Number",
    topics: ["Surds"],
    aliases: ["simplify surds", "rationalise", "exact form"],
    hint: "Surd questions usually want the square factor removed or the denominator rationalised.",
    moves: [
      "Split the number into a square factor x leftover.",
      "Take the square root of the square factor outside.",
      "If rationalising, multiply top and bottom by the surd expression needed."
    ],
    traps: [
      "Do not simplify sqrt(8) to 4.",
      "Remember to multiply every term when rationalising a binomial denominator."
    ],
    phrases: ["Simplify sqrt", "Rationalise the denominator", "Give your answer in the form a sqrt b"]
  },
  {
    id: "compound-interest",
    keyword: "compound",
    category: "Number",
    topics: ["Compound Interest & Depreciation", "Percentages"],
    aliases: ["compound interest", "depreciation", "repeated percentage change"],
    hint: "Repeated percentage change uses a multiplier raised to the number of periods.",
    moves: [
      "Increase by r percent: multiplier = 1 + r/100.",
      "Decrease by r percent: multiplier = 1 - r/100.",
      "Final amount = original x multiplier^n."
    ],
    traps: [
      "Do not add the percentage repeatedly for compound change.",
      "Depreciation uses a multiplier less than 1."
    ],
    phrases: ["Compound interest", "Depreciates by", "Increases by ... each year"]
  },
  {
    id: "proportion",
    keyword: "proportional",
    category: "Number",
    topics: ["Direct & Inverse Proportion"],
    aliases: ["directly proportional", "inversely proportional", "constant of proportionality"],
    hint: "Proportion questions are about building an equation with k.",
    moves: [
      "Direct proportion: y = kx or y = kx^n.",
      "Inverse proportion: y = k/x or y = k/x^n.",
      "Use the first pair of values to find k, then answer the question."
    ],
    traps: [
      "Read the power carefully, for example proportional to the square of x.",
      "Inverse proportion is not the same as negative gradient."
    ],
    phrases: ["y is directly proportional to", "y is inversely proportional to", "Find k"]
  },
  {
    id: "best-buy",
    keyword: "best buy",
    category: "Number",
    topics: ["Exchange Rates & Best Buys", "Ratio Problem Solving"],
    aliases: ["better value", "exchange rate", "unit price"],
    hint: "Best buy means compare the same unit, not the package price.",
    moves: [
      "Convert each option to price per 1 unit or units per 1 pound.",
      "Compare like with like.",
      "State which is better and why."
    ],
    traps: [
      "Do not compare different packet sizes directly.",
      "For exchange rates, check whether to multiply or divide."
    ],
    phrases: ["Which is the better value", "Exchange rate", "Best buy"]
  },
  {
    id: "gradient",
    keyword: "gradient",
    category: "Graphs",
    topics: ["Linear Graphs (y = mx + c)", "Coordinate Geometry", "Estimating Gradients", "Differentiation"],
    aliases: ["slope", "rate of change", "m"],
    hint: "Gradient is change in y divided by change in x. In calculus it comes from dy/dx.",
    moves: [
      "For a straight line: gradient = rise / run.",
      "For two points: m = (y2 - y1) / (x2 - x1).",
      "For a curve: draw a tangent or differentiate."
    ],
    traps: [
      "Use the same direction for both x and y changes.",
      "A negative gradient slopes down from left to right."
    ],
    phrases: ["Find the gradient", "Rate of change", "Estimate the gradient of the curve"]
  },
  {
    id: "y-mx-c",
    keyword: "y = mx + c",
    category: "Graphs",
    topics: ["Linear Graphs (y = mx + c)", "Coordinate Geometry"],
    aliases: ["equation of a line", "intercept", "straight line graph"],
    hint: "m is the gradient and c is the y-intercept.",
    moves: [
      "Find m from the graph or two points.",
      "Find c from where the line crosses the y-axis, or substitute a point.",
      "Write the final equation clearly."
    ],
    traps: [
      "The x-intercept is not c.",
      "If using a point, substitute x and y carefully."
    ],
    phrases: ["Find the equation of the line", "The line has gradient", "Write in the form y = mx + c"]
  },
  {
    id: "area-under-graph",
    keyword: "area under graph",
    category: "Graphs",
    topics: ["Graphs of Functions", "Standard & Compound Units"],
    aliases: ["displacement", "velocity-time graph", "distance travelled"],
    hint: "For a velocity-time graph, area under the graph gives displacement or distance.",
    moves: [
      "Split the region into rectangles, triangles, and trapezia.",
      "Calculate each area.",
      "Add the areas with correct units."
    ],
    traps: [
      "Gradient of a velocity-time graph is acceleration, not distance.",
      "Area below the time axis is negative displacement."
    ],
    phrases: ["Velocity-time graph", "Find the displacement", "Calculate the distance travelled"]
  },
  {
    id: "differentiate",
    keyword: "differentiate",
    category: "Graphs",
    topics: ["Differentiation"],
    aliases: ["derivative", "dy/dx", "rate of change"],
    hint: "Differentiation gives the gradient function.",
    moves: [
      "Use ax^n -> anx^(n-1).",
      "Substitute the x-value to find the gradient at a point.",
      "For stationary points, set dy/dx = 0."
    ],
    traps: [
      "Do not forget constants disappear.",
      "For tangent equations, you still need a point after finding the gradient."
    ],
    phrases: ["Find dy/dx", "Differentiate", "Find the gradient of the tangent"]
  },
  {
    id: "stationary-point",
    keyword: "stationary point",
    category: "Graphs",
    topics: ["Differentiation", "Completing the Square"],
    aliases: ["turning point", "maximum", "minimum"],
    hint: "At a stationary point, the gradient is zero.",
    moves: [
      "Differentiate the function.",
      "Set dy/dx = 0 and solve for x.",
      "Substitute x back into the original function to find y."
    ],
    traps: [
      "Do not substitute into dy/dx to find y.",
      "If using completing the square, read the vertex carefully."
    ],
    phrases: ["Find the coordinates of the stationary point", "Find the turning point", "Minimum point"]
  },
  {
    id: "complete-square",
    keyword: "complete the square",
    category: "Algebra",
    topics: ["Completing the Square", "Solving Quadratic Equations"],
    aliases: ["turning point form", "vertex form"],
    hint: "Completing the square rewrites a quadratic to show the turning point or solve it.",
    moves: [
      "Halve the coefficient of x and square it.",
      "Balance the expression by adding and subtracting the square.",
      "Read the turning point from a(x + p)^2 + q."
    ],
    traps: [
      "Be careful when the coefficient of x^2 is not 1.",
      "The x-coordinate has the opposite sign inside the bracket."
    ],
    phrases: ["Write in completed square form", "Hence find the minimum value", "Find the turning point"]
  },
  {
    id: "factorise",
    keyword: "factorise fully",
    category: "Algebra",
    topics: ["Factorising", "Solving Quadratic Equations"],
    aliases: ["common factor", "difference of squares", "quadratic factorisation"],
    hint: "Fully means keep going until no more factors can be taken out.",
    moves: [
      "Look for a common factor first.",
      "Check special forms: difference of squares and quadratic trinomials.",
      "For four terms, try grouping."
    ],
    traps: [
      "Do not stop after only one partial factor.",
      "Check your factors by expanding mentally."
    ],
    phrases: ["Factorise fully", "Write as a product of factors", "Solve by factorising"]
  },
  {
    id: "simultaneous",
    keyword: "simultaneous equations",
    category: "Algebra",
    topics: ["Simultaneous Equations"],
    aliases: ["solve the equations", "intersection of two graphs"],
    hint: "Two equations share the same solution pair.",
    moves: [
      "Choose elimination when coefficients can be matched.",
      "Choose substitution when one variable is already isolated.",
      "Substitute back to find the other variable."
    ],
    traps: [
      "If one equation is quadratic, expect two solution pairs.",
      "Check signs when subtracting equations."
    ],
    phrases: ["Solve the simultaneous equations", "Find the point of intersection", "The two equations are satisfied by"]
  },
  {
    id: "nth-term",
    keyword: "nth term",
    category: "Algebra",
    topics: ["Sequences"],
    aliases: ["linear sequence", "quadratic sequence", "term-to-term rule"],
    hint: "The nth term gives a direct formula for any term in the sequence.",
    moves: [
      "For linear sequences, find the common difference for the coefficient of n.",
      "Adjust the constant by testing n = 1.",
      "For quadratic sequences, use second differences to find the n^2 coefficient."
    ],
    traps: [
      "Term-to-term rule is not the nth term.",
      "Check your formula on at least two terms."
    ],
    phrases: ["Find an expression for the nth term", "The sequence begins", "Quadratic sequence"]
  },
  {
    id: "function-notation",
    keyword: "function notation",
    category: "Algebra",
    topics: ["Functions"],
    aliases: ["f(x)", "fg(x)", "inverse function"],
    hint: "Function notation means substitute carefully and follow the order.",
    moves: [
      "For f(a), replace every x with a.",
      "For fg(x), apply g first, then f.",
      "For inverse functions, swap x and y then rearrange."
    ],
    traps: [
      "fg(x) is not usually the same as gf(x).",
      "When finding inverse, do not forget to rename y as f^-1(x)."
    ],
    phrases: ["Find f(3)", "Find fg(x)", "Find f^-1(x)"]
  },
  {
    id: "graph-transform",
    keyword: "transformation of graph",
    category: "Graphs",
    topics: ["Transformations of Graphs", "Graphs of Functions"],
    aliases: ["f(x) + a", "f(x - a)", "stretch", "reflection"],
    hint: "Inside the bracket changes x direction; outside changes y direction.",
    moves: [
      "f(x) + a moves up by a.",
      "f(x - a) moves right by a.",
      "-f(x) reflects in the x-axis and f(-x) reflects in the y-axis."
    ],
    traps: [
      "Horizontal translations feel opposite inside the bracket.",
      "A stretch changes distance from the axis, not just position."
    ],
    phrases: ["Describe the transformation", "Sketch y = f(x) + 3", "The graph of y = f(x - 2)"]
  },
  {
    id: "histogram",
    keyword: "histogram",
    category: "Statistics",
    topics: ["Histograms"],
    aliases: ["frequency density", "class width", "area represents frequency"],
    hint: "In histograms, area represents frequency. The bar height is frequency density.",
    moves: [
      "Frequency density = frequency / class width.",
      "Frequency = frequency density x class width.",
      "Use area when comparing bars."
    ],
    traps: [
      "Do not treat the y-axis as frequency unless it says frequency.",
      "Unequal class widths are the reason histograms exist."
    ],
    phrases: ["Complete the histogram", "Frequency density", "Estimate the number of..."]
  },
  {
    id: "cumulative-frequency",
    keyword: "cumulative frequency",
    category: "Statistics",
    topics: ["Cumulative Frequency Diagrams"],
    aliases: ["median", "quartiles", "interquartile range"],
    hint: "Cumulative frequency graphs are for medians, quartiles, and estimates below a value.",
    moves: [
      "Use N/2 for the median.",
      "Use N/4 and 3N/4 for quartiles.",
      "Interquartile range = upper quartile - lower quartile."
    ],
    traps: [
      "Read from the cumulative frequency axis across to the curve, then down.",
      "Do not confuse frequency and cumulative frequency."
    ],
    phrases: ["Use the cumulative frequency graph", "Find the median", "Estimate the interquartile range"]
  },
  {
    id: "venn",
    keyword: "Venn diagram",
    category: "Probability",
    topics: ["Set Notation & Venn Diagrams", "Probability Diagrams - Venn & Tree Diagrams"],
    aliases: ["union", "intersection", "complement", "set notation"],
    hint: "Venn questions are about placing numbers in the most restricted region first.",
    moves: [
      "Start with the intersection if given.",
      "Work out the only-A and only-B regions.",
      "Use the total to find outside the sets."
    ],
    traps: [
      "A union B means in A or B or both.",
      "A intersection B means in both."
    ],
    phrases: ["Draw a Venn diagram", "n(A union B)", "A'"]
  },
  {
    id: "without-replacement",
    keyword: "without replacement",
    category: "Probability",
    topics: ["Probability Diagrams - Venn & Tree Diagrams", "Combined & Conditional Probability"],
    aliases: ["dependent events", "tree diagram changes"],
    hint: "Without replacement means the second probability changes after the first choice.",
    moves: [
      "Draw a tree diagram.",
      "Subtract one from the chosen item and from the total on the second branch.",
      "Multiply along branches and add alternative successful paths."
    ],
    traps: [
      "Do not keep the denominator the same.",
      "Order matters when the question says first and second."
    ],
    phrases: ["Without replacement", "Two counters are taken", "A card is not replaced"]
  },
  {
    id: "independent",
    keyword: "independent",
    category: "Probability",
    topics: ["Probability Toolkit", "Combined & Conditional Probability"],
    aliases: ["mutually exclusive", "combined probability", "and/or"],
    hint: "Independent means one event does not affect the other. Mutually exclusive means the events cannot happen together.",
    moves: [
      "For independent events: P(A and B) = P(A) x P(B).",
      "For either/or paths: add the probabilities of the valid paths.",
      "For mutually exclusive events: P(A or B) = P(A) + P(B)."
    ],
    traps: [
      "Independent and mutually exclusive are not the same idea.",
      "For not A, use 1 - P(A)."
    ],
    phrases: ["The events are independent", "Mutually exclusive", "Find the probability that A and B occur"]
  },
  {
    id: "conditional",
    keyword: "given that",
    category: "Probability",
    topics: ["Combined & Conditional Probability"],
    aliases: ["conditional probability", "P(A|B)", "given"],
    hint: "Given that reduces the sample space. You only look inside the condition.",
    moves: [
      "Identify the condition after 'given that'.",
      "Restrict the denominator to that group.",
      "Use the part that also satisfies the target event as the numerator."
    ],
    traps: [
      "Do not use the original total if the condition restricts the group.",
      "In Venn diagrams, given B means the denominator is all of B."
    ],
    phrases: ["Given that", "Find P(A|B)", "A student is chosen from those who..."]
  },
  {
    id: "vector-proof",
    keyword: "vector proof",
    category: "Vectors & Transformations",
    topics: ["Vectors"],
    aliases: ["parallel vectors", "collinear", "ratio on a line"],
    hint: "Vector proof usually wants you to show two vectors are scalar multiples or that a point divides a line in a ratio.",
    moves: [
      "Write every route using the given base vectors.",
      "Simplify carefully.",
      "To prove parallel, show one vector is k times the other."
    ],
    traps: [
      "Do not rely on the diagram.",
      "Keep direction signs consistent."
    ],
    phrases: ["Prove that the points are collinear", "Show that AB is parallel to CD", "Given OA = a and OB = b"]
  },
  {
    id: "enlargement",
    keyword: "enlargement",
    category: "Vectors & Transformations",
    topics: ["Transformations"],
    aliases: ["scale factor", "centre of enlargement", "negative scale factor"],
    hint: "An enlargement needs scale factor and centre. Negative scale factor places the image on the opposite side of the centre.",
    moves: [
      "Draw rays from the centre through matching points.",
      "Multiply distances from the centre by the scale factor.",
      "For description questions, state enlargement, scale factor, and centre."
    ],
    traps: [
      "Do not describe an enlargement without the centre.",
      "Negative scale factor changes side as well as size."
    ],
    phrases: ["Describe the single transformation", "Enlargement scale factor", "Centre of enlargement"]
  },
  {
    id: "show-that",
    keyword: "show that",
    category: "Command Words",
    topics: ["Algebraic Proof", "Congruence, Similarity & Geometrical Proof", "Solving Quadratic Equations"],
    aliases: ["prove that", "show clearly", "must show working"],
    hint: "The answer is already given. The marks are for the route.",
    moves: [
      "Start from the information in the question, not from the final answer.",
      "Write every key algebra or geometry reason.",
      "Arrive exactly at the printed result."
    ],
    traps: [
      "Do not use the printed answer as if it is already true.",
      "Do not skip the step that earns the method mark."
    ],
    phrases: ["Show that", "Show your working clearly", "Prove that"]
  },
  {
    id: "hence",
    keyword: "hence",
    category: "Command Words",
    topics: ["Completing the Square", "Differentiation", "Functions", "Graphs of Functions"],
    aliases: ["therefore", "using your answer", "hence solve"],
    hint: "Hence means use the previous result. The examiner is telling you the shortcut.",
    moves: [
      "Look at the previous part and reuse its form or result.",
      "Avoid starting a completely new long method unless necessary.",
      "Quote the previous result clearly before applying it."
    ],
    traps: [
      "Do not ignore the previous part.",
      "If the previous part is wrong, still use your result consistently for method marks."
    ],
    phrases: ["Hence find", "Hence solve", "Using your answer to part (a)"]
  },
  {
    id: "solve-inequality",
    keyword: "inequality",
    category: "Algebra",
    topics: ["Solving Inequalities", "Graphing Inequalities"],
    aliases: ["shade the region", "integer solutions", "linear programming"],
    hint: "Inequalities behave like equations, except the sign flips when multiplying or dividing by a negative.",
    moves: [
      "Solve algebraically like an equation.",
      "Flip the inequality sign if you multiply or divide by a negative.",
      "For graph regions, test a point to choose the correct side."
    ],
    traps: [
      "Do not forget open or closed circles on number lines.",
      "For graphing, dashed lines mean the boundary is not included."
    ],
    phrases: ["Solve the inequality", "Shade the region", "Find the integer values"]
  },
  {
    id: "3d-trig",
    keyword: "3D",
    category: "Geometry",
    topics: ["3D Pythagoras & Trigonometry", "Volume & Surface Area"],
    aliases: ["3D Pythagoras", "angle between a line and a plane", "cuboid"],
    hint: "3D questions usually need a hidden right-angled triangle inside the solid.",
    moves: [
      "Draw or identify the right triangle needed.",
      "Use Pythagoras first to find a hidden diagonal if necessary.",
      "Then use SOHCAHTOA for the required angle or length."
    ],
    traps: [
      "Do not use a length that is not in the same triangle.",
      "The angle between a line and a plane uses the projection of the line on the plane."
    ],
    phrases: ["A cuboid", "Find the angle between", "3D Pythagoras"]
  }
];
