/**
 * "Engaging With The Passage" — RC bootcamp content.
 *
 * GENERATED FROM the approved prototype (handoff v4). Every student-facing
 * string is a verbatim transcription: do not edit, paraphrase, or reflow any
 * of it. Passage text is licensed source material and is reproduced exactly,
 * em-dashes included. `id` fields exist only for React keys and persistence
 * and must never render.
 */

export type Html = string;

export type PassageId = keyof typeof PASSAGES;

export interface Callout {
  variant: 'dominant' | 'quiet';
  label: string;
  body: Html;
}

export interface ScreenBase {
  id: string;
  /** Descriptor only. Never "Chapter N". */
  eyebrow?: string;
}

export type WalkBeat =
  | { kind: 'quote'; html: Html }
  | { kind: 'reaction'; html: Html }
  | { kind: 'checkin'; question: Html; options: string[]; note?: Html };

export type Screen = ScreenBase &
  (
    | {
        type: 'prose';
        title: string;
        lede?: string;
        body: Html;
        layout?: 'payoff';
        directive?: string;
        callout?: Callout;
      }
    | {
        type: 'instructions';
        title: string;
        lede?: string;
        meta: { icon: 'clock' | 'book' | 'pen'; text: string }[];
        steps: Html[];
        ctaLabel: string;
      }
    | {
        type: 'read';
        passageId: PassageId;
        /** Absent = untimed. */
        minutes?: number;
        task: Html;
        thesis?: string;
        doneLabel: string;
      }
    | {
        type: 'passage';
        title: string;
        lede?: string;
        intro?: Html;
        passageId: PassageId;
        followUp?: { kind: 'prompt'; text: Html } | { kind: 'debrief'; html: Html };
      }
    | {
        type: 'write';
        title: string;
        intro?: Html;
        question: Html;
        placeholder: string;
        storageKey: string;
        reveal: { buttonLabel: string; sectionLabel: string; html: Html };
      }
    | {
        type: 'walk';
        title: string;
        lede?: string;
        intro?: Html;
        introStyle?: 'why';
        beats: WalkBeat[];
        outro?: Html;
        outroCallout?: Callout;
      }
  );

export interface Chapter {
  name: string;
  screens: Screen[];
}

export interface Passage {
  label: string;
  /** Practice-test provenance shown as a subheader while reading. Empty = hidden. */
  source: string;
  paras: string[];
}

