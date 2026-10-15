import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { mergeCatalog, type CatalogProduct } from "@/lib/catalog";
import { ComboBuilder } from "@/components/products/combo-builder";
import { ComboGroupsEditor } from "@/components/products/combo-groups-editor";

const base = mergeCatalog([]);
const item = base.find(p => p.id === "p2");
const comboSource = base.find(p => p.id === "p1");
if (!item || !comboSource) throw new Error("Missing fixture");
const combo: CatalogProduct = {
  ...comboSource,
  id: "combo1",
  name: "Combo Teste",
  price: 30,
  options: [],
  variations: [],
  allowOther: false,
  comboGroups: [{ id: "drink", name: "Bebida", quantity: 100, productIds: [item.id] }],
};

describe("Combo quantities up to 100 units", () => {
  it("lets the customer type a quantity of 100 in the combo builder", () => {
    render(<ComboBuilder product={combo} products={[...base, combo]} open onOpenChange={() => {}} onAdd={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: `Adicionar ${item.name} em Bebida` }));
    const input = screen.getByLabelText(`Quantidade de ${item.name} em Bebida`) as HTMLInputElement;
    expect(input.max).toBe("100");
    fireEvent.change(input, { target: { value: "50" } });
    expect(screen.getByText("50/100")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "100" } });
    expect(screen.getByText("100/100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar combo/ })).toBeEnabled();
    fireEvent.change(input, { target: { value: "101" } });
    expect(input.value).toBe("100");
  });
  it("lets the store write a group quantity of 100 in the panel", () => {
    const groups = [{ id: "drink", name: "Bebida", quantity: 1, productIds: [item.id] }];
    render(<ComboGroupsEditor groups={groups} products={base} onChange={() => {}} />);
    const input = screen.getByLabelText("Quantidade do grupo 1") as HTMLInputElement;
    expect(input.max).toBe("100");
    fireEvent.change(input, { target: { value: "100" } });
    expect(input.value).toBe("100");
  });
});
