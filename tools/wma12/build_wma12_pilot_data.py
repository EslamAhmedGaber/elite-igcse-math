from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / "private_output" / "wma12_crop_review" / "WMA12_2026_Jan"
PUBLIC_QUESTIONS = ROOT / "ial" / "wma12" / "questions"
DATA_PATH = ROOT / "ial" / "wma12" / "wma12-data.js"

TOPICS = [
    {"slug": "01_Proof", "name": "Proof"},
    {"slug": "02_Polynomials", "name": "Polynomials"},
    {"slug": "03_Circles", "name": "Circles"},
    {"slug": "04_BinomialExpansion", "name": "Binomial Expansion"},
    {"slug": "05_ArithmeticSequences", "name": "Arithmetic Sequences"},
    {"slug": "06_GeometricSequences", "name": "Geometric Sequences"},
    {"slug": "07_SequencesSeries", "name": "Sequences & Series"},
    {"slug": "08_ModellingSequencesSeries", "name": "Modelling with Sequences & Series"},
    {"slug": "09_LawsOfLogarithms", "name": "Laws of Logarithms"},
    {"slug": "10_TrigonometricEquations", "name": "Trigonometric Equations"},
    {"slug": "11_ApplicationsOfDifferentiation", "name": "Applications of Differentiation"},
    {"slug": "12_Integration", "name": "Integration"},
]


def step(title: str, body: str) -> dict[str, str]:
    return {"title": title, "body": body}