export const PASSAGES = {
  medievalLaw: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "Until about 1970, anyone who wanted to write a comprehensive history of medieval English law as it actually affected women would have found a dearth of published books or articles concerned with specific legal topics relating to women and derived from extensive research in actual court records. This is a serious deficiency, since court records are of vital importance in discovering how the law actually affected women, as opposed to how the law was intended to affect them or thought to affect them. These latter questions can be answered by consulting such sources as treatises, commentaries, and statutes; such texts were what most scholars of the nineteenth and early twentieth centuries concentrated on whenever they did write about medieval law. But these sources are of little help in determining, for example, how often women’s special statutory privileges were thwarted by intimidation or harassment, or how often women managed to evade special statutory limitations. And, quite apart from provisions designed to apply only, or especially, to women, they cannot tell us how general law affected the female half of the population—how women defendants and plaintiffs were treated in the courts in practice when they tried to exercise the rights they shared with men. Only quantitative studies of large numbers of cases would allow even a guess at the answers to these questions, and this scholarly work has been attempted by few.",
      "One can easily imagine why. Most medieval English court records are written in Latin or Anglo-Norman French and have never been published. The sheer volume of material to be sifted is daunting: there are over 27,500 parchment pages in the common plea rolls of the thirteenth century alone, every page nearly three feet long, and written often front and back in highly stylized court hand. But the difficulty of the sources, while it might appear to explain why the relevant scholarship has not been undertaken, seems actually to have deterred few: the fact is that few historians have wanted to write anything approaching women’s legal history in the first place. Most modern legal historians who have written on one aspect or another of special laws pertaining to women have begun with an interest in a legal idea or event or institution, not with a concern for how it affected women. Very few legal historians have started with an interest in women’s history that they might have elected to pursue through various areas of general law. And the result of all this is that the current state of our scholarly knowledge relating to law and the medieval Englishwoman is still fragmentary at best, though the situation is slowly improving."
    ],
  },
  authority: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "Intellectual authority is defined as the authority of arguments that prevail by virtue of good reasoning and do not depend on coercion or convention. A contrasting notion, institutional authority, refers to the power of social institutions to enforce acceptance of arguments that may or may not possess intellectual authority. The authority wielded by legal systems is especially interesting because such systems are institutions that nonetheless aspire to a purely intellectual authority. One judge goes so far as to claim that courts are merely passive vehicles for applying the intellectual authority of the law and possess no coercive powers of their own.",
      "In contrast, some critics maintain that whatever authority judicial pronouncements have is exclusively institutional. Some of these critics go further, claiming that intellectual authority does not really exist—i.e., it reduces to institutional authority. But it can be countered that these claims break down when a sufficiently broad historical perspective is taken: Not all arguments accepted by institutions withstand the test of time, and some well-reasoned arguments never receive institutional imprimatur. The reasonable argument that goes unrecognized in its own time because it challenges institutional beliefs is common in intellectual history; intellectual authority and institutional consensus are not the same thing.",
      "But, the critics might respond, intellectual authority is only recognized as such because of institutional consensus. For example, if a musicologist were to claim that an alleged musical genius who, after several decades, had not gained respect and recognition for his or her compositions is probably not a genius, the critics might say that basing a judgment on a unit of time—“several decades”—is an institutional rather than an intellectual construct. What, the critics might ask, makes a particular number of decades reasonable evidence by which to judge genius? The answer, of course, is nothing, except for the fact that such institutional procedures have proved useful to musicologists in making such distinctions in the past.",
      "The analogous legal concept is the doctrine of precedent, i.e., a judge’s merely deciding a case a certain way becoming a basis for deciding later cases the same way—a pure example of institutional authority. But the critics miss the crucial distinction that when a judicial decision is badly reasoned, or simply no longer applies in the face of evolving social standards or practices, the notion of intellectual authority is introduced: judges reconsider, revise, or in some cases throw out the decision. The conflict between intellectual and institutional authority in legal systems is thus played out in the reconsideration of decisions, leading one to draw the conclusion that legal systems contain a significant degree of intellectual authority even if the thrust of their power is predominantly institutional."
    ],
  },
  narrative: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "In recent years, a growing belief that the way society decides what to treat as true is controlled through largely unrecognized discursive practices has led legal reformers to examine the complex interconnections between narrative and law. In many legal systems, legal judgments are based on competing stories about events. Without having witnessed these events, judges and juries must validate some stories as true and reject others as false. This procedure is rooted in objectivism, a philosophical approach that has supported most Western legal and intellectual systems for centuries. Objectivism holds that there is a single neutral description of each event that is unskewed by any particular point of view and that has a privileged position over all other accounts. The law’s quest for truth, therefore, consists of locating this objective description, the one that tells what really happened, as opposed to what those involved thought happened. The serious flaw in objectivism is that there is no such thing as the neutral, objective observer. As psychologists have demonstrated, all observers bring to a situation a set of expectations, values, and beliefs that determine what the observers are able to see and hear. Two individuals listening to the same story will hear different things, because they emphasize those aspects that accord with their learned experiences and ignore those aspects that are dissonant with their view of the world. Hence there is never any escape in life or in law from selective perception, or from subjective judgments based on prior experiences, values, and beliefs.",
      "The societal harm caused by the assumption of objectivist principles in traditional legal discourse is that historically, the stories judged to be objectively true are those told by people who are trained in legal discourse, while the stories of those who are not fluent in the language of the law are rejected as false.",
      "Legal scholars such as Patricia Williams, Derrick Bell, and Mari Matsuda have sought empowerment for the latter group of people through the construction of alternative legal narratives. Objectivist legal discourse systematically disallows the language of emotion and experience by focusing on cognition in its narrowest sense. These legal reformers propose replacing such abstract discourse with powerful personal stories. They argue that the absorbing, nonthreatening structure and tone of personal stories may convince legal insiders for the first time to listen to those not fluent in legal language. The compelling force of personal narrative can create a sense of empathy between legal insiders and people traditionally excluded from legal discourse and, hence, from power. Such alternative narratives can shatter the complacency of the legal establishment and disrupt its tranquility. Thus, the engaging power of narrative might play a crucial, positive role in the process of legal reconstruction by overcoming differences in background and training and forming a new collectivity based on emotional empathy."
    ],
  },
  tectonics: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "According to the generally accepted theory of plate tectonics, the earth’s crust consists of a dozen or so plates of solid rock moving across the mantle—the slightly fluid layer of rock between crust and core. Most earthquakes can then be explained as a result of the grinding of these plates against one another as they collide. When two plates collide, one plate is forced under the other until it eventually merges with the underlying mantle. According to this explanation, this process, called subduction, causes an enormous build-up of energy that is abruptly released in the form of an earthquake. Most earthquakes take place in the earth’s seismic “hot zones”—regions with very high levels of subduction. Contrary to expectations, however, global seismic data indicate that there are also regions with high levels of subduction that are nonetheless nearly free of earthquakes. Thus, until recently, there remained a crucial question for which the plate tectonics theory had no answer—how can often intense subduction take place at certain locations with little or no seismic effect?",
      "One group of scientists now proposes that the relative quiet of these zones is tied to the nature of the collision between the plates. In many seismic hot zones, the plates exhibit motion in opposite directions—that is, they collide because they are moving toward each other. And because the two plates are moving in opposite directions, the subduction zone is relatively motionless relative to the underlying mantle. In contrast, the plate collisions in the quiet subduction zones occur between two plates that are moving in the same general direction—the second plate’s motion is simply faster than that of the first, and its leading edge therefore becomes subducted. But in this type of subduction, the collision zone moves with a comparatively high velocity relative to the mantle below. Thus, rather like an oar dipped into the water from a moving boat, the overtaking plate encounters great resistance from the mantle and is forced to descend steeply as it is absorbed into the mantle. The steep descent of the overtaking plate in this type of collision reduces the amount of contact between the two plates, and the earthquake-producing friction is thereby reduced as well. On the other hand, in collisions in which the plates move toward each other the subducted plate receives relatively little resistance from the mantle, and so its angle of descent is correspondingly shallow, allowing for a much larger plane of contact between the two plates. Like two sheets of sandpaper pressed together, these plates offer each other a great deal of resistance.",
      "This proposal also provides a warning. It suggests that regions that were previously thought to be seismically innocuous—regions with low levels of subduction—may in fact be at a significant risk of earthquakes, depending on the nature of the subduction taking place."
    ],
  },
  volcanoes: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "Long after the lava has cooled, the effects of a major volcanic eruption may linger on. In the atmosphere a veil of fine dust and sulfuric acid droplets can spread around the globe and persist for years. Researchers have generally thought that this veil can block enough sunlight to have a chilling influence on Earth’s climate. Many blame the cataclysmic eruption of the Indonesian volcano Tambora in 1815 for the ensuing “year without a summer” of 1816—when parts of the northeastern United States and southeastern Canada were hit by snowstorms in June and frosts in August.",
      "The volcano-climate connection seems plausible, but, say scientists Clifford Mass and David Portman, it is not as strong as previously believed. Mass and Portman analyzed global temperature data for the years before and after nine volcanic eruptions, from Krakatau in 1883 to El Chichón in 1982. In the process they tried to filter out temperature changes caused by the cyclic weather phenomenon known as the El Niño-Southern Oscillation, which warms the sea surface in the equatorial Pacific and thereby warms the atmosphere. Such warming can mask the cooling brought about by an eruption, but it can also mimic volcanic cooling if the volcano happens to erupt just as an El Niño induced warm period is beginning to fade.",
      "Once El Niño effects had been subtracted from the data, the actual effects of the eruptions came through more clearly. Contrary to what earlier studies had suggested, Mass and Portman found that minor eruptions have no discernible effect on temperature. And major, dust-spitting explosions, such as Krakatau or El Chichón, cause a smaller drop than expected in the average temperature in the hemisphere (Northern or Southern) of the eruption—only half a degree centigrade or less—a correspondingly smaller drop in the opposite hemisphere.",
      "Other researchers, however, have argued that even a small temperature drop could result in a significant regional fluctuation in climate if its effects were amplified by climatic feedback loops. For example, a small temperature drop in the northeastern U.S. and southeastern Canada in early spring might delay the melting of snow, and the unmelted snow would continue to reflect sunlight away from the surface, amplifying the cooling. The cool air over the region could, in turn, affect the jet stream. The jet stream tends to flow at the boundary between cool northern air and warm southern air, drawing its power from the sharp temperature contrast and the consequent difference in pressure. An unusual cooling in the region could cause the stream to wander farther south than normal, allowing more polar air to come in behind it and deepen the region’s cold snap. Through such a series of feedbacks a small temperature drop could be blown up into a year without a summer."
    ],
  },
  autobiography: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "In studying the autobiographies of Native Americans, most scholars have focused on as-told-to life histories that were solicited, translated, recorded, and edited by non-Native American collaborators—that emerged from “bicultural composite authorship.” Limiting their studies to such written documents, these scholars have overlooked traditional, preliterate modes of communicating personal history. In addition, they have failed to address the cultural constructs of the highly diverse Native American peoples, who prior to contact with nonindigenous cultures did not share with Europeans the same assumptions about self, life, and writing that underlie the concept of an autobiography—that indeed constitute the English word’s root meaning.",
      "The idea of self was, in a number of pre-contact Native American cultures, markedly inclusive: identity was not merely individual, but also relational to a society, a specific landscape, and the cosmos. Within these cultures, the expression of life experiences tended to be oriented toward current events: with the participation of fellow tribal members, an individual person would articulate, reenact, or record important experiences as the person lived them, a mode of autobiography seemingly more fragmented than the European custom of writing down the recollections of a lifetime. Moreover, expression itself was not a matter of writing but of language, which can include speech and signs. Oral autobiography comprised songs, chants, stories, and even the process whereby one repeatedly took on new names to reflect important events and deeds in one’s life. Dance and drama could convey personal history; for example, the advent of a vision to one person might require the enactment of that vision in the form of a tribal pageant.",
      "One can view as autobiographical the elaborate tattoos that symbolized a warrior’s valorous deeds, and such artifacts as a decorated shield that communicated the accomplishments and aspirations of its maker, or a robe that was emblazoned with the pictographic history of the wearer’s battles and was sometimes used in re-enactments. Also autobiographical, and indicative of high status within the tribe, would have been a tepee painted with symbolic designs to record the achievements and display the dreams or visions of its owner, who was often assisted in the painting by other tribal members.",
      "A tribe would, then, have contributed to the individual’s narrative not merely passively, by its social codes and expectations, but actively by joining in the expression of that narrative. Such intercultural collaboration may seem alien to the European style of autobiography, yet any autobiography is shaped by its creator’s ideas about the audience for which it is intended; in this sense, autobiography is justly called a simultaneous individual story and cultural narrative. Autobiographical expressions by early Native Americans may additionally have been shaped by the cultural perspectives of the people who transmitted them."
    ],
  },
  scienceHumanities: {
    label: "Reading Comprehension · Passage",
    source: "",
    paras: [
      "An effort should be made to dispel the misunderstandings that still prevent the much-needed synthesis and mutual supplementation of science and the humanities. This reconciliation should not be too difficult once it is recognized that the separation is primarily the result of a basic misunderstanding of the philosophical foundations of both science and the humanities.",
      "Some humanists still identify science with an absurd mechanistic reductionism. There are many who feel that the scientist is interested in nothing more than “bodies in motion,” in the strictly mathematical, physical, and chemical laws that govern the material world. This is the caricature of science drawn by representatives of the humanities who are ignorant of the nature of modern science and also of the scientific outlook in philosophy. For example, it is claimed that science either ignores or explains away the most essential human values. Those who believe this also assert that there are aspects of the human mind, manifest especially in the domains of morality, religion, and the arts, that contain an irreducible spiritual element and for that reason can never be adequately explained by science.",
      "Some scientists, on the other hand, claim that the humanist is interested in nothing more than emotion and sentiment, exhibiting the vagrant fancies of an undisciplined mind. To such men and women the humanities are useless because they serve no immediate and technological function for the practical survival of human society in the material world. Such pragmatists believe that the areas of morality, religion, and the arts should have only a secondary importance in people’s lives.",
      "Thus there are misconceptions among humanists and scientists alike that are in need of correction. This correction leads to a much more acceptable position that could be called “scientific humanism,” attempting as it does to combine the common elements of both disciplines. Both science and the humanities attempt to describe and explain. It is true that they begin their descriptions and explanations at widely separated points, but the objectives remain the same: a clearer understanding of people and their world. In achieving this understanding, science in fact does not depend exclusively on measurable data, and the humanities in fact profit from attempts at controlled evaluation. Scientific humanism can combine the scientific attitude with an active interest in the whole scale of human values. If uninformed persons insist on viewing science as only materialistic and the humanities as only idealistic, a fruitful collaboration of both fields is unlikely. The combination of science and the humanities is, however, possible, even probable, if we begin by noting their common objectives, rather than seeing only their different means."
    ],
  },
} satisfies Record<string, Passage>;

