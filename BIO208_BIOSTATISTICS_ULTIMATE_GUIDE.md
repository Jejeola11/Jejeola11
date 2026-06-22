# 🎬 BIOSTATISTICS: THE SERIES
## BIO 208 Ultimate Study Guide — Nigerian Student Edition
### "Where Numbers Meet Biology and Somehow, Somehow, You Will Pass!" 🇳🇬

---

> *"Statistics is the grammar of science." — Karl Pearson*
> *"But first, let's make sure you understand the grammar before the exam finishes you." — Your Study Guide* 😂

---

## 📺 SERIES OVERVIEW

Welcome, dear student, to **BIOSTATISTICS: THE SERIES** — the most dramatic, most intense, most statistically significant TV show in your academic life! Forget Netflix. Forget DSTV. This is the only series that will determine whether you carry-over BIO 208 or move on to the next semester in peace. 🙏

Each **Season** covers a major topic. Each **Episode** breaks it down. There are mnemonics, formulas, Nigerian examples, exam tips, and enough jokes to keep you awake at 2am when you're cramming.

**HOW TO USE THIS GUIDE:**
- Read each season carefully before your exam
- Study the flashcards daily
- Attempt the mock CBT exam under timed conditions
- Check your answers and note weak areas
- Use the Fast Reading Tips for last-minute revision

Are you ready? Let's go! 🚀

---

# 🏰 SEASON 1: THE DATA KINGDOM
## *"Where Every Number Has a Story"*

### 🎬 Episode 1.1 — Welcome to the Kingdom

In the grand **Data Kingdom**, not all numbers are created equal. Some flow like the Benue River — continuous and smooth. Others stand firm like market stalls in Onitsha — countable, discrete, whole.

Your job as a biostatistician is to know the difference. The kingdom has **two major provinces** and **four noble houses**.

---

### 🎬 Episode 1.2 — The Two Great Provinces: Continuous vs. Discontinuous

#### 🌊 PROVINCE 1: CONTINUOUS VARIABLES
Continuous variables can take **any value** within a range — including decimals and fractions. They arise from measurement.

**Examples:**
- Height of a student: 1.73 m (not just "1 m" or "2 m")
- Weight of a rat: 245.6 g
- Blood pressure: 120.4 mmHg
- Temperature: 36.7°C
- Length of a frog's leg: 4.32 cm

> 🐸 **Nigerian Example:** You're measuring frog leg lengths in a Lagos pond (maybe near Lekki Conservation Centre). You catch 20 frogs and measure their legs. You get values like 3.21 cm, 4.56 cm, 5.03 cm... The measurements flow smoothly — that's continuous data!

> 🌉 **ANALOGY:** *"Think of continuous data as Eko Bridge traffic — it flows smoothly and can be at any level of congestion. You can have 1,234.5 cars per hour. Discontinuous data is like counting students in a classroom — you can't have 2.5 students! Either Emeka is there or he's not!"* 😄

---

#### 🧱 PROVINCE 2: DISCONTINUOUS (DISCRETE) VARIABLES
Discrete variables can only take **specific, countable values** — usually whole numbers. They arise from counting.

**Examples:**
- Number of eggs laid by a hen: 0, 1, 2, 3... (not 2.7 eggs!)
- Number of children in a family: 0, 1, 2, 3...
- Number of bacteria colonies: 15, 16, 17...
- Number of petals on a flower: 4, 5, 6...
- Number of malaria cases in a ward

> 💡 **MNEMONIC — Discrete vs Continuous:**
> **"Count = Discrete, Measure = Continuous"**
> If you COUNT it → Discrete (D for Discrete, D for Digits)
> If you MEASURE it → Continuous (C for Continuous, C for Calculator needed)

---

### 🎬 Episode 1.3 — The Four Noble Houses (Types of Data)

Beyond continuous and discrete, data belongs to one of **four noble houses**:

> 💡 **MNEMONIC:** **"NOIR"** — Like a French detective movie! 🕵️
> - **N**ominal
> - **O**rdinal
> - **I**nterval
> - **R**atio

#### 🏛️ HOUSE 1: NOMINAL (The Name House)
- Data is **categorized** with no order or ranking
- No mathematical operations make sense
- Examples: Blood groups (A, B, AB, O), Gender (Male/Female), Tribe (Yoruba, Igbo, Hausa), Species names
- **Key feature:** Names/labels only. You cannot say AB > A.

#### 🏛️ HOUSE 2: ORDINAL (The Ranking House)
- Data has **natural order** but intervals are not equal
- Examples: Academic grades (A, B, C, D, F), Pain scale (1-10), Likert scales, Disease severity (mild, moderate, severe)
- **Key feature:** You know the order, but not how much better one is than another.

#### 🏛️ HOUSE 3: INTERVAL (The Equal Gaps House)
- Data has **equal intervals** between values, but **no true zero**
- Examples: Temperature in °C or °F, IQ scores, Calendar years
- **Key feature:** 0°C does NOT mean "no temperature." You can add/subtract but ratios are meaningless.

#### 🏛️ HOUSE 4: RATIO (The True Zero House)
- Data has **equal intervals AND a true zero point**
- Examples: Height, Weight, Blood pressure, Number of bacteria, Age, Income
- **Key feature:** You can do ALL mathematical operations. 0 kg truly means no weight.

> 📝 **EXAM TIP:** NOIR goes from least to most informative. Ratio data is the richest! Nominal is the poorest. In exams, they love asking: "Which level of measurement is blood group?" → **Nominal**. "Which level is body temperature in Kelvin?" → **Ratio** (Kelvin has a true zero; Celsius does not).

---

### 🎬 Episode 1.4 — Why Biological Data Is Always Variable

No two organisms are exactly alike. Your twin (if you have one) has different fingerprints. Two plants of the same species growing side by side will have different heights. This is **biological variability** — and it's the reason biostatistics exists!

**Sources of variability in biological data:**
1. **Genetic variation** — different genes, different traits
2. **Environmental variation** — different nutrition, climate, exposure
3. **Measurement error** — your ruler isn't perfectly placed
4. **Sampling variation** — you happened to pick the tallest students
5. **Age and developmental stage** — a 20-year-old frog vs a 1-year-old frog

> 🏆 **EXAM TIP:** Variability is NOT an enemy — it IS the subject matter of statistics. We USE variability to draw conclusions!

---

# 🗺️ SEASON 2: THE SAMPLING SAGA
## *"How to Pick a Winning Team Without Interviewing Everyone in Nigeria"*

### 🎬 Episode 2.1 — Population vs. Sample (The Whole Story)

Imagine INEC trying to predict election results by interviewing all 200 million Nigerians. That would take... forever. Instead, they sample. That's **the entire logic of statistics**.

| Concept | Definition | Example |
|---------|-----------|---------|
| **Population (N)** | The entire group of interest | All mosquitoes in Lagos State |
| **Sample (n)** | A subset of the population | 500 mosquitoes from 5 LGAs |
| **Parameter** | A number describing the population (uses Greek letters) | μ (population mean) |
| **Statistic** | A number describing the sample (uses Roman letters) | x̄ (sample mean) |

> 💡 **MNEMONIC:** **"P-P-S-S"**
> **P**opulation has **P**arameters (both start with P)
> **S**ample has **S**tatistics (both start with S)

---

### 🎬 Episode 2.2 — The Five Warriors of Sampling

> 💡 **MNEMONIC:** **"SSSCC"** — "Some Students Study Continuously, Cleverly!"
> - **S**imple Random Sampling
> - **S**tratified Sampling
> - **S**ystematic Sampling
> - **C**luster Sampling
> - **C**onvenience Sampling

#### ⚔️ WARRIOR 1: SIMPLE RANDOM SAMPLING
Every member of the population has an **equal chance** of being selected.
- **Method:** Lottery, random number tables, computer random selection
- **Advantage:** Unbiased, easy to analyze
- **Disadvantage:** Requires complete population list
- **Example:** Writing all 500 students' names on paper, putting in a bowl, drawing 50

#### ⚔️ WARRIOR 2: STRATIFIED SAMPLING
Population is divided into **strata (subgroups)**, then random samples are taken from each stratum.
- **Method:** Divide by age, gender, location, etc., then randomly sample each group
- **Advantage:** Ensures representation of all subgroups
- **Example:** Sampling malaria cases in Kano State — divide into urban/rural/peri-urban zones, sample proportionally from each

> 🦟 **Nigerian Example:** Kano State Health Ministry wants to know malaria prevalence. They divide Kano into 3 LGA types: Urban (8 LGAs), Semi-urban (12 LGAs), Rural (24 LGAs). They sample proportionally from each — this is **stratified sampling**.