QUESTIONS = [
    {
        "qNo": 1,
        "marks": 6,
        "topic": "04_BinomialExpansion",
        "finalAnswer": r"$(a)\ 2187+5103kx+5103k^2x^2+2835k^3x^3.\quad (b)\ k=\dfrac35$.",
        "steps": [
            step("Use the binomial expansion", r"For $(3+kx)^7$, the first four terms are $3^7+\binom71 3^6(kx)+\binom72 3^5(kx)^2+\binom73 3^4(kx)^3$."),
            step("Simplify the coefficients", r"This gives $2187+5103kx+5103k^2x^2+2835k^3x^3$."),
            step("Compare the required coefficients", r"The coefficient of $x^2$ is $5103k^2$ and the coefficient of $x^3$ is $2835k^3$."),
            step("Solve for k", r"Since $5103k^2=3(2835k^3)$ and $k\ne0$, divide by $k^2$ to get $5103=8505k$, hence $k=\dfrac{5103}{8505}=\dfrac35$."),
        ],
    },
    {
        "qNo": 2,
        "marks": 6,
        "topic": "12_Integration",
        "finalAnswer": r"$(a)\ 12.35.\quad (b)$ Use narrower strips, or more trapezia. $\quad (c)\ 98.8$.",
        "steps": [
            step("Find the strip width", r"The $x$ values increase by $3$, so $h=3$."),
            step("Apply the trapezium rule", r"$A\approx \dfrac32\{1.3195+0.4665+2(1.0718+0.8706+0.7071+0.5743)\}$."),
            step("Calculate the estimated area", r"$A\approx \dfrac32(8.2336)=12.3504$, so the area is $12.35$ to 2 decimal places."),
            step("Improve the estimate", r"A more accurate estimate would use more trapezia, so the strip width is smaller."),
            step("Use the scale factor in the integral", r"Since $2^{3-0.1x}=8\cdot2^{-0.1x}$, the required estimate is $8(12.35)=98.8$."),
        ],
    },
    {
        "qNo": 3,
        "marks": 7,
        "topic": "02_Polynomials",
        "finalAnswer": r"$(i)\ 574.\quad (ii)\ Q(x)=3x^2-12x+\dfrac{15}{2},\ R=-\dfrac{29}{2}$.",
        "steps": [
            step("Use the factor theorem", r"Since $(x+2)$ is a factor of $f(x)=4x^3+6x+k$, we have $f(-2)=0$."),
            step("Find k", r"$4(-2)^3+6(-2)+k=0$, so $-32-12+k=0$ and $k=44$."),
            step("Find the required remainder", r"The remainder on division by $(x-5)$ is $f(5)=4(5)^3+6(5)+44=574$."),
            step("Set up the division", r"Write $6x^3-15x^2-21x+8=(2x+3)(Ax^2+Bx+C)+R$."),
            step("Match coefficients", r"Comparing coefficients gives $A=3$, $B=-12$, and $C=\dfrac{15}{2}$."),
            step("Find the remainder", r"Then $(2x+3)\left(3x^2-12x+\dfrac{15}{2}\right)=6x^3-15x^2-21x+\dfrac{45}{2}$, so $R=8-\dfrac{45}{2}=-\dfrac{29}{2}$."),
        ],
    },
    {
        "qNo": 4,
        "marks": 5,
        "topic": "12_Integration",
        "finalAnswer": r"$k=\dfrac12$ or $k=3$.",
        "steps": [
            step("Integrate first", r"$\int\left(\dfrac{12}{x^2}+4\right)\,dx=\int(12x^{-2}+4)\,dx=-\dfrac{12}{x}+4x$."),
            step("Apply the limits", r"$\left[-\dfrac{12}{x}+4x\right]_k^{2k}=\left(-\dfrac6k+8k\right)-\left(-\dfrac{12}{k}+4k\right)=\dfrac6k+4k$."),
            step("Form a quadratic", r"Given the integral is $14$, $\dfrac6k+4k=14$. Multiplying by $k$ gives $4k^2-14k+6=0$, so $2k^2-7k+3=0$."),
            step("Solve for k", r"$(2k-1)(k-3)=0$, hence $k=\dfrac12$ or $k=3$. Both are positive, so both are valid."),
        ],
    },
    {
        "qNo": 5,
        "marks": 6,
        "topic": "03_Circles",
        "finalAnswer": r"$(a)(i)\ (3,-\dfrac52).\quad (a)(ii)\ \dfrac{15}{2}.\quad (b)\ k=5\sqrt6-3$.",
        "steps": [
            step("Complete the square", r"$x^2-6x=(x-3)^2-9$ and $y^2+5y=\left(y+\dfrac52\right)^2-\dfrac{25}{4}$."),
            step("Write the circle in centre-radius form", r"The equation becomes $(x-3)^2+\left(y+\dfrac52\right)^2=\dfrac{225}{4}$."),
            step("Read the centre and radius", r"The centre is $\left(3,-\dfrac52\right)$ and the radius is $\sqrt{\dfrac{225}{4}}=\dfrac{15}{2}$."),
            step("Use the touching condition", r"The centre of $C_2$ is $(-k,0)$ and its radius is $5$. Since the circles touch externally, the distance between centres is $\dfrac{15}{2}+5=\dfrac{25}{2}$."),
            step("Solve for k", r"$(k+3)^2+\left(\dfrac52\right)^2=\left(\dfrac{25}{2}\right)^2$, so $(k+3)^2=150$. Since $k>0$, $k+3=5\sqrt6$, hence $k=5\sqrt6-3$."),
        ],
    },
    {
        "qNo": 6,
        "marks": 8,
        "topic": "01_Proof",
        "secondaryTopics": ["11_ApplicationsOfDifferentiation"],
        "finalAnswer": r"$(i)$ Proven. $\quad (ii)$ $C$ has no stationary points.",
        "steps": [
            step("Represent the consecutive odd numbers", r"Let $q=2n-1$ and $p=2n+1$, where $n$ is a positive integer. Then $p>q>0$ and the numbers are consecutive odd numbers."),
            step("Subtract the squares", r"$p^2-q^2=(2n+1)^2-(2n-1)^2$."),
            step("Simplify the expression", r"$p^2-q^2=(4n^2+4n+1)-(4n^2-4n+1)=8n$."),
            step("Conclude the proof", r"Since $n$ is an integer, $8n$ is a multiple of $8$, so $p^2-q^2$ is a multiple of $8$."),
            step("Differentiate the curve", r"For $y=x^3+12x^2+49x+2$, $\dfrac{dy}{dx}=3x^2+24x+49$."),
            step("Show the gradient is never zero", r"$3x^2+24x+49=3(x+4)^2+1$. This is always positive for real $x$."),
            step("State the conclusion", r"Since $\dfrac{dy}{dx}$ is never $0$, the curve has no stationary points."),
        ],
    },
    {
        "qNo": 7,
        "marks": 9,
        "topic": "09_LawsOfLogarithms",
        "finalAnswer": r"$(i)\ x=\dfrac{17}{6}+\dfrac16\log_2 5.\quad (ii)\ y=-5$.",
        "steps": [
            step("Take logarithms base 2", r"From $8^{2x-5}=20$, take $\log_2$ of both sides to get $(2x-5)\log_2 8=\log_2 20$."),
            step("Simplify the logarithms", r"Since $\log_2 8=3$ and $\log_2 20=\log_2(4\cdot5)=2+\log_2 5$, we get $3(2x-5)=2+\log_2 5$."),
            step("Solve for x", r"$6x-15=2+\log_2 5$, so $6x=17+\log_2 5$ and $x=\dfrac{17}{6}+\dfrac16\log_2 5$."),
            step("Use log laws", r"$3=\log_3 27$ and $2\log_3(4-y)=\log_3(4-y)^2$."),
            step("Remove the logarithms", r"$\log_3(13+2y)+\log_3 27=\log_3(4-y)^2$, so $27(13+2y)=(4-y)^2$."),
            step("Solve the quadratic", r"$351+54y=y^2-8y+16$, hence $y^2-62y-335=0=(y-67)(y+5)$."),
            step("Check the logarithm domains", r"We need $13+2y>0$ and $4-y>0$. Therefore $y=67$ is not valid, and the solution is $y=-5$."),
        ],
    },
    {
        "qNo": 8,
        "marks": 10,
        "topic": "10_TrigonometricEquations",
        "finalAnswer": r"$(i)\ \theta=51.9^\circ,\ 68.1^\circ,\ 141.9^\circ,\ 158.1^\circ.\quad (ii)\ x=\dfrac{2\pi}{3},\ \dfrac{4\pi}{3}$.",
        "steps": [
            step("Make the tangent expression the subject", r"$4\tan^2(2\theta-30^\circ)+1=49$ gives $\tan^2(2\theta-30^\circ)=12$."),
            step("Find the possible angle values", r"Let $\alpha=2\theta-30^\circ$. Since $0\leq\theta<180^\circ$, $-30^\circ\leq\alpha<330^\circ$. The solutions of $\tan\alpha=\pm\sqrt{12}$ in this range are approximately $73.9^\circ,106.1^\circ,253.9^\circ,286.1^\circ$."),
            step("Return to theta", r"$\theta=\dfrac{\alpha+30^\circ}{2}$, giving $\theta=51.9^\circ,68.1^\circ,141.9^\circ,158.1^\circ$ to one decimal place."),
            step("Rewrite tan x", r"$2\tan x\sin x+3=0$ becomes $2\left(\dfrac{\sin x}{\cos x}\right)\sin x+3=0$."),
            step("Form a quadratic in cos x", r"Multiplying by $\cos x$ gives $2\sin^2 x+3\cos x=0$. Using $\sin^2x=1-\cos^2x$, $2(1-\cos^2x)+3\cos x=0$, so $2\cos^2x-3\cos x-2=0$."),
            step("Solve for x", r"$(2\cos x+1)(\cos x-2)=0$. Since $\cos x=2$ is impossible, $\cos x=-\dfrac12$. In $0\leq x<2\pi$, $x=\dfrac{2\pi}{3}$ or $x=\dfrac{4\pi}{3}$."),
        ],
    },
    {
        "qNo": 9,
        "marks": 10,
        "topic": "08_ModellingSequencesSeries",
        "secondaryTopics": ["05_ArithmeticSequences", "06_GeometricSequences"],
        "finalAnswer": r"$(a)\ 11000$ tonnes. $\quad (b)\ 149250$ tonnes. $\quad (c)\ 8980$ tonnes. $\quad (d)\ 351500$ tonnes.",
        "steps": [
            step("Model A as an arithmetic sequence", r"For Model A, let the common difference be $d$. Since year 15 is the 15th term, $7500=12400+14d$."),
            step("Find year 5 for Model A", r"$d=\dfrac{7500-12400}{14}=-350$. Year 5 is $12400+4(-350)=11000$ tonnes."),
            step("Find the total from year 1 to year 15", r"$S_{15}=\dfrac{15}{2}(12400+7500)=149250$ tonnes."),
            step("Model B as a geometric sequence", r"Let the common ratio be $r$. Then $7500=12400r^{14}$, so $r=\left(\dfrac{7500}{12400}\right)^{1/14}\approx0.964723$."),
            step("Find year 10 for Model B", r"Year 10 is $12400r^9\approx8975.26$, which is $8980$ tonnes to the nearest 10 tonnes."),
            step("Find the limiting total", r"Since $0<r<1$, the sum to infinity is $S_\infty=\dfrac{12400}{1-r}\approx351508.1$, so the limit is $351500$ tonnes to the nearest 100 tonnes."),
        ],
    },
    {
        "qNo": 10,
        "marks": 8,
        "topic": "11_ApplicationsOfDifferentiation",
        "secondaryTopics": ["12_Integration"],
        "finalAnswer": r"$(a)\ x=2\sqrt5.\quad (b)\ k=\dfrac{10\sqrt{21}}{3}$.",
        "steps": [
            step("Rewrite the curve", r"$y=\dfrac{\sqrt{x}(100-x^2)}{40}=\dfrac52x^{1/2}-\dfrac1{40}x^{5/2}$."),
            step("Differentiate", r"$\dfrac{dy}{dx}=\dfrac54x^{-1/2}-\dfrac1{16}x^{3/2}$."),
            step("Use the stationary point", r"At $P$, $\dfrac{dy}{dx}=0$. Thus $\dfrac54x^{-1/2}=\dfrac1{16}x^{3/2}$. Multiplying by $16x^{1/2}$ gives $20=x^2$."),
            step("Find the x-coordinate", r"Since $x\geq0$, $x=\sqrt{20}=2\sqrt5$."),
            step("Integrate the curve", r"$\int y\,dx=\int\left(\dfrac52x^{1/2}-\dfrac1{40}x^{5/2}\right)dx=\dfrac53x^{3/2}-\dfrac1{140}x^{7/2}$."),
            step("Use equal areas", r"The signed area from $0$ to $k$ is zero because the positive area $R_1$ equals the negative area $R_2$ in magnitude."),
            step("Solve for k", r"$\dfrac53k^{3/2}-\dfrac1{140}k^{7/2}=0$. Since $k>0$, divide by $k^{3/2}$ to get $\dfrac53-\dfrac{k^2}{140}=0$, so $k^2=\dfrac{700}{3}$."),
            step("Write the exact value", r"$k=\sqrt{\dfrac{700}{3}}=\dfrac{10\sqrt{21}}{3}$."),
        ],
    },
]


