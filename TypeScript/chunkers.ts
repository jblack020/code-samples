import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

function convertHTMLToPlainTextWithMarkdownLinks(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  // Convert <br> and block-level elements to newlines
  body.innerHTML = body.innerHTML.replace(/<br\s*\/?>/gi, "\n");
  body.innerHTML = body.innerHTML.replace(/<\/(p|div|h[1-6]|li)>/gi, "\n");

  let text = body.innerText;
  const links = body.querySelectorAll("a");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    const linkText = link.textContent?.trim();
    if (href && linkText) {
      text = text.replace(linkText, `[${linkText}](${href})`);
    }
  });
  console.log(text);
  return text;
}

/**
 * Chunks tip and cue HTML by list items
 * @param html - The HTML string to chunk
 * @returns The chunks as an array of strings
 */
export function ChunkTipAndCue(document: string): string[] {
  // Remove all images and videos
  document = document.replace(/<img[^>]*>/g, "");
  document = document.replace(/<video[^>]*>/g, "");

  // Create a DOM parser
  const parser = new DOMParser();
  // Parse the HTML string into a document
  const doc = parser.parseFromString(document, "text/html");

  // Get all top-level <ul> elements that are not nested inside other <ul> elements
  const topLevelLists = Array.from(doc.querySelectorAll("ul")).filter(
    (ul) => !ul.closest("ul ul")
  );

  // Array to hold the chunks
  const chunks = [];

  function convertLinksToMarkdown(element: Element): string {
    let text = element.textContent?.trim() || "";
    const links = element.querySelectorAll("a");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      const linkText = link.textContent?.trim();
      if (href && linkText) {
        text = text.replace(linkText, `[${linkText}](${href})`);
      }
    });
    return text;
  }

  topLevelLists.forEach((ul) => {
    // Get all top-level <li> elements within the <ul>
    const topLevelItems = ul.children;

    Array.from(topLevelItems).forEach((li) => {
      if (li.tagName === "LI") {
        // Convert links in the current <li> to markdown
        let chunk = convertLinksToMarkdown(li);

        // Check for the next sibling <ul>
        const nextSiblingUl = li.nextElementSibling;
        if (nextSiblingUl && nextSiblingUl.tagName === "UL") {
          // Get all <li> elements within the next sibling <ul>
          const nestedItems = nextSiblingUl.querySelectorAll("li");

          nestedItems.forEach((nestedLi) => {
            // Convert links in nested <li> to markdown
            chunk += " " + convertLinksToMarkdown(nestedLi);
          });
        }

        // Add the chunk to the array
        chunks.push(chunk);
      }
    });
  });

  return chunks;
}

/**
 * Chunks a document manually by a delimiter
 * @param document - The document to chunk
 * @param delimiter - The delimiter to use
 * @returns The chunks as an array of strings
 */
export function ChunkBySymbol(document: string, delimiter: string): string[] {
  const document_with_links = convertHTMLToPlainTextWithMarkdownLinks(document);
  const chunks = document_with_links.split(delimiter);
  return chunks.map((chunk) => chunk.replace(/\n/g, "").trim());
}

export function ChunkByLineBreak(document: string): string[] {
  const document_with_links = convertHTMLToPlainTextWithMarkdownLinks(document);
  const chunks = document_with_links.split("\n\n");
  return chunks.map((chunk) => chunk.replace(/\n/g, "").trim());
}

/**
 * Chunks a document using LangChain's RecursiveCharacterTextSplitter
 * @param document - The document to chunk
 * @param chunkSize - The maximum size of each chunk (default: 1000)
 * @param chunkOverlap - The overlap between chunks (default: 200)
 * @returns The chunks as an array of strings
 */
export async function ChunkAutomatically(
  document: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const document_with_links = convertHTMLToPlainTextWithMarkdownLinks(document);
  const chunks = await splitter.splitText(document_with_links);
  return chunks;
}

/**
 * Chunks tip and cue HTML by list items
 * @param html - The HTML string to chunk
 * @returns The chunks as an array of HTML strings
 */
export function ChunkTipAndCuePreview(document: string): string[] {
  // Create a DOM parser
  const parser = new DOMParser();
  // Parse the HTML string into a document
  const doc = parser.parseFromString(document, "text/html");

  // Get all top-level <ul> elements that are not nested inside other <ul> elements
  const topLevelLists = Array.from(doc.querySelectorAll("ul")).filter(
    (ul) => !ul.closest("ul ul")
  );

  // Array to hold the chunks
  const chunks: string[] = [];

  topLevelLists.forEach((ul) => {
    // Get all top-level <li> elements within the <ul>
    const topLevelItems = ul.children;

    Array.from(topLevelItems).forEach((li) => {
      if (li.tagName === "LI") {
        // Get the HTML content of the current <li>
        let chunk = li.outerHTML;

        // Check for the next sibling <ul>
        const nextSiblingUl = li.nextElementSibling;
        if (nextSiblingUl && nextSiblingUl.tagName === "UL") {
          // Include the next sibling <ul> in the chunk
          chunk += nextSiblingUl.outerHTML;
        }

        // Add the chunk to the array
        chunks.push(chunk);
      }
    });
  });

  return chunks;
}
