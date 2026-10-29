import { ArrowDown } from "lucide-react";
import { ANSWER_CHOICE_ITEMS } from "../../data/answerChoiceDrill";

// Local lecture draft from ai-os/brainstorms/2026-10-13-abstract-answer-choice-review.md,
// "Current lecture copy ready for local review" (2026-10-13). Not publication approval.
// Source choice 2 and the example retain Desktop/role_question_answer_choices_complete_transcription.html.
// Connective reasoning is grounded in corpus/Curriculum/Role/Homework/_scan_Role_Questions_Recap_Drill.md,
// corpus/Curriculum/Abstract/Homework/Level 1 Answer Parsing and Mapping.md, and
// corpus/Curriculum/Abstract/Homework/Advanced Parsing Answer Key.md. Closing uses source choices 8–15.
const SOURCE_EXAMPLE_HTML = '<p class="example"><span class="underlined">John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer.</span> Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.</p>';

const PROSE = "my-10 space-y-5 text-[19px] leading-[1.7] [&_strong]:font-bold";
const HEADING = "text-2xl md:text-3xl font-black leading-tight text-brutal-ink";

export function RoleChoiceGuide() {
  return (
    <section className={PROSE} aria-labelledby="role-choice-relationship">
      <h2 id="role-choice-relationship" className={HEADING}>An answer choice describes a relationship</h2>
      <p>An abstract answer choice tells us what a statement does in an argument. To understand it, we need more than the name of a role. We need to see the relationship the choice describes.</p>
      <p>A premise is a reason for accepting a conclusion. An example can illustrate that premise. Those are related jobs, but they are different jobs. The answer choice can ask us to follow both.</p>
      <p>Consider this choice:</p>
      <blockquote className="border-l-4 border-brutal-ink bg-brutal-paper p-5 md:p-6 font-semibold italic">
        {ANSWER_CHOICE_ITEMS[1].stemText}
      </blockquote>
      <p><strong>Illustration</strong> means an example. <strong>Premise</strong> tells us that the idea being illustrated is a reason the author uses. <strong>Support the argument’s conclusion</strong> tells us what that reason is used for.</p>
      <p>So there are two relationships to check: the statement must be an example of the premise, and the premise must support the conclusion. Calling the statement “an example” gets us started. It does not finish the work.</p>

      <h3 className={`${HEADING} pt-6`}>Follow the example</h3>
      <p>The underlined statement is the one the choice describes.</p>
      <div
        className="border-2 border-brutal-ink bg-brutal-yellow/25 p-5 md:p-6 [&_.example]:m-0 [&_.example]:italic [&_.underlined]:underline [&_.underlined]:decoration-2 [&_.underlined]:underline-offset-4"
        data-testid="guided-role-source-example"
        dangerouslySetInnerHTML={{ __html: SOURCE_EXAMPLE_HTML }}
      />
      <p>First, find the point the author wants us to accept. Here, the author says we must avoid cigarettes if we want to stay healthy.</p>
      <p>What reason does the author give? <strong>Smoking is a direct cause of lung cancer.</strong> That is the premise used to support the recommendation.</p>
      <p>Now look at the underlined statement. John smoked two packs a day and was diagnosed with lung cancer. John’s case is an example of the causal relationship stated in the premise.</p>
      <p>We can now follow the whole description. <strong>John’s case illustrates the premise. The premise supports the conclusion.</strong> The choice describes what the underlined statement does, including the connection to the reason and the reason’s connection to the final point.</p>

      <figure className="my-8 rounded-lg border-2 border-brutal-ink bg-brutal-paper p-5 md:p-7" aria-label="John’s case illustrates the premise, which supports the conclusion">
        <div className="rounded-lg border-2 border-brutal-ink bg-brutal-yellow/30 p-4 md:p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider">The example</p>
          <p className="underline decoration-2 underline-offset-4">John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer.</p>
        </div>
        <div className="flex flex-col items-center py-3 font-bold text-brutal-ink">
          <span>illustrates</span><ArrowDown className="mt-1 h-6 w-6" aria-hidden="true" />
        </div>
        <div className="rounded-lg border-2 border-brutal-ink bg-brutal-paper p-4 md:p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider">The premise</p>
          <p className="font-semibold">Smoking is a direct cause of lung cancer.</p>
        </div>
        <div className="flex flex-col items-center py-3 font-bold text-brutal-ink">
          <span>supports</span><ArrowDown className="mt-1 h-6 w-6" aria-hidden="true" />
        </div>
        <div className="rounded-lg border-2 border-brutal-ink bg-brutal-yellow/30 p-4 md:p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider">The conclusion</p>
          <p className="font-semibold">We must avoid cigarettes at all costs if we want to stay healthy.</p>
        </div>
      </figure>

      <p>If we only noticed that the paragraph discusses smoking, we would miss the structure. If we only noticed that John’s case is an example, we would leave part of the choice unchecked. We need to know what it is an example of and how that idea is used in the argument.</p>
      <p>This explains the statement’s role. It does not ask us to decide whether the argument has proved its causal claim. The task here is to understand the description and identify the relationship the source is showing.</p>
    </section>
  );
}