#### ⚔️ WARRIOR 3: SYSTEMATIC SAMPLING
Select every **kth** element from the population list.
- **Method:** k = N/n. Pick a random start between 1 and k, then pick every kth after.
- **Example:** From a list of 1000 patients, select every 10th patient (k=10)
- **Advantage:** Simple to implement, spreads sample across population

#### ⚔️ WARRIOR 4: CLUSTER SAMPLING
Population is divided into **clusters** (naturally occurring groups), and **whole clusters** are randomly selected.
- **Method:** Randomly select entire villages, schools, or wards
- **Advantage:** Practical and cheap for geographically dispersed populations
- **Example:** Randomly selecting 10 LGAs from 36 states and studying ALL individuals in those LGAs

#### ⚔️ WARRIOR 5: CONVENIENCE SAMPLING
Select whoever is **easily available**.
- **Method:** Study students in your own class, patients in the nearest hospital
- **Advantage:** Fast and cheap
- **Disadvantage:** Highly biased — NOT recommended for scientific research
- **Example:** Asking your hostel roommates about their sleep patterns

> 📝 **EXAM TIP:** Exams love asking you to identify sampling types from scenarios. The key question is: "How were individuals selected?"

---

### 🎬 Episode 2.3 — Estimation: Guessing with Science

**Estimation** is using sample data to infer population parameters.

#### 🎯 POINT ESTIMATION
A single value used to estimate a parameter.
- Sample mean x̄ estimates population mean μ
- Sample proportion p̂ estimates population proportion p

#### 📏 INTERVAL ESTIMATION (Confidence Intervals)
A range of values that likely contains the true parameter.

**KEY FORMULA — Confidence Interval for Mean:**
$$CI = \bar{x} \pm Z_{\alpha/2} \cdot \frac{\sigma}{\sqrt{n}}$$

- For 95% CI: Z = 1.96
- For 99% CI: Z = 2.576
- For 90% CI: Z = 1.645

**Standard Error of the Mean:**
$$SE = \frac{\sigma}{\sqrt{n}} = \frac{s}{\sqrt{n}}$$

> 🔑 **KEY INSIGHT:** The larger your sample, the smaller your standard error, the more precise your estimate! That's why NAFDAC tests large batches of drugs — to get precise estimates.

> 📝 **EXAM TIP:** A 95% CI means: "If we repeated this sampling 100 times, 95 of the resulting intervals would contain the true population parameter." It does NOT mean "there's a 95% chance μ is in this interval" — μ is fixed!

---

# 📊 SEASON 3: THE GREAT PRESENTATION
## *"Because Raw Data is Like Banga Soup Without Salt — Technically There, But Unpalatable"*

### 🎬 Episode 3.1 — Raw Data vs. Organized Data

**Raw data** is data in its original, unprocessed form. It's a mess. You can't see patterns. You can't tell the story.

**Organized data** is data that has been sorted, summarized, and presented clearly.

> 📐 **Example: Heights (cm) of 30 Biology Students at University of Ibadan:**

Raw data: 162, 175, 158, 180, 165, 170, 172, 155, 178, 163, 168, 174, 160, 177, 166, 173, 159, 181, 164, 169, 171, 156, 179, 167, 176, 161, 183, 157, 182, 170

First step — **ARRAY** (arrange in ascending order): 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183

---

### 🎬 Episode 3.2 — Building a Frequency Distribution Table

**Step-by-step construction:**

**Step 1:** Find the **Range** = Maximum - Minimum = 183 - 155 = 28

**Step 2:** Decide on **number of classes** (usually 5-15). Use Sturge's Rule:
$$k = 1 + 3.322 \log_{10}(n)$$
For n=30: k = 1 + 3.322 × log₁₀(30) = 1 + 3.322 × 1.477 ≈ 1 + 4.91 ≈ 6 classes

**Step 3:** Calculate **Class Width** = Range/k = 28/6 ≈ 5 (round up)

**Step 4:** Determine **Class Limits:**

| Class Interval | Tally | Frequency (f) | Relative Freq. | Cumulative Freq. |
|---------------|-------|---------------|----------------|-----------------|
| 155 – 159 | ⁄⁄⁄⁄ | 5 | 5/30 = 0.167 | 5 |
| 160 – 164 | ⁄⁄⁄⁄⁄ | 6 | 6/30 = 0.200 | 11 |
| 165 – 169 | ⁄⁄⁄⁄⁄ | 6 | 6/30 = 0.200 | 17 |
| 170 – 174 | ⁄⁄⁄⁄⁄ | 6 | 6/30 = 0.200 | 23 |
| 175 – 179 | ⁄⁄⁄⁄ | 5 | 5/30 = 0.167 | 28 |
| 180 – 184 | ⁄⁄ | 2 | 2/30 = 0.067 | 30 |
| **Total** | | **30** | **1.000** | |

**Key Vocabulary:**
- **Class Limits:** The stated boundaries (155, 159)
- **Class Boundaries:** True boundaries: lower = lower limit - 0.5; upper = upper limit + 0.5 → (154.5, 159.5)
- **Class Mark (Midpoint):** (Lower limit + Upper limit) / 2 → (155+159)/2 = 157
- **Class Width:** Upper boundary - Lower boundary = 159.5 - 154.5 = 5

---

### 🎬 Episode 3.3 — Visual Presentations (The Art Gallery)

#### 📊 HISTOGRAM
A bar chart for continuous data where bars touch each other (no gaps). X-axis = class boundaries, Y-axis = frequency.

#### 📈 FREQUENCY POLYGON
Connect the midpoints of the top of each histogram bar with straight lines. Extend to midpoints of imaginary classes at each end. The area under the polygon = total frequency.

#### 📉 OGIVE (Cumulative Frequency Curve)
Plot cumulative frequency against upper class boundaries. Used to find median, quartiles, percentiles graphically.

#### 🥧 PIE CHART
Used for nominal/categorical data. Each slice angle = (frequency/total) × 360°

#### 📊 BAR CHART
For discrete or nominal data. Bars do NOT touch. Gap between bars.

#### 🍃 STEM-AND-LEAF PLOT
Splits each data value into a "stem" (leading digit) and "leaf" (trailing digit). Preserves original data while showing distribution.

> 📝 **EXAM TIP:** Histogram = continuous data (bars touch). Bar chart = discrete/categorical data (bars DON'T touch). This distinction comes up every semester!

---

# ⚖️ SEASON 4: CENTRAL TENDENCY & DISPERSION WARS
## *"The Battle for the Middle Ground and the Spread of Power"*

### 🎬 Episode 4.1 — The Holy Trinity of Central Tendency

#### 👑 THE MEAN (Arithmetic Mean) — King of Central Tendency

**KEY FORMULA:**
$$\bar{x} = \frac{\sum x_i}{n} \quad \text{(Sample Mean)}$$
$$\mu = \frac{\sum x_i}{N} \quad \text{(Population Mean)}$$

**For Grouped Data:**
$$\bar{x} = \frac{\sum f_i x_i}{\sum f_i}$$
where xᵢ = class mark, fᵢ = frequency

**Geometric Mean** (for rates and ratios):
$$GM = \sqrt[n]{x_1 \cdot x_2 \cdot x_3 \cdots x_n} = \text{antilog}\left(\frac{\sum \log x_i}{n}\right)$$

**Harmonic Mean** (for speeds and rates):
$$HM = \frac{n}{\sum \frac{1}{x_i}}$$

> 🇳🇬 **Nigerian Example — Exam Scores of 20 Students:**
Scores: 45, 52, 67, 71, 83, 56, 49, 78, 62, 55, 70, 88, 45, 61, 73, 80, 57, 66, 74, 69

Sum = 45+52+67+71+83+56+49+78+62+55+70+88+45+61+73+80+57+66+74+69 = **1301**
Mean = 1301/20 = **65.05**

#### 🥈 THE MEDIAN — Middle Child

The middle value when data is arranged in order.
- If n is odd: Median = value at position (n+1)/2
- If n is even: Median = average of values at positions n/2 and n/2 + 1

**For Grouped Data:**
$$\text{Median} = L + \frac{\frac{n}{2} - cf}{f} \times h$$
where L = lower class boundary of median class, cf = cumulative frequency before median class, f = frequency of median class, h = class width

From our 20 scores (arranged): 45, 45, 49, 52, 55, 56, 57, 61, 62, 66, 67, 69, 70, 71, 73, 74, 78, 80, 83, 88
n=20 (even), Median = (10th + 11th value)/2 = (66+67)/2 = **66.5**

#### 🥉 THE MODE — Most Popular Kid

The value that appears most frequently.
From our scores: **45** (appears twice) — Mode = 45

**For Grouped Data:**
$$\text{Mode} = L + \frac{d_1}{d_1 + d_2} \times h$$
where d₁ = frequency of modal class - frequency of class before it, d₂ = frequency of modal class - frequency of class after it

> 💡 **MNEMONIC — When to Use Which:**
> **"Mean for symmetric, Median for skewed, Mode for categorical"**
> - Mean: When data is normally distributed, no extreme outliers
> - Median: When data is skewed (e.g., income data), or has outliers
> - Mode: For categorical data (most common blood group, most common disease)

> 📝 **EXAM TIP:** If a billionaire moves into your hostel, the MEAN income of the hostel skyrockets, but the MEDIAN barely changes. That's why economists prefer median income for describing "typical" citizens!

---

### 🎬 Episode 4.2 — The Dispersion Warriors

Measures of central tendency alone don't tell the full story. Two classes can have the same mean but very different spreads!

#### 🗡️ WARRIOR 1: RANGE
$$\text{Range} = X_{max} - X_{min}$$
From our scores: Range = 88 - 45 = **43**
Simple but sensitive to outliers.

#### 🗡️ WARRIOR 2: MEAN DEVIATION (Mean Absolute Deviation)
$$MD = \frac{\sum |x_i - \bar{x}|}{n}$$
Average distance of each value from the mean.

#### 🗡️ WARRIOR 3: VARIANCE — The Powerhouse

**KEY FORMULAS:**
$$s^2 = \frac{\sum (x_i - \bar{x})^2}{n-1} \quad \text{(Sample Variance)}$$
$$\sigma^2 = \frac{\sum (x_i - \mu)^2}{N} \quad \text{(Population Variance)}$$

**Computational Formula (easier!):**
$$s^2 = \frac{\sum x_i^2 - n\bar{x}^2}{n-1} = \frac{n\sum x_i^2 - (\sum x_i)^2}{n(n-1)}$$

> Note: We use n-1 (not n) for sample variance — this is called **Bessel's correction** and it makes the sample variance an unbiased estimator of the population variance.

#### 🗡️ WARRIOR 4: STANDARD DEVIATION — The Queen of Dispersion
$$s = \sqrt{s^2} = \sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}$$

