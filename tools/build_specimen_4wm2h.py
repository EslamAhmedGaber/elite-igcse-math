"""
Build the scanned Specimen 4WM2H paper assets and data.

The specimen PDF is image-only, so the normal text-based ingestion pipeline cannot
detect question blocks. This script keeps the manual crop map, question metadata,
and worked solutions in one repeatable place.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import fitz
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
QP_PATH = ROOT / "tools" / "inbox" / "Specimen_4WM2H_QP.pdf"
QUESTION_DIR = ROOT / "assets" / "questions"
DATA_QUESTIONS = ROOT / "src" / "data" / "questions"
DATA_SOLUTIONS = ROOT / "src" / "data" / "solutions"
TOPICS_PATH = ROOT / "src" / "data" / "topics.json"
REVIEW_DIR = ROOT / "tools" / "_specimen_4wm2h_review"

PAPER = "Specimen 4WM2H"
PAPER_SLUG = "Specimen_4WM2H"
SESSION = "Specimen"
CODE = "4WM2H"
MODULAR_UNIT = "Unit 2"

REVIEW_ZOOM = 1.5
RENDER_ZOOM = 2.0
DEFAULT_X0 = 90
DEFAULT_X1 = 835


QUESTIONS: list[dict[str, Any]] = [
    {
        "q": 1,
        "marks": 3,
        "topic": "Statistics Toolkit",
        "crops": [(3, 180, 890)],
        "text": "1 Here are five cards, where x represents a number. The cards are 15, 7, -2, 23 and x. The mean of the five numbers is 12. Work out the value of x. (Total for Question 1 is 3 marks)",
        "solution": r"""**Topic check:** Statistics Toolkit. The tag is correct.

**Solution**

The mean is \(12\), so the total of the five numbers is

\[
5 \times 12 = 60
\]

The known numbers add to

\[
15+7-2+23=43
\]

Therefore

\[
43+x=60
\]

\[
x=17
\]

**Answer:** \(x=17\).""",
    },
    {
        "q": 2,
        "marks": 4,
        "topic": "Prime Factors, HCF & LCM",
        "crops": [(4, 80, 1065)],
        "text": "2 (a) Find the highest common factor (HCF) of 56 and 84. (b) Find the lowest common multiple (LCM) of 60 and 72. (Total for Question 2 is 4 marks)",
        "solution": r"""**Topic check:** Prime Factors, HCF & LCM. The tag is correct.

**Solution**

\[
56=2^3\times 7,\qquad 84=2^2\times 3\times 7
\]

The common prime factors are \(2^2\) and \(7\), so

\[
\text{HCF}=2^2\times 7=28
\]

Also

\[
60=2^2\times 3\times 5,\qquad 72=2^3\times 3^2
\]

Use the highest powers of each prime:

\[
\text{LCM}=2^3\times 3^2\times 5=360
\]

**Answers:** HCF \(=28\), LCM \(=360\).""",
    },
    {
        "q": 3,
        "marks": 2,
        "topic": "Algebraic Roots & Indices",
        "crops": [(5, 80, 850)],
        "text": "3 2^k / 4^n = 2^x. Find an expression for x in terms of k and n. (Total for Question 3 is 2 marks)",
        "solution": r"""**Topic check:** Algebraic Roots & Indices. The tag is correct because the question uses index laws with letters.

**Solution**

\[
4^n=(2^2)^n=2^{2n}
\]

So

\[
\frac{2^k}{4^n}=\frac{2^k}{2^{2n}}=2^{k-2n}
\]

Since this equals \(2^x\),

\[
x=k-2n
\]

**Answer:** \(x=k-2n\).""",
    },
    {
        "q": 4,
        "marks": 4,
        "topic": "Angles in Polygons & Parallel Lines",
        "crops": [(6, 80, 825)],
        "text": "4 Parts of three regular polygons A, B and C meet at a point. The angles at the point are 8x degrees, 7x degrees and 3x degrees. Polygon B has n sides. Work out the value of n. (Total for Question 4 is 4 marks)",
        "solution": r"""**Topic check:** Angles in Polygons & Parallel Lines. The main idea is angles around a point and the interior angle of a regular polygon.

