(function (root) {
  "use strict";

  const scriptPromises = new Map();
  let mathJaxPromise = null;

  function emit(name, detail) {
    root.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function loadScript(src, options = {}) {
    const id = options.id || "";
    const key = id || new URL(src, document.baseURI).href;
    if (typeof options.test === "function" && options.test()) {
      return Promise.resolve(document.getElementById(id) || null);
    }
    if (scriptPromises.has(key)) return scriptPromises.get(key);

    const promise = new Promise((resolve, reject) => {
      let script = id ? document.getElementById(id) : null;
      let append = false;
      const complete = () => {
        if (script) script.dataset.eliteLoaded = "true";
        emit("elite:runtime-loaded", { id, src });
        resolve(script);
      };
      const fail = () => {
        scriptPromises.delete(key);
        reject(new Error(`Unable to load ${src}`));
      };

      if (script?.dataset.eliteLoaded === "true") {
        complete();
        return;
      }

      if (!script) {
        script = document.createElement("script");
        if (id) script.id = id;
        script.src = src;
        script.async = true;
        script.dataset.eliteRuntime = "true";
        append = true;
      }
      script.addEventListener("load", complete, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (append) document.head.appendChild(script);
    });

    scriptPromises.set(key, promise);
    return promise;
  }

  function ensureMathJax() {
    if (root.MathJax?.typesetPromise) return Promise.resolve(root.MathJax);
    if (mathJaxPromise) return mathJaxPromise;

    const existing = root.MathJax && !root.MathJax.typesetPromise ? root.MathJax : {};
    root.MathJax = {
      ...existing,
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        ...(existing.tex || {})
      },
      svg: { fontCache: "global", ...(existing.svg || {}) },
      startup: { ...(existing.startup || {}), typeset: false }
    };

    mathJaxPromise = loadScript(
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js",
      { id: "eliteMathJaxRuntime", test: () => Boolean(root.MathJax?.typesetPromise) }
    ).then(async () => {
      if (root.MathJax?.startup?.promise) await root.MathJax.startup.promise;
      if (!root.MathJax?.typesetPromise) throw new Error("MathJax started without a typesetting runtime");
      return root.MathJax;
    }).catch((error) => {
      mathJaxPromise = null;
      throw error;
    });

    return mathJaxPromise;
  }

  root.EliteRuntime = Object.freeze({ loadScript, ensureMathJax });
})(window);