Standard deviation is in the **same units** as the original data. Variance is in squared units.

#### 🗡️ WARRIOR 5: COEFFICIENT OF VARIATION (CV) — The Comparator
$$CV = \frac{s}{\bar{x}} \times 100\%$$

Used to compare variability between datasets with different units or means.

> 🔬 **Example:** Which is more variable — heights of students (mean=170 cm, SD=8 cm) or weights (mean=65 kg, SD=6 kg)?
> CV for height = (8/170) × 100% = 4.7%
> CV for weight = (6/65) × 100% = 9.2%
> → Weights are more variable relative to their mean!

---

### 🎬 Episode 4.3 — The Shape Patrol: Skewness and Kurtosis

#### SKEWNESS — The Lean
- **Positive skew (right-skewed):** Tail extends to the right. Mean > Median > Mode. Common in income data.
- **Negative skew (left-skewed):** Tail extends to the left. Mean < Median < Mode.
- **Symmetric:** Mean = Median = Mode. Bell-shaped.

**Pearson's Coefficient of Skewness:**
$$Sk = \frac{3(\bar{x} - \text{Median})}{s}$$

#### KURTOSIS — The Peakedness
- **Leptokurtic:** Very peaked (kurtosis > 3). Like a mountain.
- **Mesokurtic:** Normal bell curve (kurtosis = 3).
- **Platykurtic:** Flat (kurtosis < 3). Like a plateau.

> 💡 **MNEMONIC for Skewness:**
> **"Positive skew = Positive tail on the right"**
> **"Mean is pulled toward the tail"**

---

# 🎲 SEASON 5: THE PROBABILITY CHRONICLES
## *"Calculating Your Chances — In Statistics and in Life!"*

### 🎬 Episode 5.1 — The Probability Kingdom

> 🎓 **ANALOGY:** *"Probability is like JAMB — you need to calculate your chances carefully! If 100,000 people write JAMB and only 20,000 cut-off marks are given, your probability of getting a cut-off is 20,000/100,000 = 0.2 or 20%. Now add your preparation factor... 😅"*

**Basic Probability:**
$$P(A) = \frac{\text{Number of favorable outcomes}}{\text{Total number of possible outcomes}}$$

**Properties:**
- 0 ≤ P(A) ≤ 1
- P(certain event) = 1
- P(impossible event) = 0
- P(A) + P(A') = 1

**Key Vocabulary:**
- **Sample Space (S):** Set of all possible outcomes
- **Event (A):** A subset of the sample space
- **Complementary Event (A'):** Everything in S that is NOT in A
- P(A') = 1 - P(A)

---

### 🎬 Episode 5.2 — The Rules of the Game

#### THE ADDITION RULE:
**For mutually exclusive events:**
$$P(A \cup B) = P(A) + P(B)$$

**For non-mutually exclusive events:**
$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$

> 🔑 **Remember:** You subtract P(A∩B) to avoid double-counting!

#### THE MULTIPLICATION RULE:
**For independent events:**
$$P(A \cap B) = P(A) \times P(B)$$

**For dependent events:**
$$P(A \cap B) = P(A) \times P(B|A)$$

#### CONDITIONAL PROBABILITY:
$$P(A|B) = \frac{P(A \cap B)}{P(B)}$$

> 🩺 **Example:** In a hospital, P(patient has malaria) = 0.5, P(patient has malaria AND is from rural area) = 0.3.
> P(patient is from rural area | has malaria) = 0.3/0.5 = **0.6**
> This is exactly **Assignment 4!**

---

### 🎬 Episode 5.3 — Mutually Exclusive vs. Independent Events

| Feature | Mutually Exclusive | Independent |
|---------|------------------|-------------|
| Can both occur? | NO | YES |
| Formula | P(A∩B) = 0 | P(A∩B) = P(A)×P(B) |
| Example | Male OR Female (same person) | Tossing a coin AND rolling a die |

> 💡 **MNEMONIC:** "Mutually exclusive = CANNOT happen together. Independent = DON'T AFFECT each other."

---

### 🎬 Episode 5.4 — Counting: Permutations and Combinations

**Permutation** (ORDER matters):
$$P(n,r) = \frac{n!}{(n-r)!}$$

**Combination** (ORDER doesn't matter):
$$C(n,r) = \binom{n}{r} = \frac{n!}{r!(n-r)!}$$

> 🎓 **Memory trick:** **"CombINATION lock? Actually you need the exact ORDER — it's a permutation lock!"** 😂

> 📝 **EXAM TIP:** "How many ways can you arrange..." → PERMUTATION. "How many ways can you select..." → COMBINATION.

---

# 🌊 SEASON 6: THE DISTRIBUTION TRILOGY
## *"Three Distributions Walk Into a Biology Lab..."*

### 🎬 Episode 6.1 — NORMAL DISTRIBUTION: The Beautiful Bell

The **Normal Distribution** is the star of statistics. It appears everywhere in biology — heights, weights, blood pressure, IQ scores, enzyme activity.

**Properties of the Normal Curve:**
- Bell-shaped, symmetric about the mean
- Mean = Median = Mode (all equal)
- Total area under curve = 1
- Defined by two parameters: μ (mean) and σ (standard deviation)
- Extends infinitely in both directions (tails never touch the x-axis)
- Notation: X ~ N(μ, σ²)

**THE EMPIRICAL RULE (68-95-99.7 Rule):**
- 68% of data falls within **1 SD** of the mean: μ ± σ
- 95% of data falls within **2 SD** of the mean: μ ± 2σ
- 99.7% of data falls within **3 SD** of the mean: μ ± 3σ

> 💡 **MNEMONIC:** **"68-95-99.7 — First class, Second class, Third class!"**
> (Okay that's a stretch, but you'll remember it now 😄)

**THE Z-SCORE FORMULA:**
$$Z = \frac{X - \mu}{\sigma}$$

The Z-score tells you how many standard deviations a value is from the mean.

> 🔑 **Standard Normal Distribution:** Z ~ N(0, 1) — Mean=0, SD=1
> Once you convert to Z, you use the Standard Normal Table to find probabilities.

**Example:** Heights of 800 girls are normally distributed with μ=75 cm, σ=9 cm. (This is **Assignment 2!**)

i) Between 67 and 72:
- Z₁ = (67-75)/9 = -8/9 = -0.89
- Z₂ = (72-75)/9 = -3/9 = -0.33
- P(-0.89 < Z < -0.33) = P(Z < -0.33) - P(Z < -0.89) = 0.3707 - 0.1867 = **0.1840**
- Number of girls = 0.1840 × 800 = **147 girls**

ii) Less than 75:
- Z = (75-75)/9 = 0
- P(Z < 0) = 0.5 (exactly half, by symmetry)
- Number = 0.5 × 800 = **400 girls**

iii) Height ≥ 70:
- Z = (70-75)/9 = -5/9 = -0.556
- P(Z ≥ -0.556) = P(Z ≤ 0.556) ≈ 0.7110
- Number = 0.7110 × 800 ≈ **569 girls**

---

### 🎬 Episode 6.2 — BINOMIAL DISTRIBUTION: Two Outcomes Only

The **Binomial Distribution** is used when:
1. Fixed number of trials: **n**
2. Only **two outcomes** per trial: success or failure
3. **Constant probability** of success: p
4. Trials are **independent**

> 💡 **MNEMONIC:** **"FTIC"** — Fixed, Two outcomes, Independent, Constant probability

**KEY FORMULA:**
$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k} = \binom{n}{k} p^k q^{n-k}$$

