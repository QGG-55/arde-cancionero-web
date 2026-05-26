const landing = document.querySelector("#landing");
const choices = document.querySelector("#songbookChoices");
const homeButton = document.querySelector("#homeButton");
const currentSongbook = document.querySelector("#currentSongbook");
const list = document.querySelector("#songList");
const search = document.querySelector("#search");
const title = document.querySelector("#songTitle");
const author = document.querySelector("#songAuthor");
const page = document.querySelector("#songPage");
const body = document.querySelector("#songBody");
const withChordsButton = document.querySelector("#withChordsButton");
const lyricsOnlyButton = document.querySelector("#lyricsOnlyButton");

let songbooks = [];
let songs = [];
let currentIndex = 0;
let mode = "chords";

fetch("manifest.json")
  .then((response) => response.json())
  .then((payload) => {
    songbooks = Array.isArray(payload) ? payload : [];
    renderLanding();
  })
  .catch(() => {
    choices.innerHTML = '<p class="empty">No se pudo cargar el cancionero.</p>';
  });

search.addEventListener("input", renderList);
homeButton.addEventListener("click", showLanding);
withChordsButton.addEventListener("click", () => setMode("chords"));
lyricsOnlyButton.addEventListener("click", () => setMode("lyrics"));

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
    button.innerHTML = `<strong>${escapeHtml(songbook.name)}</strong><span>${songbook.count || 0} canciones</span>`;
    button.addEventListener("click", () => loadSongbook(songbook));
    return button;
  }));
}

function showLanding() {
  document.body.classList.remove("app-open");
  landing.scrollIntoView({ behavior: "smooth", block: "start" });
}

function loadSongbook(songbook) {
  fetch(songbook.file)
    .then((response) => response.json())
    .then((payload) => {
      songs = Array.isArray(payload.songs) ? payload.songs : [];
      currentIndex = 0;
      search.value = "";
      currentSongbook.textContent = payload.name || songbook.name || "CANCIONERO";
      document.body.classList.add("app-open");
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
  const matches = songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => !query || normalize(`${song.title} ${song.author} ${(song.tags || []).join(" ")}`).includes(query));

  if (!matches.length) {
    list.innerHTML = '<p class="empty">Sin resultados.</p>';
    return;
  }

  list.replaceChildren(...matches.map(({ song, index }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "song-item";
    button.classList.toggle("active", index === currentIndex);
    button.innerHTML = `<strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.author || "Sin autor")}</span>`;
    button.addEventListener("click", () => showSong(index));
    return button;
  }));
}

function showSong(index, shouldScroll = true) {
  currentIndex = index;
  const song = songs[index];
  if (!song) {
    return;
  }
  title.textContent = song.title;
  author.textContent = song.author ? `[${song.author}]` : "";
  page.textContent = song.page ? `Pagina ${song.page}` : "";
  renderBody();
  renderList();
  if (shouldScroll && window.matchMedia("(max-width: 780px)").matches) {
    document.querySelector(".song-view").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setMode(nextMode) {
  mode = nextMode;
  withChordsButton.classList.toggle("active", mode === "chords");
  lyricsOnlyButton.classList.toggle("active", mode === "lyrics");
  renderBody();
}

function renderBody() {
  const song = songs[currentIndex];
  if (!song) {
    body.textContent = "";
    return;
  }
  const lines = mode === "lyrics" ? song.lyrics : song.chords;
  body.textContent = (lines && lines.length ? lines : song.chords || []).join("\n");
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
