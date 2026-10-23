// Elite Practice: original 4MA1-style questions for syllabus topics that recent Higher papers
// do not examine (so the Random Mock and topic pages can cover the whole course).
// Every numerical answer was computed by code, not by hand. Rendered by build_elite_practice.cjs.
//
// q: {topic, marks, parts: [{html, marks, answer?}], intro?, graph?, text, steps: [[title, body]], final}
'use strict';

const line = (label = '') => `<div class="ans">${label}<span class="dots"></span></div>`;

// Graph helper: axes, grid and polylines, drawn like an exam grid.
function graph({xMax, xStep, xMinor, yMax, yStep, yMinor, xLabel, yLabel, lines, xTickLabel = v => v, yTickLabel = v => v, labels = [], note = ''}) {
  const W = 620, H = 380, L = 70, B = 50, T = 20, R = 20;
  const px = x => L + (x / xMax) * (W - L - R), py = y => H - B - (y / yMax) * (H - B - T);
  let g = '';
  for (let x = 0; x <= xMax + 1e-9; x += xMinor) g += `<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(yMax)}" stroke="#d6d6d6" stroke-width="${Math.abs(x / xStep - Math.round(x / xStep)) < 1e-9 ? 1.2 : 0.5}"/>`;
  for (let y = 0; y <= yMax + 1e-9; y += yMinor) g += `<line x1="${px(0)}" y1="${py(y)}" x2="${px(xMax)}" y2="${py(y)}" stroke="#d6d6d6" stroke-width="${Math.abs(y / yStep - Math.round(y / yStep)) < 1e-9 ? 1.2 : 0.5}"/>`;
  for (let x = 0; x <= xMax + 1e-9; x += xStep) g += `<text x="${px(x)}" y="${py(0) + 22}" text-anchor="middle">${xTickLabel(+x.toFixed(4))}</text>`;
  for (let y = 0; y <= yMax + 1e-9; y += yStep) g += `<text x="${px(0) - 10}" y="${py(y) + 6}" text-anchor="end">${yTickLabel(+y.toFixed(4))}</text>`;
  g += `<line x1="${px(0)}" y1="${py(0)}" x2="${px(xMax) + 12}" y2="${py(0)}" stroke="#000" stroke-width="1.6"/><line x1="${px(0)}" y1="${py(0)}" x2="${px(0)}" y2="${py(yMax) - 12}" stroke="#000" stroke-width="1.6"/>`;
  for (const pts of lines) g += `<polyline fill="none" stroke="#000" stroke-width="2.2" points="${pts.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}"/>`;
  for (const [x, y, text] of labels) g += `<text x="${px(x)}" y="${py(y)}"${/[A-Za-z]/.test(text) ? ' font-style="italic"' : ''}>${text}</text>`;
  if (note) g += `<text x="${W - R}" y="${T + 14}" text-anchor="end" font-size="15">${note}</text>`;
  g += `<text x="${(px(0) + px(xMax)) / 2}" y="${H - 6}" text-anchor="middle">${xLabel}</text>`;
  g += `<text x="16" y="${(py(0) + py(yMax)) / 2}" text-anchor="middle" transform="rotate(-90 16 ${(py(0) + py(yMax)) / 2})">${yLabel}</text>`;
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Times New Roman" font-size="17">${g}</svg>`;
}

const CALC = 'Using a Calculator', KIN = 'Kinematic Graphs', FDP = 'Fractions, Decimals & Percentages', ALG = 'Algebra Toolkit';
const QF = 'Quadratic Formula', PR = 'Powers & Roots', NT = 'Number Toolkit';
const frac = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;