export function RoleChoicePracticeInstructions() {
  return (
    <section className={PROSE} aria-labelledby="role-choice-concrete">
      <h2 id="role-choice-concrete" className={HEADING}>Make each choice concrete</h2>
      <p>For each of the fifteen choices, there are two pieces of written work you can use to test your understanding.</p>
      <div className="space-y-5 rounded-lg border-2 border-brutal-ink bg-brutal-paper p-5 md:p-6">
        <p><strong>State the requirements.</strong> What would have to appear in an argument for the choice to describe it correctly? Keep every part of the description. A claim receiving support is different from a claim receiving no justification. A claim being required is different from a claim establishing the conclusion.</p>
        <p><strong>Create an example argument.</strong> Write reasons and a conclusion, then identify the particular statement the choice would describe. Check where each requirement appears in your example. If one part is missing, you know what still needs work.</p>
      </div>
      <p>The original breakdown is available whenever you need it. You can try the written work first, open the explanation to learn the relationship, or return to revise your example after reading. Reading the breakdown and completing the written work are recorded separately.</p>
      <p>As you continue, keep comparing the wording of the choice with what the statement actually does. The explanation should make the language more concrete. Your example gives you a chance to use that meaning yourself.</p>
    </section>
  );
}

export function RoleChoiceClosing() {
  return (
    <section className={PROSE} aria-labelledby="role-choice-whole-description">
      <h2 id="role-choice-whole-description" className={HEADING}>Check the whole description</h2>
      <p>The fifteen choices use different words, but the task stays the same: turn the description into requirements you can check.</p>
      <p>Start with the idea the choice names. Is it an example, a principle, an observation, a hypothesis, or a conclusion? Then look at what happens to that idea. Is it used as support, challenged, denied, or offered as an explanation?</p>
      <p>Keep the strength of the wording. <strong>Required</strong> and <strong>establishes</strong> do different work. <strong>Attempts</strong> does not tell us that the attempt succeeds. <strong>Explicitly stated</strong> asks for something the argument actually says. Leaving out one of these details changes the description you are trying to satisfy.</p>
      <p>The final choices also show why we trace each link of support. A statement can receive support and then support the main conclusion. Or it can be the main conclusion, supported by another statement that itself receives support. Ask why we should believe each claim and look for the reason the argument gives. Then ask what that claim supports in turn.</p>
      <p>You can return to any choice and check your own example against its original breakdown. Have you included every required part? Have you identified the statement the choice describes? Does that statement actually do what the full choice says?</p>
      <p className="rounded-lg border-2 border-brutal-ink bg-brutal-yellow/30 p-5 md:p-6 font-semibold">That completes the answer-choice exercise. When you later meet this language in a full LSAT question, look for those same parts and relationships in the argument you are given.</p>
    </section>
  );
}
