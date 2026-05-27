import type { ReactNode } from "react";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

export type IntroLessonPageId =
  | "how-to-read-lr-stimulus"
  | "three-parts-lr-question"
  | "so-an-argument"
  | "premises"
  | "conclusions"
  | "five-types-of-conclusions"
  | "beyond-premises-and-conclusions"
  | "two-part-conclusion-check";

type PageDefinition = {
  eyebrow: string;
  title: string;
  subtitle: string;
  content: ReactNode;
};

const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
    {children}
  </div>
);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-3">
    <Kicker>{title}</Kicker>
    {subtitle ? <h2 className="font-serif text-[40px] italic leading-tight text-[#1a1a1a]">{subtitle}</h2> : null}
  </div>
);

const LessonSection = ({
  tocTitle,
  children,
  className,
}: {
  tocTitle: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    data-toc
    data-toc-title={tocTitle}
    className={cn("note-section border-b border-[rgba(26,26,26,0.1)] p-10 md:p-12", className)}
  >
    {children}
  </section>
);

const CalloutCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] p-6 md:p-8", className)}>
    {children}
  </div>
);

const GridCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-white p-6 md:p-8">
    <h3 className="mb-4 font-serif text-[28px] italic leading-tight text-[#1a1a1a]">{title}</h3>
    <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">{children}</div>
  </div>
);

const RowCard = ({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) => (
  <div className="overflow-hidden rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white">
    <div className="grid grid-cols-1 divide-y divide-[rgba(26,26,26,0.10)] md:grid-cols-[220px_1fr] md:divide-x md:divide-y-0">
      <div className="p-6 font-serif text-[24px] font-semibold leading-tight text-[#1a1a1a] md:p-8">{left}</div>
      <div className="p-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)] md:p-8">{right}</div>
    </div>
  </div>
);

const QuoteCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "border-l-4 border-[rgba(26,26,26,0.45)] pl-6 py-2 text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]",
      className,
    )}
  >
    {children}
  </div>
);

