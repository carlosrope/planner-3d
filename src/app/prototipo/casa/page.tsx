import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";
import { CHARDONNAY, chardonnayDistributions } from "@/lib/layout/houses";
import { editorViewport } from "../../editor-viewport";

export const metadata: Metadata = { title: "Casa Chardonnay" };
export const viewport = editorViewport;

export default function PrototipoCasaPage() {
  return (
    <EditorApp
      venue={CHARDONNAY}
      distributions={chardonnayDistributions().map((d) => ({ ...d, revision: 1 }))}
      title="Casa Chardonnay"
      subtitle="Modelo base 172.17 m²"
      backHref="/"
      demo="casa-chardonnay"
      backend={{ mode: "local", key: "planner3d:prototipo-casa:v2" }}
    />
  );
}