**Solution**

Angles around a point add to \(360^\circ\):

\[
8x+7x+3x=360
\]

\[
18x=360
\]

\[
x=20
\]

The interior angle of polygon \(B\) is

\[
7x=7(20)=140^\circ
\]

For a regular \(n\)-sided polygon,

\[
\frac{180(n-2)}{n}=140
\]

\[
180n-360=140n
\]

\[
40n=360
\]

\[
n=9
\]

**Answer:** \(n=9\).""",
    },
    {
        "q": 5,
        "marks": 4,
        "topic": "Graphing Inequalities",
        "crops": [(7, 80, 955)],
        "text": "5 (a) On the grid, draw and label the straight lines y = 1, x = 2 and x + y = 7. (b) Shade the region satisfying y >= 1, x >= 2 and x + y <= 7. Label the region R. (Total for Question 5 is 4 marks)",
        "solution": r"""**Topic check:** Graphing Inequalities. The tag is correct.

**Solution**

Draw the three boundary lines:

\[
y=1,\qquad x=2,\qquad x+y=7
\]

For \(x+y=7\), use points such as \((0,7)\) and \((7,0)\).

The required region is:

\[
y\ge 1,\qquad x\ge 2,\qquad x+y\le 7
\]

So shade the triangular region above \(y=1\), to the right of \(x=2\), and below the line \(x+y=7\). Its vertices are

\[
(2,1),\quad (2,5),\quad (6,1)
\]

**Answer:** the shaded region \(R\) is the triangle with vertices \((2,1)\), \((2,5)\), and \((6,1)\).""",
    },
    {
        "q": 6,
        "marks": 3,
        "topic": "Statistics Toolkit",
        "crops": [(8, 80, 610)],
        "text": "6 Here are some integers where a < b < c < d: a, b, c, d, d, d. The mode is 9, the range is 4, and the median is 8. Work out a, b, c and d. (Total for Question 6 is 3 marks)",
        "solution": r"""**Topic check:** Statistics Toolkit. The tag is correct.

**Solution**

The mode is \(9\), and \(d\) appears three times, so

\[
d=9
\]

The range is \(4\), so

\[
d-a=4
\]

\[
9-a=4
\]

\[
a=5
\]

There are six values, so the median is the mean of the 3rd and 4th values:

\[
\frac{c+d}{2}=8
\]

\[
\frac{c+9}{2}=8
\]

\[
c=7
\]

Since \(a<b<c<d\), the remaining integer is \(b=6\).

**Answer:** \(a=5,\ b=6,\ c=7,\ d=9\).""",
    },
    {
        "q": 7,
        "marks": 4,
        "topic": "Standard & Compound Units",
        "crops": [(9, 80, 985)],
        "text": "7 A cylinder has height 18 cm. The force on the ground is 72 newtons and the pressure is 1.4 newtons/cm^2. Given pressure = force / area, work out the volume of the cylinder correct to 3 significant figures. (Total for Question 7 is 4 marks)",
        "solution": r"""**Topic check:** Standard & Compound Units. The pressure formula is the key signal, with volume used at the end.

**Solution**

\[
\text{pressure}=\frac{\text{force}}{\text{area}}
\]

So the area of the base is

\[
\text{area}=\frac{72}{1.4}=51.428571\ldots
\]

The volume is

\[
51.428571\ldots \times 18=925.714285\ldots
\]

Correct to 3 significant figures,

\[
925.714\ldots \approx 926
\]

**Answer:** \(926\text{ cm}^3\).""",
    },
    {
        "q": 8,
        "marks": 6,
        "topic": "Compound Interest & Depreciation",
        "crops": [(10, 80, 790)],
        "text": "8 In 2021, Asha's apartment was worth 634400 euros after increasing by 4% from 2020. (a) Work out the value in 2020. Pam's boat depreciates by 15% each year. (b) Work out the total percentage depreciation after two years. (Total for Question 8 is 6 marks)",
        "solution": r"""**Topic check:** Compound Interest & Depreciation. The tag is correct.

