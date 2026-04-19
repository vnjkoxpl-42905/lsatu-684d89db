import * as React from "react";

export interface StateBlockMiniProps {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  href?: string;
  accent?: string;
}

export default function StateBlockMini({ label, icon, value, suffix }: StateBlockMiniProps) {
  return (
    <div className="rounded-md border border-border/60 px-[9px] py-[7px]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-[10px] w-[10px] inline-flex items-center justify-center">{icon}</span>
        <span
          className="uppercase font-medium"
          style={{ fontSize: 10, letterSpacing: "0.16em" }}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 font-medium text-foreground" style={{ fontSize: 17, lineHeight: 1.1 }}>
        {value}
        {suffix ? (
          <span className="ml-1 text-muted-foreground" style={{ fontSize: 10 }}>
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