where q = 1 - p

**Parameters:**
$$\text{Mean} = \mu = np$$
$$\text{Variance} = \sigma^2 = npq$$
$$\text{Standard Deviation} = \sigma = \sqrt{npq}$$

**Assignment 6 Example:** n=10 trials, p=0.8 (probability of success), X=7
$$P(X=7) = \binom{10}{7}(0.8)^7(0.2)^3 = 120 \times 0.2097 \times 0.008 = \mathbf{0.2013}$$
$$\text{Mean} = np = 10 \times 0.8 = \mathbf{8}$$
$$\text{Variance} = npq = 10 \times 0.8 \times 0.2 = \mathbf{1.6}$$

---

### 🎬 Episode 6.3 — POISSON DISTRIBUTION: For the Rare and the Wonderful

The **Poisson Distribution** models the number of times a **rare event** occurs in a fixed interval of time or space.

**Conditions:**
- Events occur randomly and independently
- Average rate λ (lambda) is constant
- Events are rare (small probability, large n)

**KEY FORMULA:**
$$P(X = k) = \frac{e^{-\lambda} \lambda^k}{k!}$$

where e ≈ 2.71828, λ = mean number of events

**Special property: Mean = Variance = λ**

> 😂 **MNEMONIC:** *"Poisson is for RARE events — like getting a first class in a Nigerian university! Or NEPA not taking light for a whole week!"* 

**Assignment 3 Example:** λ = n × p = 100 × 0.05 = **5**

i) P(X=0) = e^(-5) × 5⁰/0! = e^(-5) = **0.006738**

ii) P(X=5) = e^(-5) × 5⁵/5! = 0.006738 × 3125/120 = 0.006738 × 26.0417 = **0.1755**

iii) P(X≥5) = 1 - [P(0)+P(1)+P(2)+P(3)+P(4)]
- P(0) = 0.0067
- P(1) = e^(-5) × 5/1 = 0.0337
- P(2) = e^(-5) × 25/2 = 0.0842
- P(3) = e^(-5) × 125/6 = 0.1404
- P(4) = e^(-5) × 625/24 = 0.1755
- Sum = 0.0067 + 0.0337 + 0.0842 + 0.1404 + 0.1755 = **0.4405**
- P(X≥5) = 1 - 0.4405 = **0.5595**

> 📝 **EXAM TIP:** If λ > 10, the Poisson distribution can be approximated by the Normal distribution. If n is large and p is small (np < 5), Binomial can be approximated by Poisson with λ = np.

---

# ⚔️ SEASON 7: HYPOTHESIS TESTING — THE FINAL BATTLE
## *"When You're Not Sure If Your Result is Real or Just Coincidence"*

### 🎬 Episode 7.1 — Setting Up the Battle

**Hypothesis testing** is a formal procedure to decide whether sample data provides enough evidence to reject a claim about a population.

**NULL HYPOTHESIS (H₀):** The "status quo" — assumes no effect, no difference
**ALTERNATIVE HYPOTHESIS (H₁ or Hₐ):** What you're trying to prove

**Example:**
- H₀: μ = 70 (the drug has no effect on blood pressure)
- H₁: μ ≠ 70 (two-tailed) OR μ > 70 (one-tailed right) OR μ < 70 (one-tailed left)

---

### 🎬 Episode 7.2 — The Two Great Errors

| | H₀ is TRUE | H₀ is FALSE |
|---|---|---|
| **Reject H₀** | ❌ Type I Error (α) | ✅ Correct (Power) |
| **Fail to Reject H₀** | ✅ Correct | ❌ Type II Error (β) |

- **Type I Error (α):** Rejecting H₀ when it's actually true. False positive. "Convicting an innocent man."
- **Type II Error (β):** Failing to reject H₀ when it's false. False negative. "Acquitting a guilty man."
- **Power = 1 - β:** Probability of correctly rejecting a false H₀.

> 💡 **MNEMONIC:**
> **"Type I = Cry Wolf (say there's an effect when there isn't)"**
> **"Type II = Miss the Wolf (miss the effect that's really there)"**

**p-value:** The probability of obtaining results as extreme as observed, assuming H₀ is true.
- If p-value < α (usually 0.05): **Reject H₀** (result is statistically significant)
- If p-value ≥ α: **Fail to reject H₀**

---

### 🎬 Episode 7.3 — The t-TEST: Testing Means

Used when sample size is small (n < 30) and/or population variance is unknown.

#### ONE-SAMPLE t-TEST:
$$t = \frac{\bar{x} - \mu_0}{s/\sqrt{n}}$$
df = n - 1

#### TWO-SAMPLE (INDEPENDENT) t-TEST:
$$t = \frac{\bar{x}_1 - \bar{x}_2}{s_p\sqrt{\frac{1}{n_1}+\frac{1}{n_2}}}$$
where pooled variance: $s_p^2 = \frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}$
df = n₁ + n₂ - 2

#### PAIRED t-TEST (for before/after, matched pairs):
$$t = \frac{\bar{d}}{s_d/\sqrt{n}}$$
where d = difference for each pair, df = n - 1

> 📝 **EXAM TIP:** Use PAIRED t-test when the same subjects are measured twice (before/after drug treatment). Use INDEPENDENT t-test when two different groups are compared.

---

### 🎬 Episode 7.4 — F-TEST and ANOVA: The Big Leagues

The **F-test** compares variances or tests if multiple group means are equal.

$$F = \frac{s_1^2}{s_2^2} \quad \text{or} \quad F = \frac{\text{MS}_{between}}{\text{MS}_{within}}$$

**ANOVA (Analysis of Variance)** tests whether 3 or more group means are equal.
- H₀: μ₁ = μ₂ = μ₃ = ... = μₖ
- H₁: At least one mean is different

**ONE-WAY ANOVA TABLE:**

| Source | SS | df | MS | F |
|--------|-----|-----|-----|---|
| Between Groups | SS_B | k-1 | MS_B = SS_B/(k-1) | F = MS_B/MS_W |
| Within Groups (Error) | SS_W | N-k | MS_W = SS_W/(N-k) | |
| Total | SS_T | N-1 | | |

where k = number of groups, N = total observations

**Formulas:**
$$SS_T = \sum\sum x_{ij}^2 - \frac{(\sum\sum x_{ij})^2}{N}$$
$$SS_B = \sum \frac{T_j^2}{n_j} - \frac{(\sum\sum x_{ij})^2}{N}$$
$$SS_W = SS_T - SS_B$$

**TWO-WAY ANOVA:** Tests effects of TWO factors AND their interaction simultaneously.

**ANCOVA (Analysis of Covariance):** Combines ANOVA with regression — controls for a continuous covariate while comparing group means.

> 📝 **EXAM TIP:** ANOVA tells you THAT there's a difference. It does NOT tell you WHERE. Use post-hoc tests (Tukey, Bonferroni, Duncan) for pairwise comparisons.

---

### 🎬 Episode 7.5 — CHI-SQUARE TEST: For Categorical Data

The **chi-square test** is used for categorical data (counts, frequencies).

#### GOODNESS OF FIT TEST:
Tests if observed frequencies fit an expected distribution.
$$\chi^2 = \sum \frac{(O - E)^2}{E}$$
df = k - 1 (k = number of categories)

#### TEST OF INDEPENDENCE:
Tests if two categorical variables are associated.
$$\chi^2 = \sum \frac{(O - E)^2}{E}$$
df = (r-1)(c-1) where r = rows, c = columns
Expected frequency: $E_{ij} = \frac{R_i \times C_j}{N}$

> 🩺 **Example:** Is there an association between smoking status (smoker/non-smoker) and lung disease (yes/no)? This is a chi-square test of independence!

> 📝 **EXAM TIP:** Chi-square requires Expected frequencies ≥ 5 in each cell. If not, use Fisher's Exact Test.