**Solution**

For part (a), the 2021 value is \(104\%\) of the 2020 value.

\[
\text{2020 value}=\frac{634400}{1.04}=610000
\]

For part (b), after one year the multiplier is \(0.85\). After two years:

\[
0.85^2=0.7225
\]

So \(72.25\%\) of the value remains, and the total depreciation is

\[
100\%-72.25\%=27.75\%
\]

**Answers:** \(610000\) euros; \(27.75\%\).""",
    },
    {
        "q": 9,
        "marks": 2,
        "topic": "Powers, Roots & Standard Form",
        "crops": [(10, 795, 1045)],
        "text": "9 (a) Write 0.000089 in standard form. (b) Write 8.34 x 10^4 as an ordinary number. (Total for Question 9 is 2 marks)",
        "solution": r"""**Topic check:** Powers, Roots & Standard Form. The tag is correct.

**Solution**

\[
0.000089=8.9\times 10^{-5}
\]

Also

\[
8.34\times 10^4=83400
\]

**Answers:** \(8.9\times10^{-5}\), \(83400\).""",
    },
    {
        "q": 10,
        "marks": 5,
        "topic": "Ratio Problem Solving",
        "crops": [(11, 80, 1095)],
        "text": "10 Payel makes 300 celebration cards. Birthday : anniversary : congratulations = 7 : 5 : 3. Two fifths of the birthday cards have numbers on them, 36% of the anniversary cards have numbers on them, and none of the congratulations cards have numbers on them. Work out what fraction of the 300 cards have numbers on them. (Total for Question 10 is 5 marks)",
        "solution": r"""**Topic check:** Ratio Problem Solving. The ratio is needed before the fraction and percentage work.

**Solution**

The total number of parts is

\[
7+5+3=15
\]

Each part is

\[
300\div 15=20
\]

So the numbers of cards are:

\[
140,\quad 100,\quad 60
\]

The birthday cards with numbers are

\[
\frac25 \times 140=56
\]

The anniversary cards with numbers are

\[
36\%\times 100=36
\]

So the total with numbers is

\[
56+36=92
\]

The fraction of all cards is

\[
\frac{92}{300}=\frac{23}{75}
\]

**Answer:** \(\frac{23}{75}\).""",
    },
    {
        "q": 11,
        "marks": 3,
        "topic": "Simultaneous Equations",
        "crops": [(12, 80, 655)],
        "text": "11 Solve the simultaneous equations 7x + 3y = 3 and 3x - y = 7. (Total for Question 11 is 3 marks)",
        "solution": r"""**Topic check:** Simultaneous Equations. The tag is correct.

**Solution**

From

\[
3x-y=7
\]

\[
y=3x-7
\]

Substitute into \(7x+3y=3\):

\[
7x+3(3x-7)=3
\]

\[
16x-21=3
\]

\[
16x=24
\]

\[
x=1.5
\]

Then

\[
y=3(1.5)-7=-2.5
\]

**Answers:** \(x=1.5,\ y=-2.5\).""",
    },
    {
        "q": 12,
        "marks": 5,
        "topic": "Percentages",
        "crops": [(13, 80, 935)],
        "text": "12 Zimo pays for a holiday in 3 payments. Payment 1 is 2/5 of the total cost, Payment 2 is 45% of the total cost, and Payment 3 is $405. Work out Payment 2. (Total for Question 12 is 5 marks)",
        "solution": r"""**Topic check:** Percentages. The tag is correct.

**Solution**

\[
\frac25=40\%
\]

So Payments 1 and 2 together are

\[
40\%+45\%=85\%
\]

This means Payment 3 is

\[
100\%-85\%=15\%
\]

So

\[
15\%=405
\]

\[
1\%=27
\]

Payment 2 is \(45\%\):

\[
45\times 27=1215
\]

