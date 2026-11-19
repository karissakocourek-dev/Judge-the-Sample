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
Interaction approach: I chose three stacked timelines, one for each sampling method, using the same n and seed from a shared control bar. This lets the user compare all three methods at once and easily see how each one selects its rows.

Stratification column: I chose slot because there are 20 appointment slots per day. Stratified sampling on slot allows every appointment time to be represented. A morning appointment may face different challenges compared to an afternoon appointment.

Tie-break rule: When n is not a multiple of 20, the extra rows go to slots chosen at random using the seed. I chose this so every slot has an equal chance, and the same seed gives the same result.

When n is below 20: The app merges the 20 slots into 4 groups of 5 slots (slots 1 to 5, 6 to 10, 11 to 15, and 16 to 20, with 2,500 rows each). I chose this because I want every method to run at every n, and this still allows me to test n = 10 and n = 100.

When n is below 4: Stratified sampling is blocked with an explanation, and simple random and systematic still run. There are 4 groups and each needs at least one row, so n = 1, 2, and 3 can’t work. I chose to block it because making stratified work at that size would make the app harder for new users to follow.
- Stage 4, presentation of the method comparison and sample-size experiments: I chose histogram small multiples, with one histogram per result on the same x-axis, because it gives the user a simpler visualization. Results recalculate automatically when the seed or repetition count changes, to minimize confusion and make the app more user friendly. The repetition control has two fixed choices, 100 or 1,000, because two fixed choices keep the control simple and mean less to test.
- Stage 5, challenge controls and my alternative method or correction: I chose Option 1, an Experiment C block added below Experiments A and B, with a shuffle-seed control. It shows four labelled histograms and a table: simple random and systematic, each on the baseline and the shuffled population, at n = 100 and each judged against its own true mean. I chose it to stay consistent with the design that is already built, and because histograms are a simple visualization that is easy to understand and interpret. My alternative method is systematic sampling at the same total n, because its selection rule depends on row position.

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | without replacement | 12345 | 100 | 100 repetitions | Monte Carlo | 22.684 | -0.030 | 1.450 | 1.450 |
| Methods at n = 100 | baseline | Systematic | random start, file order, whole-number interval k = 100 | exact | 100 | 100 starts | exact | 22.684 | 0.000 | 6.957 | 6.957 |
| Methods at n = 100 | baseline | Stratified | by slot, 20 strata, proportional allocation, seeded ties | 12345 | 100 | 100 repetitions | Monte Carlo | 22.684 | -0.210 | 1.334 | 1.351 |
| Sample size | baseline | Simple random | without replacement | 12345 | 1 | 100 repetitions | Monte Carlo | 22.684 | 2.226 | 12.820 | 13.012 |
| Sample size | baseline | Simple random | without replacement | 12345 | 10 | 100 repetitions | Monte Carlo | 22.684 | -0.035 | 4.353 | 4.353 |
| Challenge | baseline | Simple random | without replacement | 12345 | 100 | 100 repetitions | Monte Carlo | 22.684 | -0.030 | 1.450 | 1.450 |
| Challenge | modified | Simple random | rows shuffled, shuffle seed 1 | 12345 | 100 | 100 repetitions | Monte Carlo | 22.684 | 0.151 | 1.555 | 1.562 |
| Challenge | baseline | Systematic | file order, whole-number interval k = 100 | exact | 100 | 100 starts | exact | 22.684 | 0.000 | 6.957 | 6.957 |
| Challenge | modified | Systematic | rows shuffled, shuffle seed 1, k = 100 | exact | 100 | 100 starts | exact | 22.684 | 0.000 | 1.619 | 1.619 |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result.

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population): On the baseline clinic population, at n = 100, judged by RMSE, the stratified method did best with an RMSE of 1.351, closely followed by simple random at 1.450, while systematic did far worse at 6.957. That gap between the top two is small, and with only 100 repetitions I can’t say it is a real difference. Systematic had a bias of 0.000 because exact enumeration uses every possible start once, so every row is equally likely to be selected. Its error is entirely spread, with an SD of 6.957. The reason is that the interval of 100 matches the 100 appointments in a week, so each start picks rows that all fall on the same weekday and slot, and different starts land on very different weekday and slot combinations. Stratified had the largest bias of the three at −0.210, but that bias changed sign and shrank when I used a different seed with 1,000 repetitions, so I treat it as noise and not as a real bias.
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix: For simple random sampling, the spread of the estimates fell steadily as n grew, from an SD of 12.820 at n = 1 to 4.353 at n = 10 and 1.450 at n = 100. The RMSE followed the SD, since the bias was small in every case. So a larger sample gives estimates that are closer to the true mean on average, but not for every individual sample, because any single sample can still land far from the truth. A larger sample also cannot fix a problem in how the sample is chosen. The systematic method, for example, lines up with the weekly pattern of the file, and making the sample bigger doesn’t change that. Also, every result describes only the 10,000 appointments in this file, not all clinics.

