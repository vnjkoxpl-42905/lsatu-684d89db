/** Exact source exercise, 2026-10-13 Desktop transcription. Applied walkthroughs and word-bank drafts remain exported for compatibility but are superseded and inactive in the drill. */
export interface AnswerChoiceItem { id: string; stemNumber: number; stemText: string; correctKeywords: string[]; idealTranslation: string; requirements: string[]; steps: string[]; breakdownHtml: string; }
export interface AnswerChoiceWord { term: string; meaning: string; status: "approved" | "draft"; provenance: string; }
export const ABSTRACT_STEPS_HTML = "<h3>When faced with an abstract answer choice, this is what we do:</h3>\n    <ol>\n      <li>Read the answer choice over, <strong><u>extract any keywords</u></strong> that stand out to you.</li>\n      <li>Think what these keywords mean in a LSAT specific setting.</li>\n      <li>If it’s a <strong>noun</strong>, ask yourself, does this concept appear in the stimulus?</li>\n      <li>If it’s a <strong>verb</strong>, ask yourself, does the author do this in the argument?</li>\n      <li>If it’s an <strong>adjective/adverb</strong>, does it correctly describe the tone or strength of the author’s argument?</li>\n      <li><u>Read the answer choice again</u> and see if you can match up what the answer is describing with the stimulus’ structure.</li>\n      <li><strong><u>Don’t be afraid to go back and forth</u></strong> between the answer choice and the stimulus, the more you practice this skill, the easier it will be.</li>\n    </ol>";
export const ANSWER_CHOICE_ITEMS: AnswerChoiceItem[] = [
  {
    "id": "choice_1",
    "stemNumber": 1,
    "stemText": "It is used to illustrate the general principle that the argument presupposes",
    "correctKeywords": [
      "illustrate",
      "general principle",
      "presupposes"
    ],
    "idealTranslation": "The statement gives an example of a general rule that the argument requires.",
    "requirements": [
      "The statement is an example.",
      "The example illustrates a general principle.",
      "The argument requires that principle."
    ],
    "steps": [
      "Pull out “illustrate”, “general principle”, “presupposes”.",
      "The statement gives an example of a general rule that the argument requires.",
      "The statement must be an example, and the rule behind it must apply beyond that one case. John’s unhappiness despite his income is the source example.",
      "Does the statement illustrate the rule? Does the argument require that rule? John’s situation illustrates why money alone does not bring happiness.",
      "General means the principle covers multiple cases. Presupposes means required, not merely helpful.",
      "The example illustrates the principle that money alone is not enough for happiness; that principle is needed for the argument that we must pursue intangible things.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Whenever we are faced with an answer choice that looks super abstract, the first thing to do is to always <strong>extract what keywords we can</strong> to try to make sense of the whole thing. Three words stand out in this answer choice: “illustrate”, “general principle”, and “presuppose”.</p>\n\n<p>Now certain words have specific meanings within the LSAT. All three of these words appear repeatedly in LR questions and we need to memorize them:</p>\n\n<div class=\"definition\"><strong>Presuppose:</strong> in daily usage, a presupposition can mean either an assumption or something that is necessary. On the LSAT presuppose simply means “require”. (It’s talking about a necessary condition, something that we will soon cover.)</div>\n\n<div class=\"definition\"><strong>Illustrate:</strong> an illustration, as it appears in a LR question, is simply referring to an example/examples</div>\n\n<div class=\"definition\"><strong>General Principle:</strong> we briefly touched upon the nature of principles on the LSAT in the last chapter, and will do so again further down the road. But for now, just know that a principle is a rule on what we should/shouldn’t do; and that it applies to multiple conditions and scenarios.</div>\n\n<p>For example, “<em>John is always tired in the morning, he should go to bed earlier</em>” is not a principle, we are just talking about one person here. “<em>Those who are tired in the morning should strive to get to bed earlier</em>” is a principle. It’s no longer just about John anymore, it is a recommendation for a certain category of people.</p>\n\n<p>So now there are three requirements that must be met if we were to select this hypothetical answer choice as the correct answer. First, the statement in question must be an example; second, behind this example is a principle on what we should or shouldn’t do; and lastly, this principle is required in order for the author to advance their argument.</p>\n\n<p>Take a look at this example:</p>\n\n<p class=\"example\"><span class=\"underlined\">Despite a high paying job, John was extremely stressed out and depressed</span>, so there are intangible things in life that we must pursue to find true happiness.</p>\n\n<p>John’s situation is the illustration of a general principle; namely that having a lot of money isn’t enough to make you happy. Is this principle required in order for the conclusion to stand? Yes, the conclusion says factors other than money must be considered in order to be happy. The underlined statement satisfies all three requirements and if this was a Role question, this would be the correct answer.</p>"
  },
  {
    "id": "choice_2",
    "stemNumber": 2,
    "stemText": "It is an illustration of a premise that is used to support the argument’s conclusion",
    "correctKeywords": [
      "illustration",
      "premise",
      "support",
      "conclusion"
    ],
    "idealTranslation": "The statement is an example of a reason used to support the conclusion.",
    "requirements": [
      "The statement is an example of a premise.",
      "That premise supports the argument’s conclusion."
    ],
    "steps": [
      "Pull out “illustration”, “premise”, “support”, “conclusion”.",
      "The statement is an example of a reason used to support the conclusion.",
      "Find the example, the premise it illustrates, and the conclusion. In the source, John’s case illustrates the premise that smoking causes lung cancer.",
      "Check that the example illustrates the premise, and that the premise supports the recommendation not to smoke.",
      "An illustration of a premise has two links: example to premise, then premise to conclusion. Keep both.",
      "John’s smoking and lung cancer illustrate the causal premise, which supports avoiding cigarettes.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Again, “<strong>Illustration</strong>” means example. So we know this answer choice is referring to an example in the stimulus. Furthermore, it is an illustration of a premise. So when examining this answer choice, we must isolate the premise/premises that appear in the argument and ask ourselves, is the quoted statement an example of what the premise is trying to say?</p>\n\n<p><strong>Here is an example to illustrate what this answer choice is trying to say:</strong></p>\n\n<p class=\"example\"><span class=\"underlined\">John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer.</span> Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.</p>\n\n<p><strong>What is the premise here?</strong> Smoking causes lung cancer. <strong>What is the conclusion?</strong> Don’t smoke. John’s case is an illustration of the causal relationship between smoking and lung cancer. Requirement satisfied.</p>"
  },
  {
    "id": "choice_3",
    "stemNumber": 3,
    "stemText": "It is used to counter a consideration that might be taken to undermine the argument’s conclusion",
    "correctKeywords": [
      "counter",
      "consideration",
      "might",
      "undermine",
      "conclusion"
    ],
    "idealTranslation": "The statement answers a possible objection to the conclusion.",
    "requirements": [
      "The statement counters a real or possible objection.",
      "That objection could undermine the argument’s conclusion."
    ],
    "steps": [
      "Pull out “counter”, “consideration”, “might”, “undermine”, “conclusion”.",
      "The statement answers a possible objection to the conclusion.",
      "Find the conclusion and the possible objection. The source conclusion favors college; the objection concerns student debt.",
      "Does the statement answer that objection? The source says graduates earn more even after loan payments and interest.",
      "Might means the objection can be anticipated. It does not have to be raised by a speaker in the argument.",
      "The income statement supports college while answering the possible objection that debt makes college financially unwise.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>So right away, we should realize that “<em>a consideration that might be taken to undermine the argument’s conclusion</em>” is referring to a real or potential counter argument. A counter argument runs contrary to the author’s conclusion. If I say “going to college is a great way to enjoy a higher standard of living down the road,” but you respond with “but many college graduates have to take years to pay back debt”, you are making a counter argument in opposition to me.</p>\n\n<p>Continuing with our example, if I had anticipated your potential objection/counter argument, I can say something along the lines of “college graduates enjoy higher income than their non college counterparts even with the cost of debt factored in.” What I’m doing, essentially, is anticipating your potential objection and shutting you down in advance. That’s what is meant by countering a consideration that might be taken to undermine the argument’s conclusion.</p>\n\n<p class=\"example\"><span class=\"underlined\">College graduates make more money than they would if they didn’t go to college, even if they are paying off student loans plus interest.</span> So going to college is a great way to make more money and enjoy a better life.</p>\n\n<p>Here, the underlined statement is both a premise as well as a pre-emptive strike against a potential objection, namely that graduates end up with so much debt that going to college doesn’t make sense.</p>"
  },
  {
    "id": "choice_4",
    "stemNumber": 4,
    "stemText": "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false",
    "correctKeywords": [
      "observation",
      "insufficient",
      "justify",
      "claim",
      "false"
    ],
    "idealTranslation": "The statement gives an observation that the author says is not enough to support a claim the author rejects.",
    "requirements": [
      "The statement makes an observation used to support a claim.",
      "The author says that observation is not enough to justify the claim.",
      "The argument concludes that claim is false."
    ],
    "steps": [
      "Pull out “observation”, “insufficient”, “justify”, “claim”, “false”.",
      "The statement gives an observation that the author says is not enough to support a claim the author rejects.",
      "Identify the observation and the opposing claim. John points to celebrities’ smiles and concludes they are the happiest people.",
      "Does the author reject that claim and say the observation does not justify it? David says smiles may be a performance and cites depression and substance abuse.",
      "Insufficient means not enough. False describes the claim the author rejects, not the observation itself.",
      "The smiles are John’s support; David says they do not establish happiness and argues that John’s conclusion is false.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>A key piece of information we can extract from this answer choice is that there is a <em>claim that the argument concludes is false</em>. In other words, the author of this argument is arguing AGAINST a claim. Someone has made a claim, and the author is saying that claim is false.</p>\n\n<p>So we have two viewpoints in this potential stimulus. The author’s argument is directed against an adversary.</p>\n\n<p>Further, we know that the opponent made an observation in support of their view, but the author is saying that observation is not enough to prove anything, and subsequently goes on to argue that the opponent’s claim is false.</p>\n\n<p>So in order for this answer choice to be correct, the stimulus must satisfy the following requirements: there must be an opposing view, the author must be arguing against this opposing view and declaring it false. The opponent must have provided an observation as a basis of support for their view, and the author must have made the claim that this observation is not enough to demonstrate the truth of the opponent’s view.</p>\n\n<p>Let’s go a step further with a concrete example:</p>\n\n<p class=\"example\"><strong>John:</strong> <span class=\"underlined\">Celebrities have the biggest smiles in front of the camera</span>, so they must be the happiest people alive.</p>\n\n<p class=\"example\"><strong>David:</strong> That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn’t mean a thing, they could simply be putting on a show for the audience.</p>\n\n<p>Does the underlined statement fit the requirement for this answer choice? Yes, David is arguing that John’s claim is false. David also suggests that the observation John makes in support of his claim is insufficient to justify his claim.</p>"
  },
  {
    "id": "choice_5",
    "stemNumber": 5,
    "stemText": "It describes a phenomenon for which the argument’s conclusion is offered as an explanation",
    "correctKeywords": [
      "phenomenon",
      "conclusion",
      "explanation"
    ],
    "idealTranslation": "The statement describes an effect, and the conclusion proposes its cause.",
    "requirements": [
      "The statement describes a phenomenon or effect.",
      "The conclusion is offered as the cause of that phenomenon."
    ],
    "steps": [
      "Pull out “phenomenon”, “conclusion”, “explanation”.",
      "The statement describes an effect, and the conclusion proposes its cause.",
      "Find the phenomenon and the proposed cause. In the source, John’s lung cancer is the phenomenon and smoking is the proposed cause.",
      "Does the conclusion explain why the phenomenon occurred? The author concludes that John must have been a heavy smoker.",
      "Offered as an explanation tells us what the conclusion is doing. It does not prove that the proposed cause is correct.",
      "The target is John’s lung cancer; the conclusion tries to explain it by identifying smoking as its cause.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Here is another key term that we must familiarize ourselves with: <strong>explanation</strong>.</p>\n\n<div class=\"definition\"><strong>Explanation: on the LSAT, the word “explanation” has a very strict and precise meaning, it simply means “cause.”</strong></div>\n\n<p>So whenever you see the word “explanation” in an answer choice, check the stimulus for cause - effect reasoning. If it’s not there, then this answer would be wrong.</p>\n\n<p>What this answer choice is referring to is something we have seen before. We talked about questions where there is a cause and effect relationship in the argument, but instead of the cause being the premise and the effect being the conclusion, the order is reversed. The author describes a phenomenon and concludes what caused it. See PT43-S3-Q23 in the Find the Conclusion chapter if you had forgotten.</p>\n\n<p>We will reuse our example from the previous chapter:</p>\n\n<p class=\"example\">Smoking is a leading cause of lung cancer. <span class=\"underlined\">John has lung cancer</span>, therefore he must surely have been a heavy smoker.</p>\n\n<p>John having lung cancer is the <strong>phenomenon</strong>, the author subsequently concludes that it must be smoking which caused his lung cancer. The cause - effect relationship goes like this: smoking → lung cancer, and the cause/explanation is in fact the conclusion in this example.</p>"
  },
  {
    "id": "choice_6",
    "stemNumber": 6,
    "stemText": "It is a general principle whose validity the argument questions",
    "correctKeywords": [
      "general principle",
      "validity",
      "questions"
    ],
    "idealTranslation": "The statement is a general rule that the author challenges.",
    "requirements": [
      "The statement is a general principle.",
      "The argument questions the truth or validity of that principle."
    ],
    "steps": [
      "Pull out “general principle”, “validity”, “questions”.",
      "The statement is a general rule that the author challenges.",
      "Find a rule covering many cases. The source rule says the best approach to any situation is to be yourself.",
      "Does the author question that rule? The author points to selfish or horrible people and argues that we should improve ourselves.",
      "General requires a rule extending beyond one person or situation. Questions means challenges its truth.",
      "The target is the rule to be yourself; the author challenges it with cases where being yourself would not be best.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Again, this answer choice is referring to a general principle, but it’s a general principle that the argument is questioning/attacking. So if we are confronted with this answer choice, we must go back to the stimulus to make sure it satisfies two requirements: one, the quoted statement is indeed a general principle; and two, the author is arguing against the truth of this principle. Here is an example that would match what this answer choice is saying:</p>\n\n<p class=\"example\">It has been said that <span class=\"underlined\">the best way to approach any situation is to be yourself</span>. But this cannot be true. What if you are a selfish, egotistical or horrible person? Surely we must strive to better ourselves and be the best we can be?</p>"
  },
  {
    "id": "choice_7",
    "stemNumber": 7,
    "stemText": "It denies a claim that the argument takes to be assumed in the reasoning it rejects",
    "correctKeywords": [
      "denies",
      "claim",
      "assumed",
      "reasoning",
      "rejects"
    ],
    "idealTranslation": "The statement rejects an assumption behind another argument that the author opposes.",
    "requirements": [
      "The argument rejects someone else’s reasoning.",
      "The author takes that reasoning to assume a claim.",
      "The target statement denies that assumed claim."
    ],
    "steps": [
      "Pull out “denies”, “claim”, “assumed”, “reasoning”, “rejects”.",
      "The statement rejects an assumption behind another argument that the author opposes.",
      "Find the opposing reasoning and the assumption the author attributes to it. John assumes studying hard guarantees a strong exam result.",
      "Does the target deny that assumption? David says studying hard does not guarantee doing well, since grading is curved and others studied hard too.",
      "Takes to be assumed tells us this is the author’s account of the opponent’s assumption. Preserve whose reasoning is being rejected.",
      "David’s denial targets the guarantee John relies on, rather than simply announcing that John will fail.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>This one is very similar to example 4. The argument is rejecting another person’s reasoning. So the author is arguing against someone else here. But are they rejecting that view outright? No, the author does something much more nuanced than that. The author thinks the reasoning used by their opponent has made an assumption, and instead of going after the opponent’s argument, our author is going after the opponent’s assumption.</p>\n\n<p>So this answer choice is describing a stimulus in which there’s two arguments, the author’s argument and the opponent’s argument. This particular statement is the author rejecting an assumption made by the opponent’s argument.</p>\n\n<p>(We will look at the nature of assumptions in a subsequent chapter, as well as in Sufficient and Necessary Assumption question types.)</p>\n\n<p class=\"example\"><strong>John:</strong> I’ve studied so hard for the finals, I’m definitely going to ace the exam!</p>\n\n<p class=\"example\"><strong>David:</strong> <span class=\"underlined\">Studying hard doesn’t guarantee you will do well.</span> The exams are graded on a curve, and everyone else has studied just as hard.</p>"
  },
  {
    "id": "choice_8",
    "stemNumber": 8,
    "stemText": "It is a claim for which no justification is provided but that is required to establish the argument’s main conclusion",
    "correctKeywords": [
      "claim",
      "no justification",
      "required",
      "establish",
      "main conclusion"
    ],
    "idealTranslation": "The statement is an unsupported premise that the argument needs to reach its main conclusion.",
    "requirements": [
      "The statement is a claim with no justification supplied in the argument.",
      "It supports the main conclusion.",
      "It is required for this argument to establish its main conclusion; being required does not mean it is enough by itself."
    ],
    "steps": [
      "Pull out “claim”, “no justification”, “required”, “establish”, “main conclusion”.",
      "The statement is an unsupported premise that the argument needs to reach its main conclusion.",
      "Find a claim supporting the main conclusion without receiving support itself. John’s Olympic participation is the source’s premise.",
      "Does the claim help establish the main conclusion, and is it required by this argument? The source relies on Olympic participation to identify John as the medal’s original owner.",
      "No justification means no support is supplied for this claim in the argument. Required means necessary; it does not mean enough by itself.",
      "The Olympic-participation statement is taken without further support and is treated as required for this argument’s claim about the original owner.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>There are two important pieces of information in this answer choice that can help us determine whether it’s the correct answer. First, it is “required” to establish the argument’s main conclusion. That means it’s necessary in order for the main conclusion to be valid. So there’s no way this answer choice is talking about the conclusion itself, it’s therefore either a premise or an intermediate conclusion.</p>\n\n<p>Second, the answer choice says it’s a claim for which no justification is provided. Remember what we said about how to differentiate between premises and intermediate conclusions in the previous chapter? Premises support the conclusion but do not have any other statements supporting them, whereas intermediate conclusions both support the conclusion and are supported by premises. So when we have a statement which supports the conclusion but is not supported by others, it can only mean one thing: we are talking about a premise here.</p>\n\n<p>So we are essentially talking about a premise that is required to establish the truth of the conclusion. In other words, if the premise was untrue, the conclusion would not stand. Take a look at the following example for more clarity:</p>\n\n<p class=\"example\">I found an Olympic gold medal in the swim team locker room. It must have originally belonged to John. John is always losing things and <span class=\"underlined\">he participated in the Olympics.</span></p>\n\n<p>John’s participation in the Olympics is a requirement for the example’s conclusion to stand. In order for John to be the original owner of the medal, he MUST have been a participant at least.</p>\n\n<p>John’s participation in the Olympics is also a premise that supports the example argument’s conclusion.</p>"
  },
  {
    "id": "choice_9",
    "stemNumber": 9,
    "stemText": "It is a claim for which justification is provided and that, if true, establishes the truth of the argument’s main conclusion",
    "correctKeywords": [
      "claim",
      "justification",
      "if true",
      "establishes",
      "main conclusion"
    ],
    "idealTranslation": "The statement is a supported intermediate conclusion that, if true, guarantees the main conclusion in the argument.",
    "requirements": [
      "The statement receives justification.",
      "It supports the main conclusion and is an intermediate conclusion.",
      "If true, it establishes the main conclusion in the context of the argument, rather than merely making it more likely."
    ],
    "steps": [
      "Pull out “claim”, “justification”, “if true”, “establishes”, “main conclusion”.",
      "The statement is a supported intermediate conclusion that, if true, guarantees the main conclusion in the argument.",
      "Find a supported claim and the main conclusion it supports. John being a practicing lawyer is supported by his position at the law firm.",
      "Does the claim establish the main conclusion? With the source rule that all practicing lawyers passed the bar, John’s being a practicing lawyer establishes that he passed.",
      "If true preserves the condition. Establishes requires enough to secure the conclusion, not merely a reason that makes it more likely.",
      "John’s law-firm position supports his being a practicing lawyer; that intermediate conclusion, together with the stated rule, establishes that he passed the bar.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Very similar to the example listed above, but with two important caveats. This answer choice HAS justification provided, while supporting the main conclusion, so it’s an intermediate conclusion. It also <strong>guarantees/establishes</strong> the truth of the conclusion.</p>\n\n<p class=\"example\">All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore <span class=\"underlined\">he is a practicing lawyer</span>, so he must have passed the bar.</p>\n\n<p>John being a practicing lawyer is supported by the fact that he is a partner at a law firm. This satisfies the intermediate conclusion requirement. Does John being a practicing lawyer establish the fact that he has passed the bar? Yes, it is mentioned in the first statement/premise that all practicing lawyers must have passed the bar.</p>"
  },
  {
    "id": "choice_10",
    "stemNumber": 10,
    "stemText": "It is what the author’s argument purports to explain",
    "correctKeywords": [
      "purports",
      "explain"
    ],
    "idealTranslation": "The statement is the effect or phenomenon whose cause the argument tries to identify.",
    "requirements": [
      "The statement is the effect or phenomenon being explained.",
      "The author’s argument claims or attempts to explain its cause; success is not asserted."
    ],
    "steps": [
      "Pull out “purports”, “explain”.",
      "The statement is the effect or phenomenon whose cause the argument tries to identify.",
      "Find the effect and the proposed cause. Use the source’s causal relationship: John has lung cancer, and the author proposes smoking as its cause.",
      "Does the argument try to explain the target? It argues for the cause of John’s lung cancer.",
      "Purports means claims or attempts to do this. It does not tell us the explanation succeeds.",
      "The target is the lung cancer being explained, not the proposed cause offered to explain it.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>This is identical to example 5: the author describes an effect/result/phenomenon, and argues for a specific cause.</p>"
  },
  {
    "id": "choice_11",
    "stemNumber": 11,
    "stemText": "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence",
    "correctKeywords": [
      "hypothesis",
      "attempts",
      "undermine",
      "sufficiency",
      "evidence"
    ],
    "idealTranslation": "The statement proposes a possible cause, and the author challenges it by saying the supporting evidence is not enough.",
    "requirements": [
      "The statement is a hypothesis, a possible causal explanation.",
      "The author attempts to undermine that hypothesis.",
      "The challenge specifically concerns whether the evidence is sufficient to support the hypothesis."
    ],
    "steps": [
      "Pull out “hypothesis”, “attempts”, “undermine”, “sufficiency”, “evidence”.",
      "The statement proposes a possible cause, and the author challenges it by saying the supporting evidence is not enough.",
      "Find a hypothesis and the evidence offered for it. A hypothesis proposes why a phenomenon occurs.",
      "Does the author undermine that hypothesis specifically by questioning whether its evidence is enough? An unrelated objection would not satisfy the choice.",
      "Attempts does not require successful refutation. Sufficiency asks whether there is enough evidence, not whether there is no evidence.",
      "The target must be the proposed causal explanation; the author’s objection must concern the adequacy of its support.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p><strong>What is a hypothesis?</strong> In science, a hypothesis is offered by scientists to try to explain a phenomenon in the physical world or universe. Why did different types of birds have physical features that are adapted to their physical environments? Darwin hypothesized that it is due to the fact that species can change over time, adapting to their environments via physical modifications generation after generation. Darwin came up with a hypothesis, which today we know as The Theory of Evolution, that has been supported by evidence gathered both by him and subsequent scientists. In other words, a hypothesis is simply a posited causal explanation of a phenomenon, explaining WHY something is the way it is.</p>\n\n<div class=\"definition\"><strong>On the LSAT, the word “hypothesis” can be understood as a “potential explanation/potential causation”; it usually appears in science/medicine themed LR stimuli.</strong></div>\n\n<p>So what is this answer choice saying? The argument is attempting to undermine this hypothesis. It does so by saying that the evidence out there is not enough to support such a hypothesis. So when we are going through answer choices and come to this, we must make sure that there is a hypothesis present in the stimulus (the quoted statement being that hypothesis), the author is challenging this hypothesis, and the author does so by suggesting that the available evidence is not enough to support this hypothesis.</p>"
  },
  {
    "id": "choice_12",
    "stemNumber": 12,
    "stemText": "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument",
    "correctKeywords": [
      "conclusion",
      "as a whole",
      "not the only",
      "explicitly stated"
    ],
    "idealTranslation": "The statement is the main conclusion, and the argument also states an intermediate conclusion.",
    "requirements": [
      "The statement is the main conclusion of the whole argument.",
      "At least one other conclusion is explicitly stated in the argument."
    ],
    "steps": [
      "Pull out “conclusion”, “as a whole”, “not the only”, “explicitly stated”.",
      "The statement is the main conclusion, and the argument also states an intermediate conclusion.",
      "Find the main conclusion and a separate intermediate conclusion. The source requires both to be present.",
      "Check that the argument concludes the target overall and also explicitly states another conclusion.",
      "Not the only means at least one other conclusion. Explicitly stated means written in the argument, not supplied by you.",
      "The target is the final point; a separate stated conclusion receives support within the same argument.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Two pieces of key information here. The first is straightforward: we are talking about the main conclusion here. But note that it “<em>is not the only explicitly stated conclusion in the argument</em>”. That can only mean one thing: we have an intermediate conclusion in the argument as well. So if confronted with this answer choice, make sure that one, the statement we are talking about is in fact the main conclusion of the argument; and two, the argument contains a separate intermediate conclusion.</p>"
  },
  {
    "id": "choice_13",
    "stemNumber": 13,
    "stemText": "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole",
    "correctKeywords": [
      "intended",
      "support",
      "not the conclusion",
      "as a whole"
    ],
    "idealTranslation": "The statement is a supported intermediate conclusion rather than the main conclusion.",
    "requirements": [
      "The statement is supported by the argument.",
      "It is an intermediate conclusion rather than the main conclusion."
    ],
    "steps": [
      "Pull out “intended”, “support”, “not the conclusion”, “as a whole”.",
      "The statement is a supported intermediate conclusion rather than the main conclusion.",
      "Find a supported statement that is not the argument’s final point. The source identifies this as an intermediate conclusion.",
      "Check that the argument supports the target and that the target contributes to the main conclusion.",
      "Not the conclusion of the argument as a whole rules out the main conclusion. Intended describes what the support is meant to do.",
      "The target receives support within the argument while serving the larger argument’s conclusion.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Something that is supported by the argument but is not the main conclusion, that’s an intermediate conclusion we are talking about here.</p>"
  },
  {
    "id": "choice_14",
    "stemNumber": 14,
    "stemText": "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole",
    "correctKeywords": [
      "evidence",
      "provided",
      "support",
      "conclusion",
      "as a whole"
    ],
    "idealTranslation": "The statement receives evidence and then provides support for the main conclusion.",
    "requirements": [
      "The statement receives some evidence.",
      "The statement itself is offered to support the main conclusion."
    ],
    "steps": [
      "Pull out “evidence”, “provided”, “support”, “conclusion”, “as a whole”.",
      "The statement receives evidence and then provides support for the main conclusion.",
      "Find evidence for the target and the main conclusion the target supports. These two links identify an intermediate conclusion.",
      "Does some evidence support the target, and is the target itself offered as support for the main conclusion?",
      "Some evidence requires support to be present. It does not say that the support is sufficient or that the claim is proven.",
      "Evidence supports the target; the target supports the main conclusion. Both directions of support must be present.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Same as above. The statement in question is supported by support, and supports the main conclusion. This is also the intermediate conclusion.</p>"
  },
  {
    "id": "choice_15",
    "stemNumber": 15,
    "stemText": "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered",
    "correctKeywords": [
      "conclusion",
      "as a whole",
      "supported",
      "support",
      "offered"
    ],
    "idealTranslation": "The statement is the main conclusion, supported by an intermediate conclusion that itself receives support.",
    "requirements": [
      "The statement is the main conclusion.",
      "Another statement supports it.",
      "That supporting statement itself receives support and is an intermediate conclusion."
    ],
    "steps": [
      "Pull out “conclusion”, “as a whole”, “supported”, “support”, “offered”.",
      "The statement is the main conclusion, supported by an intermediate conclusion that itself receives support.",
      "Find the main conclusion, the statement supporting it, and the support for that supporting statement.",
      "Check the chain: a reason supports an intermediate conclusion, and that intermediate conclusion supports the target main conclusion.",
      "As a whole identifies the final conclusion. Another statement for which support is offered requires a supported supporting statement.",
      "The target is the main conclusion; its support includes an intermediate conclusion, rather than only unsupported premises.",
      "Go back and forth between the choice and the argument. Check every requirement before accepting the choice."
    ],
    "breakdownHtml": "<p>Same as example 12: the statement referred to by the answer choice is the main conclusion, and is supported by another statement for which support is offered. So the main conclusion is supported by an intermediate conclusion. When faced with an answer choice like this, make sure it is indeed the main conclusion that the question is asking us to analyze, and make sure the argument contains an intermediate conclusion.</p>"
  }
];
export const ANSWER_CHOICE_WORD_BANK: AnswerChoiceWord[] = [
  {
    "term": "illustrate",
    "meaning": "Give an example.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "general principle",
    "meaning": "A rule about what should or shouldn't be done that covers many cases.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "presupposes",
    "meaning": "Require.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "illustration",
    "meaning": "An example.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "premise",
    "meaning": "A reason the author gives to support a conclusion.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "support",
    "meaning": "Give a reason to accept a claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "conclusion",
    "meaning": "A claim the author supports with reasons.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "counter",
    "meaning": "Answer or oppose a point against the argument.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "consideration",
    "meaning": "A point that could count against the conclusion in this choice.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "might",
    "meaning": "Could; the choice allows a possible objection.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "undermine",
    "meaning": "Weaken. Push against.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "observation",
    "meaning": "Something noticed or reported about the world.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "insufficient",
    "meaning": "Not enough to establish the claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "justify",
    "meaning": "Provide enough reason to accept a claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "claim",
    "meaning": "A statement put forward as true.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "false",
    "meaning": "Untrue.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "phenomenon",
    "meaning": "The event, effect, or situation being explained.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "explanation",
    "meaning": "Give the cause.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "validity",
    "meaning": "Whether the principle is true or acceptable in this choice.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "questions",
    "meaning": "Challenges or calls into doubt.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "denies",
    "meaning": "Says a claim is not true.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "assumed",
    "meaning": "Taken for granted without being established.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "reasoning",
    "meaning": "The way reasons are used to support a claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "rejects",
    "meaning": "Refuses to accept.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "no justification",
    "meaning": "No supporting reason for this claim is supplied in the argument.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "required",
    "meaning": "Necessary for this argument; meeting it may not be enough.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "establish",
    "meaning": "Secure the conclusion, rather than merely make it more likely.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "main conclusion",
    "meaning": "The final point the author wants you to accept.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "justification",
    "meaning": "A reason supplied to support a claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "if true",
    "meaning": "The stated result follows on the condition that the claim is true.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "establishes",
    "meaning": "Secures the conclusion, rather than merely makes it more likely.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "purports",
    "meaning": "Claims or attempts to do something, without saying it succeeds.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "explain",
    "meaning": "Give the cause.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "hypothesis",
    "meaning": "A possible explanation: a proposed cause.",
    "status": "approved",
    "provenance": "Module 2 STATEMENT_WORDS / ACTION_WORDS or source definition; inflection normalized."
  },
  {
    "term": "attempts",
    "meaning": "Tries to; success is not asserted.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "sufficiency",
    "meaning": "Whether something is enough.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "evidence",
    "meaning": "Information offered as support for a claim.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "as a whole",
    "meaning": "Considering the complete argument and its final point.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "not the only",
    "meaning": "There is at least one other.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "explicitly stated",
    "meaning": "Said directly in the argument, rather than left unstated.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "intended",
    "meaning": "Meant to do something.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "not the conclusion",
    "meaning": "Does not function as the final point of the complete argument.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "provided",
    "meaning": "Given within the argument.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "supported",
    "meaning": "Given reasons or evidence to accept it.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  },
  {
    "term": "offered",
    "meaning": "Presented for the stated purpose.",
    "status": "draft",
    "provenance": "Draft from the matching source exercise; Joshua approval pending."
  }
];

/** Exact four source introduction paragraphs. */
export const ROLE_CHOICE_INTRO_HTML = "<p>While the way in which we read the stimulus of any Role question is similar to how we approach Find the Conclusion questions, the answer choices we are faced with in Role questions are much more difficult. Life would be so simple if all the answer choices were just asking us if the statement in question is a premise or conclusion, but the test makers love to describe a relatively straightforward concept in abstract and vague language in Role question answer choices.</p>\n\n<p>As a result, the successful student should devote the majority of their time and energy to answer choices when approaching Role questions. As you get comfortable with analyzing the structure of the stimulus, it should become second nature to you. I use about 60% of all the time to examine answer choices in Role questions, with the other 40% set aside for reading the question and the stimulus.</p>\n\n<p>The ability to de-abstractify (translating vague and abstract terms that appear in answer choices into their stimulus equivalents) and knowing exactly what they are referring to is one of the most important skills that the advanced student needs to master. If you do not have this ability, often you will end up choosing a wrong answer choice even if you knew what you were looking for. You simply did not understand what the answer choice was trying to say. In other words, advanced students can read through a list of abstract answer choices and know exactly what they are referring to.</p>\n\n<p>Take a look at the following answer choice examples, and see if you can decipher what is it that they are referring to, or even better, try to make up an argument with the components that would function as these answer choices describe:</p>";
export const ROLE_CHOICE_SOURCE_SHA256 = "c914b12b0d61ba8e743e5e55979e48772d3147edcbc2b3dc305648fb3492ba61";

/** Line-ending-normalized fingerprint for portable source-fidelity tests. */
export const ROLE_CHOICE_SOURCE_CONTENT_SHA256 = "c914b12b0d61ba8e743e5e55979e48772d3147edcbc2b3dc305648fb3492ba61";