**Answer:** \(\$1215\).""",
    },
    {
        "q": 13,
        "marks": 4,
        "topic": "Functions",
        "crops": [(14, 80, 840)],
        "text": "13 The function f is defined as f: x maps to 2x/(x - 6). (a) Find f(10). (b) Express the inverse function f^-1. (Total for Question 13 is 4 marks)",
        "solution": r"""**Topic check:** Functions. The tag is correct.

**Solution**

\[
f(10)=\frac{2(10)}{10-6}=\frac{20}{4}=5
\]

For the inverse, let

\[
y=\frac{2x}{x-6}
\]

\[
y(x-6)=2x
\]

\[
xy-6y=2x
\]

\[
x(y-2)=6y
\]

\[
x=\frac{6y}{y-2}
\]

So

\[
f^{-1}:x\mapsto \frac{6x}{x-2}
\]

**Answers:** \(5\), and \(f^{-1}:x\mapsto \frac{6x}{x-2}\).""",
    },
    {
        "q": 14,
        "marks": 5,
        "topic": "Circle Theorems",
        "crops": [(15, 80, 1105)],
        "text": "14 A, B, C and D are points on a circle, centre O. EBF is the tangent to the circle at B. Angle DAB = 40 degrees and the angle between AB and the tangent BF is 66 degrees. (a) Work out angle DCB and give a reason. (b) Work out angle ADO. (Total for Question 14 is 5 marks)",
        "solution": r"""**Topic check:** Circle Theorems. The tag is correct.

**Solution**

In cyclic quadrilateral \(A D C B\), opposite angles add to \(180^\circ\).

\[
\angle DCB=180^\circ-40^\circ=140^\circ
\]

Reason: opposite angles in a cyclic quadrilateral add to \(180^\circ\).

By the alternate segment theorem,

\[
\angle ADB=66^\circ
\]

In triangle \(ADB\),

\[
\angle ABD=180^\circ-40^\circ-66^\circ=74^\circ
\]

The angle at the centre is twice the angle at the circumference standing on the same chord \(AD\):

\[
\angle AOD=2(74^\circ)=148^\circ
\]

Since \(OA=OD\), triangle \(AOD\) is isosceles:

\[
\angle ADO=\frac{180^\circ-148^\circ}{2}=16^\circ
\]

**Answers:** \(\angle DCB=140^\circ\); reason: opposite angles in a cyclic quadrilateral; \(\angle ADO=16^\circ\).""",
    },
    {
        "q": 15,
        "marks": 7,
        "topic": "Cumulative Frequency Diagrams",
        "crops": [(16, 80, 1110), (17, 80, 825)],
        "text": "15 A cumulative frequency table gives ages of 60 people at a gym. (a) Draw a cumulative frequency graph. (b) Estimate the median. (c) Estimate the interquartile range. (d) Estimate the number older than 55 years. (Total for Question 15 is 7 marks)",
        "solution": r"""**Topic check:** Cumulative Frequency Diagrams. The tag is correct.

**Solution**

Plot the cumulative frequency points and join with a smooth increasing curve:

\[
(10,0),\ (20,13),\ (30,36),\ (40,42),\ (50,47),\ (60,52),\ (70,56),\ (80,60)
\]

There are \(60\) people, so the median is read at cumulative frequency \(30\).

Using linear interpolation between \((20,13)\) and \((30,36)\):

\[
20+\frac{30-13}{36-13}\times 10 \approx 27.4
\]

So the median is about \(27\) years.

For the interquartile range, read \(Q_1\) at cumulative frequency \(15\) and \(Q_3\) at cumulative frequency \(45\):

\[
Q_1 \approx 20.9,\qquad Q_3 \approx 46
\]

\[
\text{IQR}\approx 46-20.9=25.1
\]

So the IQR is about \(25\) years.

At age \(55\), the cumulative frequency is about \(49.5\), so the number older than \(55\) is

\[
60-49.5\approx 10.5
\]

This gives about \(11\) people.

