import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BOOK_GENRE_OPTIONS } from "@/lib/book-metadata";

interface SecondaryGenreMultiSelectProps {
  primaryGenre: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/** Multi-select from the same genre list as primary; excludes the primary pick. */
export function SecondaryGenreMultiSelect({ primaryGenre, value, onChange, disabled }: SecondaryGenreMultiSelectProps) {
  const primary = primaryGenre.trim().toLowerCase();
  const options = BOOK_GENRE_OPTIONS.filter((g) => g.toLowerCase() !== primary);

  const toggle = (g: string) => {
    if (value.includes(g)) {
      onChange(value.filter((x) => x !== g));
      return;
    }
    if (value.length >= 8) return;
    onChange([...value, g]);
  };

  const summary =
    value.length === 0
      ? "Add secondary genres…"
      : value.length <= 2
        ? value.join(", ")
        : `${value.length} genres selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full justify-start whitespace-normal text-left font-normal"
          disabled={disabled}
        >
          <span className={value.length === 0 ? "text-muted-foreground" : ""}>{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-72 overflow-y-auto p-3" align="start">
        <p className="mb-2 text-xs text-muted-foreground">Cross-genre tags for discovery and export (optional).</p>
        <div className="space-y-2">
          {options.map((g) => (
            <label key={g} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={value.includes(g)} onCheckedChange={() => toggle(g)} />
              {g}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
