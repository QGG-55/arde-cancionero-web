const landing = document.querySelector("#landing");
const choices = document.querySelector("#songbookChoices");
const homeButton = document.querySelector("#homeButton");
const currentSongbook = document.querySelector("#currentSongbook");
const layout = document.querySelector(".layout");
const list = document.querySelector("#songList");
const songView = document.querySelector(".song-view");
const search = document.querySelector("#search");
const clearFiltersButton = document.querySelector("#clearFiltersButton");
const authorFilter = document.querySelector("#authorFilter");
const tagFilter = document.querySelector("#tagFilter");
const selectionCount = document.querySelector("#selectionCount");
const selectedOnlyButton = document.querySelector("#selectedOnlyButton");
const selectedPdfButton = document.querySelector("#selectedPdfButton");
const clearSelectionButton = document.querySelector("#clearSelectionButton");
const title = document.querySelector("#songTitle");
const capo = document.querySelector("#songCapo");
const author = document.querySelector("#songAuthor");
const tagSummary = document.querySelector("#songTags");
const page = document.querySelector("#songPage");
const body = document.querySelector("#songBody");
const spotifyLinkWrap = document.querySelector("#spotifyLinkWrap");
const spotifyLink = document.querySelector("#spotifyLink");
const audioLinkWrap = document.querySelector("#audioLinkWrap");
const audioLink = document.querySelector("#audioLink");
const withChordsButton = document.querySelector("#withChordsButton");
const lyricsOnlyButton = document.querySelector("#lyricsOnlyButton");
const transposeControls = document.querySelector("#transposeControls");
const transposeDownButton = document.querySelector("#transposeDownButton");
const transposeUpButton = document.querySelector("#transposeUpButton");
const transposeResetButton = document.querySelector("#transposeResetButton");
const transposeValue = document.querySelector("#transposeValue");
const autoscrollButton = document.querySelector("#autoscrollButton");
const pdfButton = document.querySelector("#pdfButton");

