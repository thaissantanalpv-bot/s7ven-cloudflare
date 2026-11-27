import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { StableCatalogImage } from "@/components/catalog/stable-catalog-image";
import { visibleCatalogInterval } from "@/lib/page-visibility";

const params = new URLSearchParams(location.search);
const run = params.get("run") ?? "default";
const media = (name: string) => `/__media/${name}.svg?run=${encodeURIComponent(run)}`;

function Harness() {
  const [source, setSource] = useState(media("a"));
  const [gallery, setGallery] = useState(false);
  useEffect(() => {
    if (params.get("legacy") !== "1") return;
    for (const name of ["b", "c"]) {
      const image = new Image();
      image.src = media(name);
    }
  }, []);
  return (
    <main>
      <StableCatalogImage
        src={source}
        alt="Foto principal"
        fallback={<span data-testid="fallback">Imagem indisponível</span>}
      />
      <img src={media("a")} alt="Miniatura repetida" />
      <p data-testid="hidden-interval">{String(visibleCatalogInterval(60_000, "hidden"))}</p>
      <button onClick={() => setSource(media("b"))}>Selecionar variação</button>
      <button onClick={() => setGallery(true)}>Abrir galeria</button>
      <button onClick={() => setSource(media("c"))}>Atualizar no painel</button>
      <button onClick={() => setSource(media("missing"))}>Simular URL expirada</button>
      {gallery ? <img src={source} alt="Foto ampliada" /> : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
