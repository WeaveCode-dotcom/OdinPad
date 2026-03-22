import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-sm border-2 border-border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:shadow-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-sm group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:bg-primary group-[.toast]:font-semibold group-[.toast]:text-primary-foreground group-[.toast]:shadow-none",
          cancelButton:
            "group-[.toast]:rounded-sm group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:bg-muted group-[.toast]:font-semibold group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
