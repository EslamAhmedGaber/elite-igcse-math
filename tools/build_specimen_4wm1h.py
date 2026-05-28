"""
Build the scanned Specimen 4WM1H paper assets, metadata, and solutions.

The specimen PDF is image-only, so this script keeps the manual crop map and
structured solution data in one repeatable place.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import fitz
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
QP_PATH = ROOT / "tools" / "inbox" / "Specimen_4WM1H_QP.pdf"
MS_PATH = ROOT / "tools" / "inbox" / "Specimen_4WM1H_MS.pdf"
QUESTION_DIR = ROOT / "assets" / "questions"
DATA_QUESTIONS = ROOT / "src" / "data" / "questions"
DATA_SOLUTIONS = ROOT / "src" / "data" / "solutions"
TOPICS_PATH = ROOT / "src" / "data" / "topics.json"
REVIEW_DIR = ROOT / "tools" / "_specimen_4wm1h_review"

PAPER = "Specimen 4WM1H"
PAPER_SLUG = "Specimen_4WM1H"
SESSION = "Specimen"
CODE = "4WM1H"
MODULAR_UNIT = "Unit 1"

REVIEW_ZOOM = 1.5
RENDER_ZOOM = 2.0
DEFAULT_X0 = 90
DEFAULT_X1 = 835


def step(title: str, body: str) -> dict[str, str]:
    return {"title": title, "body": body.strip()}


QUESTIONS: list[dict[str, Any]] = [
    {
        "q": 1,
        "marks": 1,
        "topic": "Rounding, Estimation & Bounds",
        "crops": [(3, 80, 360)],
        "text": "1 The weight of a cake is 2.75 kg, correct to 2 decimal places. Write down the lower bound of the weight of the cake. (Total for Question 1 is 1 mark)",
        "topic_note": "Bounds question using rounding to 2 decimal places.",
        "solution": [
            step(
                "Find half the rounding interval",
                r"""Correct to \(2\) decimal places means the nearest \(0.01\) kg.

\[
\frac{0.01}{2}=0.005
\]""",
            ),
            step(
                "Subtract from the rounded value",
                r"""\[
2.75-0.005=2.745
\]""",
            ),
        ],
        "final": r"\(2.745\text{ kg}\).",
    },
    {
        "q": 2,
        "marks": 3,
        "topic": "Fractions",
        "crops": [(3, 355, 870)],
        "text": "2 Show that 5 1/3 - 2 6/7 = 2 10/21. (Total for Question 2 is 3 marks)",
        "topic_note": "Mixed-number subtraction with a common denominator.",
        "solution": [
            step(
                "Convert to improper fractions",
                r"""\[
5\frac13=\frac{16}{3},\qquad 2\frac67=\frac{20}{7}
\]""",
            ),
            step(
                "Use a common denominator",
                r"""\[
\frac{16}{3}-\frac{20}{7}
=\frac{112}{21}-\frac{60}{21}
=\frac{52}{21}
\]""",
            ),
            step(
                "Convert back to a mixed number",
                r"""\[
\frac{52}{21}=2\frac{10}{21}
\]""",
            ),
        ],
        "final": r"\(2\frac{10}{21}\).",
    },
    {
        "q": 3,
        "marks": 4,
        "topic": "Probability Toolkit",
        "crops": [(4, 80, 1045)],
        "text": "3 A biased 4-sided spinner has probabilities 0.26 for 1 and 0.18 for 3. The probabilities of 2 and 4 are equal. Priya spins the spinner 250 times. Estimate the number of times it will land on 1 or 2. (Total for Question 3 is 4 marks)",
        "topic_note": "Probability total and expected frequency.",
        "solution": [
            step(
                "Find the remaining probability",
                r"""\[
1-0.26-0.18=0.56
\]""",
            ),
            step(
                "Split the equal probabilities",
                r"""The probabilities for \(2\) and \(4\) are equal, so

\[
P(2)=P(4)=\frac{0.56}{2}=0.28
\]""",
            ),
            step(
                "Find the probability of 1 or 2",
                r"""\[
P(1\text{ or }2)=0.26+0.28=0.54
\]""",
            ),
            step(
                "Calculate the estimate",
                r"""\[
0.54\times 250=135
\]""",
            ),
        ],
        "final": r"\(135\).",
    },
    {
        "q": 4,
        "marks": 5,
        "topic": "Solving Linear Equations",
        "crops": [(5, 80, 1045)],
        "text": "4 (a) Expand and simplify (n - 6)(n + 4). (b) Solve 2x - 3 = (3x - 5)/4. (Total for Question 4 is 5 marks)",
        "topic_note": "Expanding brackets followed by a linear equation.",
        "solution": [
            step(
                "Expand the brackets",
                r"""\[
(n-6)(n+4)=n^2+4n-6n-24
\]

