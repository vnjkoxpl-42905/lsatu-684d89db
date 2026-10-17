import { classifyDetail, type JudgeEntry } from "./rrcGrading.ts";

/** Source-only curriculum classifications, never derived from a learner grade.
 * These keys preserve exhaustive coverage separately from operative meaning.
 * They bind the complete source and ordered authored facts, not a score, model
 * transcript, exemplar recording or expected answer from a learner.
 */
export const MEANING_KEY_VERSION = "source-reviewed-2026-10-16-v1";

type ReviewedKey = {
  stimulus: string;
  details: { text: string; line: number; material: boolean; reason: string }[];
};

const REVIEWED_KEYS: Record<string, ReviewedKey> = {
  "PT105_S2_Q1": {
    "stimulus": "French divers recently found a large cave along the coast of the Mediterranean Sea. The cave is accessible only through an underwater tunnel. The interior of the cave is completely filled with seawater and contains numerous large stalagmites, which are stony pillars that form when drops of water fall repeatedly on a single spot on a cave floor, leaving behind mineral deposits that accumulate over time.",
    "details": [
      {
        "text": "Divers found a cave.",
        "line": 1,
        "material": true,
        "reason": "Preserves the discovery event and the object whose history is inferred."
      },
      {
        "text": "The divers were French.",
        "line": 1,
        "material": true,
        "reason": "Preserves the identity of the discoverers rather than substituting another group."
      },
      {
        "text": "The find was recent.",
        "line": 1,
        "material": false,
        "reason": "The discovery date does not affect whether water drops formed the existing pillars before submersion."
      },
      {
        "text": "The cave is large.",
        "line": 1,
        "material": false,
        "reason": "The cave size does not affect the incompatibility between falling drops and complete submersion."
      },
      {
        "text": "The cave is along a coast.",
        "line": 1,
        "material": true,
        "reason": "Preserves the stated location of the identified cave."
      },
      {
        "text": "The coast is the Mediterranean Sea's.",
        "line": 1,
        "material": true,
        "reason": "Preserves the named geographic referent rather than substituting a different sea."
      },
      {
        "text": "There is only one way into the cave.",
        "line": 2,
        "material": true,
        "reason": "Preserves the exclusive access constraint rather than weakening only to an optional route."
      },
      {
        "text": "The way in is a tunnel.",
        "line": 2,
        "material": true,
        "reason": "Preserves the stated means of access to the identified cave."
      },
      {
        "text": "The tunnel is underwater.",
        "line": 2,
        "material": true,
        "reason": "Preserves the route being underwater rather than an above-water entrance."
      },
      {
        "text": "This is about the inside of the cave.",
        "line": 3,
        "material": false,
        "reason": "This is a topic label repeated by the claims about the cave interior, not another independent premise."
      },
      {
        "text": "It is filled with water.",
        "line": 3,
        "material": true,
        "reason": "Water in the cave is one side of the contrast with formation by falling drops."
      },
      {
        "text": "The water is seawater.",
        "line": 3,
        "material": false,
        "reason": "Salinity is not used in the formation account or in the inference about prior complete submersion; water is the needed category."
      },
      {
        "text": "It is filled completely.",
        "line": 3,
        "material": true,
        "reason": "Complete submersion is essential: partly flooded conditions would not establish the same contrast."
      },
      {
        "text": "The cave contains stalagmites.",
        "line": 3,
        "material": true,
        "reason": "The existing formations are the evidence from which the cave history is inferred."
      },
      {
        "text": "The stalagmites are numerous.",
        "line": 3,
        "material": false,
        "reason": "How many formations exist does not change the inference from their formation process to earlier non-submersion."
      },
      {
        "text": "The stalagmites are large.",
        "line": 3,
        "material": false,
        "reason": "The size of the formations is unused in the inference; the formation process supplies the evidence."
      },
      {
        "text": "Stalagmites are a kind of pillar.",
        "line": 4,
        "material": true,
        "reason": "Preserves what the formations are, connecting the described process to the objects in the cave."
      },
      {
        "text": "The pillars are made of stone.",
        "line": 4,
        "material": false,
        "reason": "The specific stone label is not needed once the deposit-formed pillars and their formation process are preserved."
      },
      {
        "text": "They form from falling drops of water.",
        "line": 4,
        "material": true,
        "reason": "Falling drops are the mechanism that conflicts with complete submersion."
      },
      {
        "text": "The drops fall repeatedly.",
        "line": 4,
        "material": true,
        "reason": "Repeated falling is needed for the described accumulation process, rather than a single event."
      },
      {
        "text": "The drops fall on one single spot.",
        "line": 4,
        "material": false,
        "reason": "The account already preserves repeated drops producing accumulated floor pillars; the exact footprint of accumulation is not used to infer earlier non-submersion."
      },
      {
        "text": "The spot is on a cave floor.",
        "line": 4,
        "material": true,
        "reason": "The formation is on the floor, preserving the stated location and distinguishing the objects from ceiling formations."
      },
      {
        "text": "The drops leave mineral deposits behind.",
        "line": 4,
        "material": true,
        "reason": "Deposits left by drops explain the formation rather than merely reporting that pillars exist."
      },
      {
        "text": "The deposits build up over time.",
        "line": 4,
        "material": true,
        "reason": "Accumulation over time connects the formations to earlier conditions rather than only their present appearance."
      }
    ]
  },
  "PT105_S2_Q2": {
    "stimulus": "A director of the Rexx Pharmaceutical Company argued that the development costs for new vaccines that the health department has requested should be subsidized by the government, since the marketing of vaccines promised to be less profitable than the marketing of any other pharmaceutical product. In support of this claim the director argued that sales of vaccines are likely to be lower since each vaccine is administered to a patient only once, whereas medicines that combat diseases and chronic illnesses are administered many times to each patient.",
    "details": [
      {
        "text": "A director made an argument.",
        "line": 1,
        "material": true,
        "reason": "Preserves the actor who advances the subsidy argument."
      },
      {
        "text": "The director is at Rexx Pharmaceutical Company.",
        "line": 1,
        "material": true,
        "reason": "Preserves the named affiliation and source of the argument."
      },
      {
        "text": "The argument is about development costs.",
        "line": 1,
        "material": true,
        "reason": "Development costs are the expense the proposed subsidy would cover."
      },
      {
        "text": "The costs are for new vaccines.",
        "line": 1,
        "material": true,
        "reason": "Vaccines are the product whose development costs and profitability are compared."
      },
      {
        "text": "The health department requested those vaccines.",
        "line": 1,
        "material": true,
        "reason": "Preserves who requested the vaccines and the request relationship."
      },
      {
        "text": "He wants the costs subsidized.",
        "line": 1,
        "material": true,
        "reason": "Subsidizing the costs is the proposed action, not an action already completed."
      },
      {
        "text": "The government should do the subsidizing.",
        "line": 1,
        "material": true,
        "reason": "The government is the proposed payer; substituting another actor changes the policy claim."
      },
      {
        "text": "This is his reason.",
        "line": 2,
        "material": true,
        "reason": "Preserves that profitability is offered as support for the subsidy proposal."
      },
      {
        "text": "It is about marketing vaccines.",
        "line": 2,
        "material": true,
        "reason": "The comparison concerns marketing vaccines, not another stage or product."
      },
      {
        "text": "Marketing vaccines is expected to be less profitable.",
        "line": 2,
        "material": true,
        "reason": "Lower expected profitability is the premise connecting the product comparison to the proposed subsidy."
      },
      {
        "text": "The comparison is with marketing any other pharmaceutical product.",
        "line": 2,
        "material": true,
        "reason": "The comparison is with any other pharmaceutical product; narrowing that comparison changes the claim."
      },
      {
        "text": "This is further support for the claim.",
        "line": 3,
        "material": true,
        "reason": "Preserves that the following sales claim is support for the preceding profitability claim."
      },
      {
        "text": "Vaccine sales are likely to be lower.",
        "line": 3,
        "material": true,
        "reason": "The likelihood and comparative direction of lower vaccine sales must survive."
      },
      {
        "text": "The reason is how often a vaccine is given.",
        "line": 3,
        "material": true,
        "reason": "Dosing frequency is the reason offered for the sales comparison."
      },
      {
        "text": "A vaccine is given to a patient only once.",
        "line": 3,
        "material": true,
        "reason": "Only once per patient is the stated frequency; repeated vaccination would change the premise."
      },
      {
        "text": "This is the contrast.",
        "line": 4,
        "material": true,
        "reason": "Preserves the contrast between one administration and repeated administrations."
      },
      {
        "text": "It is about other medicines.",
        "line": 4,
        "material": true,
        "reason": "Other medicines are the comparator whose repeated administration supports the sales premise."
      },
      {
        "text": "Those medicines fight diseases and chronic illnesses.",
        "line": 4,
        "material": false,
        "reason": "The disease categories describe the comparator medicines; the reasoning uses their repeated administration, not the particular diseases they treat."
      },
      {
        "text": "Those are given many times to each patient.",
        "line": 4,
        "material": true,
        "reason": "Repeated administrations to each patient are the comparator premise and must not become a single dose."
      }
    ]
  },
  "PT105_S2_Q3": {
    "stimulus": "Manager: Our new computer network, the purpose of which is to increase productivity, can be installed during the day, which would disrupt our employees' work, or else at night, which would entail much higher installation charges. Since saving money is important, we should have the network installed during the day.",
    "details": [
      {
        "text": "A manager is speaking.",
        "line": 1,
        "material": true,
        "reason": "Preserves the manager as the source of the recommendation."
      },
      {
        "text": "There is a new computer network.",
        "line": 1,
        "material": true,
        "reason": "The computer network is the object to be installed, preserving the decision subject."
      },
      {
        "text": "Its purpose is to increase productivity.",
        "line": 1,
        "material": true,
        "reason": "Increased productivity is the purpose that may be undermined by the daytime choice."
      },
      {
        "text": "It can be installed during the day.",
        "line": 1,
        "material": true,
        "reason": "Daytime installation is one of the alternatives being compared."
      },
      {
        "text": "That option would disrupt work.",
        "line": 2,
        "material": true,
        "reason": "Work disruption is the cost of the daytime alternative and supports the potential objection."
      },
      {
        "text": "The work disrupted is the employees'.",
        "line": 2,
        "material": true,
        "reason": "The disrupted work belongs to employees, preserving whose productivity is affected."
      },
      {
        "text": "The other option is installing at night.",
        "line": 2,
        "material": true,
        "reason": "Nighttime installation is the alternative to the chosen daytime installation."
      },
      {
        "text": "Night installation would cost much more.",
        "line": 2,
        "material": true,
        "reason": "The greater nighttime installation charge is the explicit financial reason favoring daytime."
      },
      {
        "text": "Saving money is important.",
        "line": 3,
        "material": true,
        "reason": "Saving money is the stated evaluative premise, not an established overriding objective."
      },
      {
        "text": "That is the reason given.",
        "line": 3,
        "material": true,
        "reason": "Preserves the support relation between saving money and the chosen installation time."
      },
      {
        "text": "The conclusion is to install during the day.",
        "line": 3,
        "material": true,
        "reason": "Daytime installation is the recommendation; reversing it changes the conclusion."
      }
    ]
  }
};

