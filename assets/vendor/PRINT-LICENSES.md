# PDF export dependencies

Pinned browser builds used only when a PDF download is requested. No question
content is uploaded to a PDF service. License notices remain in both bundles.

- html2canvas 1.4.1, MIT, Niklas von Hertzen.
  Source: https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
  Project: https://github.com/niklasvh/html2canvas
- jsPDF 2.5.1, MIT, James Hall and contributors.
  Source: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
  Project: https://github.com/parallax/jsPDF

These versions match the existing PDF export implementation. Assets are served
locally to avoid requiring a third-party script request during a download.
