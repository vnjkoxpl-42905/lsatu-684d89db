import type { InteractiveDrillItem, PartRole, StimulusPart, RevealEntry } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import type { FamilyQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import simulatorData from '@/bootcamps/main-conclusion/data/simulator.generated.json';

/**
 * Clean adapter for mapping Simulator questions to Structured Dissection drills.
 * Modeled after structuredrill's parts array for logical consistency.
 */

interface SimQ {
  id: string;
  number: number;
  title: string;
  structure_family: 'First-sentence' | 'Rebuttal';
  stimulus: string;
  main_conclusion: string;
  why: string;
  structure_map: string;
  follow_up_answer: string;
}

interface PartMetadata {
  text: string;
  isC?: boolean;
  isS?: boolean;
  isO?: boolean;
  isN?: boolean;
}

/**
 * Mapping of Simulator QIDs to their logical parts from structuredrill.
 * This is used to hydrate the InteractiveDrillItem structure.
 */
const SIMULATOR_ROLE_MAP: Record<string, PartMetadata[]> = {
  'MC-SIM-Q1': [
    { text: "The vision test for obtaining a driver's license <i-w t=\"Opinion Indicator\">should</i-w> not be limited to measuring the adequacy of vision in daylight conditions, as is the current practice.", isC: true },
    { text: "Many people whose daylight vision is adequate have night vision that is inadequate for safe night driving.", isS: true },
    { text: "Most car accidents occur at night, and inadequate vision plays a role in 80 percent of these accidents.", isS: true }
  ],
  'MC-SIM-Q2': [
    { text: "Freedom of speech is not only a basic human right; it is also the only rational policy for this government to adopt.", isC: true },
    { text: "When ideas are openly aired, good ideas flourish, silly proposals are easily recognized as such, and dangerous ideas can be responded to by rational argument.", isS: true },
    { text: "Nothing is ever gained by forcing citizens to disseminate their thoughts in secret.", isS: true }
  ],
  'MC-SIM-Q3': [
    { text: "Arguing that there was no trade between Europe and East Asia in the early Middle Ages because there are no written records of such trade is like arguing that the yeti, an apelike creature supposedly existing in the Himalayas, does not exist because there have been no scientifically confirmed sightings.", isC: true },
    { text: "A verifiable sighting of the yeti would prove that the creature does exist, <i-w t=\"Pivot\">but</i-w> the absence of sightings cannot prove that it does not.", isS: true }
  ],
  'MC-SIM-Q4': [
    { text: "No computer will ever be able to do everything that some human minds can do,", isC: true },
    { text: "<i-w t=\"Premise Indicator\">for</i-w> there are some problems that cannot be solved by following any set of mechanically applicable rules.", isS: true },
    { text: "<i-w t=\"Pivot\">Yet</i-w> computers can only solve problems by following some set of mechanically applicable rules.", isS: true }
  ],
  'MC-SIM-Q5': [
    { text: "The toy-labeling law <i-w t=\"Opinion Indicator\">should</i-w> require manufacturers to provide explicit safety labels on toys to indicate what hazards the toys pose.", isC: true },
    { text: "The only labels currently required by law are labels indicating the age range for which a toy is intended.", isN: true },
    { text: "For instance, a \"three and up\" label is required on toys that pose a choking hazard for children under three years of age.", isS: true },
    { text: "<i-w t=\"Concession Indicator\">Although</i-w> the current toy-labeling law has indeed reduced the incidence of injuries to children from toys,", isO: true },
    { text: "parents could prevent such injuries almost entirely if toy labels provided explicit safety information.", isS: true }
  ],
  'MC-SIM-Q6': [
    { text: "It is inaccurate to say that a diet high in refined sugar cannot cause adult-onset diabetes,", isC: true },
    { text: "<i-w t=\"Premise Indicator\">since</i-w> a diet high in refined sugar can make a person overweight, and being overweight can predispose a person to adult-onset diabetes.", isS: true }
  ],
  'MC-SIM-Q7': [
    { text: "It is unreasonable to incarcerate anyone for any other reason than that he or she is a serious threat to the property or lives of other people.", isC: true },
    { text: "The breaking of a law does not justify incarceration,", isS: true },
    { text: "<i-w t=\"Premise Indicator\">for</i-w> lawbreaking proceeds either from ignorance of the law or of the effects of one's actions, or from the free choice on the part of the lawbreaker.", isS: true },
    { text: "<i-w t=\"Opinion Indicator\">Obviously</i-w> mere ignorance cannot justify incarcerating a lawbreaker, and even free choice on the part of the lawbreaker fails to justify incarceration, <i-w t=\"Premise Indicator\">for</i-w> free choice proceeds from the desires of an agent, and the desires of an agent are products of genetics and environmental conditioning, neither of which is controlled by the agent.", isS: true }
  ],
  'MC-SIM-Q8': [
    { text: "<i-w t=\"Concession Indicator\">Even though</i-w> cotton and nylon are used for similar purposes, some people have the mistaken notion that cotton is natural but nylon is not.", isO: true },
    { text: "<i-w t=\"Pivot\">However</i-w>, nylon's main components come from petroleum and from the nitrogen in the atmosphere.", isC: true },
    { text: "<i-w t=\"Opinion Indicator\">Clearly</i-w> the atmosphere is natural. And petroleum comes from oil, which in turn comes from ancient plants—a natural source.", isS: true }
  ],
  'MC-SIM-Q9': [
    { text: "Mayor McKinney's policies have often been criticized on the grounds that they benefit only wealthy city residents,", isO: true },
    { text: "<i-w t=\"Pivot\">but</i-w> that is not a fair evaluation.", isC: true },
    { text: "Some of McKinney's policies have <i-w t=\"Opinion Indicator\">clearly</i-w> benefited the city's less affluent residents. McKinney actively supported last year's proposal to lower the city's high property taxes.", isS: true },
    { text: "<i-w t=\"Premise Indicator\">Because</i-w> of this tax decrease, more development is taking place in the city, helping to end the housing shortage and stabilize the rents in the city.", isS: true }
  ],
  'MC-SIM-Q10': [
    { text: "Some legislators refuse to commit public funds for new scientific research if they cannot be assured that the research will contribute to the public welfare.", isO: true },
    { text: "Such a position ignores the lessons of experience.", isC: true },
    { text: "Many important contributions to the public welfare that resulted from scientific research were never predicted as potential outcomes of that research. Suppose that a scientist in the early twentieth century had applied for public funds to study molds: who would have predicted that such research would lead to the discovery of antibiotics—one of the greatest contributions ever made to the public welfare?", isS: true }
  ],
  'MC-SIM-Q11': [
    { text: "I was shocked to learn that Judge Mosston was convicted of criminal assault,", isN: true },
    { text: "<i-w t=\"Pivot\">but</i-w> I disagree with my fellow citizens who believe that he should be forced to resign.", isC: true },
    { text: "I have played cards with Judge Mosston for many years, and he has always shown himself to be fair toward me and our fellow cardplayers. Our judicial system simply cannot afford to lose any just and fair judges.", isS: true }
  ],
  'MC-SIM-Q12': [
    { text: "<i-w t=\"Opposing Viewpoint\">Some people believe</i-w> that witnessing violence in movies will discharge aggressive energy.", isO: true },
    { text: "Does watching someone else eat fill one's own stomach?", isC: true }
  ],
  'MC-SIM-Q13': [
    { text: "Behind the hope that computers can replace teachers is the idea that the student's understanding of the subject being taught consists in knowing facts and rules, the job of a teacher being to make the facts and rules explicit and convey them to the student, either by practice drills or by coaching. If that were indeed the way the mind works, the teacher could transfer facts and rules to the computer, which would replace the teacher as drillmaster and coach.", isO: true },
    { text: "<i-w t=\"Pivot\">But</i-w> <i-w t=\"Premise Indicator\">since</i-w> understanding does not consist merely of knowing facts and rules, but of the grasp of the general concepts underlying them,", isS: true },
    { text: "the hope that the computer will eventually replace the teacher is fundamentally misguided.", isC: true }
  ],
  'MC-SIM-Q14': [
    { text: "So-called environmentalists have argued that the proposed Golden Lake Development would interfere with bird-migration patterns.", isO: true },
    { text: "<i-w t=\"Pivot\">However</i-w>, the fact that these same people have raised environmental objections to virtually every development proposal brought before the council in recent years indicates that their expressed concern for bird migration patterns is nothing but a mask for their antidevelopment, antiprogress agenda.", isS: true },
    { text: "Their claim, <i-w t=\"Conclusion Indicator\">therefore</i-w>, <i-w t=\"Opinion Indicator\">should</i-w> be dismissed without further consideration.", isC: true }
  ],
  'MC-SIM-Q15': [
    { text: "That long-term cigarette smoking can lead to health problems including cancer and lung disease is a scientifically well-established fact.", isN: true },
    { text: "Contrary to what many people seem to believe, <i-w t=\"Pivot\">however</i-w>, it is not necessary to deny this fact in order to reject the view that tobacco companies should be held either morally or legally responsible for the poor health of smokers.", isC: true },
    { text: "<i-w t=\"Premise Indicator\">After all</i-w>, excessive consumption of candy undeniably leads to such health problems as tooth decay, <i-w t=\"Pivot\">but</i-w> no one seriously believes that candy eaters who get cavities should be able to sue candy manufacturers.", isS: true }
  ],
  'MC-SIM-Q16': [
    { text: "Pharmacists maintain that doctors should not be permitted to sell the medicine that they prescribe <i-w t=\"Premise Indicator\">because</i-w> doctors would then be tempted to prescribe unnecessary medicines in order to earn extra income.", isO: true },
    { text: "<i-w t=\"Pivot\">But</i-w> pharmacists have a financial interest in having a monopoly on the sale of prescription medicines,", isS: true },
    { text: "<i-w t=\"Conclusion Indicator\">so</i-w> their objection to the sale of medicines by doctors cannot be taken seriously.", isC: true }
  ],
  'MC-SIM-Q17': [
    { text: "Our radio station has a responsibility to serve the public interest.", isS: true },
    { text: "<i-w t=\"Conclusion Indicator\">Hence</i-w>, when our critics contend that our recent exposé of events in the private lives of local celebrities was excessively intrusive,", isO: true },
    { text: "we can only reply that the overwhelming public interest in these matters makes it our responsibility to publicize them.", isC: true }
  ],
  'MC-SIM-Q18': [
    { text: "The fire that destroyed the Municipal Building started before dawn this morning, and the last fire fighters did not leave until late this afternoon. No one could have been anywhere in the vicinity of a fire like that one and fail to notice it.", isS: true },
    { text: "Thomas <i-w t=\"Opinion Indicator\">must</i-w> have seen it,", isC: true },
    { text: "whatever he now says to the contrary.", isO: true },
    { text: "He admits that, as usual, he went from his apartment to the library this morning, and there is no way for him to get from his apartment to the library without going past the Municipal Building.", isS: true }
  ],
  'MC-SIM-Q19': [
    { text: "There is no mystery as to why figurative painting revived in the late 1970s.", isC: true },
    { text: "People want to look at recognizable images. Sorting out art theories reflected in abstract paintings is no substitute for the sense of empathy that comes from looking at a realistic painting of a figure in a landscape.", isS: true },
    { text: "<i-w t=\"Opinion Indicator\">Perhaps</i-w> members of the art-viewing public resented abstract art <i-w t=\"Premise Indicator\">because</i-w> they felt that its lack of realistic subject matter was a rejection of the viewers and their world.", isS: true }
  ],
  'MC-SIM-Q20': [
    { text: "<i-w t=\"Premise Indicator\">Since</i-w> multinational grain companies operate so as to maximize profits,", isS: true },
    { text: "they cannot be relied on to initiate economic changes that would reform the world's food-distribution system.", isC: true },
    { text: "<i-w t=\"Concession Indicator\">Although</i-w> it is true that the actions of multinational companies sometimes do result in such economic change,", isO: true },
    { text: "this result is incidental, arising not from the desire for reform <i-w t=\"Pivot\">but</i-w> from the desire to maximize profits. The maximization of profits normally depends on a stable economic environment, one that discourages change.", isS: true }
  ]
};

/**
 * Utility to strip <i-w> tags for plain text display.
 */
export function stripIndicators(text: string): string {
  return text.replace(/<i-w[^>]*>(.*?)<\/i-w>/g, '$1');
}

/**
 * Utility to map PartRole to LSAT U UI Labels.
 */
function roleLabel(role: PartRole): string {
  switch (role) {
    case 'main':
    case 'conclusion':
      return 'Main Conclusion';
    case 'premise':
    case 'support':
      return 'Support';
    case 'opposing':
      return 'Opposing View';
    case 'concession':
      return 'Concession';
    case 'background':
      return 'Background';
    default:
      return 'Sentence';
  }
}

/**
 * Adapter function to turn a Simulator question into an InteractiveDrillItem.
 */
export function adaptSimulatorQuestion(q: SimQ): InteractiveDrillItem {
  const metaParts = SIMULATOR_ROLE_MAP[q.id] || [{ text: q.stimulus, isC: true }];
  
  const parts: StimulusPart[] = metaParts.map((p, index) => {
    let role: PartRole = 'background';
    if (p.isC) role = 'conclusion';
    else if (p.isS) role = 'support';
    else if (p.isO) role = 'opposing';
    else if (p.isN) role = 'background';

    return {
      id: `${q.id}-part-${index + 1}`,
      text: stripIndicators(p.text),
      role,
      hint: roleLabel(role)
    };
  });

  const conclusionPart = parts.find(p => p.role === 'conclusion');
  const supportPartIds = parts.filter(p => p.role === 'support').map(p => p.id);
  const opposingPartIds = parts.filter(p => p.role === 'opposing').map(p => p.id);

  // Payload for the rebuttal_dissection mode
  const payload: FamilyQuestion = {
    id: q.id,
    prompt: "Dissect the argument structure.",
    stimulus: q.stimulus,
    family: q.structure_family,
    rationale: q.why
  };

  const revealMap: RevealEntry[] = parts.map(p => ({
    id: p.id,
    label: roleLabel(p.role!),
    role: p.role!,
    text: p.text,
    note: p.hint
  }));

  return {
    id: q.id,
    mode: 'rebuttal_dissection',
    title: q.title,
    prompt: "Dissect the argument structure.",
    payload,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: conclusionPart?.id,
    correctSupportPartIds: supportPartIds,
    correctOpposingPartIds: opposingPartIds,
    hint: 'Separate the author’s claim from the view being rejected.',
    revealMap
  };
}

/**
 * Returns all 20 simulator questions as InteractiveDrillItems.
 */
export function getSimulatorDrills(): InteractiveDrillItem[] {
  return (simulatorData as SimQ[]).map(adaptSimulatorQuestion);
}
