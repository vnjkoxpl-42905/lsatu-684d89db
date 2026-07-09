import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { ConclusionPicker } from "@/bootcamps/main-conclusion/components/conclusion-picker/ConclusionPicker";
import {
  IndicatorPillGroup,
  InteractiveCard,
  PremiseIndicatorLab,
  SupportSimulator,
  XRayExample,
  ConclusionIndicatorLab,
} from "./NoteInteractions";
import { PremiseSupportCheck } from "./components/PremiseSupportCheck";
import { IndicatorPopQuiz } from "./components/IndicatorPopQuiz";
import { QuestionAnatomyScanner } from "./components/QuestionAnatomyScanner";
import { ConclusionTypeSwitchboard } from "./components/ConclusionTypeSwitchboard";
import { ConclusionTypeCard } from "./components/ConclusionTypeCard";
import { RoleSpotlightSequence } from "./components/RoleSpotlightSequence";
import { RoleLabeler, type RoleLabelerRole } from "./components/RoleLabeler";
import { TwoPartConclusionCheckMachine } from "./components/TwoPartConclusionCheckMachine";
import {
  ClaimBucketInspector,
  FabsHoverMiniTool,
} from "@/bootcamps/main-conclusion/components/reference-templates/ArgumentsFoundationsMiniInteractions";
import { ContentVignette } from "@/components/bootcamp/ContentVignette";

export type IntroLessonPageId =
  | "three-parts-lr-question"
  | "so-an-argument"
  | "premises"
  | "conclusions"
  | "five-types-of-conclusions"
  | "beyond-premises-and-conclusions"
  | "two-part-conclusion-check"
  | "first-sentence-vs-rebuttal-structures";

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
  prominent = false,
}: {
  children: ReactNode;
  className?: string;
  prominent?: boolean;
}) => (
  <InteractiveCard prominent={prominent} className={cn("bg-[#FBF8F1] p-6 md:p-8", className)}>
    {children}
  </InteractiveCard>
);

const GridCard = ({
  title,
  children,
  prominent = false,
}: {
  title: string;
  children: ReactNode;
  prominent?: boolean;
}) => (
  <InteractiveCard prominent={prominent} focusable className="p-6 md:p-8">
    <h3 className="mb-4 font-serif text-[28px] italic leading-tight text-[#1a1a1a]">{title}</h3>
    <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">{children}</div>
  </InteractiveCard>
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

const PremiseRememberCallout = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[14px] border border-[#E6D6B2] border-l-[#C79B45] border-l-4 bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF6EA_100%)] px-6 py-5 shadow-[0_14px_30px_rgba(92,67,20,0.06)]">
    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#74541B]">Remember</div>
    <div className="text-[18px] leading-[1.72] text-[rgba(26,26,26,0.84)]">{children}</div>
  </div>
);


const PremiseSystemFrame = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-[28px] border border-[rgba(116,84,27,0.14)] bg-[linear-gradient(180deg,#FFFDFC_0%,#FFF8EE_100%)] shadow-[0_22px_46px_rgba(92,67,20,0.08)]">
    {children}
  </div>
);

const PremiseSystemSection = ({
  tocTitle,
  children,
  className,
  border = true,
}: {
  tocTitle: string;
  children: ReactNode;
  className?: string;
  border?: boolean;
}) => (
  <section
    data-toc
    data-toc-title={tocTitle}
    className={cn("px-10 py-10 md:px-12 md:py-12", border && "border-b border-[rgba(116,84,27,0.12)]", className)}
  >
    {children}
  </section>
);

const PremiseKeyRule = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[18px] border border-[rgba(116,84,27,0.16)] bg-white/80 px-6 py-5 shadow-[0_14px_26px_rgba(92,67,20,0.05)]">
    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B6A2F]">Key Rule</div>
    <div className="text-[18px] leading-[1.72] text-[rgba(26,26,26,0.82)]">{children}</div>
  </div>
);