export const THESIS =
  "The scarcity of scholarship based on real cases meant we know little about how the law actually affected women from the Middle Ages; this situation arose because most legal historians are more interested in general ideas rather than how women were affected.";

export const CHAPTERS: Chapter[] = [
  {
    name: "Anticipating the Author’s Purpose",
    screens: [
    {
      id: "ch1-anticipating-the-authors-purpose",
      type: "prose",
      title: "Anticipating the Author’s Purpose",
      body: "\n    <p>The first and perhaps most important thing to remember about approaching an RC passage is a core skill we have already learned when practicing Logical Reasoning Questions: We must be aware of the passage structurally.</p>\n    <p>Most LR stimuli consisted of arguments. In an argument, there will be a main conclusion and supporting premises. When approaching an LR question argument, we consistently ask ourselves, “what is the author’s main point?” or “what is the main conclusion of this argument?” This applied not only to Find the Conclusion Questions but to every question type from the Assumption Family (Flaw, SA, NA, Strengthen, Weaken, etc.) and some more. When reading an RC passage, that is precisely the same approach we should take. As we go through the passage, we are constantly asking ourselves, <strong>“what is the main point of this passage? What is the author trying to convey, and what kind of supporting information are they using?”</strong></p>\n    <p>But then again, RC passages are much longer than the arguments we see in LR stimuli. As a result, many of us end up mindlessly reading/browsing through the information without really thinking about what the author is trying to say. We end up finishing the passage but can’t remember anything. The bits and pieces of information we recall are fragmented and piecemeal. When we finally get to the questions, they stress us out, and we have no idea what to do.</p>\n    <p>Because time is so limited in RC, we don’t have the luxury of wasting any of it. We must engage with the passage from the beginning and practice <strong>active reading</strong>. Rather than mindlessly wandering through the passage, we need to ask ourselves questions, find the answers in the passages, and reorganize the information we just read structurally.</p>\n    <p>Let me show you how:</p>",
    }
    ],
  },
  {
    name: "Your first read",
    screens: [
    {
      id: "ch2-start-with-the-purpose",
      type: "prose",
      title: "Start with the purpose",
      body: "<p>We start by anticipating the author’s purpose. In other words, as soon as we begin reading a passage, we ask ourselves, “why is the author writing this passage?” Just like how each LR argument will contain a main conclusion, and all that information will make sense once you have isolated what the conclusion is; if we can figure out the main point/conclusion of a passage, then reading and understanding the passage will become so much easier.</p>",
    },
    {
      id: "ch2-before-you-continue-read-this",
      type: "instructions",
      title: "Before you continue, read this passage",
      lede: "To illustrate my point, look at the following passage, and try to recollect what it’s about without looking at the passage. For realism’s sake, try to limit yourself to three and a half minutes.",
      meta: [{ icon: "clock", text: "3.5 minutes" }, { icon: "book", text: "Two paragraphs" }, { icon: "pen", text: "Written response after" }],
      steps: ["Read the passage once, the way you normally would.", "The timer runs for three and a half minutes. You can finish early.", "Then write down what the author talked about, from memory."],
      ctaLabel: "Start the read",
    },
    {
      id: "ch2-read",
      type: "read",
      passageId: "medievalLaw",
      minutes: 3.5,
      task: "Read this passage the way you normally would.<br><br>When you are done, you will be asked to summarize it <strong>without looking back</strong>.",
      doneLabel: "I’m done reading",
    }
    ],
  },
  {
    name: "Write it from memory",
    screens: [
    {
      id: "ch3-now-from-memory",
      type: "write",
      title: "Now, from memory",
      intro: "<p>That was a notoriously dense passage, and the fact that there were only two long-winded paragraphs didn’t help either. It’s easy to get bogged down by the details, thereby missing the forest for the trees.</p>",
      question: "So, go ahead; without looking back at the passage, can you summarize what the author talked about?",
      placeholder: "Write whatever you can recall. A sentence or two is fine. Be honest about how much you actually retained.",
      storageKey: "recall-medieval",
      reveal: { buttonLabel: "See what usually happens", sectionLabel: "What usually happens", html: "<p>Students with strong reading skills can probably come up with a good response. But for the rest of us, it was probably quite a struggle. Chances are that you forgot as quickly as you read, there were names, keywords and bits and pieces of information that you remembered, but if I asked you to organize your thoughts into a coherent sentence or two, it became much more challenging.</p>" },
    }
    ],
  },
  {
    name: "The second read",
    screens: [
    {
      id: "ch4-now-read-it-again-armed",
      type: "prose",
      title: "Now read it again, armed",
      body: "<p>Let’s go back to what we talked about before this reading exercise. If somehow you already knew what the author’s main point was as you were reading through the passage, then the difficulty of the reading drops drastically. Armed with that knowledge, you can then categorize each sentence as you read them, and by the time you finish the passage, your understanding of the passage will be organized and coherent.</p>\n",
      directive: "So let’s try that again, go back and re-read the passage, this time keeping the author’s main point/thesis in mind.",
      callout: { variant: "dominant", label: "The main point of the passage", body: "The scarcity of scholarship based on real cases meant we know little about how the law actually affected women from the Middle Ages; this situation arose because most legal historians are more interested in general ideas rather than how women were affected." },
    },
    {
      id: "ch4-read",
      type: "read",
      passageId: "medievalLaw",
      task: "Read it again. This time you already know where it lands.<br><br>As you go, put each sentence somewhere: is it setting up the problem, or explaining the cause?",
      thesis: "The scarcity of scholarship based on real cases meant we know little about how the law actually affected women from the Middle Ages; this situation arose because most legal historians are more interested in general ideas rather than how women were affected.",
      doneLabel: "Done, that was easier",
    },
    {
      id: "ch4-much-easier-right",
      type: "prose",
      title: "Much easier, right?",
      body: "<p>Once you know the passage, categorizing and organizing information as you read them becomes much more straightforward. This is what we mean by engaging with the material and practicing <strong>active reading</strong>.</p>",
      layout: "payoff",
    }
    ],
  },
  {
    name: "The Author’s Purpose",
    screens: [
    {
      id: "ch5-the-authors-purpose",
      type: "prose",
      title: "The Author’s Purpose",
      body: "<p>But wait, you say, on the actual exam itself, we have no way of knowing what the author’s main point is until the very end! We still have no choice but to read through the passage, all muddled and confused, hoping that clarity and understanding will eventually come to us. We will still get lost in the details, unable to retain the information we’ve just read, and still unable to organize all that information coherently.</p>\n    <p>You are right. There’s no way to know what the author’s main point is for sure until we’ve finished reading the entire passage. Sometimes it’s stated outright near the end of the passage, but most times, we need to derive it ourselves. So we can’t use the author’s main point as a crutch as we read through the passage. But we have the next best thing:</p>",
    },
    {
      id: "ch5-why-not-what",
      type: "prose",
      title: "WHY, not WHAT",
      body: "<p>Simply put, the author’s purpose tells us <strong>WHY</strong> the author wrote the passage. None of the passages that appear on the LSAT are there randomly. Each passage and even the paragraphs within each passage are there for a reason. Think about real-life situations; we give speeches or write essays to explain, persuade, incite, attack opponents, defend a position, or justify and provide a rationale for our actions. All writers write with a purpose in mind, unless you are making a shopping list/laundry list or making entries in a diary. Even then, you can argue that we make lists to help us memorize and write journal entries to reflect and remember.</p>\n    <p>If the main point/thesis is <strong>WHAT</strong> the author is trying to get across to the readers, the author’s purpose is the <strong>WHY</strong> behind why the author is penning this passage in the first place. These are essentially two sides of the same coin.</p>\n    <p>As we read through the passage, hints and clues will be scattered throughout the lines that will give us a rough idea of why the author wrote this specific passage. Our first task, when approaching a passage, is to constantly ask ourselves why the author is writing what they did.</p>",
    }
    ],
  },
  {
    name: "Walkthrough: asking WHY",
    screens: [
    {
      id: "ch6-lets-go-back-to-that",
      type: "walk",
      title: "Let’s go back to that passage",
      intro: "<p>Let’s return to the passage you just read; only this time we will ask ourselves the question <span class=\"rc-why\">“WHY?”</span></p>",
      introStyle: "why",
      beats: [
        { kind: "quote", html: "<p>Until about 1970, anyone who wanted to write a comprehensive history of medieval English law as it actually affected women would have found a dearth of published books or articles concerned with specific legal topics relating to women and derived from extensive research in actual court records.</p>" },
        { kind: "checkin", question: "<mark class=\"rc-mark\">Dearth</mark>: so there is a lack of material. Why is the author pointing this out? Why is the author writing this passage in the first place?", options: ["To offer up a solution by proposing alternative sources", "To tell us why there is so little scholarship", "To draw awareness by calling for more focus on this field", "Not sure yet, I would keep reading"], note: "Any of these is a reasonable opening hypothesis. That is the point: you commit to something, then let the passage correct you." },
        { kind: "reaction", html: "<p>Hmmm, I’m not too sure; maybe the author wants to offer up a solution to this by proposing alternative sources? Maybe they will tell us why there is so little scholarship. Maybe they are drawing awareness to the issue by calling for more focus on this field. I guess I will keep on reading to find out.</p>" },
        { kind: "quote", html: "<p>This is a serious deficiency, since court records are of vital importance in discovering how the law actually affected women, as opposed to how the law was intended to affect them or thought to affect them. These latter questions can be answered by consulting such sources as treatises, commentaries, and statutes; such texts were what most scholars of the nineteenth and early twentieth centuries concentrated on whenever they did write about medieval law. But these sources are <mark class=\"rc-mark\">of little help</mark> in determining, for example, how often women’s special statutory privileges were thwarted by intimidation or harassment, or how often women managed to evade special statutory limitations. And, quite apart from provisions designed to apply only, or especially, to women, they <mark class=\"rc-mark\">cannot tell us</mark> how general law affected the female half of the population—how women defendants and plaintiffs were treated in the courts in practice when they tried to exercise the rights they shared with men. Only quantitative studies of large numbers of cases would allow even a guess at the answers to these questions, and this scholarly work has <mark class=\"rc-mark\">been attempted by few</mark>.</p>" },
        { kind: "checkin", question: "So the lack of scholarship is a “serious deficiency,” and what materials that are available are “of little help.” Ok, so the situation is pretty bad. But <strong>WHY</strong> is the author saying this?", options: ["Highlighting the problems is the whole purpose", "There is something more coming, maybe a solution in the next paragraph"], note: "Hold both open. The next line settles it." },
        { kind: "reaction", html: "<p>So far, the author has only highlighted the problems; is that their purpose? To highlight the problems plaguing an academic field? Or is it something more? Perhaps the author will propose a solution in the next paragraph?</p>" },
        { kind: "quote", html: "<p>One can easily imagine <mark class=\"rc-mark\">why</mark>.</p>" },
        { kind: "reaction", html: "<p>Nice! So the author is going to tell us why scholarship is so limited. Maybe this is the author’s purpose after all.</p>" },
        { kind: "quote", html: "<p>Most medieval English court records are written in Latin or Anglo-Norman French and have never been published. The sheer volume of material to be sifted is daunting: there are over 27,500 parchment pages in the common plea rolls of the thirteenth century alone, every page nearly three feet long, and written often front and back in highly stylized court hand.</p>" },
        { kind: "checkin", question: "Is it because there are too many inaccessible sources?", options: ["Yes, that has to be the reason", "I want to see the next sentence first"], note: "Watch what the very next word does to this." },
        { kind: "quote", html: "<p>But the difficulty of the sources, while it might appear to explain why the relevant scholarship has not been undertaken, <mark class=\"rc-mark\">seems actually to have deterred few</mark>:</p>" },
        { kind: "reaction", html: "<p>Nope, that’s not the reason. Let’s see what the author thinks the real reason is.</p>" },
        { kind: "quote", html: "<p>the fact is that <mark class=\"rc-mark\">few historians have wanted to write anything approaching women’s legal history in the first place</mark>. Most modern legal historians who have written on one aspect or another of special laws pertaining to women have begun with an interest in a legal idea or event or institution, <mark class=\"rc-mark\">not with a concern for how it affected women</mark>. <mark class=\"rc-mark\">Very few legal historians have started with an interest in women’s history</mark> that they might have elected to pursue through various areas of general law. And the result of all this is that the current state of our scholarly knowledge relating to law and the medieval Englishwoman is still <mark class=\"rc-mark\">fragmentary</mark> at best, though the situation is slowly improving.</p>" },
        { kind: "reaction", html: "<p>This is unfortunate. The real reason is that historians don’t care enough about the issue.</p>" },
        { kind: "reaction", html: "<p>The author’s purpose in this passage, as it should be clear by now, is to highlight a problem in an academic field and explain how it came to pass. I’m amazed that the author didn’t propose a tentative solution to the problem. Most RC passages that highlight a problem will usually offer a potential solution.</p>" }
      ],
      outro: "<p>Notice how closely related the Author’s Purpose is to the passage’s Main Point? As we read through the passage and try to figure out the purpose, the main point should also come naturally to us. (More on this later.)</p>",
      outroCallout: { variant: "quiet", label: "Compare this to the main point of the passage", body: "The scarcity of scholarship based on real cases meant we know little about how the law actually affected women from the Middle Ages; this situation arose because most legal historians are more interested in general ideas rather than how women were affected." },
    }
    ],
  },
  {
    name: "The Hypothesis-Validation Framework",
    screens: [
    {
      id: "ch7-the-hypothesis-validation-framework",
      type: "prose",
      title: "The Hypothesis-Validation Framework",
      body: "<p>Notice how as we read through the passage, we were asking ourselves <strong>WHY</strong> the author wrote this passage, and we were also coming up with potential answers? At first, as soon as we realized that the first paragraph was about a problematic situation, we started to propose potential answers to the WHY question. We thought it might be to offer up a way to solve the problem; maybe the author is simply highlighting the problem to bring awareness to it or to explain how it came to pass?</p>\n    <p>By the second paragraph, we realize that the author is going to tell us the reason behind this problematic situation. So the author isn’t simply highlighting a deficiency. Similarly, the author never provided a solution to this problem, so that can’t be the purpose of this passage.</p>\n    <p>Think about RC reading as a <strong>scientific experiment</strong>. In a scientific experiment, we would develop an initial hypothesis, and with additional evidence, we would either modify, confirm, or replace our hypothesis. RC reading is very similar. As soon as we start reading, we find details and words that serve as our scientific evidence. As we read, we continuously modify, confirm, or even replace our initial hypothesis entirely. Eventually, by the time we have finished reading the passage, we will have a much better understanding of the author’s purpose, the passage’s main point, and the role of the rest of the information we’ve just read.</p>\n    <p>This is a reading habit that I’ve named the Hypothesis-Validation Framework, and it has worked wonders for both my students and me, especially in the most complex passages. In short, we start the reading and try to brainstorm some of the reasons why the author is writing the passage, or what the passage will talk about (hypothesis). As we read through the passage, we use the additional information to validate our initial hypothesis. If the hypothesis isn’t fully validated, then we modify it accordingly.</p>\n    <p>This framework also works in non-LSAT readings. In my RC class and privately, I tried it with dense passages from Clifford Geertz, Kant, Foucault, and Habermas and jurists like Hart and Dworkin. The results were pretty sweet.</p>",
    }
    ],
  },
  {
    name: "What is the Author Doing? (CEER)",
    screens: [
    {
      id: "ch8-what-is-the-author-doing",
      type: "prose",
      title: "What is the Author Doing? (CEER)",
      body: "<p>As we read the passage, a vital question to ask ourselves is, <strong>what is the author doing?</strong></p>\n    <p>As we mentioned previously, a cardinal sin of reading for RC is scanning through the passage without thinking, getting bogged down in trying to understand the details without actively thinking about what you just read and how the ideas relate.</p>\n    <p>But the advice “to actively read” doesn’t really help anyone. We all know that is what we are supposed to do, but when it comes to challenging passages, we can’t just all of a sudden magically begin to read, reflect, and connect the dots, especially when time is limited.</p>\n    <p>So what we should strive to do, when we are still learning to read actively, is to constantly ask ourselves, what is the author doing in this specific passage/paragraph/sentence? If we can figure out what the author is doing now, then realizing why they are doing it and how it relates to the entire passage’s thesis becomes much easier.</p>\n    <p>I went back through real passages and tried to categorize every passage and their associated questions. In every passage, the author will be doing one or more of the following: they can be <strong>comparing</strong> different concepts/positions; <strong>explaining</strong> something like a theory; <strong>evaluating</strong> the merits of an idea or practice; or <strong>recommending</strong> a course of action.</p>\n    <p>As we read through each passage, if you ever find yourself drifting off, stop and ask yourself whether the author is comparing, explaining, evaluating, or recommending something. Constantly ask yourself this question until you are comfortable engaging with the material you’ve just read.</p>",
    }
    ],
  },
  {
    name: "Comparison",
    screens: [
    {
      id: "ch9-comparison",
      type: "prose",
      eyebrow: "The C for Comparison",
      title: "Comparison",
      body: "<p>In a comparison-themed passage, the author will compare two things, listing their similarities and differences, comparing their pros and cons, and perhaps ending up choosing one. Pure comparison passages are relatively rare. Quite often, a passage will start by comparing two different scientific theories, two legal practices, or two schools of thought and then recommending one over the other.</p>\n    <p>We must note here that while heavy on the comparison element between Passages A and B, comparative passages do not necessarily fall under the Comparison framework. Each passage must be considered independently.</p>",
    },
    {
      id: "ch9-your-turn-again",
      type: "instructions",
      title: "Your turn again",
      lede: "Look at the following passage and try to use the hypothesis-validation framework to aid your understanding.",
      meta: [{ icon: "clock", text: "6 minutes" }, { icon: "book", text: "Four paragraphs" }, { icon: "pen", text: "Written response after" }],
      steps: ["Read the passage, running a hypothesis as you go.", "Ask what is being compared in this passage.", "Ask what the author’s purpose is in writing it.", "Then write down your answer to both, plus the main point."],
      ctaLabel: "Start the read",
    },
    {
      id: "ch9-read",
      type: "read",
      passageId: "authority",
      minutes: 6,
      task: "Run the framework as you read.<br><br>What is being compared here? What is the author’s purpose? What is the main point?",
      doneLabel: "I’m done reading",
    },
    {
      id: "ch9-before-you-see-my-take",
      type: "write",
      title: "Before you see my take",
      question: "What’s being compared in this passage? What’s the author’s purpose in writing this passage? What’s its main point?",
      placeholder: "What is being compared:\n\nAuthor’s purpose:\n\nMain point:",
      storageKey: "authority-take",
      reveal: { buttonLabel: "Show my take on the passage", sectionLabel: "My take on the passage", html: "<p>Here’s my take on the passage. Compare it against yours as you go.</p>" },
    }
    ],
  },
  {
    name: "Walkthrough: Comparison",
    screens: [
    {
      id: "ch10-heres-my-take-on-the",
      type: "walk",
      title: "Here’s my take on the passage",
      beats: [
        { kind: "quote", html: "<p>Intellectual authority is defined as the authority of arguments that prevail by virtue of good reasoning and do not depend on coercion or convention. A contrasting notion, <mark class=\"rc-mark\">institutional authority</mark>, refers to the power of social institutions to enforce acceptance of arguments that may or may not possess intellectual authority. The authority wielded by legal systems is especially interesting because such systems are <mark class=\"rc-mark\">institutions that nonetheless aspire to a purely intellectual authority</mark>. One judge goes so far as to claim that courts are merely passive vehicles for applying the intellectual authority of the law and possess no coercive powers of their own.</p>" },
        { kind: "reaction", html: "<p>Right away, two competing concepts should stand out: Intellectual authority vs. institutional authority. The author will probably go more in-depth into each and compare the two.</p>\n      <p>We are also told that legal systems “aspire to purely intellectual authority.” So which is it then, are legal systems intellectual, institutional, or a mix of both?</p>" },
        { kind: "quote", html: "<p>In contrast, some critics maintain that whatever authority judicial pronouncements have is exclusively institutional. Some of these critics go further, claiming that intellectual authority does not really exist—i.e., it reduces to institutional authority. But it can be countered that these claims break down when a sufficiently broad historical perspective is taken: Not all arguments accepted by institutions withstand the test of time, and some well-reasoned arguments never receive institutional imprimatur. The reasonable argument that goes unrecognized in its own time because it challenges institutional beliefs is common in intellectual history; intellectual authority and institutional consensus are not the same thing.</p>" },
        { kind: "reaction", html: "<p>More comparisons of different views here. The argument has shifted somewhat, but the comparison element is still relevant. We are now comparing some critics’ views on the nature of judicial authorities and that of the author.</p>\n      <p>So some critics think judicial authority is exclusively institutional. The author didn’t explicitly refute this; instead, they argue that intellectual authority is separate from institutional authority.</p>\n      <p>At this point, we might hypothesize that the author’s purpose might be to argue that intellectual authority does exist and that judicial authority derives largely from it.</p>" },
        { kind: "quote", html: "<p>But, the critics might respond, intellectual authority is only recognized as such because of institutional consensus. For example, if a musicologist were to claim that an alleged musical genius who, after several decades, had not gained respect and recognition for his or her compositions is probably not a genius, the critics might say that basing a judgment on a unit of time—“several decades”—is an institutional rather than an intellectual construct. What, the critics might ask, makes a particular number of decades reasonable evidence by which to judge genius? The answer, of course, is nothing, except for the fact that such institutional procedures have proved useful to musicologists in making such distinctions in the past.</p>" },
        { kind: "reaction", html: "<p>Aha, we are back again to the critics’ argument. Remember that the critics stand opposite to the author in their belief that judicial authority is purely institutional, and perhaps more extremely, intellectual authority is a pseudo-construction. We know already that this is something the author disagrees with, so it’s highly likely that the author will offer a final refutation in the last paragraph.</p>" },
        { kind: "quote", html: "<p>The analogous legal concept is the doctrine of precedent, i.e., a judge’s merely deciding a case a certain way becoming a basis for deciding later cases the same way—a pure example of institutional authority. But the critics miss the crucial distinction that when a judicial decision is badly reasoned, or simply no longer applies in the face of evolving social standards or practices, the notion of intellectual authority is introduced: judges reconsider, revise, or in some cases throw out the decision. The conflict between intellectual and institutional authority in legal systems is thus played out in the reconsideration of decisions, leading one to draw the conclusion that legal systems contain a significant degree of intellectual authority even if the thrust of their power is predominantly institutional.</p>" },
        { kind: "reaction", html: "<p>Indeed, that’s exactly what the author does. Decisions based on institutional authority can be overturned. So intellectual authority must be in play here. Does the author argue that legal authorities are purely intellectual? Nope, they do concede a point to the critics and believe them to be a hybrid of both types of authorities.</p>" }
      ],
      outro: "<p>The passage starts by comparing and contrasting two types of authorities, intellectual and institutional. It then goes off into a back-and-forth between certain critics and the author. The comparison framework works well in this passage for both. It forces us to acknowledge the two parties central to this argument and gives us a clearer picture of the author’s purpose.</p>\n    <p>Note how this passage is more than just comparing and contrasting two ideas or schools of thought. The author is explicitly committed to one position. One can say that their purpose in this passage is to defend the idea that judicial authority does contain elements of intellectual authority. But forcing ourselves to compare intellectual and institutional authority, as well as contrast the critics’ and author’s positions, will efficiently help us come to the purpose and main point of the passage.</p>",
    }
    ],
  },
  {
    name: "Comparison, again",
    screens: [
    {
      id: "ch11-one-more-comparison-passage",
      type: "instructions",
      title: "One more comparison passage",
      lede: "Let’s look at another passage where detecting comparisons plays an oversized role in understanding the passage. Again, try to do this in five minutes if you can.",
      meta: [{ icon: "clock", text: "5 minutes" }, { icon: "book", text: "Three paragraphs" }, { icon: "pen", text: "Written response after" }],
      steps: ["Read the passage inside five minutes.", "Track what is being set against what.", "Notice when your first guess about the comparison turns out to be wrong.", "Then write down the comparison, the purpose, and the main point."],
      ctaLabel: "Start the read",
    },
    {
      id: "ch11-read",
      type: "read",
      passageId: "narrative",
      minutes: 5,
      task: "Five minutes.<br><br>What is being compared here? Watch whether your first answer survives the second paragraph.",
      doneLabel: "I’m done reading",
    },
    {
      id: "ch11-before-you-see-my-take",
      type: "write",
      title: "Before you see my take",
      question: "What’s being compared in this passage? What’s the author’s purpose? What’s its main point?",
      placeholder: "What is being compared:\n\nAuthor’s purpose:\n\nMain point:",
      storageKey: "narrative-take",
      reveal: { buttonLabel: "Show my take on the passage", sectionLabel: "My take on the passage", html: "<p>Watch where my first hypothesis about the comparison goes wrong, and what corrects it.</p>" },
    }
    ],
  },
  {
    name: "Walkthrough: Comparison, again",
    screens: [
    {
      id: "ch12-working-through-it",
      type: "walk",
      title: "Working through it",
      beats: [
        { kind: "quote", html: "<p>In recent years, a growing belief that the way society decides what to treat as true is controlled through largely unrecognized discursive practices has led legal reformers to examine the complex interconnections between <mark class=\"rc-mark\">narrative and law</mark>.</p>" },
        { kind: "reaction", html: "<p>Ok, so the “complex interconnections between narrative and law.” Hmmm, perhaps the author will compare these two ideas or talk about the role of narrative in the legal field? Not too sure at this point; let’s read on.</p>" },
        { kind: "quote", html: "<p>In many legal systems, legal judgments are based on competing stories about events. Without having witnessed these events, judges and juries must validate some stories as true and reject others as false. This procedure is rooted in <mark class=\"rc-mark\">objectivism</mark>, a philosophical approach that has supported most Western legal and intellectual systems for centuries. Objectivism holds that there is a <mark class=\"rc-mark\">single neutral description</mark> of each event that is unskewed by any particular point of view and that has a privileged position over all other accounts. The law’s quest for truth, therefore, consists of <mark class=\"rc-mark\">locating this objective description</mark>, the one that tells what really happened, as opposed to what those involved thought happened.</p>" },
        { kind: "reaction", html: "<p>So the law is based on locating the objective description of what really happened. There’s a single version of what constitutes the truth.</p>" },
        { kind: "quote", html: "<p>The serious flaw in objectivism is that there is no such thing as the neutral, objective observer. As psychologists have demonstrated, all observers bring to a situation a set of expectations, values, and beliefs that determine what the observers are able to see and hear. Two individuals listening to the same story will hear different things, because they emphasize those aspects that accord with their learned experiences and ignore those aspects that are dissonant with their view of the world. <mark class=\"rc-mark\">Hence there is never any escape in life or in law from selective perception, or from subjective judgments based on prior experiences, values, and beliefs.</mark></p>" },
        { kind: "reaction", html: "<p>The author’s view is apparent here. They disagree with the objective view. The author thinks that we cannot escape subjective judgments. So the conflict/comparison isn’t between narrative and law, as we had initially thought. Instead, it’s between an objective and subjective view of the world. Furthermore, we now know what the author believes. They are attacking the belief in objectivism in legal procedures and defending subjectivism. That is probably the author’s purpose here.</p>" },
        { kind: "quote", html: "<p>The societal harm caused by the assumption of objectivist principles in traditional legal discourse is that historically, the stories judged to be objectively true are those told by <mark class=\"rc-mark\">people who are trained in legal discourse</mark>, while the stories of those who are <mark class=\"rc-mark\">not fluent in the language of the law</mark> are rejected as false.</p>" },
        { kind: "reaction", html: "<p>Wow, a third pair of two groups. People who have legal training and people who don’t. How does this play into our comparison between objective and subjective views?</p>\n      <p>We are told that the objectivist view has this negative implication. It disadvantages those who have no legal training. Ok, so this fits in with our previous understanding of the passage. The author is further attacking the objective view.</p>" },
        { kind: "quote", html: "<p>Legal scholars such as Patricia Williams, Derrick Bell, and Mari Matsuda have sought empowerment for the latter group of people through the construction of alternative legal narratives.</p>" },
        { kind: "reaction", html: "<p>So all three are on the same team here; maybe the author will talk about the nuanced differences between the three in this paragraph. But either way, all three are on team subjective.</p>" },
        { kind: "quote", html: "<p>Objectivist legal discourse systematically disallows the language of emotion and experience by focusing on cognition in its narrowest sense. These legal reformers propose <mark class=\"rc-mark\">replacing such abstract discourse with powerful personal stories</mark>. They argue that the absorbing, nonthreatening structure and tone of personal stories may <mark class=\"rc-mark\">convince legal insiders for the first time to listen to those not fluent in legal language</mark>. The compelling force of personal narrative can create a <mark class=\"rc-mark\">sense of empathy</mark> between legal insiders and people traditionally excluded from legal discourse and, hence, from power.</p>" },
        { kind: "reaction", html: "<p>The three scholars want to use personal stories and experiences to replace abstract legal discourse. The author thinks this can empower those with no legal training.</p>" },
        { kind: "quote", html: "<p>Thus, the engaging power of <mark class=\"rc-mark\">narrative</mark> might play a crucial, positive role in the process of legal reconstruction by overcoming differences in background and training and forming a new collectivity based on emotional empathy.</p>" },
        { kind: "reaction", html: "<p>The word “narrative” appears again. So by “narrative,” the author meant “subjective personal stories.” I didn’t realize that before, but it all makes sense now. The author’s purpose is to advocate for the role of personal narratives in legal discourse. Why are they doing it? Because the World is fundamentally subjective, and holding on to an objective view excludes the disenfranchised.</p>" }
      ],
      outro: "<p>By focusing on the contradictions between almost dialectically opposed concepts in the passage (objective vs. subjective; legally trained vs. untrained), we are reorganizing and re-categorizing the information we’ve just read. By grasping these key concepts, we are forced to come to a much clearer understanding of what the passage is talking about, its purpose and central thesis.</p>\n    <p>This passage is also typical of many other comparison-themed essays in that it starts by comparing and contrasting different concepts and positions, but eventually ends up recommending one over the other.</p>",
    }
    ],
  },
  {
    name: "Comparison meets Explain",
    screens: [
    {
      id: "ch13-a-passage-that-compares-by",
      type: "passage",
      title: "A passage that compares by explaining",
      intro: "<p>Read the following passage. You are not on the clock for this one. Watch how the comparison is carried almost entirely by explanation.</p>",
      passageId: "tectonics",
      followUp: { kind: "debrief", html: "<p>In this passage, the author essentially compares and explains two different plate tectonics theories. The traditional theory can’t explain why subduction doesn’t automatically mean earthquakes in certain areas. In other words, in some regions, one plate gets pushed under another, but no earthquakes occur; why? The new theory explains this well: the plates are moving in the same direction, and the plate coming in from behind sinks deep below the first one.</p>\n    <p>In the last passage, we used a hybrid of the Comparison-Recommendation framework to anticipate and understand the passage. Here, Comparison-Explain might be better suited. Most of the passage goes to explain the respective theories, but at its core, the passage compares the two theories.</p>\n    <p>The author is fairly neutral in this passage; they don’t explicitly pick one theory over the other, although we do sense that they are receptive to the new theory.</p>\n    <p>For now, let’s look at Explain type passages in more detail.</p>" },
    }
    ],
  },
  {
    name: "Explain",
    screens: [
    {
      id: "ch14-explain",
      type: "prose",
      eyebrow: "The E for Explain",
      title: "Explain",
      body: "<p>As we saw in the plate tectonics passage, the author went into great detail to explain how the traditional plate tectonics theory worked in explaining subduction and how earthquakes occurred. It also explained the second newer theory, even using the analogy of an oar dipping into the ocean to demonstrate how the second plate is likely to sink deeper into the mantle.</p>\n    <p>Many passages, especially scientific ones, will devote large portions to explaining an abstract concept or theory. Many students, especially under the pressure of test day, are terrified of this type of writing. They read through the writing, but nothing really registers. Even worse, many will get bogged down in the details, thus losing focus on WHY the author is explaining this stuff in the first place. Sometimes the author is explaining something simply for its own sake, and the purpose of the passage is to introduce a new concept/theory. But more often, the author may compare two ideas, evaluate them, and perhaps recommend one over the other.</p>\n    <p>When we come to Explain type passages, you must strive to do your best to simplify the concepts the author is trying to explain. As we said before, do not miss the forest for the trees. Also, think about the cause/effect relationships, if any, that appear in these passages.</p>\n    <p>Look at the following passage, test your understanding, and then see my thinking process and how we differ.</p>",
    },
    {
      id: "ch14-read-this-one-first",
      type: "passage",
      title: "Read this one first",
      passageId: "volcanoes",
      followUp: { kind: "prompt", text: "Take your own read at it before I walk through mine." },
    },
    {
      id: "ch14-now-watch-me-work-through",
      type: "walk",
      title: "Now watch me work through it",
      beats: [
        { kind: "quote", html: "<p>Long after the lava has cooled, the effects of a major volcanic eruption may linger on. In the atmosphere a veil of fine dust and sulfuric acid droplets can spread around the globe and persist for years. Researchers have generally thought that this veil can block enough sunlight to have a chilling influence on Earth’s climate. Many blame the cataclysmic eruption of the Indonesian volcano Tambora in 1815 for the ensuing “year without a summer” of 1816—when parts of the northeastern United States and southeastern Canada were hit by snowstorms in June and frosts in August.</p>" },
        { kind: "reaction", html: "<p>So volcano eruptions lead to dust in the atmosphere, which will cool the climate even a year later. That’s all you need to know from this paragraph.</p>" },
        { kind: "quote", html: "<p>The volcano-climate connection <mark class=\"rc-mark\">seems plausible</mark>, but, say scientists Clifford Mass and David Portman, it is not as strong as previously believed. Mass and Portman analyzed global temperature data for the years before and after nine volcanic eruptions, from Krakatau in 1883 to El Chichón in 1982. In the process they tried to <mark class=\"rc-mark\">filter out temperature changes caused by the cyclic weather phenomenon known as the El Niño-Southern Oscillation</mark>, which warms the sea surface in the equatorial Pacific and thereby warms the atmosphere. Such warming can mask the cooling brought about by an eruption, but it can also mimic volcanic cooling if the volcano happens to erupt just as an El Niño induced warm period is beginning to fade.</p>" },
        { kind: "reaction", html: "<p>Two scientists are challenging this connection. They did a bunch of studies and found that the cooling previously thought to have been caused by volcanic eruptions might be due to El Nino fading.</p>\n      <p>Remember, we talked about causal relationships? A can cause B, but alternative causes like C or D can also cause B. So here, the scientists think that the atmosphere cooled not because of volcanic eruptions but because the warming effects of El Nino are wearing off.</p>" },
        { kind: "quote", html: "<p>Once El Niño effects had been subtracted from the data, the actual effects of the eruptions came through more clearly. Contrary to what earlier studies had suggested, Mass and Portman found that minor eruptions have no discernible effect on temperature. And major, dust-spitting explosions, such as Krakatau or El Chichón, cause a smaller drop than expected in the average temperature in the hemisphere (Northern or Southern) of the eruption—only half a degree centigrade or less—a correspondingly smaller drop in the opposite hemisphere.</p>" },
        { kind: "reaction", html: "<p>So volcanic eruptions have a smaller and even negligible effect on temperature. The major culprit is El Nino ending.</p>" },
        { kind: "quote", html: "<p>Other researchers, however, have argued that even a small temperature drop could result in a significant regional fluctuation in climate if its effects were amplified by climatic feedback loops. For example, a small temperature drop in the northeastern U.S. and southeastern Canada in early spring might delay the melting of snow, and the unmelted snow would continue to reflect sunlight away from the surface, amplifying the cooling. The cool air over the region could, in turn, affect the jet stream. The jet stream tends to flow at the boundary between cool northern air and warm southern air, drawing its power from the sharp temperature contrast and the consequent difference in pressure. An unusual cooling in the region could cause the stream to wander farther south than normal, allowing more polar air to come in behind it and deepen the region’s cold snap. Through such a series of feedbacks a small temperature drop could be blown up into a year without a summer.</p>" },
        { kind: "reaction", html: "<p>What another group of researchers think is introduced. Be sure to compare the two schools of thought.</p>\n      <p>What does the other group think? It sounds like a counterargument to me. They think that even if the drop in temperature is smaller than previously thought, it can snowball into a much bigger influence down the road. Does the author take a position? Not really.</p>" }
      ],
      outro: "<p>So this passage, once you have simplified the concepts and grasped what at its core is a scientific debate, is fairly straightforward.</p>\n    <p>Some scientists believe that the effects of volcanic eruptions on climate cooling are negligible.</p>\n    <p>Other researchers think that even if the initial change is small, that can greatly impact climate cooling down the road.</p>\n    <p>In this passage, the author explains the belief of some scientists and gives us the response of another group of scientists.</p>\n    <p>We will go into more detail on how to tackle a passage that is full of abstract concepts and excruciating details down the road, but for now, just remember that if a passage contains such an explanation, try to simplify the concept that the author is trying to explain, and ask yourself why such an explanation is warranted?</p>",
    }
    ],
  },
  {
    name: "Evaluation",
    screens: [
    {
      id: "ch15-evaluation",
      type: "prose",
      eyebrow: "The E for Evaluation",
      title: "Evaluation",
      body: "<p>Now we are moving into passages where the author’s viewpoint/opinion is even more explicit. In Evaluation themed passages, the author will make a judgment call about the pros and cons of a position or idea they have previously described. Does the author think this position is a good one? Do they agree with it?</p>\n    <p>The author’s attitude towards a certain position mentioned in the passage features in many questions, so it’s crucial to note if what you are reading is simply the author stating the facts, or an expression of their opinion.</p>\n    <p>Let’s look at a few passages where the author makes a judgment call. There may be parts of the passage where the author is comparing or explaining something, with the evaluation coming in during another part of the passage. So, it’s essential to remain flexible as you are reading.</p>",
    },
    {
      id: "ch15-read-this-one-first",
      type: "passage",
      title: "Read this one first",
      passageId: "autobiography",
      followUp: { kind: "prompt", text: "Notice where the author is stating facts and where they are passing judgment." },
    },
    {
      id: "ch15-working-through-it",
      type: "walk",
      title: "Working through it",
      beats: [
        { kind: "quote", html: "<p>In studying the autobiographies of Native Americans, <mark class=\"rc-mark\">most scholars have focused on as-told-to life histories that were solicited, translated, recorded, and edited by non-Native American collaborators</mark>—that emerged from “bicultural composite authorship.” Limiting their studies to such written documents, these scholars have <mark class=\"rc-mark\">overlooked traditional, preliterate modes of communicating personal history</mark>. In addition, they have <mark class=\"rc-mark\">failed to address the cultural constructs</mark> of the highly diverse Native American peoples, who prior to contact with nonindigenous cultures did not share with Europeans the same assumptions about self, life, and writing that underlie the concept of an autobiography—that indeed constitute the English word’s root meaning.</p>" },
        { kind: "reaction", html: "<p>Right off the bat, the author talks about a problem possessed by most scholars. Their focus has been devoted to autobiographies written in partnership with non-native Americans. The author’s tone is quite obvious. They disagree with this practice.</p>\n      <p>What will the author do next? Talk about ways to remedy this? Compare this with a minor faction of writers? Explain the cause behind this narrow-mindedness? We have to keep on reading to find out.</p>" },
        { kind: "quote", html: "<p>The idea of self was, in a number of pre-contact Native American cultures, markedly <mark class=\"rc-mark\">inclusive</mark>: identity was not merely individual, but also relational to a society, a specific landscape, and the cosmos. Within these cultures, the expression of life experiences tended to be oriented toward current events: with the participation of fellow tribal members, an individual person would articulate, reenact, or record important experiences as the person lived them, a mode of autobiography seemingly more fragmented than the European custom of writing down the recollections of a lifetime. Moreover, expression itself was not a matter of writing but of language, which can include speech and signs. <mark class=\"rc-mark\">Oral autobiography</mark> comprised songs, chants, stories, and even the process whereby one repeatedly took on new names to reflect important events and deeds in one’s life. <mark class=\"rc-mark\">Dance and drama could convey personal history</mark>; for example, the advent of a vision to one person might require the enactment of that vision in the form of a tribal pageant.</p>" },
        { kind: "reaction", html: "<p>The author talks about how Native American cultural practices differ from European ones. The concept of an autobiography is alien as fellow tribe members can equally articulate one’s life experience. Oral history, dance, and ceremonies are all equally valid forms of re-enacting one’s life.</p>\n      <p>Think about the differences between Native American and European practices here. The comparison framework works well.</p>" },
        { kind: "quote", html: "<p>One can view as autobiographical the elaborate <mark class=\"rc-mark\">tattoos that symbolized a warrior’s valorous deeds</mark>, and such artifacts as a decorated <mark class=\"rc-mark\">shield that communicated the accomplishments and aspirations of its maker</mark>, or a <mark class=\"rc-mark\">robe that was emblazoned with the pictographic history of the wearer’s battles</mark> and was sometimes used in re-enactments. Also autobiographical, and indicative of high status within the tribe, would have been a <mark class=\"rc-mark\">tepee painted with symbolic designs</mark> to record the achievements and display the dreams or visions of its owner, who was often assisted in the painting by other tribal members.</p>" },
        { kind: "reaction", html: "<p>Here, the author lists objects that we wouldn’t normally associate with an autobiography, and argues they are autobiographical in nature. This is a further development of the idea presented in the previous paragraph.</p>" },
        { kind: "quote", html: "<p>A tribe would, then, have <mark class=\"rc-mark\">contributed to the individual’s narrative not merely passively</mark>, by its social codes and expectations, but <mark class=\"rc-mark\">actively</mark> by joining in the expression of that narrative. Such intercultural collaboration may seem alien to the European style of autobiography, yet any autobiography is shaped by its creator’s ideas about the audience for which it is intended; in this sense, <mark class=\"rc-mark\">autobiography is justly called a simultaneous individual story and cultural narrative</mark>. Autobiographical expressions by early Native Americans may additionally have been shaped by the cultural perspectives of the people who transmitted them.</p>" },
        { kind: "reaction", html: "<p>In the last paragraph, the author argues that an autobiography is not simply a traditional, European-styled work written by the individual; collective experiences and objects can also constitute an autobiographical expression.</p>" }
      ],
      outro: "<p>If we were to tie everything together, then the evaluative nature of this passage becomes evident:</p>\n    <ul>\n      <li>Paragraph 1: Scholars ignored Native American cultural practices by focusing on Eurocentric autobiographies.</li>\n      <li>Paragraph 2: Native American cultural practices meant that there were many ways to express one’s life than a simple work in writing.</li>\n      <li>Paragraph 3: Objects and shared experiences within the tribe can also be considered autobiographical.</li>\n      <li>Paragraph 4: A repetition and summary of the ideas expressed in paragraphs 2 and 3.</li>\n    </ul>\n    <p>The author’s position/attitude is quite clear from the very beginning. They are critical of the current scholarly practice, as it ignores traditional cultural practices and trends. They then delineate the differences between Native American and European conceptualizations and expressions of self. (Comparison)</p>",
    }
    ],
  },
  {
    name: "Recommendation",
    screens: [
    {
      id: "ch16-recommendation",
      type: "prose",
      eyebrow: "The R for Recommendation",
      title: "Recommendation",
      body: "<p>We have already seen recommendations in several of the passages previously. The author has spoken in favor of a specific course of action, or advocated one practice over another. A recommendation-themed passage is similar to an evaluation one in that the author is making their position clear. But the difference will be that in an Evaluation themed passage, the author is simply pointing out the good and bad of an action or practice. In contrast, the author will deliberately vouch for a certain course of action in a recommendation-themed passage.</p>\n    <p>In simpler terms, if the author is evaluating something, they are listing its good and bad; but if the author is recommending something, then we know that the author is telling us to do or believe something.</p>",
    },
    {
      id: "ch16-read-this-one-first",
      type: "passage",
      title: "Read this one first",
      passageId: "scienceHumanities",
      followUp: { kind: "prompt", text: "Ask yourself what the author is telling you to do, not just what they think." },
    },
    {
      id: "ch16-working-through-it",
      type: "walk",
      title: "Working through it",
      beats: [
        { kind: "quote", html: "<p>An effort should be made to dispel the misunderstandings that still prevent the much-needed synthesis and mutual supplementation of science and the humanities. This reconciliation should not be too difficult once it is recognized that the separation is primarily the result of a basic misunderstanding of the philosophical foundations of both science and the humanities.</p>" },
        { kind: "reaction", html: "<p>So the author is calling for a synthesis of the science and humanities. I’m not too sure what that means; maybe both should be taught together in a multidisciplinary setting? Perhaps we should have science majors learn the classics, and have art majors learn some STEM subjects as well? We shall see. But this is definitely a recommendation.</p>" },
        { kind: "quote", html: "<p>Some humanists still identify science with an absurd mechanistic reductionism. There are many who feel that the scientist is interested in nothing more than “bodies in motion,” in the strictly mathematical, physical, and chemical laws that govern the material world. This is the caricature of science drawn by representatives of the humanities who are ignorant of the nature of modern science and also of the scientific outlook in philosophy. For example, it is claimed that science either ignores or explains away the most essential human values. Those who believe this also assert that there are aspects of the human mind, manifest especially in the domains of morality, religion, and the arts, that contain an irreducible spiritual element and for that reason can never be adequately explained by science.</p>" },
        { kind: "reaction", html: "<p>The author introduces the view of some humanists toward science, a view they don’t agree with, as the author feels it is too simplified.</p>" },
        { kind: "quote", html: "<p>Some scientists, on the other hand, claim that the humanist is interested in nothing more than emotion and sentiment, exhibiting the vagrant fancies of an undisciplined mind. To such men and women the humanities are useless because they serve no immediate and technological function for the practical survival of human society in the material world. Such pragmatists believe that the areas of morality, religion, and the arts should have only a secondary importance in people’s lives.</p>" },
        { kind: "reaction", html: "<p>Here, the author introduces what some scientists think of the humanities. In these two paragraphs, the author compares what could be considered biased views from opposite camps. Some humanists take an oversimplified view of science, while some scientists think the humanities are useless.</p>" },
        { kind: "quote", html: "<p>Thus <mark class=\"rc-mark\">there are misconceptions</mark> among humanists and scientists alike that are in need of correction. This correction leads to a much more acceptable position that could be called “<mark class=\"rc-mark\">scientific humanism</mark>,” attempting as it does to <mark class=\"rc-mark\">combine the common elements of both disciplines</mark>. Both science and the humanities attempt to describe and explain. It is true that they begin their descriptions and explanations at widely separated points, but the <mark class=\"rc-mark\">objectives remain the same</mark>: a clearer understanding of people and their world. In achieving this understanding, science in fact does not depend exclusively on measurable data, and the humanities in fact profit from attempts at controlled evaluation. Scientific humanism can <mark class=\"rc-mark\">combine the scientific attitude with an active interest in the whole scale of human values</mark>. If uninformed persons insist on viewing science as only materialistic and the humanities as only idealistic, a fruitful collaboration of both fields is unlikely. The combination of science and the humanities is, however, possible, even probable, if we <mark class=\"rc-mark\">begin by noting their common objectives</mark>, rather than seeing only their different means.</p>" },
        { kind: "reaction", html: "<p>After pointing out the shortcomings of both sides, the author continues with their comparison of the science and humanities. Noting their similarities and similar objectives, the author then goes on to reiterate the call to combine the two, emphasizing their similarities rather than differences.</p>" }
      ],
      outro: "<p>Understanding of this passage can be improved if we remember to note the recommendation the author makes, the comparison between the sciences and humanities, as well as the author’s evaluation of the scientists and humanists who couldn’t see the bigger picture. As you read through a passage, constantly ask yourself if the author is making a comparison, explaining something, evaluating a claim, or suggesting a recommendation. This will help you immensely on your path to developing the habit of active reading.</p>",
    }
    ],
  },
  {
    name: "Summary",
    screens: [
    {
      id: "ch17-summary",
      type: "prose",
      title: "Summary",
      body: "<ul>\n      <li>Engaging with the passage as you read through it is the first step to improving performance in the RC section. If blindly wandering through the information is something you tend to do, it must be fixed at all costs!</li>\n      <li>A key question to ask yourself from the beginning is <strong>why the author is writing this passage?</strong> Every passage was written with a goal in mind. As you read through the passage, the answer to this question should become clear.</li>\n      <li>Use the <strong>Hypothesis-Validation Framework</strong> to become more involved in the reading process. As you read, try to come up with potential answers to the passage’s purpose, or what the author will say next. Use subsequent information to confirm or modify your hypothesis. This process is beneficial in the most difficult readings.</li>\n      <li>Another way to force yourself to engage with the passage is to try to decipher what move the author is making throughout the passage. We use <strong>CEER</strong> to constantly remind ourselves what the author is doing as we are reading.</li>\n    </ul>\n    <p>Is the author making a <strong>comparison</strong>? If so, between what? Why is the author making this comparison?</p>\n    <p>Is the author <strong>explaining</strong> a concept or theory? Can the author’s explanation be simplified so I can better grasp what they are trying to express?</p>\n    <p>Is the author making an <strong>evaluative</strong> claim? What is the author’s opinion? Are they for or against it, and why?</p>\n    <p>Is the author making a <strong>recommendation</strong>? Or is their stance more neutral?</p>\n    <p>Practice these habits as you read in subsequent exercises and on your own. Eventually, the process should come more naturally to you; good luck!</p>",
      callout: { variant: "quiet", label: "Coming up next", body: "Next, we will look at ways to structurally reorganize the paragraphs/passages during our initial read-through." },
    }
    ],
  },
];

/** Flat screen list; index into this is the lesson position. */
export const SCREENS: { screen: Screen; chapterIndex: number }[] = CHAPTERS.flatMap(
  (chapter, chapterIndex) => chapter.screens.map((screen) => ({ screen, chapterIndex })),
);

export const TOTAL_SCREENS = SCREENS.length;

/** The one write screen that hard-gates Continue (no skip). */
export const FIRST_WRITE_INDEX = SCREENS.findIndex(({ screen }) => screen.type === 'write');

/** Minimum characters before a write screen's Continue / reveal unlocks. */
export const WRITE_MIN_CHARS = 40;
