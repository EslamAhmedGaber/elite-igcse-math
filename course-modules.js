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
    "revision-book": {
      title: "Revision Book",
      role: "student",
      description: "A printable 10-100 question revision set chosen from topic frequency, recency, gaps, marks, and student progress.",
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
      description: "Original papers listed beside matching worked-solution books.",
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
    "smart revision": "revision-book",
    "revision book": "revision-book",
    "prediction revision": "revision-book",
    "prediction book": "revision-book",
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
      accent: "#5a8074",
      accentDeep: "#41645b",
      soft: "rgba(90, 128, 116, 0.1)",
    },
    pure: {
      label: "IAL Pure 1",
      accent: "#36304a",
      accentDeep: "#241f33",
      soft: "rgba(54, 48, 74, 0.1)",
    },
  };

  const linearLinks = [
    { module: "classified", title: "Classified View", detail: "Chapter bank", href: "/practice.html?pathway=linear&bank=all", pathway: "linear" },
    { module: "expertise", title: "Expertise", detail: "Q20+ finishers", href: "/practice.html?pathway=linear&bank=expertise&mode=q20", pathway: "linear" },
    { module: "build-test", title: "Build Test", detail: "Mocks and worksheets", href: "/exam.html?pathway=linear&mode=custom", pathway: "linear" },
    { module: "revision-book", title: "Revision Book", detail: "10-100 question mix", href: "/exam.html?pathway=linear&mode=smart&book=revision", pathway: "linear" },
    { module: "progress", title: "Progress", detail: "Track mastery", href: "/progress.html?pathway=linear", pathway: "linear" },
    { module: "mistake-box", title: "Mistake Box", detail: "Due revision set", href: "/practice.html?pathway=linear&bank=all&mode=review", pathway: "linear" },
    { module: "saved-tests", title: "Saved Tests", detail: "Reuse builder tests", href: "/exam.html?pathway=linear&mode=saved", pathway: "linear" },
    { module: "books", title: "Books", detail: "Questions and answers", href: "/downloads.html?pathway=linear", pathway: "linear" },
    { module: "past-solutions", title: "Past Paper Solutions", detail: "Papers beside answers", href: "/pastpapers.html?pathway=linear", pathway: "linear" },
  ];

  function modularLinks(unitTitle, unitCode) {
    const unitParam = encodeURIComponent(unitTitle).replace(/%20/g, "+");
    return [
      { module: "classified", title: "Classified View", detail: `${unitCode} topics`, href: `/practice.html?pathway=modular&unit=${unitParam}&bank=all`, pathway: "modular" },
      { module: "expertise", title: "Expertise", detail: `${unitCode} harder set`, href: `/practice.html?pathway=modular&unit=${unitParam}&bank=expertise&mode=q20`, pathway: "modular" },
      { module: "build-test", title: "Build Test", detail: `${unitCode} mocks`, href: `/exam.html?pathway=modular&unit=${unitParam}&mode=custom`, pathway: "modular" },
      { module: "revision-book", title: "Revision Book", detail: `${unitCode} 10-100 mix`, href: `/exam.html?pathway=modular&unit=${unitParam}&mode=smart&book=revision`, pathway: "modular" },
      { module: "progress", title: "Progress", detail: `${unitCode} mastery`, href: `/progress.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
      { module: "mistake-box", title: "Mistake Box", detail: `${unitCode} saved revision`, href: `/practice.html?pathway=modular&unit=${unitParam}&bank=all&mode=review`, pathway: "modular" },
      { module: "saved-tests", title: "Saved Tests", detail: `${unitCode} reusable tests`, href: `/exam.html?pathway=modular&unit=${unitParam}&mode=saved`, pathway: "modular" },
      { module: "books", title: "Books", detail: `${unitCode} PDFs`, href: `/downloads.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
      { module: "past-solutions", title: "Past Paper Solutions", detail: `${unitCode} papers`, href: `/pastpapers.html?pathway=modular&unit=${unitParam}`, pathway: "modular" },
    ];
  }

  const linearPastPapers = [
      {
          "heading": "2025",
          "sessions": [
              {
                  "label": "Nov 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Nov 2025 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Nov2025_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Nov 2025 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Nov2025_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jun 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Jun 2025 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Jun2025_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/Jun 2025 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/Jun2025_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jun 2025 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jun2025_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jun 2025 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jun2025_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2024",
          "sessions": [
              {
                  "label": "Nov 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Nov 2024 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Nov2024_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Nov 2024 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Nov2024_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jun 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jun 2024 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jun2024_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jun 2024 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jun2024_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "May 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/May 2024 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/May2024_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/May 2024 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/May2024_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2023",
          "sessions": [
              {
                  "label": "Nov 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Nov 2023 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Nov2023_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Nov 2023 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Nov2023_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jun 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jun 2023 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jun2023_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jun 2023 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jun2023_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "May 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/May 2023 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/May2023_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/May 2023 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/May2023_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2022",
          "sessions": [
              {
                  "label": "Jun 2022",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Jun 2022 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Jun2022_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/Jun 2022 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/Jun2022_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jun 2022 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jun2022_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jun 2022 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jun2022_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2022",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Jan 2022 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Jan2022_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/Jan 2022 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/Jan2022_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jan 2022 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jan2022_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jan 2022 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jan2022_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2021",
          "sessions": [
              {
                  "label": "Nov 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Nov 2021 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Nov2021_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Nov 2021 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Nov2021_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "May 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/May 2021 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/May2021_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/May 2021 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/May2021_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Jan 2021 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Jan2021_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/Jan 2021 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/Jan2021_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jan 2021 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jan2021_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jan 2021 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jan2021_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2020",
          "sessions": [
              {
                  "label": "May / Nov 2020",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/May-Nov 2020 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/MayNov2020_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/May-Nov 2020 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/MayNov2020_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2020",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Paper 1H",
                          "href": "downloads/PastPapers/Linear/Jan 2020 P1H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1H",
                          "href": "downloads/PastPaperSolutions/Jan2020_P1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 1HR",
                          "href": "downloads/PastPapers/Linear/Jan 2020 P1HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 1HR",
                          "href": "downloads/PastPaperSolutions/Jan2020_P1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2H",
                          "href": "downloads/PastPapers/Linear/Jan 2020 P2H.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2H",
                          "href": "downloads/PastPaperSolutions/Jan2020_P2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "Paper 2HR",
                          "href": "downloads/PastPapers/Linear/Jan 2020 P2HR.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution 2HR",
                          "href": "downloads/PastPaperSolutions/Jan2020_P2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      }
  ];

  const modularPastPapers = [
      {
          "heading": "Unit 1 | 4WM1H",
          "sessions": [
              {
                  "label": "Specimen",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-1/specimen-4wm1h-unit-1-question-paper.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/Specimen_4WM1H_Solutions.pdf?v=paper-solutions-unit1-20260528"
                      }
                  ]
              },
              {
                  "label": "Nov 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-1/4wm1h-01-que-20251106.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/Nov2025_4WM1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "May 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-1/4wm1h-01-que-20250516.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/May2025_4WM1H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "R variant",
                          "href": "downloads/PastPapers/Modular/unit-1/4wm1h-01r-que-20250516.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "R Solution",
                          "href": "downloads/PastPaperSolutions/May2025_4WM1HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "Unit 2 | 4WM2H",
          "sessions": [
              {
                  "label": "Specimen",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-2/specimen-4wm2h-unit-2-question-paper.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/Specimen_4WM2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "Nov 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-2/4wm2h-01-Nov-2025-exam-paper.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/Nov2025_4WM2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              },
              {
                  "label": "May 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/PastPapers/Modular/unit-2/4wm2h-01-may-2025-exam-paper.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Solution",
                          "href": "downloads/PastPaperSolutions/May2025_4WM2H_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      },
                      {
                          "kind": "paper",
                          "title": "R variant",
                          "href": "downloads/PastPapers/Modular/unit-2/4wm2h-01R-may-2025-exam-paper.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "R Solution",
                          "href": "downloads/PastPaperSolutions/May2025_4WM2HR_Solutions.pdf?v=paper-solutions-fixed-20260527"
                      }
                  ]
              }
          ]
      }
  ];

  const pureWma11PastPapers = [
      {
          "heading": "2026",
          "sessions": [
              {
                  "label": "Jan 2026",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2026_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2026_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2025",
          "sessions": [
              {
                  "label": "Oct 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "May/June 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_MayJune_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_MayJune_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2025",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2025_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2024",
          "sessions": [
              {
                  "label": "Oct 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "May/June 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_MayJune_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_MayJune_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2024",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2024_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2023",
          "sessions": [
              {
                  "label": "Oct 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "May/June 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_MayJune_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_MayJune_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2023",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2023_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2022",
          "sessions": [
              {
                  "label": "Oct 2022",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "May/June 2022",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_MayJune_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_MayJune_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2022",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2022_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2021",
          "sessions": [
              {
                  "label": "Oct 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "May/June 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_MayJune_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_MayJune_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              },
              {
                  "label": "Jan 2021",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2021_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2020",
          "sessions": [
              {
                  "label": "Jan 2020",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2020_Jan_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2020_Jan_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      },
      {
          "heading": "2019",
          "sessions": [
              {
                  "label": "Oct 2019",
                  "papers": [
                      {
                          "kind": "paper",
                          "title": "Question paper",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2019_Oct_QP.pdf"
                      },
                      {
                          "kind": "solution",
                          "title": "Worked solution",
                          "href": "downloads/IAL/WMA11/Papers/WMA11_2019_Oct_Solutions.pdf?v=wma11-polish2-20260527"
                      }
                  ]
              }
          ]
      }
  ];

  const linearBooks = [
      {
          "className": "linear-book",
          "tag": "Full bank",
          "title": "Classified Problems",
          "description": "1153 classified Edexcel IGCSE 4MA1 past-paper questions, organised by topic. One question per page, ready to print.",
          "meta": [
              "1153 questions",
              "By topic",
              "Print-ready"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/classified_problems.pdf?v=style-h-20260527",
                  "variant": "primary",
                  "target": "_blank"
              },
              {
                  "label": "Solutions Part 1",
                  "href": "downloads/ClassifiedSolutions/classified_answers_Part1_of_2.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              },
              {
                  "label": "Solutions Part 2",
                  "href": "downloads/ClassifiedSolutions/classified_answers_Part2_of_2.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              }
          ]
      },
      {
          "className": "highlight linear-book",
          "tag": "Hardest only",
          "tagTone": "gold",
          "title": "Classified Expertise (Q20+)",
          "description": "Only the harder problems - questions 20 and above - collected by topic. The same set our A* / 9 students train on.",
          "meta": [
              "260 questions",
              "Q20+ only",
              "Best for revision"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/Classified_Expertise.pdf?v=style-h-20260527",
                  "variant": "gold",
                  "target": "_blank"
              },
              {
                  "label": "Solutions PDF",
                  "href": "downloads/ClassifiedSolutions/Classified_Expertise_Answers.pdf?v=title-polish-20260527",
                  "variant": "solution light-solution",
                  "target": "_blank"
              }
          ]
      }
  ];

  const modularBooks = [
      {
          "className": "modular-book",
          "tag": "Modular 4WM1",
          "title": "Unit 1 Classified Book",
          "description": "All Modular Unit 1 practice grouped by topic for 4WM1 students. Use it after choosing Modular Pathway -> Unit 1 on the website.",
          "meta": [
              "4WM1",
              "Unit 1 topics",
              "530 questions"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/Classified_4WM1.pdf?v=style-h-20260527",
                  "variant": "primary",
                  "target": "_blank"
              },
              {
                  "label": "Solutions PDF",
                  "href": "downloads/ClassifiedSolutions/Classified_4WM1_Answers.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              }
          ]
      },
      {
          "className": "modular-book",
          "tag": "Modular 4WM2",
          "title": "Unit 2 Classified Book",
          "description": "All Modular Unit 2 practice grouped by topic for 4WM2 students. Use it after choosing Modular Pathway -> Unit 2 on the website.",
          "meta": [
              "4WM2",
              "Unit 2 topics",
              "623 questions"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/Classified_4WM2.pdf?v=style-h-20260527",
                  "variant": "primary",
                  "target": "_blank"
              },
              {
                  "label": "Solutions PDF",
                  "href": "downloads/ClassifiedSolutions/Classified_4WM2_Answers.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              }
          ]
      },
      {
          "className": "modular-book",
          "tag": "Unit 1 Q20+",
          "tagTone": "gold",
          "title": "Unit 1 Expertise Book",
          "description": "The harder Unit 1 questions only, grouped by topic for focused 4WM1 revision.",
          "meta": [
              "4WM1",
              "127 questions",
              "Q20+ only"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/Classified_4WM1_Expertise.pdf?v=style-h-20260527",
                  "variant": "gold",
                  "target": "_blank"
              },
              {
                  "label": "Solutions PDF",
                  "href": "downloads/ClassifiedSolutions/Classified_4WM1_Expertise_Answers.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              }
          ]
      },
      {
          "className": "modular-book",
          "tag": "Unit 2 Q20+",
          "tagTone": "gold",
          "title": "Unit 2 Expertise Book",
          "description": "The harder Unit 2 questions only, grouped by topic for focused 4WM2 revision.",
          "meta": [
              "4WM2",
              "133 questions",
              "Q20+ only"
          ],
          "actions": [
              {
                  "label": "Questions PDF",
                  "href": "downloads/Classified_4WM2_Expertise.pdf?v=style-h-20260527",
                  "variant": "gold",
                  "target": "_blank"
              },
              {
                  "label": "Solutions PDF",
                  "href": "downloads/ClassifiedSolutions/Classified_4WM2_Expertise_Answers.pdf?v=title-polish-20260527",
                  "variant": "solution",
                  "target": "_blank"
              }
          ]
      }
  ];

  const pureWma11Books = [
      {
          "className": "pure-book",
          "tag": "IAL Pure 1",
          "title": "WMA11 Classified Books",
          "description": "Standalone Edexcel IAL Pure 1 bank from 2019 October to 2026 January with topic practice and worked-solution books.",
          "meta": [
              "179 questions",
              "13 Pure 1 topics",
              "Questions + worked answers"
          ],
          "actions": [
              {
                  "label": "Open WMA11 bank",
                  "href": "ial/wma11/index.html",
                  "variant": "primary"
              },
              {
                  "label": "Questions PDF",
                  "href": "downloads/IAL/WMA11/WMA11_Classified_Questions.pdf?v=wma11-polish2-20260527",
                  "variant": "primary",
                  "target": "_blank"
              },
              {
                  "label": "Answers PDF",
                  "href": "downloads/IAL/WMA11/WMA11_Classified_With_Answers.pdf?v=wma11-polish2-20260527",
                  "variant": "solution",
                  "target": "_blank"
              },
              {
                  "label": "Expertise PDF",
                  "href": "downloads/IAL/WMA11/WMA11_Expertise_Questions.pdf?v=wma11-polish2-20260527",
                  "variant": "gold",
                  "target": "_blank"
              },
              {
                  "label": "Expertise + Answers",
                  "href": "downloads/IAL/WMA11/WMA11_Expertise_With_Answers.pdf?v=wma11-polish2-20260527",
                  "variant": "solution",
                  "target": "_blank"
              },
              {
                  "label": "Paper rows + solutions",
                  "href": "pastpapers.html?pathway=pure#pure-wma11",
                  "variant": "light"
              },
              {
                  "label": "Solution archive PDF",
                  "href": "downloads/IAL/WMA11/WMA11_Past_Paper_Solutions.pdf?v=wma11-polish2-20260527",
                  "variant": "light",
                  "target": "_blank"
              }
          ]
      }
  ];

  const navGroups = [
    {
      id: "linear",
      label: "Linear",
      detail: "4MA1 route",
      href: "/practice.html?pathway=linear&bank=all",
      pathway: "linear",
      palette: "linear",
      panelLabel: "Linear modules",
      intro: "Everything for Linear lives as reusable modules: classified practice, expertise, builder, revision, progress, books, and paper solutions.",
      paperSection: {
        id: "linear",
        tag: "Linear | 4MA1",
        title: "Linear (single tier)",
        heading: "Linear papers",
        eyebrow: "Linear | Edexcel 4MA1 Higher",
        intro: "Newest first. Download the paper, then open its worked solution beside it.",
        explainer: "Two papers - <strong>P1H</strong> and <strong>P2H</strong> - sat in the <em>same exam session</em>. This is the spec most international schools enter their students for. <strong>HR</strong> variants (e.g. P1HR) are alternate papers used in the same session.",
      },
      pastPapers: linearPastPapers,
      books: linearBooks,
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
      paperSection: {
        id: "modular",
        tag: "Modular | 4WM",
        tagTone: "gold",
        title: "Modular (split into units)",
        heading: "Modular papers",
        eyebrow: "Modular | Edexcel 4WM Higher",
        intro: "Two units, taken separately. Each paper has its matching worked solution beside it.",
        explainer: "Two units assessed separately - <strong>4WM1H (Unit 1)</strong> and <strong>4WM2H (Unit 2)</strong>. Students can sit each unit in different sessions and combine the results. <strong>R</strong> variants are alternate papers.",
      },
      pastPapers: modularPastPapers,
      books: modularBooks,
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
      pathway: "pure",
      palette: "pure",
      panelLabel: "WMA11 modules",
      intro: "Pure 1 uses its own WMA11 palette and the same reusable module model: classified, expertise, builder, revision book, progress, books, saved tests, and paper listings.",
      paperSection: {
        id: "pure-wma11",
        className: "pp-section-pure",
        tag: "IAL Pure 1 | WMA11",
        tagTone: "pure",
        title: "Pure 1 paper list",
        heading: "WMA11 papers",
        eyebrow: "IAL Pure 1 | Edexcel WMA11",
        intro: "Newest first. Question paper and matching worked solution stay beside each other.",
        explainer: "Standalone IAL WMA11 papers from October 2019 to January 2026. Each row puts the original question paper directly beside the worked solution.",
      },
      pastPapers: pureWma11PastPapers,
      books: pureWma11Books,
      links: [
        { module: "classified", title: "Classified View", detail: "Topic practice", href: "/ial/wma11/index.html" },
        { module: "expertise", title: "Expertise View", detail: "Q6+ filtered bank", href: "/ial/wma11/index.html?expertise=1#ialFilters" },
        { module: "build-test", title: "Build Test", detail: "Full mock builder", href: "/exam.html?pathway=pure&course=wma11&mode=custom" },
        { module: "revision-book", title: "Revision Book", detail: "10-100 question mix", href: "/exam.html?pathway=pure&course=wma11&mode=smart&book=revision" },
        { module: "progress", title: "Progress", detail: "Topic mastery", href: "/progress.html?pathway=pure&course=wma11" },
        { module: "mistake-box", title: "Mistake Box", detail: "Saved revision", href: "/ial/wma11/index.html?mode=mistakes#ialFilters" },
        { module: "saved-tests", title: "Saved Tests", detail: "Reuse builder tests", href: "/exam.html?pathway=pure&course=wma11&mode=saved" },
        { module: "books", title: "Books", detail: "Question and answer PDFs", href: "/downloads.html?pathway=pure" },
        { module: "answers", title: "Answer Books", detail: "Worked solution PDFs", href: "/downloads.html?pathway=pure" },
        { module: "past-solutions", title: "Past Papers", detail: "Paper + solution rows", href: "/pastpapers.html?pathway=pure#pure-wma11" },
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

  // =====================================================================
  // SITE_TREE — Single hierarchical source of truth for navigation,
  // breadcrumbs, and hub pages. Add a new course by appending an entry
  // here, and the nav / breadcrumb / hub will all update automatically.
  // =====================================================================
  const SITE_TREE = {
    id: "home",
    label: "Home",
    href: "/index.html",
    children: [
      {
        id: "linear",
        label: "Linear",
        code: "4MA1",
        palette: "linear",
        href: "/practice.html?pathway=linear&bank=all",
        intro: "Edexcel IGCSE Linear — Chapters 1 to 6 in one continuous bank.",
        status: "live",
      },
      {
        id: "modular",
        label: "Modular",
        code: "4WM",
        palette: "modular",
        href: "/practice.html?pathway=modular&choose=unit",
        intro: "Edexcel IGCSE Modular — Unit 1 and Unit 2 each scoped separately.",
        status: "live",
        children: [
          {
            id: "unit-1",
            label: "Unit 1",
            code: "4WM1H",
            href: "/practice.html?pathway=modular&unit=Unit+1&bank=all",
            status: "live",
          },
          {
            id: "unit-2",
            label: "Unit 2",
            code: "4WM2H",
            href: "/practice.html?pathway=modular&unit=Unit+2&bank=all",
            status: "live",
          },
        ],
      },
      {
        id: "ial",
        label: "IAL",
        code: "International A-Level",
        palette: "pure",
        href: "/ial/index.html",
        intro: "Pearson Edexcel International Advanced Level — Pure, Statistics, and Mechanics units.",
        status: "live",
        children: [
          {
            id: "pure1",
            label: "Pure 1",
            code: "WMA11",
            palette: "pure",
            href: "/ial/wma11/index.html",
            status: "live",
          },
          {
            id: "pure2",
            label: "Pure 2",
            code: "WMA12",
            palette: "mulberry",
            href: "/ial/wma12/index.html",
            status: "planned",
          },
          {
            id: "stats1",
            label: "Statistics 1",
            code: "WST01",
            palette: "amber",
            href: "/ial/wst01/index.html",
            status: "planned",
          },
          {
            id: "mech1",
            label: "Mechanics 1",
            code: "WME01",
            palette: "teal",
            href: "/ial/wme01/index.html",
            status: "planned",
          },
        ],
      },
    ],
  };

  window.ELITE_COURSE_MODULES = {
    version: "2026-05-31-course-registry-v9-flexible-revision-counts",
    moduleCatalog,
    moduleAliases,
    palettes,
    navGroups,
    siteTree: SITE_TREE,
  };
})();