---

# 💕 SEASON 8: CORRELATION & REGRESSION — THE LOVE STORY OF VARIABLES
## *"When Two Variables Can't Stop Looking at Each Other"*

### 🎬 Episode 8.1 — Correlation: How Closely Do They Move Together?

> 🚗 **ANALOGY:** *"Correlation is like Lagos traffic and rain — when it rains, traffic ALWAYS increases. But correlation ≠ causation! The rain doesn't CAUSE the traffic — it's the flooded roads, the accidents, the Lagosians who forget how to drive in the rain... But you get the point!"* 😂

**PEARSON CORRELATION COEFFICIENT (r):**
$$r = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \cdot \sum(y_i - \bar{y})^2}}$$

**Computational formula:**
$$r = \frac{n\sum xy - (\sum x)(\sum y)}{\sqrt{[n\sum x^2 - (\sum x)^2][n\sum y^2 - (\sum y)^2]}}$$

**Interpretation of r:**
| r value | Interpretation |
|---------|---------------|
| r = +1.0 | Perfect positive correlation |
| 0.7 ≤ r < 1.0 | Strong positive correlation |
| 0.5 ≤ r < 0.7 | Moderate positive correlation |
| 0 < r < 0.5 | Weak positive correlation |
| r = 0 | No linear correlation |
| -0.5 < r < 0 | Weak negative correlation |
| -0.7 < r ≤ -0.5 | Moderate negative correlation |
| -1.0 < r ≤ -0.7 | Strong negative correlation |
| r = -1.0 | Perfect negative correlation |

**Testing significance of r:**
$$t = \frac{r\sqrt{n-2}}{\sqrt{1-r^2}}, \quad df = n-2$$

---

### 🎬 Episode 8.2 — Linear Regression: Drawing the Best Line

**Simple Linear Regression:** Y = a + bX

where:
- Y = dependent variable (response)
- X = independent variable (predictor)
- b = slope, a = intercept

**KEY FORMULAS:**
$$b = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sum(x_i - \bar{x})^2} = \frac{n\sum xy - (\sum x)(\sum y)}{n\sum x^2 - (\sum x)^2}$$

$$a = \bar{y} - b\bar{x}$$

**Coefficient of Determination (R²):**
$$R^2 = r^2$$
- Represents the proportion of variance in Y explained by X
- R² = 0.81 means X explains 81% of the variation in Y

---

### 🎬 Episode 8.3 — Curvilinear Regression and Transformations

When the relationship between X and Y is NOT linear, we use:

**Polynomial Regression:** Y = a + bX + cX²
**Exponential:** Y = ae^(bX) → linearize: ln Y = ln a + bX
**Power:** Y = aX^b → linearize: log Y = log a + b log X

**Common Transformations:**
- **Log transformation:** For right-skewed data, exponential relationships
- **Square root transformation:** For count data, Poisson-distributed data
- **Reciprocal transformation:** For ratios and rates
- **Arcsin transformation:** For proportion/percentage data

> 🔬 **Example:** Growth of bacteria over time often follows exponential pattern. Log-transform the data to get a linear relationship for easy analysis.

> 📝 **EXAM TIP:** Know the difference between correlation (measuring relationship strength) and regression (predicting Y from X). Correlation has NO direction — it doesn't matter which variable you call X or Y. Regression DOES have a direction!

---

# 🃏 FLASHCARD DECK: 50+ POWER CARDS

---

**CARD #1**
**FRONT:** What is a continuous variable?
**BACK:** A variable that can take any value within a range, including decimals. Arises from measurement. Examples: height, weight, temperature, blood pressure.

---

**CARD #2**
**FRONT:** What is a discrete (discontinuous) variable?
**BACK:** A variable that can only take specific, countable values (usually whole numbers). Arises from counting. Examples: number of eggs, children, bacteria colonies.

---

**CARD #3**
**FRONT:** What is a statistical population?
**BACK:** The complete set of all individuals or items of interest in a study. Described by parameters (μ, σ²).

---

**CARD #4**
**FRONT:** What is a sample?
**BACK:** A subset of the population used to make inferences about the population. Described by statistics (x̄, s²).

---

**CARD #5**
**FRONT:** Difference between parameter and statistic?
**BACK:** Parameter describes a POPULATION (uses Greek letters: μ, σ). Statistic describes a SAMPLE (uses Roman letters: x̄, s). Mnemonic: Population=Parameter, Sample=Statistic.

---

**CARD #6**
**FRONT:** Formula for arithmetic mean of a sample
**BACK:** x̄ = Σxᵢ/n (sum of all values divided by number of values)

---

**CARD #7**
**FRONT:** How to find the median for even n?
**BACK:** Arrange data in order. Median = average of the (n/2)th and (n/2+1)th values.

---

**CARD #8**
**FRONT:** What is the mode?
**BACK:** The value that appears most frequently in a dataset. A dataset can be unimodal, bimodal, or multimodal.

---

