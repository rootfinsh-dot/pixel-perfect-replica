// All measurements are CSS pixels in the isolated print document.
export const PDF_LAYOUT = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginMm: 15,
  contentTopMm: 29,
  contentBottomMm: 278,
  widthPx: 680,
};

export function paginateReport(source: HTMLElement, pageHeight: number): HTMLElement[] {
  const doc = source.ownerDocument;
  const pages: HTMLElement[] = [];
  const newPage = () => {
    const page = doc.createElement("div");
    page.className = "r pdf-page";
    source.parentElement?.appendChild(page);
    pages.push(page);
    return page;
  };
  let page = newPage();
  const fits = () => page.getBoundingClientRect().height <= pageHeight + 0.5;
  const hasContent = () => page.childNodes.length > 0;

  function add(node: HTMLElement) {
    page.appendChild(node);
    if (fits()) return;
    node.remove();
    if (hasContent()) {
      page = newPage();
      page.appendChild(node);
      if (fits()) return;
      node.remove();
    }
    splitLongBlock(node);
  }

  // Split at word boundaries while retaining emphasis, links and inline markup.
  // This is only needed when an individual paragraph exceeds a whole page.
  function splitLongBlock(node: HTMLElement) {
    let remaining = node;
    while (true) {
      page.appendChild(remaining);
      if (fits()) return;
      remaining.remove();
      const walker = doc.createTreeWalker(remaining, 4);
      const boundaries: { node: Node; offset: number }[] = [];
      let text = walker.nextNode();
      while (text) {
        const value = text.textContent ?? "";
        for (const match of value.matchAll(/\S+\s*/g)) {
          boundaries.push({ node: text, offset: (match.index ?? 0) + match[0].length });
        }
        text = walker.nextNode();
      }
      let low = 0, high = boundaries.length - 1, best = -1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const boundary = boundaries[mid];
        if (!boundary) break;
        const range = doc.createRange();
        range.selectNodeContents(remaining);
        range.setEnd(boundary.node, boundary.offset);
        const trial = remaining.cloneNode(false) as HTMLElement;
        trial.appendChild(range.cloneContents());
        page.appendChild(trial);
        const ok = fits();
        trial.remove();
        if (ok) { best = mid; low = mid + 1; } else high = mid - 1;
      }
      const boundary = boundaries[best];
      if (!boundary || best === boundaries.length - 1) {
        // Non-text blocks (e.g. images) stay intact, scaled to the printable area.
        page.appendChild(remaining);
        remaining.style.zoom = String(Math.min(1, pageHeight / remaining.getBoundingClientRect().height));
        return;
      }
      const range = doc.createRange();
      range.selectNodeContents(remaining);
      range.setEnd(boundary.node, boundary.offset);
      const part = remaining.cloneNode(false) as HTMLElement;
      part.appendChild(range.extractContents());
      page.appendChild(part);
      page = newPage();
    }
  }

  function addTable(table: HTMLTableElement) {
    const rows = Array.from(table.tBodies).flatMap((body) => Array.from(body.rows));
    if (!rows.length) { add(table); return; }
    // Fix column widths before splitting, so every continuation aligns.
    const measuredCells = table.rows[0]?.cells;
    const widths = measuredCells ? Array.from(measuredCells).map((cell) => cell.getBoundingClientRect().width) : [];
    let chunk: HTMLTableElement | undefined;
    let body: HTMLTableSectionElement | undefined;
    function startChunk() {
      chunk = table.cloneNode(false) as HTMLTableElement;
      const colgroup = doc.createElement("colgroup");
      for (const width of widths) {
        const col = doc.createElement("col");
        col.style.width = `${width}px`;
        colgroup.appendChild(col);
      }
      chunk.appendChild(colgroup);
      if (table.tHead) chunk.appendChild(table.tHead.cloneNode(true));
      body = doc.createElement("tbody");
      chunk.appendChild(body);
      page.appendChild(chunk);
    }
    startChunk();
    for (const original of rows) {
      const row = original.cloneNode(true) as HTMLTableRowElement;
      body?.appendChild(row);
      if (fits()) continue;
      row.remove();
      if (!body?.rows.length) chunk?.remove();
      if (hasContent()) page = newPage();
      startChunk();
      body?.appendChild(row);
      if (!fits() && chunk) {
        // A single unusually tall row remains intact rather than being clipped.
        chunk.remove();
        add(chunk);
        chunk = undefined;
        body = undefined;
        page = newPage();
        startChunk();
      }
    }
    if (!body?.rows.length) chunk?.remove();
  }

  const blocks = Array.from(source.children) as HTMLElement[];
  for (let i = 0; i < blocks.length; i++) {
    const original = blocks[i];
    if (!original) continue;
    const node = original.cloneNode(true) as HTMLElement;
    if (node.matches("h1,h2,h3,h4,.section-heading") && hasContent()) {
      const next = blocks[i + 1];
      // Keep headings with at least the opening lines of their content.
      const needed = node.getBoundingClientRect().height || original.getBoundingClientRect().height;
      if (page.getBoundingClientRect().height + needed + Math.min(next?.getBoundingClientRect().height ?? 0, 70) > pageHeight) page = newPage();
    }
    if (node.tagName === "TABLE") addTable(original as HTMLTableElement);
    else if (node.matches("ul,ol")) {
      let index = Number(node.getAttribute("start") ?? 1);
      for (const item of Array.from(node.children)) {
        const list = node.cloneNode(false) as HTMLElement;
        if (node.tagName === "OL") list.setAttribute("start", String(index));
        list.appendChild(item.cloneNode(true));
        add(list);
        index++;
      }
    } else add(node);
  }
  return pages.filter((item) => {
    if (item.childNodes.length) return true;
    item.remove();
    return false;
  });
}