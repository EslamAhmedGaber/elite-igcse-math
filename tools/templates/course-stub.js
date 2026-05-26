// Copy this object into course-modules.js when adding a new curriculum.
// Fill every TODO before publishing.
const COURSE_STUB = {
  id: "course-id-todo",
  label: "Course Name TODO",
  detail: "Exam code TODO",
  href: "/path/to/course/index.html",
  pathway: "course-id-todo",
  palette: "course-id-todo",
  panelLabel: "Course modules",
  intro: "Short course intro for the pathway hub.",
  paperSection: {
    id: "course-papers-todo",
    className: "",
    tag: "Course | Code",
    tagTone: "",
    title: "Course paper list",
    heading: "Course papers",
    eyebrow: "Course | Exam board",
    intro: "Newest first. Question paper and matching worked solution stay beside each other.",
    explainer: "Short explainer for the Past Papers page.",
  },
  links: [
    { module: "classified", title: "Classified View", detail: "Topic practice", href: "/practice.html?pathway=course-id-todo&bank=all", pathway: "course-id-todo" },
    { module: "expertise", title: "Expertise", detail: "Harder set", href: "/practice.html?pathway=course-id-todo&bank=expertise", pathway: "course-id-todo" },
    { module: "build-test", title: "Build Test", detail: "Mocks and worksheets", href: "/exam.html?pathway=course-id-todo&mode=custom", pathway: "course-id-todo" },
    { module: "smart-revision", title: "Smart Revision", detail: "Weak topics and mistakes", href: "/exam.html?pathway=course-id-todo&mode=smart", pathway: "course-id-todo" },
    { module: "progress", title: "Progress", detail: "Track mastery", href: "/progress.html?pathway=course-id-todo", pathway: "course-id-todo" },
    { module: "mistake-box", title: "Mistake Box", detail: "Saved revision", href: "/practice.html?pathway=course-id-todo&mode=review", pathway: "course-id-todo" },
    { module: "saved-tests", title: "Saved Tests", detail: "Reuse builder tests", href: "/exam.html?pathway=course-id-todo&mode=saved", pathway: "course-id-todo" },
    { module: "books", title: "Books", detail: "Question and answer PDFs", href: "/downloads.html?pathway=course-id-todo", pathway: "course-id-todo" },
    { module: "past-solutions", title: "Past Papers", detail: "Paper + solution rows", href: "/pastpapers.html?pathway=course-id-todo#course-papers-todo", pathway: "course-id-todo" },
  ],
  pastPapers: [
    {
      heading: "2027",
      sessions: [
        {
          label: "Jan 2027",
          papers: [
            { kind: "paper", title: "Question paper", href: "downloads/COURSE/Papers/COURSE_2027_Jan_QP.pdf" },
            { kind: "solution", title: "Worked solution", href: "downloads/COURSE/Papers/COURSE_2027_Jan_Solutions.pdf" },
          ],
        },
      ],
    },
  ],
  books: [
    {
      className: "course-id-todo-book",
      tag: "Course Code",
      title: "Course Classified Books",
      description: "Short download-card description.",
      meta: ["Question book", "Answer book", "Expertise route"],
      actions: [
        { label: "Questions PDF", href: "downloads/COURSE/COURSE_Classified_Questions.pdf", variant: "primary", target: "_blank" },
        { label: "Answers PDF", href: "downloads/COURSE/COURSE_Classified_With_Answers.pdf", variant: "solution", target: "_blank" },
      ],
    },
  ],
  storageKeys: {
    solved: "eliteCOURSESolvedV1",
    mistakeBox: "eliteCOURSEMistakeBoxV1",
    selected: "eliteCOURSESelectedV1",
    savedTests: "eliteCOURSESavedTestsV1",
  },
};
