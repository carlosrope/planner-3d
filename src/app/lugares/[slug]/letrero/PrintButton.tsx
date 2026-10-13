"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-12 w-full max-w-xs rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 print:hidden"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
