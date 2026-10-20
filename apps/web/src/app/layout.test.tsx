import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "./layout";

describe("RootLayout", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <p>conteúdo</p>
    </RootLayout>,
  );

  it("renderiza <html lang=pt-BR>", () => {
    expect(html).toMatch(/^<html[^>]*lang="pt-BR"/);
  });

  it("renderiza os filhos dentro do body", () => {
    expect(html).toContain("<p>conteúdo</p>");
  });
});