\[
=n^2-2n-24
\]""",
            ),
            step(
                "Clear the denominator",
                r"""\[
2x-3=\frac{3x-5}{4}
\]

\[
4(2x-3)=3x-5
\]""",
            ),
            step(
                "Solve the equation",
                r"""\[
8x-12=3x-5
\]

\[
5x=7
\]

\[
x=\frac75
\]""",
            ),
        ],
        "final": r"\(n^2-2n-24\), and \(x=\frac75\).",
    },
    {
        "q": 5,
        "marks": 3,
        "topic": "Standard & Compound Units",
        "crops": [(6, 80, 575)],
        "text": "5 A plane flies 3980 kilometres in 5 hours 24 minutes. Work out the average speed in kilometres per hour, correct to the nearest whole number. (Total for Question 5 is 3 marks)",
        "topic_note": "Speed calculation with time conversion.",
        "solution": [
            step(
                "Convert the time",
                r"""\[
24\text{ minutes}=\frac{24}{60}=0.4\text{ hours}
\]

\[
5\text{ hours }24\text{ minutes}=5.4\text{ hours}
\]""",
            ),
            step(
                "Calculate the speed",
                r"""\[
\text{speed}=\frac{3980}{5.4}=737.037\ldots
\]""",
            ),
            step(
                "Round the answer",
                r"""\[
737.037\ldots \approx 737
\]""",
            ),
        ],
        "final": r"\(737\text{ kilometres per hour}\).",
    },
    {
        "q": 6,
        "marks": 4,
        "topic": "Area & Perimeter",
        "crops": [(7, 80, 1050)],
        "text": "6 An 8-sided shape ABCDEFGH has HG = 28 cm, AH = FG = 12 cm, AB = EF = 5 cm, height 20 cm and CD parallel to HG. The area is 434 cm^2. Find CD. (Total for Question 6 is 4 marks)",
        "topic_note": "Compound area split into a rectangle and trapezium.",
        "solution": [
            step(
                "Find the rectangular part",
                r"""The rectangle at the bottom has width \(28\) cm and height \(12\) cm.

\[
28\times 12=336
\]""",
            ),
            step(
                "Find the top area",
                r"""\[
434-336=98
\]""",
            ),
            step(
                "Set up the trapezium",
                r"""The top trapezium has height

\[
20-12=8
\]

Its lower parallel side is

\[
28-5-5=18
\]""",
            ),
            step(
                "Solve for the missing length",
                r"""Let \(CD=x\).

\[
\frac12(x+18)\times 8=98
\]

\[
4(x+18)=98
\]

\[
x=6.5
\]""",
            ),
        ],
        "final": r"\(CD=6.5\text{ cm}\).",
    },
    {
        "q": 7,
        "marks": 4,
        "topic": "Algebraic Roots & Indices",
        "crops": [(8, 80, 605)],
        "text": "7 (a) Simplify 8 x (4t)^0. (b) x^6 divided by x^-5 = x^p. Find p. (c) Simplify fully (2k^2m^4)^3. (Total for Question 7 is 4 marks)",
        "topic_note": "Index laws, including zero and negative powers.",
        "solution": [
            step(
                "Use the zero power",
                r"""\[
(4t)^0=1
\]

\[
8(4t)^0=8
\]""",
            ),
            step(
                "Subtract the indices",
                r"""\[
x^6\div x^{-5}=x^{6-(-5)}=x^{11}
\]

So \(p=11\).""",
            ),
            step(
                "Raise each factor to the power",
                r"""\[
(2k^2m^4)^3=2^3k^{2\times 3}m^{4\times 3}
\]

\[
=8k^6m^{12}
\]""",
            ),
        ],
        "final": r"\(8\), \(p=11\), and \(8k^6m^{12}\).",
    },
    {
        "q": 8,
        "marks": 3,
        "topic": "Standard & Compound Units",
        "crops": [(8, 605, 1045)],
        "text": "8 Change a speed of 81 kilometres per hour to a speed in metres per second. (Total for Question 8 is 3 marks)",
        "topic_note": "Compound unit conversion from km/h to m/s.",
        "solution": [
            step(
                "Convert kilometres to metres",
                r"""\[
81\text{ km}=81000\text{ m}
\]""",
            ),
            step(
                "Convert hours to seconds",
                r"""\[
1\text{ hour}=3600\text{ seconds}
\]""",
            ),
            step(
                "Divide to find metres per second",
                r"""\[
\frac{81000}{3600}=22.5
\]""",
            ),
        ],
        "final": r"\(22.5\text{ metres per second}\).",
    },
    {
        "q": 9,
        "marks": 7,
        "topic": "Linear Graphs (y = mx + c)",
        "crops": [(9, 80, 1045)],
        "text": "9 (a) Simplify 3a^4b^5 x 4a^7b^2. (b) Factorise fully 14x^2y^4 + 21x^3y^2. (c) Find an equation of the line drawn on the grid. (d) For y = 3x - 5, write the y-axis crossing point. (Total for Question 9 is 7 marks)",
        "topic_note": "Mixed algebra and straight-line graph question; classified under the graph equation part.",
        "solution": [
            step(
                "Simplify the product",
                r"""\[
3a^4b^5\times 4a^7b^2=12a^{11}b^7
\]""",
            ),
            step(
                "Factorise fully",
                r"""\[
14x^2y^4+21x^3y^2=7x^2y^2(2y^2+3x)
\]""",
            ),
            step(
                "Find the gradient",
                r"""The line passes through \((0,4)\) and \((2,0)\).

