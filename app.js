const list = document.querySelector("#songList");
const search = document.querySelector("#search");
const title = document.querySelector("#songTitle");
const author = document.querySelector("#songAuthor");
const page = document.querySelector("#songPage");
const body = document.querySelector("#songBody");
const withChordsButton = document.querySelector("#withChordsButton");
const lyricsOnlyButton = document.querySelector("#lyricsOnlyButton");

let songs = [];
let currentIndex = 0;
let mode = "chords";

fetch("songs.json")
  .then((response) => response.json())
  .then((payload) => {
    songs = payload;
    renderList();
    showSong(0);
  })
  .catch(() => {
    list.innerHTML = '<p class="empty">No se pudo cargar el cancionero.</p>';
  });

search.addEventListener("input", renderList);
withChordsButton.addEventListener("click", () => setMode("chords"));
lyricsOnlyButton.addEventListener("click", () => setMode("lyrics"));

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

function showSong(index) {
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
