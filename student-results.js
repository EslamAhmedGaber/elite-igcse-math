(function () {
  // Renders real student results into any [data-student-results] element.
  //   data-student-results="all"            every group (home, About)
  //   data-student-results="course:wma12"   only groups for that course (course page)
  const data = window.ELITE_STUDENT_RESULTS;
  if (!data) return;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function card(student, group) {
    return `<article class="sr-card">
      <span class="sr-grade" aria-label="Grade ${esc(student.grade)}">${esc(student.grade)}</span>
      <div class="sr-who">
        <strong>${esc(student.name)}</strong>
        <small>${esc(group.session)}${student.country ? ` &middot; ${esc(student.country)}` : ""}</small>
      </div>
      ${student.note ? `<p class="sr-note"><span>Dr Eslam says:</span> ${esc(student.note)}</p>` : ""}
    </article>`;
  }

  function render(mount) {
    const scope = mount.dataset.studentResults || "all";
    const course = scope.startsWith("course:") ? scope.slice(7) : "";
    const groups = data.groups.filter((group) => !course || (group.courses || []).includes(course));
    const blocks = groups.map((group) => {
      const list = data.students.filter((s) => s.group === group.id);
      if (!list.length) return "";
      const counts = {};
      list.forEach((s) => { counts[s.grade] = (counts[s.grade] || 0) + 1; });
      const rank = (g) => ({ "A*": 0, "9": 0, "A": 1, "8": 1 }[g] ?? 2);
      const summary = Object.entries(counts).sort((a, b) => rank(a[0]) - rank(b[0])).map(([g, n]) => `${n} &times; ${esc(g)}`).join(" &middot; ");
      return `<div class="sr-group">
        <h3>${esc(group.title)} <span>${esc(group.session)} &middot; ${summary}</span></h3>
        <div class="sr-row">${list.map((s) => card(s, group)).join("")}</div>
      </div>`;
    }).filter(Boolean);
    if (!blocks.length) { mount.hidden = true; return; }
    mount.innerHTML = `<div class="sr-head">
        <span class="hub-kicker">Student results</span>
        <h2>Real students, real grades</h2>
      </div>${blocks.join("")}`;
    mount.hidden = false;
  }

  function init() {
    document.querySelectorAll("[data-student-results]").forEach(render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.EliteStudentResults = { render };
})();
