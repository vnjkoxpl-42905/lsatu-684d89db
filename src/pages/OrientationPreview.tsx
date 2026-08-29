import * as React from "react";
import { OrientationCardView } from "@/components/classroom/OrientationCard";
import "@/components/classroom/classroom.css";

/** Temporary harness for verifying the orientation card without a session. */
export default function OrientationPreview() {
  return (
    <div className="classroom-root" style={{ padding: 24 }}>
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ last_score_band: "156_160", target_score_band: "166_170" }}
        onSave={async (p) => {
          console.log("[preview] save", JSON.stringify(p));
          return true;
        }}
      />
    </div>
  );
}
