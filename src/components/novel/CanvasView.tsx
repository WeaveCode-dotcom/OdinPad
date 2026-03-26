import { motion } from "framer-motion";
import { BookOpen, Compass, LayoutGrid, Map, Network, PanelsTopLeft } from "lucide-react";
import { useState } from "react";

import { AtlasPanel } from "@/components/canvas/AtlasPanel";
import { BinderPanel } from "@/components/canvas/BinderPanel";
import { BlueprintPanel } from "@/components/canvas/BlueprintPanel";
import { CorkboardPanel } from "@/components/canvas/CorkboardPanel";
import { ObservatoryPanel } from "@/components/canvas/ObservatoryPanel";
import { PanelErrorBoundary } from "@/components/canvas/PanelErrorBoundary";
import { TimelinePanel } from "@/components/canvas/TimelinePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNovelContext } from "@/contexts/NovelContext";

const tabs = [
  { id: "binder", label: "Binder", icon: BookOpen },
  { id: "blueprint", label: "Blueprint", icon: Compass },
  { id: "corkboard", label: "Corkboard", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: Map },
  { id: "atlas", label: "Atlas", icon: Network },
  { id: "observatory", label: "Observatory", icon: PanelsTopLeft },
] as const;

export default function CanvasView() {
  const { activeNovel } = useNovelContext();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("binder");

  if (!activeNovel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-none p-3 sm:p-4"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif text-foreground">Canvas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Story architecture studio — structure before drafting. Same manuscript as Write; tools are different lenses.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof tabs)[number]["id"])} className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="gap-1.5 px-3 py-2 text-xs data-[state=active]:bg-background sm:text-sm"
            >
              <t.icon className="h-3.5 w-3.5 shrink-0" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="binder" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Binder">
            <BinderPanel />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="blueprint" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Blueprint">
            <BlueprintPanel />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="corkboard" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Corkboard">
            <CorkboardPanel />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="timeline" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Timeline">
            <TimelinePanel />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="atlas" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Atlas">
            <AtlasPanel />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="observatory" className="mt-0 min-h-[200px] focus-visible:outline-none">
          <PanelErrorBoundary panelName="Observatory">
            <ObservatoryPanel />
          </PanelErrorBoundary>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
