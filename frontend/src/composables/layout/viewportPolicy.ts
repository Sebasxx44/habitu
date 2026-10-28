// TYPES
interface KeyboardViewport {
  editable: boolean;
  layoutHeight: number;
  viewportHeight: number;
  scale: number;
}

// HELPERS
export const hasVirtualKeyboard = ({
  editable,
  layoutHeight,
  viewportHeight,
  scale,
}: KeyboardViewport): boolean =>
  editable &&
  Math.abs(scale - 1) < 0.05 &&
  layoutHeight - viewportHeight > Math.max(150, layoutHeight * 0.18);

export const hasTextFocus = (element: Element | null): boolean =>
  (element instanceof HTMLInputElement &&
    !/^(button|checkbox|color|date|datetime-local|file|hidden|image|month|radio|range|reset|submit|time|week)$/.test(
      element.type,
    )) ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable);