module.exports = [
  // ---------------- Using a Calculator ----------------
  {topic: CALC, marks: 2, parts: [{html: `Work out ${frac('5.7<sup>2</sup> &minus; &radic;30.25', '1.8 &times; 0.65')}<br><br>Write down all the figures on your calculator display.`, marks: 2}],
   text: 'Work out (5.7^2 - sqrt 30.25) / (1.8 x 0.65). Write down all the figures on your calculator display.',
   steps: [['Work out the top and the bottom', '\\[\n5.7^2-\\sqrt{30.25}=32.49-5.5=26.99,\\qquad 1.8\\times0.65=1.17\n\\]'], ['Divide', '\\[\n\\frac{26.99}{1.17}=23.06837607\\ldots\n\\]']],
   final: '\\(23.06837607\\)'},
  {topic: CALC, marks: 3, parts: [{html: `(a) Work out 4.3<sup>3</sup> &minus; ${frac('1', '0.16')}<br>Write down all the figures on your calculator display.`, marks: 2}, {html: '(b) Give your answer to part (a) correct to 3 significant figures.', marks: 1}],
   text: '(a) Work out 4.3^3 - 1/0.16. Write down all the figures on your calculator display. (b) Give your answer to part (a) correct to 3 significant figures.',
   steps: [['(a) Use the calculator', '\\[\n4.3^3-\\frac{1}{0.16}=79.507-6.25=73.257\n\\]'], ['(b) Round to 3 significant figures', 'The fourth figure is \\(5\\), so round up: \\(73.3\\).']],
   final: '(a) \\(73.257\\) (b) \\(73.3\\)'},
  {topic: CALC, marks: 2, parts: [{html: `Work out ${frac('8.4 &times; tan 35&deg;', 'cos 62&deg;')}<br><br>Give your answer correct to 3 significant figures.`, marks: 2}],
   text: 'Work out 8.4 x tan 35 degrees / cos 62 degrees. Give your answer correct to 3 significant figures.',
   steps: [['Check the calculator is in degrees', 'Then\n\n\\[\n\\frac{8.4\\times\\tan35^\\circ}{\\cos62^\\circ}=\\frac{5.8817\\ldots}{0.46947\\ldots}=12.528\\ldots\n\\]'], ['Round', '\\(12.5\\) (3 significant figures)']],
   final: '\\(12.5\\)'},
  {topic: CALC, marks: 3, parts: [{html: `Work out ${frac('3.7 &times; 10<sup>5</sup> + 2.9 &times; 10<sup>4</sup>', '8.1 &times; 10<sup>&minus;3</sup>')}<br><br>Give your answer in standard form correct to 3 significant figures.`, marks: 3}],
   text: 'Work out (3.7 x 10^5 + 2.9 x 10^4) / (8.1 x 10^-3). Give your answer in standard form correct to 3 significant figures.',
   steps: [['Add the top', '\\[\n3.7\\times10^5+2.9\\times10^4=370\\,000+29\\,000=399\\,000\n\\]'], ['Divide', '\\[\n\\frac{399\\,000}{8.1\\times10^{-3}}=49\\,259\\,259.26\\ldots\n\\]'], ['Standard form, 3 significant figures', '\\(4.93\\times10^7\\)']],
   final: '\\(4.93\\times10^{7}\\)'},
  {topic: CALC, marks: 2, parts: [{html: `<i>p</i> = 2.6 &nbsp;&nbsp; <i>q</i> = &minus;1.8<br><br>Work out the value of ${frac('<i>p</i><sup>2</sup> &minus; 3<i>q</i>', '&radic;(<i>p</i> + <i>q</i><sup>2</sup>)')}<br><br>Give your answer correct to 3 decimal places.`, marks: 2}],
   text: 'p = 2.6, q = -1.8. Work out the value of (p^2 - 3q) / sqrt(p + q^2). Give your answer correct to 3 decimal places.',
   steps: [['Substitute (brackets round the negative)', '\\[\np^2-3q=2.6^2-3(-1.8)=6.76+5.4=12.16\n\\]\n\n\\[\n\\sqrt{p+q^2}=\\sqrt{2.6+(-1.8)^2}=\\sqrt{5.84}=2.4166\\ldots\n\\]'], ['Divide and round', '\\[\n\\frac{12.16}{2.4166\\ldots}=5.03184\\ldots\\approx5.032\n\\]']],
   final: '\\(5.032\\)'},
  {topic: CALC, marks: 2, parts: [{html: 'Work out the value of 4.8<sup>&minus;0.5</sup> + 1.7<sup>3</sup><br><br>Give your answer correct to 4 significant figures.', marks: 2}],
   text: 'Work out the value of 4.8^-0.5 + 1.7^3. Give your answer correct to 4 significant figures.',
   steps: [['Evaluate each power', '\\[\n4.8^{-0.5}=\\frac{1}{\\sqrt{4.8}}=0.45643\\ldots,\\qquad 1.7^3=4.913\n\\]'], ['Add and round', '\\[\n0.45643\\ldots+4.913=5.36943\\ldots\\approx5.369\n\\]']],
   final: '\\(5.369\\)'},
  {topic: CALC, marks: 3, parts: [{html: `Here is a calculation: &nbsp;&nbsp; ${frac('19.6 &times; 0.48', '4.1')}<br><br>(a) By rounding each number to 1 significant figure, work out an estimate for the calculation.`, marks: 2}, {html: '(b) Use your calculator to work out the calculation. Give your answer correct to 3 significant figures.', marks: 1}],
   text: 'Here is a calculation: 19.6 x 0.48 / 4.1. (a) By rounding each number to 1 significant figure, work out an estimate. (b) Use your calculator to work out the calculation, correct to 3 significant figures.',
   steps: [['(a) Round each number to 1 significant figure', '\\[\n\\frac{20\\times0.5}{4}=\\frac{10}{4}=2.5\n\\]'], ['(b) Calculator value', '\\[\n\\frac{19.6\\times0.48}{4.1}=2.2946\\ldots\\approx2.29\n\\]']],
   final: '(a) \\(2.5\\) (b) \\(2.29\\)'},

  // ---------------- Kinematic Graphs ----------------
  {topic: KIN, marks: 4, intro: 'Ali walked from his home to a shop. He stayed at the shop and then walked back home.<br>Here is the distance-time graph for his journey.',
   graph: graph({xMax: 60, xStep: 10, xMinor: 2, yMax: 2, yStep: 0.5, yMinor: 0.1, xLabel: 'Time (minutes)', yLabel: 'Distance from home (km)', lines: [[[0, 0], [20, 1.6], [30, 1.6], [50, 0]]]}),
   parts: [{html: '(a) How far was Ali from home after 10 minutes?', marks: 1, unit: 'km'}, {html: '(b) How many minutes did Ali stay at the shop?', marks: 1, unit: 'minutes'}, {html: '(c) Work out Ali&rsquo;s speed, in kilometres per hour, on his walk back home.', marks: 2, unit: 'km/h'}],
   text: 'Ali walked from home to a shop, stayed, then walked back home. Distance-time graph. (a) How far from home after 10 minutes? (b) How many minutes at the shop? (c) Speed in km/h on the walk back home.',
   steps: [['(a) Read the graph at 10 minutes', 'The line from \\((0,0)\\) to \\((20,1.6)\\) is halfway up at \\(10\\) minutes: \\(0.8\\) km.'], ['(b) The flat section', 'From \\(20\\) to \\(30\\) minutes: \\(10\\) minutes.'], ['(c) Speed = distance ÷ time', 'He walks \\(1.6\\) km in \\(50-30=20\\) minutes \\(=\\frac13\\) hour.\n\n\\[\n1.6\\div\\frac13=4.8\\text{ km/h}\n\\]']],
   final: '(a) \\(0.8\\) km (b) \\(10\\) minutes (c) \\(4.8\\) km/h'},
  {topic: KIN, marks: 5, intro: 'Here is the speed-time graph for the first 40 seconds of a car&rsquo;s journey.',
   graph: graph({xMax: 40, xStep: 5, xMinor: 1, yMax: 20, yStep: 2, yMinor: 1, xLabel: 'Time (s)', yLabel: 'Speed (m/s)', lines: [[[0, 0], [12, 18], [32, 18], [40, 0]]]}),
   parts: [{html: '(a) Work out the acceleration of the car during the first 12 seconds.', marks: 2, unit: 'm/s<sup>2</sup>'}, {html: '(b) Work out the total distance the car travels in the 40 seconds.', marks: 3, unit: 'm'}],
   text: 'Speed-time graph of a car for 40 seconds: from 0 to 18 m/s in 12 s, constant 18 m/s to 32 s, then to 0 at 40 s. (a) Acceleration in the first 12 seconds. (b) Total distance in 40 seconds.',
   steps: [['(a) Acceleration = gradient', '\\[\n\\frac{18-0}{12}=1.5\\text{ m/s}^2\n\\]'], ['(b) Distance = area under the graph', 'Split into a triangle, a rectangle and a triangle:\n\n\\[\n\\tfrac12\\times12\\times18+20\\times18+\\tfrac12\\times8\\times18=108+360+72=540\\text{ m}\n\\]']],
   final: '(a) \\(1.5\\) m/s\\(^2\\) (b) \\(540\\) m'},
  {topic: KIN, marks: 4, intro: 'Here is the speed-time graph for 25 seconds of a cyclist&rsquo;s journey.',
   graph: graph({xMax: 25, xStep: 5, xMinor: 1, yMax: 20, yStep: 4, yMinor: 1, xLabel: 'Time (s)', yLabel: 'Speed (m/s)', lines: [[[0, 4], [10, 16], [25, 16]]]}),
   parts: [{html: '(a) Work out the distance the cyclist travels in the 25 seconds.', marks: 3, unit: 'm'}, {html: '(b) Work out the average speed of the cyclist for the 25 seconds.', marks: 1, unit: 'm/s'}],
   text: 'Speed-time graph of a cyclist: 4 m/s rising to 16 m/s in 10 s, then constant 16 m/s until 25 s. (a) Distance travelled in 25 seconds. (b) Average speed.',
   steps: [['(a) Area of the trapezium (first 10 s)', '\\[\n\\frac{4+16}{2}\\times10=100\\text{ m}\n\\]'], ['(a) Area of the rectangle (last 15 s)', '\\[\n16\\times15=240\\text{ m}\n\\]\n\nTotal: \\(100+240=340\\) m.'], ['(b) Average speed = total distance ÷ total time', '\\[\n340\\div25=13.6\\text{ m/s}\n\\]']],
   final: '(a) \\(340\\) m (b) \\(13.6\\) m/s'},
  {topic: KIN, marks: 4, intro: 'At 10:00 Sara leaves town <i>A</i> and cycles towards town <i>B</i>.<br>At 10:00 Tom leaves town <i>B</i> and walks towards town <i>A</i>.<br>The graph shows their distances from town <i>A</i>.',
   graph: graph({xMax: 60, xStep: 12, xMinor: 3, yMax: 12, yStep: 2, yMinor: 1, xLabel: 'Time', yLabel: 'Distance from A (km)', xTickLabel: v => (v === 60 ? '11:00' : `10:${String(v).padStart(2, '0')}`), lines: [[[0, 0], [48, 12]], [[0, 12], [60, 7]]], labels: [[30, 8.4, 'Sara'], [46, 9.4, 'Tom']]}),
   parts: [{html: '(a) At what time do Sara and Tom pass each other?', marks: 1}, {html: '(b) How far from town <i>A</i> are they when they pass each other?', marks: 1, unit: 'km'}, {html: '(c) Work out Tom&rsquo;s speed in kilometres per hour.', marks: 2, unit: 'km/h'}],
   text: 'Sara cycles from A towards B and Tom walks from B towards A, both from 10:00. Distance-time graph from A. (a) Time they pass each other. (b) Distance from A when they pass. (c) Tom\'s speed in km/h.',
   steps: [['(a) Where the lines cross', 'The lines cross at \\(36\\) minutes after 10:00, so at \\(10{:}36\\).'], ['(b) Read across', 'At the crossing point the distance from \\(A\\) is \\(9\\) km.'], ['(c) Tom\'s speed', 'Tom goes from \\(12\\) km to \\(7\\) km from \\(A\\) in \\(1\\) hour:\n\n\\[\n\\frac{12-7}{1}=5\\text{ km/h}\n\\]']],
   final: '(a) \\(10{:}36\\) (b) \\(9\\) km (c) \\(5\\) km/h'},
  {topic: KIN, marks: 3, intro: 'A particle starts from rest. It speeds up at a constant rate for <i>T</i> seconds until its speed is 12 m/s.<br>It then travels at 12 m/s for 30 seconds.<br>The total distance it travels is 450 m.',
   graph: graph({xMax: 50, xStep: 50, xMinor: 50, yMax: 15, yStep: 15, yMinor: 15, xLabel: 'Time (s)', yLabel: 'Speed (m/s)', xTickLabel: v => (v === 0 ? '0' : ''), yTickLabel: v => (v === 0 ? '0' : ''), note: 'Diagram NOT accurately drawn', lines: [[[0, 0], [12, 12], [44, 12]], [[12, 0], [12, 12]], [[44, 0], [44, 12]]], labels: [[11.4, -1.8, 'T'], [40.5, -1.8, 'T + 30'], [-5, 11.6, '12']]}),
   parts: [{html: 'Work out the value of <i>T</i>.', marks: 3, answer: '<i>T</i> = '}],
   text: 'A particle starts from rest and speeds up at a constant rate for T seconds to 12 m/s, then travels at 12 m/s for 30 seconds. Total distance 450 m. Work out T.',
   steps: [['Distance = area under the graph', 'Triangle: \\(\\tfrac12\\times T\\times12=6T\\). Rectangle: \\(30\\times12=360\\).'], ['Form and solve the equation', '\\[\n6T+360=450 \\;\\Rightarrow\\; 6T=90 \\;\\Rightarrow\\; T=15\n\\]']],
   final: '\\(T=15\\)'},
  {topic: KIN, marks: 4, intro: 'A car is travelling at 20 m/s. The driver brakes and the car slows down at a constant rate.<br>Here is the speed-time graph for the next 6 seconds.',
   graph: graph({xMax: 6, xStep: 1, xMinor: 0.5, yMax: 20, yStep: 5, yMinor: 1, xLabel: 'Time (s)', yLabel: 'Speed (m/s)', lines: [[[0, 20], [6, 5]]]}),
   parts: [{html: '(a) Work out the deceleration of the car.', marks: 2, unit: 'm/s<sup>2</sup>'}, {html: '(b) Work out the distance the car travels in the 6 seconds.', marks: 2, unit: 'm'}],
   text: 'A car slows down from 20 m/s to 5 m/s in 6 seconds at a constant rate. Speed-time graph. (a) Deceleration. (b) Distance in the 6 seconds.',
   steps: [['(a) Gradient of the line', '\\[\n\\frac{5-20}{6}=-2.5\n\\]\n\nSo the deceleration is \\(2.5\\) m/s\\(^2\\).'], ['(b) Area of the trapezium', '\\[\n\\frac{20+5}{2}\\times6=75\\text{ m}\n\\]']],
   final: '(a) \\(2.5\\) m/s\\(^2\\) (b) \\(75\\) m'},
  {topic: KIN, marks: 4, intro: 'A train starts from rest and speeds up at a constant rate for 50 seconds until its speed is 30 m/s.<br>It then travels at 30 m/s for <i>t</i> seconds.<br>It then slows down at a constant rate and stops 40 seconds later.<br>The total distance the train travels is 6 km.',
   parts: [{html: 'Work out the value of <i>t</i>.', marks: 4, answer: '<i>t</i> = '}],
   text: 'A train accelerates from rest to 30 m/s in 50 s, travels at 30 m/s for t seconds, then stops in 40 s. Total distance 6 km. Work out t.',
   steps: [['Sketch the speed-time graph', 'A trapezium: up for \\(50\\) s, flat at \\(30\\) m/s for \\(t\\) s, down for \\(40\\) s.'], ['Distance = area (in metres)', '\\[\n\\tfrac12\\times50\\times30+30t+\\tfrac12\\times40\\times30=750+30t+600\n\\]'], ['Form and solve the equation', '\\(6\\) km \\(=6000\\) m:\n\n\\[\n1350+30t=6000 \\;\\Rightarrow\\; 30t=4650 \\;\\Rightarrow\\; t=155\n\\]']],
   final: '\\(t=155\\)'},

  // ---------------- Fractions, Decimals & Percentages ----------------
  {topic: FDP, marks: 2, parts: [{html: `Write these numbers in order of size. Start with the smallest number.<br><br>&nbsp;&nbsp;&nbsp;&nbsp;0.62 &nbsp;&nbsp;&nbsp;&nbsp; ${frac('5', '8')} &nbsp;&nbsp;&nbsp;&nbsp; 61% &nbsp;&nbsp;&nbsp;&nbsp; ${frac('2', '3')} &nbsp;&nbsp;&nbsp;&nbsp; ${frac('3', '5')}`, marks: 2}],
   text: 'Write these numbers in order of size, smallest first: 0.62, 5/8, 61%, 2/3, 3/5.',
   steps: [['Change every number to a decimal', '\\(0.62\\), \\(\\frac58=0.625\\), \\(61\\%=0.61\\), \\(\\frac23=0.666\\ldots\\), \\(\\frac35=0.6\\)'], ['Order them', '\\(0.6,\\ 0.61,\\ 0.62,\\ 0.625,\\ 0.666\\ldots\\)']],
   final: '\\(\\frac35,\\ 61\\%,\\ 0.62,\\ \\frac58,\\ \\frac23\\)'},
  {topic: FDP, marks: 2, parts: [{html: `(a) Write ${frac('7', '40')} as a decimal.`, marks: 1}, {html: `(b) Write ${frac('7', '40')} as a percentage.`, marks: 1, unit: '%'}],
   text: '(a) Write 7/40 as a decimal. (b) Write 7/40 as a percentage.',
   steps: [['(a) Divide', '\\[\n7\\div40=0.175\n\\]'], ['(b) Multiply by 100', '\\[\n0.175\\times100=17.5\\%\n\\]']],
   final: '(a) \\(0.175\\) (b) \\(17.5\\%\\)'},
  {topic: FDP, marks: 3, parts: [{html: `The students in a class travel to school by walking, by bicycle or by bus.<br>${frac('3', '8')} of the students walk. &nbsp; 0.35 of the students cycle. &nbsp; The rest travel by bus.<br><br>11 students travel by bus.<br><br>Work out the number of students in the class.`, marks: 3}],
   text: '3/8 of the students in a class walk, 0.35 cycle and the rest travel by bus. 11 students travel by bus. Work out the number of students in the class.',
   steps: [['Proportion that walk or cycle', '\\[\n\\frac38+0.35=0.375+0.35=0.725\n\\]'], ['Proportion that travel by bus', '\\[\n1-0.725=0.275\n\\]'], ['Number of students', '\\[\n0.275\\times n=11 \\;\\Rightarrow\\; n=\\frac{11}{0.275}=40\n\\]']],
   final: '\\(40\\)'},
  {topic: FDP, marks: 2, parts: [{html: `Which is larger, ${frac('13', '20')} or 0.66?<br>You must show your working.`, marks: 2}],
   text: 'Which is larger, 13/20 or 0.66? You must show your working.',
   steps: [['Write both as decimals', '\\[\n\\frac{13}{20}=13\\div20=0.65\n\\]'], ['Compare', '\\(0.66>0.65\\), so \\(0.66\\) is larger.']],
   final: '\\(0.66\\)'},
  {topic: FDP, marks: 2, parts: [{html: 'Mia took two tests.<br>She scored 34 out of 40 in the first test.<br>She scored 87% in the second test.<br><br>In which test did Mia get the better score? You must show how you get your answer.', marks: 2}],
   text: 'Mia scored 34 out of 40 in the first test and 87% in the second test. In which test did she get the better score? Show how you get your answer.',
   steps: [['Change the first score to a percentage', '\\[\n\\frac{34}{40}\\times100=85\\%\n\\]'], ['Compare', '\\(87\\%>85\\%\\), so the second test was better.']],
   final: 'The second test (\\(85\\%\\) against \\(87\\%\\))'},
  {topic: FDP, marks: 2, parts: [{html: 'Write 0.0375 as a fraction in its simplest form.', marks: 2}],
   text: 'Write 0.0375 as a fraction in its simplest form.',
   steps: [['Write over a power of 10', '\\[\n0.0375=\\frac{375}{10\\,000}\n\\]'], ['Simplify (divide by 125)', '\\[\n\\frac{375}{10\\,000}=\\frac{3}{80}\n\\]']],
   final: '\\(\\dfrac{3}{80}\\)'},
  {topic: FDP, marks: 3, parts: [{html: `A water tank is ${frac('2', '5')} full.<br>120 litres of water are added to the tank.<br>The tank is now 65% full.<br><br>Work out the capacity of the tank.`, marks: 3, unit: 'litres'}],
   text: 'A water tank is 2/5 full. 120 litres of water are added and the tank is now 65% full. Work out the capacity of the tank.',
   steps: [['Change both amounts to percentages', '\\(\\frac25=40\\%\\), so the \\(120\\) litres fill \\(65\\%-40\\%=25\\%\\) of the tank.'], ['Find 100%', '\\[\n25\\%\\to120 \\;\\Rightarrow\\; 100\\%\\to120\\times4=480\\text{ litres}\n\\]']],
   final: '\\(480\\) litres'},

  // ---------------- Algebra Toolkit ----------------
  {topic: ALG, marks: 2, parts: [{html: '(a) Simplify 5<i>a</i> + 3<i>b</i> &minus; 2<i>a</i> + 7<i>b</i>', marks: 1}, {html: '(b) Simplify 4<i>x</i> &times; 3<i>y</i>', marks: 1}],
   text: '(a) Simplify 5a + 3b - 2a + 7b. (b) Simplify 4x x 3y.',
   steps: [['(a) Collect like terms', '\\[\n5a-2a=3a,\\qquad 3b+7b=10b \\;\\Rightarrow\\; 3a+10b\n\\]'], ['(b) Multiply the numbers, then the letters', '\\[\n4\\times3=12 \\;\\Rightarrow\\; 12xy\n\\]']],
   final: '(a) \\(3a+10b\\) (b) \\(12xy\\)'},
  {topic: ALG, marks: 2, parts: [{html: 'Work out the value of 3<i>p</i><sup>2</sup> &minus; 2<i>q</i> when <i>p</i> = &minus;4 and <i>q</i> = 5', marks: 2}],
   text: 'Work out the value of 3p^2 - 2q when p = -4 and q = 5.',
   steps: [['Substitute, with brackets round the negative', '\\[\n3(-4)^2-2(5)=3\\times16-10\n\\]'], ['Work it out', '\\[\n48-10=38\n\\]']],
   final: '\\(38\\)'},
  {topic: ALG, marks: 2, parts: [{html: '<i>v</i> = <i>u</i> + <i>at</i><br><br>Work out the value of <i>v</i> when <i>u</i> = 12, <i>a</i> = &minus;3.5 and <i>t</i> = 6', marks: 2, answer: '<i>v</i> = '}],
   text: 'v = u + at. Work out the value of v when u = 12, a = -3.5 and t = 6.',
   steps: [['Substitute', '\\[\nv=12+(-3.5)\\times6\n\\]'], ['Work it out', '\\[\nv=12-21=-9\n\\]']],
   final: '\\(v=-9\\)'},
  {topic: ALG, marks: 2, parts: [{html: 'Pens cost 35p each. Pencils cost 18p each.<br><br>Write down an expression, in terms of <i>x</i> and <i>y</i>, for the total cost, in pence, of <i>x</i> pens and <i>y</i> pencils.', marks: 2}],
   text: 'Pens cost 35p each and pencils cost 18p each. Write an expression in terms of x and y for the total cost in pence of x pens and y pencils.',
   steps: [['Cost of each item × number bought', '\\(x\\) pens cost \\(35x\\) pence; \\(y\\) pencils cost \\(18y\\) pence.'], ['Add', '\\(35x+18y\\)']],
   final: '\\(35x+18y\\)'},
  {topic: ALG, marks: 2, parts: [{html: `<i>T</i> = ${frac('<i>a</i><sup>2</sup> + <i>b</i>', '2<i>c</i>')}<br><br>Work out the value of <i>T</i> when <i>a</i> = &minus;3, <i>b</i> = 7 and <i>c</i> = 0.5`, marks: 2, answer: '<i>T</i> = '}],
   text: 'T = (a^2 + b) / 2c. Work out T when a = -3, b = 7 and c = 0.5.',
   steps: [['Substitute', '\\[\nT=\\frac{(-3)^2+7}{2\\times0.5}=\\frac{9+7}{1}\n\\]'], ['Work it out', '\\(T=16\\)']],
   final: '\\(T=16\\)'},
  {topic: ALG, marks: 2, parts: [{html: 'Simplify 6<i>x</i><sup>2</sup><i>y</i> &minus; 2<i>xy</i><sup>2</sup> + 3<i>x</i><sup>2</sup><i>y</i> + 5<i>xy</i><sup>2</sup>', marks: 2}],
   text: 'Simplify 6x^2y - 2xy^2 + 3x^2y + 5xy^2.',
   steps: [['Like terms have exactly the same letters and powers', '\\(x^2y\\) terms: \\(6+3=9\\). \\(xy^2\\) terms: \\(-2+5=3\\).'], ['Write the answer', '\\(9x^2y+3xy^2\\)']],
   final: '\\(9x^2y+3xy^2\\)'},
  {topic: ALG, marks: 2, parts: [{html: 'A rectangle has length (3<i>x</i> + 2) cm and width (<i>x</i> &minus; 1) cm.<br><br>Show that the perimeter, in cm, of the rectangle is 8<i>x</i> + 2', marks: 2, answer: ' '}],
   text: 'A rectangle has length (3x + 2) cm and width (x - 1) cm. Show that the perimeter of the rectangle is 8x + 2.',
   steps: [['Perimeter = 2 lengths + 2 widths', '\\[\n2(3x+2)+2(x-1)\n\\]'], ['Expand and collect', '\\[\n6x+4+2x-2=8x+2\n\\]']],
   final: 'Shown: \\(8x+2\\)'},
  {topic: ALG, marks: 2, parts: [{html: 'Here are five expressions.<br><br>&nbsp;&nbsp;&nbsp;&nbsp;3<i>n</i> &nbsp;&nbsp;&nbsp;&nbsp; <i>n</i> + 3 &nbsp;&nbsp;&nbsp;&nbsp; <i>n</i><sup>3</sup> &nbsp;&nbsp;&nbsp;&nbsp; 3<i>n</i><sup>2</sup> &nbsp;&nbsp;&nbsp;&nbsp; &minus;<i>n</i><br><br>When <i>n</i> = &minus;2, which expression has the greatest value?<br>You must show your working.', marks: 2}],
   text: 'Here are five expressions: 3n, n + 3, n^3, 3n^2, -n. When n = -2, which expression has the greatest value? Show your working.',
   steps: [['Substitute n = −2 into each expression', '\\[\n3n=-6,\\quad n+3=1,\\quad n^3=-8,\\quad 3n^2=3\\times4=12,\\quad -n=2\n\\]'], ['Pick the greatest', '\\(3n^2=12\\) is the greatest.']],
   final: '\\(3n^2\\) (value \\(12\\))'},

  // ---------------- Quadratic Formula ----------------
  {topic: QF, marks: 3, parts: [{html: 'Solve 2<i>x</i><sup>2</sup> &minus; 5<i>x</i> &minus; 4 = 0<br><br>Show your working clearly.<br>Give your solutions correct to 3 significant figures.', marks: 3}],
   text: 'Solve 2x^2 - 5x - 4 = 0. Show your working clearly. Give your solutions correct to 3 significant figures.',
   steps: [['Identify a, b and c', '\\(a=2,\\ b=-5,\\ c=-4\\)'], ['Substitute into the formula', '\\[\nx=\\frac{-(-5)\\pm\\sqrt{(-5)^2-4(2)(-4)}}{2(2)}=\\frac{5\\pm\\sqrt{57}}{4}\n\\]'], ['Work out both solutions', '\\[\nx=\\frac{5+7.5498\\ldots}{4}=3.14,\\qquad x=\\frac{5-7.5498\\ldots}{4}=-0.637\n\\]']],
   final: '\\(x=3.14\\) or \\(x=-0.637\\)'},
  {topic: QF, marks: 3, parts: [{html: 'Solve <i>x</i><sup>2</sup> + 6<i>x</i> + 2 = 0<br><br>Give your solutions in the form <i>a</i> &plusmn; &radic;<i>b</i> where <i>a</i> and <i>b</i> are integers.', marks: 3}],
   text: 'Solve x^2 + 6x + 2 = 0. Give your solutions in the form a ± sqrt b where a and b are integers.',
   steps: [['Use the formula', '\\[\nx=\\frac{-6\\pm\\sqrt{36-8}}{2}=\\frac{-6\\pm\\sqrt{28}}{2}\n\\]'], ['Simplify the surd', '\\(\\sqrt{28}=2\\sqrt7\\), so\n\n\\[\nx=\\frac{-6\\pm2\\sqrt7}{2}=-3\\pm\\sqrt7\n\\]']],
   final: '\\(x=-3\\pm\\sqrt7\\)'},
  {topic: QF, marks: 5, parts: [{html: 'A rectangle has length (<i>x</i> + 3) cm and width (<i>x</i> &minus; 1) cm.<br>The area of the rectangle is 20 cm<sup>2</sup>.<br><br>(a) Show that <i>x</i><sup>2</sup> + 2<i>x</i> &minus; 23 = 0', marks: 2, answer: ' '}, {html: '(b) Work out the length of the rectangle.<br>Give your answer correct to 3 significant figures.', marks: 3, unit: 'cm'}],
   text: 'A rectangle has length (x + 3) cm, width (x - 1) cm and area 20 cm^2. (a) Show that x^2 + 2x - 23 = 0. (b) Work out the length of the rectangle, correct to 3 significant figures.',
   steps: [['(a) Area = length × width', '\\[\n(x+3)(x-1)=20 \\;\\Rightarrow\\; x^2+2x-3=20 \\;\\Rightarrow\\; x^2+2x-23=0\n\\]'], ['(b) Use the formula', '\\[\nx=\\frac{-2\\pm\\sqrt{4+92}}{2}=\\frac{-2\\pm\\sqrt{96}}{2}=-1\\pm\\sqrt{24}\n\\]\n\nThe width \\(x-1\\) must be positive, so \\(x=-1+\\sqrt{24}=3.898\\ldots\\)'], ['(b) Length', '\\[\nx+3=6.898\\ldots\\approx6.90\\text{ cm}\n\\]']],
   final: '(b) \\(6.90\\) cm'},

  // ---------------- Powers & Roots ----------------
  {topic: PR, marks: 3, parts: [{html: 'Find the value of<br><br>(a) 5<sup>0</sup>', marks: 1}, {html: '(b) 8<sup>2/3</sup>', marks: 1}, {html: '(c) 16<sup>&minus;1/2</sup>', marks: 1}],
   text: 'Find the value of (a) 5^0 (b) 8^(2/3) (c) 16^(-1/2).',
   steps: [['(a) Any non-zero number to the power 0', '\\(5^0=1\\)'], ['(b) Root first, then power', '\\[\n8^{2/3}=\\left(\\sqrt[3]{8}\\right)^2=2^2=4\n\\]'], ['(c) Negative power means reciprocal', '\\[\n16^{-1/2}=\\frac{1}{\\sqrt{16}}=\\frac14\n\\]']],
   final: '(a) \\(1\\) (b) \\(4\\) (c) \\(\\frac14\\)'},
  {topic: PR, marks: 2, parts: [{html: `Write ${frac('3<sup>5</sup> &times; 3<sup>&minus;2</sup>', '3<sup>4</sup>')} as a single power of 3`, marks: 2}],
   text: 'Write (3^5 x 3^-2) / 3^4 as a single power of 3.',
   steps: [['Multiply: add the powers', '\\(3^5\\times3^{-2}=3^{3}\\)'], ['Divide: subtract the powers', '\\[\n\\frac{3^3}{3^4}=3^{-1}\n\\]']],
   final: '\\(3^{-1}\\)'},
  {topic: PR, marks: 3, parts: [{html: '2<sup><i>n</i></sup> = 8<sup>4</sup> &divide; 4<sup>3</sup><br><br>Find the value of <i>n</i>.', marks: 3, answer: '<i>n</i> = '}],
   text: '2^n = 8^4 ÷ 4^3. Find the value of n.',
   steps: [['Write everything as a power of 2', '\\(8=2^3\\), so \\(8^4=2^{12}\\). \\(4=2^2\\), so \\(4^3=2^{6}\\).'], ['Divide', '\\[\n\\frac{2^{12}}{2^{6}}=2^{6} \\;\\Rightarrow\\; n=6\n\\]']],
   final: '\\(n=6\\)'},

  // ---------------- Number Toolkit ----------------
  {topic: NT, marks: 3, parts: [{html: 'Here is a list of numbers.<br><br>&nbsp;&nbsp;&nbsp;&nbsp;2 &nbsp;&nbsp;&nbsp; 9 &nbsp;&nbsp;&nbsp; 15 &nbsp;&nbsp;&nbsp; 17 &nbsp;&nbsp;&nbsp; 21 &nbsp;&nbsp;&nbsp; 25 &nbsp;&nbsp;&nbsp; 27<br><br>From the list, write down<br><br>(a) the two prime numbers,', marks: 1}, {html: '(b) a square number that is also odd and greater than 10,', marks: 1}, {html: '(c) a cube number.', marks: 1}],
   text: 'Here is a list of numbers: 2, 9, 15, 17, 21, 25, 27. Write down (a) the two prime numbers (b) a square number that is odd and greater than 10 (c) a cube number.',
   steps: [['(a) Exactly two factors', '\\(2\\) and \\(17\\) are prime (\\(15=3\\times5\\), \\(21=3\\times7\\)).'], ['(b) Square numbers in the list', '\\(9=3^2\\) and \\(25=5^2\\); the odd one greater than \\(10\\) is \\(25\\).'], ['(c) Cube numbers', '\\(27=3^3\\)']],
   final: '(a) \\(2, 17\\) (b) \\(25\\) (c) \\(27\\)'},
  {topic: NT, marks: 2, parts: [{html: 'Use the information that 23 &times; 47 = 1081 to write down the value of<br><br>(a) 2.3 &times; 4.7', marks: 1}, {html: '(b) 1081 &divide; 4.7', marks: 1}],
   text: 'Use the information that 23 x 47 = 1081 to write down the value of (a) 2.3 x 4.7 (b) 1081 ÷ 4.7.',
   steps: [['(a) Each number is ten times smaller', '\\(2.3\\times4.7=1081\\div100=10.81\\)'], ['(b) Reverse the multiplication', '\\(1081\\div47=23\\), and \\(4.7\\) is ten times smaller than \\(47\\), so \\(1081\\div4.7=230\\).']],
   final: '(a) \\(10.81\\) (b) \\(230\\)'},
];
module.exports.line = line;
