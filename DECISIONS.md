# My decisions and evidence notes

Written by me, not by my AI agent. Write my challenge hypothesis (section 5) **before** consulting
my agent about it, and do not edit it afterwards; add a dated revision below instead.

| Stage | What I record here |
|---|---|
| 1 | Section 1 |
| 2–5 | Section 2: my design choice, written before I switch my agent to build |
| 4 | Section 3: method and sample-size rows; section 4: findings (a) and (b) |
| 5 | Section 5: hypothesis first; then section 3: challenge rows; section 5: finding (c) |
| All | Section 6: AI use |

## 1. Population and target

- Scenario and file: Clinic Wait Times (clinic_visits.csv)
- One row means: Each row represents a single clinic appointment
- Number of rows (N): 10,000
- Row order, and what it means in this file: The rows are arranged by date and time slot over 100 weeks.
- Target column and units: "wait_time" measured in minutes
- My finite population is (and what it is not): 10,000 appointments over 100 weeks
- True mean I calculated (and how): The mean is 22.6842. 
I calculated the mean by having my AI agent give me this code: "node -e 'const fs=require("fs");const rows=fs.readFileSync("data/clinic_visits.csv","utf8").trim().split(/\r?\n/);const header=rows[0].split(",");const col=header.indexOf("wait_time");const waits=rows.slice(1).map(r=>Number(r.split(",")[col]));console.log(waits.length, waits.reduce((a,b)=>a+b,0)/waits.length)'"

## 2. Design choices

For each stage: the option I chose, why, and what it is meant to help a user learn.

- Stage 2, visualization (include one visual feature meant to reveal a sampling problem): I chose a timeline scatterplot because it shows the different appointment times in a simple way that is easy for a learner to interpret. It lets the reader see how wait times vary throughout the day and notice a trend. The visual feature meant to reveal a sampling problem is a count by weekday of the sampled rows. If the sampled rows are clumped on one or two weekdays instead of being spread roughly evenly across the five, the reader can see that the sample is not representative of the population. It teaches that a sample can look fine on average but still miss parts of the population, so the sample should be checked against the population before it is trusted.
- Stage 3, sampling interactions and stratification column:
- Stage 4, presentation of the method comparison and sample-size experiments:
- Stage 5, challenge controls and my alternative method or correction:

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Systematic | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Stratified | | | 100 | | | | | | |
| Sample size | baseline | Simple random | | | 1 | | | | | | |
| Sample size | baseline | Simple random | | | 10 | | | | | | |
| Challenge | baseline | (method I challenged) | | | | | | | | | |
| Challenge | modified | (method I challenged) | | | | | | | | | |
| Challenge | baseline | (alternative or correction) | | | | | | | | | |
| Challenge | modified | (alternative or correction) | | | | | | | | | |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result.

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population):
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix:

## 5. Challenge (hypothesis written independently, before consulting my agent)

Hypothesis, written before I consult my agent:

- Date written:
- Method I chose to challenge:
- The change to the population or its ordering:
- Why the selection rule would interact with that change:
- Evidence I expect across repeated samples:
- Alternative method or correction I will compare, and why:
- Evidence that would contradict my hypothesis:

After I test it:

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above:
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above):

## 6. AI use

- Tools used:
- What I asked my agent to do, and what I checked myself:
- Automated checks my agent reported (I did not let it interpret my results):