let songbooks = [];
let songs = [];
let currentIndex = 0;
let mode = "chords";
let transposeOffset = 0;
let autoscrollFrame = 0;
let autoscrollLastTime = 0;
let selectedSongIndexes = new Set();
let selectedOnly = false;
let swipeStart = null;
let suppressNextSongClick = false;
let loadingSongbookId = "";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEGE_NAMES = ["DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"];
const NOTE_INDEX = new Map([
  ["C", 0], ["B#", 0], ["C#", 1], ["DB", 1],
  ["D", 2], ["D#", 3], ["EB", 3],
  ["E", 4], ["FB", 4], ["E#", 5],
  ["F", 5], ["F#", 6], ["GB", 6],
  ["G", 7], ["G#", 8], ["AB", 8],
  ["A", 9], ["A#", 10], ["BB", 10],
  ["B", 11], ["CB", 11],
  ["DO", 0], ["DO#", 1], ["DOB", 11],
  ["RE", 2], ["RE#", 3], ["REB", 1],
  ["MI", 4], ["MI#", 5], ["MIB", 3],
  ["FA", 5], ["FA#", 6], ["FAB", 4],
  ["SOL", 7], ["SOL#", 8], ["SOLB", 6],
  ["LA", 9], ["LA#", 10], ["LAB", 8],
  ["SI", 11], ["SI#", 0], ["SIB", 10],
]);
const CHORD_QUALITY_RE = /^(?:m|maj|min|dim|aug|sus|add|M|o|\+|-|[0-9]|[#b()])*$/;
const FALLBACK_SONGBOOKS = [
  { id: "arde", name: "ARDE", file: "data/arde.json", count: 156 },
  { id: "rockandpop", name: "ROCKANDPOP", file: "data/rockandpop.json", count: 28 },
];

songbooks = [...FALLBACK_SONGBOOKS];
renderLanding();
loadSongbookFromHash();
fetch("manifest.json")
  .then((response) => response.json())
  .then((payload) => {
    const publishedSongbooks = Array.isArray(payload) ? payload : (payload.songbooks || []);
    songbooks = publishedSongbooks.length ? publishedSongbooks : [...FALLBACK_SONGBOOKS];
    renderLanding();
    loadSongbookFromHash();
  })
  .catch(() => {
    songbooks = [...FALLBACK_SONGBOOKS];
    renderLanding();
    loadSongbookFromHash();
  });

search.addEventListener("input", renderList);
clearFiltersButton.addEventListener("click", clearFilters);
authorFilter.addEventListener("change", renderList);
tagFilter.addEventListener("change", renderList);
selectedOnlyButton.addEventListener("click", () => {
  selectedOnly = !selectedOnly;
  renderList();
});
selectedPdfButton.addEventListener("click", downloadSelectedSongsPdf);
clearSelectionButton.addEventListener("click", () => {
  selectedSongIndexes = new Set();
  selectedOnly = false;
  renderList();
});
list.addEventListener("click", handleFilterChipClick, true);
songView.addEventListener("click", handleFilterChipClick, true);
if (homeButton) {
  homeButton.addEventListener("click", showLanding);
}
withChordsButton.addEventListener("click", () => setMode("chords"));
lyricsOnlyButton.addEventListener("click", () => setMode("lyrics"));
transposeDownButton.addEventListener("click", () => transposeSong(-1));
transposeUpButton.addEventListener("click", () => transposeSong(1));
transposeResetButton.addEventListener("click", () => {
  transposeOffset = 0;
  updateTransposeControls();
  renderBody();
});
autoscrollButton.addEventListener("click", toggleAutoscroll);
pdfButton.addEventListener("click", downloadCurrentSongPdf);
window.addEventListener("resize", renderList);
window.addEventListener("hashchange", loadSongbookFromHash);

function renderLanding() {
  document.body.classList.remove("app-open");
  if (!songbooks.length) {
    choices.innerHTML = '<p class="empty">Todavia no hay cancioneros publicados.</p>';
    return;
  }

  choices.replaceChildren(...songbooks.map((songbook) => {
    const button = document.createElement("a");
    button.href = `#${songbook.id}`;
    button.className = "songbook-button";
    const logos = {
      arde: "assets/logo-arde.jpg",
      rockandpop: "assets/logo-rockandpop.png",
    };
    const logo = logos[songbook.id] ? `<img class="songbook-logo ${escapeHtml(songbook.id)}" src="${logos[songbook.id]}" alt="" />` : "";
    button.innerHTML = `<span class="songbook-title">${logo}<strong>${escapeHtml(songbook.name)}</strong></span><span>${songbook.count || 0} canciones</span>`;
    if (songbook.id === loadingSongbookId) {
      button.setAttribute("aria-busy", "true");
      button.innerHTML = `<span class="songbook-title">${logo}<strong>${escapeHtml(songbook.name)}</strong></span><span>Abriendo...</span>`;
    }
    button.addEventListener("click", (event) => {
      event.preventDefault();
      history.replaceState(null, "", `#${songbook.id}`);
      loadSongbook(songbook);
    });
    return button;
  }));
}

function showLanding() {
  stopAutoscroll();
  document.body.classList.remove("app-open");
  landing.scrollIntoView({ behavior: "smooth", block: "start" });
}

function loadSongbookFromHash() {
  const requested = normalize(window.location.hash.replace("#", ""));
  if (!requested) {
    return;
  }
  if (!songbooks.length) {
    songbooks = [...FALLBACK_SONGBOOKS];
  }
  const songbook = songbooks.find((item) => normalize(item.id) === requested);
  if (songbook) {
    loadSongbook(songbook);
  }
}

function loadSongbook(songbook) {
  loadingSongbookId = songbook.id;
  renderLanding();
  fetch(songbook.file)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`No se encontro ${songbook.file}.`);
      }
      return response.json();
    })
    .then((payload) => {
      songs = Array.isArray(payload.songs) ? payload.songs : [];
      if (!songs.length) {
        throw new Error("Ese cancionero no contiene canciones.");
      }
      loadingSongbookId = "";
      currentIndex = 0;
      selectedSongIndexes = new Set();
      selectedOnly = false;
      search.value = "";
      authorFilter.value = "";
      tagFilter.value = "";
      currentSongbook.textContent = payload.name || songbook.name || "CANCIONERO";
      document.body.classList.add("app-open");
      renderFilters();
      renderList();
      showSong(0, false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
    .catch((error) => {
      loadingSongbookId = "";
      renderLanding();
      const message = document.createElement("p");
      message.className = "empty";
      message.textContent = error.message || "No se pudo abrir ese cancionero.";
      choices.appendChild(message);
    });
}

function renderList() {
  const query = normalize(search.value);
  const selectedAuthor = normalize(authorFilter.value);
  const selectedTag = normalize(tagFilter.value);
  const matches = songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => {
      const tags = song.tags || [];
      const matchesQuery = !query || normalize(`${song.title} ${song.author} ${tags.join(" ")}`).includes(query);
      const matchesAuthor = !selectedAuthor || normalize(song.author) === selectedAuthor;
      const matchesTag = !selectedTag || tags.some((tag) => normalize(tag) === selectedTag);
      const matchesSelected = !selectedOnly || selectedSongIndexes.has(index);
      return matchesQuery && matchesAuthor && matchesTag && matchesSelected;
    });

  if (!matches.length) {
    moveSongView();
    updateSelectionBar();
    list.innerHTML = '<p class="empty">Sin resultados.</p>';
    return;
  }

  if (!matches.some(({ index }) => index === currentIndex)) {
    currentIndex = matches[0].index;
    updateSongView();
  }

  const nodes = [];
  for (const { song, index } of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "song-item";
    button.classList.toggle("active", index === currentIndex);
    button.classList.toggle("selected", selectedSongIndexes.has(index));
    button.dataset.index = String(index);
    const tags = song.tags || [];
    const authorLine = song.author
      ? `<span class="item-author" data-author="${escapeHtml(song.author)}">${escapeHtml(song.author)}</span>`
      : `<span>${escapeHtml("Sin autor")}</span>`;
    const tagLine = tags.length
      ? `<span class="item-tags">${tags.map((tag) => `<span data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join(" ")}</span>`
      : "";
    button.innerHTML = `<strong>${escapeHtml(song.title)}</strong>${authorLine}${tagLine}`;
    button.addEventListener("pointerdown", startSwipeSelection);
    button.addEventListener("pointerup", endSwipeSelection);
    button.addEventListener("pointercancel", cancelSwipeSelection);
    button.addEventListener("click", () => {
      if (suppressNextSongClick) {
        suppressNextSongClick = false;
        return;
      }
      showSong(index);
    });
    nodes.push(button);
    if (isMobileView() && index === currentIndex) {
      nodes.push(songView);
    }
  }
  list.replaceChildren(...nodes);
  moveSongView();
  updateSelectionBar();
}

function clearFilters() {
  search.value = "";
  authorFilter.value = "";
  tagFilter.value = "";
  selectedOnly = false;
  renderList();
}

function startSwipeSelection(event) {
  swipeStart = {
    x: event.clientX,
    y: event.clientY,
    index: Number(event.currentTarget.dataset.index),
  };
}

function endSwipeSelection(event) {
  if (!swipeStart || Number(event.currentTarget.dataset.index) !== swipeStart.index) {
    swipeStart = null;
    return;
  }
  const dx = event.clientX - swipeStart.x;
  const dy = Math.abs(event.clientY - swipeStart.y);
  if (dx > 56 && dy < 42) {
    toggleSongSelection(swipeStart.index);
    suppressNextSongClick = true;
  }
  swipeStart = null;
}

function cancelSwipeSelection() {
  swipeStart = null;
}

function toggleSongSelection(index) {
  if (selectedSongIndexes.has(index)) {
    selectedSongIndexes.delete(index);
  } else {
    selectedSongIndexes.add(index);
  }
  if (!selectedSongIndexes.size) {
    selectedOnly = false;
  }
  renderList();
}

function updateSelectionBar() {
  const count = selectedSongIndexes.size;
  selectionCount.textContent = `${count} seleccionada${count === 1 ? "" : "s"}`;
  selectedOnlyButton.disabled = count === 0;
  selectedPdfButton.disabled = count === 0;
  clearSelectionButton.disabled = count === 0;
  selectedOnlyButton.classList.toggle("active", selectedOnly);
  selectedOnlyButton.textContent = selectedOnly ? "Ver todas" : "Ver selección";
}

function renderFilters() {
  renderSelect(
    authorFilter,
    "Todos los autores",
    uniqueValues(songs.map((song) => song.author).filter(Boolean))
  );
  renderSelect(
    tagFilter,
    "Todas las etiquetas",
    uniqueValues(songs.flatMap((song) => song.tags || []))
  );
}

function renderSelect(select, label, values) {
  const currentValue = select.value;
  select.replaceChildren(new Option(label, ""), ...values.map((value) => new Option(value, value)));
  select.value = values.includes(currentValue) ? currentValue : "";
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, "es", { sensitivity: "base" }));
}

function handleFilterChipClick(event) {
  const chip = event.target.closest("[data-author], [data-tag]");
  if (!chip) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (chip.dataset.author) {
    authorFilter.value = chip.dataset.author;
  }
  if (chip.dataset.tag) {
    tagFilter.value = chip.dataset.tag;
  }
  renderList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSong(index, shouldScroll = true) {
  stopAutoscroll();
  transposeOffset = 0;
  currentIndex = index;
  updateSongView();
  renderList();
  if (shouldScroll && window.matchMedia("(max-width: 780px)").matches) {
    scrollSongViewIntoPlace();
  }
}

function scrollSongViewIntoPlace() {
  const topbar = document.querySelector(".topbar");
  const stickyHeader = topbar && getComputedStyle(topbar).position === "sticky";
  const offset = (stickyHeader ? topbar.offsetHeight : 0) + 8;
  const top = songView.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function updateSongView() {
  const song = songs[currentIndex];
  if (!song) {
    return;
  }
  title.textContent = song.title;
  capo.textContent = song.capo ? `Cejilla ${song.capo}` : "";
  if (song.author) {
    const authorChip = makeFilterChip(`[${song.author}]`, "author", song.author);
    author.replaceChildren(authorChip);
  } else {
    author.textContent = "";
  }
  const tags = song.tags || [];
  tagSummary.replaceChildren(...tags.map((tag) => makeFilterChip(tag, "tag", tag)));
  page.textContent = song.page ? `Pagina ${song.page}` : "";
  spotifyLinkWrap.classList.toggle("hidden", !song.spotifyUrl);
  if (song.spotifyUrl) {
    spotifyLink.href = song.spotifyUrl;
  }
  audioLinkWrap.classList.toggle("hidden", !song.audioUrl);
  if (song.audioUrl) {
    audioLink.href = song.audioUrl;
  }
  renderBody();
}

function makeFilterChip(label, type, value) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "filter-chip";
  chip.textContent = label;
  chip.dataset[type] = value;
  return chip;
}

function moveSongView() {
  if (!isMobileView()) {
    layout.appendChild(songView);
  }
}

function isMobileView() {
  return window.matchMedia("(max-width: 780px)").matches;
}

function setMode(nextMode) {
  mode = nextMode;
  withChordsButton.classList.toggle("active", mode === "chords");
  lyricsOnlyButton.classList.toggle("active", mode === "lyrics");
  updateTransposeControls();
  renderBody();
}

function transposeSong(semitones) {
  if (mode !== "chords") {
    return;
  }
  transposeOffset += semitones;
  updateTransposeControls();
  renderBody();
}

function updateTransposeControls() {
  transposeControls.classList.toggle("hidden", mode !== "chords");
  transposeValue.textContent = String(transposeOffset);
}

function toggleAutoscroll() {
  if (autoscrollFrame) {
    stopAutoscroll();
    return;
  }
  autoscrollButton.classList.add("active");
  autoscrollButton.textContent = "Parar";
  autoscrollLastTime = 0;
  autoscrollFrame = window.requestAnimationFrame(runAutoscroll);
}

function stopAutoscroll() {
  if (autoscrollFrame) {
    window.cancelAnimationFrame(autoscrollFrame);
    autoscrollFrame = 0;
  }
  autoscrollLastTime = 0;
  autoscrollButton.classList.remove("active");
  autoscrollButton.textContent = "Autoscroll";
}

function runAutoscroll(timestamp) {
  if (!autoscrollLastTime) {
    autoscrollLastTime = timestamp;
  }
  const elapsed = timestamp - autoscrollLastTime;
  autoscrollLastTime = timestamp;
  const pixelsPerSecond = 18;
  window.scrollBy(0, (pixelsPerSecond * elapsed) / 1000);

  const reachedBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (reachedBottom) {
    stopAutoscroll();
    return;
  }
  autoscrollFrame = window.requestAnimationFrame(runAutoscroll);
}

function renderBody() {
  const song = songs[currentIndex];
  if (!song) {
    body.replaceChildren();
    return;
  }
  const richLines = mode === "lyrics" ? song.lyricLines : song.chordLines;
  const plainLines = mode === "lyrics" ? song.lyrics : song.chords;
  body.classList.toggle("chords-mode", mode === "chords");
  let lines = richTextLines(richLines, plainLines, song.chords);
  if (mode === "chords" && transposeOffset) {
    lines = transposeRichLines(lines, transposeOffset);
  }
  body.replaceChildren(...lines.map(renderSongLine));
}

function richTextLines(richLines, plainLines, fallbackLines) {
  if (Array.isArray(richLines) && richLines.length) {
    return richLines;
  }
  const source = Array.isArray(plainLines) && plainLines.length ? plainLines : fallbackLines || [];
  return source.map((line) => [{ text: line, bold: false }]);
}

function renderSongLine(runs) {
  const line = document.createElement("div");
  line.className = "song-line";
  const lineText = Array.isArray(runs) ? runs.map((run) => run.text || "").join("") : "";
  line.classList.toggle("chord-line", mode === "chords" && looksLikeChordLine(lineText));
  if (!Array.isArray(runs) || !runs.length) {
    line.appendChild(document.createTextNode(" "));
    return line;
  }
  for (const run of runs) {
    const node = document.createElement(run.bold ? "strong" : "span");
    node.textContent = run.text || "";
    line.appendChild(node);
  }
  return line;
}

function downloadCurrentSongPdf() {
  const song = songs[currentIndex];
  if (!song) {
    return;
  }
  downloadPdf(buildSongsPdf([{ song, lines: currentPdfLines(song) }]), `${safeFileName(song.title)}.pdf`);
}

function downloadSelectedSongsPdf() {
  const selectedEntries = [...selectedSongIndexes]
    .sort((first, second) => first - second)
    .map((index) => songs[index])
    .filter(Boolean)
    .map((song) => ({ song, lines: pdfLinesForSong(song) }));
  if (!selectedEntries.length) {
    return;
  }
  downloadPdf(buildSongsPdf(selectedEntries), "canciones-seleccionadas.pdf");
}

function downloadPdf(pdf, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function currentPdfLines(song) {
  return pdfLinesForSong(song, transposeOffset);
}

function pdfLinesForSong(song, semitoneOffset = 0) {
  const richLines = mode === "lyrics" ? song.lyricLines : song.chordLines;
  const plainLines = mode === "lyrics" ? song.lyrics : song.chords;
  let lines = richTextLines(richLines, plainLines, song.chords);
  if (mode === "chords" && semitoneOffset) {
    lines = transposeRichLines(lines, semitoneOffset);
  }
  return lines.map((runs) => ({
    text: (runs || []).map((run) => run.text || "").join(""),
    bold: mode === "chords" && looksLikeChordLine((runs || []).map((run) => run.text || "").join("")),
  }));
}

function buildSongsPdf(entries) {
  const encoder = new TextEncoder();
  const objects = [];
  const pages = [];
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const bodySize = 13;
  const lineHeight = 18;
  let pageLines = [];
  let y = 0;

  function flushPage() {
    const content = pageLines.join("\n");
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
    const pageId = objects.length + 1;
    pages.push(pageId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageLines = [];
    y = pageHeight - margin;
  }

  function addText(text, x, size, font, lineGap) {
    if (y < margin + lineGap) {
      flushPage();
    }
    pageLines.push(`BT /${font} ${size} Tf ${x} ${y} Td ${pdfHexText(text)} Tj ET`);
    y -= lineGap;
  }

  y = pageHeight - margin;
  for (const [entryIndex, entry] of entries.entries()) {
    if (entryIndex > 0) {
      flushPage();
    }
    const song = entry.song;
    const header = [
      { text: song.title || "", size: 26, font: "F1", gap: 32 },
      { text: song.capo ? `Cejilla ${song.capo}` : "", size: 11, font: "F1", gap: 17 },
      { text: song.author ? `[${song.author}]` : "", size: 11, font: "F2", gap: 20 },
    ].filter((item) => item.text);

    for (const item of header) {
      addText(item.text, margin, item.size, item.font, item.gap);
    }
    y -= 4;

    for (const line of entry.lines) {
      const wrapped = wrapPdfText(line.text, mode === "chords" ? 72 : 82);
      if (!wrapped.length) {
        y -= lineHeight;
        if (y < margin) {
          flushPage();
        }
        continue;
      }
      for (const wrappedLine of wrapped) {
        addText(wrappedLine, margin, bodySize, line.bold ? "F3" : "F2", lineHeight);
      }
    }
    if (song.spotifyUrl) {
      y -= 8;
      addText("Escuchar en Spotify:", margin, 12, "F1", 16);
      addText(song.spotifyUrl, margin, 10, "F2", 14);
    }
    if (song.audioUrl) {
      y -= 8;
      addText("Audio de ayuda:", margin, 12, "F1", 16);
      addText(new URL(song.audioUrl, window.location.href).href, margin, 10, "F2", 14);
    }
  }
  flushPage();

  objects.unshift(
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>`
  );
  return pdfBytes(objects);
}