\[
m=\frac{0-4}{2-0}=-2
\]""",
            ),
            step(
                "Write the equation",
                r"""The \(y\)-intercept is \(4\), so

\[
y=-2x+4
\]""",
            ),
            step(
                "Read the y-axis crossing",
                r"""For \(y=3x-5\), put \(x=0\):

\[
y=-5
\]

So the crossing point is \((0,-5)\).""",
            ),
        ],
        "final": r"\(12a^{11}b^7\), \(7x^2y^2(2y^2+3x)\), \(y=-2x+4\), and \((0,-5)\).",
    },
    {
        "q": 10,
        "marks": 6,
        "topic": "Right-Angled Triangles - Pythagoras & Trigonometry",
        "crops": [(10, 80, 1110), (11, 40, 620)],
        "text": "10 In quadrilateral ABCD, triangles ABC and DAC are right-angled. BC = 6 cm, AC = 7.5 cm and the area of ABCD is 31.5 cm^2. Work out AB and AD. (Total for Question 10 is 6 marks)",
        "topic_note": "Pythagoras and area of right-angled triangles.",
        "solution": [
            step(
                "Use Pythagoras for AB",
                r"""In triangle \(ABC\),

\[
AB^2+6^2=7.5^2
\]

\[
AB^2=56.25-36=20.25
\]

\[
AB=4.5
\]""",
            ),
            step(
                "Find the area of triangle ABC",
                r"""\[
\frac12\times 6\times 4.5=13.5
\]""",
            ),
            step(
                "Find the area of triangle DAC",
                r"""\[
31.5-13.5=18
\]""",
            ),
            step(
                "Use the triangle area formula",
                r"""In triangle \(DAC\), \(AD\) and \(AC\) are perpendicular.

\[
\frac12\times AD\times 7.5=18
\]

\[
AD=\frac{36}{7.5}=4.8
\]""",
            ),
        ],
        "final": r"\(AB=4.5\text{ cm}\), \(AD=4.8\text{ cm}\).",
    },
    {
        "q": 11,
        "marks": 6,
        "topic": "Probability Diagrams - Venn & Tree Diagrams",
        "crops": [(12, 80, 1110), (13, 40, 620)],
        "text": "11 A bag has 11 beads: 4 red and 7 blue. Tess takes two beads without replacement. Complete the tree diagram, find the probability both are red, and the probability the two beads are different colours. (Total for Question 11 is 6 marks)",
        "topic_note": "Tree diagram probability without replacement.",
        "solution": [
            step(
                "Complete the blue-first branch",
                r"""After a blue bead is taken first, there are \(4\) red and \(6\) blue beads left out of \(10\).

\[
P(\text{red second after blue})=\frac4{10},\qquad
P(\text{blue second after blue})=\frac6{10}
\]""",
            ),
            step(
                "Find both red",
                r"""\[
P(RR)=\frac4{11}\times\frac3{10}
=\frac{12}{110}
=\frac6{55}
\]""",
            ),
            step(
                "Find different colours",
                r"""\[
P(RB)=\frac4{11}\times\frac7{10}
\]

\[
P(BR)=\frac7{11}\times\frac4{10}
\]

\[
P(\text{different})=\frac{28}{110}+\frac{28}{110}
=\frac{28}{55}
\]""",
            ),
        ],
        "final": r"Missing probabilities \(\frac4{10}\) and \(\frac6{10}\); \(P(RR)=\frac6{55}\); \(P(\text{different})=\frac{28}{55}\).",
    },
    {
        "q": 12,
        "marks": 5,
        "topic": "Algebraic Fractions",
        "crops": [(14, 80, 830)],
        "text": "12 (a) Factorise 9x^2 - 4y^2. (b) Express 7/8 - (x + 3)/(4x) as a single fraction in its simplest form. (Total for Question 12 is 5 marks)",
        "topic_note": "Difference of two squares and simplifying an algebraic fraction.",
        "solution": [
            step(
                "Use difference of two squares",
                r"""\[
9x^2-4y^2=(3x)^2-(2y)^2
\]

