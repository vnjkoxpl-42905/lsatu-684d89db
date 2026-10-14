import { useEffect, useRef, useState } from 'react';
import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { ClusterDecomposerV2 } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposerV2';
import { HS_LAB_ITEMS } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { prevOf, nextOf } from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';

export default function ClusterDecomposerLab() {
  const user = useUser();
  const { markHardSectionComplete } = useModuleProgress(user?.id);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const completedRef = useRef(false);

  const allChecked = checked.size >= HS_LAB_ITEMS.length;

  useEffect(() => {
    if (allChecked && !completedRef.current) {
      completedRef.current = true;
      void markHardSectionComplete('5.6');
    }
  }, [allChecked, markHardSectionComplete]);

  const prev = prevOf('5.6');
  const next = nextOf('5.6');

  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.6"
      title="Decomposer lab."
      subtitle="Four sentences, hints on, nothing scored. Take your time and build the habit before the graded drill."
      heroCardTitle="Warm up"
      heroCardBody="Work all four sentences below. The lab checks itself off when you have tried each one."
      prev={
        prev
          ? { route: prev.route, title: prev.title, description: prev.description, label: 'Previous: Notes' }
          : null
      }
      next={
        next
          ? { route: next.route, title: next.title, description: next.description, label: 'Next: Graded drill' }
          : null
      }
      onMarkComplete={() => void markHardSectionComplete('5.6')}
    >
      <LessonSection tocTitle="How the lab works" className="space-y-8">
        <SectionHeading title="How the lab works" subtitle="Practice without a scoreboard" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            Each sentence below has its specifiers highlighted. Tap to lift, keep anything
            load-bearing, and check your work whenever you are ready. Wrong lifts cost nothing
            here. That is what the lab is for.
          </p>
        </CalloutCard>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          {checked.size} of {HS_LAB_ITEMS.length} sentences tried so far.
        </p>
      </LessonSection>

      {HS_LAB_ITEMS.map((item, i) => (
        <LessonSection key={item.id} tocTitle={`Sentence ${i + 1}`} className="space-y-8">
          <SectionHeading title={`Sentence ${i + 1} of ${HS_LAB_ITEMS.length}`} />
          <ClusterDecomposerV2
            item={item}
            mode="guided"
            onGraded={() =>
              setChecked((s) => {
                const n = new Set(s);
                n.add(item.id);
                return n;
              })
            }
          />
        </LessonSection>
      ))}

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Before the drill" />
        <TakeawayCard>
          The rhythm you just practiced is the whole drill: verb first, name the specifiers, lift
          the decoration, keep the load-bearing ones. Next door, the same moves count for real.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
