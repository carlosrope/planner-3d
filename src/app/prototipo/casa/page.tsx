import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";
import { CHARDONNAY, chardonnayDemoLayout } from "@/lib/layout/houses";
import { editorViewport } from "../../editor-viewport";

export const metadata: Metadata = { title: "Casa Chardonnay" };
export const viewport = editorViewport;

export default function PrototipoCasaPage() {
  return (
    <EditorApp
      venue={CHARDONNAY}
      initial={chardonnayDemoLayout()}
      title="Casa Chardonnay"
      subtitle="Modelo base 172.17 m²"
      backHref="/"
      demo="casa-chardonnay"
      persistence={{ mode: "local", key: "planner3d:prototipo-casa:v1" }}
    />
  );
}
