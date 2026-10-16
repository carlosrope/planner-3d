import { describe, expect, it } from "vitest";
import { DEFAULT_UI, parseUi } from "./ui-config";

describe("interfaz del diseñador", () => {
  it("sin datos o con basura, la interfaz normal", () => {
    expect(parseUi(null)).toEqual(DEFAULT_UI);
    expect(parseUi("hola")).toEqual(DEFAULT_UI);
    expect(parseUi({ scale: { toolbar: "grande" } })).toEqual(DEFAULT_UI);
  });
  it("limita los tamaños y limpia las listas", () => {
    const ui = parseUi({ panelOrder: [" Tipo de evento ", "Tipo de evento", 3, ""], toolbarHidden: ["langSel"], scale: { toolbar: 3, panels: 0.1 } });
    expect(ui.panelOrder).toEqual(["Tipo de evento"]);
    expect(ui.toolbarHidden).toEqual(["langSel"]);
    expect(ui.scale).toEqual({ toolbar: 1.4, panels: 0.8 });
  });
});