**Answers:** median about \(27\) years, IQR about \(25\) years, about \(11\) people older than \(55\).""",
    },
    {
        "q": 16,
        "marks": 4,
        "topic": "Direct & Inverse Proportion",
        "crops": [(18, 80, 705)],
        "text": "16 M is directly proportional to h^3. M = 4 when h = 0.5. Find h when M = 500. (Total for Question 16 is 4 marks)",
        "solution": r"""**Topic check:** Direct & Inverse Proportion. The tag is correct.

**Solution**

Since \(M\) is directly proportional to \(h^3\),

\[
M=kh^3
\]

Use \(M=4\) when \(h=0.5\):

\[
4=k(0.5)^3
\]

\[
4=0.125k
\]

\[
k=32
\]

Now use \(M=500\):

\[
500=32h^3
\]

\[
h^3=15.625
\]

\[
h=2.5
\]

**Answer:** \(h=2.5\).""",
    },
    {
        "q": 17,
        "marks": 5,
        "topic": "Differentiation",
        "crops": [(19, 80, 1100)],
        "text": "17 A particle has displacement s = 4t^2 + 125/t for t >= 1. The velocity is v m/s. Work out the distance from O when v = 0. (Total for Question 17 is 5 marks)",
        "solution": r"""**Topic check:** Differentiation. The tag is correct.

**Solution**

\[
s=4t^2+\frac{125}{t}
\]

Differentiate to find velocity:

\[
v=\frac{ds}{dt}=8t-\frac{125}{t^2}
\]

Set \(v=0\):

\[
8t-\frac{125}{t^2}=0
\]

\[
8t^3=125
\]

\[
t^3=\frac{125}{8}
\]

\[
t=2.5
\]

Now find \(s\):

\[
s=4(2.5)^2+\frac{125}{2.5}
\]

\[
s=25+50=75
\]

**Answer:** \(75\text{ m}\).""",
    },
    {
        "q": 18,
        "marks": 3,
        "topic": "Solving Inequalities",
        "crops": [(20, 80, 670)],
        "text": "18 Solve the inequality 2y^2 - 7y - 30 <= 0. (Total for Question 18 is 3 marks)",
        "solution": r"""**Topic check:** Solving Inequalities. The tag is correct.

**Solution**

Factorise:

\[
2y^2-7y-30=(2y+5)(y-6)
\]

So

\[
(2y+5)(y-6)\le 0
\]

The roots are

\[
y=-\frac52,\qquad y=6
\]

The quadratic opens upwards, so it is less than or equal to zero between the roots.

**Answer:** \(-\frac52\le y\le 6\).""",
    },
    {
        "q": 19,
        "marks": 4,
        "topic": "Area & Volume of Similar Shapes",
        "crops": [(21, 80, 1110)],
        "text": "19 Two similar metal statues A and B are shown. The volume of statue B is 20% less than the volume of statue A. The surface area of statue B is k% less than the surface area of statue A. Work out k correct to 3 significant figures. (Total for Question 19 is 4 marks)",
        "solution": r"""**Topic check:** Area & Volume of Similar Shapes. The tag is correct.

**Solution**

The volume of statue \(B\) is \(80\%\) of the volume of statue \(A\), so the volume scale factor is

\[
0.8
\]

For similar solids:

\[
\text{linear scale factor}=\sqrt[3]{0.8}
\]

The surface area scale factor is therefore

\[
\left(\sqrt[3]{0.8}\right)^2=0.8^{2/3}
\]

\[
0.8^{2/3}=0.861773\ldots
\]

So the percentage decrease in surface area is

\[
(1-0.861773\ldots)\times 100=13.8226\ldots
\]

Correct to 3 significant figures,

\[
k=13.8
\]

**Answer:** \(k=13.8\).""",
    },
    {
        "q": 20,
        "marks": 5,
        "topic": "Simultaneous Equations",
        "crops": [(22, 80, 1105)],
        "text": "20 Solve the simultaneous equations x - 2y = 3 and x^2 - y^2 + 2x = 10. (Total for Question 20 is 5 marks)",
        "solution": r"""**Topic check:** Simultaneous Equations. The tag is correct; this is a linear and quadratic simultaneous equation.

**Solution**

From

\[
x-2y=3
\]

