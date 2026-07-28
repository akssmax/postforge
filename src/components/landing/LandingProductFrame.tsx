import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Product UI frame — uses tool showcase chrome styles. */
export function LandingProductFrame({ children, className = "" }: Props) {
  return (
    <div className={`pf-tool-frame ${className}`.trim()}>{children}</div>
  );
}
