# Solution Writing Style

All website solution data uses one schema:

```json
{
  "status": "checked",
  "checkedBy": "Dr Eslam Ahmed + Codex",
  "updated": "2026-05-26T00:00:00",
  "topicNote": "Internal classification note only.",
  "steps": [
    { "title": "Differentiate", "body": "\\[ f'(x)=2x-3 \\]" }
  ],
  "finalAnswer": "\\(x=4\\)"
}
```

## Student-Facing Fields

- `steps[]` is the worked method shown on the site and later used by the PDF builders.
- `finalAnswer` is the answer plate shown after the method.
- Step titles should be short, scan-friendly phrases.
- Avoid generic labels such as `Part (a)` or `Step 1`; use a short action label instead, such as `Simplify part (a)` or `Find the gradient`.
- Step bodies may contain Markdown and TeX math.

## Internal Fields

- `topicNote` is private QA/classification metadata.
- `status`, `checkedBy`, and `updated` are private workflow metadata.
- Renderers must not show internal fields to students.

## Do Not Publish

Do not put these phrases in `steps[]` or `finalAnswer`:

- `Topic check`
- `topic-checked`
- `mark scheme review`
- `checking the answer`
- any sentence explaining internal QA or classification review

If a note is useful for students, write it as a normal worked step. If it is about tagging, checking, or review, keep it in `topicNote`.
