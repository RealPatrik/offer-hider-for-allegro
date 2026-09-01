import { describe, expect, it } from "vitest";
import { appendHtml, createStyle, replaceContent } from "../src/content/trusted-html";

describe("trusted-html DOM helpers", () => {
  it("replaceContent builds real DOM nodes from an HTML string via DOMParser, not innerHTML", () => {
    const root = document.createElement("div");
    replaceContent(root, `<span class="a">hi</span><button type="button">go</button>`);

    expect(root.querySelector("span.a")?.textContent).toBe("hi");
    expect(root.querySelector("button")?.getAttribute("type")).toBe("button");
  });

  it("replaceContent clears whatever was there before", () => {
    const root = document.createElement("div");
    root.append(document.createElement("p"));
    replaceContent(root, `<span>new</span>`);

    expect(root.children.length).toBe(1);
    expect(root.querySelector("p")).toBeNull();
    expect(root.querySelector("span")?.textContent).toBe("new");
  });

  it("appendHtml adds nodes without touching existing children", () => {
    const root = document.createElement("div");
    root.append(document.createElement("p"));
    appendHtml(root, `<span>added</span>`);

    expect(root.children.length).toBe(2);
    expect(root.querySelector("p")).not.toBeNull();
    expect(root.querySelector("span")?.textContent).toBe("added");
  });

  it("works on a ShadowRoot the same way as on an Element", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    replaceContent(shadow, `<div class="wrap"><button class="icon">x</button></div>`);

    expect(shadow.querySelector(".wrap button.icon")?.textContent).toBe("x");
  });

  it("createStyle sets CSS via textContent, never via innerHTML", () => {
    const style = createStyle(".x { color: red; }");
    expect(style.tagName).toBe("STYLE");
    expect(style.textContent).toBe(".x { color: red; }");
  });
});
