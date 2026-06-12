import { ArrowRight } from "lucide-react";
import type { MouseEventHandler } from "react";
import "./InteractiveHoverButton.css";

export default function InteractiveHoverButton({
  children,
  className,
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button className={`ih-btn ${className ?? ""}`} onClick={onClick}>
      <div className="ih-btn-rest">
        <span className="ih-dot" />
        <span className="ih-label">{children}</span>
      </div>
      <div className="ih-btn-hover" aria-hidden="true">
        <span>{children}</span>
        <ArrowRight size={16} />
      </div>
    </button>
  );
}
