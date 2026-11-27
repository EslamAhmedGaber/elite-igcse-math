(function (root) {
  "use strict";
  const courses = {};
  const worked = {};
  const studentCopy = root.document?.body?.dataset.page === "assignment";
  for (const lesson of root.ELITE_V7_LESSONS) {
    const courseId = "modular-" + lesson.unit;
    const course = courses[courseId] ||= { lessons: [], questions: [] };
    const unit = "Unit " + lesson.unit;
    const topic = "V7 " + lesson.id + " · " + lesson.title;
    course.lessons.push({ name: topic, chapter: "V7 · " + lesson.chapter });
    lesson.questions.forEach((source, index) => {
      const number = index + 1;
      const stem = lesson.id + "-Q" + String(number).padStart(2, "0");
      const id = "V7-" + stem;
      const paper = unit + " V7 · " + lesson.title;
      course.questions.push({
        id, topic, topics: [topic], bank: "all", modular_unit: unit,
        source_id: id, ep: true, paper, paper_code: "V7", question: number, qno: number,
        question_text: source.text, marks: source.marks, image: "assets/questions/modular-v7/" + stem + ".png"
      });
      if (studentCopy) return;
      worked[id] = { steps: [{ title: "Working", figures: [{
        src: "assets/solution-diagrams/modular-v7/" + stem + ".png",
        alt: "Worked solution to " + paper + ", question " + number
      }] }] };
    });
  }
  root.EliteModularV7 = { courses, worked };
})(window);