\[
=(3x-2y)(3x+2y)
\]""",
            ),
            step(
                "Use a common denominator",
                r"""\[
\frac78-\frac{x+3}{4x}
=\frac{7x}{8x}-\frac{2(x+3)}{8x}
\]""",
            ),
            step(
                "Simplify the numerator",
                r"""\[
\frac{7x-2x-6}{8x}
=\frac{5x-6}{8x}
\]""",
            ),
        ],
        "final": r"\((3x-2y)(3x+2y)\), and \(\frac{5x-6}{8x}\).",
    },
    {
        "q": 13,
        "marks": 6,
        "topic": "Algebraic Roots & Indices",
        "crops": [(15, 80, 1000)],
        "text": "13 (a) Expand and simplify (3x - 1)(x + 2)(3x + 1). (b) Simplify fully ((2x^5)/(8xy^2))^-2. (Total for Question 13 is 6 marks)",
        "topic_note": "Bracket expansion and negative-index simplification.",
        "solution": [
            step(
                "Multiply the conjugate factors",
                r"""\[
(3x-1)(3x+1)=9x^2-1
\]""",
            ),
            step(
                "Expand the remaining bracket",
                r"""\[
(9x^2-1)(x+2)=9x^3+18x^2-x-2
\]""",
            ),
            step(
                "Simplify inside the bracket",
                r"""\[
\frac{2x^5}{8xy^2}=\frac{x^4}{4y^2}
\]""",
            ),
            step(
                "Apply the negative power",
                r"""\[
\left(\frac{x^4}{4y^2}\right)^{-2}
=\left(\frac{4y^2}{x^4}\right)^2
=\frac{16y^4}{x^8}
\]""",
            ),
        ],
        "final": r"\(9x^3+18x^2-x-2\), and \(\frac{16y^4}{x^8}\).",
    },
    {
        "q": 14,
        "marks": 8,
        "topic": "Set Notation & Venn Diagrams",
        "crops": [(16, 80, 1110), (17, 40, 970)],
        "text": "14 100 farmers are asked if they have goats, sheep or chickens. Complete the Venn diagram, find n(G), n((G union S)'), n(G' intersect C), and the probability a farmer with chickens also has goats. (Total for Question 14 is 8 marks)",
        "topic_note": "Three-set Venn diagram with conditional probability.",
        "solution": [
            step(
                "Place the centre value",
                r"""The number with goats, sheep and chickens is \(6\).""",
            ),
            step(
                "Fill the pair-only regions",
                r"""\[
G\cap S\text{ only}=11-6=5
\]

\[
S\cap C\text{ only}=17-6=11
\]

\[
G\cap C\text{ only}=18-6=12
\]""",
            ),
            step(
                "Fill the single-set regions",
                r"""\[
S\text{ only}=31-5-11-6=9
\]

\[
C\text{ only}=53-11-12-6=24
\]

Since \(20\) have none, the total inside the circles is \(80\).

\[
G\text{ only}=80-(5+11+12+6+9+24)=13
\]""",
            ),
            step(
                "Read the set values",
                r"""\[
n(G)=13+5+12+6=36
\]

