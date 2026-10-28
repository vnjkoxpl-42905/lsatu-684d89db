import React from "react";
import type { ModeProps, EReaderModeProps } from "./types";
import { SerialMode } from "./SerialMode";
import { FlowMode } from "./FlowMode";
import { HighlightMode } from "./HighlightMode";
import { ScrollMode } from "./ScrollMode";
import { EReaderMode } from "./EReaderMode";

export interface ModeRendererProps extends ModeProps {
  page?: number;
  onPageCountChange?: (count: number) => void;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
}

export function ModeRenderer(props: ModeRendererProps): React.ReactElement {
  switch (props.prefs.reading_mode) {
    case "serial":
      return <SerialMode {...props} />;
    case "flow":
      return <FlowMode {...props} />;
    case "highlight":
      return <HighlightMode {...props} />;
    case "scroll":
      return <ScrollMode {...props} />;
    case "ereader":
      return (
        <EReaderMode
          {...props}
          page={props.page ?? 0}
          onPageCountChange={props.onPageCountChange ?? (() => {})}
          onPageChange={props.onPageChange ?? (() => {})}
          searchQuery={props.searchQuery ?? ""}
        />
      );
    default:
      return <SerialMode {...props} />;
  }
}

export * from "./types";
export * from "./SerialMode";
export * from "./FlowMode";
export * from "./HighlightMode";
export * from "./ScrollMode";
export * from "./EReaderMode";
