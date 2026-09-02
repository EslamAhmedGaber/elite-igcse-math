(function (root) {
  "use strict";

  const params = new URLSearchParams(root.location.search);
  const pathway = (params.get("pathway") || "").toLowerCase();
  const requested = (params.get("course") || "").toLowerCase();
  const baccalaureate = pathway === "baccalaureate" || requested === "egyptian-baccalaureate" || requested === "baccalaureate";
  const ialCourse = ["wma11", "wma12", "wme01"].includes(requested)
    ? requested
    : pathway === "pure" ? "wma11" : "";
  const dataFiles = {
    baccalaureate: "data/EgyptianBaccalaureate/2026/English/baccalaureate-data.js?v=20260902c",
    wma11: "ial/wma11/wma11-data.js?v=20260527c",
    wma12: "ial/wma12/wma12-data.js?v=20260611a",
    wme01: "ial/wme01/wme01-data.js?v=20260613a"
  };
  const selectedData = baccalaureate ? dataFiles.baccalaureate : ialCourse ? dataFiles[ialCourse] : "questions-data.js?v=20260528a";

  root.ELITE_EXAM_BOOTSTRAP = Object.freeze({
    course: baccalaureate ? "baccalaureate" : ialCourse || "igcse",
    initialData: selectedData
  });

  function setLoading(active, message = "Loading the selected question bank...") {
    document.body?.classList.toggle("runtime-loading", active);
    document.body?.setAttribute("aria-busy", String(active));
    const paper = document.getElementById("examPaper");
    if (active && paper && !paper.children.length) {
      paper.innerHTML = `<div class="empty-roadmap runtime-status">${message}</div>`;
    }
  }

  async function boot() {
    if (!root.EliteRuntime) throw new Error("Elite runtime loader is unavailable");
    setLoading(true);
    await root.EliteRuntime.loadScript(selectedData, { id: "eliteExamCourseData" });
    if (!ialCourse && !baccalaureate) {
      await root.EliteRuntime.loadScript("topic-normalizer.js", { id: "eliteExamTopicNormalizer" });
    }
    await root.EliteRuntime.loadScript("exam.js?v=baccalaureate-20260902c", { id: "eliteExamApp" });
    setLoading(false);
  }

  boot().catch((error) => {
    console.error("[exam-bootstrap]", error);
    setLoading(false);
    const paper = document.getElementById("examPaper");
    if (paper) {
      paper.innerHTML = `<div class="empty-roadmap runtime-error"><strong>The question bank did not load.</strong><p>Check the connection, then refresh this page.</p></div>`;
    }
  });
})(window);