\[
n((G\cup S)')=24+20=44
\]

\[
n(G'\cap C)=24+11=35
\]""",
            ),
            step(
                "Find the conditional probability",
                r"""Out of the \(53\) farmers with chickens, \(18\) also have goats.

\[
P(G\mid C)=\frac{18}{53}
\]""",
            ),
        ],
        "final": r"Venn regions: \(G\) only \(13\), \(S\) only \(9\), \(C\) only \(24\), \(G\cap S\) only \(5\), \(S\cap C\) only \(11\), \(G\cap C\) only \(12\), all three \(6\), none \(20\). Also \(36\), \(44\), \(35\), and \(\frac{18}{53}\).",
    },
    {
        "q": 15,
        "marks": 4,
        "topic": "Rounding, Estimation & Bounds",
        "crops": [(18, 80, 1080)],
        "text": "15 Martin and Lucia compare possible average speeds using bounds. Show that Martin's average speed could have been greater than Lucia's average speed. (Total for Question 15 is 4 marks)",
        "topic_note": "Bounds comparison for speed.",
        "solution": [
            step(
                "Use Martin's greatest possible speed",
                r"""Martin's greatest possible distance is \(82.5\) km and his least possible time is \(2.65\) hours.

\[
\frac{82.5}{2.65}=31.132\ldots
\]""",
            ),
            step(
                "Use Lucia's least possible speed",
                r"""Lucia's least possible distance is \(32.5\) km and her greatest possible time is \(1.05\) hours.

\[
\frac{32.5}{1.05}=30.952\ldots
\]""",
            ),
            step(
                "Compare the possible speeds",
                r"""\[
31.132\ldots > 30.952\ldots
\]

So Martin's speed could have been greater than Lucia's speed.""",
            ),
        ],
        "final": r"Martin could have been faster because \(31.132\ldots>30.952\ldots\text{ km/h}\).",
    },
    {
        "q": 16,
        "marks": 3,
        "topic": "Histograms",
        "crops": [(19, 80, 1110)],
        "text": "16 A histogram shows total walking time m minutes. There are no children with m > 100 and 10 children with m <= 20. Estimate the number of children for 50 < m <= 80. (Total for Question 16 is 3 marks)",
        "topic_note": "Histogram frequency-density scale and partial bar areas.",
        "solution": [
            step(
                "Set the frequency-density scale",
                r"""For \(0<m\le 20\), the frequency is \(10\), so

\[
\text{frequency density}=\frac{10}{20}=0.5
\]""",
            ),
            step(
                "Read the needed bar heights",
                r"""Using the same scale from the histogram:

\[
50<m\le 60:\ 10\times 2.9=29
\]

\[
60<m\le 75:\ 15\times 3.2=48
\]

\[
75<m\le 80:\ 5\times 2=10
\]""",
            ),
            step(
                "Add the estimates",
                r"""\[
19+36+32=87
\]""",
            ),
        ],
        "final": r"\(87\).",
    },
    {
        "q": 17,
        "marks": 4,
        "topic": "Surds",
        "crops": [(20, 80, 650)],
        "text": "17 Express (3 + sqrt(8))/(sqrt(2) - 1)^2 in the form p + sqrt(q), where p and q are integers. (Total for Question 17 is 4 marks)",
        "topic_note": "Surd simplification by rationalising.",
        "solution": [
            step(
                "Simplify the surds",
                r"""\[
\sqrt8=2\sqrt2
\]

\[
(\sqrt2-1)^2=2-2\sqrt2+1=3-2\sqrt2
\]""",
            ),
            step(
                "Use the conjugate",
                r"""\[
\frac{3+2\sqrt2}{3-2\sqrt2}\times\frac{3+2\sqrt2}{3+2\sqrt2}
\]

The denominator is

\[
9-(2\sqrt2)^2=9-8=1
\]""",
            ),
            step(
                "Expand the numerator",
                r"""\[
(3+2\sqrt2)^2=9+12\sqrt2+8=17+12\sqrt2
\]""",
            ),
            step(
                "Write in the requested form",
                r"""\[
12\sqrt2=\sqrt{144\times 2}=\sqrt{288}
\]""",
            ),
        ],
        "final": r"\(17+\sqrt{288}\).",
    },
    {
        "q": 18,
        "marks": 4,
        "topic": "Circles, Arcs & Sectors",
        "crops": [(21, 80, 1065)],
        "text": "18 Two identical circles are inside a rectangle of length 4x and width 2x. Each circle has radius x. The shaded area inside the rectangle but outside the circles is 20 cm^2. Work out the perimeter of the rectangle, correct to 3 significant figures. (Total for Question 18 is 4 marks)",
        "topic_note": "Circle area subtracted from rectangle area.",
        "solution": [
            step(
                "Write the shaded area",
                r"""Rectangle area:

\[
4x\times 2x=8x^2
\]

Area of the two circles:

\[
2\pi x^2
\]

So

\[
8x^2-2\pi x^2=20
\]""",
            ),
            step(
                "Solve for x",
                r"""\[
x^2(8-2\pi)=20
\]

\[
x=\sqrt{\frac{20}{8-2\pi}}=3.413\ldots
\]""",
            ),
            step(
                "Find the perimeter",
                r"""\[
P=2(4x+2x)=12x
\]

\[
12(3.413\ldots)=40.96\ldots
\]""",
            ),
            step(
                "Round to 3 significant figures",
                r"""\[
40.96\ldots \approx 41.0
\]""",
            ),
        ],
        "final": r"\(41.0\text{ cm}\).",
    },
    {
        "q": 19,
        "marks": 4,
        "topic": "3D Pythagoras & Trigonometry",
        "crops": [(22, 80, 1050)],
        "text": "19 A triangular prism ABCDEF has rectangular base ABCD. AB = 6 cm, DE = 2.2 cm, angle DAE = 18 degrees and angle ADE = 90 degrees. Work out the angle BE makes with plane ABCD, correct to 1 decimal place. (Total for Question 19 is 4 marks)",
        "topic_note": "Angle between a line and a plane using a right triangle and the projection.",
        "solution": [
            step(
                "Find AD",
                r"""In triangle \(ADE\),

\[
\tan 18^\circ=\frac{DE}{AD}
\]

\[
AD=\frac{2.2}{\tan 18^\circ}=6.77\ldots
\]""",
            ),
            step(
                "Find DB in the base",
                r"""The base \(ABCD\) is a rectangle, so

\[
DB=\sqrt{6^2+6.77\ldots^2}=9.04\ldots
\]""",
            ),
            step(
                "Use the projection triangle",
                r"""The projection of \(BE\) on the plane is \(BD\). Let the required angle be \(\theta\).

\[
\tan\theta=\frac{DE}{DB}
=\frac{2.2}{9.04\ldots}
\]""",
            ),
            step(
                "Calculate the angle",
                r"""\[
\theta=13.7^\circ
\]""",
            ),
        ],
        "final": r"\(13.7^\circ\).",
    },
    {
        "q": 20,
        "marks": 4,
        "topic": "Completing the Square",
        "crops": [(23, 80, 970)],
        "text": "20 Find a, b and c so that 7 + 12x - 2x^2 is written as a - b(x - c)^2. (Total for Question 20 is 4 marks)",
        "topic_note": "Completing the square into vertex form.",
        "solution": [
            step(
                "Factor out -2 from the quadratic terms",
                r"""\[
7+12x-2x^2=-2(x^2-6x)+7
\]""",
            ),
            step(
                "Complete the square",
                r"""\[
x^2-6x=(x-3)^2-9
\]""",
            ),
            step(
                "Simplify the expression",
                r"""\[
-2((x-3)^2-9)+7
=-2(x-3)^2+18+7
\]

\[
=25-2(x-3)^2
\]""",
            ),
            step(
                "Read the values",
                r"""\[
a=25,\qquad b=2,\qquad c=3
\]""",
            ),
        ],
        "final": r"\(a=25,\ b=2,\ c=3\).",
    },
    {
        "q": 21,
        "marks": 3,
        "topic": "Algebraic Fractions",
        "crops": [(24, 80, 1055)],
        "text": "21 Express (20/(x^2 - 36) - 2/(x - 6)) x 1/(4 - x) as a single fraction in its simplest form. (Total for Question 21 is 3 marks)",
        "topic_note": "Algebraic fraction simplification with factor cancellation.",
        "solution": [
            step(
                "Factorise the denominator",
                r"""\[
x^2-36=(x-6)(x+6)
\]""",
            ),
            step(
                "Simplify the bracket",
                r"""\[
\frac{20}{(x-6)(x+6)}-\frac{2}{x-6}
=\frac{20-2(x+6)}{(x-6)(x+6)}
\]

\[
=\frac{8-2x}{(x-6)(x+6)}
=\frac{-2(x-4)}{(x-6)(x+6)}
\]""",
            ),
            step(
                "Cancel the common factor",
                r"""Since \(4-x=-(x-4)\),

\[
\frac{-2(x-4)}{(x-6)(x+6)}\times\frac{1}{4-x}
=\frac{2}{(x-6)(x+6)}
\]""",
            ),
        ],
        "final": r"\(\frac{2}{x^2-36}\).",
    },
    {
        "q": 22,
        "marks": 3,
        "topic": "Algebraic Roots & Indices",
        "crops": [(25, 80, 1055)],
        "text": "22 18 x (sqrt(27))^(4n + 6) divided by 6 x 9^(2n + 8) equals 3^x. Express x in terms of n. (Total for Question 22 is 3 marks)",
        "topic_note": "Index laws with powers of 3.",
        "solution": [
            step(
                "Write everything as powers of 3",
                r"""\[
\sqrt{27}=3^{3/2},\qquad 9=3^2,\qquad \frac{18}{6}=3
\]""",
            ),
            step(
                "Simplify the powers",
                r"""\[
\frac{18(\sqrt{27})^{4n+6}}{6(9)^{2n+8}}
=3\times \frac{\left(3^{3/2}\right)^{4n+6}}{(3^2)^{2n+8}}
\]

\[
=3^1\times \frac{3^{6n+9}}{3^{4n+16}}
\]""",
            ),
            step(
                "Subtract the indices",
                r"""\[
3^{1+6n+9-(4n+16)}=3^{2n-6}
\]

So

\[
x=2n-6
\]""",
            ),
        ],
        "final": r"\(x=2n-6\).",
    },
    {
        "q": 23,
        "marks": 6,
        "topic": "Coordinate Geometry",
        "crops": [(26, 80, 1060)],
        "text": "23 ABCD is a kite. AB = AD and CB = CD. B has coordinates (k, 1), where k is negative. D has coordinates (8, 7). Line L through B and D has gradient 3/5. Find an equation of AC in the form px + qy = r. (Total for Question 23 is 6 marks)",
        "topic_note": "Coordinate geometry using gradient, perpendicular lines and kite symmetry.",
        "solution": [
            step(
                "Find k from the gradient",
                r"""The gradient of \(BD\) is

\[
\frac{7-1}{8-k}=\frac35
\]

\[
\frac{6}{8-k}=\frac35
\]

\[
30=24-3k
\]

\[
k=-2
\]""",
            ),
            step(
                "Find the midpoint of BD",
                r"""So \(B=(-2,1)\) and \(D=(8,7)\).

\[
\text{midpoint of }BD=\left(\frac{-2+8}{2},\frac{1+7}{2}\right)=(3,4)
\]""",
            ),
            step(
                "Use the perpendicular gradient",
                r"""In this kite, \(AC\) is the perpendicular bisector of \(BD\).

The gradient of \(BD\) is \(\frac35\), so the gradient of \(AC\) is

\[
-\frac53
\]""",
            ),
            step(
                "Form the equation",
                r"""Using point \((3,4)\):

\[
y-4=-\frac53(x-3)
\]

\[
3y-12=-5x+15
\]

\[
5x+3y=27
\]""",
            ),
        ],
        "final": r"\(5x+3y=27\).",
    },
]


def hyphen(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")


def load_topics() -> list[str]:
    data = json.loads(TOPICS_PATH.read_text(encoding="utf-8"))
    return list(data["topics"])


def build_topic_unit_map() -> dict[str, str]:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for path in DATA_QUESTIONS.glob("*.json"):
        if path.name == f"{PAPER_SLUG}.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for row in data.get("questions", []):
            topic = row.get("topic")
            unit = row.get("unit")
            if topic and unit:
                counts[topic][unit] += 1
    return {topic: unit_counts.most_common(1)[0][0] for topic, unit_counts in counts.items()}


def make_filename(q: int, marks: int, topic: str, first_page: int, last_page: int) -> str:
    return f"{PAPER_SLUG}__Q{q:02d}__p{first_page:02d}-{last_page:02d}__m{marks:02d}__{hyphen(topic)}.png"


def render_page(doc: fitz.Document, page_no: int) -> Image.Image:
    page = doc.load_page(page_no - 1)
    pix = page.get_pixmap(matrix=fitz.Matrix(RENDER_ZOOM, RENDER_ZOOM), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def scale_coord(value: float) -> int:
    return int(round(value * RENDER_ZOOM / REVIEW_ZOOM))


def crop_question(doc: fitz.Document, question: dict[str, Any], out_path: Path) -> None:
    fragments: list[Image.Image] = []
    for crop in question["crops"]:
        if len(crop) == 3:
            page_no, y0, y1 = crop
            x0, x1 = DEFAULT_X0, DEFAULT_X1
        else:
            page_no, y0, y1, x0, x1 = crop
        page_image = render_page(doc, page_no)
        box = (scale_coord(x0), scale_coord(y0), scale_coord(x1), scale_coord(y1))
        fragments.append(page_image.crop(box))

    if len(fragments) == 1:
        combined = fragments[0]
    else:
        width = max(fragment.width for fragment in fragments)
        gap = scale_coord(18)
        height = sum(fragment.height for fragment in fragments) + gap * (len(fragments) - 1)
        combined = Image.new("RGB", (width, height), "white")
        y = 0
        for fragment in fragments:
            combined.paste(fragment, ((width - fragment.width) // 2, y))
            y += fragment.height + gap

    out_path.parent.mkdir(parents=True, exist_ok=True)
    combined.save(out_path, optimize=True)


def build_contact_sheet(image_paths: list[Path]) -> Path:
    thumb_width = 250
    label_height = 28
    gap = 18
    cols = 4
    thumbs: list[tuple[Path, Image.Image]] = []
    for path in image_paths:
        im = Image.open(path).convert("RGB")
        ratio = thumb_width / im.width
        thumb = im.resize((thumb_width, max(1, int(im.height * ratio))), Image.Resampling.LANCZOS)
        thumbs.append((path, thumb))

    row_heights: list[int] = []
    for row_start in range(0, len(thumbs), cols):
        row = thumbs[row_start : row_start + cols]
        row_heights.append(max(thumb.height for _, thumb in row) + label_height)

    width = cols * thumb_width + (cols + 1) * gap
    height = sum(row_heights) + (len(row_heights) + 1) * gap
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)

    y = gap
    for row_index, row_start in enumerate(range(0, len(thumbs), cols)):
        row = thumbs[row_start : row_start + cols]
        x = gap
        for path, thumb in row:
            label = path.stem.split("__Q", 1)[-1].split("__", 1)[0]
            draw.text((x, y), label, fill=(20, 20, 20))
            sheet.paste(thumb, (x, y + label_height))
            x += thumb_width + gap
        y += row_heights[row_index] + gap

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out = REVIEW_DIR / "specimen_4wm1h_crops_contact.jpg"
    sheet.save(out, quality=92)
    return out


def build_question_rows() -> list[dict[str, Any]]:
    topics = load_topics()
    topic_order = {topic: index + 1 for index, topic in enumerate(topics)}
    topic_unit = build_topic_unit_map()
    rows: list[dict[str, Any]] = []

    for question in QUESTIONS:
        q = int(question["q"])
        marks = int(question["marks"])
        topic = str(question["topic"])
        pages = [int(crop[0]) for crop in question["crops"]]
        filename = make_filename(q, marks, topic, min(pages), max(pages))
        base_id = filename.removesuffix(".png")
        row = {
            "id": f"all::{base_id}",
            "bank": "all",
            "q": q,
            "marks": marks,
            "topic": topic,
            "unit": topic_unit.get(topic, "Unclassified"),
            "topicOrder": topic_order.get(topic, 9999),
            "image": f"/assets/questions/{filename}",
            "filename": filename,
            "text": question["text"],
            "modularForceUnit": MODULAR_UNIT,
        }
        rows.append(row)
        if q >= 20:
            expertise = dict(row)
            expertise["id"] = f"expertise::{base_id}"
            expertise["bank"] = "expertise"
            rows.append(expertise)

    return rows


def write_questions(rows: list[dict[str, Any]]) -> Path:
    doc = {
        "paper": PAPER,
        "paperSlug": PAPER_SLUG,
        "session": SESSION,
        "code": CODE,
        "isModular": True,
        "modularUnit": MODULAR_UNIT,
        "questionCount": len(rows),
        "questions": rows,
    }
    out = DATA_QUESTIONS / f"{PAPER_SLUG}.json"
    out.write_text(json.dumps(doc, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    return out


def write_solutions(rows: list[dict[str, Any]]) -> Path:
    questions_by_q = {int(question["q"]): question for question in QUESTIONS}
    rows_by_q_and_bank = {(row["q"], row["bank"]): row for row in rows}
    now = datetime.now().isoformat(timespec="seconds")
    solutions: dict[str, dict[str, Any]] = {}

    for question in QUESTIONS:
        q = int(question["q"])
        for bank in ("all", "expertise"):
            row = rows_by_q_and_bank.get((q, bank))
            if not row:
                continue
            source = questions_by_q[q]
            solutions[row["id"]] = {
                "status": "checked",
                "checkedBy": "Dr Eslam Ahmed + Codex",
                "updated": now,
                "topicNote": source["topic_note"],
                "steps": source["solution"],
                "finalAnswer": source["final"],
            }

    out = DATA_SOLUTIONS / f"{PAPER_SLUG}.json"
    out.write_text(
        json.dumps({"paperSlug": PAPER_SLUG, "solutions": solutions}, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return out


def remove_stale_assets() -> None:
    for path in QUESTION_DIR.glob(f"{PAPER_SLUG}__*.png"):
        path.unlink()


def main() -> None:
    if not QP_PATH.exists():
        raise FileNotFoundError(f"Missing question paper: {QP_PATH}")
    if not MS_PATH.exists():
        raise FileNotFoundError(f"Missing mark scheme: {MS_PATH}")

    remove_stale_assets()
    rows = build_question_rows()
    rows_by_q = {row["q"]: row for row in rows if row["bank"] == "all"}

    image_paths: list[Path] = []
    with fitz.open(QP_PATH) as doc:
        for question in QUESTIONS:
            row = rows_by_q[int(question["q"])]
            out_path = QUESTION_DIR / row["filename"]
            crop_question(doc, question, out_path)
            image_paths.append(out_path)

    question_path = write_questions(rows)
    solution_path = write_solutions(rows)
    contact = build_contact_sheet(image_paths)

    total_marks = sum(int(question["marks"]) for question in QUESTIONS)
    expertise_count = sum(1 for question in QUESTIONS if int(question["q"]) >= 20)

    print(f"Built {len(QUESTIONS)} question images")
    print(f"Total marks: {total_marks}")
    print(f"Expertise duplicates created: {expertise_count}")
    print(f"Wrote {question_path}")
    print(f"Wrote {solution_path}")
    print(f"Review contact sheet: {contact}")

    if total_marks != 100:
        raise SystemExit(f"Expected 100 marks, got {total_marks}")


if __name__ == "__main__":
    main()
