// AUTO-GENERATED from data/guided-drills/_seed.json. Do not edit by hand.
// Regenerate with: node scripts/build-guided-drills-local-seed.mjs
// Bundled so guided-drill launches resolve their pool client-side even when the
// live DB row is missing or lacks a bank_filter. See src/lib/guidedDrillsLocal.ts.

export const GUIDED_DRILLS_LOCAL_SEED = [
  {
    "slug": "w4-01-reconcile-the-pivot",
    "title": "Reconcile the Pivot",
    "category": "Pacing",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Important Pivot"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Within the world of Inference (**Most Supported / Must Be True**), we are trying to combine 2 or more ideas together in order to derive some synthesis of ideas.\n\nWe often can't predict what the correct answer will say, but we often can, if we pay attention to certain \"clue words\":\n\n- conditional indicators (if, only if, unless, requires, etc.)\n- causal relationships (because of this, due to this, this allows, this makes possible, as a result, this leads to, etc.)\n- quantifiers (most, some, all, no)\n- other mathematical ideas (percents, fractions, numbers, ratios)\n- pivots (but, yet, however)\n\nThe pattern we call _Reconcile the Pivot_ is when the last claim begins with a Pivot word. That provides a strong clue that we're supposed to reconcile that final fact with what came before it.",
      "right_md": "# Try these 5 problems in 8 mins\n\n1.5x: 12 mins / 2x: 16 mins\n\n- When you hit the pivot word (but / yet / however), think about how that new claim creates some tension with what came before or how it's relevant to the preceding ideas.\n\n- Try to mentally articulate what the net effect is of combining that pivot idea with what came before. Expect the answer to deal with whatever it is you're thinking in that moment.\n\n- Since these are Most Supported questions, remember that _Strong Language_ in the answer choices is a big red flag. We want the most provable answer, so weaker claims (with a lower burden of proof) are more attractive.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Important Pivot"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 4,
    "order_in_week": 1,
    "source_file": "00_pre_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-02-blended-set-parallel-paradox",
    "title": "BLENDED SET: Parallel + Paradox",
    "category": "Pacing",
    "estimated_minutes": 40,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Parallel and Paradox\n\ngo together like ketchup and soup\n\nWhich is to say, .... _not at all!_\n\nWe're purposefully mixing oil and water in this question set to remind our brain of how it feels on a real Logical Reasoning section when you have to totally take off one brain and put on another one, as you switch between some question types.\n\nCertainly, there's not much switching cost involved when you switch within a family.\n\nReading a stimulus for Strengthen, Weaken, Evaluate, Flaw, and Necessary Assumption will feel pretty similar. Reading an Agree / Disagree and a Most Supported feel somewhat the same.\n\nBut Parallel and Paradox are pretty darn far apart. Why?\n\n- What are we reading in each case. Is the stimulus an argument or not? Is it likely to have conditional logic or not?\n\n- How are we judging answers: based on whether they can be inferred? based on whether they would have the desired impact, if true? based on whether we can match them up with the stimulus?",
      "right_md": "# Try these 6 questions in 9 minutes\n\n(1.5x = 14 mins, 2x = 18 mins)  \nParallel tends to take longer than Paradox, so pace accordingly\n\n## PARADOX\n\n- We're not reading an argument.\n- The question stem will tell us what surprising idea we need to explain, or the final sentence of the stimulus will use a pivot word like \"but, yet, however\" to show us the surprising idea\n- Figure out what background fact, if any, makes this idea a surprise. Frame your thinking like this:\n\n_Given that .. background fact(s),_  \n_How can we explain ... surprising claim?_\n\n## PARALLEL\n\n- We are reading an argument.\n- Our job is to see the structure or reasoning pattern behind the argument.\n- If it's possible to describe the reasoning pattern conversationally (e.g. \"The author is arguing that if the extra effort has diminishing returns, it ain't worth it\") go for it.\n- But if we see _Conditionals, Quantifiers, or Repeating Ideas_, then it's usually better to create a little algebraic recipe for the argument.\n- Once you have a recipe for the argument, articulate the _first_ ingredient you plan to look for. Are you looking to see if there are two \"most\" claims? Are you checking to see whether the Conclusion has the same _probably_ strength as the original? Are you seeing whether there are two conditional premises that chain together?\n- Be suspicious of answers that have similar topics or other cheap superficial similarities."
    },
    "bank_filter": {
      "qtypes": [
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 4,
    "order_in_week": 2,
    "source_file": "00_pre_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-01-principle-strengthen-set-2",
    "title": "Principle-Strengthen (set 2)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Principle-Strengthen"
    ],
    "question_features": [
      "Principles in Answers",
      "Conditional Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## This set has 7 **Principle-Strengthen**\n## questions from tests 55-59\n\nAll of these examples are the much-more common style of Principle-Strengthen in which the _answers_ are principles. They often feel more like **Sufficient Assumption** than Strengthen, because the correct answer is usually a conditional rule that is triggered by the Evidence and results in the Conclusion.\n\nBut the question stem is technically a Strengthen task (which answer _most_ justifies), so we're not supposed to ask ourselves, \"Does this answer prove the conclusion\", even though in many cases it will. In some rare cases, though, the correct answer could be as weakly worded as a Necessary Assumption.\n\nNevertheless, our primary approach to these is to expect a conditional logic answer, so we pre-phrase by articulating an \"IF premise, THEN conclusion\" reasoning move.\n\nMost of the answers will be conditionals. If so, we want to be very **stubborn with the outcome** . The right side of the rule should match the conclusion (or at least sound like wording that would strongly support the conclusion). We want to be **flexible with the trigger** .\n\nOther answers feel more like comparative ideas that help _Weigh Tradeoffs_ or establish priorities. When arguments seem to be balancing competing ideas (a pro and a con / this obligation with that obligation), then when the author issues her judgment in the conclusion, she's revealing whether she cares more about the good thing or the bad thing, whether she cares more about this obligation or that obligation.\n\nGiven this argument, we'd anticipate a conditional answer\n_Billy lied to our customers. Thus he shouldn't be on our staff anymore._\n\n(A) A person can be on the staff only if they are consistently truthful with customers\n\nGiven this argument, we might see a weighing-tradeoffs answer\n_Billy is extremely dependable, although she lied to our customers. Clearly, she shouldn't be on our staff._\n\n(A) Dependability is a less important trait in a staff member than is honesty.",
      "right_md": "## Try these 7 problems, **untimed**\n\n- Once you find the Conclusion and identify the main Supporting Idea(s), you will generally want to articulate an, \"If [premise], then [conclusion]\" linking idea.\n\n- If, otherwise, you felt like the argument was grappling with competing interests, then articulate how the author is weighing tradeoffs:  \"she cares more about X than about Y\".\n\n- Try to get rid of a lot answers quickly because they don't have any good matching language for the conclusion, or because the matching language for the conclusion is being put on the **left** of the conditional arrow.\n\n- Correct answers will often, if not usually, be written in contrapositive form, so be willing to try that move. If you read \"should be on staff only if consistently truthful\", then you have to make your brain say, \"Okay, this is saying _if you're_ **_not_** _consistently truthful, should_ **_not_** _on staff_ \"."
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Strengthen"
      ],
      "features": [
        "Principles in Answers",
        "Conditional Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 4,
    "order_in_week": 1,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-02-principle-strengthen-application-set-1",
    "title": "Principle-Strengthen + Application (Set 1)",
    "category": "Process",
    "estimated_minutes": 26,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Principle-Strengthen",
      "Principle-Conform"
    ],
    "question_features": [
      "Principles in Answers",
      "Conditional Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Find the gap between a Rule and its Application\non these five **Principle-Strengthen** questions\n\n_example_\nPRINCIPLE: Lies are justified if they do more good than harm.\nAPPLICATION: Jason falsely claimed that Sharon has a driver's license to spare her getting mocked by her friends. Since he did manage to spare her the mockery, he was justified in lying.\n\nIn order to use this Rule to prove that a lie was justified, we have to establish the trigger:\n_the lie did more good than harm_\n\nSo the correct answer would need to convince us that \"keeping Sharon from getting mocked = did more good than harm\".\n\n(Note: there are two styles of Principle-Strengthen question:  _Principles in Stimulus vs. Principle in Answers_ . The latter kind is more than 10x more common, but the former kind shows up more on modern tests than it used to)",
      "right_md": "- Think about each Principle as having some criteria that must be met to trigger the rule, and having an outcome that matches up with the Application's conclusion.\n\n- The Application will (almost?) always conclude the right side of the Principle.\n\n- What we're being tested on is how the Evidence in the Application paragraph failed to clearly trigger the legal definition of the Principle.\n\n- Think about which part(s) of the Principle's trigger wasn't clearly established, and keep that mantra in your head as you consider answer choices."
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Strengthen",
        "Principle-Conform"
      ],
      "features": [
        "Principles in Answers",
        "Conditional Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 4,
    "order_in_week": 2,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-03-reconcile-the-pivot-set-2",
    "title": "Reconcile the Pivot (set 2)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 9,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Important Pivot"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Within the world of Inference (**Most Supported / Must Be True**), we are trying to combine 2 or more ideas together in order to derive some synthesis of ideas.\n\nWe often can't predict what the correct answer will say, but we often can, if we pay attention to certain \"clue words\":\n\n- conditional indicators (if, only if, unless, requires, etc.)\n- causal relationships (because of this, due to this, this allows, this makes possible, as a result, this leads to, etc.)\n- quantifiers (most, some, all, no)\n- other mathematical ideas (percents, fractions, numbers, ratios)\n- pivots (but, yet, however)\n\nThe pattern we call _Reconcile the Pivot_ is when the last claim begins with a Pivot word. That usually creates a tension with some idea(s) that came before it, and the correct answer almost always resolves or expresses that tension.",
      "right_md": "# Try these 9 problems, untimed\n\n- When you hit the pivot word (but / yet / however), think about how that new claim creates some tension with what came before or has some relevance to it.\n\n- Try to mentally articulate what the net effect is of combining that pivot idea with what came before. Expect the answer to deal with whatever it is you're thinking in that moment.\n\n- Since these are mainly Most Supported questions, remember that _Strong Language_ in the answer choices is a big red flag. We want the most provable answer, so weaker claims (with a lower burden of proof) are more attractive.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Important Pivot"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 9
    },
    "week": 4,
    "order_in_week": 3,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-04-causal-chains-set-2",
    "title": "Causal Chains - Set 2",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 9,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Necessary Assumption"
    ],
    "question_features": [
      "Causal Chains"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Causal Chains\n\npopular on **Most Supported, Must Be True,** and **Necessary Assumption**\n\nA causal chain is three or more things causally linked:  \n_Reading gives Jorge a headache, which makes him take a nap._\n\nThe test wants to make sure we see the implicit connection that  \n\"Reading leads to taking a nap\".\n\nWe might note causal chains on our paper like  \n**Reading → Headache → Take Nap**\n\nThis isn't the same as conditional logic, so we need to understand that these are \"causal\" arrows we're showing ourselves. With both causal chains and conditional chains, it's illegal to go backwards.\n\nYou wouldn't say that \"if **Nap**, then **Headache**, then **Reading**\"\n\nBut here's the big difference: with causal chains it's plausible to say \"if the first thing doesn't happen, the last thing won't happen\".\n\nOn a Most Supported task, we can feel pretty safe about ideas like  \n(A) If Jorge did less reading during the day, he would take fewer naps.\n\n# VOCAB\n\ngiven a causal chain, like **X → Y → Z**  \nwe can say that  \nX **directly** causes Y.  \nX **indirectly** causes Z.",
      "right_md": "# Try these 9 questions untimed.\n\nWork on building these causal chains,  \nbefore you look at answers.\n\nCausal chains within **Necessary Assumption** can be hard to understand because you're missing parts of the chain (the author is assuming them).\n\nEXAMPLE  \n_B causes C. So, I guess A causes D._\n\nThat's very confusing, because there are no repeating ideas!\n\nEXAMPLE  \n_Waking up earlier makes people be more productive at work in the morning. So, I guess getting a new dog might lead to a promotion._\n\nBe patient trying to find the right causal sequence. Put **any** cause / effect relationship you can find on the page, with space on your page to both the left and the right of that idea.\n\n_earlier wake → more prod morn_\n\nNow, go seek out something that has to do with causing someone to \"wake up earlier\", or find something that could be caused by \"having a more productive morning\".\n\nIn the author's mind, we have this causal sequence\n\n_get dog → wake up earlier → more productive morn → promotion_\n\n**ASSUMED** / **PREMISE** / **ASSUMED**\n\nThe middle idea was stated. The other two are assumed. If you go from beginning of the chain to the end, you get the author's conclusion, \"get dog → promotion\".\n\nRemember, on **Most Supported**, if you know that A leads to B leads to C, it's pretty fair to say \"if you cut back on A, you'll get less C\".\n\nBut watch out for switches between _factual claims_ and _opinionated claims!_\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Necessary Assumption"
      ],
      "features": [
        "Causal Chains"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 9
    },
    "week": 4,
    "order_in_week": 4,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-05-causal-difference-maker-first-taste",
    "title": "Causal Difference-Maker (First Taste)",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Causal Difference-Maker"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Causal Difference-Maker** is a fuzzy term we mainly on Most Supported questions. A ton of correct answers on Most Supported reward us for understanding some cause/effect relationship we were provided with in the stimulus. Here are the most common variations of how it crops up.\n\n## One Difference Explains Another Difference\n\n_Tim and Jill were both struggling with games. Jill, unlike Tim, decided to try meditating shortly after practicing each logic game. Jill no longer struggles with games, though Tim still does._\n\nThis seems to be suggesting that meditation was a Causal Difference-Maker when it comes to Jill getting better at games. We certainly can't prove that, but if you've been told about Difference X (Jill does meditation, Tim doesn't) then it's supportable to say it might be the reason for Difference Y (Jill no longer struggles with games).\n\n## Causal Connector Language\n\nAn individual claim can present a cause / effect connection by using a causal verb:\n\n- exercising **burns** calories\n- smoking **reduces** your life span\n- practicing LSAT **makes** you better at the test\n\nBut you can also create cause / effect connections by connecting two claims with causal language:\n\n- Jen is the only blonde in her family. **Because of this**, she gets picked on more by stand-up comedians. (_hair color can affect likelihood of being singled out by a performer_)\n- Carl wakes up at 430am every morning. **This allows** him to get to work in less time than if we were to wake later. (_the time you leave for work can affect how long it takes you to get to work_)\n\n## Apply the Causality\n\nSometimes we provided with a cause/effect connection and then expected to apply that connection to a specific situation:\n\nPerforming an awkward physical task, such as brushing your teeth wrong-handed, triggers a state of neural plasticity, which makes learning easier. Since Jamal is trying to learn LSAT as efficiently as possible, he should ______.",
      "right_md": "# Try these 6 questions untimed\n\n- Look for causal verbs, like \"_promotes, inhibits, increases, lowers, contributes to, influences_\". Look for \", -ing\" constructions that convey causation, such as \"Sarah yelled at the top of her lungs, shaking the vase on the shelf\".\n\n- Look for causal connector language that tells you that the previous sentence has a causal relationship to the present sentence, like \"because of this, due to this, this allows, this makes possible, accordingly, that is why\".\n\n- Look for one Difference that could potentially explain another Difference.\n\n- Look for someone to say _what really matters_, what the key concern is when making a judgment, a decision, a classification.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Causal Difference-Maker"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 4,
    "order_in_week": 5,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-06-missing-links-color-coded-set-2",
    "title": "Missing Links (color-coded) Set 2",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 7,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Links Between Premises"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "A lot of missing links and inferences rely on **common terms**.\n\nConsider this argument:  \n_Rex's painting uses bold colors. Artists are usually hiding the fact that their painting expresses no deep ideas if they use bold colors. Thus, Rex is probably ashamed of his painting._\n\nSeveral ideas were mentioned twice:\n\n- Rex's painting\n- bold colors\n\nThere was also a frequency modifier mentioned twice:\n\n- usually / probably\n\nA couple ideas were mentioned only once:\n\n- hiding the fact that the painting expresses no deep ideas\n- ashamed\n\nThe missing link in this argument is,  \n\"If an artist is hiding that their painting expresses no deep ideas, then they will be ashamed\".\n\nWhen we're searching for Missing Links, a good rule of thumb (though of course there are always exceptions) is **Mentioned Twice? That'll Suffice.**\n\nWhat that stupid slogan means is that the missing link is between buzzwords or phrases that only showed up once. The stuff that's said twice isn't going to be in our correct answer.",
      "right_md": "# Try these 7 problems, untimed.\n\n- Consider using the notepad window to cover up the answers, until you've typed a prediction.\n\n- You can also try using the highlighter and underline tools to mark off things that are mentioned twice. If you see \"Rex's painting\" mentioned twice in the paragraph, grab a highlighter and color both of those the same color. Once you've color-coded all the stuff mentioned twice, you know that the missing link exists between what remains.\n\n### Embedded image note\n\nThe screenshot includes an embedded example image showing the notepad window covering the answer choices. Preserve support for this visual if the guided drill instruction-card system can attach images.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen"
      ],
      "features": [
        "Missing Link / Idea",
        "Links Between Premises"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 4,
    "order_in_week": 6,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-07-assumption-family-medium-set-1",
    "title": "Assumption Family (Medium) Set 1",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# The three main Reasoning Structures\n\n**Conditional Logic** - Correct answers address the author's internal logic\n\n- assumed links between ideas\n- if/then rules\n- a missing fact needed to trigger a rule\n- valid and invalid conditional inferences\n\n**Comparisons** - Correct answers address assumed similarities or differences between two things:\n\n- part vs. whole\n- sample vs. general population\n- then vs. now\n- this situation vs. that situation\n- this group vs. that group\n\nOr they address the net gain / loss of a comparison:\n\n- doing this thing vs. not doing this thing\n- this thing vs. that thing\n- weighing the positives vs. the negatives\n\n**Causation** - Correct answers address one of two pressure points:\n\n- alternate explanations for some Curious Comparison\n- the plausibility of the author's explanation for it",
      "right_md": "# Try these 6 questions, untimed.\n\nWhen we're using **Conditional Logic** to \"prove an argument\", the **Left** side should be triggered by facts we know from the Evidence (or Answer Choice), and the **Right** side of the rule should match the Conclusion's language. If we want to weaken an argument's internal logic, then we're showing how the Left side is compatible with the **opposite** of the Right side (the Premise is compatible with the Anti-Conclusion).\n\nIf it feels like you're dealing with a **Comparison**, think about weakening with potential differences or strengthening by affirming some similarity. If you're dealing with a Net Gain / Loss type of Comparison, think about weakening with potential downsides or strengthening with \"equal or better\" ideas.\n\nIf the author is interpreting the **Causal** significance of some Curious Comparison (a weird asymmetry exists, or a study that has some interesting data), take time to understand the Author's Explanation, but then consider Alternate Explanations for the same curious fact (is the author confusing cause and effect? is the author failing to recognize that two things are linked to some third factor?)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 6
    },
    "week": 4,
    "order_in_week": 7,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-08-famous-flaw-easier-set-1",
    "title": "Famous Flaw (Easier) Set 1",
    "category": "Pacing",
    "estimated_minutes": 70,
    "question_count": 12,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "# Try 12 Famous Flaw problems\n\ntests: 50-54 / levels: 1-3\n\nGet better at spotting some famous flaw moves in the argument, and better at spotting some \"decoy\" famous flaws appearing in wrong answer choices.\n\nMany of the answers are not describing famous flaws. Some of the answer choices that are describing famous flaws will sound like the \"classic\" abstract language definition of that flaw, while others will use more unique or specific language to allude to the famous flaw.",
      "right_md": "# Set a timer for 18 mins\n\n1.5x = 27 mins  \n2x = 38 mins\n\n1. Try to get an answer to all 12 of these problems in the time limit.\n2. Flag any of them that feel like a struggle or a low-confidence guess.\n3. When the timer goes off, flip back through them and revisit your thinking in an untimed way, before checking out the explanation.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 12
    },
    "week": 4,
    "order_in_week": 8,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w4-09-intermediate-conclusion-set-1",
    "title": "Intermediate Conclusion - (Set 1)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Role",
      "Main Conclusion"
    ],
    "question_features": [
      "Intermediate Conclusions"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Try these five questions that test us on the presence (or absence) of _Intermediate Conclusions_.\n\n**Role** and **Main Conclusion** questions usually \"hide\" the conclusion by making it the **very first claim**, or by making it some **rebuttal claim**.\n\nThey will also sometimes complicate our assessment of the argument's structure by throwing in multiples conclusions.\n\nArguments need a claim we call the Conclusion, and some Support for that claim, which we call the evidence or the premise(s).\n\nSome of those supporting premises can _themselves_ also be considered conclusions, if _they_ are supported by at least one claim. The more common name for a _supported premise_ is an Intermediate Conclusion, or a Subsidiary Conclusion.\n\nAny time you're asking yourself, \"Is this claim a Conclusion?\", you should ask yourself \"_why should I believe this claim? did the author provide a supporting reason?_\" If it's really a Conclusion, then you'll be able to point to at least one claim that sounds like a reason offered for why we should believe that claim.\n\nIf a claim **has** support, we can call it a Conclusion.  \nIf it **provides** support, we can call it a Premise.  \nIf it **has** support and also **provides** support, an Intermediate Conclusion.\n\nIn the Assumption / Objection family, when an argument has this three part structure,  \n_Premise → Intermediate Conclusion → Main Conclusion_  \nthen the correct answer might deal with the connection between Premise and Intermediate Conclusion, or it might deal with the connection between the Intermediate and the Main Conclusion. Hence, we sort of have twice as much to worry about. We need to think about what assumptions are being made with each move, or what objections we might make.",
      "right_md": "# Try these problems, untimed\n\nthink through the following:\n\nHow can we tell whether there's an Intermediate Conclusion?\n\nAre there Support / Conclusion / Opinion indicators that help us show us when there is or isn't an Intermediate Conclusion?\n\nPractice testing whether a given claim X is or isn't a conclusion by asking yourself, \"**Why should I believe X?**\" If the author offers a reason, then we can call it a conclusion. If she doesn't, then it's just an unsupported claim."
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Main Conclusion"
      ],
      "features": [
        "Intermediate Conclusions"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 4,
    "order_in_week": 9,
    "source_file": "01_week_4_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-01-famous-flaws-medium-set-1",
    "title": "Famous Flaws (Medium) Set 1",
    "category": "Pacing",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## The flaw is usually one of the famous ten\n\nMedium Flaw questions reward pattern recognition. The author makes a reasoning move that breaks in a predictable way, and the LSAT reuses the same handful of breaks again and again. We call these the **Famous Flaws**.\n\nThe ten that show up most:\n- **Necessary vs. Sufficient** (a rule used backwards or negated)\n- **Causation** (correlation treated as cause, reversed cause, third factor)\n- **Sampling** (an unrepresentative group)\n- **Equivocation** (one word, two meanings)\n- **Percent vs. Amount** (a rate confused for a count)\n- **Ad Hominem** (attacking the source, not the claim)\n- **Circular** (the conclusion smuggled into the evidence)\n- **Whole vs. Part**\n- **Appeal to Authority / Popularity**\n- **False Choice** (only two options when more exist)\n\nAt the medium level the trap answers also describe famous flaws. A wrong answer names a real flaw that this argument simply never made.",
      "right_md": "## Try these 5, then time them\n\nSet a timer for **8 minutes** (1.5x = 12, 2x = 16). Get an answer to all five, and flag any that felt like a low-confidence guess.\n\nFor each argument:\n- Find the conclusion, then ask what the author had to assume to get there.\n- Name the broken move in your own words before you read the answers.\n- Match your prephrase to the famous-flaw list.\n\nWhen you read the answers:\n- A choice can describe a real flaw and still be wrong because the argument never made it. Ask, did this argument actually do this?\n- Some correct answers state the flaw in plain, specific language, not the textbook phrasing. Do not wait for the classic wording.\n\nAfter the timer, take a slow untimed second pass before you confirm. Note any flaw you keep missing."
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 8,
    "order_in_week": 1,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-02-conditional-logic-medium-set-6",
    "title": "Conditional Logic (Medium) Set 6",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the If / Then rule.\n\nWrite or think through the contrapositive as well.\n\nBeware the temptation to make illegal Reversals or Negations.\n\n_Conditional Logic, by question type_\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 8 problems featuring conditional logic.\n\nTry them all within 14 minutes (or 21, or 28), then circle back and confirm your thinking (untimed) before confirming your answer and reading the explanation, if available.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **Left** (sufficient conditions)  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **Right** (necessary conditions)  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  **unless**, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 8,
    "order_in_week": 2,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-03-must-be-false-medium-set-1",
    "title": "Must Be False (Medium) Set 1",
    "category": "Process",
    "estimated_minutes": 36,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "intermediate",
    "question_types": [
      "Must Be False"
    ],
    "question_features": [],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This is a set of four **Must Be False** questions, taken from tests 52, 56, and 57.\n\nThe correct answer contradicts something we're told or something that's implied by the paragraph. If we negated every answer choice and turned the question stem into \"Which of the following, **must be true**\", we'd get the same correct answer.\n\nSo if it fits your common sense better, you could think of a Must Be False question stem as saying, \"Which answer's negation Must Be True (or is Most Supported, if it's a squishier sense of must be false)?\"\n\nWhat does it mean to contradict _something we're told?_\n\n**Stimulus:** Marsha is taller than her classmate Simon.  \n**Correct answer:** Marsha is the shortest person in her class\n\n**Stimulus:** Lemonade tastes bitter unless sugar is added.  \n**Correct answer:** Marsha's new sugar-free lemonade has the natural zest of lemons without any bitterness to the taste.\n\nWhat does it mean to contradict _something that's implied?_\n\n**Stimulus:** Marsha is taller than her classmate Simon. Taller students are always more feared than shorter students.  \n**Correct answer:** Simon is the most feared person in his class\n\n**Stimulus:** There were more students at Valley High in 2022 than there were in 2021. By law, the school must maintain the same student to teacher ratio every year.  \n**Correct answer:** No teachers have been hired or fired from Valley High in the past two years.",
      "right_md": "# Try this set of problems untimed\n\nWhen we're doing **Must Be False**, there are two primary things to read for:\n\nIs there a _Conditional_?  \na huge pattern with Must Be False questions is that the paragraph includes a **conditional**, and the correct answer just contradicts that conditional.\n\nCan I make an inference by _Combining Ideas?_  \npretend you're reading a Must Be True (or Most Supported) question. Look for _Conditional, Causal, Mathematical_ wording. See if two or more ideas can be synthesized to derive something. If so, the correct answer will usually contradict that.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Must Be False"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 4
    },
    "week": 8,
    "order_in_week": 3,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-04-parallel-flaw-famous-flaws-set-2",
    "title": "Parallel Flaw + Famous Flaws (Set 2)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## Same broken move, new clothes\n\nThis set blends two tasks that lean on the same skill: spotting the **Famous Flaw** in an argument, then finding another argument that breaks the *same* way.\n\nOn **Parallel Flaw**, the correct answer matches the structure of the error, not the topic. A stimulus about vitamins and a correct answer about city budgets can be a perfect match if both commit the same Necessary vs. Sufficient slip.\n\nThe flaws you will see most here:\n- **Necessary vs. Sufficient** (a conditional rule used backwards or negated)\n- **Causation** (correlation read as cause)\n- **Whole vs. Part** and **Part vs. Whole**\n- **Percent vs. Amount**\n- **Equivocation**\n\nName the flaw in abstract terms and the matching gets much easier.",
      "right_md": "## Work the set untimed first\n\nFor each argument:\n- Find the conclusion and the support, then state the broken move as a rule: \"the author treats a necessary condition as if it were sufficient.\"\n- On **Parallel Flaw**, carry that abstract sentence to the answers and find the one that commits the identical move. Ignore the subject matter.\n- On straight **Flaw**, pick the choice that describes that same move, and watch for traps that name a different famous flaw the argument never made.\n\nCheck answers and explanations as you go. When two answers feel close on a Parallel question, the tie-breaker is usually whether the conclusion type matches: a prediction parallels a prediction, a recommendation parallels a recommendation."
    },
    "bank_filter": {
      "qtypes": [
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 8,
    "order_in_week": 4,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-05-relative-vs-absolute",
    "title": "Relative vs. Absolute",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Flaw"
    ],
    "question_features": [
      "Relative vs. Absolute"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Relative / Superlative vs. Absolute\n\nWe can say that Bill Gates is poorer than Jeff Bezos, even though we would never say Bill Gates is poor (even after the divorce). We can say that a grasshopper is taller than a ladybug, even though we wouldn't say that a grasshopper is tall.\n\nAdjectives like \"poor\" and \"tall\" are in absolute form. Something is poor or not-poor, tall or not-tall. Where does that threshold occur where you go from not-poor to poor, or from not-tall to tall? There's isn't any way to quantify most absolute adjectives, but we still know when they're being abused (such as calling Bill Gates poor or calling a grasshopper tall).\n\nBecause a relative adjective like \"poorer\" can be apt even though an absolute adjective like \"poor\" isn't (or vice versa), LSAT loves to test the distinction between these two forms. Some plan might be our best option, but still not be a good option. One restaurant might be farther away than another, but still not be far away. Always be cautious when you see that the stimulus/passage has used a word in one form but an answer choice is using it in the other form.",
      "right_md": "# Try these 7 problems untimed.\n\nWatch out for **Relative vs. Absolute** distinctions in the argument as well as in answer choices.\n\nThere's also a mathematical sense of Relative (fractions / percentages / ratios) vs. Absolute (amount / number). When authors see that a certain percentage is rising, they assume that means that the real number/amount is also rising.\n\nBut it's possible for a percentage to rise, even while the real number stays the same or shrinks.\n\nSuppose that last year a certain chess club had 4 boys and 4 girls on it. We can say 50% of the members were boys. Now what _if this year_, we find out that 80% of the members are boys. Does that mean more boys are on the chess club?\n\nNot necessarily, if 3 girls left, and the chess club is now 4 boys and 1 girl, then 80% of the club's members are boys, even though no new boys were added. Percents and fractions are a Relative relationship between numerator and denominator:\n\n_Boy members_  \n------------ = % of boys  \n_Total members_\n\nThe percent of boys can be changed by adding boy members to the numerator or by subtracting non-boy members from the denominator. When authors assume that going from 50% boys to 80% boys means more boys, they're assuming that the denominator is at least as big as before. They're assuming that this percentage increase was _not_ caused by non-boy members leaving.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Flaw"
      ],
      "features": [
        "Relative vs. Absolute"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 8,
    "order_in_week": 5,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-06-science-strengthen-weaken",
    "title": "Science + Strengthen / Weaken",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 8,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Strengthen",
      "Weaken"
    ],
    "question_features": [
      "Science",
      "Plausibility",
      "Missing Link / Idea"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# # of questions: 8\n\n**Question Type:** Strengthen / Weaken  \n**Difficulty Level:** 4 and 5  \n**Tests:** pt 23 - 44  \n**Theme:** science-heavy stimulus\n\nThis question set contains 8 tough questions, all level 4-5, Strengthen / Weaken, with Science-heavy paragraphs. These are the questions that can become quicksand time-suckers. We try to buy time on easier questions so that we have adequate time to think about these.\n\nUltimately, the gross vernacular of science questions is just a distraction. We're still playing the same old reasoning games, so pay more attention to reasoning patterns and right/wrong answer tendencies for that question type, and pay less attention to getting a thorough understanding of whatever scientific concept is being discussed.",
      "right_md": "# Choose a study goal\n\n_Untimed:_ Focus on perfect accuracy  \n_Timed:_ 12 mins keep-it-moving\n\nFor **Weaken** questions, focus on the _Anti-Conclusion_. After you read the argument, frame your goal by saying:\n\n_Given_ this evidence  \n_How can I still argue_ the anti-conclusion?\n\nFor **Strengthen** questions, remember that when you're dealing with scientific hypotheses, you can strengthen by either _Ruling Out_ an Alternate Hypothesis, or you can _Boost the Plausibility_ of the Author's Hypothesis.\n\nFor **Strengthen + Principle**, focus on finding an answer that works like \"If _evidence_, then _conclusion_\". A lot of answers are easy to eliminate because they aren't rules that are set up to have the conclusion on the right side of the arrow.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Strengthen",
        "Weaken"
      ],
      "features": [
        "Science",
        "Plausibility",
        "Missing Link / Idea"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 8,
    "order_in_week": 6,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-07-principle-conform-principle-in-stimulus-set-1",
    "title": "Principle-Conform + Principle in Stimulus (set 1)",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Principle-Conform"
    ],
    "question_features": [
      "Principles in Stimulus"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "When a **Principle-Conform** stimulus is providing an explicit principle (or two), we're usually being tested on our ability to apply a conditional rule.\n\nIf the rule(s) is conditional, then we need to be attentive to conditional logic words, conjunctions such as \"and / or\", and sometimes even little qualifying adjectives, as we diagram how the rule works.\n\n_a brutally hard example_  \nA resignation offered under duress should be accepted only if the person resigning still endorses it one week later or they spoke to HR about it before submitting the resignation.\n\n**only if** = put it on the right\n\noffered under duress  \nand  \nshould be accepted  \n→  \nstill endorsed 1 week later  \nor  \nspoke to HR before\n\nThe way these principles get used, you want the normative, \"Judgey\" term to be on the right of the arrow (in this case, whether it _should / shouldn't_ be accepted sounds like the judgment this rule would render). So an effective rephrase would be something like this:\n\nresignation offered under duress  \nand  \ndidn't speak to HR before  \nand  \nnot endorsed 1 week later  \n→  \nshould not be accepted\n\nThis is not the only form a correct version could take. We could consider leaving off the context-setting idea that we're talking about resignations offered under duress and just focus on whether we should accept it based on whether the person spoke to HR and whether they endorsed it 1 week later.\n\nOften, simplifying down to the core ideas is beneficial. But if we end up with two answers that both seem to work (they're both seeming to let us conclude that we shouldn't accept a resignation), then we need to re-read the principle because we might be missing some of the context-setting qualifiers like \"under duress\" that we selectively ignored while diagramming.\n\nPerhaps only one of those two remaining answers actually establishes that this resignation was under duress.",
      "right_md": "# Try these 8 problems, untimed.\n\n- 5 of them want us to apply 1 or 2 conditional rules.\n- 2 of them want us to conform to a fuzzier, non-conditional rule or pattern.\n- 1 of them wants us to actually find a situation that **violates** the rule.\n\nGiven a principle: _has cinnamon in it → delicious_  \nWe can only use that rule to conclude that something is delicious. Rules can only prove what's on their **right** side. So if we saw any answer choices that were concluding, \"Therefore, the soup was _not_ delicious\", we immediately know that answer is wrong.\n\nWhen we're given two rules, we're only going to be using one or the other to justify our correct answer. Start each answer choice by scanning for the conclusion, so that you can see which rule it's trying to use. That way you can remind yourself of what _that_ rule is all about (ignoring the other one temporarily), and just focus on whether the answer choice clearly establishes the trigger of the rule it's trying to use.\n\nViolating a rule means that you trigger the left side but go against the right side. If we said that \"Jonathan had an apple pie that had cinnamon and whip cream in it, but it wasn't that tasty\", that would violate the principle above.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Conform"
      ],
      "features": [
        "Principles in Stimulus"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 8,
    "order_in_week": 7,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-08-principle-conform-principles-in-answers-set-1",
    "title": "Principle-Conform + Principles in Answers (Set 1)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Principle-Conform"
    ],
    "question_features": [
      "Principles in Answers"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "These 5 problems are all **Principle-Conform** with principles in the answers, taken from tests 50-54. The question stems look something like this.\n\n- Which of the following principles most conforms to the reasoning in the argument?\n- Which of the following most accurately expresses the principle underlying the reasoning above?\n\nWe often think of this question as the \"Necessary Assumption\" version of Principle. They're similar in that we would be wary of any answer whose wording seems go beyond what the author said (either in Strength or Scope).\n\nThey're different in the sense that on Necessary Assumption the correct answer is only linking together Premise and Conclusion language about 40% of the time, whereas with Principle-Conform, it will be linking Premise and Conclusion language about 90% of the time.\n\nIt's essentially the same mindset as a Principle-Strengthen question. We are still pre-phrasing \"IF evidence, THEN conclusion\" and then expecting our correct answer to _Link_ language from the Evidence to the Conclusion's language. All that's different is that because the question stem says _conform_ to the author's reasoning, we can't pick an answer that's overly strong. (That usually doesn't matter, but occasionally it does)",
      "right_md": "# Try these 5 problems, untimed\n\nOnce you find the Conclusion and identify the main Supporting Idea(s), you will generally want to articulate an, \"If [premise], then [conclusion]\" linking idea.\n\nIf, otherwise, you felt like the argument was grappling with competing interests, then articulate how the author is weighing tradeoffs: \"she cares more about X than about Y\".\n\nTry to get rid of a lot answers quickly because they don't have any good matching language for the conclusion, or because the matching language for the conclusion is being put on the **left** of the conditional arrow.\n\nCorrect answers will often, if not usually, be written in contrapositive form, so be willing to try that move. If you read \"should be on staff only if consistently truthful\", then you have to make your brain say, \"Okay, this is saying _if you're not consistently truthful, should not on staff_\".\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Conform"
      ],
      "features": [
        "Principles in Answers"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 8,
    "order_in_week": 8,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-09-most-supported-causal",
    "title": "Most Supported + Causal",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Most Strongly Supported"
    ],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This is a set of 5 **Most Supported** questions, each of which is testing a cause/effect relationship.\n\nOn Most Supported questions, we're provided with a paragraph of information and then tested on which answer can best be derived from that paragraph (i.e., \"which answer is most provable, using only the info we've provided\").\n\nSome of the questions in this set ask us which Generalization / Proposition we can best derive. We have the same mentality as any other Most Supported question; this twist just means that the answers will sound more abstract and general.\n\nIt's easier to derive / prove a safely worded claim than it is to prove a strongly worded claim, so lean towards answers with a lower burden of proof.\n\nAll five correct answers will be rewarding our ability to understand some Cause / Effect relationship revealed by the paragraph.",
      "right_md": "- Try these five questions, **untimed**.\n- Pick the most provable answer.\n- The correct answers all reinforce some cause/effect connection presented in the stimulus.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported"
      ],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 8,
    "order_in_week": 9,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-10-quantifiers-trait-overlap-inferences",
    "title": "Quantifiers: Trait Overlap inferences",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 8,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Flaw"
    ],
    "question_features": [
      "Quantifiers"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Questions involving multiple quantified words are usually testing our ability to see when two traits do / don't have to overlap, and to what degree.\n\n# COMMON QUANTIFIERS\n\n**100%** - _all, any, each, every_, (or universal nouns)  \n**more than 50%** - _most, usually, typically, generally, majority_  \n**less than 50%** - _few, rarely, infrequently_  \n**at least a handful** - _many, commonly, often_  \n**at least one** - _some, sometimes, can, not all, not always, need not_\n\nIf we see a conditional-strength quantifier like \"No A's are B\", we think\n\nA → ~B  \nB → ~A\n\nIf there are any additional facts about A or B, then we can derive a Trait Overlap inference.\n\n| ADDITIONAL FACT | WE CAN INFER |\n|---|---|\n| Some X's are B | Some X's are ~A |\n| Some B's are X | Some X's are ~A |\n| Most B's are X | Some X's are ~A |\n| Most X's are B | Most X's are ~A |\n| All X's are B | All X's are ~A |\n| All B's are X | Some X's are ~A |\n\n_If we know_ Some X's are B  \n_and we know_ All B's are ~A  \n_we can derive_ Some X's are ~A\n\n_If we know_ Most X's are B  \n_and we know_ All B's are ~A  \n_we can derive_ Most X's are ~A\n\n_but if we know_ Most B's are X  \n_and we know_ All B's are ~A  \n_we can only derive_ Some X's are ~A\n\nIn the first two examples, we can hook the conditional onto the end of the first statement, and that allows us to \"chain\" the trigger of the first claim to the outcome of the conditional.\n\nIn the third example, the overlapping term is the trigger in both claims, so we can't \"chain\" the ideas together. But we still know for sure that there are some X's who have the property of being B, and thus they also must have the property of being ~A.\n\nSome quantified claims mean the same thing even when you reverse the terms. \"Some dogs are brown = some brown things are dogs\". Other quantified terms definitely don't mean the same thing if you reverse the terms. \"Most Senators are men ≠ Most men are Senators\".\n\n# REVERSIBLE\n\nSome X's are Y = Some Y's are X  \nMany X's are Y = Many Y's are X  \nNo X's are Y = No Y's are X\n\n# NOT REVERSIBLE\n\nMost X's are Y ≠ Most Y's are X  \nAll X's are Y ≠ All Y's are X\n\n# WE CAN ONLY SAY\n\nSome Y's are X  \nSome Y's are X\n\nSometimes, we can infer something from two **Most** claims.\n\nGIVEN:  \nMost A's are B  \n+ Most A's are C\n\nMost A's are B  \n+ Most B's are ~A\n\nINFER:  \nSome B's are C  \nThere are more B's than A's\n\nThen there's a famous **incorrect** inference from two Most claims:\n\nGIVEN:  \nMost A's are B  \n+ Most B's are C\n\nINFER:  \nnothing (but LSAT authors think, \"Most A's are C\")",
      "right_md": "# Try these 8 questions, untimed.\n\nIf the question is testing us on what can be inferred, scan primarily for **conditional** strength quantifiers (_all / each / every / any / no / none_, or anything else that's conditional).\n\nIf we find a conditional, then we look to see whether the trigger of that conditional (or the trigger of the contrapositive) shows up in any other claim.\n\nIf so, then we can combine those claims to derive **Some** overlap between the two other traits.\n\nFor example, if we're told \"All cats are sneaky\" we have two triggers:\n\ncat → sneaky  \nnot sneaky → not cat\n\nIf we see \"cat\" or \"not sneaky\" in any other claim, then we can make a trait overlap inference.\n\nIf they tell us \"Some cats are smelly\", then we know that \"smelly and sneaky overlap, at least sometimes\".\n\nIf they tell us that \"Some of Alan's pets are not sneaky\", then we know that \"Some of Alan's pets are not cats\".\n\nIf we're being tested on what's Flawed about an argument, then the author is probably going to be assuming that two traits overlap, even though it's possible they never show up together.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Flaw"
      ],
      "features": [
        "Quantifiers"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 8,
    "order_in_week": 10,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-11-must-be-false-medium-set-2",
    "title": "Must Be False (Medium) Set 2",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "intermediate",
    "question_types": [
      "Must Be False"
    ],
    "question_features": [],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This is a set of four **Must Be False** questions, taken from tests 62, 69, and 71.\n\nThe correct answer contradicts something we're told or something that's implied by the paragraph. If we negated every answer choice and turned the question stem into \"Which of the following, **must be true**\", we'd get the same correct answer.\n\nSo if it fits your common sense better, you could think of a Must Be False question stem as saying, \"Which answer's negation Must Be True (or is Most Supported, if it's a squishier sense of must be false)?\"\n\nWhat does it mean to contradict _something we're told?_\n\n**Stimulus:** Marsha is taller than her classmate Simon.  \n**Correct answer:** Marsha is the shortest person in her class\n\n**Stimulus:** Lemonade tastes bitter unless sugar is added.  \n**Correct answer:** Marsha's new sugar-free lemonade has the natural zest of lemons without any bitterness to the taste.\n\nWhat does it mean to contradict _something that's implied?_\n\n**Stimulus:** Marsha is taller than her classmate Simon. Taller students are always more feared than shorter students.  \n**Correct answer:** Simon is the most feared person in his class\n\n**Stimulus:** There were more students at Valley High in 2022 than there were in 2021. By law, the school must maintain the same student to teacher ratio every year.  \n**Correct answer:** No teachers have been hired or fired from Valley High in the past two years.",
      "right_md": "# Try this set of problems untimed\n\nWhen we're doing **Must Be False**, there are two primary things to read for:\n\nIs there a _Conditional_?  \na huge pattern with Must Be False questions is that the paragraph includes a **conditional**, and the correct answer just contradicts that conditional.\n\nCan I make an inference by _Combining Ideas?_  \npretend you're reading a Must Be True (or Most Supported) question. Look for _Conditional, Causal, Mathematical_ wording. See if two or more ideas can be synthesized to derive something. If so, the correct answer will usually contradict that."
    },
    "bank_filter": {
      "qtypes": [
        "Must Be False"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 4
    },
    "week": 8,
    "order_in_week": 11,
    "source_file": "01_week_8_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-01-causal-difference-maker-set-1",
    "title": "Causal Difference-Maker (Set 1)",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Causal Difference-Maker"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Causal Difference-Maker** is a fuzzy term  \nwe use for a variety of things:\n\n## One Difference Explains Another Difference\n\n_Tim and Jill were both struggling with games. Jill, unlike Tim, decided to try meditating shortly after practicing each logic game. Jill no longer struggles with games, though Tim still does._\n\nThis seems to be suggesting that meditation was a Causal Difference-Maker when it comes to Jill getting better at games. We certainly can't prove that, but if you've been told about Difference X (Jill does meditation, Tim doesn't) then it's supportable to say it might be the reason for Difference Y (Jill no longer struggles with games).\n\n## The Most Important Consideration\n\nA lot of arguments and 2-speaker conversations are about how we should go about making a decision, or how we should define a certain thing, or how we should evaluate something, or what matters more between two things. Whatever is identified as the \"main thing\" we should base our decisions / evaluation / definition on is what we might call the Causal Difference-Maker.\n\n## Flip the Causal Difference-Maker\n\nWhen we're told that X happened, because of Y, then a popular style of correct answer has the form of, \"if Y hadn't happened, then X wouldn't have\". We sometimes call this Flipping the Causal Difference-Maker. \"If the causal difference-maker hadn't occurred, then the effect wouldn't have been observed\".",
      "right_md": "# Try these 6 questions untimed\n\n- Look for causal verbs, like \"_promotes, inhibits, increases, lowers, contributes to, influences_\". Look for \", -ing\" constructions that convey causation, such as \"Sarah yelled at the top of her lungs, shaking the vase on the shelf\".\n\n- Look for causal connector language that tells you that the previous sentence has a causal relationship to the present sentence, like \"because of this, due to this, this allows, this makes possible, accordingly, that is why\".\n\n- Look for one Difference that could potentially explain another Difference.\n\n- Look for someone to say _what really matters_, what the key concern is when making a judgment, a decision, a classification.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Causal Difference-Maker"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 6
    },
    "week": 5,
    "order_in_week": 1,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-02-conditional-logic-easier-set-4",
    "title": "Conditional Logic (Easier) Set 4",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 9,
    "difficulty_min": 1,
    "difficulty_max": 2,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the **If / Then** rule.\n\nWrite or think through the contrapositive as well. Beware the temptation to make illegal Backwards or Opposite moves.\n\nThe LR question types that most often would prompt us to consider diagramming the Conditional Logic are\n\n- Must Be True\n- Most Supported\n- Assumption (mostly Sufficient than Necessary)\n- Parallel / Parallel Flaw\n- Principle-Strengthen / Principle-Conform",
      "right_md": "# Try these 9 problems, level 1-2\n\nTry them all within 12 minutes, then circle back and confirm your thinking (untimed) before confirming your answer and reading the explanation, if available.\n\nHow does Conditional Logic show up, by question type?\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 2,
      "count": 9
    },
    "week": 5,
    "order_in_week": 2,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-03-anti-causal-set-2",
    "title": "Anti-Causal - Set 2",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Weaken",
      "Flaw",
      "Strengthen"
    ],
    "question_features": [
      "Anti-Causal"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Anti-Causal** arguments assume or conclude that X ...\n\n- ... doesn't seem to make a difference\n- ... doesn't seem to be helping\n- ... isn't likely to be causing Y\n\n## DOESN'T MAKE A DIFFERENCE\n\nAnn and Jerry both studied LSAT for 3 months, but only Ann added a mindfulness regimen to her studying. Since they both ended up with similar LSAT scores, apparently the mindfulness regimen didn't do anything for Ann.\n\n## DOESN'T SEEM TO BE HELPING\n\nThe companies that are guilty of the most egregious environmental violations are also the companies that are most scrutinized by environmental regulators. This just goes to show the futility of trying to stop companies from damaging the environment with regulatory oversight.\n\nWhen President Knowles took office, the unemployment rate was 9%. Shortly after her stimulus bill passed, the unemployment rate hit 10%. Clearly, her stimulus bill did nothing to help employment.\n\n## ISN'T LIKELY TO BE CAUSING Y\n\nSomeone has been buying ads in the school paper to promote the campaign of Lucas, for Class President. It's rumored that the person buying the ads is Alicia. However, this rumor is clearly false, since Alicia's best friend Trixie is Lucas's main opponent in this class election.",
      "right_md": "# Try these 8 anti-causal questions, untimed.\n\nKeep an eye out for some of these common anti-causal objections:\n\n## Would have been even worse without\n\nIf the environmental regulators _weren't_ on top of these offending companies, the companies' behavior would be even worse. If it weren't for that stimulus, the unemployment rate would be 12%.\n\n## More frequent source of problem gets more attention\n\nThe fact that these bad-acting companies have the most oversight doesn't mean that oversight does nothing to help; we will always direct more of our Solution Efforts to the Biggest Source of a problem. That will always leave someone able to disingenuously argue, \"See? The solution efforts don't work. In the places where we have most solution efforts, we have biggest incidence of problem.\"\n\n## Not fair to compare / different starting points / different obstacles\n\nThe mindfulness _did_ help Ann, because she went from a 140 to a 160, whereas Jerry just went from a 150 to 160, or because she tends to have test anxiety that lowers her score on test day whereas he doesn't.\n\n## Overlooked consideration\n\nEven though Alicia's best friend Trixie is running against Lucas, Alicia doesn't want Trixie to win and thus be less available for chillaxing, so Alicia has motive to want Trixie to lose.\n\nNote: when a conclusion is saying \"X wasn't caused by Y, it was caused by Z\", there are two equally valid ways to affect that conclusion:\n\n- information helping us to assess whether it _wasn't_ Y\n- information helping us to assess whether it _was_ Z\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Weaken",
        "Flaw",
        "Strengthen"
      ],
      "features": [
        "Anti-Causal"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 5,
    "order_in_week": 3,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-04-explain-curious-fact-medium-set-1",
    "title": "Explain Curious Fact (Medium) Set 1",
    "category": "Pacing",
    "estimated_minutes": 56,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "intermediate",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This set has four Weaken, a Necessary Assumption, and a Strengthen question.\n\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact.\n\n- The correct answer (on any Assumption / Objection Family question type) will deal either with an **Alternate Explanation** for the curious fact or with the **plausibility** of the Author's Explanation.",
      "right_md": "# Try these 6 questions in 9 minutes\n\n(1.5x = 14 mins, 2x = 18 mins)\n\nWhat is the **Curious Fact?** (ask it as a question)\n\n- what language tips us off?\n\nWhat is the **Author's Explanation / Hypothesis?**\n\n- Is there a causal verb in the conclusion?\n- Remember to spell out every link in the causal chain that author is envisioning, from initial Cause to ultimate Effect.\n\nDoes the correct answer deal with an **Alternate Explanation?**\n\n- If so, _Reverse Causality_ or _Third Factor?_\n\nOr does it address the **plausibility** of the Author's Explanation?\n\n- If no, does it use \"covariation\" data points, or some other means?  \n  (covariation means stuff like _No Cause, No Effect_ as a strengthener, or stuff like _Cause w/o Effect / Effect w/o Cause_ as a weakener)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 5,
    "order_in_week": 4,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-05-assumption-family-medium-set-3",
    "title": "Assumption Family (Medium) Set 3",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 6,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# The three main Reasoning Types\n\n**Conditional Logic** - Correct answers address the internal logic:\n\n- assumed links between ideas\n- if/then rules\n- a missing fact needed to trigger a rule\n- valid and invalid conditional inferences\n\n**Comparisons** - Correct answers address assumed similarities or differences between two things:\n\n- part vs. whole\n- sample vs. general population\n- then vs. now\n- this situation vs. that situation\n- this group vs. that group\n\nOr they address the net gain / loss of a comparison:\n\n- doing this thing vs. not doing this thing\n- this thing vs. that thing\n\n**Causation** - Correct answers relate to one of these two angles:\n\n- alternate explanations for the curious background fact\n- the plausibility of the author's explanation for it.",
      "right_md": "# Try these 6 questions, untimed.\n\nIf it feels like you're dealing with Rules, or **if / then logic**, then focus on understanding the If / Then rule. What idea goes on the **Left** of the conditional arrow? What idea goes on the **Right?** When we're using **Conditional Logic** to \"prove an argument\", the **Left** side should be triggered by facts we know from the Evidence (or Answer Choice), and the **Right** side of the rule should match the Conclusion's language.\n\nIf it feels like you're dealing with a **Comparison**, think about weakening with potential differences or strengthening by affirming some similarity. If you're dealing with a Net Gain / Loss type of Comparison, think about weakening with potential downsides or strengthening with \"equal or better\" ideas.\n\nIf the author is interpreting the **Causal** significance of some Curious Fact (a weird asymmetry exists, or a study that has some interesting data), take time to understand the Author's Explanation, think about what kind evidence would help make that Explanation seem more/less plausible, and be sure to consider Alternate Explanations for that same Curious Fact.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 6
    },
    "week": 5,
    "order_in_week": 5,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-06-causal-difference-maker-set-2",
    "title": "Causal Difference-Maker (set 2)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 10,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Necessary Assumption"
    ],
    "question_features": [
      "Causal Difference-Maker"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "**Causal Difference-Maker** is a very malleable term we can use in a range of difference contexts. It's a useful mental construct because when the stimulus presents something we could describe this way, the correct answer is almost always testing our understanding of the causal difference-maker. Here are some of the ways it shows up.\n\n- when you're hearing about the linchpin, the crucial element, the clutch factor that's involved in making some decision or producing some effect, you're talking about a reaaaal **causal difference-maker**\n\n_you're trying to decide whether to stay at the library past midnight to study more by yourself or to call it a night and walk back with your study buddies to the parking lot. your most important criterion is feeling safe, so that's the causal difference-maker that makes you say, \"wait up, guys. I'm leaving, too.\"_\n\n- when you're given a causal relationship and you have a way to apply it to some comparison\n\n_Having a taller frame makes your center of gravity higher. Ann is taller than Martin_ -- you'll end up thinking to yourself, \"this cause they told me about will **make a difference** between the two things in this comparison. Ann's center of gravity will be higher.\"\n\n- when you're trying to solve a causal mystery, you're searching for the explanation or the **causal difference-maker**\n\n_Ever since Randy came back from summer camp, he's had an itchy rash._ (Maybe it's poison ivy? Some reaction to the water from the lake? Bed bugs from the bunks? Whatever it is, the camp probably caused his rash)\n\n- when the test identifies factors that made a key difference, they often test our understanding of that with answers that feel like, \"If that **causal difference-maker hadn't occurred,** then things would be different\"\n\n_I saw Bernadette doing a call exercise I had never seen, so I started copying it. Because of this, I was able to dunk a basketball by the end of the summer. (had I not seen her call exercise, I probably wouldn't have dunked by the end of summer)_",
      "right_md": "# Try these 10 questions untimed\n\nLook for causal verbs, like \"promotes, inhibits, increases, lowers, contributes to, influences\". Look for \", -ing\" constructions that convey causation, such as \"Sarah yelled at the top of her lungs, shaking the vase on the shelf\".\n\nLook for causal connector language that tells you that the previous sentence has a causal relationship to the present sentence, like \"because of this, due to this, this allows, this makes possible, accordingly, that is why\".\n\nLook for one Difference that could potentially explain another Difference.\n\nApply cause/effect relationships to two halves of a comparison (one that has more of the causal factor, one that has less).\n\nLook for someone to say _what really matters_, what the key concern is when making a judgment, a decision, a classification.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Necessary Assumption"
      ],
      "features": [
        "Causal Difference-Maker"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 5,
    "order_in_week": 6,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-07-describing-arguments-set-2",
    "title": "Describing Arguments (set 2)",
    "category": "Pacing",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Role",
      "Method of Reasoning",
      "Main Conclusion"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This 10 question set is comprised of three questions from the Match Family, which test our ability to understand what role certain claims are playing: Role, Method, and Main Conclusion.\n\n# Role and Main Conclusion\n\nMost questions \"hide\" the conclusion in one of two ways:\n\n- it's the **very first claim**, or\n- it's attached to some **pivot / rebuttal**\n\n**Opinion** indicators and **Pivot** indicators are very helpful for finding the parts of the argument.\n\nWhen we're assessing whether something is a conclusion (be it main conclusion or intermediate conclusion), we should ask ourselves,\n\n\"**Is this Supported?** Why should we believe this?\"  \nIf no support it provided, then it isn't a conclusion.\n\n# Method\n\nThese use a lot of abstract verbiage to describe parts of arguments. We want to not only learn how to read this type of language but also to start to think more in terms of this language. When you're using abstract language, you're speaking about general forms / archetypes, and the magic of getting better at standardized tests is getting better at recognizing the general forms / archetypes that show up a lot on that test.\n\nWe should get used to the most typical types of reasoning moves:\n\n- Analogies / Distinctions\n- Suggesting / Ruling out Alternatives\n- Overlooked Consideration / Dubious Assumption\n- Flawed Implications of a Claim or Plan",
      "right_md": "Length -- **10 questions, 15 mins** (1.5x = 23, 2x = 30)  \nTypes -- **Role, Method, and Main Conclusion**  \nTests -- **65, 71, and June 2007**  \nLevels -- **1 - 4**\n\n- Try to answer all 10 questions in 15 minutes.\n- Flag a problem every time you feel less confident in your answer or feel like you struggled to get there.\n- When your timer goes off, flip back through the questions via the Results page and take a second look, hit SHOW ATTEMPT, and check out the Explanation (if there is one).\n- Add any takeaways you want to the NOTES window (a movable, resizable popup), by clicking on the icon in the lower left of the page.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Method of Reasoning",
        "Main Conclusion"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 10
    },
    "week": 5,
    "order_in_week": 7,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-08-agree-disagree-set-2",
    "title": "Agree/Disagree - Set 2",
    "category": "Pacing",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Agree/Disagree"
    ],
    "question_features": [
      "2-Speaker",
      "Battle of Opinions"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## Find the one claim they actually clash on\n\nAgree / Disagree questions (also called Point at Issue) give you two speakers. The correct answer is the single statement where one speaker would **affirm** it and the other would **deny** it.\n\nMost wrong answers fail one of two tests:\n- Only one speaker addresses it, so we cannot know the other's view.\n- Both speakers would actually take the same side.\n\nYou are not hunting for conclusion versus support here. You are mapping what each person commits to, then finding the one point of genuine collision.",
      "right_md": "## Try these 5 in 8 minutes\n\n(1.5x = 12, 2x = 16). Read each person's paragraph for what they claim, not for argument structure.\n\nThen, for each claim the first speaker made, ask:\n- Did the second speaker **agree**, **disagree**, or give **no comment**?\n- If no one stated it outright, would the first speaker's reasoning force a view the second speaker rejects?\n\nThe right answer is the claim where one says yes and the other says no. Run each choice through a simple check: could both speakers fill in a clear \"I agree\" or \"I disagree\"? If either has to shrug, that answer is out."
    },
    "bank_filter": {
      "qtypes": [
        "Agree/Disagree"
      ],
      "features": [
        "2-Speaker",
        "Battle of Opinions"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 5,
    "order_in_week": 8,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-09-conditional-logic-medium-set-1",
    "title": "Conditional Logic (Medium) Set 1",
    "category": "Pacing",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "- Find **Conditional Indicator** words and use them as a way to organize how you write the If / Then rule.\n\n- Write or think through the contrapositive as well.\n\n- Beware Illegal Reversals and Negations.\n\nThe LR question types that most often would prompt us to consider diagramming the Conditional Logic are\n\n- Must Be True\n- Most Supported\n- Assumption (mostly Sufficient, but some Necessary)\n- Parallel / Parallel Flaw\n- Principle-Strengthen\n- Principle-Conform",
      "right_md": "**Length:** 10 questions  \n**Theme:** Conditional Logic  \n**Levels:** 2 - 4  \n**Time:** 15 mins (1.5x = 22.5, 2x = 30)\n\nTry to get through them timed and then review them untimed before you check your original answer and look at the explanation.\n\n_Conditional Logic, by question type:_\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path ... or, the evidence will provide a conditional rule that potentially could output the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and/or we can apply a conditional rule to some provided fact, usually because the fact triggers the contrapositive of the rule)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the _Necessary vs. Sufficient_ flaw, in which an author presents a conditional relationship in the Evidence but then interprets it using an illegal Negation or Reversal. Much less frequently, the flaw involves messing up Or / And stuff in the rule.)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 5,
    "order_in_week": 9,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-10-evaluate-first-taste",
    "title": "Evaluate - First Taste",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Evaluate"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A correct answer on **Evaluate** asks a relevant question. How do we know if it's relevant? We know because if we answered the question one way, we would Strengthen the argument. If we answered it the opposite way, we would Weaken the argument.\n\nThe more important one, though, is the potential to weaken. So, if you want you can just listen for the weakening potential. Think to yourself, \"Which of these questions could I answer in a way that would most Weaken the argument?\"\n\n# Wrong Answers\n\n**No Impact** - they pose a question that we could answer any way we'd like and it wouldn't affect the argument.\n\n**Too Specific / Strong** - they're requesting an exact figure or measurement or posing an extreme question that wouldn't Weaken if the answer were 'no'.",
      "right_md": "# Try these 7 questions, untimed.\n\nEach answer choice poses a question that could be answered in at least 2 different ways. We want one of those answers to _weaken_ the argument. So don't pick an answer choice unless you hear it asking a question that could be answered in a way that would weaken the argument.\n\nIn general, expect Evaluate arguments to deal with dubious _comparisons_ and authors who are trying to offer _causal_ explanations for some curious fact.\n\nTry to use your Weaken mindset to evaluate the argument. Think:\n\n_Given_ this evidence  \n_How can I argue_ the anti-conclusion?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Evaluate"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 5,
    "order_in_week": 10,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-11-evaluate-set-1",
    "title": "Evaluate (set 1)",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Evaluate"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A correct answer on **Evaluate** asks a relevant question.\n\nHow do we know if it's relevant? We know because if we answered the question one way, we would Strengthen the argument. If we answered it the opposite way, we would Weaken the argument.\n\nThe more important one, though, is the potential to weaken. So, if you want you can just listen for the weakening potential. Think to yourself, \"Which of these questions could I answer in a way that would most Weaken the argument?\"\n\n# Wrong Answers\n\n**No Impact** - they pose a question that we could answer any way we'd like and it wouldn't affect the argument.\n\n**Too Specific / Strong** - they're requesting an exact figure or measurement or posing an extreme question that wouldn't Weaken if the answer were 'no'.",
      "right_md": "# Try these 4 questions, untimed.\n\nEach answer choice poses a question that could be answered in at least 2 different ways. We want one of those answers to _weaken_ the argument. So don't pick an answer choice unless you hear it asking a question that could be answered in a way that would weaken the argument.\n\nIn general, expect Evaluate arguments to deal with dubious _comparisons_ and authors who are trying to offer _causal_ explanations for some curious fact.\n\nTry to use your Weaken mindset to evaluate the argument. Think:\n\n_Given_ this evidence  \n_How can I argue_ the anti-conclusion?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Evaluate"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 4
    },
    "week": 5,
    "order_in_week": 11,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-12-most-supported-causal-difference-maker",
    "title": "Most Supported + Causal Difference-Maker",
    "category": "Patterns",
    "estimated_minutes": 46,
    "question_count": 4,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported"
    ],
    "question_features": [
      "Causal Difference-Maker"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Causal Difference-Maker** is a fuzzy term  \nwe use primarily for Most Supported\n\nThe most common type of reasoning tested on Most Supported questions is Causality, so whenever we read the stimulus on a Most Supported question, we listen closely for any explicit or implicit cause/effect relationships.\n\nThese tend to be expressed in three ways:\n\n- **Causal verbs** (_leads to, results in, contributes to, increases, limits, etc._) When they use causal verbs, they often use more than one, setting up a causal chain.\n\n- **Causal connectors** between adjacent claims (_Because of this, this allows, this makes possible, accordingly, thereby, etc._) This is a sneaky way of conveying causality. We might hear something like, \"Ants shed their hind legs and grow new ones every two years. This cycle allows the ant to avoid suffering from arthritis.\" This sort of causal connection reveals that an ant's hind legs influence whether or not they suffer from arthritis.\n\n- Presenting two differences, with the suggestion that **one difference explains the other**. (for example: _Tim and Jill were both struggling with reading comp. Jill, unlike Tim, decided to try meditating shortly after practicing each RC passage. Jill no longer struggles with RC, though Tim still does._) This seems to be suggesting that meditation was a Causal Difference-Maker when it comes to Jill getting better at RC. We certainly can't _prove_ that, but if you've been told about Difference X (Jill does meditation, Tim doesn't) then it's supportable to say it might be the reason for Difference Y (Jill no longer struggles with RC).",
      "right_md": "# Try these 4 questions untimed\n\nLook for causal verbs, like \"promotes, inhibits, increases, lowers, contributes to, influences\". Look for \", -ing\" constructions that convey causation, such as \"Sarah yelled at the top of her lungs, shaking the vase on the shelf\".\n\nLook for causal connector language that tells you that the previous sentence has a causal relationship to the present sentence, like \"because of this, due to this, this allows, this makes possible, accordingly, that is why\".\n\nLook for one Difference that could potentially explain another Difference.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported"
      ],
      "features": [
        "Causal Difference-Maker"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 4
    },
    "week": 5,
    "order_in_week": 12,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w5-13-conditional-logic-medium-set-2",
    "title": "Conditional Logic (Medium) Set 2",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 7,
    "difficulty_min": 2,
    "difficulty_max": 5,
    "level": "intermediate",
    "question_types": [
      "Sufficient Assumption",
      "Principle-Strengthen"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "The problems in this set all contain **Conditional Indicator** words that we can use to correctly write an If / Then rule, and its contrapositive.\n\nTrap answers will tempt us to make illegal Reversals or Negations.\n\nThe LR question types most commonly involve conditionals:\n\n- Must Be True\n- Most Supported\n- Assumption (mostly Suff, but some Nec)\n- Parallel / Parallel Flaw\n- Principle-Strengthen / Principle-Conform",
      "right_md": "# Try these 7 problems, untimed,\n\n(most are Sufficient Assumption or Principle-Strengthen)\n\nFor many of these problems, you might feel like you don't really need to write anything down to think your way through them. That's great! On the actual test, we will mostly use diagramming conditional logic as a last resort. But the way to get better at doing these _mentally_ is to do them _physically_ for a while."
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Principle-Strengthen"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 5,
    "order_in_week": 13,
    "source_file": "02_week_5_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-01-abstract-flaw-set-2",
    "title": "Abstract + Flaw (set 2)",
    "category": "Process",
    "estimated_minutes": 90,
    "question_count": 10,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Abstract Answers",
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison",
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "With **abstract** answers on **Flaw** questions, most of them allude to the same 10-15 famous flaws. The other ones feel more like answer choices on **Method** questions.\n\nWe need to pay attention to language indicators in each answer choice signifying which half of the answer is meant to describe the Conclusion and which half is meant to describe the Evidence.\n\nOnce we've determined that, we can start asking ourselves questions like, \"Can I match up this (abstract answer choice) wording with the Conclusion?\" If not, eliminate.\n\nIf so, then we would try to match up the other half, making sure that we're consistent in terms of matching the same nouns/traits to the same abstract terms in each answer choice.",
      "right_md": "# Try these ten level 4-5 problems, untimed\n\nFocus mainly on getting more comfortable with the abstract answers.\n\nWhen you encounter a wrong answer, challenge yourself to come up with a sample argument of your own that _would_ match that answer choice.\n\nIf you're stumped by an answer, thinking, \"What _would_ this look like if it were actually occurring?\", email a teacher, or ask through Intercom, or bring it up in your next class.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Abstract Answers",
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 10
    },
    "week": 9,
    "order_in_week": 1,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-02-science-sufficient-assumption",
    "title": "Science + Sufficient Assumption",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 6,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Sufficient Assumption"
    ],
    "question_features": [
      "Science",
      "Missing Link / Idea",
      "Conditional Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Typically, LSAT arguments that deal with **science** have a messy, real-world feel to them. We're less likely to think we're supposed to be looking at the internal logic of the argument and more likely to think that we're going to be weighing the impact of brand new considerations in the answers.\n\nHowever, **Sufficient Assumption** is only about the internal logic. So when you combine Sufficient Assumption with Science, you might feel your brain engaging with the story, when our attention needs to stay with the logical features.\n\nIf there is a **New Concept in the Conclusion**, we know that idea has to be in the correct answer (and usually will be referred to in verbatim language). If the argument seems pretty internally solid, try to think of a possible objection: \"given [this evidence], how could it still be possible that [conclusion is false]?\"\n\nIf we can think of a possible objection, then we know the correct answer will have to rule out that objection.",
      "right_md": "# Try all 6 problems untimed.\n\nMake use of the Notepad popup. Click on the icon in the lower left and move / resize the Notes window so that it covers up your answer choices.\n\nTry to make a specific prediction about what the answer should say / do. Sometimes you might predict an \"If Premise, Then Conclusion\" link. Sometimes you might think, \"it has to rule out _this Objection_\". If you can't figure out the whole missing link, at least focus on the wording from the Conclusion that you need to prove.\n\nOnce you see the correct answer, revisit your prediction. Do you think you could have anticipated the correct answer if you had read the paragraph differently? Or is this correct answer more one you just have to read and interpret on the fly?\n\nRemember that on Sufficient Assumption, the correct answer, when added to our evidence, allows us to mathematically derive the conclusion.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption"
      ],
      "features": [
        "Science",
        "Missing Link / Idea",
        "Conditional Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 9,
    "order_in_week": 2,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-03-except-set-1",
    "title": "EXCEPT (set 1)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Strengthen",
      "Weaken",
      "Paradox"
    ],
    "question_features": [
      "EXCEPT"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A common misconception about **EXCEPT** questions is that the correct answer will be the **opposite** of what the other four do. Like if we were doing a Strengthen-EXCEPT question, a lot of times students are looking for \"the one that Weakens\".\n\nBut even though that will be true sometimes, the task is only asking us to pick something that \"**doesn't** Strengthen\", so the correct answer will either Weaken or (more commonly) will be Neutral with no impact.",
      "right_md": "# Try these 5 Except questions, untimed\n\nThey're a mix of Strengthen, Weaken, or Paradox, which are the question types where EXCEPT most commonly occurs as a Feature.\n\nThese question types are all closely related, because they force us to consider novel ideas and judge what impact, if any, those ideas have. On an EXCEPT variation of these tasks, it's common to get down to two answer choices at which point the one that _seems_ relevant often isn't (it's the correct answer). And the one that _seems_ weirdly different still does its job, but not in the same way the other three eliminated answers did their job.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Strengthen",
        "Weaken",
        "Paradox"
      ],
      "features": [
        "EXCEPT"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 9,
    "order_in_week": 3,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-04-weaken-explain-curious-fact",
    "title": "Weaken + Explain Curious Fact",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Weaken"
    ],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "These **Weaken** questions all involve an author presenting a **Curious Fact** and then concluding or assuming a certain causal explanation of that fact.\n\n- The **evidence** presents some _Curious Fact_ (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible _Causal Explanation_ for this curious fact.\n\n- The correct answer will either deal with _Alternate Explanations_ for the curious fact or with the _plausibility_ of the Author's Explanation.",
      "right_md": "# Try these 5 questions untimed,\n\nwhile rehearsing these steps:\n\nWhat is the _Curious Fact?_\n\n- what language tips us off? is it an asymmetric comparison?\n- ask yourself the Curious Fact: _why/how is it that [curious fact]?_\n\nWhat is the _Author's Explanation / Hypothesis?_\n\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\nDoes the correct answer deal with an _Alternate Explanation?_\n\n- Is it dealing with the idea of _Reverse Causality?_\n\n- Is it dealing with the idea of a _Third Factor?_\n\nOr does it address the **plausibility** of the Author's Explanation?\n\n- Is it addressing plausibility via covariation? (strengthening by No Cause / No Effect, or More Cause / More Effect data points or weakening by Cause without Effect, or Effect without Cause data points)\n\n- Or is it addressing plausibility some other way? (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Weaken"
      ],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 9,
    "order_in_week": 4,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-05-conditional-logic-harder-set-1",
    "title": "Conditional Logic (Harder) Set 1",
    "category": "Pacing",
    "estimated_minutes": 80,
    "question_count": 8,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write or think about the If-Then rule.\n\nWrite or think through the contrapositive as well.\n\nBeware illegal Reversals and Negations.\n\n_Conditional Logic, by question type_\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 8 questions in 16 minutes\n\n1.5x = 24 mins, 2x = 32 mins\n\nFocus on getting an answer to all of them within the time limit. Then, when you review the set, practice diagramming them by writing more stuff out.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **Left** (sufficient conditions)  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **Right** (necessary conditions)  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  **unless**, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 9,
    "order_in_week": 5,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-06-must-be-false-harder-set-2",
    "title": "Must Be False (Harder) Set 2",
    "category": "Process",
    "estimated_minutes": 54,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Must Be False"
    ],
    "question_features": [],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This is a set of six **Must Be False** questions, taken from tests 45-49.\n\nThe correct answer contradicts something we're told or something that's implied by the paragraph. If we negated every answer choice and turned the question stem into \"Which of the following, **must be true**\", we'd get the same correct answer.\n\nSo if it fits your common sense better, you could think of a Must Be False question stem as saying, \"Which answer's negation Must Be True (or is Most Supported, if it's a squishier sense of must be false)?\"\n\nWhat does it mean to contradict _something we're told?_\n\n**Stimulus:** Marsha is taller than her classmate Simon.  \n**Correct answer:** Marsha is the shortest person in her class\n\n**Stimulus:** Lemonade tastes bitter unless sugar is added.  \n**Correct answer:** Marsha's new sugar-free lemonade has the natural zest of lemons without any bitterness to the taste.\n\nWhat does it mean to contradict _something that's implied?_\n\n**Stimulus:** Marsha is taller than her classmate Simon. Taller students are always more feared than shorter students.  \n**Correct answer:** Simon is the most feared person in his class\n\n**Stimulus:** There were more students at Valley High in 2022 than there were in 2021. By law, the school must maintain the same student to teacher ratio every year.  \n**Correct answer:** No teachers have been hired or fired from Valley High in the past two years.",
      "right_md": "# Try this set of problems untimed\n\nWhen we're doing **Must Be False**, there are two primary things to read for:\n\nIs there a _Conditional_?  \na huge pattern with Must Be False questions is that the paragraph includes a **conditional**, and the correct answer just contradicts that conditional.\n\nCan I make an inference by _Combining Ideas?_  \npretend you're reading a Must Be True (or Most Supported) question. Look for _Conditional, Causal, Mathematical_ wording. See if two or more ideas can be synthesized to derive something. If so, the correct answer will usually contradict that.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Must Be False"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 9,
    "order_in_week": 6,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-07-strengthen-weaken-science",
    "title": "Strengthen / Weaken + Science",
    "category": "Patterns",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Strengthen",
      "Weaken"
    ],
    "question_features": [
      "Science",
      "Plausibility",
      "Missing Link / Idea"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# # of questions: 10\n\n**Question Type:** Strengthen / Weaken  \n**Difficulty Level:** 3, 4, and 5  \n**Tests:** pt 45 - 64  \n**Theme:** science-heavy stimulus\n\nThis question set contains 10 tough questions, all level 3-5, Strengthen / Weaken, with Science-heavy paragraphs. These are the questions that can become quicksand time-suckers. We try to buy time on easier questions so that we have adequate time to think about these.\n\nUltimately, the gross vernacular of science questions is just a distraction. We're still playing the same old reasoning games, so pay more attention to reasoning patterns and right/wrong answer tendencies for that question type, and pay less attention to getting a thorough understanding of whatever scientific concept is being discussed.",
      "right_md": "# Choose a study goal\n\n_Untimed:_ Focus on perfect accuracy  \n_Timed:_ 15 mins keep-it-moving\n\nFor **Weaken** questions, focus on the _Anti-Conclusion_. After you read the argument, frame your goal by saying:\n\n_Given_ this evidence  \n_How can I still argue_ the anti-conclusion?\n\nFor **Strengthen** questions, remember that when you're dealing with scientific hypotheses, you can strengthen by either _Ruling Out_ an Alternate Hypothesis, or you can _Boost the Plausibility_ of the Author's Hypothesis.\n\nFor **Principle-Strengthen**, focus on finding an answer that works like \"If _evidence_, then _conclusion_\". A lot of answers are easy to eliminate because they aren't rules that are set up to have the conclusion on the right side of the arrow.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Strengthen",
        "Weaken"
      ],
      "features": [
        "Science",
        "Plausibility",
        "Missing Link / Idea"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 10
    },
    "week": 9,
    "order_in_week": 7,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w9-08-anti-causal-hard-mini-set",
    "title": "Anti-Causal (Hard Mini-Set)",
    "category": "Patterns",
    "estimated_minutes": 30,
    "question_count": 3,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Weaken"
    ],
    "question_features": [
      "Anti-Causal"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Anti-Causal** arguments attempt to argue that \"X makes no difference\", \"X didn't help\", or \"it's not resulting from X, but Y\". Their evidence is usually that things seem to be the same, or worse, without X.\n\n# EXAMPLES\n\nAnn and Jerry both studied LSAT for 3 months, but only Ann added a mindfulness regimen to her studying. Since they both ended up with similar LSAT scores, apparently the mindfulness regimen didn't do anything for Ann.\n\nWhen President Knowles took office, the unemployment rate was 9%. Shortly after her stimulus bill passed, the unemployment rate hit 10%. Clearly, her stimulus bill did nothing to help employment.\n\nAnti-Causal arguments are vulnerable to several common objections:\n\n- **different initial reference points**  \n  the mindfulness _did_ help Ann, because she went from a 140 to a 160, whereas Jerry just went from a 150 to 160.\n\n- **would have been even worse without**  \n  the stimulus bill _did_ help, because the economy was in such a free-fall that if it hadn't been for the stimulus bill, the unemployment would have been at like 12%\n\n- **overlooked consideration**  \n  even though it looks like the stimulus bill did nothing because unemployment continued to rise in its immediate aftermath, that's because it takes several months before stimulus can manifest any changes in employment figures.",
      "right_md": "Try these three questions that have an Anti-Causal vibe to them.\n\nThe conclusion will sound like it's saying,  \n\"So, X doesn't cause Y\"\n\nIf we're objecting to these arguments, we need to find a way to accept the evidence but still find a way to argue that X _could_ cause Y."
    },
    "bank_filter": {
      "qtypes": [
        "Weaken"
      ],
      "features": [
        "Anti-Causal"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 3
    },
    "week": 9,
    "order_in_week": 8,
    "source_file": "02_week_9_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-01-conditional-logic-harder-set-2",
    "title": "Conditional Logic (Harder) Set 2",
    "category": "Pacing",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the If / Then rule.\n\nWrite or think through the contrapositive as well.\n\nBeware illegal Reversals or Negations.\n\n_Conditional Logic, by type_\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 7 questions in 12 minutes\n\n(1.5x = 18, 2x = 24)\n\nFocus on getting an answer to all of them within the time limit, but then as you review the set, indulge in more untimed diagramming, if useful.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **Left** (sufficient conditions)  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **Right** (necessary conditions)  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  **unless**, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 10,
    "order_in_week": 1,
    "source_file": "03_week_10_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-02-quantifiers-set-2",
    "title": "Quantifiers Set 2",
    "category": "Process",
    "estimated_minutes": 110,
    "question_count": 8,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Flaw"
    ],
    "question_features": [
      "Quantifiers"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "If the question is testing us on what can be inferred, scan primarily for **conditional** strength quantifiers (_all / each / every / any / no / none_, or anything else that's conditional).\n\nIf we find a conditional, then we look to see whether the trigger of that conditional (or the trigger of the contrapositive) shows up in any other claim.\n\nIf so, then we can combine those claims to derive at least **Some** overlap between the two other traits.\n\n_If we know_ Some X's are B  \n_and we know_ All B's are ~A  \n_we can derive_ Some X's are ~A\n\n_If we know_ Most X's are B  \n_and we know_ All B's are ~A  \n_we can derive_ Most X's are ~A\n\n_but if we know_ Most B's are X  \n_and we know_ All B's are ~A  \n_we can only derive_ Some X's are ~A\n\nThe key idea is that in order to make an inference, the **trigger** of the conditional needs to show up in another claim. If the **outcome** is the term that shows up elsewhere, we can't infer anything (but that's where a lot LSAT authors' flawed inferences come from).\n\nIn the third example, the overlapping term is the trigger in both claims, so we can't \"chain\" the ideas together. But we still know for sure that there are some X's who have the property of being B, and thus they also must have the property of being ~A.\n\nSometimes, we can infer something from two **Most** claims.\n\nGIVEN:  \nMost A's are B  \n+ Most A's are C\n\nMost A's are B  \n+ Most B's are ~A\n\nINFER:  \nSome B's are C  \nThere are more B's than A's\n\nThen there's a famous **incorrect** inference from two Most claims:\n\nGIVEN:  \nMost A's are B  \n+ Most B's are C\n\nINFER:  \nnothing (but LSAT authors think, \"Most A's are C\")",
      "right_md": "# Try these 8 questions, untimed.\n\nIf you see two or more **most** claims, assess whether you can infer anything by combining them (the two most claims should be about the same group).\n\nOtherwise, your number one priority is always question is testing us on what can be inferred, scan primarily for **conditional** strength quantifiers (_all / each / every / any / no / none_, or anything else that's conditional).\n\nIf we find a conditional, then we look to see whether the trigger of that conditional (or the trigger of the contrapositive) shows up in any other claim.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Flaw"
      ],
      "features": [
        "Quantifiers"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 10,
    "order_in_week": 2,
    "source_file": "03_week_10_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-03-explain-curious-fact-harder-set-1",
    "title": "Explain Curious Fact (Harder) Set 1",
    "category": "Process",
    "estimated_minutes": 46,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Back again for more fun with **Explain a Curious Fact**, in which the evidence will provide some _Curious Fact_ (almost always a comparison).\n\nThe author is implicitly asking herself, \"Wussup with this Curious Fact?\", and her conclusion either states or implies some causal explanation.\n\nWe evaluate these arguments by thinking about:\n\n- **Alternate Explanations** for this curious fact\n- the **plausibility** of the Author's Explanation",
      "right_md": "# Try these 5 problems, untimed\n\n**(1) Locate the _Curious Fact_ in the evidence, and ask the curious question.**\n\nEXAMPLE: \"People who run marathons are more likely than those who don't to be in excellent health. Clearly the mental discipline it takes to run a marathon also allows people to make better dietary and lifestyle choices.\"\n\nThe first sentence is a correlation, a Curious Comparison (ppl who are X are more likely than those who aren't to be Y). The author is _asking_ herself: **Hmm - why is is that** there's this correlation between marathon running and excellent health?\n\n**(2) Spell out the author's explanation for the curious fact, because the author is often conveying a lot of implicit ideas within their conclusion:**\n\n_People who run marathons have good mental discipline. This mental discipline helps them not over-eat, not over-indulge in alcohol or smoking. By not doing those things, they end up in excellent health._\n\n**(3) Think about _Alternate Explanations_ for the Curious Fact.**\n\nConsider _Reverse Causality_ (maybe being in excellent health lets you run a marathon) or _Third Factor_ (maybe being wealthy both enables you to have time to practice/run a marathon and also enables you to get better nutrition, exercise, and medical care)\n\n**(4) Think about what could help us assess the _Plausibility_ of the Author's Explanation.**\n\nCovariation answers (No Cause, No Effect / Effect without Cause / Cause without Effect), or Presence / Motive / Method ideas (Suspect was at the scene of the crime / suspect had incentive to do it / here's how the suspect could have done it).\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 10,
    "order_in_week": 3,
    "source_file": "03_week_10_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-04-except-set-2",
    "title": "EXCEPT (set 2)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Strengthen",
      "Weaken",
      "Paradox",
      "Flaw",
      "Must Be True"
    ],
    "question_features": [
      "EXCEPT"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A common misconception about **EXCEPT** questions is that the correct answer will be the **opposite** of what the other four do. Like if we were doing a Strengthen-EXCEPT question, a lot of times students are looking for \"the one that Weakens\".\n\nBut even though that will be true sometimes, the task is only asking us to pick something that \"**doesn't** Strengthen\", so the correct answer will either Weaken or (more commonly) will be Neutral with no impact.",
      "right_md": "# Try these 5 Except questions, untimed\n\nEXCEPT most commonly occurs on Strengthen, Weaken, and Paradox, but this set has some oddballs like Flaw-EXCEPT, Must Be True-EXCEPT, and Could Be True-EXCEPT.\n\nThat last one is really just a **Must Be False** question, not an EXCEPT variation on a normal question type, but we like throwing it in here to juxtapose how doing Must Be False is **not** like doing an EXCEPT question.\n\nOn genuine EXCEPT questions, we really don't worry about why the correct answer is correct (it might be irrelevant / out of scope, or it might do the reverse of what the question stem asks for). Instead, we worry about eliminating the four answers that _do_ perform the function indicated by the question stem.\n\nBut on a **Must Be False** question, we don't worry about the four wrong answers. They're all wrong because we can't contradict them. Whether they make an illegal inference or just say something we can't support, who cares. We're looking to the one correct answer that we _can_ contradict.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Strengthen",
        "Weaken",
        "Paradox",
        "Flaw",
        "Must Be True"
      ],
      "features": [
        "EXCEPT"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 10,
    "order_in_week": 4,
    "source_file": "03_week_10_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-05-conditional-logic-harder-set-3",
    "title": "Conditional Logic (Harder) Set 3",
    "category": "Pacing",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 5,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write or think about the If / Then rule. Write or think through the contrapositive as well. Beware the temptation to make illegal Backwards or Opposite moves.\n\nConditional Logic intersects with different question types differently:\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 6 questions, level 5.\n\nTry them all within **11 minutes** (or 16, or 22), then circle back and confirm your thinking (untimed) before checking your previous answer and looking at the explanation.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **LEFT**  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **RIGHT**  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**IF-NOT**)  \n  **unless**, without, until except\n\n- **NEGATIVE** to Positive conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 5,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 10,
    "order_in_week": 5,
    "source_file": "03_week_10_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-01-explain-curious-fact-medium-set-2",
    "title": "Explain Curious Fact (Medium) Set 2",
    "category": "Pacing",
    "estimated_minutes": 60,
    "question_count": 7,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This set has five Weaken, two Flaw, and one Strengthen question, all with a common theme:\n\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact.\n\n- The correct answer (on any Assumption/Objection Family question type) will deal either with an **Alternate Explanation** for the curious fact or with the **plausibility** of the Author's Explanation.",
      "right_md": "# Try these 7 questions, in 11 minutes\n\n(1.5x = 17 mins, 2x = 22 mins)\n\nWhat is the **Curious Fact?** (ask it as a question)\n\n- what language tips us off?\n\nWhat is the **Author's Explanation / Hypothesis?**\n\n- Is there a causal verb in the conclusion?\n- Remember to spell out every link in the causal chain that author is envisioning, from initial Cause to ultimate Effect.\n\nDoes the correct answer deal with an **Alternate Explanation?**\n\n- If so, _Reverse Causality_ or _Third Factor?_\n\nOr does the answer deal with the **plausibility** of the Author's Explanation?\n\n- If no, does it use \"covariation\" data points, or some other means? (covariation means stuff like _No Cause, No Effect_ as a strengthener, or stuff like _Cause w/o Effect_ or _Effect w/o Cause_ as a weakener)\n\n---"
    },
    "bank_filter": {
      "qtypes": [],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 7,
    "order_in_week": 1,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-02-complete-the-analogy-set-3",
    "title": "Complete the Analogy (set 3)",
    "category": "Patterns",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Method of Reasoning"
    ],
    "question_features": [
      "Analogies"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Analogies** are two separate cases that share some trait or relationship.\n\nf.e. - \"_a peak is to a mountain, what a scalp is to a _____._\"\n\nOne answer would be a _human_, peak is the top of a mountain and scalp is the top of a human. These two separate cases share some relationship, so they are analogous in at least one respect.\n\nAnalogies show up a lot on **Method** of reasoning questions, which ask us to characterize the type of evidence or type of move the author used.\n\nWhen we see a **fill-in-the-blank** question (aka Logical Completion), the paragraph is leading us to some final idea, and they frequently use a **Complete the Analogy** type structure, as I did at the top of this page.\n\nWhen we see analogies show up in the **Assumption Family**, they tend to go like this: \"Because X and Y are similar when it comes to Thing A, they're probably also similar when it comes to Thing B\".\n\n_Five years ago, my family went to Lake Crocus and I didn't have any fun. Thus, I will not have any fun when my family goes to visit Lake Crocus this summer._\n\nThe author has established one similarity \"both vacations are at the same location\" and is assuming a second similarity, \"both vacations will be not-fun\".\n\nFlaw and Weaken will want us to challenge this analogy by pointing to a potentially **meaningful difference**. Necessary Assumption will _rule out_ salient differences, and Strengthen will add more similarity, make them seem more Fair to Compare.",
      "right_md": "# Try these 8 questions untimed,\n\nthinking through the **analogies**.\n\n- What are the two separate cases?\n- What is the common principle?\n- What language cues exist to telegraph that the author is making a Comparison / Analogy?\n- Do the two cases seem \"fair to compare\" or do you think there could be an important difference between the two cases that calls into question the implied similarity.\n\n# EXAMPLE\n\nWhen people go to casinos, they gamble with their money, spending as much as they can stand to lose, hoping for the excitement of a jackpot. Similarly, when a fisherman goes out on Lake Crocus for the better part of the day, hoping for the excitement of a big catch, ______.\n\nHow would we **carry through** a trait or relationship from the dating situation to the LSAT tutor situation? Something like,  \n_these fisherman are gambling with their time, spending as much of it as they can stand to lose_\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Method of Reasoning"
      ],
      "features": [
        "Analogies"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 7,
    "order_in_week": 2,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-03-assumes-similarity-mini-set",
    "title": "Assumes Similarity (Mini-Set)",
    "category": "Patterns",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Weaken",
      "Strengthen"
    ],
    "question_features": [
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## Every comparison hides an assumed sameness\n\nIn the world of **Comparisons**, authors lean on a few recurring assumptions:\n- What was true in the **past** is still true **today**.\n- What is true **today** will be true in the **future**.\n- What was true for **this** group, person, or thing is true for **that** one.\n\nWhenever an argument reasons across time or across cases, it is assuming the two sides are similar enough to carry the conclusion.\n\nThat gives you both attack and support:\n- **Weaken** by pointing out a salient difference between the two sides.\n- **Strengthen** by adding a similarity or affirming the assumed one.",
      "right_md": "## Try these 5, untimed\n\nGo for accuracy and pattern recognition, not speed.\n\nFor each argument:\n- Name the comparison. What two things, groups, or moments is the author treating as alike?\n- Find where that sameness is assumed rather than proven.\n- Prephrase the gap: \"this only works if the two sides are similar in the way that matters.\"\n\nThen judge the answers:\n- A weakener surfaces a **difference** that breaks the link.\n- A strengthener shores up the **similarity**.\n- Wrong answers often raise a difference that does not matter to the conclusion, or restate the comparison without testing it."
    },
    "bank_filter": {
      "qtypes": [
        "Weaken",
        "Strengthen"
      ],
      "features": [
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 7,
    "order_in_week": 3,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-04-conditional-logic-medium-set-3",
    "title": "Conditional Logic (Medium) Set 3",
    "category": "Pacing",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 4,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write or think about the If-Then rule.\n\nWrite or think through the contrapositive as well.\n\nBeware illegal Reversals or Negations.\n\n_Conditional Logic, by type_\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that is being used in drawing the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 7 questions in 12 minutes\n\n(1.5x = 18, 2x = 24)  \navg diff = level 4\n\nTry to answer them all within your time limit, then circle back and confirm your thinking (untimed) before confirming your answer and reading the explanation, if available.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **Left** (sufficient conditions)  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **Right** (necessary conditions)  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  **unless**, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 7,
    "order_in_week": 4,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-05-explain-curious-fact-medium-set-3",
    "title": "Explain Curious Fact (Medium) Set 3",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 7,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "All of these arguments deal with a **Curious Fact**,  \nfor which the author offers / assumes a **Causal Explanation**.\n\nThere are a handful of different question types here, but they all have a common theme:\n\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact.\n\n- The correct answer will either deal with **Alternate Explanations** for the curious fact or with the **plausibility of the Author's Explanation**.",
      "right_md": "# Try these 7 questions untimed\n\nwhile rehearsing these steps:\n\nWhat is the **Curious Fact?**\n\n- what language tips us off? is there an _Asymmetric Comparison?_\n- ask yourself the Curious Fact: \"Why is it that ... [curious fact]?\"\n\nWhat is the **Author's Explanation / Hypothesis?**\n\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\nDoes the correct answer deal with an **Alternate Explanation?**\n\n- If so, _Reverse Causality_ or _Third Factor?_\n\nOr does the answer deal with the **plausibility** of the Author's Explanation?\n\n- If no, does it use \"covariation\" data points, or some other means? (covariation means stuff like _No Cause, No Effect_ as a strengthener, or stuff like _Cause w/o Effect_ or _Effect w/o Cause_ as a weakener)\n\nDoes the correct answer deal with an **Alternate Explanation?**\n\n- Is it dealing with the idea of _Reverse Causality?_\n- Is it dealing with the idea of a _Third Factor?_\n\n---"
    },
    "bank_filter": {
      "qtypes": [],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 7,
    "order_in_week": 5,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-06-causal-chains-mini-set",
    "title": "Causal Chains (Mini Set)",
    "category": "Patterns",
    "estimated_minutes": 36,
    "question_count": 4,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Causal Chains"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Causal Chains\n\nappear most in **Most Supported** and **Must Be True**.\n\nA causal chain is three or more things causally linked: _Reading gives Jorge a headache. Headaches make Jorge lie down._\n\nThe test wants to make sure we see the implicit connection that \"Reading leads to laying down\".\n\n_Reading → Headache → Lay Down_\n\nIn many cases, causal chains overlap with conditional logic. If we see conditional logic wording, like **\"if, when, only, only if, unless, requires, always, will\"**, then we can choose to think of it conditionally or causally, same difference.\n\nBut on **Most Supported** questions, there will be looser language that still indicates a causal flow: _Doing X **promotes** Y, which **increases** the likelihood of Z being true. And Z is a **factor** in the formation of A._\n\nThe test wants to make sure we see the implicit connection that \"Doing X can increase your chance of A's forming\".",
      "right_md": "# Try these 4 questions untimed\n\nWork on building these causal chains,  \nbefore you look at answers\n\nBe patient trying to find the right causal sequence. Write **any** cause / effect relationship you can find on the page, with space on your page to both the left and the right of that idea, e.g.\n\n_reads too much → gets a headache_\n\nNow, go seek out something that has to do with causing someone to \"read a lot\", or find something that could be caused by \"having a headache\".\n\nOn **Most Supported** questions, if you have a causal chain, A → B → C, is it okay to say \"if no A, then no C\"?\n\nYes, basically! It feels _naughty_ because that would be an illegal negation in the world of conditional logic, but in the world of Causality, you'll find LSAT being cool with the common sense plausibility of \"if cause didn't happen, effect wouldn't have happened\".\n\nIf I say, \"**Because** I took Franklin St to the party and there ended up being an accident there, I was late to the party, which **led** to my missing the opening of gifts.\" Then it's plausible to say, \"if had **not taken** Franklin St., I probably would **not have** missed the opening of gifts\".\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Causal Chains"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 4
    },
    "week": 7,
    "order_in_week": 6,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-07-evaluate-set-2",
    "title": "Evaluate (set 2)",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Evaluate"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A correct answer on **Evaluate** asks a relevant question. How do we know if it's relevant? We know because if we answered the question one way, we would Strengthen the argument. If we answered it the opposite way, we would Weaken the argument.\n\nThe more important one, though, is the potential to weaken. So, if you want you can just listen for the weakening potential. Think to yourself, \"Which of these questions could I answer in a way that would most Weaken the argument?\"\n\n# Wrong Answers\n\n**No Impact** - they pose a question that we could answer any way we'd like and it wouldn't affect the argument.\n\n**Too Specific / Strong** - they're requesting an exact figure or measurement or posing an extreme question that wouldn't Weaken if the answer were 'no'.",
      "right_md": "# Try these 7 questions, untimed.\n\nEach answer choice poses a question that could be answered in at least 2 different ways. We want one of those answers to _weaken_ the argument. So don't pick an answer choice unless you hear it asking a question that could be answered in a way that would weaken the argument.\n\nIn general, expect Evaluate arguments to deal with dubious _comparisons_ and authors who are trying to offer _causal_ explanations for some curious fact.\n\nTry to use your Weaken mindset to evaluate the argument. Think:\n\n_Given_ this evidence  \n_How can I argue_ the anti-conclusion?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Evaluate"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 7,
    "order_in_week": 7,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-08-conditional-logic-medium-set-4",
    "title": "Conditional Logic (Medium) Set 4",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 9,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the If / Then rule. Write or think through the contrapositive as well. Beware the temptation to make illegal Backwards or Opposite moves.\n\nHow does Conditional Logic show up, by question type?\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that potentially could output the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 9 problems featuring conditional logic.\n\nTry them all within 15 minutes, then circle back and confirm your thinking (untimed) before confirming your answer and reading the explanation, if available.\n\n# CONDITIONAL KEYWORDS\n\n- Put it on the **Left** (sufficient conditions)  \n  if, when, any, each, all, every, the only, whenever, whoever, X's\n\n- Put it on the **Right** (necessary conditions)  \n  only if, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  unless, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 9
    },
    "week": 7,
    "order_in_week": 8,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-09-intermediate-conclusions-set-2",
    "title": "Intermediate Conclusions Set 2",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Role",
      "Main Conclusion"
    ],
    "question_features": [
      "Intermediate Conclusions"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Try these five questions that test us on the presence (or absence) of _Intermediate Conclusions_.\n\n**Role** and **Main Conclusion** questions usually \"hide\" the conclusion by making it the **very first claim**, or by making it some **rebuttal claim**.\n\nThey will also sometimes complicate our assessment of the argument's structure by throwing in multiples conclusions.\n\nArguments need a claim we call the Conclusion, and some Support for that claim, which we call the evidence or the premise(s).\n\nSome of those supporting premises can _themselves_ also be considered conclusions, if _they_ are supported by at least one claim. The more common name for a _supported premise_ is an Intermediate Conclusion, or a Subsidiary Conclusion.\n\nAny time you're asking yourself, \"Is this claim a Conclusion?\", you should ask yourself \"_why should I believe this claim? did the author provide a supporting reason?_\" If it's really a Conclusion, then you'll be able to point to at least one claim that sounds like a reason offered for why we should believe that claim.\n\nIf a claim **has** support, we can call it a Conclusion.  \nIf it **provides** support, we can call it a Premise.  \nIf it **has** support and also **provides** support, an Intermediate Conclusion.",
      "right_md": "# Try these problems, untimed\n\nthink through the following:\n\n- How can we tell whether there's an Intermediate Conclusion?\n\n- Are there Support / Conclusion / Opinion indicators that help show us when there is or isn't an Intermediate Conclusion?\n\n- Practice testing whether a given claim X is or isn't a conclusion by asking yourself, \"_Why should I believe X?_\" If the author offers a reason, then we can call it a conclusion. If she doesn't, then it's just an unsupported claim.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Main Conclusion"
      ],
      "features": [
        "Intermediate Conclusions"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 5
    },
    "week": 7,
    "order_in_week": 9,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-10-describing-arguments-set-3",
    "title": "Describing Arguments (set 3)",
    "category": "Pacing",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Role",
      "Method of Reasoning",
      "Main Conclusion"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Role** and **Main Conclusion** questions usually \"hide\" the conclusion by making it the **very first claim**, or by making it some **rebuttal / pivot** claim.\n\n**Opinion** (should, probably, ought to) and **Pivot** (but, yet, however) indicators are very helpful for understanding which claims we should assign to which roles in the argument.\n\n**Method** questions use a lot of abstract verbiage to describe parts of arguments. We want to not only learn how to read this type of language but also to start to think more in terms of this language. When you're using abstract language, you're speaking about general forms / archetypes, and the magic of getting better at standardized tests is getting better at recognizing the general forms / archetypes that show up a lot on that test.\n\nThese answer choices usually offer two ideas: one description that's meant to apply to the Conclusion and a second description that's meant to apply to the Evidence, but they might appear in either order. So we need to pay attention to words that mean Conclusion vs. Evidence, like \"infers [such and such] **on the basis of** [such and such].\"",
      "right_md": "Length -- **6 questions, 9 mins** (1.5x = 14, 2x = 18)  \nTypes -- **Role, Method and Main Conclusion**  \nTests -- **70**  \nLevels -- **all**\n\n- Try to answer all 6 questions in the time limit.\n\n- Flag a problem every time you feel less confident in your answer or feel like you struggled to get there.\n\n- Click on the answer you're selecting, but don't hit Confirm.\n\n- When the timer goes off, flip back through the questions and take a second look, hit confirm, and check out the Explanation.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Method of Reasoning",
        "Main Conclusion"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 7,
    "order_in_week": 10,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w7-11-causal-chains-set-3",
    "title": "Causal Chains - Set 3",
    "category": "Patterns",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [],
    "question_features": [
      "Causal Chains"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Causal Chains\n\nshow up mostly in **Assumption** and **Inference** questions\n\ngiven this:  \n_Reading for a long time gives Jorge a headache.  \nHeadaches make Jorge lie down._\n\nwe might note it like this:  \n**Read long time → Headache → Lie Down**\n\nAs with conditional logic, we're not allowed to say, \"I just saw Jorge laying down. He must have been reading a bunch earlier today\". That's inferring that one possible cause of Jorge's laying down is the only one we need to consider.\n\nBut we can say stuff like, \"This afternoon, Jorge needs to be alert and active. So he shouldn't read a long time after lunch.\" This is sort of like a contrapositive: _If you don't want the Effect, don't do that Cause_\n\nAn argument can use that structure to create flaws or gaps:  \n_Reading for a long time gives Jorge a headache. Headaches make Jorge lie down. Thus if Jorge needs to stay alert and active all day, he should not read anything._\n\nWhoa, whoa, there author! I understand you're saying, \"if he wants to avoid the Effect of laying down, he better not do the Cause (i.e. reading for a long time)\". But you said, \"he better not read _anything_\".\n\n_Reading for a long time gives Jorge a headache. Headaches make Jorge lie down. Thus if Jorge needs to stay alert and active all day, he should not Pam's essay._\n\nWhoa, whoa, there author! I understand you're saying, \"if he wants to avoid the Effect of laying down, he better not do the Cause (i.e. reading for a long time)\". But who said that reading Pam's essay means that he'd be reading for a long time? You must be assuming that, \"It would take a long time to read Pam's essay\".",
      "right_md": "# Try these 8 questions untimed.\n\nWork on understanding the causal chain,  \nbefore you look at answers\n\nOn Assumption questions, causal chain arguments might create a **missing link**.\n\nEXAMPLE: _Stress causes Anton to sweat. So, Anton probably gets sweaty when he plays chess._\n\nThis argument is assuming a missing link between playing chess and being stressed.\n\n**CONCLUSION**  \nplay chess ---------------> sweat\n\n**SUPPORT**  \nplay chess → stress → sweat  \n**ASSUMED** / **PREMISE**\n\nCausal chain arguments might create a **missing fact**.\n\nEXAMPLE: _Playing chess gives Anton stress, and he tends to get sweaty when he's stressed. Thus, he will probably be sweating tonight._\n\nThis argument is assuming that Anton will be playing chess tonight. It set up a causal chain and seems to be expecting the effect we get at the end of the chain, but it never triggered the causal chain.\n\nWhen you're trying to organize a causal chain on your paper, be patient trying to find the right causal sequence. Put **any** cause / effect relationship you can find on the page, with space on your page to both the left and the right of that idea. Then, go seek out something that has to do with causing the left side, or something that could be caused by the right side.\n\nRemember, on **Most Supported**, if you know that A leads to B, which leads to C, it's pretty fair to say \"if you cut back on A, you'll get less C\"."
    },
    "bank_filter": {
      "qtypes": [],
      "features": [
        "Causal Chains"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 7,
    "order_in_week": 11,
    "source_file": "03_week_7_blue_lr_guided_drills.md"
  },
  {
    "slug": "w11-01-principle-strengthen-set-1",
    "title": "Principle-Strengthen (Set 1)",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 7,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Principle-Strengthen"
    ],
    "question_features": [
      "Principles in Answers",
      "Conditional Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This set has 7 **Principle-Strengthen** questions from tests 50-54, levels 3 - 5\n\nAll of these examples are the much-more common style of Principle-Strengthen in which the _answers_ are principles. They often feel more like **Sufficient Assumption** than Strengthen, because the correct answer is usually a conditional rule that is triggered by the Evidence and results in the Conclusion.\n\nBut the question stem is technically a Strengthen task (which answer _most justifies_), so we're not supposed to ask ourselves, \"Does this answer prove the conclusion\", even though in many cases it will. In some rare cases, though, the correct answer could be as weakly worded as a Necessary Assumption. Several questions in this set have correct answers that will feel like necessary assumptions.\n\nNevertheless, our primary approach to these is to expect a conditional logic answer, so we pre-phrase by articulating an \"IF premise, THEN conclusion\" reasoning move.\n\nMost of the answers will be conditionals. If so, we want to be very **stubborn with the outcome**. The right side of the rule should match the conclusion (or at least sound like wording that would strongly support the conclusion). We want to be **flexible with the trigger**.\n\nOther answers feel more like comparative ideas that help _Weigh Tradeoffs_ or establish priorities. When arguments seem to be balancing competing ideas (a pro and a con / this obligation with that obligation), then when the author issues her judgment in the conclusion, she's revealing whether she cares more about the good thing or the bad thing, whether she cares more about this obligation or that obligation.\n\nGiven this argument, we'd anticipate a conditional answer  \n_Billy lied to our customers. Thus he shouldn't be on our staff anymore._\n\n(A) A person can be on the staff only if they are consistently truthful with customers\n\nGiven this argument, we might see a weighing-tradeoffs answer  \n_Billy is extremely dependable, although she lied to our customers. Clearly, she shouldn't be on our staff._\n\n(A) Dependability is a less important trait in a staff member than is honesty.",
      "right_md": "# Try these 7 problems, untimed\n\n- Once you find the Conclusion and identify the main Supporting Idea(s), you will generally want to articulate an, \"If [premise], then [conclusion]\" linking idea.\n\n- If, otherwise, you felt like the argument was grappling with competing interests, then articulate how the author is weighing tradeoffs: \"she cares more about X than about Y\".\n\n- If the author arguing that \"because of a dissimilarity two things should be treated dissimilarly\", or \"because of a similarity two things should be treated similarly\", then the principle should connect the (dis)similarity in the evidence to (dis)similar treatment in the conclusion.\n\n- Try to get rid of a lot answers quickly because they don't have any good matching language for the conclusion, or because the matching language for the conclusion is being put on the **left** of the conditional arrow.\n\n- Correct answers will often, if not usually, be written in contrapositive form, so be willing to try that move. If you read \"should be on staff only if consistently truthful\", then you have to make your brain say, \"Okay, this is saying _if you're not consistently truthful, should not on staff_\".\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Strengthen"
      ],
      "features": [
        "Principles in Answers",
        "Conditional Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 11,
    "order_in_week": 1,
    "source_file": "04_week_11_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w11-02-explain-curious-fact-harder-set-2",
    "title": "Explain Curious Fact (Harder) Set 2",
    "category": "Pacing",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Back again for more fun with **Explain a Curious Fact**, in which the evidence will provide some _Curious Fact_ (almost always an asymmetric comparison).\n\nThe author is implicitly asking herself, \"Wussup with this Curious Fact?\", and her conclusion either states or implies some causal explanation.\n\nWe evaluate these arguments by thinking about:\n\n- **Alternate Explanations** for this curious fact\n- the **plausibility** of the Author's Explanation",
      "right_md": "# Try these 8 problems, in 13 minutes\n\n**(1) Locate the Curious Fact in the evidence, and _ask_ the curious question.**\n\n**(2) Spell out the author's explanation for the curious fact, because the author is often conveying a lot of implicit ideas within their conclusion:**\n\n**(3) Think about _Alternate Explanations_ for the Curious Fact.**  \nConsider _Reverse Causality, Third Factor, Awareness vs. Incidence, Return to Normalcy_\n\n**(4) Think about what could help us assess the _Plausibility_ of the Author's Explanation.**  \nConsider _Covariation_ (No Cause, No Effect / Effect without Cause / Cause without Effect), or _Presence / Motive / Method_ ideas (suspect was at the scene of the crime / suspect had incentive to do it / here's how the suspect could have done it).\n\n**Flaw, Weaken, Evaluate**, more likely to be supplying an Alternate Explanation.  \n**Sufficient Assumption**, more likely to rule out any hope of Alternate Explanation.  \n**Strengthen, Necessary Assumption**, more likely to be addressing Plausibility of the Author's Explanation.\n\n---"
    },
    "bank_filter": {
      "qtypes": [],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 11,
    "order_in_week": 2,
    "source_file": "04_week_11_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w11-03-assumption-family-harder-set-1",
    "title": "Assumption Family (Harder) Set 1",
    "category": "Process",
    "estimated_minutes": 80,
    "question_count": 7,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison",
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# The three main Reasoning Structures\n\n**Conditional Logic** - Correct answers address the author's internal logic.\n\n- assumed links between ideas\n- if/then rules\n- a missing fact needed to trigger a rule\n- valid and invalid conditional inferences\n\n**Comparisons** - Correct answers address assumed similarities or differences.\n\n- part vs. whole\n- sample vs. general population\n- then vs. now\n- this situation vs. that situation\n- this group vs. that group\n\nOr they address the net gain / loss of a comparison:\n\n- doing this thing vs. not doing this thing\n- this thing vs. that thing\n- weighing the positives vs. the negatives\n\n**Causation** - Correct answers address one of these two pressure points.\n\n- alternate explanations for some Curious Comparison\n- the plausibility of the author's explanation for it.",
      "right_md": "# Try these 7 questions, untimed.\n\nWhen we're using **Conditional Logic** to \"prove an argument\", the **Left** side should be triggered by facts we know from the Evidence (or Answer Choice), and the **Right** side of the rule should match the Conclusion's language. If we want to weaken an argument's internal logic, then we're showing how the Left side is compatible with the **opposite** of the Right side (the Premise is compatible with the Anti-Conclusion).\n\nIf it feels like you're dealing with a **Comparison**, think about weakening with potential differences or strengthening by affirming some similarity. If you're dealing with a Net Gain / Loss type of Comparison, think about weakening with potential downsides or strengthening with \"equal or better\" ideas.\n\nIf the author is interpreting the **Causal** significance of some Curious Comparison (a weird asymmetry exists, or a study that has some interesting data), take time to understand the Author's Explanation, but then consider Alternate Explanations for the same curious fact (is the author confusing cause and effect? is the author failing to recognize that two things are linked to some third factor?)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 11,
    "order_in_week": 3,
    "source_file": "04_week_11_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w11-04-speedwalking-lr-set-1",
    "title": "Speedwalking LR (set 1)",
    "category": "Pacing",
    "estimated_minutes": 44,
    "question_count": 15,
    "difficulty_min": 1,
    "difficulty_max": 1,
    "level": "beginner",
    "question_types": [
      "Paradox",
      "Flaw",
      "Role",
      "Main Conclusion",
      "Necessary Assumption",
      "Sufficient Assumption",
      "Strengthen",
      "Weaken",
      "Method of Reasoning",
      "Must Be True"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**LENGTH** -- 15 Q's, 15 minutes (1.5x = 22, 2x = 30)  \n**TYPES** -- Paradox, Flaw, Role, Main Conclusion, Necessary Assumption, Sufficient Assumption, Strengthen, Weaken, Method, and Must Be True.  \n**LEVEL** -- 1\n\nWait a sec -- these are all level 1? I thought this activity was listed as level 5?\n\nYes, because the goal is something a level 5 student needs to work on: be able to quickly take care of easier questions, so that you'll have more time and brainpower in reserves for the harder, more flexible thinking questions in the section.\n\nGiven how many subtle reading traps there are on LSAT, it's sometimes difficult to ever let yourself believe that an answer you find appealing is correct. \"It's never this easy\", we might think. But, sure it is! Sometimes it really is that easy. We need to improve our ability to _let the easy be easy._\n\nAnd we need to develop enough self-trust while we're doing easier problems that we can pick up our pace when possible.",
      "right_md": "Try to get through these 15 questions in 15 mins. Keep yourself going at a brisk pace. When you have a strong idea of what you're looking for (like on Main Conclusion, Role, Sufficient Assumption, Flaw), try to be proactive about scanning for and finding your answer, rather than reading all five choices start to finish.\n\nHowever, on tasks where we compare the impact of new information (like Paradox, Strengthen, Weaken), we may still need to use more time to consider all five answers.\n\nIf your thinking feels unfinished on any of them, flag them as you go (so that you can maintain your brisk pace), and then take a second look at them after the timer goes off before you check your answer / the explanation."
    },
    "bank_filter": {
      "qtypes": [
        "Paradox",
        "Flaw",
        "Role",
        "Main Conclusion",
        "Necessary Assumption",
        "Sufficient Assumption",
        "Strengthen",
        "Weaken",
        "Method of Reasoning",
        "Must Be True"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 1,
      "count": 15
    },
    "week": 11,
    "order_in_week": 4,
    "source_file": "04_week_11_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-01-explain-curious-fact-medium-set-4",
    "title": "Explain Curious Fact (Medium) Set 4",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "intermediate",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In the world of Strengthen, Weaken, Flaw, and Evaluate, there are tons of arguments where the author is trying to **Explain a Curious Fact**.\n\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact (it will sometimes deny an Alternate Explanation as well).\n\n- The correct answer will deal either with an **Alternate Explanation** or with the **plausibility of the Author's Explanation**.",
      "right_md": "# Try these 5 questions untimed,\n\nwhile rehearsing these steps:\n\nWhat is the **Curious Fact?**\n\n- what language tips us off? is there an _Asymmetric Comparison?_\n- ask yourself the Curious Fact: \"Why is it that .. [curious fact]?\"\n\nWhat is the **Author's Explanation / Hypothesis?**\n\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\nDoes the correct answer deal with an **Alternate Explanation?**\n\n- Is it dealing with the idea of _Reverse Causality?_\n- Is it dealing with the idea of a _Third Factor?_\n\nOr does it address the **plausibility** of the Author's Explanation?\n\n- Is it addressing plausibility via covariation? (strengthening by _No Cause / No Effect_, or _More Cause / More Effect_ data points or weakening by _Cause without Effect_, or _Effect without Cause_ data points)\n- Or is it addressing plausibility some other way? (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 8,
    "order_in_week": 1,
    "source_file": "04_week_8_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-02-assumes-similarity-set-1",
    "title": "Assumes Similarity (set 1)",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Weaken",
      "Strengthen"
    ],
    "question_features": [
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## Every comparison hides an assumed sameness\n\nIn the world of **Comparisons**, authors lean on a few recurring assumptions:\n- What was true in the **past** is still true **today**.\n- What is true **today** will be true in the **future**.\n- What was true for **this** group, person, or thing is true for **that** one.\n\nWhen an author reasons across time or across cases, the argument only holds if the two sides are similar enough to carry the conclusion. That assumed similarity is the pressure point.\n\n- **Weaken** by pointing out a salient difference between the two sides.\n- **Strengthen** by adding a similarity or affirming the assumed one.",
      "right_md": "## Try these 7, untimed\n\nGo for accuracy and pattern recognition, not speed.\n\nFor each argument:\n- Name the comparison. What two things, groups, or moments is the author treating as alike?\n- Find where that sameness is assumed rather than proven.\n- Prephrase the gap: \"this only works if the two sides are similar in the way that matters.\"\n\nThen judge the answers:\n- A weakener surfaces a **difference** that breaks the link.\n- A strengthener shores up the **similarity**.\n- Wrong answers often raise a difference that does not matter, or simply restate the comparison without testing it."
    },
    "bank_filter": {
      "qtypes": [
        "Weaken",
        "Strengthen"
      ],
      "features": [
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 7
    },
    "week": 8,
    "order_in_week": 2,
    "source_file": "04_week_8_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-03-anti-causal-set-3",
    "title": "Anti-Causal - Set 3",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 6,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Weaken"
    ],
    "question_features": [
      "Anti-Causal"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In many **Anti-Causal** arguments, the author doesn't believe that \"X causes / explains Y\", because the author's premise supposedly makes that causal relationship seem implausible or wrong.\n\n_for example_ -- Timmy says that his love of sushi was caused by his upbringing. However, this must be false, since he did not grow up in a Japanese household.\n\nIn objecting to these arguments, we're essentially trying to restore the idea that, \"yes, X _does_ cause Y\" (Timmy's upbringing _is_ what explains his love of sushi) while reconciling that with the author's concern.\n\nEven though your premise is true,  \nit still _is_ the case that X caused Y,  \nbecause ... ?\n\nEven though Timmy didn't grow up in a Japanese household,  \nit still _is_ the case that his upbringing caused his love of sushi,  \nbecause ... ?",
      "right_md": "# Try these 6 problems untimed.\n\nFocus on finding the anti-causal features.\n\nThe authors will be thinking, \"How can this Cause/Effect relationship be true if fact X seems to go against it?\" (fact X will normally feel like something showing Cause w/o Effect or Effect w/o Cause)\n\nSo our job in thinking about these problems is to figure out we can reconcile fact X with the Cause/Effect relationship.\n\nSet up your thinking this way to respond to their evidence:\n\n- A _does_ cause B (or A _did_ cause B)\n- X is just true because ... ?\n\nCorrect weakening ideas on Anti-Causal arguments will usually feel like they're \"**making an excuse**\" for the premise, helping us to see it in a new light that allows us to still believe in the Cause/Effect relationship being disputed.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Weaken"
      ],
      "features": [
        "Anti-Causal"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 6
    },
    "week": 8,
    "order_in_week": 3,
    "source_file": "04_week_8_blue_lr_guided_drills.md"
  },
  {
    "slug": "w8-04-conditional-logic-medium-set-5",
    "title": "Conditional Logic (Medium) Set 5",
    "category": "Pacing",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 4,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Contrapositive Logic"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "- Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the If / Then rule.\n- Write or think through the contrapositive as well.\n- Beware the temptation to make illegal Backwards or Opposite moves.\n\nHow does Conditional Logic show up, by question type?\n\n- **Principle** (the left side of the Principle matches the Evidence, the right side matches the Conclusion)\n\n- **Parallel** (diagramming these arguments with \"algebraic recipes\" allows us to be more picky and decisive when evaluating answers)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path / or the evidence gives us a conditional rule that potentially could output the conclusion, but we still need an answer choice to tell us something in order to clearly trigger that rule.)\n\n- **Must Be True / Most Supported** (multiple conditionals often chain together, and provided facts often match the contrapositive-trigger of a conditional and allow us to infer the contrapositive-outcome)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)",
      "right_md": "# Try these 10 problems in 17 minutes\n\n(1.5x = 23 mins, 2x = 34 mins)  \nfeaturing conditional logic, avg diff = level 4\n\nFocus on answering them all within the time limit, and then when you review the set (untimed) consider doing more diagramming to improve your mastery of conditional logic.\n\n# CONDITIONAL KEYWORDS\n\n- Put on **Left** (sufficient conditions)  \n  _if, when, any, each, all, every, the only, whenever, whoever, X's_\n\n- Put it on the **Right** (necessary conditions)  \n  **only if**, only, must, requires, ensures, will, always, implies, presupposes, depends on, guarantees,\n\n- Put negated version of either idea on left (**If-Not**)  \n  **unless**, without, until, except\n\n- **Negative to Positive** conversions  \n  No A's are B = All A's are ~B  \n  Not all A's are B = Some A's are ~B  \n  Few A's are B = Most A's are ~B"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming",
        "Contrapositive Logic"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 8,
    "order_in_week": 4,
    "source_file": "04_week_8_blue_lr_guided_drills.md"
  },
  {
    "slug": "w12-01-assumption-family-harder-set-2",
    "title": "Assumption Family (Harder) Set 2",
    "category": "Pacing",
    "estimated_minutes": 80,
    "question_count": 10,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Sufficient Assumption",
      "Principle-Conform",
      "Necessary Assumption",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Strengthen",
      "Weaken",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison",
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This is a **tough** timed set of Assumption Family problems from test 72, all level 4 or 5. We're expecting that these will take longer than the 1:20 average, but we can't stay on them too long, so we're giving ourselves an average of 1:45 to move through these.\n\nBelow, we've placed the blue question types on a continuum from questions that are testing the Internal Logic to those that are testing our ability to think of Other Considerations.\n\n**Internal Logic**  \nmissing links  \nmissing facts  \nrules, definitions  \nand vs. or  \nconditional logic  \ntrigger = evidence  \noutcome = conclusion  \nruling out all alternatives\n\n**Sufficient Assumption**\n\n**Principle**  \n(strengthen / conform)\n\n**Necessary Assumption**\n\n**(Parallel) Flaw**\n\n**Famous Flaws**\n\n**Courtroom Debate**  \nadvantages, disadvantages  \nrebuttals  \nrecommendations  \npredictions  \nhypotheses  \nsurveys  \nexperiments  \nstatistics\n\n**Strengthen**  \n**Weaken**  \n**Evaluate**",
      "right_md": "1. Set a timer for **17 mins** (1.5x = 26, 2x = 34)\n2. Before timer runs out, **get an answer to all 10 problems**, so that you can practice the tough habit of moving on even though you weren't fully done thinking about the problem.\n3. Once the timer goes off, **take an untimed 2nd look** at problems before you check your previous attempt and look at the explanation.\n\nDon't do this activity as your first LSAT activity of the day. It would be like not stretching at all and then just jumping into the 4th quarter of an NBA playoff game. Get your brain ready to have a really powerful stretch of high-processing efficiency for 20 mins.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Principle-Conform",
        "Necessary Assumption",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Strengthen",
        "Weaken",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 10
    },
    "week": 12,
    "order_in_week": 1,
    "source_file": "05_week_12_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w12-02-explain-curious-fact-harder-set-3",
    "title": "Explain Curious Fact (Harder) Set 3",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Back again for more fun with **Explain a Curious Fact**, in which the evidence will provide some _Curious Fact_ (almost always an asymmetric comparison).\n\nThe author is implicitly asking herself, \"Wussup with this Curious Fact?\", and her conclusion either states or implies some causal explanation.\n\nWe evaluate these arguments by thinking about:\n\n- **Alternate Explanations** for this curious fact\n- the **plausibility** of the Author's Explanation",
      "right_md": "# Try these 5 problems, untimed.\n\n**(1) Locate the _Curious Fact_ in the evidence, and ask the curious question.**\n\nEXAMPLE: \"People who run marathons are more likely than those who don't to be in excellent health. Clearly the mental discipline it takes to run a marathon also allows people to make better dietary and lifestyle choices.\"\n\nThe first sentence is a correlation, a Curious Comparison (ppl who are X are more likely than those who aren't to be Y). The author is _asking_ herself: **Hmm - why is is that** there's this correlation between marathon running and excellent health?\n\n**(2) Spell out the author's explanation for the curious fact, because the author is often conveying a lot of implicit ideas within their conclusion:**\n\n_People who run marathons have good mental discipline. This mental discipline helps them not over-eat, not over-indulge in alcohol or smoking. By not doing those things, they end up in excellent health._\n\n**(3) Think about _Alternate Explanations_ for the Curious Fact.**\n\nConsider _Reverse Causality_ (maybe being in excellent health lets you run a marathon) or _Third Factor_ (maybe being wealthy both enables you to have time to practice/run a marathon and also enables you to get better nutrition, exercise, and medical care)\n\n**(4) Think about what could help us assess the _Plausibility_ of the Author's Explanation.**\n\nCovariation answers (No Cause, No Effect / Effect without Cause / Cause without Effect), or Presence / Motive / Method ideas (Suspect was at the scene of the crime / suspect had incentive to do it / here's how the suspect could have done it).\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 12,
    "order_in_week": 2,
    "source_file": "05_week_12_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w12-03-conditional-logic-harder-set-4",
    "title": "Conditional Logic (Harder) Set 4",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## When to reach for the diagram\n\nThis set mixes question types, but they share one trigger: **conditional logic** dense enough that diagramming pays off. The types that most often reward a diagram:\n- **Must Be True** and **Most Supported**\n- **Sufficient Assumption**\n- **Parallel** and **Parallel Flaw**\n- **Principle-Strengthen** and **Principle-Conform**\n\nThe move is always the same. Translate each conditional into an arrow, chain the arrows that connect, and read off what must follow. The contrapositive is half your toolkit, so write it down.\n\nOn **Flaw** questions with conditional logic, expect the author to abuse a rule with an illegal **reversal** or **negation**: the Necessary vs. Sufficient flaw.",
      "right_md": "## Try these 7, on paper\n\nFrom tests 65, 71, and June 2007. Keep a pen moving.\n\nFor each stimulus:\n- Spot the conditional **trigger words** (if, only if, unless, no, all, none) and diagram them.\n- Write the **contrapositive** of any rule you diagram.\n- Look for conditionals that **chain** together, then read the chain end to end.\n\nJudging answers:\n- On inference questions, the answer must be forced by the chain, not merely consistent with it.\n- On **Sufficient Assumption**, find the missing link that completes the chain from evidence to conclusion.\n- On **Flaw / Parallel Flaw**, name the illegal move (reversal or negation) and match it exactly."
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 7
    },
    "week": 12,
    "order_in_week": 3,
    "source_file": "05_week_12_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w12-04-speedwalking-lr-set-2",
    "title": "Speedwalking LR (set 2)",
    "category": "Pacing",
    "estimated_minutes": 60,
    "question_count": 15,
    "difficulty_min": 1,
    "difficulty_max": 1,
    "level": "beginner",
    "question_types": [
      "Paradox",
      "Flaw",
      "Role",
      "Main Conclusion",
      "Necessary Assumption",
      "Sufficient Assumption",
      "Strengthen",
      "Weaken",
      "Method of Reasoning",
      "Must Be True"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**LENGTH** -- 15 Q's, 15 minutes (1.5x = 22, 2x = 30)  \n**TYPES** -- Paradox, Flaw, Role, Main Conclusion, Necessary Assumption, Sufficient Assumption, Strengthen, Weaken, Method, and Must Be True.  \n**LEVEL** -- 1\n\nWait a sec -- these are all level 1? I thought this activity was listed as level 5?\n\nYes, because the goal is something a level 5 student needs to work on: be able to quickly take care of easier questions, so that you'll have more time and brainpower in reserves for the harder, more flexible thinking questions in the section.\n\nGiven how many subtle reading traps there are on LSAT, it's sometimes difficult to ever let yourself believe that an answer you find appealing is correct. \"It's never this easy\", we might think. But, sure it is! Sometimes it really is that easy. We need to improve our ability to _let the easy be easy._\n\nAnd we need to develop enough self-trust while we're doing easier problems that we can pick up our pace when possible.",
      "right_md": "Try to get through these 15 questions in 15 mins. Keep yourself going at a brisk pace. When you have a strong idea of what you're looking for (like on Main Conclusion, Role, Sufficient Assumption, Flaw), try to be proactive about scanning for and finding your answer, rather than reading all five choices start to finish.\n\nHowever, on tasks where we compare the impact of new information (like Paradox, Strengthen, Weaken), we may still need to use more time to consider all five answers.\n\nIf your thinking feels unfinished on any of them, flag them as you go (so that you can maintain your brisk pace), and then take a second look at them after the timer goes off before you check your answer / the explanation."
    },
    "bank_filter": {
      "qtypes": [
        "Paradox",
        "Flaw",
        "Role",
        "Main Conclusion",
        "Necessary Assumption",
        "Sufficient Assumption",
        "Strengthen",
        "Weaken",
        "Method of Reasoning",
        "Must Be True"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 1,
      "count": 15
    },
    "week": 12,
    "order_in_week": 4,
    "source_file": "05_week_12_final_blue_lr_guided_drills.md"
  },
  {
    "slug": "w13-01-necessary-not-helpful",
    "title": "Necessary, Not Helpful",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Necessary Assumption"
    ],
    "question_features": [],
    "reasoning_types": [],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Eight Necessary Assumption questions at difficulty 4 and 5, mixed across both jobs an assumption\ncan do: supplying a missing idea, and ruling out an objection.\n\nYou do not get told which one you are looking at. The tell is in the argument. Conditional logic,\nor a phrase repeated twice inside the paragraph, points at a missing idea. A recommendation, a\nprediction, or a hypothesis offered to explain some curious background data points at an\nobjection.\n\nAt this difficulty both kinds are dressed to look like the other. A conditional stimulus can still\nwant a Defender, and a causal stimulus can still want a plain missing link.",
      "right_md": "# Try these 8 questions, untimed\n\n- Is there a **New Concept** in the conclusion that the evidence never defined? If so, what idea\n  from the evidence is it being connected to?\n\n- Is the author assuming two things are **similar**, or assuming they are **different**? Spell out\n  the obvious version. At this level the obvious version is frequently the answer.\n\n- If neither worked, argue the Anti-Conclusion and see what you had to assume.\n\n- Run the negation test on your pick before you commit. It is the only check that separates\n  necessary from merely helpful.\n\nAs you review these,\n\n**correct answers -** which of the two jobs was it doing? Which question found it?\n\n**incorrect answers -** **Too Strong**, a **Reversal** of the link you wanted, or an idea that\nhelps the argument without being required?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Necessary Assumption"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 13,
    "order_in_week": 1,
    "source_file": "06_week_13_necessary_assumption_harder_guided_drills.md"
  },
  {
    "slug": "w13-02-block-the-objection",
    "title": "Block the Objection",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 4,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Necessary Assumption"
    ],
    "question_features": [
      "Defender"
    ],
    "reasoning_types": [],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Every Necessary Assumption does one of two jobs. It supplies an idea the author was clearly\nthinking, or it rules out an objection that would hurt the argument.\n\nThese 8 questions are all the second kind. The **Defender** answer does not add a new link to\nthe argument. It stands in front of the argument and blocks something that would have knocked\nit over.\n\nThat is why these answers so often feel like they come from outside the paragraph. The author\nnever mentioned the objection, so the correct answer names something that was never discussed\nand tells you it is not happening. Test-takers throw those answers out for being \"out of scope\",\nand that instinct is exactly what is being punished here.\n\nThese are difficulty 4 and 5. Expect the objection to be one you have to build yourself rather\nthan one the stimulus hands you.",
      "right_md": "# Try these 8 questions, untimed\n\n- Find the conclusion, then argue the **Anti-Conclusion**. Accept every word of the evidence and\n  try to reach the opposite result anyway. What did you have to assume to get there?\n\n- Whatever objection you just built, the author is assuming it is **not** the case. That is the\n  answer, in some form.\n\n- If the author is making a recommendation, predicting an outcome, or explaining a curious fact,\n  the objection is usually an alternate explanation, a hidden downside, or a reason the plan\n  fails on its own terms.\n\n- Negate the answer you picked. If the argument still stands, it was not necessary.\n\nAs you review these,\n\n**correct answers -** did it block an objection you had already thought of? If it blocked one you\nhad not, what question would have surfaced it?\n\n**incorrect answers -** was it **Too Strong** for a necessary assumption? Did it defend against\nsomething the argument never actually needed? Did it strengthen without being required?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Necessary Assumption"
      ],
      "features": [
        "Defender"
      ],
      "reasoning_types": [],
      "difficulty_min": 4,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 13,
    "order_in_week": 2,
    "source_file": "06_week_13_necessary_assumption_harder_guided_drills.md"
  },
  {
    "slug": "w1-01-first-sentence-conclusions",
    "title": "First Sentence Conclusions",
    "category": "Patterns",
    "estimated_minutes": 30,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Main Conclusion",
      "Role"
    ],
    "question_features": [
      "First Sentence Conclusion"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "These six questions all have a **Conclusion** in the **first sentence**, which of course is not the most obvious place to find a conclusion.\n\nBut **that's the point!**\n\nWhen we're doing Main Conclusion and Role questions, the test writers are intentionally trying to hide the conclusion, so that this otherwise-easy task can still be challenging.\n\nThe most common place to find the conclusion is after a Pivot, expressing some Rebuttal sentiment (65% of Main Conclusion questions).\n\nThe second most common place they'll stash it is in the first sentence (25% of Main Conclusion questions).\n\nOnly about 10% of the time on Main Conclusion does the paragraph end with the conclusion. That's why picking an answer that matches the final claim will usually be wrong (but definitely not always!)\n\nWe want to practice reading Main Conclusion questions with a special ear for \"upside-down\" arguments, where we hear the conclusion and _then_ hear the supporting ideas.",
      "right_md": "# Do these six questions,\n\nthinking about how we would have figured out that the first sentence was the conclusion.\n\nThis exercise is about getting our brains used to the feel of a pattern. Focus on noticing how the first claim is an **opinion**, and then **feeling** how the subsequent claims go on to defend that initial opinion.\n\nAre there any **Support Indicator** words that follow it?  \n(f.e. **FABS** = for, after all, because, since)\n\nAre there any **Opinion Indicator** words in it?  \n(f.e. should, ought, probably, better)\n\nIf we look at the claim in the first sentence and ask ourselves, \"**Why should we believe _that?_**\", does the rest of an argument seem like an answer to that question? (It should)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Main Conclusion",
        "Role"
      ],
      "features": [
        "First Sentence Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 1,
    "order_in_week": 1,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-02-the-core-connection",
    "title": "The Core Connection",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Flaw",
      "Weaken",
      "Strengthen",
      "Principle-Strengthen",
      "Evaluate"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Links Between Premises"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "# Assumption & Objection Family\n\nSufficient Assumption, Necessary Assumption,  \nFlaw, Weaken, Strengthen, Principle-Strengthen, Evaluate\n\nThere are two main types of problems in the Assumption Family:\n\n- those testing the **Internal Logic** of the argument (\"in the box\")\n- those testing **New Considerations** (\"outside the box\" ideas)\n\nThis set of problems is all about the Internal Logic.",
      "right_md": "1. Find the Conclusion.\n2. Find the main Supporting Idea (the Premise).\n\n- On **Assumption** questions, try to find an answer reinforcing  \n  _If Premise, then Conclusion_\n\n- If you're doing **Strengthen**, look for answers saying  \n  _The Premise is heavily connected to the Conclusion_\n\n- If it's **Flaw** or **Weaken**, look for answers saying  \n  _The Premise can be true, while the Conclusion is false_\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Flaw",
        "Weaken",
        "Strengthen",
        "Principle-Strengthen",
        "Evaluate"
      ],
      "features": [
        "Missing Link / Idea",
        "Links Between Premises"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 7
    },
    "week": 1,
    "order_in_week": 2,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-03-assumption-family-easier-set-1",
    "title": "Assumption Family (Easier) Set 1",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 9,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Argue the Anti-Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "In the **Assumption Family**,  \nStep 1, find the author's Conclusion and Supporting Idea(s).  \nStep 2, depends ... which type of question are you doing?\n\n## Sufficient / Necessary Assumption, or Principle-Strengthen?\n\nStart by thinking about the **Internal Logic** of the argument.\n\n- \"If Premise, Then Conclusion\" linking ideas.\n- If there's a _New Concept in Conclusion_, make the author define that term. What idea from the evidence is she connecting it to?\n- Is there an _Untriggered Conditional_ idea in the evidence?\n- Do two premises have an overlapping concept? Can we synthesize them?\n- \"in-the-box\" correct answers, re-using language from argument\n\n## Strengthen, Weaken, Flaw or Evaluate?\n\nBe the Opposing Lawyer, and engage in **Courtroom Debate**.\n\n- Look for hints at Comparative or Causal reasoning.\n- If the author is arguing by Comparison, we have to try to weaken the comparison by making two things seem unfair to compare, or by adding a new consideration to the pros and cons balance sheet.\n- If the author is presenting a Curious Fact and then concluding something that implies a causal explanation, think about Alternate Explanations, or ways to better assess the Author's Explanation.\n- Is the author engaging in any illegal argument moves (famous flaws)?\n\nRemember, these are just **tendencies**. This is like reading the scouting report on an athlete, and knowing they _prefer_ to go to their right. We hedge that way, but we're still willing to use either style of thinking on any question type.",
      "right_md": "# Try these 9 questions, untimed\n\nThink about how our thinking shifts from  \n_Internal Logic_ to _Courtroom Debate_, based on the question type.\n\nWhen you're trying **Sufficient Assumption, Necessary Assumption**, or **Principle-Strengthen** questions, think to yourself that when you combine the correct answer with the existing premises you can derive, or come much closer to deriving, the conclusion.\n\nIf the conclusion is trying to prove that \"A is Z\", then we need two basic things:\n\n- a rule that has an outcome of Z, like \"If X, then Z\".\n- facts telling us that A triggers this rule, like \"A is X\".\n\nWhen you're trying **Strengthen, Weaken**, or **Evaluate**, try to respond to the argument as though you're Opposing Counsel. Even though you accept that the Prosecution's evidence is true, how could you make it seem irrelevant, less trustworthy, or less important than some other consideration?\n\nThink about the argument in one (or more) of these ways.\n\n- **Given** [this evidence], **How can I still argue** [the anti-conclusion] ?\n- **Even though** [evidence] is true, [conclusion] **is wrong because ...**\n- **Given that I want to argue** [anti-conclusion], **how can I respond to** [author's evidence / logic]?\n\nWhen you're doing **Flaw**, add onto that list, \"Is this author committing any of the **famous flaws**?\"\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Missing Link / Idea",
        "Argue the Anti-Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 9
    },
    "week": 1,
    "order_in_week": 3,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-04-framework-sampler",
    "title": "Framework Sampler",
    "category": "Patterns",
    "estimated_minutes": 40,
    "question_count": null,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [],
    "question_features": [],
    "reasoning_types": [],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This set contains **four RC passages** , each one with a different Framework.\n\nThere is an Old / New, a Problem / Solution, a Present Debate, and a Challenge Position, along with the Main Point or Primary Purpose question accompanying that passage.\n\nRead each passage, trying to discern the Framework and reading for the Framework Fill-In's. Think about the main point through the lens of the author's purpose. _Why_ is the author writing about this topic? If she could have us read only one sentence, which one would best capture her purpose in writing the passage?",
      "right_md": "## Attempt these four passages\n## and the accompanying questions, **untimed.**"
    },
    "bank_filter": {
      "qtypes": [],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": null
    },
    "week": 1,
    "order_in_week": 4,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-05-paradox-first-taste",
    "title": "Paradox - (First Taste)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Try these 6 **Paradox** questions from test 73 and 71 (141 and 140).\n\nThese questions are all about initially understanding how the the paragraph is creating some cognitive dissonance (the feeling when two ideas don't fit well together), and then picking an answer that resolves that tension, and helps give us a way to understand how both things can be true.\n\nMost correct answers provide some important difference between two things, two groups, two timeframes, or two situations.\n\nOn **Strengthen / Weaken / Paradox**, the question stem begins  \n_Which of the following, if true, most ..._\n\nThat lead-in means, \"Don't worry whether it's true in the real world or whether it sounds too strong or unlikely. _Pretend_ it's true, and assess whether it would have any impact on this conversation.\"",
      "right_md": "# Set a timer for 9 minutes\n\n1.5x = 13 mins  \n2x = 18 mins\n\n- Select your answers but don't hit confirm.\n- When the timer goes off, flip back through the problems and see if you want to change any of your answers.\n- Then hit confirm and read the explanation, if available.\n\nPractice framing the paradox as,\n\n**Given** the background fact(s),  \n**How can we explain** the surprising claim?\n\nLook out for wrong answers that are not offering any distinction between two things/groups/timeframes, wrong answers that give you more context on the background fact but say nothing about the surprising idea, and wrong answers that Deepen the Paradox by making us _even more_ confused by how the surprising idea could be true..\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 1,
    "order_in_week": 5,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-06-explain-curious-fact-first-taste",
    "title": "Explain Curious Fact (First Taste)",
    "category": "Patterns",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [],
    "question_features": [
      "Explain Curious Fact"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In these arguments, the author concludes (or assumes)  \na causal explanation for a **Curious Fact**.\n\n(some of these problems you may have already seen, which is fine / intentional -- it's **very** valuable to revisit questions, especially if we look at them from a different angle or with a more sophisticated understanding.)\n\nThere are a handful of different question types here, but they all have a common theme:\n\n- The **evidence** presents some _Curious Fact_ (an asymmetric comparison, like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible _Causal Explanation_ for this curious fact.\n\n- The correct answer will either deal with _Alternate Explanations_ for the curious fact or with the _plausibility_ of the Author's Explanation.",
      "right_md": "# Try these 8 questions untimed,\n\nwhile rehearsing these steps:\n\n## What is the Curious Fact?\n\n- what language tips us off? is there an asymmetric comparison?\n- _ask_ yourself the Curious Fact: _why/how is it that [curious fact]?_\n\n## What is the Author's Explanation / Hypothesis?\n\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\n## Does the correct answer deal with an Alternate Explanation?\n\n- Is it dealing with the idea of _Reverse Causality?_\n\n- Is it dealing with the idea of a _Third Factor?_\n\nOr does it address the **plausibility** of the Author's Explanation?\n\n- Is it addressing plausibility via covariation? (strengthening by No Cause / No Effect, or More Cause / More Effect data points or weakening by Cause without Effect, or Effect without Cause data points)\n\n- Or is it addressing plausibility some other way? (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)\n\n---"
    },
    "bank_filter": {
      "qtypes": [],
      "features": [
        "Explain Curious Fact"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 8
    },
    "week": 1,
    "order_in_week": 6,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w1-07-flaw-first-taste",
    "title": "Flaw - First Taste",
    "category": "Process",
    "estimated_minutes": 80,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "# Try out some Flaw questions,\n\nto get a feel for how they look and how they work.\n\n## keywords\n\nvulnerable to criticism, flaw, questionable reasoning, errors of reasoning\n\n## examples\n\nThe argument is most vulnerable to criticism because it ...  \nFred commits which of the following errors of reasoning?  \nThe publicist's reasoning is flawed because she ...\n\n## stimulus tendencies\n\nThese are arguments that either have a noteworthy Assumption, are vulnerable to a certain sort of Objection, or make some sort of Dubious / Illicit Move.",
      "right_md": "# Try these 7 questions, untimed,\n\nfor accuracy and understanding.\n\nFlaw wants us to read someone's unsuccessful argument and say to the judge, \"Objection, Your Honor, but Bad Lawyer over here just did ____.\"\n\nThus, try to read the argument and respond with an objection _to the reasoning_.\n\n- Is there a distinction the author isn't perceiving?\n- Is the author's conclusion too strong?\n- Is something irrelevant?\n- Does the author's thinking feel like it's cheating in some way?\n\nSince the answers will be doing so, we should feel free to speak any of three languages. \"The argument is flawed because ...\n\n- the author assumes X\" (**Assumption answers**)\n\n- isn't it possible that Y is true?\" (**Objection answers**)\n\n- the author made this illegal move\" (**Description answers**)"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 7
    },
    "week": 1,
    "order_in_week": 7,
    "source_file": "week_1_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-01-sampling",
    "title": "Sampling",
    "category": "Patterns",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Sampling",
      "Part vs. Whole"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Part vs. Whole and Sampling\n\nare two of the ten Famous Flaws.\n\nThere's nothing inherently wrong with using a sample to extrapolate to a general conclusion, but a sample can seem very untrustworthy if it's **too small, unrepresentative, biased,** or **self-selecting**.\n\n_Part vs. Whole_ flaws involve an assumed similarity between individuals and a collective entity.\n\n_Sampling_ involves an assumed similarity between individuals and other individuals.\n\n## Whole to Part\n\nThe Millville High School cheer team was banned from the City Dance-Off competition. Tony is a member of the Millville High School cheer team. Thus, Tony is banned from the City Dance-Off competition.\n\n## Part to Whole\n\nTony, Tanya, and Tyreke are members of the Millville High School cheer team. None of them have enough money to pay the entry fee for the City Dance-Off competition. Thus, the Millville High School cheer team does not have enough money to pay the entry fee for the City Dance-Off competition.\n\n_this fails to consider that even though these three single people may have enough money to pay the fee, the squad collectively might have enough money._\n\n## Sampling\n\nTony, Tanya, and Tyreke are members of the Millville High School cheer team. None of them have enough money to pay the entry fee for the City Dance-Off competition. Thus, each of the members of the Millville High School cheer team does not have enough money to pay the entry fee for the City Dance-Off competition.\n\n_this fails to consider that even though these three cheerleaders don't have enough money there may be some members who are different. the income level of the three T people isn't representative of the income of other members._",
      "right_md": "# Try these 10 questions, untimed,\n\nlooking for language cues that indicate these two flaws.\n\n- Look for the same trait being recycled in the premise and the conclusion. (i.e. \"Tony _can't afford it_, so Tony's team _can't afford it_\"). Think about whether the argument goes from a premise about a Whole to a conclusion about Parts of that Whole, or whether it goes from a premise about Parts of a Whole to a conclusion about the collective Whole.\n\n- Look for arguments dealing with samples -- people who are surveyed / anecdotal examples / a subset of a group. See if the conclusion is assuming that what was true for these sample data points would also be true for a bunch of other data points.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Sampling",
        "Part vs. Whole"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 2,
    "order_in_week": 1,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-02-abstract-flaw-set-1",
    "title": "Abstract + Flaw (set 1)",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 10,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Abstract Answers",
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "Sometimes **Flaw** answer choices sound like specific objections to the argument. Other times, they are phrased with very nonspecific, abstract vocabulary.\n\nWhen abstract language appears within Flaw answers, **many**, if not most, of them allude to the same 10-15 famous flaws.\n\nThe other ones feel more like answer choices on Method questions. We need to pay attention to language indicators in each answer choice signifying which half of the answer is meant to describe the Conclusion and which half is meant to describe the Evidence.\n\nOnce we've determined that, we can start asking ourselves questions like, \"Can I match up this (abstract answer choice) wording with the Conclusion?\" If not, eliminate. If so, then we would try to match up the other half, making sure that we're consistent in terms of matching the same nouns/traits to the same abstract terms in each answer choice.",
      "right_md": "Try ten level **Flaw** problems, whose answer choices will feature some challenging abstract descriptions.\n\nDo them untimed, as this activity is mainly about increasing our understanding of the abstract terminology in the answers.\n\nIn a timed setting, you would just find the answer you like the most. But your job is to think about the wrong answers, too. What are they describing? If it's a famous flaw, name it. If not (or if so), try to think of your own sample argument that would be committing that flaw.\n\nIn order to judge abstract language quickly, it's powerful to have your own mental example of what that move _would_ sound like if it really _were_ happening in the stimulus.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Abstract Answers",
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 2,
    "order_in_week": 2,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-03-must-be-true-first-taste",
    "title": "Must Be True - First Taste",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Must Be True"
    ],
    "question_features": [],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "# Must Be True recap\n\n## keywords\n\nstatements, information, passage, must be true, properly inferred, follows logically\n\n## examples\n\nIf the statements are true, which one of the following must be true?  \nWhich of the following can be inferred by the information in the passage?\n\n## stimulus tendencies\n\nThese are FACTS, not ARGUMENTS.  \nThe stimulus usually features some blend of Conditional or Quantified ideas.\n\n## correct answer\n\nIt is provable based on only the provided information. It does not need to use all the facts; in fact, it's a very common template that the inference involves combining the first and last claims (while the middle claim acts as filler). It's very rare for the correct answer to be derived from only one idea, so you should normally feel like in order to support the correct answer, you need to combine 2 or more facts.\n\nSince we're trying to pick an answer we can prove, we'd prefer seeing weaker language. It's easier to prove a weakly worded claim. But since most of the inferences on Must Be True come from Conditional or Mathematical thinking, they often are strongly worded, because we can often derive certainty using conditional / mathematical thinking.",
      "right_md": "# Try these 6 questions untimed\n\nseeking perfect accuracy.\n\nThe correct answer must be something you can derive by combining multiple claims (not necessarily all the claims) from the paragraph.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Must Be True"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 2,
    "order_in_week": 3,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-04-conditional-logic-easier-set-1",
    "title": "Conditional Logic (Easier) Set 1",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 9,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "# Try 9 questions that feature conditional logic\n\ntests 50-54, levels 1 - 3\n\nThese are the LR question types that most often would prompt us to consider diagramming the Conditional Logic:\n\n- Must Be True\n- Most Supported\n- Sufficient Assumption\n- Parallel / Parallel Flaw\n- Principle-Strengthen / Principle-Conform",
      "right_md": "- Look out for conditional trigger words.\n\n- Practice diagramming some of these problems, by writing conditionals on your paper. But also practice trusting your instinct _not_ to diagram the conditional logic, when you feel like you're having no trouble absorbing the ideas.\n\nHow does Conditional Logic usually show up, by type?\n\n- **Principle-Conform w/ Principle in Stimulus** (makes a lot of sense to diagram these conditionals, because all five answers are testing us on whether we have an argument that establishes the left side of a rule and concludes the right side of a rule)\n\n- **Parallel** (makes a lot of sense to diagram these arguments in the abstract, using generic variables like A, B, C. The more specific we are with seeing the abstract recipe, the more picky and decisive we can be with answers.)\n\n- **Sufficient Assumption** (the conclusion gives us an A --> Z logic path we want to prove. the evidence, combined with the correct answer choice, assemble together to create that A --> Z path)\n\n- **Must Be True / Most Supported** (if there are multiple conditionals, they will often chain together. otherwise, a fact provided will trigger the contrapositive of a conditional)\n\n- **Flaw / Parallel Flaw** (if we're doing Flaw and see conditional logic, it usually means that the author is about to use that conditional rule in an illegal Backwards or Opposite fashion, which is the #1 Famous Flaw, known as **Necessary vs. Sufficient**)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 9
    },
    "week": 2,
    "order_in_week": 4,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-05-reconcile-the-pivot-first-taste",
    "title": "Reconcile the Pivot (First Taste)",
    "category": "Patterns",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Important Pivot"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Within the world of Inference (**Most Supported / Must Be True**), we are trying to combine 2 or more ideas together in order to derive some synthesis of ideas.\n\nWe often can't predict what the correct answer will say, but we often can, if we pay attention to certain \"clue words\":\n\n- conditional indicators (if, only if, unless, requires, etc.)\n- causal relationships (because of this, due to this, this allows, this makes possible, as a result, this leads to, etc.)\n- quantifiers (most, some, all, no)\n- other mathematical ideas (percents, fractions, numbers, ratios)\n- pivots (but, yet, however)\n\nThe pattern we call _Reconcile the Pivot_ is when the last or second to last claim begins with a Pivot word. This final idea or two creates some tension with idea(s) that came before the pivot, and the correct answer somehow resolves that tension or balances that tension.",
      "right_md": "# Try these 5 questions, untimed\n\n- When you hit the pivot word (but / yet / however), think about how that new claim creates some tension with what came before or has some relevance to it.\n\n- Try to mentally articulate what the net effect is of combining that pivot idea with what came before. Expect the answer to deal with whatever it is you're thinking in that moment.\n\n- Since these are Most Supported questions, remember that _Strong Language_ in the answer choices is a big red flag. We want the most provable answer, so weaker claims (with a lower burden of proof) are more attractive.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Important Pivot"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 5
    },
    "week": 2,
    "order_in_week": 5,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-06-missing-links-first-taste",
    "title": "Missing Links: First Taste",
    "category": "Patterns",
    "estimated_minutes": 60,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen"
    ],
    "question_features": [
      "Missing Link / Idea"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "These 6 problems test our ability to Link language from the evidence to language from the conclusion.\n\nTo get better at spotting these missing links, we focus on structure and common terms vs. new terms. Terms that get mentioned twice are usually not going to be in the correct answer. (A terrible mnemonic for that is, _Mentioned Twice? That'll Suffice._) Meanwhile, any _New Concept_ that appears in the conclusion is practically guaranteed to be in the correct answer.\n\nEvery claim has a Naming Part and a Telling Part. Suppose we have this conclusion: \"Clearly, monkeys that can dance ballet make humans feel inferior\".\n\nThe Naming Part is **monkeys that can dance ballet** and the Telling Part says that this thing we named **makes humans feel inferior**.\n\nWhat did the Evidence tell us about \"monkeys that can dance ballet\"?  \nWhat did the Evidence tell us \"makes us feel inferior\"?\n\nIf both questions can be answered, then there's a missing link between those answers.\n\nIf one or both of the questions can't be answered, then there's a missing link between that concept and some concept in the evidence. Here's an example of each.\n\n## Naming Part Not Mentioned\n\nThe human ego is certainly frail and volatile, but we know that when we don't feel special, we feel inferior. Thus, monkeys that can dance ballet make humans feel inferior.\n\n_missing link:_ monkeys that can dance ballet make us feel not-special\n\n## Telling Part Not Mentioned\n\nThe human ego is certainly frail and volatile, but when we see monkeys that can dance ballet, we know that we are not categorically different from other higher primates. Thus, monkeys that can dance ballet make humans feel inferior.\n\n_missing link:_ When we don't feel categorically different from other higher primates, we feel inferior.\n\n## Naming and Telling Parts Are Both Mentioned\n\nThe human ego is certainly frail and volatile, but when we see monkeys that can dance ballet, we know that we are not categorically different from other higher primates. And since we feel inferior when we don't feel special, monkeys that can dance ballet make humans feel inferior.\n\n_missing link:_ When we don't feel categorically different from other higher primates, we don't feel special.\n\n## Naming and Telling Parts Are Both Unmentioned\n\nWatching higher primates do a sophisticated task makes us feel not-special. Thus, monkeys that can dance ballet make humans feel inferior.\n\n_missing links:_ Monkeys are higher primates / doing ballet is a sophisticated task / feeling not-special makes us feel inferior",
      "right_md": "Try to predict what's missing. Sometimes, your intuition will clearly hear something missing. Other times, you'll need to ask yourself questions in order to find it.\n\n- Which claim is the Conclusion?\n- Is there any wording appearing in the conclusion that never shows up in the evidence?\n- If so, then what concept in the evidence is that _New Wording in the Conclusion_ supposed to match up with?\n- If not, then what ideas from the Evidence are associated with each half of the conclusion? How do those ideas need to be linked?\n\nAs you review these problems,\n\n**correct answers -**  \ndoes it supply a Missing Link? Was it the contrapositive of your prediction?  \nis it connecting Conclusion language to Premise language or connecting Premise language to Premise language?\n\n**incorrect answers -**  \ndoes it have the **Wrong Strength?**  \ndoes it lack some **Needed Idea** (such as a New Idea in the conclusion)  \nis it **Irrelevant** for some reason?  \nit is an illegal **Reversal / Negation** of the connection we wanted?\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen"
      ],
      "features": [
        "Missing Link / Idea"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 2,
    "order_in_week": 6,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-07-necessary-assumption-first-taste",
    "title": "Necessary Assumption - First Taste",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 10,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Necessary Assumption"
    ],
    "question_features": [
      "Defender"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "**Necessary Assumption** is the second most common question type in Logical Reasoning, and it's pretty difficult for a number of reasons. Assumptions perform one of two functions:\n\n- they supply a missing idea the author was clearly thinking\n- they rule out an objection that would hurt the author's argument\n\nWhen they are supplying a **missing idea**, Necessary Assumption questions feel a lot like Sufficient Assumption or Principle-Strengthen. Sometimes they even feel like Must Be True, which makes sense because we're being asked what Must Be Assumed. These examples are heavy on conditional logic, and the correct answer seems to be regurgitating concepts that were mentioned in the stimulus. (\"in-the-box\" answers)\n\nBut when they are **ruling out an objection**, Necessary Assumption questions feel more like Weaken or Flaw. These examples are more about causation and comparisons. The correct answer will often feel like it's bringing in new, outside considerations that haven't been talked about yet. (\"out-of-the-box\" answers).\n\nHow do we know which sort of Necessary Assumption question we're doing?\n\nWe don't, but generally speaking if we see conditional logic or see certain buzzwords / phrases being repeated twice within the paragraph, then we're being tested on a missing idea.\n\nIf we otherwise think the author is making a recommendation, making a prediction, or offering a hypothesis to explain some curious background data, then we're probably being tested on potential objections.",
      "right_md": "# Try these 10 questions, untimed\n\n- Ask yourself if there's a New Concept in the conclusion that was never defined in the evidence. If so, then what idea from the evidence is the author connecting with this New Concept in the conclusion? (that's the most common way we spot missing links)\n\n- Ask yourself if the author is assuming a Similarity between two things, or if the author is assuming a Difference between two things. (don't be afraid to spell out the 'obvious' -- in many cases that's all correct answers are doing)\n\n- If neither of those methods worked, then you should try to argue the Anti-Conclusion. If the author is concluding \"Thus, the sky is blue\", then you're arguing \"the sky is NOT blue\". How can we accept the author's evidence but still argue our anti-conclusion. Or, alternatively, given the anti-conclusion we're arguing for, how can we respond to the author's evidence?\n\nCan you think of an alternate explanation for it?  \nCan you argue it's not truly relevant to what's being debated in the conclusion?  \nCan you outweigh its effect by introducing new considerations?\n\nIf you're able to articulate an Objection, then the author is assuming that your objection is **not** the case.\n\n# ANSWERS\n\nbe wary of stuff that's **Too Strong**  \nbe wary of **Comparisons** never made or implied  \nbe wary of **Unmentioned** concepts\n\nif an answer is ruling out an idea with the word **\"not\"**, check that one out! negate it by removing the \"not\" and see if it turns into an Objection. If so, pick it.\n\nif an answer is **conditional**, diagram it. see whether that conditional (or more likely its contrapositive) matches a reasoning move the author made. be wary of illegal reversals or negations of the author's thinking.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Necessary Assumption"
      ],
      "features": [
        "Defender"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 10
    },
    "week": 2,
    "order_in_week": 7,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-08-assumption-family-easier-set-2",
    "title": "Assumption Family (Easier) Set 2",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# The three main Reasoning Types\n\n## Conditional Logic\n\nCorrect answers address the **internal logic**:\n\n- assumed links between ideas\n- if/then rules\n- a missing fact needed to trigger a rule\n- valid and invalid conditional inferences\n\n## Comparisons\n\nCorrect answers address assumed similarities or differences between two things:\n\n- part vs. whole\n- sample vs. general population\n- then vs. now\n- this situation vs. that situation\n- this group vs. that group\n\nOr they address the net gain / loss of a comparison:\n\n- doing this thing vs. not doing this thing\n- this thing vs. that thing\n\n## Causation\n\nCorrect answers relate to one of these two pressure points:\n\n- alternate explanations for the curious background fact\n- the plausibility of the author's explanation for it",
      "right_md": "# Try these 6 questions, untimed.\n\nIf it feels like you're dealing with Rules, or **if / then logic**,  \nFocus on understanding the If / Then rule.  \nWhat idea goes on the **Left** of the conditional arrow?  \nWhat idea goes on the **Right?**  \nWhen we're using **Conditional Logic** to \"prove an argument\", the **Left** side should be triggered by facts we know from the Evidence (or Answer Choice), and the **Right** side of the rule should match the Conclusion's language.\n\nIf it feels like you're dealing with a **Comparison**,  \nThink about weakening with potential differences or strengthening by affirming some similarity.  \nIf you're dealing with a Net Gain / Loss type of Comparison, think about weakening with potential downsides or strengthening with \"equal or better\" ideas.\n\nIf the author is interpreting the **Causal** significance of some Curious Fact (a weird asymmetry exists, or a study that has some interesting data),  \nTake time to understand the Author's Explanation.  \nThink about what kind of evidence would help make that Explanation seem more/less plausible.  \nBe sure to consider Alternate Explanations for that same Curious Fact.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 2,
    "order_in_week": 8,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-09-most-supported-first-taste",
    "title": "Most Supported - First Taste",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Try these eight Level 1-3 **Most Supported** questions from tests 73 and 71.\n\nIn general, Most Supported just gives us a paragraph of **statements / information**, and then the correct answer is the most derivable answer choice available.\n\nHowever, there are a few special variations of Most Supported:\n\nIf it's **Logical Completion** (fill in the blank), think about a safely worded conclusion that would pull together the thoughts already mentioned. Look out for situations where they want us to _Complete the Analogy_. (Randomly, like 5 of the problems from these tests happen to be Logical Completion, but they aren't usually that common)\n\nIf they're providing us with a Principle and asking us to **Apply the Principle**, pick an answer where the evidence matches the trigger of the principle, and the conclusion matches the outcome of the principle.\n\nIf they're asking which **Proposition / Generalization** can be best supported, pick an answer that matches the situation described, but _beware language that is Too Strong!_",
      "right_md": "- Be careful with **overly strong/specific language** in answer choices, because frequently we can't support that extremity or specificity.\n\n- Correct answers will almost always feel like you need to combine multiple claims in order to derive them.\n\n- If you see a Causal Chain or Causal Difference-Maker identified, the correct answer will usually reinforce that.\n\n- If there is a Pivot, the answer will usually feel like it's synthesizing the last idea with what came before the pivot.\n\n- If there is a Comparison / Analogy, think about spelling out what similarity or difference would carryover from one situation to another.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 8
    },
    "week": 2,
    "order_in_week": 9,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-10-causal-chains",
    "title": "Causal Chains",
    "category": "Patterns",
    "estimated_minutes": 36,
    "question_count": 3,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True"
    ],
    "question_features": [
      "Causal Chains"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Causal Chains\n\nappear most in **Most Supported** and **Must Be True**.\n\nA causal chain is three or more things causally linked: _Reading gives Jorge a headache. Headaches make Jorge lie down._\n\nThe test wants to make sure we see the implicit connection that \"Reading leads to laying down\".\n\n_Reading → Headache → Lay Down_\n\nIn many cases, causal chains overlap with conditional logic. If we see conditional logic wording, like **\"if, when, only, only if, unless, requires, always, will\"**, then we can choose to think of it conditionally or causally, same difference.\n\nBut on **Most Supported** questions, there will be looser language that still indicates a causal flow: _Doing X **promotes** Y, which **increases** the likelihood of Z being true. And Z is a **factor** in the formation of A._\n\nThe test wants to make sure we see the implicit connection that \"Doing X can increase your chance of A's forming\".",
      "right_md": "# Try these 3 questions untimed\n\nWork on building these causal chains,  \nbefore you look at answers\n\nBe patient trying to find the right causal sequence. Write any cause / effect relationship you can find on the page, with space on your page to both the left and the right of that idea, e.g\n\n_reads too much → gets a headache_\n\nNow, go seek out something that has to do with causing someone to \"read a lot\", or find something that could be caused by \"having a headache\".\n\nOn **Most Supported** questions, if you have a causal chain, A → B → C, is it okay to say \"if no A, then no C\"?\n\nYes, basically! It feels _naughty_ because that would be an illegal negation in the world of conditional logic, but in the world of Causality, you'll find LSAT being cool with the common sense plausibility of \"if cause didn't happen, effect wouldn't have happened\".\n\nIf I say, \"**Because** I took Franklin St to the party and there ended up being an accident there, I was late to the party, which led to my missing the opening of gifts.\" Then it's plausible to say, \"if had **not taken** Franklin St., I probably would **not have** missed the opening of gifts\".\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True"
      ],
      "features": [
        "Causal Chains"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 3
    },
    "week": 2,
    "order_in_week": 10,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-11-assumption-family-easier-set-3",
    "title": "Assumption Family (Easier) Set 3",
    "category": "Process",
    "estimated_minutes": 70,
    "question_count": 8,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Argue the Anti-Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In the **Assumption Family**,  \nStep 1, find the author's Conclusion and Supporting Idea(s).  \nStep 2, depends ... which type of question are you doing?\n\n## Sufficient / Necessary Assumption, or Principle-Strengthen?\n\nStart by thinking about the **Internal Logic** of the argument.\n\n- \"If Premise, Then Conclusion\" linking ideas.\n- If there's a _New Concept in Conclusion_, make the author define that term. What idea from the evidence is she connecting it to?\n- Is there an _Untriggered Conditional_ idea in the evidence?\n- Do two premises have an overlapping concept? Can we synthesize them?\n- \"in-the-box\" correct answers, re-using language from argument\n\n## Strengthen, Weaken, Flaw or Evaluate?\n\nBe the Opposing Lawyer, and engage in **Courtroom Debate**.\n\n- Look for hints at Comparative or Causal reasoning.\n- If the author is arguing by Comparison, we have to try to weaken the comparison by making two things seem unfair to compare, or by adding a new consideration to the pros and cons balance sheet.\n- If the author is presenting a Curious Fact and then concluding something that implies a causal explanation, think about Alternate Explanations, or ways to better assess the Author's Explanation.\n- Is the author engaging in any illegal argument moves (famous flaws)?\n\nRemember, these are just **tendencies**. This is like reading the scouting report on an athlete, and knowing they _prefer_ to go to their right. We hedge that way, but we're still willing to use either style of thinking on any question type.",
      "right_md": "# Try these 8 questions, untimed\n\nThink about how our thinking shifts from _Internal Logic_ to _Courtroom Debate_, based on the question type.\n\nWhen you're trying **Sufficient Assumption, Necessary Assumption**, or **Principle-Strengthen** questions, think to yourself that when you combine the correct answer with the existing premises you can derive, or come much closer to deriving, the conclusion.\n\nIf the conclusion is trying to prove that \"A is Z\", then we need two basic things:\n\n- a rule that has an outcome of Z, like \"If X, then Z\".\n- facts telling us that A triggers this rule, like \"A is X\".\n\nWhen you're trying **Strengthen, Weaken**, or **Evaluate**, try to respond to the argument as though you're Opposing Counsel. Even though you accept that the Prosecution's evidence is true, how could you make it seem irrelevant, less trustworthy, or less important than some other consideration?\n\nThink about the argument in one (or more) of these ways.\n\n- **Given** [this evidence], **How can I still argue** [the anti-conclusion] ?\n- **Even though** [evidence] is true, [conclusion] **is wrong because ...**\n- **Given that I want to argue** [anti-conclusion], **how can I respond to** [author's evidence / logic]?\n\nWhen you're doing **Flaw**, add onto that list, \"Is this author committing any of the **famous flaws**?\"\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Missing Link / Idea",
        "Argue the Anti-Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 8
    },
    "week": 2,
    "order_in_week": 11,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-12-missing-links-color-coded",
    "title": "Missing Links (color-coded)",
    "category": "Patterns",
    "estimated_minutes": 70,
    "question_count": 9,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Links Between Premises"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Continue",
    "instruction_card": {
      "left_md": "A lot of missing links and inferences rely on **common terms**.\n\nConsider this argument:  \n_Rex's painting uses bold colors. Artists are usually hiding the fact that their painting expresses no deep ideas if they use bold colors. Thus, Rex is probably ashamed of his painting._\n\nSeveral ideas were mentioned twice:\n\n- Rex's painting\n- bold colors\n\nThere was also a frequency modifier mentioned twice:\n\n- usually / probably\n\nA couple ideas were mentioned only once:\n\n- hiding the fact that the painting expresses no deep ideas\n- ashamed\n\nThe missing link in this argument is,  \n\"If an artist is hiding that their painting expresses no deep ideas, then they will be ashamed\".\n\nWhen we're searching for Missing Links, a good rule of thumb (though of course there are always exceptions) is **Mentioned Twice? That'll Suffice.**\n\nWhat that stupid slogan means is that the missing link is between buzzwords or phrases that only showed up once. The stuff that's said twice isn't going to be in our correct answer.",
      "right_md": "# Try these 9 problems, untimed.\n\n- Consider using the notepad window to cover up the answers, until you've typed a prediction.\n\n- You can also try using the highlighter and underline tools to mark off things that are mentioned twice. If you see \"Rex's painting\" mentioned twice in the paragraph, grab a highlighter and color both of those the same color. Once you've color-coded all the stuff mentioned twice, you know that the missing link exists between what remains.\n\n### Embedded image note\n\nThe screenshot includes an embedded example image showing the notepad window covering the answer choices. Preserve support for this visual if the guided drill instruction-card system can attach images.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen"
      ],
      "features": [
        "Missing Link / Idea",
        "Links Between Premises"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 9
    },
    "week": 2,
    "order_in_week": 12,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-13-principle-conform-first-taste",
    "title": "Principle-Conform - (First Taste)",
    "category": "Process",
    "estimated_minutes": 24,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Principle-Conform"
    ],
    "question_features": [
      "Principles in Answers"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "There are three varieties of **Principle-Conform**\n\n- The stimulus is a principle (or pair of principles)\n- The answers are principles\n- There are no explicit principles, just implied/illustrated ones\n\nIn this set, we have\n\n- 3 Principles in Stimulus\n- 2 Principles in Answers\n- 1 Implicit Principle\n\n## Principles in Stimulus\n\nWhen the stimulus is providing an explicit principle (or two), we're usually being tested on our ability to apply a conditional rule.\n\nTo find an answer that Conforms to this principle, we want an answer where the situation described matches the Trigger of the principle, and the judgment concluded matches the Outcome of the principle. (Even when the principles aren't expressed as conditionals, there will still usually be two things we need to make sure match up).\n\n## Principles in Answers\n\nIt's essentially the same mindset as a Principle-Strengthen question. We read the argument and then anticipate the principle underlying the argument by pre-phrasing \"IF evidence, THEN conclusion\". We expect the correct answer to _Link_ language from the Evidence to the Conclusion's language. All that's different is that because the question stem says _conform_ to the author's reasoning, we can't pick an answer that's overly strong. (That usually doesn't matter, but occasionally it does)\n\n## Implicit Principles\n\nThese feel similar to Parallel reasoning questions, because we're given an argument in the stimulus, and then each answer choice is its own argument on its own unique topic. We're looking for an underlying similarity to connect the correct answer to the original argument.\n\nOn Parallel questions, those similarities come more in the form of technical / structural similarities (i.e. \"Since the original argument had a _Most_ premise and a _Some_ premise, the correct answer's argument will also have those features\").\n\nBut with Principle-Conform it's more about the underlying gist or rule-of-thumb. We don't try to diagram the arguments. We just want to articulate a general moral to the story or operating principle that's guiding the author's thinking, and then we try to find an answer that matches that.",
      "right_md": "# Try these six questions, untimed\n\nPrinciple questions are all about matching language in the answer to language in the original.\n\nWhen we're dealing with Conditionals, then the trigger of the conditional should match the Evidence and the outcome of the conditional should match the Conclusion.\n\nIf we're dealing with an implicit principle or a non-binary principle (i.e. \"it's important to balance work time and family time\"), then it's not quite as cut and dry. We can get a little more gist-y and holistic with our thinking.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Conform"
      ],
      "features": [
        "Principles in Answers"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 2,
    "order_in_week": 13,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-14-principle-strengthen-first-taste",
    "title": "Principle-Strengthen - (First Taste)",
    "category": "Process",
    "estimated_minutes": 26,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Principle-Strengthen"
    ],
    "question_features": [
      "Principles in Answers",
      "Conditional Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Principle-Strengthen\n\nAll of these examples are the much-more common style of Principle-Strengthen in which the _answers_ are principles. They often feel more like **Sufficient Assumption** than Strengthen, because the correct answer is usually a conditional rule that is triggered by the Evidence and results in the Conclusion.\n\nBut the question stem is technically a Strengthen task (which answer _most justifies_), so we're not supposed to ask ourselves, \"Does this answer prove the conclusion\", even though in many cases it will. In some cases, the correct answer could be as weakly worded as a Necessary Assumption. We're picking the one that most-strengthens, so something that weakly strengthens can still win against a lot of irrelevant or weakening answers.\n\nNevertheless, our primary approach to these is to expect a conditional logic answer, so we pre-phrase by articulating an \"IF premise, THEN conclusion\" reasoning move.\n\nMost of the answers will be conditionals. If so, we want to be very **stubborn with the outcome**. The right side of the rule should match the conclusion (or at least sound like wording that would strongly support the conclusion). We want to be **flexible with the trigger**.\n\nOther answers feel more like comparative ideas that help _Weigh Tradeoffs_ or establish priorities. When arguments seem to be balancing competing ideas (a pro and a con / this obligation with that obligation), then when the author issues her judgment in the conclusion, she's revealing whether she cares more about the good thing or the bad thing, whether she cares more about this obligation or that obligation.\n\nGiven this argument, we'd anticipate a conditional answer  \n_Billy lied to our customers. Thus he shouldn't be on our staff anymore._\n\n(A) A person can be on the staff only if they are consistently truthful with customers\n\nGiven this argument, we might see a weighing-tradeoffs answer  \n_Billy is extremely dependable, although she lied to our customers. Clearly, she shouldn't be on our staff._\n\n(A) Dependability is a less important trait in a staff member than is honesty.",
      "right_md": "# Try these 4 problems, untimed\n\n- Once you find the Conclusion and identify the main Supporting Idea(s), you will generally want to articulate an, \"If [premise], then [conclusion]\" linking idea.\n\n- If, otherwise, you felt like the argument was grappling with competing interests, then articulate how the author is weighing tradeoffs: \"she cares more about X than about Y\".\n\n- Try to get rid of a lot answers quickly because they don't have any good matching language for the conclusion, or because the matching language for the conclusion is being put on the **left** of the conditional arrow.\n\n- Correct answers will often, if not usually, be written in contrapositive form, so be willing to try that move. If you read \"should be on staff only if consistently truthful\", then you have to make your brain say, \"Okay, this is saying _if you're **not** consistently truthful, should **not** on staff_\".\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Principle-Strengthen"
      ],
      "features": [
        "Principles in Answers",
        "Conditional Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 4
    },
    "week": 2,
    "order_in_week": 14,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w2-15-strengthen-first-taste",
    "title": "Strengthen - (First Taste)",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Strengthen"
    ],
    "question_features": [
      "Plausibility",
      "Missing Link / Idea"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Try this tough set of Strengthen questions\n\nfrom tests 71 and 73 (140 and 141)\n\n**Strengthen** and **Weaken** questions feature mainly Causal and Comparative reasoning structures.\n\nThe correct answer to **Strengthen** will help the author's argument in one of these ways:\n\n- affirming an assumption\n- countering a possible objection\n- improving the trustworthiness, relevance, or logical force of the existing evidence\n- offering a new consideration beyond the existing evidence that makes it more plausible that the Conclusion is a true claim",
      "right_md": "# Attempt these 6 questions, untimed\n\nAsk yourself of every wrong answer, \"Why is it wrong?\"\n\n- Does it Weaken?\n- Does it have No Impact?\n- Does it have Unclear Impact?\n- Is it irrelevant when it comes to assessing whether the conclusion is true or false?"
    },
    "bank_filter": {
      "qtypes": [
        "Strengthen"
      ],
      "features": [
        "Plausibility",
        "Missing Link / Idea"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 2,
    "order_in_week": 15,
    "source_file": "week_2_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-01-except-first-taste",
    "title": "EXCEPT - First Taste",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Paradox",
      "Strengthen",
      "Most Strongly Supported"
    ],
    "question_features": [
      "EXCEPT"
    ],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "A common misconception about **EXCEPT** questions is that the correct answer will be the **opposite** of what the other four do. Like if we were doing a Strengthen-EXCEPT question, a lot of times students are looking for \"the one that Weakens\".\n\nBut even though that will be true sometimes, the task is only asking us to pick something that \"doesn't Strengthen\", so the correct answer will either Weaken or (more commonly) will be Neutral with no impact.",
      "right_md": "# Try these 5 Except questions, untimed\n\nThey're a mix of Paradox, Strengthen, and Most Supported, which are the question types where EXCEPT most commonly occurs as a Feature.\n\nThese question types are all closely related, because they force us to consider novel ideas and judge what impact, if any, those ideas have. On an EXCEPT variation of these tasks, it's common to get down to two answer choices at which point the one that seems relevant often isn't (it's the correct answer). And the one that seems weirdly different still does its job, but not in the same way the other three eliminated answers did their job.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox",
        "Strengthen",
        "Most Strongly Supported"
      ],
      "features": [
        "EXCEPT"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 5
    },
    "week": 3,
    "order_in_week": 1,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-02-anti-causal-set-1",
    "title": "Anti-Causal - Set 1",
    "category": "Patterns",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Weaken",
      "Flaw",
      "Strengthen"
    ],
    "question_features": [
      "Anti-Causal"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Anti-Causal** arguments attempt to argue that \"X makes no difference / X doesn't help.\"\n\nThe evidence is that things seem to be the same, or worse, without X, or that X wouldn't seem to have anything to do with what really matters.\n\n# EXAMPLES\n\nSome people add a mindfulness regimen to their LSAT studying. But since mindfulness is primarily used to reduce anxiety and Ann suffered from no anxiety, the mindfulness regimen probably wouldn't do anything for Ann.\n\nThe companies that are guilty of the most egregious environmental violations are also the companies that are most scrutinized by environmental regulators. This just goes to show the futility of trying to stop companies from damaging the environment with regulatory oversight.\n\n## OBJECTION - would have been even worse without\n\nif the environmental regulators _weren't_ on top of these offending companies, the companies' behavior would be even worse. The fact that these companies have the most oversight doesn't mean that oversight does nothing to help; we will always direct more of our Solution Efforts to the Biggest Source of a problem. That will always leave someone able to disingenuously argue, \"See? The solution efforts don't work. In the places where we have most solution efforts, we have biggest incidence of problem.\"\n\n## OBJECTION - overlooked consideration\n\neven though it looks like mindfulness wouldn't help Ann because she doesn't suffer from anxiety, a mindfulness regimen may still help her, since regular mindfulness breathing changes the gray matter in our brains in ways that boost retention while learning ... _this is true, by the way_",
      "right_md": "# Try these five questions, untimed.\n\nThink about what wording in the Conclusion makes it feel like the author is _denying_ a causal connection between two things.\n\nThink about possible objections just as\n\n- would have been even worse without\n- biggest source of problem usually gets most solution-effort\n- different initial reference points (not fair to compare)\n- overlooked consideration that shows how there _could_ be a causal relationship\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Weaken",
        "Flaw",
        "Strengthen"
      ],
      "features": [
        "Anti-Causal"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 5
    },
    "week": 3,
    "order_in_week": 2,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-03-explain-curious-fact-easier-set-1",
    "title": "Explain Curious Fact (Easier) Set 1",
    "category": "Process",
    "estimated_minutes": 46,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "These arguments involve conclusions that express or assume  \na **causal explanation for a curious fact.**\n\nThere are a handful of different question types here, but they all have a common theme:\n\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact.\n\n- The correct answer will either deal with **Alternate Explanations** for the curious fact or with the **plausibility of the Author's Explanation**.",
      "right_md": "# Try these 6 questions untimed,\n\nwhile rehearsing these steps:\n\n## What is the Curious Fact?\n\n- what language tips us off? is there an _Asymmetric Comparison?_\n- ask yourself the Curious Fact: \"Why is it that ... [curious fact]?\"\n\n## What is the Author's Explanation / Hypothesis?\n\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\n## Does the correct answer deal with an Alternate Explanation?\n\n- Is it dealing with the idea of _Reverse Causality?_\n- Is it dealing with the idea of a _Third Factor?_\n\nOr does it address the **plausibility** of the Author's Explanation?\n\n- Is it addressing plausibility via covariation? (strengthening by No Cause / No Effect, or More Cause / More Effect data points or weakening by Cause without Effect, or Effect without Cause data points)\n- Or is it addressing plausibility some other way? (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 3,
    "order_in_week": 3,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-04-analogies-set-1",
    "title": "Analogies (set 1)",
    "category": "Patterns",
    "estimated_minutes": 40,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Must Be True",
      "Most Strongly Supported"
    ],
    "question_features": [
      "Analogies"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Analogies** are two _specific_ cases that share some _general_ trait or relationship.\n\n# TRY THIS\n\n\"Kittens are to cats, what puppies are to ______.\"\n\nYou know the answer is _dogs_ because puppies and dogs have the same general relationship that kittens and cats have (youth vs. adult). They are analogous on at least one level.\n\nBecause we, as law students, will be tasked with reading judges' opinions and digesting their full meaning, LSAC wants to test us on how well we pick up on implied ideas. We most commonly talk about implied ideas with the word Assumption (unstated, but implied ideas in an argument). But we can also talk about implied ideas in the sense of Inference (Must Be True / Most Supported), because inferences are _implications / consequences / conclusions_ that can be drawn from the information.\n\nAnd we can talk about implied ideas when it comes to **Completing Analogies**. The structural signpost of an analogy instructs the reader to **carry through** a trait or relationship that was described in the 1st case over to the 2nd case.",
      "right_md": "# Try these 6 questions untimed,\n\nthinking through the analogies.\n\n- What are the two separate cases?\n- What is the common trait?\n- What language cues exist to telegraph that the author is making a Comparison / Analogy?\n- Do the two cases seem \"fair to compare\" or do you think there could be an important difference between the two cases that calls into question the implied similarity?\n\n# EXAMPLE\n\nAn NFL quarterback is the leader of his team, responsible for organizing and inspiring his teammates, all within a very high pressured environment. Similarly, the President is the leader of the Executive Branch and all its staff, and so she too ______.\n\nThe test would be expecting us to **carry through** the traits we heard about quarterbacks.\n\n_so she too ..._  \n(A) must provide oversight to her staff and motivate them, while managing very stressful situations.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Must Be True",
        "Most Strongly Supported"
      ],
      "features": [
        "Analogies"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 3,
    "order_in_week": 4,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-05-break-the-comparison",
    "title": "Break the Comparison!",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Flaw",
      "Weaken",
      "Necessary Assumption",
      "Strengthen"
    ],
    "question_features": [
      "Assumes Difference",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In the world of **Comparisons**, there are several recurring assumptions:\n\n- What's true in this timeframe is true in that timeframe\n- What is true today will be true in the future.\n- What was true for this thing / this group / this person, will also be true for that thing / that group / that person.\n\nWhen authors lean on Comparisons like this, they are **assuming similarities**. We can Weaken these arguments by **pointing out salient differences** or we can Strengthen these arguments by providing more similarities, affirming the assumed similarity, or ruling out some crucial dissimilarity.",
      "right_md": "# Try these 8 questions, untimed.\n\nFocus on the comparisons being made. The author will be assuming that two timeframes, or two groups, or two situations, or two subjects are fair to compare.\n\nOur job, on **Flaw** and **Weaken** questions, is to think of some important difference that makes them unfair to compare, that \"breaks the comparison\".\n\nOur job, on **Necessary Assumption** and **Strengthen**, is to provide similarities or rule out these potentially important differences.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw",
        "Weaken",
        "Necessary Assumption",
        "Strengthen"
      ],
      "features": [
        "Assumes Difference",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 8
    },
    "week": 3,
    "order_in_week": 5,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-06-agree-disagree-set-1",
    "title": "Agree/Disagree - Set 1",
    "category": "Pacing",
    "estimated_minutes": 60,
    "question_count": 8,
    "difficulty_min": 2,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Agree/Disagree"
    ],
    "question_features": [
      "2-Speaker",
      "Battle of Opinions"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "TYPE: **Agree / Disagree**  \nLENGTH: 8 q's, 12 mins (1.5x = 18, 2x = 24)  \nTESTS: 65, 71, J07  \nLEVEL: 2, 3, 4\n\nTry these problems under timed conditions, selecting answers, but not confirming them. Once the timer goes off, go back through the questions untimed to finalize your thinking before confirming your answers.",
      "right_md": "- **Read each person's statements**  \n  (don't worry about finding conclusion vs. support)\n\n- After you've read each person's paragraph, go back and **revisit each claim the 1st person made.**\n\n- For each claim, ask yourself if the **2nd person agreed / disagreed / we don't know.**\n\n- If there aren't any explicit claims that the 2nd person is agreeing / disagreeing with, then ask yourself whether the 1st person is assuming anything the 2nd person would agree/disagree with.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Agree/Disagree"
      ],
      "features": [
        "2-Speaker",
        "Battle of Opinions"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 4,
      "count": 8
    },
    "week": 3,
    "order_in_week": 6,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-07-rebuttal-conclusions",
    "title": "Rebuttal Conclusions",
    "category": "Patterns",
    "estimated_minutes": 30,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Main Conclusion"
    ],
    "question_features": [
      "Rebuttals"
    ],
    "reasoning_types": [],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "When we do **Main Conclusion** questions, we expect LSAT to avoid putting the conclusion in its most obvious place (the final claim). We also expect them to avoid using obvious conclusion indicators (like therefore, thus, hence, so).\n\nInstead, we expect the conclusion to usually either be the **first claim** or be some **rebuttal**, typically introduced with Pivot words like but, however, yet.\n\nRebuttal conclusions usually have some sort of pronoun or referential language -- e.g. \"But _this plan_ would be likely to fail\", \"However _her conclusion_ is misguided\". We need to replace those pronouns / referential ideas in a conclusion with the actual ideas they may back to.",
      "right_md": "Try these four **Main Conclusion** questions, all of which involve arguments with rebuttal conclusions.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Main Conclusion"
      ],
      "features": [
        "Rebuttals"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 4
    },
    "week": 3,
    "order_in_week": 7,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-08-describing-arguments-set-1",
    "title": "Describing Arguments (set 1)",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Role",
      "Method of Reasoning",
      "Main Conclusion"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Role and Main Conclusion\n\nThese questions frequently \"hide\" the conclusion by making it the **very first claim**, or by making it some **rebuttal claim**.\n\n**Opinion** indicators (should, probably, ought to) and **Pivot** indicators (but, yet, however) are very helpful for understanding which claims we should assign to which roles in the argument.\n\n**Arguments** need a claim we call the **Conclusion**, and some **Support** for that claim, which we call the evidence or the premise(s).\n\nSome of those supporting premises can themselves also be considered conclusions, if they are supported by at least one claim. Another name for one of these _supported premises_ is an Intermediate Conclusion, or a Subsidiary Conclusion.\n\nAny time you're asking yourself, \"Is this claim a Conclusion?\", you should ask yourself \"_why should I believe this claim?_\" If it's really a Conclusion, then you'll be able to point to at least one claim that sounds like a reason why you should believe that claim.\n\nIf a claim **has** support, we can call it a Conclusion.  \nIf it **provides** support, we can call it a Premise.  \nIf it **has** support and also **provides** support, an Intermediate Conclusion.",
      "right_md": "Length -- **5 questions, 8 mins**  \nTypes -- Role and Main Conclusion  \nTests -- 72  \nLevels -- 1, 2\n\n- Try to answer all 5 questions in 9 minutes.\n- Flag a problem every time you feel less confident in your answer or feel like you struggled to get there.\n- Click on the answer you're selecting, but don't hit Confirm.\n- When the timer goes off, flip back through the questions and take a second look, hit confirm, and check out the Explanation (if there is one).\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Method of Reasoning",
        "Main Conclusion"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 5
    },
    "week": 3,
    "order_in_week": 8,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-09-assumption-family-easier-set-4",
    "title": "Assumption Family (Easier) Set 4",
    "category": "Process",
    "estimated_minutes": 56,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Conform",
      "Flaw",
      "Strengthen",
      "Weaken",
      "Evaluate"
    ],
    "question_features": [
      "Missing Link / Idea",
      "Argue the Anti-Conclusion"
    ],
    "reasoning_types": [
      "Conditional Logic",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "In the **Assumption Family**, we're usually doing one of two things:\n\n**Internal Logic** reading arguments for the sake of noticing missing facts or missing links in the internal logic of the argument / looking for conditional rules in the answer choices, or evaluating whether a conditional rule presented in the evidence is being clearly triggered. When we're Weakening the idea math of an argument, we're showing how the Evidence is compatible with the Anti-Conclusion.\n\n**Courtroom Debate** reading arguments and then thinking, \"**GIVEN THAT this evidence is true, HOW COULD WE STILL ARGUE the conclusion is wrong?**\" What new/external considerations haven't yet been considered? What possible objections could we make? Could there be some alternate explanation for a curious fact? Could there be some crucial difference between two things being treated similarly? Is there something sketchy about the author's evidence or her reasoning?\n\nHow do we know which one we're doing? We don't, really.\n\n**Sufficient Assumption, Necessary Assumption**, and **Principle** skew way more towards Internal Logic.\n\n**Flaw, Strengthen, Weaken**, and **Evaluate** are more likely to test our ability to think of potential objections like we're engaged in Courtroom Debate.",
      "right_md": "# Try these 6 questions, untimed.\n\nShift your thinking from **Idea Math** to **Courtroom Debate**, based on the question type.\n\nWhen you're trying **Sufficient Assumption, Necessary Assumption**, or **Principle** questions, think to yourself that when you combine the correct answer with the existing premises you can derive, or come much closer to deriving, the conclusion.\n\nIf the conclusion is trying to prove that \"A is Z\", then we need two basic things:\n\n- a rule that allows us to derive Z, like \"If X, then Z\".\n- info telling us that A matches that trigger, like \"A is X\".\n\nWhen you're trying **Flaw, Strengthen, Weaken**, or **Evaluate**, try to respond to the argument as though you're Opposing Counsel. Even though you accept that the Prosecution's evidence is true, how could you make it seem irrelevant, less trustworthy, or less important than some other consideration.\n\nThink about the argument in one (or more) of these ways.\n\n- GIVEN [this evidence],  \n  HOW COULD I ARGUE [the anti-conclusion] ?\n\n- EVEN THOUGH [evidence] is true,  \n  [anti-conclusion] could still be true, BECAUSE ...\n\n- GIVEN THAT [I'm arguing the anti-conclusion],  \n  HOW CAN I RESPOND TO [the author's evidence / logic]\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Conform",
        "Flaw",
        "Strengthen",
        "Weaken",
        "Evaluate"
      ],
      "features": [
        "Missing Link / Idea",
        "Argue the Anti-Conclusion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 6
    },
    "week": 3,
    "order_in_week": 9,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-10-fill-in-the-blank-logical-completion-first-taste",
    "title": "Fill in the Blank (Logical Completion) - First Taste",
    "category": "Pacing",
    "estimated_minutes": 40,
    "question_count": 4,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported"
    ],
    "question_features": [
      "Logical Completion"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "# Fill in the Blank\n\nalso known as Logical Completion\n\nMost of the time, the blank is prefaced by a Conclusion indicator (so, thus, therefore, hence), and so we're trying to pick the most logical conclusion, which really means we're doing a **Most Supported** question.\n\nSometimes, the blank is prefaced by a Support indicator (because, since), which means we're either doing a Strengthen question, if we're supporting a Conclusion, or we're doing a Paradox question, if we're supporting a surprising claim that goes against the background facts.",
      "right_md": "**Length:** 4 q's, 6 mins  \n**Type:** Fill in the Blank (Most Supported + Logical Completion)  \n**Tests:** 71 and 73 (140 and 141)\n\n1. Set a timer for **6 mins** (1.5x = 9 mins, 2x = 12 mins)\n2. Force yourself to get an answer to all 4 of these problems within the time limit.\n3. Flag any of them that feel like a struggle or a low-confidence guess.\n4. When the timer goes off, go through them and revisit your thinking in an untimed way, before then hitting SHOW ATTEMPT and looking at the explanation.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported"
      ],
      "features": [
        "Logical Completion"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 4
    },
    "week": 3,
    "order_in_week": 10,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-11-complete-the-analogy-set-1",
    "title": "Complete the Analogy (set 1)",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported"
    ],
    "question_features": [
      "Analogies"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Analogies** are two _specific_ cases that share some _general_ trait or relationship.\n\n# TRY THIS:\n\n\"Kittens are to cats, what puppies are to _____.\"\n\nYou know the answer is _dogs_ because puppies and dogs have the same general relationship that kittens and cats have (youth vs. adult). They are analogous on at least one level.\n\nBecause we, as law students, will be tasked with reading judges' opinions and digesting their full meaning, LSAC wants to test us on how well we pick up on implied ideas. We most commonly talk about implied ideas with the word Assumption (unstated, but implied ideas in an argument). But we can also talk about implied ideas in the sense of Inference (Must Be True / Most Supported), because inferences are _implications / consequences / conclusions_ that can be drawn from the information. And we can talk about implied ideas when it comes to **Completing Analogies**.\n\nA lot of Fill in the Blank questions are testing our ability to Complete the Analogy. The structural signpost of an analogy instructs the reader to **carry through** a trait or relationship that was described in the 1st case over to the 2nd case.",
      "right_md": "# Try these 5 questions\n\nFill in the Blanks, from test 65, 71, and June 2007\n\n- What are the two separate cases?\n- What is the common principle?\n- What language cues exist to telegraph that the author is making a Comparison / Analogy?\n\n# EXAMPLE\n\nAn NFL quarterback is the leader of his team, responsible for organizing and inspiring his teammates, all within a very high pressured environment. Similarly, the President is the leader of the Executive Branch and all its staff, and so she too ______.\n\nThe test would be expecting us to **carry through** the traits we heard about quarterbacks.\n\n_so she too ...._  \n(A) must provide oversight to her staff and motivate them, while managing very stressful situations.\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported"
      ],
      "features": [
        "Analogies"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 5
    },
    "week": 3,
    "order_in_week": 11,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-12-conditional-logic-easier-set-2",
    "title": "Conditional Logic (Easier) Set 2",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 7,
    "difficulty_min": 2,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Most Strongly Supported",
      "Must Be True",
      "Sufficient Assumption",
      "Parallel Reasoning",
      "Parallel",
      "Parallel method of reasoning",
      "Parallel Method of Reasoning",
      "Parallel method of reasoning (Parallel)",
      "Parallel Reasoning: Complete Argument",
      "Parallel Reasoning: Questionable",
      "Parallel Flaw",
      "Parallel flawed method of reasoning",
      "Flawed Parallel Reasoning",
      "Parallel flawed method of reasoning (Parallel, Flaw)",
      "Principle-Strengthen",
      "Principle-Conform",
      "Flaw"
    ],
    "question_features": [
      "Conditional Diagramming"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "Focus on finding **Conditional Indicator** words and using them as a way to organize how you write the **If / Then** rule.\n\nWrite or think through the contrapositive as well. Beware the temptation to make illegal Backwards or Opposite moves.\n\nThe LR question types that most often would prompt us to consider diagramming the Conditional Logic are\n\n- Must Be True\n- Most Supported\n- Assumption (mostly Sufficient, but some Necessary)\n- Parallel / Parallel Flaw\n- Principle-Strengthen\n- Principle-Conform",
      "right_md": "Try these 7 problems featuring **conditional logic**  \nlevels 2 and 3\n\nTry them all within 12 minutes, then circle back and confirm your thinking (untimed) before checking the answer / explanation.\n\n- **Principle-Strengthen w/ Principle in Stimulus** (diagram these conditionals, because each answer is testing us on whether we have an argument that establishes the left side of a rule and concludes the right side of a rule)\n\n- **Parallel** (usually diagram these arguments in the abstract, using generic variables like A, B, C. The more specific we are with seeing the abstract recipe, the more picky and decisive we can be with answers.)\n\n- **Assumption** (the conclusion gives us an A --> Z logic path we want to prove, and the evidence + the correct answer choice assemble together to create that A --> Z path)\n\n- **Must Be True / Most Supported** (if there are multiple conditionals, they will often chain together. otherwise, a fact provided will trigger the contrapositive of a conditional)\n\n- **Flaw / Parallel Flaw** (Flaw + Conditional Logic usually means the **Necessary vs. Sufficient** flaw, which is using a rule in an illegal Backwards or Opposite fashion. Sometimes it involves messing up Or / And stuff)\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Most Strongly Supported",
        "Must Be True",
        "Sufficient Assumption",
        "Parallel Reasoning",
        "Parallel",
        "Parallel method of reasoning",
        "Parallel Method of Reasoning",
        "Parallel method of reasoning (Parallel)",
        "Parallel Reasoning: Complete Argument",
        "Parallel Reasoning: Questionable",
        "Parallel Flaw",
        "Parallel flawed method of reasoning",
        "Flawed Parallel Reasoning",
        "Parallel flawed method of reasoning (Parallel, Flaw)",
        "Principle-Strengthen",
        "Principle-Conform",
        "Flaw"
      ],
      "features": [
        "Conditional Diagramming"
      ],
      "reasoning_types": [],
      "difficulty_min": 2,
      "difficulty_max": 3,
      "count": 7
    },
    "week": 3,
    "order_in_week": 12,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-13-weaken-comparison",
    "title": "Weaken + Comparison",
    "category": "Process",
    "estimated_minutes": 50,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 4,
    "level": null,
    "question_types": [
      "Weaken"
    ],
    "question_features": [
      "Assumes Difference",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Weaken** questions intersect with comparisons in a handful of common ways:\n\n- If the author is concluding some sort of _Plan / Recommendation_, then we end up comparing our current world to the world in which we follow the author's advice. Since she is telling us this advice will work out _better_, either overall or in some specific sense, our job in being skeptical is to think about _what else_ could be different in the world where we follow the author's advice, that could go against the result the author promised.\n\n- If the author is comparing two things and seeming to favor one over the other, then we need to consider a full comparison of all the advantages and disadvantages of each thing (_Net Gain / Loss_). If the author concludes that X is better than Y, then we can weaken with bad stuff about X or good stuff about Y.\n\n- If the author is assuming that \"what was true in the past will be true in the present\" or assuming that \"what is currently true will be true in the future\", then we can weaken those arguments by looking for something important that's different between the past and the present or between the present trends and the future.\n\n- If the author is trying to explain a difference between two groups / situations, then the test will often have a correct answer that presents some **other difference** between the two things that could be an Alternate Explanation.",
      "right_md": "# Try these 6 problems, untimed\n\nFocus on whether the problem seems to be dealing with\n\n- a plan / recommendation\n- preferring one option over another\n- assuming similarities between different timeframes\n- offering a causal explanation for a difference between two groups or situations\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Weaken"
      ],
      "features": [
        "Assumes Difference",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 4,
      "count": 6
    },
    "week": 3,
    "order_in_week": 13,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-14-complete-the-analogy-set-2",
    "title": "Complete the Analogy (set 2)",
    "category": "Process",
    "estimated_minutes": 60,
    "question_count": 9,
    "difficulty_min": 1,
    "difficulty_max": 3,
    "level": "beginner",
    "question_types": [
      "Necessary Assumption",
      "Strengthen",
      "Principle-Conform",
      "Most Strongly Supported",
      "Flaw",
      "Weaken"
    ],
    "question_features": [
      "Analogies"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Analogies** are two separate cases that share some trait or relationship.\n\n# Fill in the blank\n\n_\"Baseball is to the World Series,  \nwhat (American) football is to ______.\"_\n\nThe answer is _Superbowl_ because World Series has the same relationship to baseball (season-ending championship) as Superbowl has to football. They're at least partly analogous.\n\nArguments by analogy tend to think, \"Because X and Y are similar when it comes to Thing A, they're probably similar when it comes to Thing B\".\n\n_Thelma and Rodney both like rap from the 90s. I just made this Spotify playlist of 90s rap. Thelma really likes it. Thus, Rodney will really like it too._\n\nThe author has established one similarity \"both like 90s rap\" and is assuming that Thelma and Rodney will also be similar in terms of a second trait, \"liking my Spotify playlist\".\n\nNecessary Assumption / Strengthen / Principle / Most Supported questions will want us to **Complete the Analogy**.\n\nFlaw and Weaken will want us to challenge this analogy by pointing to a potentially **crucial difference** (like maybe Thelma only likes east coast rap, Rodney's only likes west coast, and my playlist totally leaves out west coast rap like Dre, Snoop, Pac, NWA, etc.)",
      "right_md": "# Try these 9 questions untimed,\n\nthinking through the **analogies**.\n\n- What are the two separate cases?\n- What is the common principle?\n- What language cues exist to telegraph that the author is making a Comparison / Analogy?\n- Do the two cases seem \"fair to compare\" or do you think there could be an important difference between the two cases that calls into question the implied similarity.\n\n# EXAMPLE\n\nWhen people start dating each other, it often turns one person off if the other person seems too enthusiastic. Similarly, when students are shopping around for an LSAT tutor, ______.\n\nHow would we **carry through** a trait or relationship from the dating situation to the LSAT tutor situation? Something like,\n\n_students are likely to be more attracted to tutors who don't seem desperate for their business._\n\n---"
    },
    "bank_filter": {
      "qtypes": [
        "Necessary Assumption",
        "Strengthen",
        "Principle-Conform",
        "Most Strongly Supported",
        "Flaw",
        "Weaken"
      ],
      "features": [
        "Analogies"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 3,
      "count": 9
    },
    "week": 3,
    "order_in_week": 14,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w3-15-role-main-conclusion-set-1",
    "title": "Role + Main Conclusion (set 1)",
    "category": "Process",
    "estimated_minutes": 46,
    "question_count": 7,
    "difficulty_min": 1,
    "difficulty_max": 2,
    "level": "beginner",
    "question_types": [
      "Role",
      "Main Conclusion"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "**Role** and **Main Conclusion** questions usually \"hide\" the conclusion by making it the **very first claim**, or by making it some **rebuttal claim**.\n\n**Opinion** indicators (should, probably, ought to) and **Pivot** indicators (but, yet, however) are very helpful for understanding which claims we should assign to which roles in the argument.\n\n**Arguments** need a claim we call the **Conclusion**, and some Support for that claim, which we call the evidence or the premise(s).\n\nSome of those supporting premises can _themselves_ also be considered conclusions, if _they_ are supported by at least one claim. The more common name for a _supported premise_ is an Intermediate Conclusion, or a Subsidiary Conclusion.\n\nAny time you're asking yourself, \"Is this claim a Conclusion?\", you should ask yourself \"_why should I believe this claim? did the author provide a supporting reason?_\" If it's really a Conclusion, then you'll be able to point to at least one claim that sounds like a reason why you should believe that claim.\n\nIf a claim **has** support, we can call it a Conclusion.  \nIf it **provides** support, we can call it a Premise.  \nIf it **has** support and also **provides** support, an Intermediate Conclusion.",
      "right_md": "Length -- **7 questions, 11 mins**  \nType -- Role and Main Conclusion  \nTests -- 50-52  \nLevels -- 1, 2 (and one level 4)\n\n- Try to answer all 7 questions in 11 minutes.  \n  (1.5x = 17 mins, 2x = 22 mins)\n\n- Flag a problem every time you feel less confident in your answer or feel like you struggled to get there.\n\n- Click on the answer you're selecting, but don't hit Confirm.\n\n- When the timer goes off, flip back through the questions and take a second look, hit confirm, and check out the Explanation.\n\nLook out for First Sentence conclusions, Rebuttal conclusions, and Intermediate conclusions on Role and Main Conclusion.\n\nUsually on Role and Main Conclusion, the last claim or two we read is Support. It's very common for the final two ideas to be two premises joined by some continuator like \"and, furthermore\"."
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Main Conclusion"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 2,
      "count": 7
    },
    "week": 3,
    "order_in_week": 15,
    "source_file": "week_3_blue_lr_guided_drills.md"
  },
  {
    "slug": "w10-assumption-family-medium-set-2",
    "title": "Assumption Family (Medium) Set 2",
    "category": "Process",
    "estimated_minutes": 40,
    "question_count": 10,
    "difficulty_min": 3,
    "difficulty_max": 4,
    "level": "intermediate",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen",
      "Strengthen",
      "Weaken",
      "Flaw",
      "Evaluate"
    ],
    "question_features": [
      "Conditional Diagramming",
      "Explain Curious Fact",
      "Assumes Similarity"
    ],
    "reasoning_types": [
      "Causation",
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "All question types in the Assumption Family will sometimes test a mathematical **conditional** **logic** understanding and other times test more \"shades of gray\" thinking like **comparisons** and **causal** explanations. But different question types do have strong tendencies. The graphic below shows an approximate continuum. We expect more formal logical thinking towards the top and more fuzzy real-world conversation towards the bottom.\n**Internal Logic**\nmissing links                 **Sufficient Assumption**\nmissing facts\nrules, definitions             **Principle**\nand vs. or                   (strengthen / conform)\nconditional logic\ntrigger = evidence\noutcome = conclusion          **Necessary Assumption**\nruling out all alternatives\n**Famous Flaws** **Flaw / Parallel Flaw**\n**Courtroom Debate**\nadvantages, disadvantages\nrebuttals\nrecommendations             **Strengthen**\npredictions                 **Weaken**\nhypotheses                **Evaluate**\nsurveys\nexperiments\nstatistics",
      "right_md": "## **Try these 10 problems, untimed.**\n\nThink about shifting your thinking back and forth between different reasoning structures\n\n**conditional** thinking\n- rules, definitions, trigger, outcome, contrapositive\n\n**causal** thinking\n- curious fact / author's explanation\n- alternate explanations (reverse cause / 3rd factor)\n- plausibility of author's explanation (no cause, no effect / effect without cause / cause without effect)\n\n**comparison** thinking\n- pros vs. cons  /  weighing tradeoffs\n- current world vs.  Plan/Prediction world\n- then vs. now  /  now vs. the future\n- this group vs. that group\n- sample vs. general population\n- part vs. whole\n- that situation vs. this situation\n\nAnd when you're doing **Flaw** , also consider the 10 **Famous Flaws.**"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen",
        "Strengthen",
        "Weaken",
        "Flaw",
        "Evaluate"
      ],
      "features": [
        "Conditional Diagramming",
        "Explain Curious Fact",
        "Assumes Similarity"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 4,
      "count": 10
    },
    "week": 10,
    "order_in_week": 6,
    "source_file": "lsatlab-studyplan"
  },
  {
    "slug": "w11-explain-curious-fact-easier-set-2",
    "title": "Explain Curious Fact (Easier) Set 2",
    "category": "Pacing",
    "estimated_minutes": 25,
    "question_count": 6,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": "beginner",
    "question_types": [
      "Paradox"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison",
      "Causation"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "These six questions each involve a \"curious\" background fact, and at least one potential explanation offered for that fact. We call this pattern **Explain Curious Fact**\n\nThere are a handful of different question types here, but they all have a common theme:\n- The **evidence** presents some **Curious Fact** (an asymmetric comparison like a correlation, a statistical change, or a difference between two groups or situations)\n\n- The author's **conclusion** will state or assume one possible **Causal Explanation** for this curious fact.\n\n- The correct answer will either deal with **Alternate Explanations** for the curious fact or with the **plausibility** **of the Author's Explanation** .",
      "right_md": "## **Try these 6 questions in 10 minutes**\n(1.5x = 15 mins, 2x = 20 mins)\n\nWhat is the **Curious Fact** ?****\n- what language tips us off?  is there an _Asymmetric Comparison_ ?\n- _ask_ yourself the Curious Fact:  \"Why is it that ... [curious fact]?\"\n\nWhat is the **Author's Explanation / Hypothesis** _?_\n- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?\n- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.\n\nDoes the correct answer deal with an **Alternate Explanation** ?\n- Is it dealing with the idea of _Reverse Causality_ ?\n- Is it dealing with the idea of a _Third Factor_ ?\n\nOr does it address the **plausibility** of the Author's Explanation?\n- Is it addressing plausibility via covariation? (strengthening by _No Cause / No Effect_ , or _More Cause / More Effect_ data points or weakening by _Cause without Effect_ , or _Effect without Cause_ data points)\n- Or is it addressing plausibility some other way?  (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)"
    },
    "bank_filter": {
      "qtypes": [
        "Paradox"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 11,
    "order_in_week": 5,
    "source_file": "lsatlab-studyplan"
  },
  {
    "slug": "w10-famous-flaws-easier",
    "title": "Famous Flaws (Easier)",
    "category": "Process",
    "estimated_minutes": 25,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 2,
    "level": "beginner",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## **Try 8** **Famous Flaw** **problems**\n**tests:** 127, 129, 130 / **levels:** 1-3\n\nGet better at spotting some famous flaw moves in the argument, and better at spotting some \"decoy\" famous flaws appearing in wrong answer choices.\n\nMany of the answers are not describing famous flaws. Some of the answer choices that are describing famous flaws will sound like the \"classic\" abstract language definition of that flaw, while others will use more unique or specific language to allude to the famous flaw.",
      "right_md": "## Attempt these 8 questions **untimed** , for accuracy\n\nHere's a quick basketball related example for each of the ten main famous flaws.\n\nHere's what to ask yourself if you see an answer choice describing one of these flaws:"
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 2,
      "count": 5
    },
    "week": 10,
    "order_in_week": 7,
    "source_file": "lsatlab-studyplan"
  },
  {
    "slug": "w10-famous-flaws-easier-set-2",
    "title": "Famous Flaws (Easier) Set 2",
    "category": "Pacing",
    "estimated_minutes": 30,
    "question_count": 5,
    "difficulty_min": 1,
    "difficulty_max": 2,
    "level": "beginner",
    "question_types": [
      "Flaw"
    ],
    "question_features": [
      "Famous Flaws"
    ],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## Try 9**** **Famous Flaw** **** problems\n**tests:** 60-64 / **levels:** 1-3\n\nGet better at spotting some famous flaw moves in the argument, and better at spotting some \"decoy\" famous flaws appearing in wrong answer choices.\n\nMany of the answers are not describing famous flaws. Some of the answer choices that are describing famous flaws will sound like the \"classic\" abstract language definition of that flaw, while others will use more unique or specific language to allude to the famous flaw.",
      "right_md": "- Set a timer for **14 mins** (1.5x = 21 mins, 2x = 28 mins)\n\n- Try to get an answer to all 12 of these problems.\n\n- Select your answer, but don't hit Confirm.\n\n- Flag any of them that feel like a struggle or a low-confidence guess.\n\n- When the timer goes off, flip back through them and revisit your thinking in an untimed way, before then hitting Confirm on your final answer.\n\n- Check answers and explanations."
    },
    "bank_filter": {
      "qtypes": [
        "Flaw"
      ],
      "features": [
        "Famous Flaws"
      ],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 2,
      "count": 5
    },
    "week": 10,
    "order_in_week": 8,
    "source_file": "lsatlab-studyplan"
  },
  {
    "slug": "w12-missing-links-set-2",
    "title": "Missing Links Set 2",
    "category": "Process",
    "estimated_minutes": 30,
    "question_count": 6,
    "difficulty_min": 3,
    "difficulty_max": 5,
    "level": "advanced",
    "question_types": [
      "Sufficient Assumption",
      "Necessary Assumption",
      "Principle-Strengthen"
    ],
    "question_features": [
      "Missing Link / Idea"
    ],
    "reasoning_types": [
      "Conditional Logic"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "## These 8 questions test our ability to figure out\n## which fact or link is missing in an argument.\n\nSome of them involve arguments in which there's a _New Concept_ that appears in the conclusion, which means we need to link that new concept to whatever it's being associated with in the evidence.\n\nSome of them involve an attempt to apply a principle such as, \"If A and B are true, then X is true\". The argument ends up concluding X, but it failed to establish all the ingredients in the trigger (in this case, A and B).",
      "right_md": "Try to predict what's missing. Sometimes, your intuition will clearly hear something missing. Other times, you'll need to ask yourself questions in order to find it.\n\n- Which claim is the Conclusion?\n- Is there any wording appearing in the conclusion that never shows up in the evidence?\n- If so, what concept in the evidence is that _New Wording in the Conclusion_ supposed to match up with?\n- Are there any conditional rules or principles provided? If so has the author clearly established that the trigger is true?\n\nAs you review these problems,\n**correct answers -**\ndoes it supply a Missing Link? Was it the contrapositive of your prediction? did it address a Missing Fact that we need to trigger a conditional rule or principle?\n\n**incorrect answers -**\ndoes it have the **Wrong Strength** ?\ndoes it lack some **Needed Idea** (such as a New Idea in the conclusion)\nis it **Irrelevant** for some reason?\nit is an illegal **Reversal / Negation** of the connection we wanted?"
    },
    "bank_filter": {
      "qtypes": [
        "Sufficient Assumption",
        "Necessary Assumption",
        "Principle-Strengthen"
      ],
      "features": [
        "Missing Link / Idea"
      ],
      "reasoning_types": [],
      "difficulty_min": 3,
      "difficulty_max": 5,
      "count": 6
    },
    "week": 12,
    "order_in_week": 5,
    "source_file": "lsatlab-studyplan"
  },
  {
    "slug": "w13-describing-arguments-match-family",
    "title": "Describing Arguments (Match Family)",
    "category": "Process",
    "estimated_minutes": 35,
    "question_count": 10,
    "difficulty_min": 1,
    "difficulty_max": 5,
    "level": null,
    "question_types": [
      "Role",
      "Method of Reasoning",
      "Main Conclusion"
    ],
    "question_features": [],
    "reasoning_types": [
      "Comparison"
    ],
    "start_button_label": "Start",
    "instruction_card": {
      "left_md": "This 10 question set is comprised of three questions from the Match Family, which test our ability to understand what role certain claims are playing:  Role, Method, and Main Conclusion.\n\n## **Role** and **Main Conclusion**\n\nMost questions \"hide\" the conclusion in one of two ways:\n- it's the **very first claim** , or\n- it's attached to some **pivot / rebuttal**\n\n**Opinion** indicators and **Pivot** indicators are very helpful for finding the parts of the argument.\n\nWhen we're assessing whether something is a conclusion (be it main conclusion or intermediate conclusion), we should ask ourselves,\n\n\"**Is this Supported** ? Why should we believe this?\"\nIf no support it provided, then it isn't a conclusion.\n\n## **Method**\n\nThese use a lot of abstract verbiage to describe parts of arguments. We want to not only learn how to read this type of language but also to start to think more in terms of this language. When you're using abstract language, you're speaking about general forms / archetypes, and the magic of getting better at standardized tests is getting better at recognizing the general forms / archetypes that show up a lot on that test.\n\nWe should get used to the most typical types of reasoning moves:\n- **Analogies** / Distinctions\n- Suggesting / Ruling out **Alternatives**\n- **Faulty Implications** of a Claim or Plan",
      "right_md": "Length --  **10 questions, 15 mins** (1.5x = 23, 2x = 30)****\nTypes -- **Role** , **Method** , and **Main Conclusion**\nTests -- **135, 140, and 123**\nLevels -- **1 - 4**\n\n- Whenever you feel pretty low confidence or ambivalent about your guess, hit the FLAG / BOOKMARK icon to the left of the question stem. We want to remember later that we weren't fully convinced of our answer, so that we can think about why not.\n\n- As you review the questions, after you've seen the explanation, type up any takeaways you want remember in the NOTEPAD window (a movable, resizable popup you get by clicking on the icon in the lower left of the page)."
    },
    "bank_filter": {
      "qtypes": [
        "Role",
        "Method of Reasoning",
        "Main Conclusion"
      ],
      "features": [],
      "reasoning_types": [],
      "difficulty_min": 1,
      "difficulty_max": 5,
      "count": 10
    },
    "week": 13,
    "order_in_week": 1,
    "source_file": "lsatlab-studyplan"
  }
] as const;
