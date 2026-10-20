"""Draw the IGCSE (Linear / Modular) answers that ask the student to draw, plot, sketch, shade or construct,
and attach each picture to its solution step in src/data/solutions/<paper>.json.

All values come from the worked solutions (vertices, plotted points, densities, Venn counts).
Images: assets/solution-diagrams/igcse/<source id>.png. Then rebuild the runtime data:
    python tools/solution_figures/igcse_figures.py
    python tools/build_runtime_data.py        (rewrites solutions-data.js with the figures)
Idempotent: re-running replaces the same figures.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from matplotlib.patches import Arc, Circle, Ellipse, Polygon

sys.path.insert(0, str(Path(__file__).resolve().parent))
from draw_figures import GOLD, GOLD_INK, GREY, NAVY, SECOND, ROOT, curve, dot, new_axes, plt  # noqa: E402

OUT = ROOT / "assets" / "solution-diagrams" / "igcse"
SOLUTIONS = ROOT / "src" / "data" / "solutions"


# ------------------------------------------------------------------ helpers
def grid_axes(xlim, ylim, xlabel="x", ylabel="y", size=(5.4, 4.2), step=1):
    fig, ax = new_axes(xlim, ylim, xlabel, ylabel, size=size)
    ax.set_xticks(np.arange(np.ceil(xlim[0] / step) * step, xlim[1] + 1e-9, step))
    ax.set_yticks(np.arange(np.ceil(ylim[0] / step) * step, ylim[1] + 1e-9, step))
    ax.tick_params(colors=GREY, labelsize=8, length=0)
    ax.grid(True, color="#dfe6ef", lw=0.8)
    ax.set_axisbelow(True)
    return fig, ax


def cf_curve(points, xlabel, reads=(), total=None):
    xs, ys = zip(*points)
    total = total or ys[-1]
    fig, ax = new_axes((min(xs), max(xs) + (max(xs) - min(xs)) * 0.06), (0, total * 1.1),
                       xlabel=xlabel, ylabel="Cumulative frequency", size=(5.8, 4.0))
    ax.set_xticks(xs)
    ax.set_yticks(np.linspace(0, total, 5).round(1))
    ax.tick_params(colors=NAVY, labelsize=8.5, length=3)
    ax.grid(True, color="#e6ebf2", lw=0.7)
    ax.set_axisbelow(True)
    try:
        from scipy.interpolate import PchipInterpolator
        fine = np.linspace(xs[0], xs[-1], 300)
        ax.plot(fine, PchipInterpolator(xs, ys)(fine), color=NAVY, lw=2.2)
    except ImportError:
        ax.plot(xs, ys, color=NAVY, lw=2.2)
    ax.plot(xs, ys, "o", color=GOLD, markeredgecolor=NAVY, markersize=5.5, zorder=5)
    for cf, x, label in reads:
        ax.plot([min(xs), x, x], [cf, cf, 0], color=SECOND, lw=1.2, ls=(0, (4, 3)))
        ax.text(x, cf, f" {label}", color=SECOND, fontsize=9.5, va="bottom")
    return fig


def histogram(bars, xlabel, highlight=None):
    right = max(b[1] for b in bars)
    top = max(b[2] for b in bars)
    fig, ax = new_axes((min(b[0] for b in bars), right * 1.06), (0, top * 1.22),
                       xlabel=xlabel, ylabel="Frequency density", size=(5.8, 3.9))
    for i, (a, b, d) in enumerate(bars):
        hot = highlight is not None and i == highlight
        ax.add_patch(plt.Rectangle((a, 0), b - a, d, facecolor=GOLD if hot else "#dbe3f0", edgecolor=NAVY, lw=1.6))
        ax.text((a + b) / 2, d, f"{d:g}", ha="center", va="bottom", fontsize=9, color=GOLD_INK if hot else NAVY)
    edges = sorted({b[0] for b in bars} | {b[1] for b in bars})
    ax.set_xticks(edges)
    ax.tick_params(colors=NAVY, labelsize=8.5, length=3)
    return fig


def plot_table(f, x0, x1, table_x, xlim, ylim, label, extra=None):
    fig, ax = grid_axes(xlim, ylim, step=max(1, round((ylim[1] - ylim[0]) / 10)))
    ax.set_xticks(np.arange(np.ceil(xlim[0]), xlim[1] + 1e-9, 1))
    curve(ax, f, x0, x1, label=label, label_at=(x1 * 0.62 if x1 > 0 else x1, f(x1) * 0.88 if abs(f(x1)) < ylim[1] else ylim[1] * 0.8))
    for x in table_x:
        dot(ax, x, f(x))
    if extra:
        extra(ax)
    return fig


def shape(ax, pts, color, label=None, fill=0.35):
    ax.add_patch(Polygon(pts, closed=True, facecolor=color, alpha=fill, edgecolor=color, lw=2))
    if label:
        cx, cy = np.mean(pts, axis=0)
        ax.text(cx, cy, label, ha="center", va="center", color=NAVY, fontsize=11, fontweight="bold")


def transform_fig(orig, image, xlim, ylim, labels=("Shape", "Image"), centre=None, mirror=None, rays=False, extra_images=()):
    fig, ax = grid_axes(xlim, ylim, size=(5.4, 4.6))
    shape(ax, orig, "#8a96a8", labels[0], fill=0.25)
    shape(ax, image, GOLD, labels[1] or "Image", fill=0.55)
    for pts, lab in extra_images:
        shape(ax, pts, SECOND, lab, fill=0.3)
    if mirror == "y=x":
        lo = max(xlim[0], ylim[0])
        hi = min(xlim[1], ylim[1])
        ax.plot([lo, hi], [lo, hi], color=SECOND, lw=1.6, ls=(0, (6, 3)))
        ax.text(hi - 0.6, hi - 1.4, "$y=x$", color=SECOND)
    if centre:
        dot(ax, *centre, f"({centre[0]:g}, {centre[1]:g})", dx=6, dy=-14, va="top")
        if rays:
            for p in orig:
                ax.plot([centre[0], p[0]], [centre[1], p[1]], color=GREY, lw=0.8, ls=(0, (3, 3)))
    return fig


def region_fig(lines, region, xlim=(0, 8), ylim=(0, 8)):
    fig, ax = grid_axes(xlim, ylim, size=(4.9, 4.7))
    ax.add_patch(Polygon(region, closed=True, facecolor=GOLD, alpha=0.55, edgecolor="none"))
    for kind, value, label in lines:
        xs = np.linspace(*xlim, 10)
        if kind == "x":
            ax.plot([value, value], ylim, color=NAVY, lw=1.8)
            ax.text(value + 0.08, ylim[1] - 0.5, label, color=NAVY, fontsize=10)
        elif kind == "y":
            ax.plot(xlim, [value, value], color=NAVY, lw=1.8)
            ax.text(xlim[1] - 1.4, value + 0.15, label, color=NAVY, fontsize=10)
        else:
            m, c = value
            ax.plot(xs, m * xs + c, color=NAVY, lw=1.8)
            xt = (ylim[1] - 0.8 - c) / m if m else xlim[1] - 1
            xt = min(max(xt, xlim[0] + 0.2), xlim[1] - 1.6)
            ax.text(xt + 0.15, m * xt + c, label, color=NAVY, fontsize=10)
    cx, cy = np.mean(region, axis=0)
    ax.text(cx, cy, "$R$", ha="center", va="center", fontsize=14, color=GOLD_INK, fontweight="bold")
    return fig


def venn3(names, counts, outside, title_total=None):
    """counts: keys a, b, c, ab, ac, bc, abc (only-regions)."""
    fig, ax = plt.subplots(figsize=(5.2, 4.4), dpi=170)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8.6)
    ax.axis("off")
    ax.add_patch(plt.Rectangle((0.2, 0.2), 9.6, 8.2, fill=False, edgecolor=NAVY, lw=1.6))
    ax.text(0.45, 7.95, "$\\mathcal{E}$", fontsize=14, color=NAVY)
    centres = [(3.9, 5.1), (6.1, 5.1), (5.0, 3.2)]
    for (cx, cy), name in zip(centres, names):
        ax.add_patch(Circle((cx, cy), 2.25, fill=False, edgecolor=NAVY, lw=1.8))
    ax.text(1.55, 7.25, names[0], fontsize=13, color=NAVY, fontweight="bold")
    ax.text(8.15, 7.25, names[1], fontsize=13, color=NAVY, fontweight="bold")
    ax.text(7.35, 0.8, names[2], fontsize=13, color=NAVY, fontweight="bold")
    spots = {"a": (2.85, 5.8), "b": (7.15, 5.8), "c": (5.0, 1.95), "ab": (5.0, 6.15), "ac": (3.8, 3.75), "bc": (6.2, 3.75), "abc": (5.0, 4.5)}
    for key, (x, y) in spots.items():
        ax.text(x, y, str(counts[key]), ha="center", va="center", fontsize=13, color=NAVY if key != "abc" else GOLD_INK, fontweight="bold")
    ax.text(9.2, 0.75, str(outside), ha="center", fontsize=13, color=NAVY, fontweight="bold")
    return fig


def venn2(names, a_only, both, b_only, outside):
    fig, ax = plt.subplots(figsize=(5.4, 3.6), dpi=170)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.4)
    ax.axis("off")
    ax.add_patch(plt.Rectangle((0.2, 0.2), 9.6, 6.0, fill=False, edgecolor=NAVY, lw=1.6))
    ax.text(0.45, 5.7, "$\\mathcal{E}$", fontsize=14, color=NAVY)
    for cx, name, tx in ((3.9, names[0], 1.4), (6.1, names[1], 8.3)):
        ax.add_patch(Circle((cx, 3.1), 2.25, fill=False, edgecolor=NAVY, lw=1.8))
        ax.text(tx, 5.05, name, fontsize=13, color=NAVY, fontweight="bold")
    for x, value in ((2.8, a_only), (5.0, both), (7.2, b_only)):
        ax.text(x, 3.1, str(value), ha="center", va="center", fontsize=12 if len(str(value)) < 6 else 10, color=NAVY, fontweight="bold", wrap=True)
    ax.text(9.0, 0.65, str(outside), ha="center", fontsize=12 if len(str(outside)) < 6 else 10, color=NAVY, fontweight="bold")
    return fig


def perpendicular_bisector():
    fig, ax = plt.subplots(figsize=(5.0, 4.0), dpi=170)
    ax.set_aspect("equal")
    ax.axis("off")
    a, b = np.array([0.0, 0.0]), np.array([6.0, 1.0])
    r = 4.2
    ax.plot(*zip(a, b), color=NAVY, lw=2.2)
    for p, name, d in ((a, "A", (-0.45, -0.1)), (b, "B", (0.2, -0.1))):
        ax.plot(*p, "o", color=NAVY, markersize=4)
        ax.text(p[0] + d[0], p[1] + d[1], name, fontsize=13, color=NAVY, fontweight="bold")
    mid = (a + b) / 2
    direction = (b - a) / np.linalg.norm(b - a)
    normal = np.array([-direction[1], direction[0]])
    h = np.sqrt(r ** 2 - (np.linalg.norm(b - a) / 2) ** 2)
    p1, p2 = mid + normal * h, mid - normal * h
    for centre in (a, b):
        for p in (p1, p2):
            ang = np.degrees(np.arctan2(*(p - centre)[::-1]))
            ax.add_patch(Arc(centre, 2 * r, 2 * r, theta1=ang - 14, theta2=ang + 14, color=GREY, lw=1.4))
    ax.plot(*zip(p1 + normal * 0.6, p2 - normal * 0.6), color=GOLD_INK, lw=2.2)
    ax.text(*(p1 + normal * 0.7), "perpendicular\nbisector", color=GOLD_INK, fontsize=9.5, ha="center")
    ax.text(mid[0] + 0.25, mid[1] - 0.55, "equal arcs from A and B", color=GREY, fontsize=8.5)
    ax.set_xlim(-1.5, 7.5)
    ax.set_ylim(-4.6, 5.6)
    return fig


def angle_bisector(names):
    first, vertex, last = names
    fig, ax = plt.subplots(figsize=(5.0, 3.8), dpi=170)
    ax.set_aspect("equal")
    ax.axis("off")
    o = np.array([0.0, 0.0])
    t1, t2 = np.radians(8), np.radians(68)
    u1, u2 = np.array([np.cos(t1), np.sin(t1)]), np.array([np.cos(t2), np.sin(t2)])
    ax.plot(*zip(o, o + 6 * u1), color=NAVY, lw=2.2)
    ax.plot(*zip(o, o + 6 * u2), color=NAVY, lw=2.2)
    ax.text(*(o + 6.25 * u2), first, fontsize=13, color=NAVY, fontweight="bold")
    ax.text(-0.45, -0.35, vertex, fontsize=13, color=NAVY, fontweight="bold")
    ax.text(*(o + 6.2 * u1), last, fontsize=13, color=NAVY, fontweight="bold")
    r = 2.6
    ax.add_patch(Arc(o, 2 * r, 2 * r, theta1=2, theta2=74, color=GREY, lw=1.4))
    c1, c2 = o + r * u1, o + r * u2
    bis = (u1 + u2) / np.linalg.norm(u1 + u2)
    meet = c1 + 0 * bis
    rho = 2.2
    half = np.linalg.norm(c2 - c1) / 2
    mid = (c1 + c2) / 2
    meet = mid + bis * np.sqrt(rho ** 2 - half ** 2)
    for c in (c1, c2):
        ang = np.degrees(np.arctan2(*(meet - c)[::-1]))
        ax.add_patch(Arc(c, 2 * rho, 2 * rho, theta1=ang - 16, theta2=ang + 16, color=GREY, lw=1.4))
    ax.plot(*zip(o, o + 7 * bis), color=GOLD_INK, lw=2.2)
    ax.text(*(o + 7.15 * bis), "bisector", color=GOLD_INK, fontsize=9.5)
    ax.set_xlim(-0.8, 7.2)
    ax.set_ylim(-0.8, 6.4)
    return fig


def tree_two_draws():
    fig, ax = plt.subplots(figsize=(5.6, 3.8), dpi=170)
    ax.axis("off")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    first = [("Red", 6.0, "4/11"), ("Blue", 2.0, "7/11")]
    second = {"Red": [("Red", 7.3, "3/10"), ("Blue", 4.7, "7/10")], "Blue": [("Red", 3.3, "4/10"), ("Blue", 0.7, "6/10")]}
    ax.text(0.2, 7.6, "1st bead", color=GREY, fontsize=9)
    ax.text(4.6, 7.6, "2nd bead", color=GREY, fontsize=9)
    for name, y, p in first:
        ax.plot([0.4, 3.6], [4.0, y], color=NAVY, lw=1.8)
        ax.text(1.7, (4.0 + y) / 2 + (0.35 if y > 4 else -0.55), p, color=NAVY, fontsize=10)
        ax.text(3.75, y - 0.15, name, color=NAVY, fontsize=11, fontweight="bold")
        for n2, y2, p2 in second[name]:
            hot = (name == "Blue" and p2 in ("4/10", "6/10"))
            ax.plot([4.9, 7.6], [y, y2], color=GOLD_INK if hot else NAVY, lw=2.2 if hot else 1.8)
            ax.text(6.0, (y + y2) / 2 + (0.2 if y2 > y else -0.45), p2, color=GOLD_INK if hot else NAVY, fontsize=10, fontweight="bold" if hot else "normal")
            ax.text(7.75, y2 - 0.15, n2, color=NAVY, fontsize=10.5)
    return fig


# ------------------------------------------------------------------ figure list
def L(x0, x1):
    return np.linspace(x0, x1, 7)


FIGS = []


def fig(source_id, step, alt):
    def wrap(fn):
        FIGS.append((source_id, step, fn, alt))
        return fn
    return wrap


CF = [
    ("Jan2021_P1HR__Q11__p12-13__m06__Cumulative-Frequency-Diagrams", 1, [(0, 0), (5, 8), (10, 23), (15, 40), (20, 68), (25, 101), (30, 120)], "Time waited (minutes)", [(60, 18.6, "median 18.6")]),
    ("Jan2022_P1H__Q12__p12-13__m06__Cumulative-Frequency-Diagrams", 1, [(0, 0), (10, 7), (20, 33), (30, 57), (40, 71), (50, 78), (60, 80)], "Time (minutes)", [(40, 22.9, "median 23")]),
    ("Jun2022_P2HR__Q11__p12-13__m07__Cumulative-Frequency-Diagrams", 0, [(10, 0), (20, 13), (30, 36), (40, 42), (50, 47), (60, 52), (70, 56), (80, 60)], "Age (years)", [(30, 27.4, "median 27.4"), (15, 20.9, "Q1"), (45, 46, "Q3")]),
    ("Jun2022_P2H__Q13__p12-13__m07__Cumulative-Frequency-Diagrams", 1, [(0, 0), (20, 7), (30, 32), (40, 52), (50, 66), (60, 74), (70, 80)], "Age (years)", [(40, 34, "median 34")]),
    ("Jun2024_P2HR__Q11__p12-13__m07__Cumulative-Frequency-Diagrams", 1, [(0, 0), (5, 6), (10, 17), (15, 27), (20, 42), (25, 53), (30, 60)], "Hours", [(15, 9.1, "Q1"), (45, 21.4, "Q3")]),
    ("Jun2024_P2H__Q13__p12-13__m07__Cumulative-Frequency-Diagrams", 1, [(0, 0), (10, 7), (20, 24), (30, 42), (40, 56), (50, 66), (60, 70)], "Distance (km)", [(17.5, 16.2, "Q1"), (52.5, 37.5, "Q3")]),
    ("Jun2025_P1HR__Q12__p12-13__m06__Cumulative-Frequency-Diagrams", 1, [(10, 0), (20, 12), (30, 27), (40, 47), (50, 65), (60, 74), (70, 80)], "Age (years)", [(57.8, 46, "46 years")]),
    ("Jun2025_P2H__Q13__p12-13__m06__Cumulative-Frequency-Diagrams", 1, [(0, 0), (10, 8), (20, 21), (30, 33), (40, 50), (50, 57), (60, 60)], "Time (minutes)", [(30, 27.5, "median 27.5")]),
    ("May2021_P2H__Q12__p12-13__m07__Cumulative-Frequency-Diagrams", 0, [(0, 0), (5, 17), (10, 32), (15, 57), (20, 70), (25, 76), (30, 80)], "Distance (km)", [(40, 11.6, "median"), (20, 6.0, "Q1"), (60, 16.2, "Q3")]),
    ("May2023_P1HR__Q14__p14-15__m06__Cumulative-Frequency-Diagrams", 0, [(50, 0), (60, 15), (70, 31), (80, 52), (90, 66), (100, 74), (110, 80)], "Time (minutes)", [(40, 74.3, "median"), (20, 63.1, "Q1"), (60, 85.7, "Q3")]),
    ("May2025_4WM2H__Q14__p14-15__m06__Cumulative-Frequency-Diagrams", 1, [(0, 0), (10, 8), (20, 21), (30, 33), (40, 50), (50, 57), (60, 60)], "Time (minutes)", [(30, 27.5, "median 27.5")]),
    ("MayNov2020_P1HR__Q11__p10-11__m05__Cumulative-Frequency-Diagrams", 0, [(10, 0), (20, 9), (30, 28), (40, 45), (50, 63), (60, 76), (70, 80)], "Age (years)", [(40, 37.1, "median 37")]),
    ("Nov2021_P1H__Q11__p10-11__m05__Cumulative-Frequency-Diagrams", 0, [(25, 0), (35, 12), (45, 36), (55, 64), (65, 76), (75, 86), (85, 90)], "Time (minutes)", [(28.8, 42, "42"), (55.6, 52, "52")]),
    ("Nov2024_P2H__Q13__p14-15__m06__Cumulative-Frequency-Diagrams", 0, [(0, 0), (1, 4), (2, 19), (3, 39), (4, 50), (5, 56), (6, 60)], "Weight (kg)", [(30, 2.55, "median 2.55"), (46.7, 3.7, "3.7 kg")]),
    ("Specimen_4WM2H__Q15__p16-17__m07__Cumulative-Frequency-Diagrams", 0, [(10, 0), (20, 13), (30, 36), (40, 42), (50, 47), (60, 52), (70, 56), (80, 60)], "Age (years)", [(30, 27.4, "median 27"), (15, 20.9, "Q1"), (45, 46, "Q3")]),
]
for sid, step, pts, xl, reads in CF:
    FIGS.append((sid, step, (lambda p=pts, x=xl, r=reads: cf_curve(p, x, r)), "Cumulative frequency graph"))

HIST = [
    ("May2021_P1H__Q18__p16-17__m05__Histograms", 1, [(0, 10, 4), (10, 15, 7), (15, 20, 8), (20, 30, 6), (30, 60, 1)], "d", None),
    ("May2024_P1HR__Q16__p16-16__m03__Histograms", 1, [(0, 2, 2.5), (2, 5, 4), (5, 10, 3.6), (10, 20, 1.4), (20, 35, 0.6)], "h", None),
    ("May2024_P1H__Q22__p23-23__m03__Histograms", 5, [(5, 15, 2.7), (15, 20, 2.8), (20, 35, 3.4), (35, 55, 0.4)], "d", 0),
    ("MayNov2020_P1H__Q18__p20-21__m05__Histograms", 0, [(10, 20, 3.5), (20, 35, 3), (35, 50, 5), (50, 70, 2), (70, 80, 0.8)], "h", None),
    ("Nov2021_P2H__Q14__p17-17__m05__Histograms", 0, [(0, 10, 0.8), (10, 15, 2.6), (15, 25, 1.9), (25, 40, 1.6), (40, 60, 0.3)], "L", None),
    ("Nov2025_4WM1H__Q20__p18-18__m03__Standard-Compound-Units", 0, [(0, 5, 2.4), (5, 15, 3.4), (15, 30, 3), (30, 50, 1.4)], "h", None),
]
for sid, step, bars, xl, hot in HIST:
    FIGS.append((sid, step, (lambda b=bars, x=xl, h=hot: histogram(b, x, h)), "Histogram"))


@fig("Jan2020_P1H__Q20__p24-24__m04__Graphs-of-Functions", 6, "Sketch of y = 4(x - 1)^2 - a")
def g1():
    f, ax = new_axes((-1.4, 3.6), (-11, 9))
    curve(ax, lambda x: 4 * (x - 1) ** 2 - 9, -0.75, 2.75, label="$a=9$ shown", label_at=(2.0, 5.5))
    dot(ax, 1, -9, "$(1,\\,-a)$", dy=-14, va="top")
    dot(ax, 0, -5, "$(0,\\,4-a)$", dx=-8, ha="right")
    dot(ax, -0.5, 0, "$\\left(1-\\frac{\\sqrt{a}}{2},0\\right)$", dx=-6, dy=8, ha="right")
    dot(ax, 2.5, 0, "$\\left(1+\\frac{\\sqrt{a}}{2},0\\right)$", dy=-20, va="top")
    return f


def _quad_table(f, xs, xlim, ylim, label):
    span = ylim[1] - ylim[0]
    fg, ax = grid_axes(xlim, ylim, size=(5.0, 4.6), step=next(s for s in (1, 2, 5, 10, 20) if span / s <= 16))
    ax.set_xticks(np.arange(np.ceil(xlim[0]), xlim[1] + 1e-9, 1))
    curve(ax, f, xs[0], xs[-1], label=label, label_at=(xs[-1] - 1.6, f(xs[-1]) * 0.9))
    for x in xs:
        dot(ax, x, f(x))
    return fg


FIGS += [
    ("Jan2020_P2HR__Q15__p15-15__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: x ** 2 - x / 2 - 3, list(range(-3, 4)), (-3.5, 3.5), (-4, 8), "$y=x^2-\\frac{x}{2}-3$"), "Graph of y = x^2 - x/2 - 3"),
    ("Jan2022_P1HR__Q04__p06-06__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: x ** 2 - 4 * x + 3, list(range(-2, 5)), (-2.5, 4.5), (-2, 16), "$y=x^2-4x+3$"), "Graph of y = x^2 - 4x + 3"),
    ("Jun2023_P2H__Q04__p06-06__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: x ** 2 - x - 4, list(range(-3, 4)), (-3.5, 3.5), (-5, 10), "$y=x^2-x-4$"), "Graph of y = x^2 - x - 4"),
    ("Jun2025_P1H__Q10__p11-11__m03__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: x ** 3 + 2 * x + 3, list(range(-3, 4)), (-3.5, 3.5), (-32, 40), "$y=x^3+2x+3$"), "Graph of y = x^3 + 2x + 3"),
    ("May2025_4WM1H__Q13__p15-15__m03__Graphs-of-Functions", 4, lambda: _quad_table(lambda x: x ** 3 + 2 * x + 3, list(range(-3, 4)), (-3.5, 3.5), (-32, 40), "$y=x^3+2x+3$"), "Graph of y = x^3 + 2x + 3"),
    ("Nov2023_P1H__Q12__p14-15__m05__Graphs-of-Functions", 1, lambda: _quad_table(lambda x: x ** 3 - 3 * x + 1, [-2, -1, 0, 1, 2], (-2.5, 2.5), (-4, 6), "$y=x^3-3x+1$"), "Graph of y = x^3 - 3x + 1"),
    ("Jan2022_P2HR__Q11__p15-15__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: 6 / x, [0.5, 1, 2, 3, 4, 5, 6], (0, 6.5), (0, 13), "$y=\\dfrac{6}{x}$"), "Graph of y = 6/x"),
    ("May2021_P2H__Q15__p16-17__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: x + 4 / x, [0.25, 0.5, 1, 2, 4, 8], (0, 8.5), (0, 17), "$y=x+\\dfrac{4}{x}$"), "Graph of y = x + 4/x"),
    ("Nov2024_P1H__Q11__p13-13__m04__Graphs-of-Functions", 2, lambda: _quad_table(lambda x: 2 * (x + 1 / x), [0.5, 1, 2, 3, 4, 5, 6], (0, 6.5), (0, 13), "$y=2\\left(x+\\dfrac{1}{x}\\right)$"), "Graph of y = 2(x + 1/x)"),
    ("MayNov2020_P1H__Q03__p05-05__m03__Linear-Graphs-y-mx-c", 2, lambda: _quad_table(lambda x: 7 - 4 * x, [-2, -1, 0, 1, 2, 3], (-2.5, 3.5), (-6, 16), "$y=7-4x$"), "Graph of y = 7 - 4x"),
]


@fig("Jan2022_P2H__Q21__p23-23__m05__Graphs-of-Functions", 6, "Graph of y = 2x^2 - 4x - 1 with the line y = 1 - 2x")
def g_line():
    f, ax = grid_axes((-2, 4), (-4, 6), size=(5.0, 4.6))
    curve(ax, lambda x: 2 * x ** 2 - 4 * x - 1, -1.2, 3.2, label="$y=2x^2-4x-1$", label_at=(2.4, 5))
    curve(ax, lambda x: 1 - 2 * x, -2, 2.5, color=SECOND, label="$y=1-2x$", label_at=(-1.9, 5.3))
    for x in (-0.6, 1.6):
        dot(ax, x, 1 - 2 * x)
        ax.plot([x, x], [1 - 2 * x, 0], color=SECOND, lw=1, ls=(0, (3, 3)))
        ax.text(x, -0.55, f"{x:g}", ha="center", color=SECOND, fontsize=9.5)
    return f


@fig("Nov2025_P2H__Q12__p12-13__m05__Graphs-of-Functions", 3, "Graph of y = (x + 4/x)/2 with the line y = 3")
def g_h():
    f, ax = grid_axes((0, 6.5), (0, 5), size=(5.0, 4.0))
    xs = [0.5, 1, 2, 3, 4, 5, 6]
    fn = lambda x: 0.5 * (x + 4 / x)  # noqa: E731
    curve(ax, fn, 0.5, 6, label="$y=\\frac{1}{2}\\left(x+\\frac{4}{x}\\right)$", label_at=(3.6, 3.7))
    for x in xs:
        dot(ax, x, fn(x))
    ax.plot([0, 6.5], [3, 3], color=SECOND, lw=1.8)
    ax.text(5.6, 3.08, "$y=3$", color=SECOND)
    for x in (0.8, 5.2):
        ax.plot([x, x], [3, 0], color=SECOND, lw=1, ls=(0, (3, 3)))
        ax.text(x, 0.12, f"{x:g}", ha="center", color=SECOND, fontsize=9.5)
    return f


@fig("Jun2025_P2H__Q25__p24-25__m06__Completing-the-Square", 5, "Sketch of y = 52 - 6(x - 2)^2")
def g_cs():
    f, ax = new_axes((-2, 6), (-20, 62))
    curve(ax, lambda x: 52 - 6 * (x - 2) ** 2, -1.4, 5.4, label="$y=28+24x-6x^2$", label_at=(3.9, 40))
    dot(ax, 2, 52, "$(2,\\,52)$")
    dot(ax, 0, 28, "$(0,\\,28)$", dx=-8, ha="right")
    return f


@fig("Nov2023_P2H__Q14__p13-13__m03__Simultaneous-Equations", 3, "The lines y = x + 2 and 2y + x = 1 meet at (-1, 1)")
def g_sim():
    f, ax = grid_axes((-3, 5), (-4, 5), size=(5.0, 4.6))
    curve(ax, lambda x: x + 2, -3, 3, label="$y=x+2$", label_at=(1.6, 4.2))
    curve(ax, lambda x: (1 - x) / 2, -3, 5, color=SECOND, label="$2y+x=1$", label_at=(2.6, -1.6))
    dot(ax, -1, 1, "$(-1,\\,1)$", dx=-8, dy=6, ha="right")
    return f


TRANSFORMS = [
    ("Jan2020_P1H__Q08__p10-10__m02__Transformations", 2, [(7, 10), (15, 10), (15, 4), (11, 4)], [(4, 6), (8, 6), (8, 3), (6, 3)], (0, 16), (0, 12), {"centre": (1, 2), "rays": True}),
    ("Jan2021_P2HR__Q05__p06-07__m06__Transformations", 3, [(-3, -5), (3, -5), (3, -2), (0, -2)], [(-3, 9), (-9, 9), (-9, 6), (-6, 6)], (-10, 14), (-8, 10),
     {"labels": ("P", "Q"), "centre": (-3, 2), "extra_images": [([(7, 3), (13, 3), (13, 6), (10, 6)], "R")]}),
    ("Jun2022_P2HR__Q01__p03-03__m04__Transformations", 5, [(5, 1), (6, 1), (5, 3)], [(1, 4), (2, 4), (1, 6)], (0, 8), (0, 8), {"labels": ("A", "")}),
    ("Jun2024_P2HR__Q02__p04-04__m04__Transformations", 3, [(2, 1), (4, 1), (3, 2), (2, 2)], [(-4, -1), (-6, -1), (-5, -2), (-4, -2)], (-8, 6), (-5, 5), {"centre": (-1, 0)}),
    ("Jun2025_P2HR__Q05__p06-07__m04__Transformations", 1, [(5, 2), (8, 2), (7, 3), (6, 3)], [(2, 5), (2, 8), (3, 7), (3, 6)], (-1, 10), (-1, 10), {"labels": ("A", ""), "mirror": "y=x"}),
    ("Jun2025_P2HR__Q05__p06-07__m04__Transformations", 3, [(3, 2), (5, 2), (4, 4), (3, 4)], [(5, 3), (9, 3), (7, 7), (5, 7)], (0, 10), (0, 9), {"labels": ("B", ""), "centre": (1, 1), "rays": True}),
    ("Jun2025_P2H__Q02__p04-04__m05__Transformations", 1, [(1, 1), (3, 1), (3, 4), (2, 4), (2, 2), (1, 2)], [(3, 1), (9, 1), (9, 10), (6, 10), (6, 4), (3, 4)], (0, 11), (0, 11), {"labels": ("A", ""), "centre": (0, 1), "rays": True}),
    ("May2023_P1HR__Q10__p10-10__m02__Transformations", 2, [(7, 4), (13, 4), (7, 13)], [(3, 6), (5, 6), (3, 9)], (0, 14), (0, 14), {"centre": (1, 7), "rays": True}),
    ("May2023_P1H__Q04__p06-07__m08__Transformations", 5, [(2, 5), (2, 3), (3, 2), (3, 3)], [(3, 6), (1, 6), (0, 5), (1, 5)], (-1, 6), (0, 8), {"labels": ("P", ""), "centre": (3, 5)}),
    ("May2025_4WM2HR__Q04__p06-07__m04__Transformations", 3, [(2, 7), (4, 5), (2, 5)], [(-4, 3), (-2, 5), (-2, 3)], (-6, 6), (-1, 8), {"labels": ("A", "B"), "centre": (1, 2)}),
    ("Nov2023_P2H__Q03__p05-05__m05__Transformations", 1, [(1, 6), (4, 6), (4, 5), (3, 5), (3, 4), (2, 4), (2, 5), (1, 5)], [(6, 1), (6, 4), (5, 4), (5, 3), (4, 3), (4, 2), (5, 2), (5, 1)], (0, 8), (0, 8), {"labels": ("T", ""), "mirror": "y=x"}),
]
for n, (sid, step, orig, image, xl, yl, opts) in enumerate(TRANSFORMS):
    FIGS.append((sid, step, (lambda o=orig, i=image, x=xl, y=yl, k=opts: transform_fig(o, i, x, y, **k)), "Shape and its image"))


def _graph_transform(orig, new, xlim, ylim, smooth, labels):
    f, ax = grid_axes(xlim, ylim, size=(5.0, 4.4))
    for pts, color, lab in ((orig, "#8a96a8", labels[0]), (new, NAVY, labels[1])):
        xs, ys = zip(*pts)
        if smooth:
            from scipy.interpolate import CubicSpline
            fine = np.linspace(xs[0], xs[-1], 200)
            ax.plot(fine, CubicSpline(xs, ys)(fine), color=color, lw=2.2)
        else:
            ax.plot(xs, ys, color=color, lw=2.2)
        for p in pts:
            ax.plot(*p, "o", color=GOLD if color == NAVY else "#c9d2de", markeredgecolor=color, markersize=5)
        ax.text(xs[-1] + 0.15, ys[-1], lab, color=color, fontsize=10.5)
    return f


FIGS += [
    ("Jan2022_P1HR__Q20__p24-25__m06__Transformations-of-Graphs", 6, lambda: _graph_transform([(-1, 3), (2, 0), (3, -1), (4, 0), (7, 3)], [(-1, 6), (2, 0), (3, -2), (4, 0), (7, 6)], (-2, 8), (-3, 7), False, ("$y=g(x)$", "$y=2g(x)$")), "Graph of y = 2g(x)"),
    ("May2025_4WM2H__Q27__p28-29__m04__Graphs-of-Functions", 4, lambda: _graph_transform([(-4, 1), (2, 4), (6, 2)], [(-2, -2), (1, 1), (3, -1)], (-5, 8), (-3, 5), False, ("$y=g(x)$", "$y=g(2x)-3$")), "Graph of y = g(2x) - 3"),
    ("MayNov2020_P1H__Q25__p27-27__m03__Transformations-of-Graphs", 5, lambda: _graph_transform([(1, 3), (2, 0), (4, -3), (6, 0), (7, 3)], [(2, 6), (3, 0), (5, -6), (7, 0), (8, 6)], (0, 10), (-7, 7), True, ("$y=f(x)$", "$y=2f(x-1)$")), "Graph of y = 2f(x - 1)"),
]

REGIONS = [
    ("Jan2021_P2H__Q04__p06-06__m04__Graphing-Inequalities", 1, [("x", 1.5, "$x=1.5$"), ("m", (1, 0), "$y=x$"), ("m", (-1, 6), "$x+y=6$")], [(1.5, 1.5), (1.5, 4.5), (3, 3)]),
    ("Jan2022_P2HR__Q07__p10-10__m05__Graphing-Inequalities", 1, [("x", 6, "$x=6$"), ("y", 2, "$y=2$"), ("m", (1, 1), "$y=x+1$")], [(1, 2), (6, 2), (6, 7)]),
    ("Jun2022_P2H__Q02__p04-04__m04__Graphing-Inequalities", 1, [("y", 1, "$y=1$"), ("x", 2, "$x=2$"), ("m", (-1, 7), "$x+y=7$")], [(2, 1), (6, 1), (2, 5)]),
    ("Jun2024_P2H__Q02__p04-04__m04__Graphing-Inequalities", 1, [("y", 2, "$y=2$"), ("x", 6, "$x=6$"), ("m", (1, 1), "$y=x+1$")], [(1, 2), (6, 2), (6, 7)]),
    ("Nov2024_P2H__Q07__p08-08__m04__Graphing-Inequalities", 1, [("x", 3, "$x=3$"), ("y", 1, "$y=1$"), ("m", (-1, 7), "$x+y=7$")], [(3, 1), (6, 1), (3, 4)]),
    ("Specimen_4WM2H__Q05__p07-07__m04__Graphing-Inequalities", 3, [("y", 1, "$y=1$"), ("x", 2, "$x=2$"), ("m", (-1, 7), "$x+y=7$")], [(2, 1), (6, 1), (2, 5)]),
]
for sid, step, lines, region in REGIONS:
    FIGS.append((sid, step, (lambda l=lines, r=region: region_fig(l, r)), "Shaded region R"))

VENN3 = [
    ("Jan2020_P2HR__Q17__p18-19__m06__Set-Notation-and-Venn-Diagrams", 3, ("D", "C", "R"), dict(a=15, b=6, c=9, ab=4, ac=3, bc=2, abc=6), 5),
    ("Jun2022_P2H__Q16__p16-17__m08__Probability-Diagrams-Venn-and-Tree-Diagrams", 2, ("G", "S", "C"), dict(a=13, b=9, c=24, ab=5, ac=12, bc=11, abc=6), 20),
    ("Specimen_4WM1H__Q14__p16-17__m08__Set-Notation-Venn-Diagrams", 2, ("G", "S", "C"), dict(a=13, b=9, c=24, ab=5, ac=12, bc=11, abc=6), 20),
    ("Jun2024_P2H__Q16__p16-17__m07__Probability-Diagrams-Venn-and-Tree-Diagrams", 1, ("K", "P", "E"), dict(a=7, b=4, c=12, ab=8, ac=11, bc=7, abc=9), 2),
    ("Jun2025_P2H__Q20__p18-18__m06__Probability-Diagrams-Venn-and-Tree-Diagrams", 6, ("C", "P", "T"), dict(a=10, b=14, c=14, ab=6, ac=15, bc=20, abc=12), 29),
    ("Nov2021_P1H__Q16__p18-19__m05__Probability-Diagrams-Venn-and-Tree-Diagrams", 2, ("M", "E", "F"), dict(a=3, b=0, c=1, ab=11, ac=4, bc=2, abc=7), 4),
]
for sid, step, names, counts, out in VENN3:
    FIGS.append((sid, step, (lambda n=names, c=counts, o=out: venn3(n, c, o)), "Completed Venn diagram"))
FIGS += [
    ("Jan2021_P2HR__Q16__p15-15__m05__Probability-Diagrams-Venn-and-Tree-Diagrams", 1, lambda: venn2(("A", "B"), 38, 24, 6, 12), "Completed Venn diagram"),
    ("Jan2022_P1H__Q07__p08-08__m03__Set-Notation-and-Venn-Diagrams", 7, lambda: venn2(("A", "B"), "9, 11\n12, 13", "5, 10\n15", "4, 6", "7, 8, 14"), "Completed Venn diagram"),
    ("Specimen_4WM1H__Q11__p12-13__m06__Probability-Diagrams-Venn-Tree-Diagrams", 0, tree_two_draws, "Completed tree diagram"),
]
for sid in ("Jan2020_P2HR__Q06__p07-07__m02__Bearings-Scale-Drawing-and-Constructions", "Jun2025_P2H__Q04__p05-05__m02__Bearings-Scale-Drawing-and-Constructions",
            "May2025_4WM2H__Q04__p05-05__m02__Coordinate-Geometry"):
    FIGS.append((sid, 0, perpendicular_bisector, "Construction of a perpendicular bisector"))
for sid, names in (("Jan2020_P2H__Q05__p06-06__m02__Bearings-Scale-Drawing-and-Constructions", ("B", "A", "C")),
                   ("MayNov2020_P1HR__Q02__p03-03__m02__Bearings-Scale-Drawing-and-Constructions", ("A", "B", "C")),
                   ("Nov2024_P1H__Q02__p04-04__m02__Bearings-Scale-Drawing-and-Constructions", ("A", "B", "C")),
                   ("Nov2025_4WM2H__Q01__p03-03__m02__Circles-Arcs-Sectors", ("P", "Q", "R")),
                   ("Nov2025_P1H__Q03__p04-04__m02__Bearings-Scale-Drawing-and-Constructions", ("A", "B", "C"))):
    FIGS.append((sid, 0, (lambda n=names: angle_bisector(n)), "Construction of an angle bisector"))


# ------------------------------------------------------------------ attach
def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = {p: json.loads(p.read_text(encoding="utf-8")) for p in sorted(SOLUTIONS.glob("*.json"))}
    index = {}
    for path, doc in files.items():
        for key in doc.get("solutions", {}):
            index.setdefault(key.split("::", 1)[1], []).append((path, key))
    counters: dict[str, int] = {}
    attached = 0
    missing = []
    for sid, step, drawer, alt in FIGS:
        counters[sid] = counters.get(sid, 0) + 1
        name = f"{sid}.png" if counters[sid] == 1 else f"{sid}-{counters[sid]}.png"
        figure = drawer()
        figure.tight_layout(pad=0.6)
        figure.savefig(OUT / name, dpi=170, facecolor="white")
        plt.close(figure)
        src = f"assets/solution-diagrams/igcse/{name}"
        targets = index.get(sid, [])
        if not targets:
            missing.append(sid)
            continue
        for path, key in targets:  # every bank copy (all / expertise / unit variants) of the same question
            solution = files[path]["solutions"][key]
            steps = solution.get("steps", [])
            for s in steps:
                if any(f.get("src") == src for f in s.get("figures", [])):
                    s["figures"] = [f for f in s["figures"] if f.get("src") != src]
                    if not s["figures"]:
                        del s["figures"]
            target = steps[min(step, len(steps) - 1)]
            target.setdefault("figures", []).append({"src": src, "alt": alt})
            attached += 1
    for path, doc in files.items():
        text = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
        if text != path.read_text(encoding="utf-8"):
            path.write_text(text, encoding="utf-8")
    print(f"IGCSE: {len(FIGS)} figures drawn, {attached} solution copies updated")
    if missing:
        print("not found:", missing)


if __name__ == "__main__":
    main()
