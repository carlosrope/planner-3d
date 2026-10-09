import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorApp } from "@/components/editor/EditorApp";
import { getEditableEvent, requireUser } from "@/lib/dal";
import { editorViewport } from "../../editor-viewport";

export const metadata: Metadata = { title: "Editor" };
export const viewport = editorViewport;

export default function EventoPage({ params }: PageProps<"/eventos/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">Abriendo el plano…</p>}>
      <EventoEditor params={params} />
    </Suspense>
  );
}

async function EventoEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getEditableEvent(id, user.id);
  if (!data) notFound();
  const { event, venue, layouts } = data;
  return (
    <EditorApp
      venue={{ id: venue.id, name: venue.name, city: venue.city, spec: venue.spec }}
      distributions={layouts.map((l) => ({
        id: l.id,
        name: l.name,
        note: l.note,
        recommended: l.recommended,
        doc: l.doc,
        revision: l.revision,
      }))}
      title={event.title}
      subtitle={venue.name}
      backHref="/eventos"
      backend={{ mode: "server", eventId: event.id }}
    />
  );
}