def topic_name(slug: str) -> str:
    return next(topic["name"] for topic in TOPICS if topic["slug"] == slug)


def build() -> None:
    PUBLIC_QUESTIONS.mkdir(parents=True, exist_ok=True)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    enriched: list[dict] = []
    counts = {topic["slug"]: {"primary": 0, "total": 0} for topic in TOPICS}
    for item in QUESTIONS:
        q_no = int(item["qNo"])
        primary = item["topic"]
        secondary = list(item.get("secondaryTopics", []))
        all_topics = [primary, *secondary]
        counts[primary]["primary"] += 1
        for slug in all_topics:
            counts[slug]["total"] += 1
        src = REVIEW / f"WMA12_2026_Jan_Q{q_no:02d}_M{int(item['marks']):02d}.png"
        if not src.exists():
            raise FileNotFoundError(src)
        dst_name = f"WMA12-01_Y2026_Jan_Q{q_no:02d}_M{int(item['marks']):02d}_{primary}.png"
        shutil.copy2(src, PUBLIC_QUESTIONS / dst_name)
        enriched.append(
            {
                "id": f"WMA12-01_2026_Jan_Q{q_no:02d}",
                "year": 2026,
                "session": "Jan",
                "paperCode": "WMA12-01",
                "paper": "WMA12/01 January 2026",
                "qNo": q_no,
                "marks": int(item["marks"]),
                "topic": primary,
                "topicName": topic_name(primary),
                "primaryTopic": primary,
                "primaryTopicName": topic_name(primary),
                "secondaryTopics": secondary,
                "secondaryTopicNames": [topic_name(slug) for slug in secondary],
                "topics": all_topics,
                "topicNames": [topic_name(slug) for slug in all_topics],
                "image": f"ial/wma12/questions/{dst_name}",
                "downloadName": dst_name,
                "finalAnswer": item["finalAnswer"],
                "steps": item["steps"],
                "status": "checked",
                "checkedBy": "Dr Eslam Ahmed",
                "updated": "2026-06-11T00:00:00",
            }
        )

    topics = []
    for topic in TOPICS:
        count = counts[topic["slug"]]["total"]
        primary_count = counts[topic["slug"]]["primary"]
        topics.append(
            {
                **topic,
                "primaryCount": primary_count,
                "count": count,
                "crossCount": max(0, count - primary_count),
            }
        )

    data = (
        "window.WMA12_TOPICS = "
        + json.dumps(topics, ensure_ascii=False, separators=(",", ":"))
        + ";\nwindow.WMA12_QUESTIONS = "
        + json.dumps(enriched, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    DATA_PATH.write_text(data, encoding="utf-8")
    print(f"Wrote {DATA_PATH}")
    print(f"Copied {len(enriched)} question images to {PUBLIC_QUESTIONS}")


if __name__ == "__main__":
    build()
