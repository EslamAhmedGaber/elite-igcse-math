/*
 * Elite IGCSE — "Due for review" topic queue (pure computation, no DOM).
 *
 * Data reality this is built on (verified in app.js / ial/<course>.js):
 * - The solved store (e.g. "solvedExpertiseQuestions", "eliteWMA11SolvedV1")
 *   keeps question ids only — NO dates — so a topic's "last solved" date
 *   cannot be known and is never guessed here.
 * - The mistake box is the one per-question store WITH timestamps:
 *     Linear/Modular (app.js): { id, reason, level, attempts, addedAt,
 *       updatedAt, dueAt, masteredAt } — epoch milliseconds.
 *     IAL (ial/wma11/wma11.js and siblings): { id, paper, qNo, topic, marks,
 *       addedAt } — addedAt is an ISO string; there is no dueAt/level.
 * - The practice app already advances each Linear/Modular mistake question
 *   through a spaced ladder (app.js REVIEW_INTERVALS = [1, 3, 7, 14] days):
 *   a question is due immediately when added, then 3 days after the first
 *   successful review, 7 days after the second, and mastered after the
 *   third. This module does NOT invent a second ladder — it aggregates the
 *   question-level schedule the app already maintains up to topic level.
 * - For records with no explicit dueAt (the IAL shape), the due date is
 *   derived as addedAt + 1 day — the first rung of the same ladder — and
 *   the question stays due until the student removes or clears it, which
 *   matches how the IAL mistake box behaves (no advance/master flow).
 *
 * Topic-level derivation: group the active (unmastered) mistake-box
 * records by topic; a topic is DUE when at least one of its questions has
 * a due date in the past. "Days overdue" is measured from the earliest
 * due date in the topic, and "last activity" is the latest updatedAt /
 * addedAt among the topic's dated records.
 *
 * Works in the browser (window.EliteReviewQueue) and in Node (tests).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.EliteReviewQueue = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const DAY_MS = 86400000;
  /* First rung of the site's existing ladder (app.js REVIEW_INTERVALS[0]). */
  const FIRST_INTERVAL_DAYS = 1;

  function toMillis(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? null : parsed;
  }

  function isMastered(item) {
    return Boolean(item && item.masteredAt);
  }

  /* The moment this mistake-box record is (next) due for another attempt. */
  function itemDueAt(item) {
    if (!item || typeof item !== "object") return null;
    const explicit = toMillis(item.dueAt);
    if (explicit !== null) return explicit;
    const added = toMillis(item.addedAt) ?? toMillis(item.updatedAt);
    if (added === null) return null;
    return added + FIRST_INTERVAL_DAYS * DAY_MS;
  }

  function itemLastActivity(item) {
    if (!item || typeof item !== "object") return null;
    return toMillis(item.updatedAt) ?? toMillis(item.addedAt) ?? toMillis(item.dueAt);
  }

  function lookupQuestion(questionById, id) {
    if (!questionById) return null;
    if (typeof questionById.get === "function") return questionById.get(id) || null;
    return questionById[id] || null;
  }

  function topicOf(item, questionById) {
    const id = item.id || item.questionId || "";
    const question = id ? lookupQuestion(questionById, id) : null;
    const topic = (question && (question.topic || question.topicName))
      || item.topic || item.topicName || "";
    if (!topic) return null;
    const topicSlug = (question && (question.topic_slug || question.topicSlug))
      || item.topic_slug || item.topicSlug || topic;
    const unit = (question && question.unit) || item.unit || "";
    return { topic, topicSlug, unit, key: `${unit}|||${topicSlug}` };
  }

  /*
   * The DUE queue: one row per topic with at least one active mistake-box
   * record whose due date has passed, most overdue first.
   * Row: { topic, topicSlug, unit, activeCount, dueCount, masteredCount,
   *        earliestDueAt, daysOverdue, lastActivityAt, maxAttempts }
   */
  function computeDueTopics({ reviewItems, questionById, now } = {}) {
    const at = Number(now) || Date.now();
    const rows = new Map();
    Object.values(reviewItems || {}).forEach((item) => {
      if (!item || typeof item !== "object") return;
      const where = topicOf(item, questionById);
      if (!where) return;
      const row = rows.get(where.key) || {
        topic: where.topic,
        topicSlug: where.topicSlug,
        unit: where.unit,
        activeCount: 0,
        dueCount: 0,
        masteredCount: 0,
        earliestDueAt: null,
        daysOverdue: 0,
        lastActivityAt: null,
        maxAttempts: 0
      };
      if (isMastered(item)) {
        row.masteredCount += 1;
      } else {
        row.activeCount += 1;
        const dueAt = itemDueAt(item);
        if (dueAt !== null) {
          if (row.earliestDueAt === null || dueAt < row.earliestDueAt) {
            row.earliestDueAt = dueAt;
          }
          if (dueAt <= at) row.dueCount += 1;
        }
      }
      const activity = itemLastActivity(item);
      if (activity !== null && (row.lastActivityAt === null || activity > row.lastActivityAt)) {
        row.lastActivityAt = activity;
      }
      row.maxAttempts = Math.max(row.maxAttempts, Number(item.attempts || 0));
      rows.set(where.key, row);
    });
    return [...rows.values()]
      .filter((row) => row.dueCount > 0)
      .map((row) => ({
        ...row,
        daysOverdue: row.earliestDueAt === null
          ? 0
          : Math.max(0, Math.floor((at - row.earliestDueAt) / DAY_MS))
      }))
      .sort((a, b) =>
        b.daysOverdue - a.daysOverdue
        || b.dueCount - a.dueCount
        || a.topic.localeCompare(b.topic));
  }

  function summarizeReview({ reviewItems, questionById, now } = {}) {
    const at = Number(now) || Date.now();
    let activeQuestions = 0;
    let masteredQuestions = 0;
    let dueQuestions = 0;
    let nextDueAt = null;
    Object.values(reviewItems || {}).forEach((item) => {
      if (!item || typeof item !== "object") return;
      if (isMastered(item)) {
        masteredQuestions += 1;
        return;
      }
      activeQuestions += 1;
      const dueAt = itemDueAt(item);
      if (dueAt === null) return;
      if (dueAt <= at) dueQuestions += 1;
      else if (nextDueAt === null || dueAt < nextDueAt) nextDueAt = dueAt;
    });
    return {
      dueTopics: computeDueTopics({ reviewItems, questionById, now: at }),
      dueQuestions,
      activeQuestions,
      masteredQuestions,
      nextDueAt
    };
  }

  return {
    DAY_MS,
    FIRST_INTERVAL_DAYS,
    toMillis,
    isMastered,
    itemDueAt,
    itemLastActivity,
    computeDueTopics,
    summarizeReview
  };
});
