import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// Adapted from the actual Timeline-02 source retrieved through 21st.dev MCP
// on 2026-10-13: ruixen.ui, demo 5534.
// https://21st.dev/@ruixen.ui/components/timeline-02
// Retains its rail/node, motion-entry, Card and CardContent pattern; replaces
// the catalog demo copy/colors with the existing prompts and Amber Slate tokens.
interface ResponseStep {
  id: string;
  label: string;
  emphasis: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}

export default function ChoiceResponseTimeline({ steps, disabled }: { steps: ResponseStep[]; disabled: boolean }) {
  const reducedMotion = useReducedMotion();
  return <div className="choice-response-timeline">
    <div className="choice-response-rail" aria-hidden="true" />
    {steps.map((step, index) => <motion.div key={step.id} className="choice-response-step"
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.15 }}>
      <span className="choice-response-node" aria-hidden="true">{index + 1}</span>
      <Card className="choice-response-card">
        <CardContent className="choice-response-content">
          <label className="choice-response-label" data-tone={index === 0 ? "requirements" : "example"} htmlFor={step.id}><strong>{step.emphasis}</strong>{step.label.slice(step.emphasis.length)}</label>
          <textarea id={step.id} rows={step.rows} maxLength={5000} value={step.value} disabled={disabled}
            onChange={(event) => step.onChange(event.target.value)} className="choice-response-input" />
        </CardContent>
      </Card>
    </motion.div>)}
  </div>;
}