## 5. Challenge (hypothesis written independently, before consulting my agent)

Hypothesis, written before I consult my agent: Shuffling the row order will not change how reliable simple random sampling is on the clinic population, but it will change how reliable systematic sampling is.

- Date written: 11/18/2026
- Method I chose to challenge: simple random
- The change to the population or its ordering: Row order only. I will shuffle the rows of a labelled copy of the data and leave the values and the number of appointments unchanged.
- Why the selection rule would interact with that change: Simple random sampling picks rows without looking at their position, so it does not see row order, and a shuffle should not matter to it. Systematic sampling picks rows by position, so it does see the order, and in the original file its interval of 100 lines up with the 100 appointments in a week.
- Evidence I expect across repeated samples: The true mean stays at 22.684, because reordering does not change the mean. For simple random, I expect the estimates to stay centered on the true mean with an SD close to the baseline value of 1.450. For systematic, I expect the SD to fall well below its baseline of 6.957, to something close to the simple random SD.
- Alternative method or correction I will compare, and why: Systematic sampling at the same total n of 100, because it is the method whose selection rule depends on row order.
- Evidence that would contradict my hypothesis: If the simple random SD or bias changes by more than the variation I see across several seeds, or if the systematic SD stays near its baseline of 6.957 after the shuffle.

After I test it:

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above: 
Condition tested: row order only, using a shuffled copy of the clinic data with the wait times and the 10,000 appointments unchanged, with shuffle seeds 1, 2, and 3. 
Method challenged: simple random sampling, without replacement. 
Alternative: systematic sampling with a whole-number interval of k = 100, run as exact enumeration over all 100 starts with no seed. Sample size: n = 100 for every result. 
Seeds and repetitions: experiment seeds 12345 and 7, with 100 repetitions and, for one run, 1,000 repetitions on the simple random results. The results in the table above are from experiment seed 12345, shuffle seed 1, and 100 repetitions.
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above): The evidence supported my hypothesis. For simple random, the true mean stayed at 22.684 after the shuffle. The modified biases were small and changed sign across runs, from −0.130 to 0.166, and the baseline showed the same pattern, so I treat them as noise. The modified SDs ranged from 1.331 to 1.555, which overlaps the baseline range of 1.312 to 1.451. For systematic, the bias was 0.000 in every run because exact enumeration uses each start once, but the SD fell from 6.957 at baseline to between 1.304 and 1.619 after shuffling. My explanation is that the original interval of 100 matches the 100 appointments in a week, so every start picked rows from one weekday and slot, and shuffling broke that alignment. Limits: I tested only three shuffle seeds, two experiment seeds, and 100 and 1,000 repetitions, so small differences could be hidden by noise, and I can’t say systematic will always match simple random. Systematic, the alternative, showed that its reliability depends on row order while simple random’s did not. I made no revision to my hypothesis.

## 6. AI use

- Tools used:
- What I asked my agent to do, and what I checked myself:
- Automated checks my agent reported (I did not let it interpret my results):