const BulletList = ({ items, className }: { items: ReactNode[]; className?: string }) => (
  <ul className={cn("list-disc space-y-3 pl-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]", className)}>
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const NumberList = ({ items }: { items: ReactNode[] }) => (
  <ol className="list-decimal space-y-3 pl-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ol>
);

const BreakdownList = ({ items }: { items: ReactNode[] }) => (
  <div className="space-y-3 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
    {items.map((item, index) => (
      <div key={index}>{item}</div>
    ))}
  </div>
);

const pages: Record<IntroLessonPageId, PageDefinition> = {
  "how-to-read-lr-stimulus": {
    eyebrow: "Page 1",
    title: "How to Read an LR Stimulus",
    subtitle:
      "Logical Reasoning starts with active reading: find the conclusion, find the premises, and test whether the support really proves the claim.",
    content: (
      <>
        <LessonSection tocTitle="Primary Directive" className="space-y-8">
          <SectionHeading title="Primary Directive" subtitle="How to Read an LR Stimulus" />
          <CalloutCard className="bg-white">
            <p className="text-[22px] leading-[1.75] text-[#1a1a1a]">
              The core job: When you read an LR stimulus, do not read passively. Find the conclusion, find the premises,
              and ask whether the premises really prove the conclusion.
            </p>
          </CalloutCard>
        </LessonSection>

        <LessonSection tocTitle="Assessment Metrics" className="space-y-8 border-b-0">
          <SectionHeading title="Assessment Metrics" subtitle="What Logical Reasoning Tests" />
          <div className="grid gap-5">
            <GridCard title="1. Read Intently">
              <p>
                You must pay attention to what each sentence is doing. If you do not really understand what you are
                reading, you will not answer the question correctly.
              </p>
              <p>Do not skim. Do not assume. Do not paraphrase too loosely. Track the role of each statement.</p>
            </GridCard>
            <GridCard title="2. Question the Author">
              <p>
                Many students read an LR stimulus and think, "That sounds fine." That is the wrong mindset. The author's
                conclusion is often the weak point.
              </p>
              <p>
                Ask whether the evidence actually proves the claim, whether the author is going too far, and whether there
                is a gap between the premises and the conclusion.
              </p>
            </GridCard>
          </div>
        </LessonSection>
      </>
    ),
  },
  "three-parts-lr-question": {
    eyebrow: "Page 2",
    title: "The Three Parts of an LR Question",
    subtitle: "Every question has a stimulus, a question stem, and answer choices, but the reasoning lives in the stimulus.",
    content: (
      <>
        <LessonSection tocTitle="Structural Triad" className="space-y-8">
          <SectionHeading title="Structural Triad" subtitle="The Three Parts of an LR Question" />
          <CalloutCard className="bg-white">
            <p className="text-[22px] leading-[1.75] text-[#1a1a1a]">
              Every Logical Reasoning question has three parts: the stimulus, the question stem, and the answer choices.
              Of those three, the stimulus matters most. The answer is not sitting in the answer choices. The answer
              choices test whether you understood the stimulus correctly.
            </p>
          </CalloutCard>
        </LessonSection>

        <LessonSection tocTitle="Breakdown Table" className="space-y-4">
          <SectionHeading title="Breakdown Table" subtitle="What each part is doing" />
          <RowCard
            left="1. Stimulus"
            right="The short passage you read first. This is where the reasoning lives. Your job is to figure out what facts or evidence the author is giving you and what claim the author is trying to prove. That means your real task is to separate premises from conclusions."
          />
          <RowCard
            left="2. Question Stem"
            right="The question stem tells you what job you need to do with the argument: find the flaw, strengthen the argument, weaken the argument, identify the main conclusion, or find an assumption. First understand the argument. Then use the question stem to know what to do with it."
          />
          <RowCard
            left="3. Answer Choices"
            right="The answer choices do not create the reasoning. They test whether you understood it correctly. Do not start by comparing answer choices before you understand the stimulus. The stimulus comes first."
          />
        </LessonSection>

        <LessonSection tocTitle="Stock Analysts" className="space-y-8 border-b-0">
          <SectionHeading title="Applied X-ray Example" subtitle="The Stock Analysts" />
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            This is a labeled anatomy example, not a graded question.
          </p>
          <div className="grid gap-5">
            <GridCard title="Stimulus">
              <p>
                "Humans are no better than apes at investing. We gave five stock analysts and one chimpanzee $1,350 each
                to invest. After one month, the chimp won, increasing its net worth by $210. The next best analyst
                increased by only $140."
              </p>
            </GridCard>
            <GridCard title="Question Stem">
              <p>Each of the following describes a flaw in the game show host's reasoning EXCEPT:</p>
            </GridCard>
            <GridCard title="Answer Choices">
              <BulletList
                items={[
                  "(A) It draws a sweeping conclusion about two entire species based on an exceptionally small sample size.",
                  "(B) It takes for granted that a single one-month trial is a reliable indicator of long-term investing skill.",
                  "(C) It fails to consider the possibility that the chimpanzee's success was merely the result of random chance.",
                  "(D) It inappropriately relies on the emotional appeal of an animal succeeding in a human profession. [Correct]",
                  "(E) It presumes, without providing justification, that the five chosen analysts are representative of human investors generally.",
                ]}
              />
            </GridCard>
          </div>
        </LessonSection>
      </>
    ),
  },
  "so-an-argument": {
    eyebrow: "Page 3",
    title: "So, An Argument",
    subtitle: "Arguments are the centerpiece of LR: premises support conclusions, and everything else builds from that picture.",
    content: (
      <>
        <LessonSection tocTitle="The Centerpiece" className="space-y-8">
          <SectionHeading title="The Centerpiece" subtitle="What an argument actually is" />
          <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
            In Logical Reasoning, arguments are the single most important concept you need to understand on a deep level.
            We're going to learn to manipulate them, dismantle them, and beat them. But first, you need a crystal clear
            picture of what an argument actually is.
          </p>
        </LessonSection>

        <LessonSection tocTitle="Premises And Conclusions" className="space-y-8">
          <SectionHeading title="Arguments Are Premises and Conclusions" subtitle="The core structure" />
          <p className="text-[20px] leading-[1.75] text-[rgba(26,26,26,0.84)]">
            Arguments are quite simple at their core. An argument is made up of two things: premises and conclusions.
          </p>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <div className="space-y-5">
              <div>
                <p className="font-semibold uppercase tracking-[0.16em] text-[#1a1a1a]">Premises support conclusions.</p>
                <p>Premises are the evidence.</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.16em] text-[#1a1a1a]">Conclusions rely on premises.</p>
                <p>Conclusions are the author's claim.</p>
              </div>
            </div>
          </QuoteCard>
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <strong>That's it.</strong> Arguments are just premises and conclusions. They have a lot of complicated
            baggage we'll introduce soon, but at their core, arguments are always this simple.
          </p>
        </LessonSection>

        <LessonSection tocTitle="Simple Argument" className="space-y-8">
          <SectionHeading title="Behold, A Simple Argument" subtitle="Cake and blocks" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>
              Imagine you're building a table made of blocks to keep a delicious piece of cake off the floor (you live a
              very interesting life in this example).
            </p>
            <p>Your blocks are solid. They aren't going anywhere. These are your <strong>premises</strong>.</p>
            <p>Your cake is squishy and fragile. It needs to be held up because it cannot fend for itself. This is your <strong>conclusion</strong>.</p>
          </div>
          <CalloutCard className="bg-white">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[18px] leading-[1.8] text-[#1a1a1a]">{`{CAKE}             <- Conclusion (squishy claims)

[BLOCK] [BLOCK]    <- Premises (solid facts)`}</pre>
          </CalloutCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>
              The cake is only safe from the floor because you arranged your blocks exactly right. Conclusions are
              worthless and delicious like this too. They can't keep themselves off the floor.
            </p>
            <p>
              Left to their own devices, conclusions would run amok and we'd never get anything done. Conclusions need
              premises, or they're just opinions lying in the dirt.
            </p>
            <p>Let's dive into premises and conclusions. Make sure this sinks in. Everything that follows depends on it.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Core Takeaway" className="space-y-8 border-b-0">
          <SectionHeading title="Core Takeaway" subtitle="Evidence and claims" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Arguments are built from evidence and claims.</strong>
            </p>
            <p>Premises hold the conclusion up. Without premises, a conclusion has no support.</p>
          </QuoteCard>
        </LessonSection>
      </>
    ),
  },
  premises: {
    eyebrow: "Page 4",
    title: "Premises",
    subtitle: "Premises are the facts and evidence you accept as true; the real question is how they connect to the conclusion.",
    content: (
      <>
        <LessonSection tocTitle="Statements Of Fact" className="space-y-8">
          <SectionHeading title="Premises" subtitle="Statements of fact" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Premises are just the facts. The evidence. They describe how the world is, and on the LSAT, you accept them as true, full stop.</p>
            <p>
              In real life, we argue by attacking each other's evidence all the time. Someone says, "We should cancel the
              picnic because the park is flooded and the weather is supposed to be terrible." You might say, "The park is
              completely dry, and the forecast says it will be clear all afternoon." You are not questioning their
              conclusion first. You are attacking the facts they used to support it.
            </p>
            <p>
              The LSAT doesn't allow it. Premises are locked in. You accept them and move on. <strong>The correct answer almost never questions the truth of a premise.</strong> The moment you start poking at whether a premise is accurate, you've left the building.
            </p>
            <p>
              What you focus on instead is how the premises connect to the conclusion. Whether they actually support the
              claim the author is making. That's the whole game.
            </p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="What Premises Are And Aren't" className="space-y-8">
          <SectionHeading title="What Premises Are and Aren't" subtitle="What they do in the argument" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Premises do the argument's heavy lifting. They're the evidence that makes the conclusion worth anything.</p>
            <p>
              They are not questionable. Not on the LSAT. They don't depend on the conclusion or on each other. They just
              exist, solid, already true, handed to you for free.
            </p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>
                You said we should cancel the picnic because the park is flooded and the weather is supposed to be terrible.
                But the park is completely dry. And the forecast says it will be clear all afternoon.
              </em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>
              Two premises just got attacked: "the park is flooded" and "the weather is supposed to be terrible." That's
              everyday argument. The LSAT is more interesting than that.
            </p>
            <p>
              It doesn't ask you to poke holes in the evidence. It asks you whether the evidence actually leads where the
              author thinks it does. That's a harder, more useful question, and it's the one that gets you points.
            </p>
            <p>
              <strong>Premises are defined by their relationship to the conclusion.</strong> That's the key. A sentence isn't a premise because of what it says. It's a premise because of what it's doing in the argument: supporting the claim.
            </p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Remember:</strong> Accept premises as true. Don't debate them. Focus on whether they support the
              conclusion.
            </p>
          </QuoteCard>
        </LessonSection>

        <LessonSection tocTitle="Premise Indicators" className="space-y-8 border-b-0">
          <SectionHeading title="Premise Indicators" subtitle="FABS" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Certain words signal that a premise is coming. Learn them and you'll start spotting argument structure automatically.</p>
            <p>The four big ones: <strong>For, After all, Because, Since.</strong> FABS.</p>
            <p>
              When you see any of these, a premise is right behind it. The author is handing you evidence. Take it,
              accept it, and ask what it's being used to support.
            </p>
            <p>
              <strong>FABS. Memorize it.</strong>
            </p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Remember:</strong> For, After all, Because, Since = FABS. These words introduce premises.
            </p>
          </QuoteCard>
        </LessonSection>
      </>
    ),
  },
  conclusions: {
    eyebrow: "Page 5",
    title: "Conclusions",
    subtitle: "Conclusions are the author's claims and judgments; they are the part of the argument you question.",
    content: (
      <>
        <LessonSection tocTitle="Claimy Judgments" className="space-y-8">
          <SectionHeading title="Claimy Judgments That Are Usually Wrong" subtitle="What conclusions are" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Conclusions are the judgments the author makes. They are the main event. Everything in an argument exists to support them.</p>
            <p>
              Here's what makes conclusions interesting: the author goes out on a limb. They take what's been handed to
              them in the premises and infer something new, something the premises alone don't automatically prove. That
              gap between what the premises say and what the conclusion claims is where the entire LSAT lives.
            </p>
            <p>
              <strong>Conclusions are the part of the argument you question.</strong> Not the premises. The conclusion.
            </p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="What Conclusions Are And Aren't" className="space-y-8">
          <SectionHeading title="What Conclusions Are and Aren't" subtitle="Why they are vulnerable" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>
              Conclusions are not ironclad. That's the whole point. <strong>The premises are usually not arranged well enough to actually prove the conclusion,</strong> and finding exactly why is your job on most LR questions.
            </p>
            <p>
              Conclusions can't stand on their own either. They are completely dependent on the premises. Pull the
              premises out and the conclusion is just an opinion, floating, unsupported, worth nothing.
            </p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Remember:</strong> Arguments are all about the relationship between the conclusion and its premises.
            </p>
          </QuoteCard>
        </LessonSection>

        <LessonSection tocTitle="Conclusion Indicators" className="space-y-8">
          <SectionHeading title="Conclusion Indicators" subtitle="Useful clues" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Just like premises have indicator words, so do conclusions. When you see these, a conclusion is right behind them:</p>
            <p className="font-semibold text-[#1a1a1a]">therefore / accordingly / consequently / so / thus / hence / it follows that</p>
            <p>
              <strong>Memorize this list.</strong>
            </p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>The old bridge has started to crack, and engineers have warned that it is no longer safe. <strong>Therefore</strong>, the city should repair the bridge.</em>
            </p>
            <p className="mt-4">
              <em><strong>Since</strong> the old bridge has started to crack and engineers have warned that it is no longer safe, the city should repair the bridge.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>
              Same argument. Different indicator words. The conclusion is identical in both: <em>the city should repair the bridge.</em> In the first version, <strong>therefore</strong> points at it directly. In the second, <strong>since</strong> marks the premises instead, and the conclusion is just whatever's left.
            </p>
            <p>The argument did not change. Only the packaging did.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Do Not Just Hunt" className="space-y-8 border-b-0">
          <SectionHeading title="Don't Just Hunt for Indicator Words" subtitle="Read structure, not just packaging" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Here's the thing, though. Indicator words are a tool, not a crutch.</p>
            <p>
              They won't always be there. The LSAT will hand you arguments with no indicators at all, and if your entire
              strategy is seek-and-find, you'll be stuck. <strong>The goal is to change the way you think about sentences, not just tag them.</strong>
            </p>
            <p>
              So go deeper. Ask yourself about the personality of each statement. Is it a fact, or is it a claim? Is it
              something being offered as evidence, or something being argued for? Facts are premises. Claims are
              conclusions.
            </p>
            <p>
              That instinct, reading the role of a sentence rather than hunting for a keyword, is what separates students
              who understand arguments from students who just sort of navigate them.
            </p>
            <p>Indicator words will speed you up when they're present. Analytical thinking will save you when they're not.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
  "five-types-of-conclusions": {
    eyebrow: "Page 6",
    title: "Five Types of Conclusions",
    subtitle: "Once you find the conclusion, name its type so you can predict the weakness that usually comes with it.",
    content: (
      <>
        <LessonSection tocTitle="Five Types Of Conclusions" className="space-y-8">
          <SectionHeading title="Five Types of Conclusions" subtitle="What kind of claim is the author making?" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The argument did not change. Only the packaging did.</p>
            <p>Indicator words are packaging. They can point you toward a conclusion, but they do not tell you what kind of conclusion you are dealing with.</p>
            <p>
              That is the real question:
            </p>
            <p className="font-serif text-[28px] italic text-[#1a1a1a]">What kind of claim is the author making?</p>
            <p>
              This matters because conclusions are not all built the same way. Some tell us what should happen. Some explain
              why something happened. Some predict what will happen next. Some pass judgment. Some reject another person's
              view.
            </p>
            <p>Each type has its own shape. Each type also has its own predictable weakness.</p>
            <p>
              So once you can name the type of conclusion, you are not just "finding the conclusion" anymore. You are
              already starting to see where the argument might break.
            </p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Recommendations" className="space-y-8">
          <SectionHeading title="1. Recommendations" subtitle="What should happen" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A recommendation tells us what should happen.</p>
            <p>The author is not describing the world. The author is giving advice, proposing a rule, or telling someone what ought to be done.</p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Double-blind techniques should be used whenever possible in scientific experiments.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The word <strong>should</strong> is the clue. The author has looked at the situation and decided on a course of action.</p>
            <p>But recommendations always smuggle in a comparison. The author is assuming that the benefits of the proposal outweigh the costs, risks, or alternatives.</p>
            <p>That is where these arguments usually break.</p>
            <p>A weakener might show that the recommendation is too expensive, impractical, harmful in some cases, or worse than another available option.</p>
            <p>The author says, "Do this."</p>
            <p>Your job is to ask, <strong>"Why is that the best move?"</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Causal Hypotheses" className="space-y-8">
          <SectionHeading title="2. Causal Hypotheses" subtitle="What explains it" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A causal hypothesis claims to know why something happened.</p>
            <p>The author notices a pattern, statistic, trend, or timing connection, then turns that connection into an explanation.</p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Restrictions on tobacco advertisements caused the reduction in the number of people smoking.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The word <strong>caused</strong> is doing the heavy lifting.</p>
            <p>The problem is that patterns do not prove causes. Just because two things happened around the same time does not mean one produced the other.</p>
            <p>Maybe something else caused the drop in smoking. Maybe smoking was already declining. Maybe public attitudes changed. Maybe the restriction helped, but was not the main cause.</p>
            <p>Causal conclusions are fragile because they usually move too quickly from "these things are connected" to "this thing caused that thing."</p>
            <p>The author says, "This explains it."</p>
            <p>Your job is to ask, <strong>"What else could explain it?"</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Predictions" className="space-y-8">
          <SectionHeading title="3. Predictions" subtitle="What will happen" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A prediction claims that something will happen.</p>
            <p>The author takes what is true now, or what has been true so far, and projects it into the future.</p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Global warming probably will not produce more frequent and intense tropical storms.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The word <strong>probably</strong> does not make the argument safe. It only makes the conclusion sound more careful.</p>
            <p>Every prediction depends on a quiet assumption: the relevant conditions will stay the same.</p>
            <p>Often, they will not.</p>
            <p>A prediction can fail because new evidence appears, a trend changes, outside conditions shift, or the author relies too heavily on the past.</p>
            <p>The author says, "This is what will happen."</p>
            <p>Your job is to ask, <strong>"What could change?"</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Judgments And Labels" className="space-y-8">
          <SectionHeading title="4. Judgments and Labels" subtitle="What verdict is being assigned" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A judgment assigns a verdict.</p>
            <p>The author is not just reporting facts. The author is evaluating something, blaming something, praising something, or attaching a label to it.</p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Because the new products are selling poorly, the ad campaign is ill-conceived.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p><strong>Ill-conceived</strong> is not a fact. It is a judgment.</p>
            <p>The author sees poor sales and blames the ad campaign. But poor sales alone do not prove that the campaign was bad.</p>
            <p>Maybe the product itself was weak. Maybe the price was too high. Maybe the market changed. Maybe a competitor released something better. Maybe the campaign worked, but not well enough to overcome other problems.</p>
            <p>Judgment conclusions often sound confident because the label is strong. But the reasoning underneath is usually doing less work than the author thinks.</p>
            <p>The author says, "This deserves that label."</p>
            <p>Your job is to ask, <strong>"Did they actually prove that label fits?"</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Rebuttals" className="space-y-8">
          <SectionHeading title="5. Rebuttals" subtitle="When the author says someone else is wrong" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A rebuttal is the author saying someone else is wrong.</p>
            <p>These usually have a clear setup:</p>
          </div>
          <NumberList
            items={[
              <span><strong>Attribution:</strong> someone else's view is introduced.</span>,
              <span><strong>Pivot:</strong> the author turns against that view.</span>,
              <span><strong>Rebuttal:</strong> the author gives their own disagreement.</span>,
            ]}
          />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Critics say this movie is unrealistic. They are wrong, because it is a funny comedy and that is all that matters.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The critics' view is the attribution. The phrase <strong>they are wrong</strong> is the pivot into the author's position.</p>
            <p>Once you see that pattern, rebuttal conclusions become much easier to find. The author is not merely giving a new idea. The author is responding to someone else.</p>
            <p>The weakness usually sits in the response. The author may reject the other side for a bad reason, misunderstand the criticism, or fail to address the actual point being made.</p>
            <p>The author says, "They are wrong."</p>
            <p>Your job is to ask, <strong>"Did the author actually answer them?"</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Remember" className="space-y-8 border-b-0">
          <SectionHeading title="Remember" subtitle="Do not stop at finding the conclusion" />
          <BulletList
            items={[
              <span><strong>Recommendations</strong> say what should happen.</span>,
              <span><strong>Causal hypotheses</strong> say what caused something.</span>,
              <span><strong>Predictions</strong> say what will happen.</span>,
              <span><strong>Judgments and labels</strong> assign a verdict.</span>,
              <span><strong>Rebuttals</strong> say the other side is wrong.</span>,
            ]}
          />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Do not stop at finding the conclusion. Name the type.</p>
            <p>Once you know the type of conclusion, you know the kind of weakness to look for.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
  "beyond-premises-and-conclusions": {
    eyebrow: "Page 7",
    title: "Beyond Premises and Conclusions",
    subtitle: "Not every sentence belongs to the author's own argument, so separate context, opposition, concessions, and pivots from the real claim.",
    content: (
      <>
        <LessonSection tocTitle="Big Picture Overview" className="space-y-8">
          <SectionHeading title="Big Picture Overview" subtitle="What else appears in a stimulus" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Once students learn premises and conclusions, a new problem appears: not every sentence in an LR stimulus is part of the author's own argument.</p>
            <p>Some sentences give background. Some introduce what other people believe. Some support another person's view. Some concede a point. Some pivot away from that material and toward the author's actual position.</p>
            <p>This is why students cannot treat every sentence as either "premise" or "conclusion" too quickly.</p>
            <p>The real job is to separate the author's argument from everything around it.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="The Core Rule" className="space-y-8">
          <SectionHeading title="The Core Rule" subtitle="Ask what job the sentence is doing" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Do not ask what the sentence says. Ask what job it is doing.</strong>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A sentence may sound important and still not be the author's conclusion.</p>
            <p>A sentence may be factual and still not be a premise for the author's conclusion.</p>
            <p>A sentence may give evidence, but that evidence may support someone else's view rather than the author's.</p>
            <p>The role matters more than the topic.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Background Information" className="space-y-8">
          <SectionHeading title="1. Background Information" subtitle="Context is not automatically support" />
          <GridCard title="Plain English Definition">
            <p>Background information gives context. It sets up the topic, introduces the situation, or explains what the argument is about.</p>
            <p>Background information usually does <strong>not</strong> directly support the author's conclusion.</p>
          </GridCard>
          <GridCard title="How It Appears on the LSAT">
            <p>Background often appears at the beginning of a stimulus. It may introduce a study, a policy, a debate, a discovery, a law, a historical fact, or a general situation.</p>
          </GridCard>
          <GridCard title="Common Student Mistake">
            <p>Students often confuse context with support. Just because a sentence is true or relevant does not mean it is a premise.</p>
          </GridCard>
          <GridCard title="Short Example">
            <QuoteCard>
              <p>
                <em>Several cities have recently expanded their public bike-lane networks. City officials are now debating whether to expand the program further.</em>
              </p>
            </QuoteCard>
          </GridCard>
          <GridCard title="Labeled Breakdown">
            <BreakdownList
              items={[
                <span><strong>Background:</strong> Several cities have recently expanded their public bike-lane networks.</span>,
                <span><strong>Background:</strong> City officials are now debating whether to expand the program further.</span>,
                <span><strong>Author's Premise:</strong> None yet.</span>,
                <span><strong>Author's Conclusion:</strong> None yet.</span>,
              ]}
            />
          </GridCard>
          <GridCard title="Quick Takeaway">
            <p>Background tells you where the argument is happening. It does not necessarily tell you what the author is trying to prove.</p>
          </GridCard>
        </LessonSection>

        <LessonSection tocTitle="Attributions And Opposing Viewpoints" className="space-y-8">
          <SectionHeading title="2. Attributions and Opposing Viewpoints" subtitle="Whose view is this?" />
          <GridCard title="Plain English Definition">
            <p>An attribution introduces what someone else believes.</p>
            <p>The author may mention critics, experts, researchers, officials, opponents, or the public. That view may be something the author later challenges, qualifies, or rejects.</p>
          </GridCard>
          <GridCard title="How It Appears on the LSAT">
            <BulletList
              items={[
                "Some critics argue",
                "Many people believe",
                "Researchers have claimed",
                "It is often assumed",
                "Opponents maintain",
              ]}
            />
          </GridCard>
          <GridCard title="Common Student Mistake">
            <p>Students often mistake another person's view for the author's conclusion.</p>
            <p>Before calling something the conclusion, ask: <strong>Whose view is this?</strong></p>
          </GridCard>
          <GridCard title="Short Example">
            <QuoteCard>
              <p>
                <em>Some critics argue that the city should cancel the new transit plan.</em>
              </p>
            </QuoteCard>
          </GridCard>
          <GridCard title="Labeled Breakdown">
            <BreakdownList
              items={[
                <span><strong>Attribution:</strong> Some critics argue</span>,
                <span><strong>Opposing View:</strong> The city should cancel the new transit plan.</span>,
                <span><strong>Author's Conclusion:</strong> Not given yet.</span>,
              ]}
            />
          </GridCard>
          <GridCard title="Quick Takeaway">
            <p>If the sentence belongs to someone else, do not treat it as the author's conclusion.</p>
          </GridCard>
        </LessonSection>

        <LessonSection tocTitle="Opposing Support" className="space-y-8">
          <SectionHeading title="3. Opposing Support" subtitle="Not all evidence belongs to the author" />
          <GridCard title="Plain English Definition">
            <p>Opposing support is evidence given for someone else's view.</p>
            <p>It supports the opposing viewpoint, not necessarily the author's conclusion.</p>
          </GridCard>
          <GridCard title="How It Appears on the LSAT">
            <p>A stimulus may first introduce another person's claim, then give that side's reason, then pivot to the author's position.</p>
          </GridCard>
          <GridCard title="Common Student Mistake">
            <p>Students often see evidence and assume it must be the author's premise. But evidence only becomes the author's premise if it supports the author's conclusion.</p>
          </GridCard>
          <GridCard title="Short Example">
            <QuoteCard>
              <p>
                <em>Some critics argue that the city should cancel the new transit plan. They note that the project is already over budget.</em>
              </p>
            </QuoteCard>
          </GridCard>
          <GridCard title="Labeled Breakdown">
            <BreakdownList
              items={[
                <span><strong>Opposing View:</strong> The city should cancel the new transit plan.</span>,
                <span><strong>Opposing Support:</strong> The project is already over budget.</span>,
                <span><strong>Author's Premise:</strong> Not given yet.</span>,
                <span><strong>Author's Conclusion:</strong> Not given yet.</span>,
              ]}
            />
          </GridCard>
          <GridCard title="Quick Takeaway">
            <p>Not all support belongs to the author. First ask which claim the evidence is supporting.</p>
          </GridCard>
        </LessonSection>

        <LessonSection tocTitle="Concessions And Disclaimers" className="space-y-8">
          <SectionHeading title="4. Concessions / Disclaimers" subtitle="What the author gives away" />
          <GridCard title="Plain English Definition">
            <p>A concession is something the author admits, grants, or allows before making the real argument.</p>
            <p>The author accepts the point, but that point usually does not control the argument.</p>
          </GridCard>
          <GridCard title="How It Appears on the LSAT">
            <BulletList
              items={["although", "even though", "while", "granted", "admittedly", "to be sure", "despite"]}
            />
          </GridCard>
          <GridCard title="Common Student Mistake">
            <p>Students often mistake a concession for the author's main point because it sounds important or balanced.</p>
          </GridCard>
          <GridCard title="Short Example">
            <QuoteCard>
              <p>
                <em>Although vegetarian diets require careful planning, they can still provide complete nutrition.</em>
              </p>
            </QuoteCard>
          </GridCard>
          <GridCard title="Labeled Breakdown">
            <BreakdownList
              items={[
                <span><strong>Concession:</strong> Vegetarian diets require careful planning.</span>,
                <span><strong>Author's Main Direction:</strong> They can still provide complete nutrition.</span>,
              ]}
            />
          </GridCard>
          <GridCard title="Quick Takeaway">
            <p>A concession is something the author gives away before making the real point.</p>
          </GridCard>
        </LessonSection>

        <LessonSection tocTitle="Pivots" className="space-y-8">
          <SectionHeading title="5. Pivots" subtitle="The turn toward the author's actual position" />
          <GridCard title="Plain English Definition">
            <p>A pivot is the turn in the argument.</p>
            <p>It shows the moment when the author moves away from background, another person's view, opposing support, or a concession and toward the author's actual position.</p>
          </GridCard>
          <GridCard title="How It Appears on the LSAT">
            <BulletList
              items={["but", "however", "nevertheless", "still", "yet", "even so", "nonetheless", "despite this"]}
            />
          </GridCard>
          <GridCard title="Common Student Mistake">
            <p>Students often ignore pivot words and accidentally choose the opposing view or concession as the conclusion.</p>
          </GridCard>
          <GridCard title="Short Example">
            <QuoteCard>
              <p>
                <em>Many residents oppose the new transit plan because it is expensive. However, the city should move forward with it because it will reduce traffic over time.</em>
              </p>
            </QuoteCard>
          </GridCard>
          <GridCard title="Labeled Breakdown">
            <BreakdownList
              items={[
                <span><strong>Opposing View:</strong> Many residents oppose the new transit plan.</span>,
                <span><strong>Opposing Support:</strong> It is expensive.</span>,
                <span><strong>Pivot:</strong> However</span>,
                <span><strong>Author's Conclusion:</strong> The city should move forward with the plan.</span>,
                <span><strong>Author's Premise:</strong> It will reduce traffic over time.</span>,
              ]}
            />
          </GridCard>
          <GridCard title="Quick Takeaway">
            <p>When the author pivots, pay attention. The real conclusion often appears after the turn.</p>
          </GridCard>
        </LessonSection>

        <LessonSection tocTitle="Full Argument Examples" className="space-y-8">
          <SectionHeading title="Applied Labeled Examples" subtitle="Putting the pieces together" />
          <div className="grid gap-5">
            <GridCard title="Example 1: Vegetarian Diets">
              <QuoteCard>
                <p>
                  <em>Many nutritionists argue that vegetarian diets make it difficult to get enough protein. They point out that meat contains all essential amino acids. Although vegetarian diets require more planning, plant-based diets can provide complete nutrition when properly balanced. Therefore, most people can be healthy without eating meat.</em>
                </p>
              </QuoteCard>
              <BreakdownList
                items={[
                  <span><strong>Background:</strong> None.</span>,
                  <span><strong>Opposing View:</strong> Many nutritionists argue that vegetarian diets make it difficult to get enough protein.</span>,
                  <span><strong>Opposing Support:</strong> Meat contains all essential amino acids.</span>,
                  <span><strong>Concession:</strong> Vegetarian diets require more planning.</span>,
                  <span><strong>Pivot:</strong> Although.</span>,
                  <span><strong>Author's Premise:</strong> Plant-based diets can provide complete nutrition when properly balanced.</span>,
                  <span><strong>Author's Conclusion:</strong> Most people can be healthy without eating meat.</span>,
                  <span><strong>Why the conclusion is the conclusion:</strong> It is the author's own claim and it is supported by the statement about balanced plant-based diets.</span>,
                ]}
              />
            </GridCard>
            <GridCard title="Example 2: Museum Funding">
              <QuoteCard>
                <p>
                  <em>The city museum has operated at a deficit for three years. Some taxpayers argue that public funding for the museum should be eliminated. They point out that only a small percentage of residents visit the museum each year. However, the museum provides free educational programs for local schools, so the city should continue funding it.</em>
                </p>
              </QuoteCard>
              <BreakdownList
                items={[
                  <span><strong>Background:</strong> The city museum has operated at a deficit for three years.</span>,
                  <span><strong>Opposing View:</strong> Public funding for the museum should be eliminated.</span>,
                  <span><strong>Opposing Support:</strong> Only a small percentage of residents visit the museum each year.</span>,
                  <span><strong>Concession:</strong> None explicit.</span>,
                  <span><strong>Pivot:</strong> However.</span>,
                  <span><strong>Author's Premise:</strong> The museum provides free educational programs for local schools.</span>,
                  <span><strong>Author's Conclusion:</strong> The city should continue funding it.</span>,
                  <span><strong>Why the conclusion is the conclusion:</strong> It is the author's recommendation and it is supported by the educational-programs premise.</span>,
                ]}
              />
            </GridCard>
            <GridCard title="Example 3: Online Classes">
              <QuoteCard>
                <p>
                  <em>Online courses have become more common at many universities. Critics claim that these courses are inferior to in-person classes because students interact less with instructors. While some online courses are poorly designed, well-run online courses can include frequent discussion, feedback, and live meetings. Thus, universities should not reject online courses as a category.</em>
                </p>
              </QuoteCard>
              <BreakdownList
                items={[
                  <span><strong>Background:</strong> Online courses have become more common at many universities.</span>,
                  <span><strong>Opposing View:</strong> Online courses are inferior to in-person classes.</span>,
                  <span><strong>Opposing Support:</strong> Students interact less with instructors.</span>,
                  <span><strong>Concession:</strong> Some online courses are poorly designed.</span>,
                  <span><strong>Pivot:</strong> While.</span>,
                  <span><strong>Author's Premise:</strong> Well-run online courses can include frequent discussion, feedback, and live meetings.</span>,
                  <span><strong>Author's Conclusion:</strong> Universities should not reject online courses as a category.</span>,
                  <span><strong>Why the conclusion is the conclusion:</strong> It is the author's recommendation and it is supported by the premise about well-run courses.</span>,
                ]}
              />
            </GridCard>
            <GridCard title="Example 4: Traffic Cameras">
              <QuoteCard>
                <p>
                  <em>Several intersections in the city have high accident rates. Many drivers believe traffic cameras are mainly a way for the city to collect fines. Granted, the cameras will generate some revenue. Still, intersections with cameras in nearby cities have seen fewer serious crashes, so installing cameras at the most dangerous intersections would improve public safety.</em>
                </p>
              </QuoteCard>
              <BreakdownList
                items={[
                  <span><strong>Background:</strong> Several intersections in the city have high accident rates.</span>,
                  <span><strong>Opposing View:</strong> Traffic cameras are mainly a way for the city to collect fines.</span>,
                  <span><strong>Opposing Support:</strong> None explicit.</span>,
                  <span><strong>Concession:</strong> The cameras will generate some revenue.</span>,
                  <span><strong>Pivot:</strong> Still.</span>,
                  <span><strong>Author's Premise:</strong> Intersections with cameras in nearby cities have seen fewer serious crashes.</span>,
                  <span><strong>Author's Conclusion:</strong> Installing cameras at the most dangerous intersections would improve public safety.</span>,
                  <span><strong>Why the conclusion is the conclusion:</strong> It is the claim the author is trying to prove with the nearby-cities evidence.</span>,
                ]}
              />
            </GridCard>
            <GridCard title="Example 5: Local Bookstores">
              <QuoteCard>
                <p>
                  <em>Large online retailers often sell books at lower prices than independent bookstores. It is often assumed that local bookstores cannot compete with them. But local bookstores host community events, recommend books personally, and create spaces for readers to meet. Therefore, independent bookstores can remain valuable even when they cannot match online prices.</em>
                </p>
              </QuoteCard>
              <BreakdownList
                items={[
                  <span><strong>Background:</strong> Large online retailers often sell books at lower prices than independent bookstores.</span>,
                  <span><strong>Opposing View:</strong> Local bookstores cannot compete with large online retailers.</span>,
                  <span><strong>Opposing Support:</strong> The lower-price comparison supports that assumption.</span>,
                  <span><strong>Concession:</strong> Local bookstores cannot always match online prices.</span>,
                  <span><strong>Pivot:</strong> But.</span>,
                  <span><strong>Author's Premise:</strong> Local bookstores host events, recommend books personally, and create spaces for readers to meet.</span>,
                  <span><strong>Author's Conclusion:</strong> Independent bookstores can remain valuable even when they cannot match online prices.</span>,
                  <span><strong>Why the conclusion is the conclusion:</strong> It is the author's own judgment and the community-value premise supports it.</span>,
                ]}
              />
            </GridCard>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Trap Patterns" className="space-y-8">
          <SectionHeading title="Trap Patterns" subtitle="The common mistakes" />
          <div className="grid gap-5">
            <GridCard title="Trap 1: Mistaking an opposing view for the author's conclusion">
              <p>If a sentence is introduced with "some critics argue" or "many people believe," it probably belongs to someone else.</p>
              <p>Ask: <strong>Whose view is this?</strong></p>
            </GridCard>
            <GridCard title="Trap 2: Mistaking background information for a premise">
              <p>Context can be relevant without supporting the author's claim.</p>
              <p>Ask: <strong>Is this actually being used as evidence?</strong></p>
            </GridCard>
            <GridCard title="Trap 3: Mistaking a concession for the author's main point">
              <p>A concession is usually something the author grants before turning to the real argument.</p>
              <p>Ask: <strong>Is the author resting on this point, or moving past it?</strong></p>
            </GridCard>
            <GridCard title="Trap 4: Ignoring pivot words">
              <p>Pivots often show the author's turn.</p>
              <p>Ask: <strong>What changed after the pivot?</strong></p>
            </GridCard>
            <GridCard title="Trap 5: Treating every factual statement as support">
              <p>A factual statement is not automatically a premise. It must support the author's conclusion.</p>
              <p>Ask: <strong>What claim does this fact support?</strong></p>
            </GridCard>
            <GridCard title="Trap 6: Thinking the first strong opinion must be the conclusion">
              <p>The first strong opinion may belong to critics, researchers, opponents, or the public.</p>
              <p>Ask: <strong>Is this the author's own position?</strong></p>
            </GridCard>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Final Teaching Summary" className="space-y-8 border-b-0">
          <SectionHeading title="Final Teaching Summary" subtitle="Sort everything around the author's claim" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>LR stimuli contain more than premises and conclusions.</p>
            <p>Before you label a sentence, ask what job it is doing.</p>
          </div>
          <BulletList
            items={[
              "Background sets the scene.",
              "Attributions introduce someone else's view.",
              "Opposing support backs someone else's view.",
              "Concessions give something away.",
              "Pivots turn toward the author's real position.",
            ]}
          />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The author's conclusion is the claim the author is trying to prove.</p>
            <p>Everything else must be sorted around that.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
  "two-part-conclusion-check": {
    eyebrow: "Page 8",
    title: "The 2-Part Conclusion Check",
    subtitle: "Two questions. Both must be yes. It is the cleanest way to verify the main conclusion.",
    content: (
      <>
        <LessonSection tocTitle="The 2-Part Conclusion Check" className="space-y-8">
          <SectionHeading title="The 2-Part Conclusion Check" subtitle="The one tool that does not lie" />
          <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">The one tool that does not lie. Two questions. Both must be yes.</p>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Finding the main conclusion sounds easy until the LSAT gives you five sentences that all feel important.</p>
            <p>One sentence gives background.</p>
            <p>One sentence introduces another person's opinion.</p>
            <p>One sentence concedes something.</p>
            <p>One sentence sounds like a conclusion but is really just support.</p>
            <p>And the real conclusion may be hiding in the middle.</p>
            <p>That is why you need a simple filter.</p>
            <p>This is that filter.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="The Check" className="space-y-8">
          <SectionHeading title="The Check" subtitle="Run these two questions on every candidate" />
          <CalloutCard className="bg-white">
            <NumberList
              items={[
                <span><strong>Is this the author's own opinion?</strong><br />In other words, is this a claim someone could reasonably disagree with?</span>,
                <span><strong>Is this claim supported by at least one other explicit statement in the stimulus?</strong><br />In other words, does something else in the argument give us a reason to believe it?</span>,
              ]}
            />
          </CalloutCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Both answers must be <strong>yes</strong>.</p>
            <p>If either answer is <strong>no</strong>, that sentence is not the main conclusion.</p>
            <p>A factual statement usually fails the first question. Facts are not the author's opinion. The author is using them as evidence.</p>
            <p>An unsupported claim fails the second question. If nothing else in the stimulus is backing it up, it is not being argued for.</p>
            <p>A concession fails the first question. The author may admit it, but it is not the author's main point. A concession is something the author gives to the other side before making their own argument.</p>
            <p><strong>Two questions. Two yeses. No exceptions.</strong></p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Why This Works" className="space-y-8">
          <SectionHeading title="Why This Works" subtitle="Turn the definition into a filter" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>A conclusion is the claim the author is trying to prove.</p>
            <p>That means two things have to be true:</p>
            <p>First, the claim has to belong to the author.</p>
            <p>Second, the claim has to be supported by something else in the stimulus.</p>
            <p>That is all the 2-Part Conclusion Check is doing. It turns the definition of a conclusion into two simple yes-or-no questions.</p>
            <p>If a sentence passes both parts, it is probably the conclusion.</p>
            <p>If it fails either part, it is doing some other job. It may be background, a premise, an opposing view, a concession, or just setup.</p>
            <p>Keep looking.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Apatosaurus Argument" className="space-y-8">
          <SectionHeading title="Example: The Apatosaurus Argument" subtitle="Run the check on each claim" />
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">Here is a simple rebuttal argument:</p>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Some paleontologists suggest the Apatosaurus was able to gallop. However, this is unlikely. Experiments show the strain of galloping would have broken their legs.</em>
            </p>
          </QuoteCard>
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">There are three claims here. Only one is the main conclusion.</p>
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">Let's run the check.</p>
        </LessonSection>

        <LessonSection tocTitle="Claim A" className="space-y-8">
          <SectionHeading title="Claim A" subtitle="The attributed view" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Some paleontologists suggest the Apatosaurus was able to gallop.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Is this the author's own opinion?</p>
            <p>No.</p>
            <p>This is an attribution. The author is telling us what some paleontologists believe. That means it belongs to someone else, not the author.</p>
            <p>Claim A fails the first question.</p>
            <p>So it is not the conclusion.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Claim B" className="space-y-8">
          <SectionHeading title="Claim B" subtitle="The author's position" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>However, this is unlikely.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Is this the author's own opinion?</p>
            <p>Yes.</p>
            <p>The word "however" tells us the author is pushing back against the paleontologists. The author is saying that the Apatosaurus probably could not gallop.</p>
            <p>Is this claim supported by something else in the stimulus?</p>
            <p>Yes.</p>
            <p>The next sentence gives the reason: galloping would have placed so much strain on the Apatosaurus's legs that the legs would have broken.</p>
            <p>Claim B passes both questions.</p>
            <p>So Claim B is the main conclusion.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Claim C" className="space-y-8">
          <SectionHeading title="Claim C" subtitle="The supporting evidence" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <em>Experiments show the strain of galloping would have broken their legs.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Is this the author's own opinion?</p>
            <p>Not really.</p>
            <p>This is presented as an experimental finding. The author is not trying to prove that the experiments happened. The author is using the experiments as evidence.</p>
            <p>Is this claim supported by something else in the stimulus?</p>
            <p>No.</p>
            <p>Nothing else is offered to prove Claim C. Instead, Claim C supports Claim B.</p>
            <p>That makes Claim C a premise, not a conclusion.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="What The Argument Is Doing" className="space-y-8">
          <SectionHeading title="What the Argument Is Doing" subtitle="See the structure clearly" />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The argument has a simple structure:</p>
          </div>
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>Some people say the Apatosaurus could gallop.</p>
            <p>But that is unlikely.</p>
            <p>Why? Because experiments show galloping would have broken its legs.</p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>The main conclusion is:</p>
          </div>
          <QuoteCard className="bg-white pr-6">
            <p>
              <em>This is unlikely.</em>
            </p>
          </QuoteCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>That is the author's position, and the experiment sentence supports it.</p>
            <p>The word "however" helped us notice the shift. It marked the moment where the author moved away from someone else's view and introduced their own.</p>
            <p>But indicator words only give hints. They do not prove the structure by themselves.</p>
            <p>The 2-Part Check confirms it.</p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Remember" className="space-y-8 border-b-0">
          <SectionHeading title="Remember" subtitle="Two questions. Two yeses." />
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>For every possible conclusion, ask:</p>
          </div>
          <CalloutCard className="bg-white">
            <NumberList
              items={[
                <span><strong>Is this the author's own opinion?</strong></span>,
                <span><strong>Is this supported by something else in the stimulus?</strong></span>,
              ]}
            />
          </CalloutCard>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Both must be yes.</p>
            <p>One no means it is not the main conclusion.</p>
            <p>Run this check on every Main Conclusion question.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
};

export function IntroLessonPage({ pageId }: { pageId: IntroLessonPageId }) {
  const page = pages[pageId];

  return (
    <IntroNotesShell eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle}>
      {page.content}
    </IntroNotesShell>
  );
}