const PremiseSummarySlabs = () => (
  <div className="grid gap-4 lg:grid-cols-2">
    <div className="rounded-[20px] border border-[#C9D8EA] bg-[#F7FBFE] px-6 py-5 shadow-[0_12px_24px_rgba(36,66,93,0.06)]">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#4C79B8]">Are</div>
      <p className="text-[18px] leading-[1.72] text-[rgba(26,26,26,0.84)]">The facts. The evidence. Accept them as true.</p>
    </div>
    <div className="rounded-[20px] border border-[#E6D6B2] bg-[#FFF9F1] px-6 py-5 shadow-[0_12px_24px_rgba(116,84,27,0.06)]">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#8B6A2F]">Are Not</div>
      <p className="text-[18px] leading-[1.72] text-[rgba(26,26,26,0.84)]">Not questionable. Don't depend on the conclusion. Don't depend on each other.</p>
    </div>
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

const ROLE_LABELER_ROLES: RoleLabelerRole[] = [
  { id: "background", label: "Background", tone: "background" },
  { id: "opposing-view", label: "Opposing View", tone: "opposing" },
  { id: "concession", label: "Concession", tone: "concession" },
  { id: "pivot", label: "Pivot", tone: "pivot" },
  { id: "author-premise", label: "Author's Premise", tone: "premise" },
  { id: "author-conclusion", label: "Author's Conclusion", tone: "conclusion" },
];

const BeyondPremisesAndConclusions = () => {
  const [hoveredRoleTitle, setHoveredRoleTitle] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <LessonSection tocTitle="The Mindset Shift" className="space-y-16">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative py-12 px-8 border-l-2 border-[oklch(0.2_0.01_60/0.1)] bg-[oklch(0.98_0.005_60)] rounded-r-2xl"
        >
          <p className="font-serif text-[32px] md:text-[40px] italic leading-[1.1] text-[oklch(0.15_0.01_60)] tracking-tight">
            Do not ask what the sentence says. <br />
            Ask <span className="text-[oklch(0.65_0.12_85)] underline decoration-[oklch(0.65_0.12_85/0.3)] underline-offset-8">what job</span> it is doing.
          </p>
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
            <div className="text-[120px] font-serif italic leading-none">!</div>
          </div>
        </motion.div>

        <div className="space-y-6 text-body-prose text-[oklch(0.2_0.01_60/0.76)] max-w-[64ch]">
          <p className="text-[20px] font-medium text-[oklch(0.15_0.01_60)] leading-snug">
            A sentence may sound important and still not be the author's conclusion.
          </p>
          <p>The role matters more than the topic. Your job is to separate the author's argument from everything around it.</p>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Role Guide" className="space-y-16">
        <SectionHeading title="Role Guide" subtitle="A compact guide to Background, Opposing Viewpoint, Concession, and Pivot." />
        {[
          {
            title: "Background",
            subtitle: "Context setting",
            definition: "Sets the stage. It tells you what the argument is about, but it is not automatically evidence for the author's conclusion.",
            example: "Several cities have recently expanded their bike-lane networks.",
            read: "Do not hunt for a keyword here. Ask whether the sentence is setting the scene or proving the author’s point.",
            trap: "Treating relevant context as support. Relevance is not enough. A premise has to support the author's conclusion."
          },
          {
            title: "Opposing Viewpoint",
            subtitle: "Other People's Views",
            definition: "Someone else's view, often included so the author can respond to it. Sometimes the stimulus gives reasons for someone else’s view. Treat that as part of the opposing-view setup. Ask whose point the sentence is supporting.",
            example: "Critics argue that the new transit plan is too expensive.",
            read: "Do not hunt for a keyword here. Ask whose view the sentence belongs to.",
            trap: "Mistaking another person's view for the author's conclusion."
          },
          {
            title: "Concession",
            subtitle: "What the author gives away",
            definition: "Something the author admits, grants, or allows before making the real argument.",
            example: "Although vegetarian diets require careful planning, they can still provide complete nutrition.",
            read: "Useful indicators: although, while, despite, granted, admittedly, though it is true, yes, it is true that, naturally.",
            trap: "Mistaking a concession for the author's main point because it sounds important or balanced."
          },
          {
            title: "Pivot",
            subtitle: "The turn to the author's position",
            definition: "The turn in the argument, showing the move away from other material toward the author's actual position.",
            example: "Many residents oppose the plan. However, the city should move forward.",
            read: "Useful indicators: but, yet, however, nevertheless, nonetheless, on the other hand.",
            trap: "Ignoring pivot words and accidentally choosing the opposing view or concession as the conclusion."
          }
        ].map((role, i) => (
          <motion.div 
            key={role.title} 
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div className="flex items-baseline gap-4">
              <h3 className="font-serif text-[32px] italic text-[oklch(0.15_0.01_60)] tracking-tight">{role.title}</h3>
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)]">{role.subtitle}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)] mb-4">What it is</h4>
                  <p className="text-[17px] leading-relaxed text-[oklch(0.2_0.01_60/0.76)]">{role.definition}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)] mb-4">How to read it</h4>
                  {role.read.startsWith("Useful indicators:") ? (
                    <div className="space-y-4 pt-1">
                      <p className="text-[12px] font-bold uppercase tracking-wider text-[oklch(0.2_0.01_60/0.3)]">Useful indicators:</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-3">
                        {role.read.replace("Useful indicators: ", "").split(", ").map(word => (
                          <motion.span 
                            key={word}
                            onMouseEnter={() => setHoveredRoleTitle(role.title)}
                            onMouseLeave={() => setHoveredRoleTitle(null)}
                            animate={!reducedMotion && hoveredRoleTitle === role.title ? {
                              scale: [1, 1.05, 1],
                              transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                            } : { scale: 1 }}
                            className={cn(
                              "mc-shine px-3 py-1.5 rounded-lg text-[11.5px] font-mono tracking-wider border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all cursor-default select-none bg-white",
                              role.title === "Concession" && "border-role-concession/30 text-[oklch(0.4_0.15_85)] hover:border-role-concession/50 hover:shadow-md",
                              role.title === "Pivot" && "border-role-pivot/30 text-[oklch(0.4_0.15_45)] hover:border-role-pivot/50 hover:shadow-md",
                              role.title !== "Concession" && role.title !== "Pivot" && "border-[oklch(0.2_0.01_60/0.08)] text-[oklch(0.2_0.01_60/0.8)] hover:border-[oklch(0.2_0.01_60/0.15)]"
                            )}
                          >
                            {word}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[17px] leading-relaxed text-[oklch(0.2_0.01_60/0.76)]">{role.read}</p>
                  )}
                </div>
              </div>
              <div className="space-y-8">
                <div className="rounded-[20px] border border-[oklch(0.2_0.01_60/0.08)] bg-[oklch(0.98_0.005_60)] p-8 shadow-sm">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.65_0.12_85)] mb-4">Example</h4>
                  <p className="text-[20px] leading-relaxed text-[oklch(0.15_0.01_60)] font-serif italic">{`"${role.example}"`}</p>
                </div>
                <div className="rounded-[20px] border border-mc-error/10 bg-mc-error/5 p-8">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-mc-error/60 mb-4">Common trap</h4>
                  <p className="text-[16px] leading-relaxed text-[oklch(0.2_0.01_60/0.76)]">{role.trap}</p>
                </div>
              </div>
            </div>
            {i < 3 && <div className="h-px bg-[oklch(0.2_0.01_60/0.06)] pt-12" />}
          </motion.div>
        ))}
      </LessonSection>
      
      <LessonSection tocTitle="Final Summary" className="space-y-16 border-b-0 pb-20">
        <SectionHeading title="Final Summary" subtitle="Keep the core rule in mind" />
        <div className="space-y-6 text-body-prose text-[oklch(0.2_0.01_60/0.76)] max-w-[64ch]">
          <p>Mastering LR requires more than just spotting the conclusion. It requires active reading to identify the function of every sentence.</p>
          <p>Background, Opposing Viewpoint, Concession, and Pivot are all common structures that distract from the main point.</p>
          <p>By labeling these roles, you keep the argument itself clear and shielded from distractions.</p>
        </div>
      </LessonSection>
    </>
  );
};

