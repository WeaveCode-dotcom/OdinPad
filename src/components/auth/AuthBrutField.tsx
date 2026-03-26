import type { ComponentProps } from "react";

import {
  authBrutInput,
  authBrutInputCompact,
  authBrutLabel,
  authBrutLabelCompact,
} from "@/components/auth/auth-brutalist-classes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  id: string;
  compact?: boolean;
  /** When true, sets `aria-invalid` for assistive tech */
  invalid?: boolean;
  /** id of helper / error element for `aria-describedby` */
  describedBy?: string;
} & Omit<ComponentProps<typeof Input>, "id">;

export function AuthBrutField({ label, id, className, compact, invalid, describedBy, ...props }: Props) {
  return (
    <div className="relative">
      <label htmlFor={id} className={compact ? authBrutLabelCompact : authBrutLabel}>
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(compact ? authBrutInputCompact : authBrutInput, className)}
        {...props}
      />
    </div>
  );
}
