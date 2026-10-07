/**
 * Re-export shim — InlineQuestionViewer was promoted to the shared
 * LRQuestionModal at @/components/drill/shared/LRQuestionModal so that every
 * bootcamp surface can present LSAT MCQs in the same LR Smart Drill format.
 */
export { default } from "@/components/drill/shared/LRQuestionModal";
export type { InlineQuestionInput } from "@/components/drill/shared/LRQuestionModal";