\[
x=2y+3
\]

Substitute into \(x^2-y^2+2x=10\):

\[
(2y+3)^2-y^2+2(2y+3)=10
\]

\[
4y^2+12y+9-y^2+4y+6=10
\]

\[
3y^2+16y+5=0
\]

\[
(3y+1)(y+5)=0
\]

So

\[
y=-\frac13\quad\text{or}\quad y=-5
\]

If \(y=-\frac13\),

\[
x=2\left(-\frac13\right)+3=\frac73
\]

If \(y=-5\),

\[
x=2(-5)+3=-7
\]

**Answers:** \(\left(\frac73,-\frac13\right)\) and \((-7,-5)\).""",
    },
    {
        "q": 21,
        "marks": 3,
        "topic": "Algebraic Fractions",
        "crops": [(23, 80, 1110)],
        "text": "21 a = 14/(3x - 7) and x = 7/(4y - 3). Express a in the form (py + q)/(ry + s), where p, q, r and s are integers. Give your answer in its simplest form. (Total for Question 21 is 3 marks)",
        "solution": r"""**Topic check:** Algebraic Fractions. The tag is correct because the task is substitution and simplification of algebraic fractions.

**Solution**

\[
a=\frac{14}{3x-7},\qquad x=\frac{7}{4y-3}
\]

Substitute for \(x\):

\[
a=\frac{14}{3\left(\frac{7}{4y-3}\right)-7}
\]

Simplify the denominator:

\[
3\left(\frac{7}{4y-3}\right)-7
=\frac{21}{4y-3}-7
\]

\[
=\frac{21-7(4y-3)}{4y-3}
=\frac{42-28y}{4y-3}
\]

So

\[
a=\frac{14}{\frac{42-28y}{4y-3}}
=\frac{14(4y-3)}{42-28y}
\]

\[
a=\frac{4y-3}{3-2y}
\]

**Answer:** \(\displaystyle a=\frac{4y-3}{3-2y}\).""",
    },
    {
        "q": 22,
        "marks": 5,
        "topic": "Volume & Surface Area",
        "crops": [(24, 80, 520), (25, 485, 570)],
        "text": "22 A solid is made from a cone and a hemisphere. The radius of the hemisphere and the cone base is 20 cm. The curved surface area of the cone is 580 pi cm^2. The volume of the solid is k pi cm^3. Work out the exact value of k. (Total for Question 22 is 5 marks)",
        "solution": r"""**Topic check:** Volume & Surface Area. The tag is correct.

**Solution**

The curved surface area of a cone is

\[
\pi r l
\]

Here \(r=20\) and \(\pi r l=580\pi\), so

\[
20l=580
\]

\[
l=29
\]

Use Pythagoras to find the height of the cone:

\[
h^2=29^2-20^2
\]

\[
h^2=841-400=441
\]

\[
h=21
\]

Volume of the cone:

\[
\frac13\pi r^2h=\frac13\pi(20)^2(21)=2800\pi
\]

Volume of the hemisphere:

\[
\frac23\pi r^3=\frac23\pi(20)^3=\frac{16000}{3}\pi
\]

Total volume:

\[
2800\pi+\frac{16000}{3}\pi
=\frac{24400}{3}\pi
\]

Since the volume is \(k\pi\),

\[
k=\frac{24400}{3}
\]

**Answer:** \(\displaystyle k=\frac{24400}{3}\).""",
    },
    {
        "q": 23,
        "marks": 5,
        "topic": "Vectors",
        "crops": [(26, 80, 1110)],
        "text": "23 OAB is a triangle. Q is on AB and OQP is a straight line. Vector OA = 4a, vector OB = 6b and vector AP = 2a + 8b. Using a vector method, find the ratio AQ : QB. (Total for Question 23 is 5 marks)",
        "solution": r"""**Topic check:** Vectors. The tag is correct.

**Solution**

\[
\overrightarrow{OA}=4a,\qquad \overrightarrow{OB}=6b,\qquad \overrightarrow{AP}=2a+8b
\]

So

