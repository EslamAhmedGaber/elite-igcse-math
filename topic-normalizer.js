(function () {
  const TOPIC_CATALOG = [
    ["Types of Numbers", "Numbers & the Number System"],
    ["Prime Factors, HCF & LCM", "Numbers & the Number System"],
    ["Fractions", "Numbers & the Number System"],
    ["Fractions, Decimals & Percentages", "Numbers & the Number System"],
    ["Recurring Decimals", "Numbers & the Number System"],
    ["Percentages", "Numbers & the Number System"],
    ["Compound Interest & Depreciation", "Numbers & the Number System"],
    ["Reverse Percentages", "Numbers & the Number System"],
    ["Rounding, Estimation & Bounds", "Numbers & the Number System"],
    ["Powers, Roots & Standard Form", "Numbers & the Number System"],
    ["Surds", "Numbers & the Number System"],
    ["Ratio Toolkit", "Numbers & the Number System"],
    ["Standard & Compound Units", "Numbers & the Number System"],
    ["Algebra Toolkit", "Equations, Formulae & Identities"],
    ["Expanding Brackets", "Equations, Formulae & Identities"],
    ["Factorising", "Equations, Formulae & Identities"],
    ["Algebraic Fractions", "Equations, Formulae & Identities"],
    ["Algebraic Roots & Indices", "Equations, Formulae & Identities"],
    ["Forming & Solving Equations", "Equations, Formulae & Identities"],
    ["Rearranging Formulae", "Equations, Formulae & Identities"],
    ["Simultaneous Equations", "Equations, Formulae & Identities"],
    ["Solving Inequalities", "Equations, Formulae & Identities"],
    ["Completing the Square", "Equations, Formulae & Identities"],
    ["Quadratic Formula", "Equations, Formulae & Identities"],
    ["Quadratic Equations", "Equations, Formulae & Identities"],
    ["Algebraic Proof", "Equations, Formulae & Identities"],
    ["Sequences", "Sequences, Functions & Graphs"],
    ["Direct & Inverse Proportion", "Sequences, Functions & Graphs"],
    ["Coordinates & Linear Graphs", "Sequences, Functions & Graphs"],
    ["Graphs of Functions", "Sequences, Functions & Graphs"],
    ["Functions", "Sequences, Functions & Graphs"],
    ["Differentiation & Turning Points", "Sequences, Functions & Graphs"],
    ["Transformations of Graphs", "Sequences, Functions & Graphs"],
    ["Kinematic Graphs", "Sequences, Functions & Graphs"],
    ["Angles in Polygons & Parallel Lines", "Geometry & Trigonometry"],
    ["Constructions & Loci", "Geometry & Trigonometry"],
    ["Perimeter & Area", "Geometry & Trigonometry"],
    ["Circles, Arcs & Sectors", "Geometry & Trigonometry"],
    ["Volume & Surface Area", "Geometry & Trigonometry"],
    ["Right-Angled Triangles - Pythagoras & Trigonometry", "Geometry & Trigonometry"],
    ["3D Pythagoras & Trigonometry", "Geometry & Trigonometry"],
    ["Sine & Cosine Rules", "Geometry & Trigonometry"],
    ["Congruent Shapes", "Geometry & Trigonometry"],
    ["Similar Shapes", "Geometry & Trigonometry"],
    ["Area & Volume of Similar Shapes", "Geometry & Trigonometry"],
    ["Circle Theorems", "Geometry & Trigonometry"],
    ["Bearings", "Geometry & Trigonometry"],
    ["Transformations", "Vectors & Transformation Geometry"],
    ["Vectors", "Vectors & Transformation Geometry"],
    ["Statistics Toolkit", "Statistics & Probability"],
    ["Averages from Frequency Tables", "Statistics & Probability"],
    ["Histograms", "Statistics & Probability"],
    ["Cumulative Frequency Diagrams", "Statistics & Probability"],
    ["Probability Toolkit", "Statistics & Probability"],
    ["Tree Diagrams & Conditional Probability", "Statistics & Probability"],
    ["Set Notation & Venn Diagrams", "Statistics & Probability"],
  ].map(([topic, unit], index) => ({ topic, unit, order: index + 1 }));

  const TOPIC_ORDER = new Map(TOPIC_CATALOG.map((entry) => [entry.topic, entry.order]));
  const TOPIC_UNIT = new Map(TOPIC_CATALOG.map((entry) => [entry.topic, entry.unit]));
  const TOPIC_SET = new Set(TOPIC_CATALOG.map((entry) => entry.topic));

  function lower(value) {
    return String(value ?? "").toLowerCase();
  }

  function matches(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  function canonicalTopic(question) {
    const current = String(question.topic || "");
    const body = lower(question.question_text || "");
    const text = `${body} ${question.source_id || ""}`.toLowerCase();

    if (current === "Rearranging Formulas") return "Rearranging Formulae";

    switch (current) {
      case "Ratio Problem Solving":
      case "Exchange Rates & Best Buys":
        return "Ratio Toolkit";
      case "Solving Linear Equations":
        return "Forming & Solving Equations";
      case "Solving Quadratic Equations":
        return matches(text, [/quadratic\s+formula/, /\bformula\b/]) ? "Quadratic Formula" : "Quadratic Equations";
      case "Coordinate Geometry":
      case "Linear Graphs (y = mx + c)":
      case "Estimating Gradients":
      case "Graphing Inequalities":
        return "Coordinates & Linear Graphs";
      case "Differentiation":
        return "Differentiation & Turning Points";
      case "Area & Perimeter":
        return "Perimeter & Area";
      case "Sine, Cosine Rule & Area of Triangles":
        return "Sine & Cosine Rules";
      case "Combined & Conditional Probability":
        return "Tree Diagrams & Conditional Probability";
      case "Probability Diagrams - Venn & Tree Diagrams":
        return matches(body, [/\bvenn\b/, /set notation/, /\bunion\b/, /\bintersection\b/, /\bsubset\b/])
          ? "Set Notation & Venn Diagrams"
          : "Tree Diagrams & Conditional Probability";
      case "Congruence, Similarity & Geometrical Proof":
        if (matches(body, [/area of similar/, /volume of similar/])) return "Area & Volume of Similar Shapes";
        if (matches(body, [/congruent/, /proof/])) return "Congruent Shapes";
        if (matches(body, [/similar/, /scale factor/, /enlarg/])) return "Similar Shapes";
        return "Similar Shapes";
      case "Bearings, Scale Drawing & Constructions":
        if (matches(body, [/\bbear(?:ing|ings)?\b/, /\bnorth\b/, /\bclockwise\b/, /\banticlockwise\b/, /\beast\b/, /\bwest\b/, /\bnorth-east\b/, /\bnorth-west\b/, /\bsouth-east\b/, /\bsouth-west\b/])) {
          return "Bearings";
        }
        if (matches(body, [/loci/, /locus/, /construction/, /bisector/, /perpendicular/])) return "Constructions & Loci";
        return "Bearings";
      case "Percentages":
        if (matches(text, [/\breduced\b/, /\bdiscount\b/, /\bsale\b/, /\bincrease\b/, /\bdecrease\b/, /\bprofit\b/, /\bloss\b/, /original price/, /\bmore than\b/, /\bless than\b/, /after/, /before/])) {
          return "Reverse Percentages";
        }
        return "Percentages";
      case "Fractions, Decimals & Percentages":
        if (matches(text, [/recurring/, /repeating/])) return "Recurring Decimals";
        return "Fractions, Decimals & Percentages";
      case "Statistics Toolkit":
        if (matches(text, [/frequency table/, /grouped/, /estimate the mean/, /average from/, /\bmean\b.*\bfrequency\b/])) {
          return "Averages from Frequency Tables";
        }
        return "Statistics Toolkit";
      case "Powers, Roots & Standard Form":
        if (matches(text, [/\bprime number\b/, /\bodd\b/, /\beven\b/, /\binteger\b/, /\bwhole number\b/, /\bsquare number\b/, /\bcube number\b/, /\brational\b/, /\birrational\b/, /types? of numbers?/])) {
          return "Types of Numbers";
        }
        return "Powers, Roots & Standard Form";
      case "Prime Factors, HCF & LCM":
        if (matches(text, [/hcf/, /lcm/, /highest common factor/, /lowest common multiple/])) return "Prime Factors, HCF & LCM";
        if (matches(text, [/\bprime factor\b/, /\bfactor\b/, /\bmultiple\b/])) return "Prime Factors, HCF & LCM";
        return "Types of Numbers";
      case "Graphs of Functions":
        if (matches(text, [/\bspeed\b/, /\bdistance\b/, /\btime\b/, /\bjourney\b/, /\btravel\b/, /\bvelocity\b/, /\bacceleration\b/, /\bmotion\b/])) {
          return "Kinematic Graphs";
        }
        return "Graphs of Functions";
      case "Transformations":
        return "Transformations";
      case "Fractions":
        if (matches(text, [/recurring/, /repeating/])) return "Recurring Decimals";
        return "Fractions";
      default:
        return current;
    }
  }

  function normalizeQuestion(question) {
    const originalTopic = question.topic || "";
    const canonical = canonicalTopic(question);
    const canonicalOrder = TOPIC_ORDER.get(canonical) || Number(question.topic_order || 999);
    question.original_topic = question.original_topic || originalTopic;
    question.original_unit = question.original_unit || question.unit || "";
    question.canonical_topic = canonical;
    question.canonical_topic_order = canonicalOrder;
    question.topic = canonical;
    question.topic_order = canonicalOrder;
    question.canonical_unit = question.unit || TOPIC_UNIT.get(canonical) || "";
    return question;
  }

  function normalizeMeta(meta) {
    const topics = TOPIC_CATALOG.map((entry) => entry.topic);
    const topicValues = {
      all: {
        title: "All Classified Questions",
        description: meta.banks?.all?.description || "",
        subtitle: meta.banks?.all?.subtitle || "",
        count: meta.banks?.all?.count || 0,
        topics
      },
      expertise: {
        title: "Expertise Q20+ Questions",
        description: meta.banks?.expertise?.description || "",
        subtitle: meta.banks?.expertise?.subtitle || "",
        count: meta.banks?.expertise?.count || 0,
        topics
      }
    };
    return {
      ...meta,
      topics,
      banks: {
        ...(meta.banks || {}),
        all: {
          ...(meta.banks?.all || {}),
          ...topicValues.all,
        },
        expertise: {
          ...(meta.banks?.expertise || {}),
          ...topicValues.expertise,
        },
      },
    };
  }

  if (Array.isArray(window.QUESTION_DATA)) {
    window.QUESTION_DATA.forEach(normalizeQuestion);
  }
  window.TOPIC_CATALOG = TOPIC_CATALOG;
  window.TOPIC_ORDER_MAP = TOPIC_ORDER;
  window.TOPIC_UNIT_MAP = TOPIC_UNIT;
  window.SITE_META = normalizeMeta(window.SITE_META || {});
})();
