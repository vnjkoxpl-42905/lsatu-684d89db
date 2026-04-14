export interface RoleSection {
  id: string;
  title: string;
  body: string;
}

export interface RoleModule {
  id: string;
  title: string;
  description: string;
  sections: RoleSection[];
}

export const roleQuestionsContent: RoleModule = {
  id: 'role-questions',
  title: 'Role Questions',
  description: 'Mastering Role Questions: Identifying and analyzing the role of statements in LSAT arguments.',
  sections: [
    {
      id: 'sec-1',
      title: '01. Introduction to Role Questions',
      body: `**Role Questions** ask you to identify the function of a specific statement within an argument. The question stem will quote or paraphrase a statement and ask: *What role does it play?*

**The 3-Step Process:**

**Step 1: Isolate the Statement**
The first thing to do when approaching Role Questions is to isolate the statement the question is asking about. Highlight or underline it in the stimulus. This keeps you focused — if you analyze the wrong statement, your skills won't matter.

**Step 2: Read for Structure**
Read the stimulus as you would a Find the Conclusion question. Categorize each statement by its function and find the conclusion. You're doing two things: categorizing each statement according to its function, and finding the conclusion of the argument.

**Step 3: Determine the Relationship**
Ask yourself: how does the quoted statement relate to the conclusion?

---

**Example 1:**

*We will see a drastic increase in the cost of food in the near future. War in Ukraine has caused a significant disturbance on the global supply of grain and livestock feed. Inflationary pressure on the economy means that prices only have one place to go, and that is up.*

**Q:** What is the role played by the statement about inflationary pressure?

With the statement isolated, we read for structure. Statement 1 ("food will get more expensive") is an opinion — it has the potential to be the conclusion. Statements 2 and 3 are facts that support it. Both are independent premises supporting the conclusion. The inflationary pressure statement is **a premise, independently providing support for the argument's conclusion**.`,
    },
    {
      id: 'sec-2',
      title: '02. Intermediate Conclusions',
      body: `**Not every supporting statement is a simple premise.** Sometimes a statement both supports the main conclusion AND is itself supported by another statement. That makes it an **intermediate conclusion**.

---

**Example 2:**

*The diligent LSAT student should devote as much time to their emotional and physical wellbeing as to the studying of the LSAT itself. Studying for the LSAT is akin to training for a marathon and requires long term commitment and planning. As a result, ensuring one is in top shape mentally and physically will help the student on their performance.*

**Q:** What is the role played by the statement that ensuring one is in top shape mentally and physically will help the student?

**Analysis:**
- Statement 2 ("studying is like marathon training") supports the underlined statement.
- But is the underlined statement the main conclusion? Consider Statement 1: "students should devote time to wellbeing."
- Being in good shape helps performance → therefore we should take care of ourselves. The underlined statement is an **intermediate conclusion** which supports Statement 1, the main conclusion.

**Key Insight:** When a statement is both supported by evidence AND provides support for the main conclusion, it is an intermediate conclusion — not a simple premise.`,
    },
    {
      id: 'sec-3',
      title: '03. Opposing Views & Concessions',
      body: `**Not every statement in an argument supports the conclusion.** Some statements present views the author disagrees with. Recognizing these is critical for Role Questions.

---

**Example 3:**

*The court system must remain vigilant of the attempts made by politicians to damage its effectiveness. It has been argued that the separation of powers already keeps a country's judicial system independent and free from political interference. But all political and legal institutions are made by humans, and as such, they are fragile and prone to error.*

**Q:** What is the role played by the statement that the separation of powers keeps a country's judicial system independent?

**Analysis:**
- Statement 1 (courts must remain vigilant) is the conclusion.
- Statement 3 (institutions are fragile) is a premise supporting the conclusion.
- Statement 2 says institutional independence already protects courts. Does this support the conclusion that we need vigilance? **No — it runs contrary to it.**

This is an **opposing viewpoint**: a view the author disagrees with.

---

**Concession vs. Opposing View:**

These are similar but differ in one key way:
- **Opposing viewpoint:** What the other party thinks. The author disagrees with it.
- **Concession:** The author *acknowledges* a point from the other side but still holds their original view.

Compare:
- Opposing view: *"It has been argued that the separation of powers keeps courts independent."*
- Concession: *"Granted, the separation of powers keeps courts somewhat independent."*

In the concession, the author expresses partial agreement ("granted," "somewhat") before pushing back.`,
    },
    {
      id: 'sec-4',
      title: '04. Structural Traps',
      body: `**Step 3 of the process is your safety net.** Always double-check to make sure you haven't fallen into one of the structural traps test makers use:

**Common Traps:**
1. **Confusing an intermediate conclusion for THE conclusion.** An intermediate conclusion is supported by evidence, but it also supports something else. If a statement has support below it AND supports another claim above it, it's intermediate.

2. **Confusing an independent premise for an intermediate conclusion.** Ask: is this statement supported by any other statement in the argument? If not, it's a simple premise.

3. **Misidentifying peripheral information.** Background info, concessions, and opposing views are NOT part of the core argument structure. Don't mistake them for premises or conclusions.

---

**The Verification Checklist:**

After identifying the role of the quoted statement, run through this checklist:

✓ Have I correctly identified the main conclusion?
✓ Is the quoted statement supported by any other statement? (If yes → could be intermediate conclusion)
✓ Does the quoted statement support the conclusion? (If yes → premise or intermediate conclusion)
✓ Does the quoted statement oppose the conclusion? (If yes → opposing view or concession)
✓ Is the quoted statement just setting the scene? (If yes → background information)

---

**The Full Taxonomy of Statement Roles:**
- **Main Conclusion:** The primary claim the author is trying to prove
- **Intermediate Conclusion:** Supported by evidence AND supports the main conclusion
- **Premise:** Evidence that directly supports a conclusion
- **Opposing Viewpoint:** A view the author disagrees with
- **Concession:** A point the author partially acknowledges before pushing back
- **Background Information:** Context that sets the scene but doesn't directly support or oppose the conclusion`,
    },
    {
      id: 'sec-5',
      title: '05. Summary & Habits',
      body: `**Approaching Role Questions is no different from approaching Find the Conclusion questions at the start.** You analyze the stimulus statement by statement, find the conclusion and premises, then determine how the quoted statement fits into the argument.

---

**Habits for Success:**

1. **Locate the statement** the question asks about. Highlight it in both the question stem and the stimulus for a constant visual reminder.

2. **Read for structure.** Categorize each sentence and find the argument core: conclusion, premise(s), and any intermediate conclusions.

3. **Identify the quoted statement's role.** Ask: how does it relate to the conclusion? Does it support it? Oppose it? Set the scene?

4. **Double-check for traps.** Make sure you haven't confused an intermediate conclusion for the main conclusion, or mistaken an opposing view for a premise.

5. **Eliminate wrong answers confidently.** Once you know the role, incorrect answer choices will describe a different function entirely. Trust your structural analysis.

---

**Quick Reference — Common Role Descriptions in Answer Choices:**

| Role | How it appears in answer choices |
|------|-------------------------------|
| Main Conclusion | "the main point of the argument" |
| Intermediate Conclusion | "a claim that the argument uses to support its main conclusion" |
| Premise | "evidence used to support the argument's conclusion" |
| Opposing View | "a position that the argument challenges" |
| Concession | "a point that the argument acknowledges before reaching its conclusion" |
| Background | "context that helps establish the circumstances discussed" |

---

**You've completed the Role Questions bootcamp.** With practice, identifying statement roles will become second nature — and it's a skill that transfers to nearly every LR question type.`,
    },
  ],
};
