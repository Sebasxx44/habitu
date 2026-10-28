import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";

// TYPES
type LinkButtonProps = Omit<
  ComponentProps<typeof ButtonTA>,
  "render" | "nativeButton" | "ref"
> & { to: string };

// COMPONENT
export const LinkButtonTA = ({ to, ...props }: LinkButtonProps) => (
  <ButtonTA nativeButton={false} render={<Link to={to} />} {...props} />
);
