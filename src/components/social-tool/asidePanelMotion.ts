/** Shared layout id for sidebar collapse ↔ canvas chrome open control. */
export const ASIDE_PANEL_TOGGLE_LAYOUT_ID = "aside-panel-toggle";

export const ASIDE_PANEL_WIDTH_PX = 360;

export const asidePanelSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.85,
};
