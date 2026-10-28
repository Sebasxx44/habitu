import type { ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";

// COMPONENT
export const TextareaTA = (props: ComponentProps<typeof Textarea>) => (
  <Textarea {...props} />
);
