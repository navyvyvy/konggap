import type { ButtonHTMLAttributes, ReactNode } from "react";

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "condition" | "plain";
};

export function UiButton({ children, className = "", variant = "primary", type = "button", ...props }: UiButtonProps) {
  return (
    <button className={`uiButton uiButton-${variant} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
