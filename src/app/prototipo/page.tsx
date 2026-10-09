import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";
import { demoDistributions, DEMO_VENUE } from "@/lib/layout/demo";
import { editorViewport } from "../editor-viewport";

export const metadata: Metadata = { title: "Prototipo del editor" };
export const viewport = editorViewport;

export default function PrototipoPage() {
  return (
    <EditorApp
      venue={DEMO_VENUE}
      distributions={demoDistributions().map((d) => ({ ...d, revision: 1 }))}
      title="Prototipo del editor"
      subtitle={DEMO_VENUE.name}
      backHref="/"
      demo="salon"
      backend={{ mode: "local", key: "planner3d:prototipo:v2" }}
    />
  );
}