function pdfBytes(objects) {
  const encoder = new TextEncoder();
  const chunks = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(length);
    const chunk = encoder.encode(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
    chunks.push(chunk);
    length += chunk.length;
  }
  const xrefAt = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  chunks.push(encoder.encode(xref));
  length += chunks[chunks.length - 1].length;
  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

function pdfHexText(text) {
  const bytes = [0xfe, 0xff];
  for (const character of String(text || "")) {
    const code = character.charCodeAt(0);
    bytes.push((code >> 8) & 255, code & 255);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
}

function wrapPdfText(text, width) {
  const value = String(text || "");
  if (!value.trim()) {
    return [];
  }
  if (value.length <= width) {
    return [value];
  }
  const lines = [];
  let remaining = value;
  while (remaining.length > width) {
    const cut = Math.max(1, remaining.lastIndexOf(" ", width));
    lines.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) {
    lines.push(remaining);
  }
  return lines;
}

function safeFileName(value) {
  return String(value || "cancion").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "cancion";
}

function transposeRichLines(lines, semitones) {
  return lines.map((runs) => {
    const lineText = Array.isArray(runs) ? runs.map((run) => run.text || "").join("") : "";
    const transposeWholeLine = looksLikeChordLine(lineText);
    return (runs || []).map((run) => ({
      ...run,
      text: transposeWholeLine
        ? transposeChordText(run.text || "", semitones)
        : transposeInlineChordText(run.text || "", semitones),
    }));
  });
}

function looksLikeChordLine(line) {
  const words = String(line || "").trim().replace(/[|]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) {
    return false;
  }
  const chords = words.filter((word) => isChordToken(word.replace(/[;,.:]+$/g, "")));
  return chords.length > 0 && chords.length >= Math.max(1, Math.floor(words.length / 2));
}

function transposeInlineChordText(text, semitones) {
  return String(text || "").replace(/\[([^\]]+)\]/g, (value, chord) => (
    isChordToken(chord) ? `[${transposeChordToken(chord, semitones)}]` : value
  ));
}

function transposeChordText(text, semitones) {
  return String(text || "").replace(/(?:SOL|DO|RE|MI|FA|LA|SI)(?:#|b)?[A-Za-z0-9#b()+-]*(?:\/(?:SOL|DO|RE|MI|FA|LA|SI)(?:#|b)?)?|[A-G](?:#|b)?[A-Za-z0-9#b()+-]*(?:\/[A-G](?:#|b)?)?/g, (token) => (
    isChordToken(token) ? transposeChordToken(token, semitones) : token
  ));
}

function isChordToken(token) {
  const clean = String(token || "").trim().replace(/^[([]/, "").replace(/[]);,.:]+$/g, "");
  return parseChordToken(clean) !== null;
}

function transposeChordToken(token, semitones) {
  const chord = parseChordToken(token);
  if (!chord) {
    return token;
  }
  const root = transposeNote(chord.root, semitones, chord.notation);
  const bass = chord.bass ? `/${transposeNote(chord.bass, semitones, chord.notation)}` : "";
  return `${root}${chord.quality}${bass}`;
}

function parseChordToken(token) {
  const value = String(token || "").trim();
  let match = value.match(/^((?:SOL|DO|RE|MI|FA|LA|SI)(?:#|b)?)([A-Za-z0-9#b()+-]*?)(?:\/((?:SOL|DO|RE|MI|FA|LA|SI)(?:#|b)?))?$/);
  if (match && CHORD_QUALITY_RE.test(match[2])) {
    return { root: match[1], quality: match[2], bass: match[3] || "", notation: "solfege" };
  }
  match = value.match(/^([A-G](?:#|b)?)([A-Za-z0-9#b()+-]*?)(?:\/([A-G](?:#|b)?))?$/);
  if (match && CHORD_QUALITY_RE.test(match[2])) {
    return { root: match[1], quality: match[2], bass: match[3] || "", notation: "english" };
  }
  return null;
}

function transposeNote(note, semitones, notation) {
  const index = NOTE_INDEX.get(String(note || "").toUpperCase());
  if (index === undefined) {
    return note;
  }
  const names = notation === "solfege" ? SOLFEGE_NAMES : NOTE_NAMES;
  return names[(index + semitones + 1200) % 12];
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}