\[
\overrightarrow{OP}=\overrightarrow{OA}+\overrightarrow{AP}
\]

\[
\overrightarrow{OP}=4a+(2a+8b)=6a+8b
\]

Since \(O,Q,P\) are collinear, let

\[
\overrightarrow{OQ}=\lambda(6a+8b)
\]

Also \(Q\) lies on \(AB\). Let

\[
\overrightarrow{AQ}=\mu\overrightarrow{AB}
\]

Then

\[
\overrightarrow{AB}=6b-4a
\]

\[
\overrightarrow{OQ}=4a+\mu(6b-4a)
\]

\[
\overrightarrow{OQ}=(4-4\mu)a+6\mu b
\]

Compare coefficients with

\[
\lambda(6a+8b)=6\lambda a+8\lambda b
\]

So

\[
4-4\mu=6\lambda,\qquad 6\mu=8\lambda
\]

From \(6\mu=8\lambda\),

\[
\lambda=\frac34\mu
\]

Substitute:

\[
4-4\mu=6\left(\frac34\mu\right)
\]

\[
4-4\mu=\frac92\mu
\]

\[
8=17\mu
\]

\[
\mu=\frac8{17}
\]

Therefore

\[
AQ:QB=\frac8{17}:\frac9{17}=8:9
\]

**Answer:** \(AQ:QB=8:9\).""",
    },
    {
        "q": 24,
        "marks": 5,
        "topic": "Sequences",
        "crops": [(27, 80, 1055)],
        "text": "24 The sum of the first 10 terms of an arithmetic series is 4 times the sum of the first 5 terms of the same series. The 8th term is 45. Find the first term of this series. (Total for Question 24 is 5 marks)",
        "solution": r"""**Topic check:** Sequences. The tag is correct.

**Solution**

Let the first term be \(a\) and the common difference be \(d\).

\[
S_n=\frac n2(2a+(n-1)d)
\]

So

\[
S_{10}=5(2a+9d)
\]

and

\[
S_5=\frac52(2a+4d)
\]

Given \(S_{10}=4S_5\):

\[
5(2a+9d)=4\left(\frac52(2a+4d)\right)
\]

\[
10a+45d=20a+40d
\]

\[
5d=10a
\]

\[
d=2a
\]

The 8th term is \(45\):

\[
a+7d=45
\]

Substitute \(d=2a\):

\[
a+14a=45
\]

\[
15a=45
\]

\[
a=3
\]

**Answer:** the first term is \(3\).""",
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
            draw.text((x, y), path.stem.split("__Q", 1)[-1].split("__", 1)[0], fill=(20, 20, 20))
            sheet.paste(thumb, (x, y + label_height))
            x += thumb_width + gap
        y += row_heights[row_index] + gap

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out = REVIEW_DIR / "specimen_4wm2h_crops_contact.jpg"
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
    all_rows_by_q = {row["q"]: row for row in rows if row["bank"] == "all"}
    solution_by_q = {int(question["q"]): question["solution"] for question in QUESTIONS}
    now = datetime.now().isoformat(timespec="seconds")
    solutions: dict[str, dict[str, Any]] = {}
    for q, row in all_rows_by_q.items():
        solutions[row["id"]] = {
            "status": "checked",
            "source": solution_by_q[q],
            "updated": now,
            "checked_by": "Dr Eslam Ahmed + Codex",
        }
    out = DATA_SOLUTIONS / f"{PAPER_SLUG}.json"
    out.write_text(
        json.dumps({"paperSlug": PAPER_SLUG, "solutions": solutions}, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return out


def main() -> None:
    if not QP_PATH.exists():
        raise FileNotFoundError(f"Missing question paper: {QP_PATH}")

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
    print(f"Expertise duplicates expected after seeding: {expertise_count}")
    print(f"Wrote {question_path}")
    print(f"Wrote {solution_path}")
    print(f"Review contact sheet: {contact}")

    if total_marks != 100:
        raise SystemExit(f"Expected 100 marks, got {total_marks}")


if __name__ == "__main__":
    main()