const pages: Record<IntroLessonPageId, PageDefinition> = {
  "three-parts-lr-question": {
    eyebrow: "",
    title: "The Three Parts of an LR Question",
    subtitle: "Every question has a stimulus, a question stem, and answer choices, but the reasoning lives in the stimulus.",
    content: (
      <>
        <LessonSection tocTitle="Structural Triad" className="space-y-8">
          <SectionHeading title="Structural Triad" subtitle="The Three Parts of an LR Question" />
          <CalloutCard className="bg-white">
            <div className="space-y-5">
              <p className="text-[22px] leading-[1.75] text-[#1a1a1a]">
                Every Logical Reasoning question has three parts: the stimulus, the question stem, and the answer choices.
              </p>
              <BulletList
                className="space-y-2 pl-5 text-[18px] leading-[1.65] text-[rgba(26,26,26,0.78)]"
                items={[
                  <span><strong>Stimulus first.</strong></span>,
                  <span><strong>Question stem second.</strong></span>,
                  <span><strong>Answer choices third.</strong></span>,
                ]}
              />
              <p className="text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]">
                The stimulus matters most because the reasoning lives there. The question stem tells you the task. The
                answer choices test whether you understood the stimulus.
              </p>
            </div>
          </CalloutCard>
        </LessonSection>

        <LessonSection tocTitle="The Anatomy of a Logical Reasoning Question" className="space-y-8 border-b-0">
          <SectionHeading title="Structure Example" subtitle="The Anatomy of a Logical Reasoning Question" />
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            This is one normal LR question. Touch the visible parts in order, then run the structure view on the
            stimulus itself.
          </p>
          <QuestionAnatomyScanner />
          <CalloutCard className="bg-white" prominent>
            <div className="space-y-3 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
              <p><strong>Stimulus:</strong> The stimulus is the content you are being asked about.</p>
              <p><strong>Question Stem:</strong> The Question stem tells you the task.</p>
              <p><strong>Answer Choices:</strong> The answer choices list the possible answers.</p>
            </div>
          </CalloutCard>
        </LessonSection>
      </>
    ),
  },
  "so-an-argument": {
    eyebrow: "",
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

        <LessonSection tocTitle="A conclusion needs support" className="space-y-8">
          <SupportSimulator />
        </LessonSection>

        <LessonSection tocTitle="Core Takeaway" className="space-y-8 border-b-0">
          <SectionHeading title="Core Takeaway" subtitle="Evidence and claims" />
          <QuoteCard className="bg-[#FBF8F1] pr-6">
            <p>
              <strong>Arguments are the relationships between Premises and Conclusions.</strong>
            </p>
            <p>Premises hold the conclusion up. Without premises a conclusion has no support.</p>
          </QuoteCard>
        </LessonSection>
      </>
    ),
  },
  premises: {
    eyebrow: "",
    title: "Premises",
    subtitle: "Premises are the facts and evidence you accept as true; the real question is how they connect to the conclusion.",
    content: (
      <>
        <div className="space-y-8">
          <PremiseSystemFrame>
            <PremiseSystemSection tocTitle="Statements Of Fact" className="space-y-9 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,252,245,0.72)_100%)]">
              <SectionHeading title="Premises" subtitle="Statements of fact" />
              
              <QuoteCard className="bg-[#FBF8F1] pr-6">
                <p className="font-semibold text-lg text-[#1a1a1a]">Premises are just the facts. The evidence.</p>
                <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">They describe how the world is, and on the LSAT, you accept them as true, full stop.</p>
              </QuoteCard>

              <div className="space-y-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
                <p className="font-medium text-[#1a1a1a]">In real life, we attack the facts:</p>
                <div className="border-l-4 border-[#E8D08B] pl-6 py-2 space-y-3">
                    <p className="italic text-gray-700">"We should cancel the picnic because the park is flooded."</p>
                    <p className="font-semibold text-[#1a1a1a]">"Actually, the park is dry and the forecast is clear."</p>
                </div>
                <p>In real life, you'd attack the facts they used to support the conclusion.</p>
                <div className="relative overflow-hidden rounded-xl border-l-4 border-[#B91C1C] bg-[linear-gradient(180deg,rgba(254,242,242,0.95)_0%,rgba(254,226,226,0.75)_100%)] px-6 py-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B91C1C]">Never on the LSAT</p>
                  <p className="text-[17px] font-semibold text-[#1a1a1a]">Do not attack the premises.</p>
                  <p className="text-[16px] leading-[1.65] text-[rgba(26,26,26,0.82)]">
                    The LSAT will <strong>never</strong> ask you to question whether a premise is true. Premises are handed
                    to you as fact — arguing "actually, the park isn't flooded" is not a move that exists in this test.
                    If you catch yourself doubting the evidence, stop. That instinct is for real life, not for LR.
                  </p>
                </div>
              </div>

              
              <PremiseRememberCallout>
                <p>On the LSAT, premises are given. Accept them as true, then ask what they are being used to support.</p>
              </PremiseRememberCallout>
              <PremiseKeyRule>
                <p>
                  What you focus on instead is how the premises connect to the conclusion. Whether they actually support the
                  claim the author is making. That's the whole game.
                </p>
              </PremiseKeyRule>
            </PremiseSystemSection>

            <PremiseSystemSection tocTitle="What Premises Are And Aren't" className="space-y-9">
              <SectionHeading title="What Premises Are and Aren't" subtitle="What they do in the argument" />
              <PremiseSummarySlabs />
              <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
                <p>Premises do the argument's heavy lifting. They're the evidence that makes the conclusion worth anything.</p>
                <p>
                  They are not questionable. Not on the LSAT. They don't depend on the conclusion or on each other. They just
                  exist, solid, already true, handed to you for free.
                </p>
              </div>
              <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
                <p>
                  It doesn't ask you to poke holes in the evidence. It asks you whether the evidence actually leads where the
                  author thinks it does. That's a harder, more useful question, and it's the one that gets you points.
                </p>
                <p>
                  <strong>Premises are defined by their relationship to the conclusion.</strong> That's the key. A sentence isn't a premise because of what it says. It's a premise because of what it's doing in the argument: supporting the claim.
                </p>
              </div>
            </PremiseSystemSection>

            <PremiseSystemSection tocTitle="Premise Indicators" className="space-y-9 bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(255,250,241,0.78)_100%)]" border={false}>
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
              <div className="space-y-6">
                <PremiseIndicatorLab />
                <PremiseSupportCheck />
              </div>
              <PremiseRememberCallout>
                <p>
                  Accept premises as true. Don't debate them. Focus on whether they support the conclusion.
                </p>
              </PremiseRememberCallout>
            </PremiseSystemSection>
          </PremiseSystemFrame>
        </div>
      </>
    ),
  },
  conclusions: {
    eyebrow: "THE MAIN POINT",
    title: "Conclusions: The Author's Claim",
    subtitle: "Conclusions are the author's claims and judgments; they are the part of the argument you question.",
    content: (
      <>
        <LessonSection tocTitle="The Author's Claim" className="space-y-8">
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Conclusions are the judgments the author makes. They are the main point the author wants you to accept. This is the part of the argument you should examine most carefully.</p>
          </div>

          <QuoteCard className="bg-[#FBF8F1] pr-6 border-l-4 border-l-[#D5AD5F]">
            <p>
              <strong>Key rule:</strong> The conclusion is the part of the argument you should be most suspicious of. Ask whether it is too strong, whether it goes beyond the evidence, whether the author assumed something missing, and whether the premises really get us there.
            </p>
          </QuoteCard>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[12px] border border-[#D5E7CF] bg-[#FBFDF8] p-5">
              <span className="text-[12px] font-bold text-[#2F5B35] uppercase tracking-wider block mb-2">ARE:</span>
              <ul className="list-disc list-inside text-[16px] text-[#2F5B35] space-y-1">
                <li>Author's claim</li>
                <li>The point argued for</li>
                <li>Part you question</li>
              </ul>
            </div>
            <div className="rounded-[12px] border border-[#E6D6B2] bg-[#FEFBF2] p-5">
              <span className="text-[12px] font-bold text-[#74541B] uppercase tracking-wider block mb-2">ARE NOT:</span>
              <ul className="list-disc list-inside text-[16px] text-[#74541B] space-y-1">
                <li>Automatically proven</li>
                <li>Self-supporting</li>
                <li>Always clear</li>
              </ul>
            </div>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Conclusion Indicators" className="space-y-8">
          <ConclusionIndicatorLab />
          <IndicatorPopQuiz />
          <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
                  One quick rep
                </div>
                <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
                  Pick the conclusion before the page tells you
                </h3>
                <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
                  Read the whole argument first. Then pick the sentence the rest is trying to support.
                </p>
              </div>
              <ConclusionPicker
                stimulus="The city museum has operated at a deficit for three years. However, the museum provides free educational programs for local schools. Therefore, the city should continue funding it."
                candidates={[
                  {
                    id: "museum-background",
                    text: "The city museum has operated at a deficit for three years.",
                    is_main: false,
                    rationale: "This sets the scene. It matters to the topic, but the author is not trying to prove that this deficit exists.",
                  },
                  {
                    id: "museum-premise",
                    text: "The museum provides free educational programs for local schools.",
                    is_main: false,
                    rationale: "This is support. It is one reason the author gives for the funding recommendation.",
                  },
                  {
                    id: "museum-conclusion",
                    text: "The city should continue funding it.",
                    is_main: true,
                    rationale: "This is the author's recommendation, and the educational-programs sentence is offered to support it.",
                  },
                ]}
              />
            </div>
          </InteractiveCard>
        </LessonSection>

        <LessonSection tocTitle="Do Not Just Hunt" className="space-y-8 border-b-0">
          <SectionHeading title="Don't Just Hunt for Indicator Words" subtitle="Read structure, not just packaging" />
          
          <div className="space-y-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Here's the thing, though. Indicator words are a tool, not a crutch.</p>
            
            <QuoteCard className="bg-[#FBF8F1] pr-6">
              <p>
                <strong>The goal is to change the way you think about sentences, not just tag them.</strong>
              </p>
              <p className="mt-2 text-sm text-[rgba(26,26,26,0.7)]">They won't always be there. If your entire strategy is seek-and-find, you'll be stuck.</p>
            </QuoteCard>

            <p>
              So go deeper. Ask yourself about the personality of each statement. Is it a fact, or is it a claim? Is it
              something being offered as evidence, or something being argued for? Facts are premises. Claims are
              conclusions.
            </p>
            <p>
              That instinct, reading the role of a sentence rather than hunting for a keyword, is what separates students
              who understand arguments from students who just sort of navigate them.
            </p>
            <p className="font-medium text-[#1a1a1a]">Indicator words will speed you up when they're present. Analytical thinking will save you when they're not.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
  "five-types-of-conclusions": {
    eyebrow: "",
    title: "Five Types of Conclusions",
    subtitle: "Once you find the conclusion, name its type so you can predict the weakness that usually comes with it.",
    content: (
      <>
        <LessonSection tocTitle="Five Types Of Conclusions" className="space-y-8">
          <InteractiveCard prominent className="bg-surface p-8 border-none shadow-2">
            <h2 className="font-serif text-[36px] font-bold text-ink-bright leading-tight">Five Types of Conclusions</h2>
            <p className="mt-4 font-sans text-[15px] text-ink-soft leading-[1.7]">
              Once you find the conclusion, name its type so you can predict the weakness that usually comes with it.
            </p>
          </InteractiveCard>
          <div className="space-y-6 font-sans text-[15px] leading-[1.7] text-ink-soft max-w-[64ch]">
            <p className="text-ink-bright">The argument did not change. Only the packaging did.</p>
            <p>Indicator words are packaging. They can point you toward a conclusion, but they do not tell you what kind of conclusion you are dealing with.</p>
            <p className="text-ink-bright font-semibold">That is the real question:</p>
            <p className="font-serif text-[28px] italic text-ink-bright leading-[1.3]">What kind of claim is the author making?</p>
            <p>
              This matters because conclusions are not all built the same way. Each type has its own shape and its own predictable weakness.
            </p>
            <p className="text-ink-bright font-semibold">
              So once you can name the type of conclusion, you are not just "finding the conclusion" anymore. You are already starting to see where the argument might break.
            </p>
          </div>
        </LessonSection>

        <LessonSection tocTitle="Recommendations" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConclusionTypeCard 
              title="Recommendations"
              definition="A recommendation tells us what should happen."
              example="Double-blind techniques should be used whenever possible in scientific experiments."
              weakness="The author has to assume the proposal is better than the costs, risks, or alternatives."
              question="Why is that the best move?"
              colorClass="hover:border-t-[4px] hover:border-t-[#FACC15]"
            />
            <ConclusionTypeCard 
              title="Causal Hypotheses"
              definition="A causal hypothesis claims to know why something happened."
              example="Restrictions on tobacco advertisements caused the reduction in the number of people smoking."
              weakness="Correlation, timing, or coexistence do not prove cause; something else may explain the result."
              question="What else could explain it?"
              colorClass="hover:border-t-[4px] hover:border-t-[#A855F7]"
            />
            <ConclusionTypeCard 
              title="Predictions"
              definition="A prediction claims that something will happen."
              example="Global warming probably will not produce more frequent and intense tropical storms."
              weakness="Predictions assume the relevant conditions will stay stable, and often they do not."
              question="What could change?"
              colorClass="hover:border-t-[4px] hover:border-t-[#38BDF8]"
            />
            <ConclusionTypeCard 
              title="Judgments / Labels"
              definition="A judgment assigns a verdict or label."
              example="Because the new products are selling poorly, the ad campaign is ill-conceived."
              weakness="The label sounds strong, but the evidence may not actually prove that the label fits."
              question="Did they actually prove that label fits?"
              colorClass="hover:border-t-[4px] hover:border-t-[#10B981]"
            />
            <ConclusionTypeCard 
              title="Rebuttals"
              definition="A rebuttal is the author saying someone else is wrong."
              example="Critics say this movie is unrealistic. They are wrong, because it is a funny comedy and that is all that matters."
              weakness="The author may answer the wrong criticism, reject the other side badly, or never really respond to the point."
              question="Did the author actually answer them?"
              colorClass="hover:border-t-[4px] hover:border-t-[#F97316]"
            />
          </div>
        </LessonSection>
        
        <LessonSection tocTitle="Interactive Practice" className="space-y-8">
            <ConclusionTypeSwitchboard />
        </LessonSection>

        <LessonSection tocTitle="Remember" className="space-y-8 border-b-0">
          <SectionHeading title="Remember" subtitle="Do not stop at finding the conclusion" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { type: "Recommendations", note: "say what should happen.", color: "#FACC15" },
              { type: "Causal hypotheses", note: "say what caused something.", color: "#A855F7" },
              { type: "Predictions", note: "say what will happen.", color: "#38BDF8" },
              { type: "Judgments and labels", note: "assign a verdict.", color: "#10B981" },
              { type: "Rebuttals", note: "say the other side is wrong.", color: "#F97316" },
            ].map((entry) => (
              <div
                key={entry.type}
                className="rounded-[14px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(26,26,26,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[2px]"
                style={{ borderTopColor: entry.color, borderTopWidth: 3 }}
              >
                <span className="inline-block h-1.5 w-8 rounded-full" style={{ backgroundColor: entry.color }} />
                <h4 className="mt-3 font-serif text-[18px] italic leading-tight text-[#1a1a1a]">{entry.type}</h4>
                <p className="mt-1.5 text-[14px] leading-[1.5] text-[rgba(26,26,26,0.66)]">{entry.note}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <p>Do not stop at finding the conclusion. Name the type.</p>
            <p>Once you know the type of conclusion, you know the kind of weakness to look for.</p>
          </div>
        </LessonSection>
      </>
    ),
  },
  "beyond-premises-and-conclusions": {
    eyebrow: "LESSON",
    title: "Beyond Premises and Conclusions",
    subtitle: "The mindset shift: separating the argument from context, opposition, concessions, and pivots.",
    content: <BeyondPremisesAndConclusions />,
  },
  "first-sentence-vs-rebuttal-structures": {
    eyebrow: "Lessons",
    title: "First-Sentence vs Rebuttal Structures",
    subtitle: "The main conclusion usually appears in one of two places.",
    content: (
      <>
        <LessonSection tocTitle="Conclusion Placement" className="space-y-16">
          <SectionHeading title="Conclusion Placement" subtitle="Where the author usually puts the main point" />
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, boxShadow: "0 20px 34px -28px oklch(0.36 0.05 150 / 0.2)" }}
              className="group rounded-[24px] border border-[oklch(0.46_0.05_150/0.14)] bg-[linear-gradient(180deg,oklch(0.986_0.006_110),oklch(0.974_0.01_145))] p-7 shadow-[0_18px_38px_-30px_oklch(0.2_0.01_60/0.16)] transition-shadow duration-200"
            >
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[oklch(0.43_0.04_145/0.68)]">Place 1</span>
                <span className="rounded-full border border-[oklch(0.46_0.05_150/0.14)] bg-[oklch(0.98_0.01_150/0.86)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[oklch(0.39_0.05_145/0.76)] transition-colors duration-200 group-hover:bg-[oklch(0.965_0.018_145)]">
                  Up front
                </span>
              </div>
              <h3 className="mb-4 max-w-[13ch] font-serif text-[28px] italic leading-tight text-[oklch(0.16_0.01_60)]">
                First-sentence conclusion
              </h3>
              <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
                <p>The author states the main point in the first sentence.</p>
                <p>The rest of the stimulus gives the support. Main point first. Reasons after.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.42, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, boxShadow: "0 20px 34px -28px oklch(0.42 0.06 45 / 0.18)" }}
              className="group rounded-[24px] border border-[oklch(0.58_0.05_42/0.16)] bg-[linear-gradient(180deg,oklch(0.987_0.006_32),oklch(0.975_0.01_48))] p-7 shadow-[0_18px_38px_-30px_oklch(0.2_0.01_60/0.16)] transition-shadow duration-200"
            >
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[oklch(0.46_0.04_42/0.68)]">Place 2</span>
                <span className="rounded-full border border-[oklch(0.58_0.05_42/0.16)] bg-[oklch(0.982_0.01_42/0.86)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[oklch(0.43_0.05_40/0.76)] transition-colors duration-200 group-hover:bg-[oklch(0.968_0.02_42)]">
                  After the turn
                </span>
              </div>
              <h3 className="mb-4 max-w-[14ch] font-serif text-[28px] italic leading-tight text-[oklch(0.16_0.01_60)]">
                Rebuttal / pivot conclusion
              </h3>
              <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
                <p>The stimulus starts with someone else&apos;s view, or with language that is not yet the author&apos;s point.</p>
                <p>Then the author turns into the real conclusion. Wait for the author&apos;s turn.</p>
              </div>
            </motion.div>
          </div>
        </LessonSection>

        <LessonSection tocTitle="FOUR ARGUMENT ROLES" className="space-y-6">
          <ClaimBucketInspector />
        </LessonSection>

        <LessonSection tocTitle="What To Carry Into The Lab" className="space-y-10 border-b-0">
          <div className="max-w-[70rem]">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-[oklch(0.2_0.01_60/0.08)] bg-[linear-gradient(180deg,oklch(0.985_0.005_60),oklch(0.975_0.008_62))] px-7 py-7 shadow-[0_18px_42px_-28px_oklch(0.2_0.01_60/0.16)]">
                <div className="mb-4 flex items-baseline gap-3 text-[oklch(0.42_0.03_70)]">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[oklch(0.4_0.02_70/0.7)]">Place</span>
                  <span className="font-serif text-[24px] italic leading-none text-[oklch(0.55_0.03_72/0.65)]">1</span>
                </div>
                <h3 className="max-w-[13ch] font-serif text-[30px] italic leading-[1.02] tracking-[-0.03em] text-[oklch(0.15_0.01_60)]">
                  First-sentence read
                </h3>
                <p className="mt-5 max-w-[30ch] text-[20px] leading-[1.55] text-[oklch(0.2_0.01_60/0.8)]">
                  If the first sentence sounds like the author’s opinion and the later claims answer “why believe that?”, start there.
                </p>
              </div>

              <div className="rounded-[24px] border border-[oklch(0.2_0.01_60/0.08)] bg-white px-7 py-7 shadow-[0_18px_42px_-28px_oklch(0.2_0.01_60/0.16)]">
                <div className="mb-4 flex items-baseline gap-3 text-[oklch(0.42_0.03_70)]">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[oklch(0.4_0.02_70/0.7)]">Place</span>
                  <span className="font-serif text-[24px] italic leading-none text-[oklch(0.55_0.03_72/0.65)]">2</span>
                </div>
                <h3 className="max-w-[12ch] font-serif text-[30px] italic leading-[1.02] tracking-[-0.03em] text-[oklch(0.15_0.01_60)]">
                  Rebuttal read
                </h3>
                <p className="mt-5 max-w-[31ch] text-[20px] leading-[1.55] text-[oklch(0.2_0.01_60/0.8)]">
                  If the opening sounds like someone else’s view, or the real author voice appears after a pivot, wait for the turn.
                </p>
              </div>
            </div>
          </div>
        </LessonSection>
      </>
    ),
  },
  "two-part-conclusion-check": {
  eyebrow: "Lessons",
  title: "The 2-Part Conclusion Check",
  subtitle: "Two questions. Both must be yes. It is the cleanest way to verify the main conclusion.",
  content: (
    <>
      <LessonSection tocTitle="The 2-Part Conclusion Check" className="space-y-16">
        <SectionHeading title="The 2-Part Conclusion Check" subtitle="The one tool that does not lie" />
        
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative py-12 px-8 border-l-2 border-[oklch(0.2_0.01_60/0.1)] bg-[oklch(0.98_0.005_60)] rounded-r-2xl"
        >
          <p className="font-serif text-[32px] md:text-[40px] italic leading-[1.1] text-[oklch(0.15_0.01_60)] tracking-tight">
            Two questions. <br />
            Both must be <span className="text-mc-success underline decoration-[oklch(0.6_0.15_150/0.3)] underline-offset-8">yes</span>.
          </p>
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
            <div className="text-[120px] font-serif italic leading-none">?</div>
          </div>
        </motion.div>

        <div className="relative space-y-12 max-w-[64ch]">
          <p className="text-[22px] md:text-[26px] font-serif italic leading-snug text-[oklch(0.15_0.01_60)]">
            Finding the main conclusion sounds easy until the LSAT gives you five sentences that all feel important.
          </p>
          
          <div className="space-y-6 text-[17px] font-serif leading-relaxed text-[oklch(0.2_0.01_60/0.76)]">
            <p>
              The <span className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[oklch(0.2_0.01_60/0.4)] px-1.5 py-0.5 rounded-sm bg-[oklch(0.2_0.01_60/0.04)] mr-1">Background</span> is often just set dressing. A <span className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[oklch(0.2_0.01_60/0.4)] px-1.5 py-0.5 rounded-sm bg-[oklch(0.2_0.01_60/0.04)] mx-1">Concession</span> is a point the author is already giving away. An <span className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[oklch(0.2_0.01_60/0.4)] px-1.5 py-0.5 rounded-sm bg-[oklch(0.2_0.01_60/0.04)] mx-1">Opinion</span> might belong to a critic, not the author. 
            </p>
            <p>
              And the real conclusion? It is usually hiding in the middle of the wreckage, camouflaged by everything around it.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pt-6 border-t border-[oklch(0.85_0.12_85/0.2)]"
          >
            <p className="text-xl font-bold text-[oklch(0.65_0.12_85)] tracking-tight">
              That is why you need a definitive check.
            </p>
          </motion.div>
        </div>
      </LessonSection>

      <LessonSection tocTitle="The Check" className="space-y-16">
        <SectionHeading title="The Check" subtitle="Run these two questions on every candidate" />

        <ContentVignette variant="tool" accentColor="gold" className="shadow-[0_24px_64px_-12px_oklch(0.2_0.01_60/0.08)]">
          <h3 className="text-xl font-bold text-[oklch(0.15_0.01_60)] mb-8 tracking-tight">The 2-Part Check</h3>
          <div className="grid gap-10">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)]">Question 1</p>
                <p className="text-[20px] leading-tight text-[oklch(0.15_0.01_60)]"><strong className="font-bold">Is this the author's own opinion?</strong></p>
                <p className="text-[16px] text-[oklch(0.2_0.01_60/0.64)] italic">In other words, is this a claim someone could reasonably disagree with?</p>
              </div>
              <div className="h-px bg-[oklch(0.2_0.01_60/0.06)] w-1/4" />
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)]">Question 2</p>
                <p className="text-[20px] leading-tight text-[oklch(0.15_0.01_60)]"><strong className="font-bold">Is this claim supported by at least one other explicit statement?</strong></p>
                <p className="text-[16px] text-[oklch(0.2_0.01_60/0.64)] italic">In other words, does something else in the argument give us a reason to believe it?</p>
              </div>
          </div>
        </ContentVignette>

        <div className="space-y-6 text-body-prose text-[oklch(0.2_0.01_60/0.76)] max-w-[64ch]">
          <p>Both answers must be <strong className="text-mc-success font-bold underline decoration-mc-success/20 underline-offset-4">yes</strong>.</p>
          <p>If either answer is <strong className="text-mc-error font-bold underline decoration-mc-error/20 underline-offset-4">no</strong>, that sentence is not the main conclusion.</p>
          <p>A factual statement fails the first question—facts are not the author's opinion. An unsupported claim fails the second question. A concession fails the first question.</p>
          <p className="font-bold text-[oklch(0.15_0.01_60)] pt-4 text-[18px]">Two questions. Both must be yes. No exceptions.</p>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Why This Works" className="space-y-16 border-b-0">
        <SectionHeading title="Why This Works" subtitle="Turn the definition into a check" />
        <div className="space-y-6 text-body-prose text-[oklch(0.2_0.01_60/0.76)] max-w-[64ch]">
          <p>A conclusion is the claim the author is trying to prove. This test turns that definition into two simple yes-or-no questions.</p>
          <p>If a sentence passes both, it is probably the conclusion. If it fails either, it is doing some other job—background, premise, opposing view, concession, or setup. Keep looking.</p>
        </div>
        <TwoPartConclusionCheckMachine />
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
