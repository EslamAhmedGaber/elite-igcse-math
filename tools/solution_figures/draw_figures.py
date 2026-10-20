"""Draw the sketches that IAL worked solutions describe in words, and attach them to the solution steps.

Each FIGURE entry names a question, the solution step that describes the sketch, and how to draw it.
Images go to assets/solution-diagrams/<course>/<id>.png (the path worked-solution.js accepts) and the
step gets {"figures": [{"src", "alt"}]} inside ial/<course>/<course>-data.js. Idempotent: re-run after
rebuilding a course's data file.

python tools/solution_figures/draw_figures.py [course ...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
NAVY, GOLD, GOLD_INK, GREY, SECOND = "#0f2140", "#e2b84f", "#7d5a0b", "#8a96a8", "#b0471f"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "mathtext.fontset": "cm"})


# ------------------------------------------------------------------ drawing helpers
def new_axes(xlim, ylim, xlabel="x", ylabel="y", size=(5.6, 3.9)):
    fig, ax = plt.subplots(figsize=size, dpi=170)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GREY)
        ax.spines[side].set_linewidth(1.1)
    ax.spines["left"].set_position(("data", 0) if xlim[0] < 0 < xlim[1] else ("axes", 0))
    ax.spines["bottom"].set_position(("data", 0) if ylim[0] < 0 < ylim[1] else ("axes", 0))
    ax.set_xticks([])
    ax.set_yticks([])
    xa = 0 if ylim[0] < 0 < ylim[1] else ylim[0]
    ya = 0 if xlim[0] < 0 < xlim[1] else xlim[0]
    ax.plot(xlim[1], xa, ">", color=GREY, markersize=6, clip_on=False)
    ax.plot(ya, ylim[1], "^", color=GREY, markersize=6, clip_on=False)
    ax.text(xlim[1], xa, f"  ${xlabel}$" if len(xlabel) == 1 else f"  {xlabel}", va="center", ha="left", color=NAVY)
    ax.text(ya, ylim[1], f"${ylabel}$  " if len(ylabel) == 1 else f"{ylabel}  ", va="bottom", ha="right", color=NAVY)
    return fig, ax


def curve(ax, f, x0, x1, color=NAVY, label=None, label_at=None, asymptotes=(), lw=2.2, ls="-"):
    xs = np.linspace(x0, x1, 2400)
    with np.errstate(all="ignore"):
        ys = f(xs)
    ys = np.where(np.isfinite(ys), ys, np.nan)
    for a in asymptotes:
        ys[np.abs(xs - a) < (x1 - x0) / 400] = np.nan
    lo, hi = ax.get_ylim()
    ys[(ys < lo - (hi - lo)) | (ys > hi + (hi - lo))] = np.nan
    ax.plot(xs, ys, color=color, lw=lw, ls=ls)
    if label and label_at:
        ax.text(*label_at, label, color=color, fontsize=11.5)


def dot(ax, x, y, text=None, dx=8, dy=8, ha="left", va="bottom"):
    ax.plot([x], [y], "o", color=GOLD, markeredgecolor=NAVY, markersize=6.5, zorder=5)
    if text:
        ax.annotate(text, (x, y), xytext=(dx, dy), textcoords="offset points", ha=ha, va=va, color=NAVY, fontsize=11)


def vline(ax, x, text=None, at=None):
    ax.axvline(x, color=GREY, lw=1.1, ls=(0, (5, 4)))
    if text:
        lo, hi = ax.get_ylim()
        ax.text(x, at if at is not None else hi * 0.9, f" {text}", color=GREY, fontsize=10.5)


def hline(ax, y, text=None, at=None):
    ax.axhline(y, color=GREY, lw=1.1, ls=(0, (5, 4)))
    if text:
        lo, hi = ax.get_xlim()
        ax.text(at if at is not None else hi * 0.62, y, text, color=GREY, fontsize=10.5, va="bottom")


def speed_time(points, labels=None, ylabel="v (m s$^{-1}$)", xlabel="t (s)", tick_x=(), tick_y=(), size=(5.8, 3.6)):
    xs, ys = zip(*points)
    fig, ax = new_axes((0, max(xs) * 1.12), (0, max(ys) * 1.22), xlabel=xlabel, ylabel=ylabel, size=size)
    ax.plot(xs, ys, color=NAVY, lw=2.4, solid_joinstyle="round")
    for x, text in tick_x:
        ax.plot([x, x], [0, np.interp(x, xs, ys)], color=GREY, lw=1, ls=(0, (4, 3)))
        ax.text(x, -max(ys) * 0.04, text, ha="center", va="top", color=NAVY, fontsize=10.5)
    for y, text, x_at in tick_y:
        ax.plot([0, x_at], [y, y], color=GREY, lw=1, ls=(0, (4, 3)))
        ax.text(-max(xs) * 0.015, y, text, ha="right", va="center", color=NAVY, fontsize=10.5)
    for (x, y), text in (labels or {}).items():
        dot(ax, x, y, text)
    return fig, ax


# ------------------------------------------------------------------ the figures
def p1_2023_mj_q03():
    fig, ax = new_axes((-5, 2.2), (-2, 17))
    curve(ax, lambda x: 3 * (x + 2) ** 2 + 1, -4.4, 0.6, label="$y=3(x+2)^2+1$", label_at=(0.25, 9))
    dot(ax, -2, 1, "$(-2,\\,1)$", dy=-16, va="top")
    dot(ax, 0, 13, "$(0,\\,13)$")
    return fig


def p1_2024_jan_q09():
    fig, ax = new_axes((-1.6, 5.8), (-12, 25))
    curve(ax, lambda x: -5 * x * (x - 4), -0.9, 4.9, label="$y=f(x)$", label_at=(4.3, 4))
    dot(ax, 0, 0, "$(0,0)$", dx=-6, ha="right")
    dot(ax, 4, 0, "$(4,0)$")
    dot(ax, 2, 20, "$(2,\\,20)$")
    return fig


def p1_2026_jan_q03():
    fig, ax = new_axes((-3.5, 8), (-8, 26))
    xs = np.linspace(-2, -1, 200)
    ax.fill_between(xs, xs + 5, xs * (xs - 3), color=GOLD, alpha=0.45, lw=0)
    xs = np.linspace(5, 7.4, 200)
    ax.fill_between(xs, xs + 5, xs * (xs - 3), color=GOLD, alpha=0.45, lw=0)
    curve(ax, lambda x: x * (x - 3), -3.2, 7.4, label="$y=x(x-3)$", label_at=(6.0, 23))
    curve(ax, lambda x: x + 5, -3.3, 7.8, color=SECOND, label="$y=x+5$", label_at=(6.6, 9.3))
    vline(ax, -2, "$x=-2$", at=20)
    dot(ax, -1, 4, "$(-1,4)$", dx=6, dy=-14, va="top")
    dot(ax, 5, 10, "$(5,10)$", dx=-8, dy=6, ha="right")
    ax.text(5.9, 15.5, "$R$", color=GOLD_INK, fontsize=13, fontweight="bold")
    return fig


def p1_2020_jan_q10():
    fig, ax = new_axes((-0.8, 7), (-95, 70))
    curve(ax, lambda x: (4 * x - 3) * (x - 5) ** 2, -0.45, 6.6, label="$y=(4x-3)(x-5)^2$", label_at=(1.4, 52))
    dot(ax, 0.75, 0, "$\\left(\\frac{3}{4},0\\right)$", dy=-20, va="top")
    dot(ax, 5, 0, "$(5,0)$", dy=-18, va="top")
    dot(ax, 0, -75, "$(0,-75)$", dx=8)
    return fig


def p1_2021_jan_q06():
    fig, ax = new_axes((-5, 5), (-5, 5))
    curve(ax, lambda x: -4 / x, -5, 5, asymptotes=(0,), label="$y=-\\dfrac{k}{x}$", label_at=(1.7, -3.6))
    ax.text(-4.6, 1.2, "branch in\nquadrant II", color=GREY, fontsize=9.5)
    ax.text(0.5, -1.55, "asymptotes $x=0$ and $y=0$", color=GREY, fontsize=9.5)
    return fig


def p1_2021_oct_q06():
    fig, ax = new_axes((-2, 4.7), (-14, 30))
    curve(ax, lambda x: 2 * (x + 1) * (x - 3) ** 2, -1.45, 4.3, label="$y=2(x+1)(x-3)^2$", label_at=(1.7, 21))
    dot(ax, -1, 0, "$(-1,0)$", dx=-6, dy=-16, ha="right", va="top")
    dot(ax, 3, 0, "$(3,0)$", dy=-18, va="top")
    dot(ax, 0, 18, "$(0,18)$")
    return fig


def p1_2022_oct_q06():
    fig, ax = new_axes((-6, 3.2), (-60, 60))
    curve(ax, lambda x: (2 * x - 2) * (x + 4) ** 2, -5.6, 2.1, label="$y=(2x-k)(x+4)^2$", label_at=(-5.8, 30))
    # k = 2 in both curves (any k > 0 gives the same picture)
    curve(ax, lambda x: 2 / x ** 2, -6, 3.2, color=SECOND, asymptotes=(0,), label="$y=\\dfrac{k}{x^2}$", label_at=(1.9, 7))
    dot(ax, -4, 0, "$(-4,0)$", dy=8)
    dot(ax, 1, 0, "$\\left(\\frac{k}{2},0\\right)$", dx=6, dy=-20, va="top")
    ax.text(-5.9, -55, "One intersection, so one root", color=GOLD_INK, fontsize=10)
    return fig


def p1_2023_oct_q04():
    fig, ax = new_axes((-4.2, 1.6), (-6, 8))
    curve(ax, lambda x: x * (x + 2) ** 2, -3.6, 1.2, label="$y=x(x+2)^2$", label_at=(0.35, 6.4))
    curve(ax, lambda x: 1 / (x + 2), -4.2, 1.6, color=SECOND, asymptotes=(-2,), label="$y=\\dfrac{1}{x+2}$", label_at=(-4.1, -2.4))
    vline(ax, -2, "$x=-2$", at=6.8)
    dot(ax, -2, 0, "$(-2,0)$", dx=-6, dy=-16, ha="right", va="top")
    dot(ax, 0, 0, "$(0,0)$", dx=6, dy=-16, va="top")
    ax.text(-4.1, 6.8, "2 intersections", color=GOLD_INK, fontsize=10)
    return fig


def p1_2025_mj_q07():
    fig, ax = new_axes((-10, 10), (-180, 40))
    curve(ax, lambda x: 0.2 * x ** 2 * (x - 4), -9, 8.6, label="$C_1:\\ y=0.2x^2(x-4)$", label_at=(3.2, -60))
    curve(ax, lambda x: 1.2 * x * (8 - x), -9.4, 8.6, color=SECOND, label="$C_2:\\ y=1.2x(8-x)$", label_at=(-9.7, 22))
    dot(ax, -8, -153.6, "$(-8,-153.6)$", dx=10, dy=-4)
    dot(ax, 0, 0, "$(0,0)$", dx=-6, ha="right")
    dot(ax, 6, 14.4, "$(6,14.4)$", dx=-4, dy=8, ha="right")
    return fig


def p1_2025_oct_q06():
    fig, ax = new_axes((-6, 7), (-6, 6))
    curve(ax, lambda x: 4 / (x - 2), -6, 7, asymptotes=(2,), label="$k=1$ shown", label_at=(4.2, 2.2))
    vline(ax, 2, "$x=2k$", at=4.8)
    dot(ax, 0, -2, "$(0,-2)$", dx=-8, ha="right", dy=-14, va="top")
    return fig


def p1_2023_jan_q07():
    fig, ax = new_axes((-5, 5), (-6, 6))
    curve(ax, lambda x: 6 / x, -5, 5, asymptotes=(0,), label="$y=\\dfrac{6}{x}$", label_at=(1.4, 4.4))
    ax.text(0.4, -1.1, "asymptotes $x=0$, $y=0$", color=GREY, fontsize=9.5)
    return fig


def p1_2021_mj_q09():
    fig, ax = new_axes((-2 * np.pi - 0.4, 2 * np.pi + 0.6), (-6, 6))
    ast = [k * np.pi / 2 for k in (-3, -1, 1, 3)]
    curve(ax, np.tan, -2 * np.pi, 2 * np.pi, asymptotes=ast, lw=1.9, label="$y=\\tan x$", label_at=(4.85, 4.9))
    curve(ax, lambda x: 1 / x + 1, -2 * np.pi, 2 * np.pi, color=SECOND, asymptotes=(0,), label="$y=\\dfrac{1}{x}+1$", label_at=(0.4, 4.6))
    hline(ax, 1, "$y=1$", at=-6.6)
    for a in ast:
        ax.axvline(a, color=GREY, lw=0.8, ls=(0, (2, 3)))
    for x, lab in ((-2 * np.pi, "$-2\\pi$"), (-np.pi, "$-\\pi$"), (np.pi, "$\\pi$"), (2 * np.pi, "$2\\pi$")):
        ax.text(x, -0.75, lab, ha="center", color=NAVY, fontsize=10)
    ax.text(-6.6, -5.6, "5 intersections", color=GOLD_INK, fontsize=10)
    return fig


def p1_2022_mj_q09():
    fig, ax = new_axes((0, 212), (-1.4, 1.4), xlabel="x", ylabel="y")
    curve(ax, lambda x: np.sin(np.radians(2 * x)), 0, 180, label="$y=\\sin 2x$", label_at=(150, 0.95))
    dot(ax, 45, 1, "$(45^\\circ,1)$")
    dot(ax, 135, -1, "$(135^\\circ,-1)$", dy=-16, va="top")
    for x in (90, 180):
        ax.text(x + 4, 0.08, f"${x}^\\circ$", ha="left", color=NAVY, fontsize=10)
    return fig


def p1_2026_jan_q09():
    fig, ax = new_axes((-9, 9), (-12, 14))
    curve(ax, lambda x: -10 * np.cos(x), -9, 9, label="$y=f(x)=-10\\cos x$", label_at=(3.6, 11.6))
    curve(ax, lambda x: 10 - x ** 2, -4.4, 4.4, color=SECOND, label="$y=10-x^2$", label_at=(-8.8, 7.2))
    dot(ax, 0, 10, "$(0,10)$", dx=6)
    ax.text(-8.8, -11.2, "2 intersections", color=GOLD_INK, fontsize=10)
    return fig


def p2_2022_mj_q09():
    fig, ax = new_axes((0, 11), (0, 1.35), xlabel="t", ylabel="N")
    curve(ax, lambda t: 0.8 ** t, 0, 10.5, label="$N=\\lambda^t,\\ 0<\\lambda<1$", label_at=(4.2, 0.55))
    dot(ax, 0, 1, "$(0,1)$", dx=8, dy=4)
    return fig


def p2_2020_jan_q09():
    fig, ax = new_axes((-3, 1.6), (-1.5, 22))
    curve(ax, lambda x: 3 * 4 ** x, -3, 1.45, label="$y=3\\times4^x$", label_at=(0.45, 16))
    dot(ax, 0, 3, "$(0,3)$", dx=8, dy=-2)
    ax.text(-2.9, 1.4, "approaches the $x$-axis", color=GREY, fontsize=9.5)
    return fig


def p2_2019_oct_q05():
    fig, ax = new_axes((-3, 3.4), (-0.6, 8.5))
    curve(ax, lambda x: 0.5 ** x, -2.9, 3.3, label="$y=a^x,\\ 0<a<1$", label_at=(-1.7, 7.3))
    dot(ax, 0, 1, "$(0,1)$", dx=8, dy=4)
    return fig


def p2_2024_jan_q04():
    fig, ax = new_axes((-1.4, 6), (0, 10), xlabel="x", ylabel="y")
    curve(ax, lambda x: 4 + 0.5 ** x, -1.2, 6, label="decreasing", label_at=(-1.3, 7.3))
    hline(ax, 4, "$y=4$", at=4.8)
    dot(ax, 0, 5, "$(0,5)$", dx=8, dy=4)
    return fig


def p2_2024_mj_q06():
    fig, ax = new_axes((-4, 3), (0, 12), xlabel="x", ylabel="y")
    curve(ax, lambda x: 2 ** x + 4, -4, 2.9, label="$y=a^x+4,\\ a>1$", label_at=(0.5, 10.6))
    hline(ax, 4, "$y=4$", at=-3.8)
    dot(ax, 0, 5, "$(0,5)$", dx=-8, dy=4, ha="right")
    return fig


def m1_2019_oct_q06():
    fig, _ = speed_time([(0, 0), (10, 8), (30, 8)], tick_x=[(10, "$T$"), (30, "$30$")], tick_y=[(8, "$V$", 10)])
    return fig


def m1_2021_jan_q07():
    fig, _ = speed_time([(0, 0), (2.5, 24.5), (7.5, 5), (20, 5)],
                        tick_x=[(2.5, "$2.5$"), (7.5, "$2.5+T$"), (20, "$20$")], tick_y=[(24.5, "$24.5$", 2.5), (5, "$V$", 7.5)])
    return fig


def m1_2023_jan_q01():
    fig, _ = speed_time([(0, 0), (40, 20), (220, 20), (300, 0)],
                        tick_x=[(40, "$T$"), (220, "$T+180$"), (300, "$3T+180$")], tick_y=[(20, "$20$", 40)])
    return fig


def m1_2023_oct_q02():
    fig, _ = speed_time([(0, 8), (4, 6), (10, 6), (20, 18)],
                        tick_x=[(4, "$4$"), (10, "$10$"), (20, "$20$")], tick_y=[(8, "$8$", 0), (6, "$6$", 4), (18, "$18$", 20)])
    return fig


def m1_2025_jan_q02():
    fig, _ = speed_time([(0, 5), (12, 17), (28, 0)],
                        tick_x=[(12, "$T_1$"), (28, "$T_1+T_2$")], tick_y=[(5, "$5$", 0), (17, "$V$", 12)])
    return fig


def m1_2025_oct_q06():
    fig, ax = new_axes((0, 40), (-8, 5), xlabel="t (s)", ylabel="a (m s$^{-2}$)", size=(5.8, 3.6))
    ax.plot([0, 10], [3, 3], color=NAVY, lw=2.6)
    ax.plot([10, 30], [0, 0], color=NAVY, lw=2.6)
    ax.plot([30, 35], [-6, -6], color=NAVY, lw=2.6)
    for x in (10, 30, 35):
        ax.plot([x, x], [-7, 4], color=GREY, lw=0.9, ls=(0, (3, 3)))
    for x in (10, 30, 35):
        ax.text(x, -7.6, f"${x}$", ha="center", color=NAVY, fontsize=10.5)
    ax.text(-0.8, 3, "$3$", ha="right", va="center", color=NAVY)
    ax.text(-0.8, -6, "$-6$", ha="right", va="center", color=NAVY)
    return fig


def _v_shape(u, v, label_end):
    t1 = u / 9.8
    t2 = t1 + v / 9.8
    fig, ax = speed_time([(0, u), (t1, 0), (t2, v)], tick_x=[(t1, f"${t1:.3g}$"), (t2, label_end)],
                         tick_y=[(u, f"${u:g}$", 0)])
    # the final speed sits beside the end point, so close values (24 and 25) never overlap on the axis
    dot(ax, t2, v, f"${v:g}$ m s$^{{-1}}$", dx=-8, dy=4, ha="right")
    return fig


def m1_2022_jan_q04():
    return _v_shape(19.6, 29.4, "$5$")


def m1_2022_oct_q05():
    v = float(np.sqrt(29.4 ** 2 + 2 * 9.8 * 22.1))
    return _v_shape(29.4, round(v, 1), "$T$")


def m1_2024_jan_q06():
    return _v_shape(24, 25, "$5$")


def m1_2024_mj_q05():
    fig, _ = speed_time([(0, 0), (5, 49), (20, 4)], tick_x=[(5, "$5$"), (20, "$20$")], tick_y=[(49, "$49$", 5), (4, "$4$", 20)])
    return fig


def m1_2025_mj_q03():
    return _v_shape(16.6, 22.6, f"${(16.6 + 22.6) / 9.8:.2f}$")


# (course, question id, step index, drawer, alt text)
FIGURES = [
    ("wma11", "WMA11-01_2023_MayJune_Q03", 3, p1_2023_mj_q03, "Sketch of y = 3(x+2)^2 + 1"),
    ("wma11", "WMA11-01_2024_Jan_Q09", 0, p1_2024_jan_q09, "Sketch of y = f(x) with maximum (2, 20)"),
    ("wma11", "WMA11-01_2026_Jan_Q03", 5, p1_2026_jan_q03, "Shaded regions between y = x + 5 and y = x(x - 3)"),
    ("wma11", "WMA11-01_2020_Jan_Q10", 0, p1_2020_jan_q10, "Sketch of y = (4x - 3)(x - 5)^2"),
    ("wma11", "WMA11-01_2021_Jan_Q06", 0, p1_2021_jan_q06, "Sketch of y = -k/x"),
    ("wma11", "WMA11-01_2021_Oct_Q06", 0, p1_2021_oct_q06, "Sketch of y = 2(x + 1)(x - 3)^2"),
    ("wma11", "WMA11-01_2022_Oct_Q06", 4, p1_2022_oct_q06, "Sketches of y = k/x^2 and y = (2x - k)(x + 4)^2"),
    ("wma11", "WMA11-01_2023_Oct_Q04", 4, p1_2023_oct_q04, "Sketches of y = x(x + 2)^2 and y = 1/(x + 2)"),
    ("wma11", "WMA11-01_2025_MayJune_Q07", 3, p1_2025_mj_q07, "Sketches of C1 and C2 with their intersections"),
    ("wma11", "WMA11-01_2025_Oct_Q06", 2, p1_2025_oct_q06, "Sketch with asymptote x = 2k through (0, -2)"),
    ("wma11", "WMA11-01_2023_Jan_Q07", 0, p1_2023_jan_q07, "Sketch of y = 6/x"),
    ("wma11", "WMA11-01_2021_MayJune_Q09", 2, p1_2021_mj_q09, "Sketches of y = tan x and y = 1/x + 1"),
    ("wma11", "WMA11-01_2022_MayJune_Q09", 3, p1_2022_mj_q09, "Sketch of y = sin 2x"),
    ("wma11", "WMA11-01_2026_Jan_Q09", 1, p1_2026_jan_q09, "Sketches of y = -10 cos x and y = 10 - x^2"),
    ("wma12", "WMA12-01_2022_MayJune_Q09", 0, p2_2022_mj_q09, "Sketch of N = lambda^t"),
    ("wma12", "WMA12-01_2020_Jan_Q09", 0, p2_2020_jan_q09, "Sketch of y = 3 x 4^x"),
    ("wma12", "WMA12-01_2019_Oct_Q05", 0, p2_2019_oct_q05, "Sketch of y = a^x with 0 < a < 1"),
    ("wma12", "WMA12-01_2024_Jan_Q04", 2, p2_2024_jan_q04, "Decreasing curve through (0, 5) with asymptote y = 4"),
    ("wma12", "WMA12-01_2024_MayJune_Q06", 0, p2_2024_mj_q06, "Sketch of y = a^x + 4"),
    ("wme01", "WME01-01_2019_Oct_Q06", 0, m1_2019_oct_q06, "Speed-time graph"),
    ("wme01", "WME01-01_2021_Jan_Q07", 1, m1_2021_jan_q07, "Speed-time graph"),
    ("wme01", "WME01-01_2023_Jan_Q01", 1, m1_2023_jan_q01, "Speed-time graph"),
    ("wme01", "WME01-01_2023_Oct_Q02", 2, m1_2023_oct_q02, "Speed-time graph"),
    ("wme01", "WME01-01_2025_Jan_Q02", 0, m1_2025_jan_q02, "Speed-time graph"),
    ("wme01", "WME01-01_2025_Oct_Q06", 1, m1_2025_oct_q06, "Acceleration-time graph"),
    ("wme01", "WME01-01_2022_Jan_Q04", 4, m1_2022_jan_q04, "Speed-time graph"),
    ("wme01", "WME01-01_2022_Oct_Q05", 5, m1_2022_oct_q05, "Speed-time graph"),
    ("wme01", "WME01-01_2024_Jan_Q06", 6, m1_2024_jan_q06, "Speed-time graph"),
    ("wme01", "WME01-01_2024_MayJune_Q05", 6, m1_2024_mj_q05, "Speed-time graph"),
    ("wme01", "WME01-01_2025_MayJune_Q03", 5, m1_2025_mj_q03, "Speed-time graph"),
]


# ------------------------------------------------------------------ data file update
def load(course):
    path = ROOT / "ial" / course / f"{course}-data.js"
    text = path.read_text(encoding="utf-8")
    marker = f"window.{course.upper()}_QUESTIONS = "
    start = text.index(marker) + len(marker)
    data, length = json.JSONDecoder().raw_decode(text[start:])
    return path, text, start, length, data


def main() -> None:
    wanted = set(sys.argv[1:]) or {c for c, *_ in FIGURES}
    for course in sorted(wanted):
        path, text, start, length, questions = load(course)
        by_id = {q["id"]: q for q in questions}
        out_dir = ROOT / "assets" / "solution-diagrams" / course
        out_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for c, qid, step_index, drawer, alt in FIGURES:
            if c != course:
                continue
            q = by_id.get(qid)
            if not q or step_index >= len(q.get("steps", [])):
                raise SystemExit(f"{qid}: question or step {step_index} not found")
            fig = drawer()
            fig.tight_layout(pad=0.6)
            name = f"{qid}.png"
            fig.savefig(out_dir / name, dpi=170, facecolor="white")
            plt.close(fig)
            src = f"assets/solution-diagrams/{course}/{name}"
            for step in q["steps"]:  # one figure per question: drop an older placement first
                if any(f.get("src") == src for f in step.get("figures", [])):
                    step["figures"] = [f for f in step["figures"] if f.get("src") != src]
                    if not step["figures"]:
                        del step["figures"]
            q["steps"][step_index].setdefault("figures", []).append({"src": src, "alt": alt})
            count += 1
        new_text = text[:start] + json.dumps(questions, ensure_ascii=False, separators=(",", ":")) + text[start + length:]
        path.write_text(new_text, encoding="utf-8")
        print(f"{course}: {count} figures drawn and attached")


if __name__ == "__main__":
    main()
