import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";
import { demoLayout, DEMO_VENUE } from "@/lib/layout/demo";
import { editorViewport } from "../editor-viewport";

export const metadata: Metadata = { title: "Prototipo del editor" };
export const viewport = editorViewport;

export default function PrototipoPage() {
  return (
    <EditorApp
      venue={DEMO_VENUE}
      initial={demoLayout()}
      title="Prototipo del editor"
      subtitle={DEMO_VENUE.name}
      backHref="/"
      persistence={{ mode: "local", key: "planner3d:prototipo:v1" }}
    />
  );
}
