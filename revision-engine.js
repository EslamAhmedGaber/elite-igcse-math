(function (global) {
  "use strict";

  const PROFILE_WEIGHTS = {
    prediction: { frequency: 0.28, recency: 0.22, gap: 0.19, marks: 0.16, hard: 0.10, student: 0.05 },
    balanced: { frequency: 0.24, recency: 0.18, gap: 0.20, marks: 0.15, hard: 0.08, student: 0.15 },
    weakness: { frequency: 0.18, recency: 0.14, gap: 0.15, marks: 0.12, hard: 0.06, student: 0.35 },
    expertise: { frequency: 0.18, recency: 0.17, gap: 0.15, marks: 0.15, hard: 0.28, student: 0.07 }
  };

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function sourceKey(question) {
    if (!question) return "";
    return String(question.source_id || question.sourceId || question.id || `${question.paper || "paper"}::${question.question || question.qNo || ""}`);
  }

  function primaryTopic(question) {
    if (!question) return "Mixed";
    return String(
      question.topicName ||
      question.primaryTopicName ||
      question.topic ||
      (Array.isArray(question.topicNames) && question.topicNames[0]) ||
      (Array.isArray(question.topics) && question.topics[0]) ||
      "Mixed"
    );
  }

  function marks(question) {
    return Math.max(0, toNumber(question?.marks, 0));
  }

  function questionNumber(question) {
    return Math.max(0, toNumber(question?.question ?? question?.qNo, 0));
  }

  function parseYear(question) {
    if (Number.isFinite(Number(question?.year)) && Number(question.year) > 1900) {
      return Number(question.year);
    }
    const haystack = [
      question?.paper,
      question?.id,
      question?.source_id,
      question?.filename,
      question?.downloadName,
      question?.question_text
    ].join(" ");
    const match = haystack.match(/\b(?:19|20)\d{2}\b/);
    return match ? Number(match[0]) : 0;
  }

  function isHardQuestion(question, options = {}) {
    if (question?.is_expertise) return true;
    const pathway = options.pathway || options.context?.pathway || "";
    const course = options.course || options.context?.course || "";
    const qNo = questionNumber(question);
    if (pathway === "pure" || course === "wma11") return qNo >= 6 || marks(question) >= 7;
    return qNo >= 20 || marks(question) >= 7;
  }

  function normaliseSet(value) {
    if (!value) return new Set();
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value.map(String));
    if (typeof value === "object") return new Set(Object.keys(value).map(String));
    return new Set();
  }

  function normaliseProgress(progress = {}) {
    return {
      dueSources: normaliseSet(progress.dueSources || progress.mistakeSources),
      solvedIds: normaliseSet(progress.solvedIds),
      solvedSources: normaliseSet(progress.solvedSources),
      weakTopics: normaliseSet(progress.weakTopics)
    };
  }

  function isSolved(question, progress) {
    return progress.solvedIds.has(String(question?.id || "")) || progress.solvedSources.has(sourceKey(question));
  }

  function hasDueMistake(question, progress) {
    return progress.dueSources.has(sourceKey(question));
  }

  function hashSeed(seed) {
    const text = String(seed || "elite-revision-book");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = hashSeed(seed);
    return function random() {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function uniqueBySource(questions) {
    const seen = new Set();
    return (questions || []).filter((question) => {
      const key = sourceKey(question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function analyseTopics(questions, options = {}) {
    const progress = normaliseProgress(options.progress);
    const pool = uniqueBySource(questions);
    const latestYear = Math.max(0, ...pool.map(parseYear));
    const rows = new Map();

    pool.forEach((question) => {
      const topic = primaryTopic(question);
      const year = parseYear(question);
      const row = rows.get(topic) || {
        topic,
        count: 0,
        totalMarks: 0,
        hardCount: 0,
        recentCount: 0,
        mistakeCount: 0,
        unsolvedCount: 0,
        years: new Set(),
        latestYear: 0,
        oldestYear: 0
      };
      row.count += 1;
      row.totalMarks += marks(question);
      row.hardCount += isHardQuestion(question, options) ? 1 : 0;
      row.mistakeCount += hasDueMistake(question, progress) ? 1 : 0;
      row.unsolvedCount += isSolved(question, progress) ? 0 : 1;
      if (year) {
        row.years.add(year);
        row.latestYear = Math.max(row.latestYear, year);
        row.oldestYear = row.oldestYear ? Math.min(row.oldestYear, year) : year;
        if (latestYear && year >= latestYear - 1) row.recentCount += 1;
      }
      rows.set(topic, row);
    });

    const list = [...rows.values()];
    const maxCount = Math.max(1, ...list.map((row) => row.count));
    const maxRecent = Math.max(1, ...list.map((row) => row.recentCount));
    const maxAverageMarks = Math.max(1, ...list.map((row) => row.totalMarks / Math.max(1, row.count)));
    const weights = PROFILE_WEIGHTS[options.profile] || PROFILE_WEIGHTS.prediction;

    const topics = list.map((row) => {
      const averageMarks = row.totalMarks / Math.max(1, row.count);
      const gapYears = latestYear && row.latestYear ? Math.max(0, latestYear - row.latestYear) : 0;
      const frequencyScore = row.count / maxCount;
      const recencyScore = row.recentCount / maxRecent;
      const underCoverageScore = latestYear ? clamp((gapYears + 1) / 4) : 0.5;
      const recentUnderUseScore = 1 - recencyScore;
      const gapScore = clamp(underCoverageScore * 0.65 + recentUnderUseScore * 0.35);
      const marksScore = averageMarks / maxAverageMarks;
      const hardScore = row.hardCount / Math.max(1, row.count);
      const studentScore = clamp((row.mistakeCount / Math.max(1, row.count)) * 0.65 + (row.unsolvedCount / Math.max(1, row.count)) * 0.35);
      const score =
        frequencyScore * weights.frequency +
        recencyScore * weights.recency +
        gapScore * weights.gap +
        marksScore * weights.marks +
        hardScore * weights.hard +
        studentScore * weights.student;
      return {
        topic: row.topic,
        count: row.count,
        totalMarks: row.totalMarks,
        averageMarks,
        hardCount: row.hardCount,
        recentCount: row.recentCount,
        mistakeCount: row.mistakeCount,
        unsolvedCount: row.unsolvedCount,
        years: [...row.years].sort((a, b) => a - b),
        latestYear: row.latestYear,
        oldestYear: row.oldestYear,
        gapYears,
        score,
        probability: Math.round(clamp(score) * 100)
      };
    }).sort((a, b) => b.score - a.score || b.count - a.count || a.topic.localeCompare(b.topic));

    return {
      count: pool.length,
      totalMarks: pool.reduce((sum, question) => sum + marks(question), 0),
      latestYear,
      topics
    };
  }

  function scoreQuestions(questions, analysis, options = {}) {
    const progress = normaliseProgress(options.progress);
    const random = seededRandom(options.seed);
    const topicScores = new Map(analysis.topics.map((row) => [row.topic, row]));
    const maxMarks = Math.max(1, ...questions.map(marks));
    const includeMistakes = options.includeMistakes !== false;
    const includeWeakTopics = options.includeWeakTopics !== false;
    const includeUnsolved = options.includeUnsolved !== false;

    return uniqueBySource(questions).map((question) => {
      const topic = primaryTopic(question);
      const row = topicScores.get(topic) || { score: 0.15, recentCount: 0 };
      const solved = isSolved(question, progress);
      const due = hasDueMistake(question, progress);
      const weak = progress.weakTopics.has(topic);
      const markScore = marks(question) / maxMarks;
      const hardScore = isHardQuestion(question, options) ? 1 : 0;
      const recentQuestionScore = analysis.latestYear && parseYear(question)
        ? clamp(1 - ((analysis.latestYear - parseYear(question)) / 5))
        : 0.45;
      const progressBoost =
        (includeMistakes && due ? 0.34 : 0) +
        (includeWeakTopics && weak ? 0.22 : 0) +
        (includeUnsolved && !solved ? 0.16 : 0) -
        (includeUnsolved && solved ? 0.05 : 0);
      const score =
        row.score * 0.58 +
        markScore * 0.14 +
        hardScore * 0.10 +
        recentQuestionScore * 0.06 +
        progressBoost +
        random() * 0.08;
      return { question, topic, source: sourceKey(question), score };
    }).sort((a, b) => b.score - a.score);
  }

  function selectBalanced(scored, targetCount, topics, seed) {
    const random = seededRandom(`${seed || "elite"}:blueprint`);
    const selected = [];
    const selectedSources = new Set();
    const topicCounts = new Map();
    const count = Math.min(targetCount, scored.length);
    const byTopic = new Map();
    const topicMeta = new Map(topics.map((row) => [row.topic, row]));

    scored.forEach((item) => {
      const list = byTopic.get(item.topic) || [];
      list.push(item);
      byTopic.set(item.topic, list);
    });

    byTopic.forEach((list) => {
      list.forEach((item) => {
        item.blueprintScore = item.score + random() * 0.01;
      });
      list.sort((a, b) => b.blueprintScore - a.blueprintScore);
    });

    function addItem(item) {
      if (!item || selectedSources.has(item.source)) return false;
      selected.push(item);
      selectedSources.add(item.source);
      topicCounts.set(item.topic, (topicCounts.get(item.topic) || 0) + 1);
      return true;
    }

    function nextFromTopic(topic) {
      const list = byTopic.get(topic) || [];
      while (list.length && selectedSources.has(list[0].source)) {
        list.shift();
      }
      return list.shift() || null;
    }

    const topicOrder = topics
      .map((row) => row.topic)
      .filter((topic) => byTopic.has(topic));
    byTopic.forEach((_list, topic) => {
      if (!topicMeta.has(topic)) topicOrder.push(topic);
    });

    const orderedTopics = [...new Set(topicOrder)]
      .map((topic) => ({
        topic,
        score: (topicMeta.get(topic)?.score || 0) + random() * 0.015
      }))
      .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic))
      .map((row) => row.topic);

    if (!orderedTopics.length) return [];

    const strictCap = Math.max(1, Math.ceil(count / orderedTopics.length));
    for (let pass = 0; pass < strictCap && selected.length < count; pass += 1) {
      orderedTopics.forEach((topic) => {
        if (selected.length >= count) return;
        if ((topicCounts.get(topic) || 0) !== pass) return;
        addItem(nextFromTopic(topic));
      });
    }

    if (selected.length < count) {
      const relaxedCap = Math.max(strictCap + 1, Math.ceil(count * 0.12));
      while (selected.length < count) {
        const nextTopic = orderedTopics
          .filter((topic) => (topicCounts.get(topic) || 0) < relaxedCap)
          .map((topic) => {
            const next = (byTopic.get(topic) || []).find((item) => !selectedSources.has(item.source));
            if (!next) return null;
            const repeats = topicCounts.get(topic) || 0;
            return {
              topic,
              next,
              score: next.score - repeats * 0.22 + random() * 0.02
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)[0];
        if (!nextTopic) break;
        addItem(nextFromTopic(nextTopic.topic));
      }
    }

    return selected.map((item) => item.question);
  }

  function buildRevisionBook(questions, options = {}) {
    const pool = uniqueBySource(questions);
    const requestedCount = Math.max(1, Math.floor(toNumber(options.count, 50)));
    const minimumCount = Math.max(1, Math.floor(toNumber(options.minimumCount, 50)));
    const targetCount = Math.max(requestedCount, minimumCount);
    const seed = options.seed || `elite-revision-${Date.now()}`;
    const analysis = analyseTopics(pool, options);
    const scored = scoreQuestions(pool, analysis, { ...options, seed });
    const selected = selectBalanced(scored, targetCount, analysis.topics, seed);
    const selectedTopics = new Map();
    selected.forEach((question) => {
      const topic = primaryTopic(question);
      selectedTopics.set(topic, (selectedTopics.get(topic) || 0) + 1);
    });

    return {
      seed,
      requestedCount,
      targetCount,
      availableCount: pool.length,
      questions: selected,
      analysis: {
        ...analysis,
        selectedTopics: [...selectedTopics.entries()]
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
      }
    };
  }

  global.EliteRevisionEngine = {
    buildRevisionBook,
    analyseTopics,
    sourceKey,
    primaryTopic,
    parseYear
  };
})(typeof window !== "undefined" ? window : globalThis);