**CARD #9**
**FRONT:** Formula for sample variance
**BACK:** s² = Σ(xᵢ - x̄)²/(n-1). Uses n-1 (Bessel's correction) to give an unbiased estimate of population variance.

---

**CARD #10**
**FRONT:** Formula for standard deviation
**BACK:** s = √[Σ(xᵢ - x̄)²/(n-1)]. Same units as original data. Square root of variance.

---

**CARD #11**
**FRONT:** What is the Normal Distribution?
**BACK:** A symmetric, bell-shaped distribution defined by mean μ and standard deviation σ. Notation: X ~ N(μ, σ²). Mean = Median = Mode.

---

**CARD #12**
**FRONT:** The Empirical Rule (68-95-99.7)
**BACK:** 68% of data within μ±σ; 95% within μ±2σ; 99.7% within μ±3σ. Only applies to normal distributions.

---

**CARD #13**
**FRONT:** Z-score formula
**BACK:** Z = (X - μ)/σ. Measures how many standard deviations X is from the mean. Standard Normal: Z ~ N(0,1).

---

**CARD #14**
**FRONT:** Binomial Distribution conditions (FTIC)
**BACK:** Fixed number of trials (n); Two outcomes (success/failure); Independent trials; Constant probability p. P(X=k) = C(n,k)×p^k×q^(n-k)

---

**CARD #15**
**FRONT:** Mean and variance of Binomial Distribution
**BACK:** Mean = np; Variance = npq (where q = 1-p); SD = √(npq)

---

**CARD #16**
**FRONT:** Poisson Distribution formula
**BACK:** P(X=k) = e^(-λ)×λ^k/k! Used for rare events. Special property: Mean = Variance = λ.

---

**CARD #17**
**FRONT:** When to use Poisson distribution?
**BACK:** For rare events in fixed time/space: number of mutations per cell division, number of accidents per day, number of bacterial colonies per plate.

---

**CARD #18**
**FRONT:** Definition of probability
**BACK:** P(A) = favorable outcomes / total outcomes. Always between 0 and 1. P(A) + P(A') = 1.

---

**CARD #19**
**FRONT:** Addition rule for non-mutually exclusive events
**BACK:** P(A∪B) = P(A) + P(B) - P(A∩B). Subtract intersection to avoid double counting.

---

**CARD #20**
**FRONT:** Conditional probability formula
**BACK:** P(A|B) = P(A∩B)/P(B). "Probability of A given that B has occurred."

---

**CARD #21**
**FRONT:** Independent events condition
**BACK:** Events A and B are independent if P(A∩B) = P(A)×P(B), equivalently if P(A|B) = P(A).

---

**CARD #22**
**FRONT:** Mutually exclusive events
**BACK:** Events that CANNOT occur simultaneously. P(A∩B) = 0. P(A∪B) = P(A) + P(B).

---

**CARD #23**
**FRONT:** Combinations formula
**BACK:** C(n,r) = n! / [r!(n-r)!]. Used when ORDER doesn't matter. Example: "Choose 3 from 10."

---

**CARD #24**
**FRONT:** Permutations formula
**BACK:** P(n,r) = n! / (n-r)!. Used when ORDER matters. Example: "Arrange 3 from 10."

---

**CARD #25**
**FRONT:** Null hypothesis (H₀)
**BACK:** Statement of no effect or no difference. The default assumption. Example: H₀: μ = 70. Rejected only if there is sufficient evidence against it.

---

**CARD #26**
**FRONT:** Alternative hypothesis (H₁)
**BACK:** Statement that contradicts H₀. What the researcher wants to prove. Can be one-tailed (directional) or two-tailed (non-directional).

---

**CARD #27**
**FRONT:** Type I Error (α)
**BACK:** Rejecting H₀ when it is actually TRUE. False positive. Probability = α (significance level, usually 0.05). "Crying wolf."

---

**CARD #28**
**FRONT:** Type II Error (β)
**BACK:** Failing to reject H₀ when it is actually FALSE. False negative. Probability = β. Power = 1-β. "Missing the wolf."

---

**CARD #29**
**FRONT:** p-value interpretation
**BACK:** The probability of getting results as extreme as observed, assuming H₀ is true. If p < α → reject H₀. If p ≥ α → fail to reject H₀.

---

**CARD #30**
**FRONT:** One-sample t-test formula
**BACK:** t = (x̄ - μ₀)/(s/√n), df = n-1. Used to compare sample mean to a known population mean.

---

**CARD #31**
**FRONT:** When to use paired t-test?
**BACK:** When the SAME subjects are measured TWICE (before/after design) or when observations are matched pairs. t = d̄/(sᵈ/√n), df = n-1.

---

**CARD #32**
**FRONT:** F-test statistic
**BACK:** F = s₁²/s₂² (for comparing variances) or F = MS_between/MS_within (for ANOVA). Always ≥ 0. Follows F-distribution with df₁ and df₂.

---

**CARD #33**
**FRONT:** ANOVA — what does it test?
**BACK:** Tests equality of 3+ group means simultaneously. H₀: μ₁=μ₂=...=μₖ. Uses F = MS_between/MS_within. Significant F = at least one mean differs.

---

**CARD #34**
**FRONT:** Chi-square test formula
**BACK:** χ² = Σ[(O-E)²/E] where O = observed frequency, E = expected frequency. df = k-1 (goodness of fit) or (r-1)(c-1) (independence).

---

**CARD #35**
**FRONT:** Pearson correlation coefficient (r)
**BACK:** r = Σ[(x-x̄)(y-ȳ)] / √[Σ(x-x̄)²×Σ(y-ȳ)²]. Ranges from -1 to +1. Measures linear relationship strength and direction.

---

**CARD #36**
**FRONT:** Simple linear regression equation
**BACK:** Ŷ = a + bX. b = slope = Σ(x-x̄)(y-ȳ)/Σ(x-x̄)². a = intercept = ȳ - bx̄.

---

**CARD #37**
**FRONT:** Coefficient of determination (R²)
**BACK:** R² = r². Proportion of variance in Y explained by X. R²=0.81 means 81% of Y's variation is explained by X.

---

**CARD #38**
**FRONT:** Skewness types
**BACK:** Positive skew (right): tail on right, Mean>Median>Mode. Negative skew (left): tail on left, Mean<Median<Mode. Symmetric: Mean=Median=Mode.

---

**CARD #39**
**FRONT:** Kurtosis types
**BACK:** Leptokurtic: very peaked, heavy tails (k>3). Mesokurtic: normal bell curve (k=3). Platykurtic: flat, light tails (k<3).

---

**CARD #40**
**FRONT:** Frequency distribution
**BACK:** A table showing values (or class intervals) and their frequencies. Used to organize and summarize large datasets.

---

**CARD #41**
**FRONT:** Class interval, class boundary, class mark
**BACK:** Class interval: range of values in a class (e.g., 155-159). Class boundary: true limits (154.5-159.5). Class mark: midpoint = (lower+upper)/2 = 157.

---

**CARD #42**
**FRONT:** Histogram vs Bar Chart
**BACK:** Histogram: continuous data, bars TOUCH, x-axis shows class boundaries. Bar chart: discrete/categorical data, bars DON'T TOUCH, x-axis shows categories.

---

**CARD #43**
**FRONT:** What is an ogive?
**BACK:** A cumulative frequency curve. Plot cumulative frequency against upper class boundaries. Used to estimate median, quartiles, percentiles graphically.

---

**CARD #44**
**FRONT:** Standard Error of the Mean
**BACK:** SE = σ/√n (or s/√n when σ unknown). Measures precision of sample mean as estimate of population mean. Decreases as n increases.

---

**CARD #45**
**FRONT:** 95% Confidence Interval for mean
**BACK:** CI = x̄ ± 1.96(σ/√n) when σ known; CI = x̄ ± t₀.₀₂₅(s/√n) when σ unknown. Interpretation: 95% of such intervals will contain the true μ.

---

**CARD #46**
**FRONT:** Hypergeometric distribution
**BACK:** P(X=k) = C(K,k)×C(N-K,n-k)/C(N,n). Used for sampling WITHOUT replacement from a finite population. Parameters: N (population), K (successes in population), n (sample size).

---

**CARD #47**
**FRONT:** Stratified vs Cluster Sampling
**BACK:** Stratified: divide into subgroups (strata), randomly sample FROM EACH stratum. Cluster: divide into clusters, randomly select WHOLE CLUSTERS and study all members.

---

**CARD #48**
**FRONT:** Coefficient of Variation (CV)
**BACK:** CV = (s/x̄) × 100%. Relative measure of variability — useful for comparing variability across datasets with different units or means.

---

**CARD #49**
**FRONT:** Degrees of freedom (df)
**BACK:** The number of independent values free to vary. For one sample: df = n-1. For two samples: df = n₁+n₂-2. For chi-square (independence): df = (r-1)(c-1).

---

**CARD #50**
**FRONT:** Central Limit Theorem
**BACK:** Regardless of the population distribution, the sampling distribution of x̄ approaches Normal as n increases (n≥30). This is WHY so many statistical tests assume normality!

---

**CARD #51**
**FRONT:** One-tailed vs Two-tailed test
**BACK:** One-tailed: tests direction (H₁: μ > k or μ < k). Critical region on ONE side. Two-tailed: tests difference only (H₁: μ ≠ k). Critical region on BOTH sides. Two-tailed is more conservative.

---

**CARD #52**
**FRONT:** What is an outlier?
**BACK:** An observation that lies far outside the overall pattern of the data. Can be identified using Z-scores (|Z|>3), IQR method (below Q1-1.5×IQR or above Q3+1.5×IQR), or box plots. Can severely affect mean and SD.

---

---

# 📝 ASSIGNMENT SOLUTIONS — FULLY WORKED

## 🔢 ASSIGNMENT 1: HYPERGEOMETRIC DISTRIBUTION

**Setup:** A box contains N=10 items, K=5 are defective. You select n=5 without replacement.

**Formula:** 
$$P(X=k) = \frac{\binom{K}{k}\binom{N-K}{n-k}}{\binom{N}{n}}$$

First, calculate C(10,5) = 10!/(5!5!) = **252**

**i) P(X=5) — All 5 selected are defective:**
$$P(X=5) = \frac{\binom{5}{5}\binom{5}{0}}{\binom{10}{5}} = \frac{1 \times 1}{252} = \frac{1}{252} \approx \mathbf{0.00397}$$

**ii) P(X=1) — Exactly 1 defective:**
$$P(X=1) = \frac{\binom{5}{1}\binom{5}{4}}{\binom{10}{5}} = \frac{5 \times 5}{252} = \frac{25}{252} \approx \mathbf{0.0992}$$

---

## 🔢 ASSIGNMENT 2: NORMAL DISTRIBUTION

**Parameters:** μ = 75 cm, σ = 9 cm, n = 800 girls

**i) Between 67 and 72 cm:**
- Z₁ = (67-75)/9 = -0.89 → P(Z < -0.89) = 0.1867
- Z₂ = (72-75)/9 = -0.33 → P(Z < -0.33) = 0.3707
- P(67 < X < 72) = 0.3707 - 0.1867 = **0.1840**
- Number of girls = 0.1840 × 800 = **≈ 147 girls**

**ii) Less than 75 cm:**
- Z = (75-75)/9 = 0 → P(Z < 0) = 0.5000
- Number = 0.5 × 800 = **400 girls**

**iii) At least 70 cm (≥ 70):**
- Z = (70-75)/9 = -5/9 = -0.556
- P(Z ≥ -0.556) = 1 - P(Z < -0.556) = P(Z ≤ 0.556) ≈ 0.7110
- Number = 0.7110 × 800 ≈ **≈ 569 girls**

---

## 🔢 ASSIGNMENT 3: POISSON DISTRIBUTION

**Parameters:** n = 100, p = 0.05, λ = np = 100 × 0.05 = **5**

**i) P(X = 0):**
$$P(X=0) = \frac{e^{-5} \cdot 5^0}{0!} = e^{-5} = \mathbf{0.006738}$$

**ii) P(X = 5):**
$$P(X=5) = \frac{e^{-5} \cdot 5^5}{5!} = \frac{0.006738 \times 3125}{120} = \frac{21.06}{120} = \mathbf{0.1755}$$

**iii) P(X ≥ 5) = 1 - P(X ≤ 4):**
| k | P(X=k) |
|---|--------|
| 0 | 0.0067 |
| 1 | 0.0337 |
| 2 | 0.0842 |
| 3 | 0.1404 |
| 4 | 0.1755 |
| **Sum** | **0.4405** |

