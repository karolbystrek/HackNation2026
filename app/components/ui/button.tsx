import { cva, type VariantProps } from "class-variance-authority";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "cn";

const buttonVariants = cva(
  "inline-flex min-h-11 max-w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent px-4 py-2 text-center text-base leading-snug font-bold break-words disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border-input bg-background text-primary hover:bg-secondary",
        link: "px-0 text-link",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

function Button({
  className,
  variant,
  type = "button",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export { Button, buttonVariants };
