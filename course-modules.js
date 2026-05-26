(function () {
  const moduleCatalog = {
    classified: {
      title: "Classified View",
      role: "student",
      description: "Topic practice and classified question browsing.",
    },
    expertise: {
      title: "Expertise",
      role: "student",
      description: "Harder-question route and expertise books.",
    },
    "build-test": {
      title: "Build Test",
      role: "student",
      description: "Shared mock, quiz, custom-test, and printable paper builder.",
    },
    "smart-revision": {
      title: "Smart Revision",
      role: "student",
      description: "Revision from mistakes, weak topics, and unsolved questions.",
    },
    progress: {
      title: "Progress",
      role: "student",
      description: "Solved, selected, mastery, and synced progress state.",
    },
    books: {
      title: "Books",
      role: "student",
      description: "Public question books generated from source data.",
    },
    answers: {
      title: "Answer Books",
      role: "student",
      description: "Approved worked-solution books generated from source data.",
    },
    "past-solutions": {
      title: "Past Paper Solutions",
      role: "student",
      description: "Original paper-order solution books.",
    },
    "mistake-box": {
      title: "Mistake Box",
      role: "student",
      description: "Saved difficult questions for revision.",
    },
    "saved-tests": {
      title: "Saved Tests",
      role: "student",
      description: "Reusable tests created by the shared builder.",
    },
    "book-builder": {
      title: "Book Builder",
      role: "pipeline",
      description: "Builds public question books and approved answer books.",
    },
    "classified-builder": {
      title: "Classified Builder",
      role: "pipeline",
      description: "Classifies source papers into topics, units, and course banks.",
    },
    "paper-solution-builder": {
      title: "Paper Solution Builder",
      role: "pipeline",
      description: "Builds paper-order worked-solution books.",
    },
    "solution-method": {
      title: "Solution Method",
      role: "pipeline",
      description: "The shared worked-solution style, step structure, and final-answer format.",
    },
  };

  const moduleAliases = {
    "classified view": "classified",
    "classified bank": "classified",
    "expertise": "expertise",
    "mock builder": "build-test",
    "build test": "build-test",
    "random mock": "build-test",
    "smart revision": "smart-revision",
    "saved tests": "saved-tests",
    "books": "books",
    "question book": "books",
    "answer book": "answers",
    "expertise book": "expertise",
    "expertise answers": "answers",
    "past paper solutions": "past-solutions",
    "progress": "progress",
    "mistake box": "mistake-box",
  };

  const palettes = {
    linear: {
      label: "Linear",
      accent: "#161b2e",
      accentDeep: "#0e1220",
      soft: "rgba(22, 27, 46, 0.08)",
    },
    modular: {
      label: "Modular",
      accent: "#c0392b",
      accentDeep: "#8d2820",
      soft: "rgba(192, 57, 43, 0.08)",
    },
    pure: {
      label: "IAL Pure 1",
      accent: "#5a8074",
      accentDeep: "#41645b",
      soft: "rgba(90, 128, 116, 0.1)",
    },
  };

  const linearLinks = [
    { module: "classified", title: "Classified View", detail: "Chapter bank", href: "/practice.html?pathway=linear&bank=all", pathway: "linear" },
    { module: "expertise", title: "Expertise", detail: "Q20+ finishers", href: "/practice.html?pathway=linear&bank=expertise&mode=q20", pathway: "linear" },
    { module: "build-test", title: "Build Test", detail: "Mocks and worksheets", href: "/exam.html?pathway=linear&mode=custom", pathway: "linear" },
    { module: "books", title: "Books", detail: "Questions and answers", href: "/downloads.html?pathway=linear", pathway: "linear" },
    { module: "past-solutions", title: "Past Paper Solutions", detail: "Papers beside answers", href: "/pastpapers.html?pathway=linear", pathway: "linear" },
    { module: "progress", title: "Progress", detail: "Track mastery", href: "/progress.html?pathway=linear", pathway: "linear" },
  ];

  function modularLinks(unitTitle, unitCode) {
    const unitParam = encodeURIComponent(unitTitle).replace(/%20/g, "+");
    return [
      { module: "classified", title: "Classified View", detail: `${unitCode} topics`, href: `/practice.html?pathway=modular&unit=${unitParam}&bank=all`, pathway: "modular" },
      { module: "expertise", title: "Expertise", detail: `${unitCode} harder set`, href: `/practice.html?pathway=modular&unit=${unitParam}&bank=expertise&mode=q20`, pathway: "modular" },
      { module: "build-test", title: "Build Test", detail: `${unitCode} mocks`, href: `/exam.html?pathway=modular&unit=${unitParam}&mode=custom`, pathway: "modular" },
      { module: "books", title: "Books", detail: `${unitCode} PDFs`, href: `/downloads.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
      { module: "past-solutions", title: "Past Paper Solutions", detail: `${unitCode} papers`, href: `/pastpapers.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
      { module: "progress", title: "Progress", detail: `${unitCode} mastery`, href: `/progress.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
    ];
  }

  const navGroups = [
    {
      id: "linear",
      label: "Linear",
      detail: "4MA1 route",
      href: "/practice.html?pathway=linear",
      pathway: "linear",
      palette: "linear",
      panelLabel: "Linear modules",
      intro: "Everything for Linear lives as reusable modules: practice, expertise, builder, books, paper solutions, and progress.",
      links: linearLinks,
    },
    {
      id: "modular",
      label: "Modular",
      detail: "4WM route",
      href: "/practice.html?pathway=modular&choose=unit",
      pathway: "modular",
      palette: "modular",
      unitChoiceTitle: "Choose Modular Unit",
      unitChoiceIntro: "Choose Unit 1 or Unit 2 first. Each unit then opens the same module set without mixing banks.",
      units: [
        {
          title: "Unit 1",
          detail: "4WM1",
          intro: "Unit 1 modules stay scoped to 4WM1 questions, books, tests, solutions, and progress.",
          links: modularLinks("Unit 1", "4WM1"),
        },
        {
          title: "Unit 2",
          detail: "4WM2",
          intro: "Unit 2 modules stay scoped to 4WM2 questions, books, tests, solutions, and progress.",
          links: modularLinks("Unit 2", "4WM2"),
        },
      ],
    },
    {
      id: "pure",
      label: "IAL Pure 1",
      detail: "WMA11",
      href: "/ial/wma11/index.html",
      palette: "pure",
      panelLabel: "WMA11 modules",
      intro: "Pure 1 uses its own WMA11 palette and the same reusable module model: classified, builder, smart revision, progress, books, and solution books.",
      links: [
        { module: "classified", title: "Classified View", detail: "Topic practice", href: "/ial/wma11/index.html" },
        { module: "build-test", title: "Build Test", detail: "Full mock builder", href: "/exam.html?pathway=pure&course=wma11&mode=custom" },
        { module: "smart-revision", title: "Smart Revision", detail: "Mistakes and weak topics", href: "/exam.html?pathway=pure&course=wma11&mode=smart" },
        { module: "progress", title: "Progress", detail: "Stats and mastery", href: "/ial/wma11/index.html#ialStats" },
        { module: "mistake-box", title: "Mistake Box", detail: "Saved revision", href: "/ial/wma11/index.html#ialStats" },
        { module: "books", title: "Question Book", detail: "Classified PDF", href: "/downloads/IAL/WMA11/WMA11_Classified_Questions.pdf", target: "_blank" },
        { module: "answers", title: "Answer Book", detail: "Worked solutions", href: "/downloads/IAL/WMA11/WMA11_Classified_With_Answers.pdf", target: "_blank" },
        { module: "expertise", title: "Expertise Book", detail: "Q6+ questions", href: "/downloads/IAL/WMA11/WMA11_Expertise_Questions.pdf", target: "_blank" },
        { module: "answers", title: "Expertise Answers", detail: "Q6+ solutions", href: "/downloads/IAL/WMA11/WMA11_Expertise_With_Answers.pdf", target: "_blank" },
        { module: "past-solutions", title: "Past Paper Solutions", detail: "Paper-order answers", href: "/downloads/IAL/WMA11/WMA11_Past_Paper_Solutions.pdf", target: "_blank" },
      ],
    },
    {
      id: "about",
      label: "About",
      detail: "Dr Eslam",
      href: "/about.html",
      panelLabel: "Support",
      links: [
        { title: "About Dr Eslam", detail: "Teacher profile", href: "/about.html" },
        { module: "books", title: "Download Centre", detail: "All public books", href: "/downloads.html" },
        { title: "Topic Roadmap", detail: "Course map", href: "/topics.html" },
        { title: "Readiness Check", detail: "Quick diagnosis", href: "/checkup.html" },
        { title: "Contact", detail: "WhatsApp booking", href: "https://wa.me/201120009622", lead: "whatsapp" },
      ],
    },
  ];

  window.ELITE_COURSE_MODULES = {
    version: "2026-05-26-course-registry-v1",
    moduleCatalog,
    moduleAliases,
    palettes,
    navGroups,
  };
})();