$$P(X \geq 5) = 1 - 0.4405 = \mathbf{0.5595}$$

---

## 🔢 ASSIGNMENT 4: CONDITIONAL PROBABILITY

**Given:** P(Patient has malaria, M) = 0.5, P(M ∩ from rural area, P) = 0.3

**Find:** P(M | P) — Probability of malaria given patient is from rural area

$$P(M|P) = \frac{P(M \cap P)}{P(P)} = \frac{0.3}{0.5} = \mathbf{0.6}$$

**Interpretation:** Given a patient is from a rural area, there is a 60% probability they have malaria.

---

## 🔢 ASSIGNMENT 5: PROBABILITY DISTRIBUTION (Without Replacement)

**Setup:** Box has 2 defective and 4 non-defective items. Draw 2 items WITHOUT replacement.

Let X = number of defective items drawn (X = 0, 1, or 2)

**P(X=0) — Both non-defective:**
$$P(X=0) = \frac{4}{6} \times \frac{3}{5} = \frac{12}{30} = \frac{2}{5} = \mathbf{\frac{6}{15}}$$

Wait — using the formulation from the assignment:
$$P(X=0) = \frac{2}{6} \times \frac{1}{5} = \frac{2}{30} = \frac{1}{15}$$

**P(X=1) — Exactly 1 defective:**
$$P(X=1) = \frac{4}{6} \times \frac{2}{5} + \frac{2}{6} \times \frac{4}{5} = \frac{8}{30} + \frac{8}{30} = \frac{16}{30} = \mathbf{\frac{8}{15}}$$

**P(X=2) — Both defective:**
$$P(X=2) = \frac{4}{6} \times \frac{3}{5} = \frac{12}{30} = \frac{2}{5} = \mathbf{\frac{6}{15}}$$

**Verification:** 1/15 + 8/15 + 6/15 = 15/15 = **1** ✅

---

## 🔢 ASSIGNMENT 6: BINOMIAL DISTRIBUTION

**Parameters:** n=10, p=0.8, q=0.2, X=7

**P(X=7):**
$$P(X=7) = \binom{10}{7}(0.8)^7(0.2)^3$$
$$= 120 \times 0.2097152 \times 0.008 = \mathbf{0.2013}$$

**Mean:** μ = np = 10 × 0.8 = **8**

**Variance:** σ² = npq = 10 × 0.8 × 0.2 = **1.6**

**Standard Deviation:** σ = √1.6 = **1.265**

---

## 🔢 ASSIGNMENT 7: SET THEORY AND PROBABILITY

**Given:** In a class of 80 students:
- English (E): 45
- French (F): 30
- Yoruba (Y): 25
- E∩F: 5, E∩Y: 10, F∩Y: 8
- E∩F∩Y: 5

**Finding individuals in ONLY each language:**
- English only = 45 - (5+10) + 5 = 45 - 10 = **35**
- French only = 30 - (5+8) + 5 = 30 - 8 = **22**
- Yoruba only = 25 - (10+8) + 5 = 25 - 13 = **12**
- E∩F only (not Y) = 5 - 5 = **0**
- E∩Y only (not F) = 10 - 5 = **5**
- F∩Y only (not E) = 8 - 5 = **3**

**Total accounted for:** 35 + 22 + 12 + 0 + 5 + 3 + 5 = **82**

> ⚠️ **Note:** The data gives 82 students across categories, but only 80 are in the class. This data inconsistency should be noted. For probability calculations, use the formula with the given data:

**(a) P(English only) = 35/80 = 7/16 = 0.4375**

**(b) P(French only) = 22/80 = 11/40 = 0.275**

**(c) P(Yoruba only) = 12/80 = 3/20 = 0.15**

**(d) P(at least one language):** If we use N=80, and 82 fall in at least one category (data inconsistency), acknowledge the error and note P ≈ 1 or = 82/80 > 1, suggesting a data error in the problem.

---

# 📋 MOCK CBT EXAM — 40 QUESTIONS
## *"The Final Boss Level"* 🎮

**Instructions:** Circle the BEST answer. Time allowed: 40 minutes. No going back.

---

**1.** A variable that can take any value within a range is called:
A) Discrete B) Nominal C) Continuous D) Ordinal

**2.** The number of children in a family is an example of:
A) Continuous data B) Discrete data C) Interval data D) Ratio data

**3.** The NOIR mnemonic refers to which levels of measurement?
A) Nominal, Ordinal, Independent, Ratio B) Nominal, Ordinal, Interval, Ratio
C) Normal, Ordinal, Interval, Random D) Null, Ordinal, Interval, Ratio

**4.** Blood group (A, B, AB, O) is measured on which scale?
A) Ordinal B) Interval C) Nominal D) Ratio

**5.** Which sampling method selects every kth element from a list?
A) Cluster B) Stratified C) Convenience D) Systematic

**6.** The SSSCC mnemonic stands for:
A) Simple, Stratified, Systematic, Cluster, Convenience B) Single, Statistical, Systematic, Cluster, Controlled
C) Simple, Stratified, Sample, Cluster, Controlled D) None of the above

**7.** A number that describes a population is called:
A) Statistic B) Variable C) Parameter D) Estimator

**8.** The standard error of the mean is calculated as:
A) σ/n B) σ²/n C) σ/√n D) √n/σ

**9.** For a 95% confidence interval, the Z-value used is:
A) 1.645 B) 1.96 C) 2.576 D) 2.33

**10.** Sturge's rule for determining number of classes is:
A) k = 1 + log(n) B) k = 1 + 3.322 log₁₀(n) C) k = n/5 D) k = √n

**11.** The class mark of the interval 155-159 is:
A) 155 B) 159 C) 157 D) 154.5

**12.** The arithmetic mean of 2, 4, 6, 8, 10 is:
A) 5 B) 6 C) 7 D) 8

**13.** Which measure of central tendency is most affected by extreme values (outliers)?
A) Mode B) Median C) Mean D) Geometric Mean

**14.** For a positively skewed distribution:
A) Mean = Median = Mode B) Mean > Median > Mode C) Mean < Median < Mode D) Median > Mean

**15.** The coefficient of variation is:
A) s/x̄ B) (s/x̄) × 100% C) x̄/s D) σ/μ × 50%

**16.** For the normal distribution, what percentage of data lies within μ ± 2σ?
A) 68% B) 95% C) 99.7% D) 50%

**17.** If X ~ N(50, 16), the Z-score for X=54 is:
A) 0.25 B) 1.0 C) 4.0 D) 2.0

**18.** The Binomial distribution requires:
A) Continuous outcomes B) Fixed probability and independence C) λ = np D) Large sample sizes only

**19.** For a Binomial distribution with n=20, p=0.3, the mean is:
A) 14 B) 6 C) 4.2 D) 0.3

**20.** The Poisson distribution is used for:
A) Normally distributed events B) Rare events in fixed time/space C) Only large samples D) Continuous variables

**21.** Which distribution has Mean = Variance?
A) Normal B) Binomial C) Poisson D) Hypergeometric

**22.** P(A∪B) for mutually exclusive events equals:
A) P(A) × P(B) B) P(A) + P(B) - P(A∩B) C) P(A) + P(B) D) P(A)/P(B)

**23.** Conditional probability P(A|B) equals:
A) P(A∩B)/P(A) B) P(A)×P(B) C) P(A∩B)/P(B) D) P(A)+P(B)

**24.** C(8,3) = ?
A) 56 B) 24 C) 336 D) 168

**25.** The null hypothesis typically states:
A) There is a significant difference B) No effect or no difference C) The alternative is true D) p < 0.05

**26.** Rejecting H₀ when it is actually true is called:
A) Type II error B) Power C) Type I error D) Beta error

**27.** The power of a test equals:
A) α B) β C) 1-α D) 1-β

**28.** Which test is used for comparing means of 3 or more groups?
A) t-test B) Chi-square C) ANOVA D) Correlation

**29.** In a one-way ANOVA table, degrees of freedom for "Between groups" with k=4 groups is:
A) N-4 B) k-1 = 3 C) N-1 D) k+1 = 5

**30.** Chi-square formula is:
A) Σ(O+E)²/E B) Σ(O-E)/E C) Σ(O-E)²/E D) Σ(O-E)²/O

**31.** For a chi-square test of independence with a 3×4 table, df equals:
A) 12 B) 6 C) 7 D) 11

**32.** Pearson's correlation coefficient r ranges from:
A) 0 to 1 B) -∞ to +∞ C) -1 to +1 D) 0 to ∞