const canonical = (text: string) => text.trim().replace(/\s+/g, " ");
const protectedClaim = (entry: JudgeEntry) => entry.kind !== "content" ||
  /\b(all|every|only|not|none|no|if|unless|must|may|likely|probably|most|some|always|never|any|at least|at most|because)\b/i.test(entry.text);

export type ReviewedMeaningEntry = JudgeEntry & {
  reviewedMaterial: boolean;
  reviewedMaterialReason: string;
  materialityKeyVersion: string | null;
  materialityKeyStatus: "reviewed" | "fallback";
};

/** Unknown or changed snapshots fail closed to ALL facts counting as material.
 * Matching whitespace is harmless; a changed source, order, line or fact is not.
 * Decoys never acquire an incidental exemption.
 */
export function applyReviewedMateriality(input: {
  stimulus: string;
  entries: JudgeEntry[];
  slug?: string;
}): {
  entries: ReviewedMeaningEntry[];
  keyVersion: string | null;
  status: "reviewed" | "fallback";
} {
  const key = input.slug ? REVIEWED_KEYS[input.slug] : undefined;
  const own = input.entries.filter((entry) => !entry.decoy);
  const matches = !!key && canonical(input.stimulus) === canonical(key.stimulus) &&
    own.length === key.details.length && own.every((entry, index) =>
      canonical(entry.text) === canonical(key.details[index].text) && entry.line === key.details[index].line &&
      entry.kind === classifyDetail(key.details[index].text));
  const status = matches ? "reviewed" : "fallback";
  const keyVersion = matches ? MEANING_KEY_VERSION : null;
  let index = 0;
  const entries = input.entries.map((entry): ReviewedMeaningEntry => {
    const detail = !entry.decoy && matches ? key!.details[index++] : undefined;
    const forced = protectedClaim(entry);
    return {
      ...entry,
      reviewedMaterial: entry.decoy || !detail || forced || detail.material,
      reviewedMaterialReason: entry.decoy
        ? "Unrelated-source check: never eligible for an incidental exemption."
        : !detail
          ? "No exact reviewed source key matches this snapshot; all authored facts remain material."
          : forced && !detail.material
            ? "A protected logical or structural claim remains material."
            : detail.reason,
      materialityKeyVersion: keyVersion,
      materialityKeyStatus: status,
    };
  });
  return { entries, keyVersion, status };
}
