const landing = document.querySelector("#landing");
const choices = document.querySelector("#songbookChoices");
const homeButton = document.querySelector("#homeButton");
const currentSongbook = document.querySelector("#currentSongbook");
const layout = document.querySelector(".layout");
const list = document.querySelector("#songList");
const songView = document.querySelector(".song-view");
const search = document.querySelector("#search");
const authorFilter = document.querySelector("#authorFilter");
const tagFilter = document.querySelector("#tagFilter");
const title = document.querySelector("#songTitle");
const capo = document.querySelector("#songCapo");
const author = document.querySelector("#songAuthor");
const tagSummary = document.querySelector("#songTags");
const page = document.querySelector("#songPage");
const body = document.querySelector("#songBody");
const withChordsButton = document.querySelector("#withChordsButton");
const lyricsOnlyButton = document.querySelector("#lyricsOnlyButton");
const autoscrollButton = document.querySelector("#autoscrollButton");

let songbooks = [];
let songs = [];
let currentIndex = 0;
let mode = "chords";
let autoscrollFrame = 0;
let autoscrollLastTime = 0;

fetch("manifest.json")
  .then((response) => response.json())
  .then((payload) => {
    songbooks = Array.isArray(payload) ? payload : [];
    renderLanding();
    loadSongbookFromHash();
  })
  .catch(() => {
    choices.innerHTML = '<p class="empty">No se pudo cargar el cancionero.</p>';
  });

search.addEventListener("input", renderList);
authorFilter.addEventListener("change", renderList);
tagFilter.addEventListener("change", renderList);
list.addEventListener("click", handleFilterChipClick, true);
songView.addEventListener("click", handleFilterChipClick, true);
if (homeButton) {
  homeButton.addEventListener("click", showLanding);
}
withChordsButton.addEventListener("click", () => setMode("chords"));
lyricsOnlyButton.addEventListener("click", () => setMode("lyrics"));
autoscrollButton.addEventListener("click", toggleAutoscroll);
window.addEventListener("resize", renderList);
window.addEventListener("hashchange", loadSongbookFromHash);

function renderLanding() {
  document.body.classList.remove("app-open");
  if (!songbooks.length) {
    choices.innerHTML = '<p class="empty">Todavia no hay cancioneros publicados.</p>';
    return;
  }

  choices.replaceChildren(...songbooks.map((songbook) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "songbook-button";
    const logos = {
      arde: "assets/logo-arde.jpg",
      rockandpop: "assets/logo-rockandpop.png",
    };
    const logo = logos[songbook.id] ? `<img class="songbook-logo ${escapeHtml(songbook.id)}" src="${logos[songbook.id]}" alt="" />` : "";
    button.innerHTML = `<span class="songbook-title">${logo}<strong>${escapeHtml(songbook.name)}</strong></span><span>${songbook.count || 0} canciones</span>`;
    button.addEventListener("click", () => {
      window.location.hash = songbook.id;
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
  const songbook = songbooks.find((item) => normalize(item.id) === requested);
  if (songbook) {
    loadSongbook(songbook);
  }
}

function loadSongbook(songbook) {
  fetch(songbook.file)
    .then((response) => response.json())
    .then((payload) => {
      songs = Array.isArray(payload.songs) ? payload.songs : [];
      currentIndex = 0;
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
    .catch(() => {
      choices.innerHTML = '<p class="empty">No se pudo abrir ese cancionero.</p>';
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
      return matchesQuery && matchesAuthor && matchesTag;
    });

  if (!matches.length) {
    moveSongView();
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
    const tags = song.tags || [];
    const authorLine = song.author
      ? `<span class="item-author" data-author="${escapeHtml(song.author)}">${escapeHtml(song.author)}</span>`
      : `<span>${escapeHtml("Sin autor")}</span>`;
    const tagLine = tags.length
      ? `<span class="item-tags">${tags.map((tag) => `<span data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join(" ")}</span>`
      : "";
    button.innerHTML = `<strong>${escapeHtml(song.title)}</strong>${authorLine}${tagLine}`;
    button.addEventListener("click", () => showSong(index));
    nodes.push(button);
    if (isMobileView() && index === currentIndex) {
      nodes.push(songView);
    }
  }
  list.replaceChildren(...nodes);
  moveSongView();
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
  currentIndex = index;
  updateSongView();
  renderList();
  if (shouldScroll && window.matchMedia("(max-width: 780px)").matches) {
    scrollSongViewIntoPlace();
  }
}

function scrollSongViewIntoPlace() {
  const topbar = document.querySelector(".topbar");
  const offset = (topbar ? topbar.offsetHeight : 0) + 6;
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
  renderBody();
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
  body.replaceChildren(...richTextLines(richLines, plainLines, song.chords).map(renderSongLine));
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
