(function () {
  var body = document.body;
  var dataFile = body.getAttribute("data-songbook-file");
  var currentSongbook = document.getElementById("currentSongbook");
  var search = document.getElementById("search");
  var clearButton = document.getElementById("clearFiltersButton");
  var authorFilter = document.getElementById("authorFilter");
  var tagFilter = document.getElementById("tagFilter");
  var selectionCount = document.getElementById("selectionCount");
  var list = document.getElementById("songList");
  var songView = document.querySelector(".song-view");
  var title = document.getElementById("songTitle");
  var capo = document.getElementById("songCapo");
  var author = document.getElementById("songAuthor");
  var tags = document.getElementById("songTags");
  var page = document.getElementById("songPage");
  var songBody = document.getElementById("songBody");
  var lyricsButton = document.getElementById("lyricsOnlyButton");
  var chordsButton = document.getElementById("withChordsButton");
  var songs = [];
  var currentIndex = 0;
  var mode = "chords";

  function requestJson(url, done) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) {
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        try {
          done(null, JSON.parse(request.responseText));
        } catch (error) {
          done(error);
        }
        return;
      }
      done(new Error("No se pudo abrir el cancionero."));
    };
    request.send();
  }

  function normalize(value) {
    value = String(value || "").toLowerCase();
    if (value.normalize) {
      value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return value;
  }

  function empty(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function option(label, value) {
    var item = document.createElement("option");
    item.text = label;
    item.value = value;
    return item;
  }

  function unique(values) {
    var seen = {};
    var output = [];
    for (var index = 0; index < values.length; index += 1) {
      var value = String(values[index] || "").trim();
      var key = normalize(value);
      if (value && !seen[key]) {
        seen[key] = true;
        output.push(value);
      }
    }
    output.sort(function (first, second) {
      return first.localeCompare(second);
    });
    return output;
  }

  function renderSelect(select, label, values) {
    var current = select.value;
    empty(select);
    select.appendChild(option(label, ""));
    for (var index = 0; index < values.length; index += 1) {
      select.appendChild(option(values[index], values[index]));
    }
    select.value = values.indexOf(current) >= 0 ? current : "";
  }

  function renderFilters() {
    var authors = [];
    var allTags = [];
    for (var index = 0; index < songs.length; index += 1) {
      if (songs[index].author) {
        authors.push(songs[index].author);
      }
      var songTags = songs[index].tags || [];
      for (var tagIndex = 0; tagIndex < songTags.length; tagIndex += 1) {
        allTags.push(songTags[tagIndex]);
      }
    }
    renderSelect(authorFilter, "Todos los autores", unique(authors));
    renderSelect(tagFilter, "Todas las etiquetas", unique(allTags));
  }

  function filteredSongs() {
    var query = normalize(search.value);
    var selectedAuthor = normalize(authorFilter.value);
    var selectedTag = normalize(tagFilter.value);
    var output = [];
    for (var index = 0; index < songs.length; index += 1) {
      var song = songs[index];
      var songTags = song.tags || [];
      var tagText = songTags.join(" ");
      var matchesQuery = !query || normalize(String(song.title || "") + " " + String(song.author || "") + " " + tagText).indexOf(query) >= 0;
      var matchesAuthor = !selectedAuthor || normalize(song.author) === selectedAuthor;
      var matchesTag = !selectedTag;
      for (var tagIndex = 0; tagIndex < songTags.length; tagIndex += 1) {
        if (normalize(songTags[tagIndex]) === selectedTag) {
          matchesTag = true;
        }
      }
      if (matchesQuery && matchesAuthor && matchesTag) {
        output.push({ song: song, index: index });
      }
    }
    return output;
  }

  function renderList() {
    var matches = filteredSongs();
    empty(list);
    selectionCount.textContent = String(matches.length) + " canciones";
    if (!matches.length) {
      list.innerHTML = '<p class="empty">Sin resultados.</p>';
      return;
    }
    for (var index = 0; index < matches.length; index += 1) {
      var item = matches[index];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "song-item" + (item.index === currentIndex ? " active" : "");
      button.setAttribute("data-index", String(item.index));
      button.innerHTML = "<strong>" + escapeHtml(item.song.title || "Sin titulo") + "</strong><span>" + escapeHtml(item.song.author || "Sin autor") + "</span>";
      button.onclick = function () {
        showSong(Number(this.getAttribute("data-index")));
      };
      list.appendChild(button);
      if (item.index === currentIndex) {
        list.appendChild(songView);
      }
    }
  }

  function showSong(index) {
    currentIndex = index;
    var song = songs[currentIndex];
    if (!song) {
      return;
    }
    title.textContent = song.title || "";
    capo.textContent = song.capo ? "Cejilla " + song.capo : "";
    author.textContent = song.author ? "[" + song.author + "]" : "";
    tags.textContent = (song.tags || []).join(" ");
    page.textContent = song.page ? "Pagina " + song.page : "";
    renderBody();
    renderList();
    if (window.matchMedia && window.matchMedia("(max-width: 780px)").matches && songView.scrollIntoView) {
      songView.scrollIntoView();
    }
  }

  function richLines(song) {
    var lines = mode === "lyrics" ? song.lyricLines : song.chordLines;
    if (lines && lines.length) {
      return lines;
    }
    var plain = mode === "lyrics" ? song.lyrics : song.chords;
    plain = plain && plain.length ? plain : [];
    var output = [];
    for (var index = 0; index < plain.length; index += 1) {
      output.push([{ text: plain[index], bold: false }]);
    }
    return output;
  }

  function renderBody() {
    var song = songs[currentIndex];
    empty(songBody);
    if (!song) {
      return;
    }
    songBody.className = "song-body" + (mode === "chords" ? " chords-mode" : "");
    var lines = richLines(song);
    for (var index = 0; index < lines.length; index += 1) {
      var line = document.createElement("div");
      line.className = "song-line";
      var runs = lines[index] || [];
      if (!runs.length) {
        line.appendChild(document.createTextNode(" "));
      }
      for (var runIndex = 0; runIndex < runs.length; runIndex += 1) {
        var run = runs[runIndex] || {};
        var node = document.createElement(run.bold ? "strong" : "span");
        node.appendChild(document.createTextNode(run.text || ""));
        line.appendChild(node);
      }
      songBody.appendChild(line);
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  search.oninput = renderList;
  authorFilter.onchange = renderList;
  tagFilter.onchange = renderList;
  clearButton.onclick = function () {
    search.value = "";
    authorFilter.value = "";
    tagFilter.value = "";
    renderList();
  };
  lyricsButton.onclick = function () {
    mode = "lyrics";
    lyricsButton.className = "active";
    chordsButton.className = "";
    renderBody();
  };
  chordsButton.onclick = function () {
    mode = "chords";
    chordsButton.className = "active";
    lyricsButton.className = "";
    renderBody();
  };

  requestJson(dataFile, function (error, payload) {
    if (error) {
      title.textContent = error.message;
      return;
    }
    currentSongbook.textContent = payload.name || currentSongbook.textContent;
    songs = payload.songs || [];
    renderFilters();
    renderList();
    showSong(0);
  });
}());
