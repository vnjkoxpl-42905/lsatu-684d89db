import { DrillItem } from "../types";

// 20 drill items distributed as 5 role, 5 method, 5 flaw, 5 one_word_trap.
//
// drill_1..drill_4 are ported verbatim from the new bootcamp's DRILLS in
// mockData.ts. Items 5-20 are authored from patterns covered by
// `_source/01-methods-of-reasoning-17-types.md` and the trap requirements
// distilled in the Decode Gauntlet (`abstractChoices.ts`).
//
// trapTag taxonomy:
// - wrong_role: confuses premise / intermediate / main conclusion / counter
// - wrong_method: confuses the structural reasoning move
// - structural_mismatch: necessary <-> sufficient flip, sample bias, etc.
// - attractive_language: extreme word, scope shift, or single word that
//   invalidates an otherwise good answer
export const DRILLS: DrillItem[] = [
  {
    id: "drill_1",
    type: "role",
    stimulus:
      "The new highway project will be completed ahead of schedule. After all, the construction crew has been working double shifts for the past three months, and similar projects with this level of effort have reliably finished early.",
    question: "The claim that the construction crew has been working double shifts plays which one of the following roles in the argument?",
    options: [
      { text: "It is the argument's main conclusion.", explanation: "The main conclusion is \"The new highway project will be completed ahead of schedule.\" It is what the author is trying to prove." },
      { text: "It is a premise offered in support of the argument's conclusion.", explanation: "Correct. The claim about double shifts directly supports the conclusion that the project finished early." },
      { text: "It is an intermediate conclusion that supports the main conclusion.", explanation: "An intermediate conclusion requires its own supporting evidence. The shift claim is simply assertive evidence here." },
      { text: "It is a concession to a potential counterargument.", explanation: "A concession would acknowledge an opposing point of view (e.g., \"Although the work was hard...\"). This claim provides direct justification." },
    ],
    correctOptionIndex: 1,
    explanation:
      "The main conclusion is \"The new highway project will be completed ahead of schedule.\" The claim about double shifts is given as evidence (indicated by \"After all\") to support that conclusion. It is not supported by any other statements, making it a pure premise.",
    trapTag: "wrong_role",
  },
  {
    id: "drill_2",
    type: "method",
    stimulus:
      "Manager: We should switch our server hosting provider. Our current provider had an outage last week.\nIT Lead: But our current provider has 99.9% uptime over the last five years, whereas the provider you are suggesting has had four major outages this year alone. It makes no sense to switch.",
    question: "The IT Lead responds to the Manager's argument by doing which one of the following?",
    options: [
      { text: "Providing an alternative explanation for the recent outage.", explanation: "The IT Lead does not explain why the outage happened; they provide counter-evidence to the suggestion to switch." },
      { text: "Pointing out that the opponent failed to take relevant information into account.", explanation: "Correct. The IT Lead introduces server performance data (5-year uptime, the other provider's failures) that the Manager completely ignored." },
      { text: "Deriving a general principle from specific examples.", explanation: "The IT Lead is not trying to find a rule here, they are comparing performance records." },
      { text: "Showing that the opponent's conclusion leads to an impossible result.", explanation: "The IT Lead does not show that switching is logically impossible; they argue it is a bad idea given the data." },
    ],
    correctOptionIndex: 1,
    explanation: "The IT Lead challenges the Manager by introducing new, relevant information (the 5-year uptime and the other provider's poor record) that the Manager overlooked.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_3",
    type: "flaw",
    stimulus: "To be legally allowed to drive, a person must pass a driving test. Sarah passed her driving test yesterday. Therefore, she must now be legally allowed to drive.",
    question: "The reasoning in the argument is flawed because it:",
    options: [
      { text: "Mistakes a temporal relationship between two events for a causal relationship.", explanation: "The argument is not about the order of events; it is about logical requirements." },
      { text: "Presumes, without providing justification, that a condition necessary for an outcome is also sufficient to produce that outcome.", explanation: "Correct. The argument mistakes necessary (must pass test) for sufficient (if she passed test, she must be allowed)." },
      { text: "Relies on an inappropriate analogy between passing a test and legal permission.", explanation: "There is no analogy here; it is a direct, flawed deductive inference." },
      { text: "Attacks the person making a claim rather than the claim itself.", explanation: "There is no personal attack here, only a structural flaw in the reasoning." },
    ],
    correctOptionIndex: 1,
    explanation: "Passing the test is necessary to drive, but it might not be sufficient (she might also need a valid license, insurance, be of a certain age, etc.). The argument treats a requirement as a guarantee.",
    trapTag: "structural_mismatch",
  },
  {
    id: "drill_4",
    type: "one_word_trap",
    stimulus: "Some people argue that reading fiction is a waste of time. But reading fiction builds empathy by exposing readers to different perspectives. Empathy is a crucial skill for navigating social interactions in the workplace.",
    question: "Which of the following describes the role of the claim that reading fiction builds empathy?",
    options: [
      { text: "It is a premise that completely proves the main conclusion that reading fiction is not a waste of time.", explanation: "Wrong. Premises support a conclusion; they rarely completely prove it in a formal sense. This is an overstatement." },
      { text: "It is a premise offered to counter the claim that reading fiction is a waste of time.", explanation: "Correct. The claim builds empathy, which the author uses to argue against the idea that fiction is a waste of time." },
    ],
    correctOptionIndex: 1,
    explanation: "The first option uses the extreme word \"completely proves\". The premise supports the conclusion but does not completely prove it in a formal logic sense. The second option accurately describes its role as countering the first sentence.",
    trapTag: "attractive_language",
  },
  {
    id: "drill_5",
    type: "role",
    stimulus:
      "Critics argue that public funding for the arts is wasteful. But every dollar spent on the arts generates three dollars in tourism revenue for the surrounding city. Cities that fund the arts generously consistently have stronger economies than those that do not. So we should expand, not cut, public arts funding.",
    question: "The claim that cities that fund the arts generously consistently have stronger economies plays which role?",
    options: [
      { text: "It is the main conclusion of the argument.", explanation: "The main conclusion is the final sentence (\"we should expand, not cut, public arts funding\")." },
      { text: "It is an intermediate conclusion supported by the dollar-multiplier claim and used to support the main conclusion.", explanation: "Correct. The dollar-multiplier evidence supports the city-economy claim, which supports the main conclusion." },
      { text: "It is a counterconsideration the argument acknowledges before rejecting.", explanation: "The author is not acknowledging an opposing point here; they are advancing their own evidence chain." },
      { text: "It is a premise that no other statement supports.", explanation: "The previous sentence (\"every dollar generates three dollars\") supports this claim, so it is not an unsupported premise." },
    ],
    correctOptionIndex: 1,
    explanation: "The cities-economy claim is supported by the dollar-multiplier claim and itself supports the recommendation to expand funding. That is the definition of an intermediate conclusion.",
    trapTag: "wrong_role",
  },
  {
    id: "drill_6",
    type: "role",
    stimulus:
      "Although many homeowners worry about flooding, most floods in our region are caused by river overflow, not by rainfall. The new dam project will reduce river overflow by 80% according to engineers. Therefore, the dam will significantly reduce flood damage in our region.",
    question: "The claim that many homeowners worry about flooding plays which role?",
    options: [
      { text: "It is background information that sets context but does not support the main conclusion.", explanation: "Correct. \"Although\" signals a concession or background framing. The flooding worry is not used as evidence." },
      { text: "It is the main conclusion of the argument.", explanation: "The conclusion is about the dam's effect on flood damage." },
      { text: "It is a premise offered in direct support of the conclusion.", explanation: "The claim is bracketed by \"although\" and does not feed into the dam's effectiveness argument." },
      { text: "It is a counterexample to the claim that floods come from river overflow.", explanation: "It does not contradict the river-overflow claim; it just notes homeowner concern." },
    ],
    correctOptionIndex: 0,
    explanation: "\"Although\" introduces a backgrounded acknowledgment. The argument's actual support chain runs through river overflow, dam reduction, and flood damage. Homeowner worry is just framing.",
    trapTag: "wrong_role",
  },
  {
    id: "drill_7",
    type: "role",
    stimulus:
      "Anyone who reads the news regularly knows that political polling is unreliable. Yet news outlets continue to feature polls prominently in their coverage. Because polls drive viewership and viewership drives advertising revenue, news outlets have a strong financial incentive to feature them. So the prominence of polling in news coverage is best explained by economic, not journalistic, considerations.",
    question: "The claim that polls drive viewership plays which role?",
    options: [
      { text: "It is a premise offered in support of the claim that news outlets have a financial incentive.", explanation: "Correct. \"Polls drive viewership\" plus \"viewership drives advertising revenue\" supports the financial-incentive claim, which supports the main conclusion." },
      { text: "It is the main conclusion of the argument.", explanation: "The main conclusion is about the economic explanation for poll prominence." },
      { text: "It is a counterexample to the claim that polling is unreliable.", explanation: "The claim does not bear on polling reliability." },
      { text: "It is a generalization that the argument later rejects.", explanation: "The argument uses, not rejects, this claim." },
    ],
    correctOptionIndex: 0,
    explanation: "The polls-drive-viewership claim is a premise inside the support chain that ends at the main conclusion. It is not supported by anything else stated in the argument.",
    trapTag: "wrong_role",
  },
  {
    id: "drill_8",
    type: "role",
    stimulus:
      "Some economists claim that minimum wage increases reduce employment among low-skilled workers. But this claim ignores the buying power effect: when low-wage workers earn more, they spend more, which creates jobs throughout the local economy. So minimum wage increases do not necessarily reduce employment.",
    question: "The claim that low-wage workers spend more when they earn more plays which role?",
    options: [
      { text: "It is the main conclusion of the argument.", explanation: "The conclusion is that minimum wage increases do not necessarily reduce employment." },
      { text: "It is a premise offered to counter the opposing economists' view.", explanation: "Correct. The buying-power chain is the author's counter-evidence against the reduce-employment claim." },
      { text: "It is a claim the author concedes for the sake of argument before rejecting.", explanation: "The author affirms, not concedes, this claim." },
      { text: "It is a hypothesis the argument tries to undermine.", explanation: "The argument uses this claim as support, not as a target." },
    ],
    correctOptionIndex: 1,
    explanation: "The spending claim is the engine of the author's counterargument. It supports the buying-power chain that supports the rejection of the opposing economists.",
    trapTag: "wrong_role",
  },
  {
    id: "drill_9",
    type: "method",
    stimulus:
      "Officials claim that the new traffic camera reduced accidents because accidents at that intersection dropped by 30% after installation. But accidents dropped by similar amounts at five nearby intersections without cameras over the same period, due to a citywide infrastructure repair project. So the camera is not what caused the reduction.",
    question: "The argument proceeds by:",
    options: [
      { text: "Providing an alternative explanation for the observed effect.", explanation: "Correct. The author replaces the camera explanation with the infrastructure-repair explanation." },
      { text: "Attacking the officials by impugning their motives.", explanation: "No motive attack appears in the argument." },
      { text: "Showing that the officials' conclusion leads to an impossible result.", explanation: "The author does not derive an absurd consequence; they offer a competing cause." },
      { text: "Appealing to the testimony of an expert.", explanation: "No expert is cited." },
    ],
    correctOptionIndex: 0,
    explanation: "This is method 1 from the 17 Methods source: providing an alternative explanation for an observed effect. The camera is the originally posited cause; infrastructure repair is the alternative cause.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_10",
    type: "method",
    stimulus:
      "Theorists have proposed three explanations for the decline of the regional bee population: pesticide exposure, habitat loss, and viral infection. Recent studies show pesticide exposure has actually declined in the region, and habitat has been stable or increasing for the past decade. The decline must therefore be due to viral infection.",
    question: "The argument proceeds by:",
    options: [
      { text: "Inferring a causal relationship from a correlation.", explanation: "No correlation is the basis here; the author rules out two of three options." },
      { text: "Establishing one cause by excluding alternative causes.", explanation: "Correct. Method 2 from the 17 Methods source: validate one cause by eliminating alternatives." },
      { text: "Appealing to a definition of bee health.", explanation: "No definitions are invoked." },
      { text: "Using a counterexample to attack a generalization.", explanation: "There is no generalization being attacked." },
    ],
    correctOptionIndex: 1,
    explanation: "This is method 2 from the 17 Methods source: establishing the validity of one explanation by excluding alternative explanations. Pesticide and habitat are ruled out, leaving viral infection.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_11",
    type: "method",
    stimulus:
      "Hill: People who eat breakfast every day weigh less on average than those who skip it, so eating breakfast must aid weight management.\nWatkins: This is doubtful. Many people who eat breakfast also follow other healthy habits like regular exercise and consistent sleep schedules; any of these could explain the weight difference.",
    question: "Watkins responds to Hill's argument by:",
    options: [
      { text: "Calling into question a premise on which Hill's argument depends.", explanation: "Watkins does not dispute that breakfast-eaters weigh less; she challenges the inference, not the data." },
      { text: "Reinterpreting Hill's evidence as also compatible with an alternative explanation.", explanation: "Correct. Method 3 from the 17 Methods source. Watkins accepts the data but offers exercise and sleep as alternative causes." },
      { text: "Pointing out an inappropriate analogy in Hill's reasoning.", explanation: "Hill makes no analogy." },
      { text: "Appealing to the testimony of a nutrition expert.", explanation: "Watkins cites no expert." },
    ],
    correctOptionIndex: 1,
    explanation: "Watkins doesn't deny Hill's data. She takes the same data and shows it fits more than one causal story. That is reinterpreting evidence to fit an alternative explanation.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_12",
    type: "method",
    stimulus:
      "Pundits argue that the regulation will help small businesses by reducing competition from large chains. But large chains are also subject to the regulation, and complying with it costs them very little compared to small businesses. So the regulation will actually hurt the small businesses it was meant to help.",
    question: "The argument proceeds by:",
    options: [
      { text: "Pointing out that the pundits failed to take relevant information into account.", explanation: "Correct. Method 8 from the 17 Methods source. The author introduces the cost-of-compliance asymmetry that the pundits ignored." },
      { text: "Drawing a general principle from specific cases.", explanation: "No generalization is being drawn; the author critiques a specific claim." },
      { text: "Citing a counterexample to a broad generalization.", explanation: "The pundits are not making a generalization here, they are making a prediction." },
      { text: "Inferring a causal relationship from a correlation.", explanation: "No correlation is offered as the basis." },
    ],
    correctOptionIndex: 0,
    explanation: "The author adds new, relevant information (compliance cost asymmetry) that the pundits' argument overlooked. That is the classic \"failed to consider\" structure.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_13",
    type: "method",
    stimulus:
      "Vega: We should ban all advertising aimed at children. Such advertising manipulates young viewers into wanting products they do not need.\nLin: If we ban all advertising aimed at children, we will also have to ban educational programming sponsored by companies, public service announcements about safety, and parent-targeted ads that incidentally reach children. We will end up cutting off children from beneficial content.",
    question: "Lin responds to Vega by:",
    options: [
      { text: "Showing that Vega's proposal would have undesirable consequences.", explanation: "Correct. Method 7 from the 17 Methods source. Lin argues the policy itself, if enacted, leads to bad outcomes." },
      { text: "Attacking Vega's premise that children's advertising is manipulative.", explanation: "Lin does not dispute that some advertising is manipulative." },
      { text: "Pointing out an inappropriate analogy in Vega's argument.", explanation: "Vega offers no analogy." },
      { text: "Calling into question the sufficiency of Vega's evidence.", explanation: "Lin's objection is about the policy's consequences, not the evidence's strength." },
    ],
    correctOptionIndex: 0,
    explanation: "Lin accepts the framing but argues the policy Vega recommends produces collateral harm. That is the \"undesirable consequences\" method.",
    trapTag: "wrong_method",
  },
  {
    id: "drill_14",
    type: "flaw",
    stimulus:
      "Survey data shows that 87% of people who use our company's productivity software report feeling more efficient at work. Therefore, our software clearly makes people more efficient.",
    question: "The argument is most vulnerable to criticism on the grounds that it:",
    options: [
      { text: "Confuses what people report with what is actually the case.", explanation: "Correct. People's self-reports about feeling efficient do not directly establish that they are more efficient." },
      { text: "Treats a necessary condition as if it were a sufficient one.", explanation: "No necessary/sufficient confusion appears here." },
      { text: "Mistakes a temporal sequence for a causal relationship.", explanation: "No temporal sequence is invoked." },
      { text: "Generalizes from a sample that is unrepresentative.", explanation: "The flaw is the gap between feeling and being efficient, not sample size." },
    ],
    correctOptionIndex: 0,
    explanation: "The data is about self-reported feelings, but the conclusion is about actual efficiency. That is a scope shift from subjective experience to objective performance.",
    trapTag: "structural_mismatch",
  },
  {
    id: "drill_15",
    type: "flaw",
    stimulus:
      "The new diet plan must work. After all, my friend Carlos tried it and lost 15 pounds in two months.",
    question: "The reasoning is flawed because it:",
    options: [
      { text: "Generalizes from a single case to a broad conclusion.", explanation: "Correct. One person's experience does not establish that the plan works in general." },
      { text: "Confuses correlation with causation.", explanation: "While there is a temporal sequence, the deeper flaw is the sample size: one person." },
      { text: "Rejects a hypothesis without offering an alternative.", explanation: "The argument accepts, not rejects, a hypothesis." },
      { text: "Attacks the person rather than the claim.", explanation: "No personal attack appears." },
    ],
    correctOptionIndex: 0,
    explanation: "The argument generalizes from Carlos's experience to a claim about the plan in general. One data point is not enough to support that conclusion.",
    trapTag: "structural_mismatch",
  },
  {
    id: "drill_16",
    type: "flaw",
    stimulus:
      "A high percentage of professional musicians attended music camps as children. So if you want your child to become a professional musician, sending them to music camp is the most effective step you can take.",
    question: "The argument is most vulnerable to criticism on the grounds that it:",
    options: [
      { text: "Confuses the distribution of a feature within a group with the cause of becoming a member of that group.", explanation: "Correct. The fact that pros attended camps does not establish that camps cause people to become pros." },
      { text: "Generalizes from a sample that is too small to support the conclusion.", explanation: "Sample size is not the central problem; the issue is direction of inference." },
      { text: "Attacks the credibility of music professionals rather than their claims.", explanation: "There is no attack on credibility." },
      { text: "Mistakes a sufficient condition for a necessary one.", explanation: "No necessary/sufficient flip occurs here." },
    ],
    correctOptionIndex: 0,
    explanation: "Most pros having attended camp does not establish that camp causes professional careers. People predisposed to become pros may be the same people who attend camp.",
    trapTag: "structural_mismatch",
  },
  {
    id: "drill_17",
    type: "flaw",
    stimulus:
      "Studies show that students who take notes by hand retain information better than students who type notes. So if you want to retain class material, you should not bring your laptop to class.",
    question: "The reasoning is flawed because it:",
    options: [
      { text: "Treats note-taking medium as the only factor relevant to laptop use in class.", explanation: "Correct. The conclusion is about laptop use generally, but the evidence only addresses one purpose for the laptop." },
      { text: "Confuses correlation with causation.", explanation: "Causation is plausibly established by controlled studies; the gap is the conclusion's overreach." },
      { text: "Generalizes from a single case.", explanation: "The argument cites studies, not a single case." },
      { text: "Mistakes the absence of evidence for the evidence of absence.", explanation: "Studies provide evidence; this is not an absence-of-evidence move." },
    ],
    correctOptionIndex: 0,
    explanation: "The evidence is about handwritten vs typed notes. The conclusion is about laptop use overall. A laptop could be used for many other class-related things; the recommendation overreaches the data.",
    trapTag: "structural_mismatch",
  },
  {
    id: "drill_18",
    type: "one_word_trap",
    stimulus:
      "Every successful product launch we have studied had at least three rounds of customer testing. Therefore, conducting three rounds of customer testing always guarantees a successful product launch.",
    question: "Which of the following describes a flaw in the argument?",
    options: [
      { text: "The argument treats a necessary condition as if it were sufficient.", explanation: "Correct. \"Always guarantees\" is the trap word. The evidence shows three rounds were necessary; the conclusion claims they are sufficient." },
      { text: "The argument treats a sufficient condition as if it were necessary.", explanation: "The reverse of the actual flip. The evidence is about a feature shared by successful launches, not about what is enough to cause success." },
    ],
    correctOptionIndex: 0,
    explanation: "The single word \"guarantees\" turns an observed necessary condition into a sufficient one. That single-word flip is the trap.",
    trapTag: "attractive_language",
  },
  {
    id: "drill_19",
    type: "one_word_trap",
    stimulus:
      "Researcher: A new study suggests that meditation may reduce stress in some individuals.\nAdvocate: This study proves that everyone should meditate daily.",
    question: "The advocate's response is flawed because it:",
    options: [
      { text: "Strengthens the researcher's tentative finding into a universal prescription.", explanation: "Correct. \"Suggests\" and \"may\" become \"proves\" and \"everyone should\". The trap is the strength escalation." },
      { text: "Rejects the researcher's finding without offering counter-evidence.", explanation: "The advocate accepts, not rejects, the finding." },
    ],
    correctOptionIndex: 0,
    explanation: "Words like \"suggests\" and \"may\" are deliberately weak. \"Proves\" and \"everyone should\" are absolute. Watch for this strength flip on Inference and Strengthen questions.",
    trapTag: "attractive_language",
  },
  {
    id: "drill_20",
    type: "one_word_trap",
    stimulus:
      "Officials claim that the new traffic camera caused the 30% reduction in accidents. But the reduction is also consistent with the citywide infrastructure repair project completed in the same month.",
    question: "Which of the following accurately describes the role of the second sentence?",
    options: [
      { text: "It conclusively proves that the camera did not cause the reduction.", explanation: "Wrong. \"Conclusively proves\" is the trap word. The author shows an alternative is consistent, not that the camera explanation is impossible." },
      { text: "It offers an alternative explanation that is consistent with the same observed effect.", explanation: "Correct. The author opens room for another cause without ruling out the original." },
    ],
    correctOptionIndex: 1,
    explanation: "\"Conclusively proves\" is an extreme word that overstates what the second sentence actually does. The author opens room for an alternative, not eliminates the original.",
    trapTag: "attractive_language",
  },
];