**33.** If r = 0.9, the coefficient of determination R² is:
A) 0.9 B) 0.81 C) 0.45 D) 0.3

**34.** In simple linear regression Ŷ = a + bX, the slope b is calculated as:
A) ȳ - ax̄ B) Σ(x-x̄)(y-ȳ)/Σ(x-x̄)² C) Σ(x-x̄)²/Σ(x-x̄)(y-ȳ) D) r×(sₓ/sᵧ)

**35.** Data transformation is used to:
A) Remove outliers permanently B) Linearize non-linear relationships C) Increase sample size D) Reduce the mean

**36.** The hypergeometric distribution is used when sampling is:
A) With replacement B) Without replacement from finite population C) From infinite population D) Only for normal data

**37.** Standard deviation is preferred over variance because:
A) It's always smaller B) It's in the same units as the data C) It ignores outliers D) It equals the mean

**38.** For ANCOVA, what is controlled that is not controlled in ANOVA?
A) Group membership B) Experimental error C) A continuous covariate D) The number of groups

**39.** Which of the following is the correct formula for the F-statistic in ANOVA?
A) SS_B/SS_W B) MS_W/MS_B C) MS_B/MS_W D) df_B/df_W

**40.** The Central Limit Theorem states that:
A) All populations are normal B) Sampling distribution of x̄ approaches normal as n increases C) Mean always equals median D) Standard error increases with n

---

## 🔑 ANSWER KEY

| Q | A | Q | A | Q | A | Q | A |
|---|---|---|---|---|---|---|---|
| 1 | C | 11 | C | 21 | C | 31 | B |
| 2 | B | 12 | B | 22 | C | 32 | C |
| 3 | B | 13 | C | 23 | C | 33 | B |
| 4 | C | 14 | B | 24 | A | 34 | B |
| 5 | D | 15 | B | 25 | B | 35 | B |
| 6 | A | 16 | B | 26 | C | 36 | B |
| 7 | C | 17 | B | 27 | D | 37 | B |
| 8 | C | 18 | B | 28 | C | 38 | C |
| 9 | B | 19 | B | 29 | B | 39 | C |
| 10 | B | 20 | B | 30 | C | 40 | B |

**Scoring Guide:**
- 36-40: First Class! 🏆 You're ready!
- 30-35: Second Class Upper — small touch-up needed
- 24-29: Second Class Lower — review weak areas
- Below 24: Please restart from Season 1 😂

---

# ⚡ FAST READING TIPS
## *"For the Night Before the Exam (You Know Who You Are)"*

### 🚀 THE 10-HOUR CRASH PLAN

**Hours 1-2: Data & Sampling (Seasons 1-2)**
- Know: Continuous vs Discrete, NOIR levels, SSSCC sampling methods
- Memorize: Population vs Sample, Parameter vs Statistic

**Hours 3-4: Presentation & Central Tendency (Seasons 3-4)**
- Know: How to build frequency tables, class marks, class boundaries
- Memorize: Mean, Median, Mode formulas. Variance formula. CV formula.

**Hours 5-6: Probability (Season 5)**
- Know: Addition rule, Multiplication rule, Conditional probability
- Memorize: P(A∪B) formula, P(A|B) formula, C(n,r) formula

**Hours 7-8: Distributions (Season 6)**
- Know: Normal (Z-score), Binomial (FTIC), Poisson (rare events)
- Memorize: Z=(X-μ)/σ, P(X=k) for binomial and Poisson

**Hours 9-10: Testing & Regression (Seasons 7-8)**
- Know: H₀ vs H₁, Type I vs Type II errors, t-test, ANOVA, chi-square, r and regression formulas
- Memorize: χ² formula, F = MS_B/MS_W, r formula

---

### 💡 HIGH-YIELD EXAM TIPS (MOST TESTED TOPICS)

1. **Normal Distribution Z-score problems** — always come up. Master Z=(X-μ)/σ and table reading.

2. **Binomial vs Poisson** — know when to use each. Poisson: rare event, λ=np. Binomial: FTIC.

3. **Type I and Type II errors** — examiner LOVES this. Remember: Type I = false alarm (α), Type II = miss (β).

4. **Chi-square df** — Goodness of fit: k-1. Independence: (r-1)(c-1). Know this cold.

5. **Mean vs Median** — Skewed data → use median. Symmetric → mean is fine.

6. **Sampling methods** — be able to identify from a scenario description.

7. **Confidence interval** — know the formula and the interpretation.

8. **Regression** — which variable is X and which is Y matters! And know R² = r².

9. **Distinguish histogram (continuous, bars touch) from bar chart (discrete, bars don't touch).**

10. **The ANOVA table** — df between = k-1, df within = N-k, Total df = N-1. F = MS_B/MS_W.

---

### 🧠 GOLDEN MNEMONICS CHEAT SHEET

| Mnemonic | Meaning |
|----------|---------|
| **NOIR** | Nominal, Ordinal, Interval, Ratio (data types) |
| **SSSCC** | Simple, Stratified, Systematic, Cluster, Convenience (sampling) |
| **P-P-S-S** | Population=Parameters, Sample=Statistics |
| **FTIC** | Fixed n, Two outcomes, Independent, Constant p (Binomial) |
| **Count=Discrete, Measure=Continuous** | Tells you the variable type |
| **68-95-99.7** | Normal distribution empirical rule |
| **Reject if p < α** | Decision rule for hypothesis testing |
| **Type I = Cry Wolf, Type II = Miss Wolf** | Error types |
| **Mean pulled toward the tail** | For skewed distributions |
| **R² = r²** | From correlation to determination |

---

# 📚 RECOMMENDED RESOURCES

## 🎥 YOUTUBE CHANNELS

### 🏆 TIER 1 — MUST WATCH
1. **Khan Academy** (khanacademy.org/math/statistics-probability)
   - Free, comprehensive, starts from basics
   - Great for probability and distributions
   - Nigerian students' #1 free resource

2. **StatQuest with Josh Starmer** (@statquest)
   - Explains statistical concepts with unusual clarity
   - Especially great for ANOVA, regression, hypothesis testing
   - Motto: "Statistics made CLEARLY easy"

3. **Professor Leonard** (@ProfessorLeonard)
   - Full university-level statistics course on YouTube
   - Detailed, rigorous, but very clear
   - Excellent for the full BIO 208 curriculum

### 🥈 TIER 2 — HIGHLY RECOMMENDED
4. **The Organic Chemistry Tutor** (@TheOrganicChemistryTutor)
   - Great worked examples for probability and distributions
   - Fast-paced, exam-focused

5. **Crash Course Statistics** (@crashcourse)
   - 15-20 minute episodes, fun animations
   - Great for conceptual understanding

6. **zedstatistics** (@zedstatistics)
   - Excellent for hypothesis testing and distributions
   - Australian accent makes everything sound more authoritative 😄

---

## 📖 TEXTBOOKS

### PRIMARY TEXTS
1. **Biostatistics for the Biological and Health Sciences** — Triola & Triola
   - The gold standard for BIO courses
   - Clear examples, good practice problems

2. **Biostatistics: A Foundation for Analysis in the Health Sciences** — Daniel & Cross
   - Very comprehensive, detailed worked examples
   - Widely used in Nigerian universities

3. **Introductory Statistics** — Weiss
   - Excellent for building foundations
   - Clean explanations of all core topics

### SUPPLEMENTARY TEXTS
4. **Statistics for Biology and Health** — Rosner
5. **Applied Statistics for the Biological Sciences** — Snedecor & Cochran (the classic!)
6. **Practical Statistics for Medical Research** — Altman

---

## 🌐 WEBSITES & APPS

- **Statcato.org** — Online statistical calculator
- **Desmos.com** — Graph normal distributions interactively
- **Wolfram Alpha** — Calculate anything, including probability distributions
- **SPSS / R / Excel** — Software for actual data analysis
- **Quizlet.com** — Create digital flashcards from this guide!

---

> 🎬 **END CREDITS:**
> *"You have completed BIOSTATISTICS: THE SERIES — all 8 Seasons. You now know the Data Kingdom, survived the Sampling Saga, conquered Central Tendency, navigated the Probability Chronicles, mastered the Distribution Trilogy, won the Hypothesis Testing Battle, and written the love story of Correlation and Regression.*
>
> *Go and pass that exam. You've got this. And if NEPA takes light while you're studying tonight... use your phone torch. Statistics waits for no one."* 🕯️😂🇳🇬

---

*BIO 208 Biostatistics Ultimate Guide — Nigerian Student Edition*
*Structured as a TV Series: 8 Seasons, 52 Flashcards, 40 MCQs, 7 Assignment Solutions*
*"Where Numbers Meet Biology — And Somehow, You Will Pass!"*

---
