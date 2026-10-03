 const WORKER_URL = "https://blackfox.s04693400.workers.dev";

let aiMessages = [];
let searchHistory = JSON.parse(localStorage.getItem("volox_search_history") || "[]");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

if (searchForm) {
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    search();
  });
}

/* -----------------------------
   HELPERS
----------------------------- */

function getQuery() {
  return searchInput ? searchInput.value.trim() : "";
}

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAIText(text = "") {
  let html = escapeHTML(text);

  html = html.replace(
    /^### (.*)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^## (.*)$/gm,
    "<h2>$1</h2>"
  );

  html = html.replace(
    /^# (.*)$/gm,
    "<h2>$1</h2>"
  );

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /^\s*[-*]\s+(.*)$/gm,
    "<li>$1</li>"
  );

  html = html.replace(
    /(<li>.*<\/li>)/gs,
    "<ul>$1</ul>"
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

function openNewTab(page) {
  window.open(page, "_blank", "noopener,noreferrer");
}

/* -----------------------------
   SEARCH
----------------------------- */

async function search() {

  const query = getQuery();

  if (!query) {
    searchInput?.focus();
    return;
  }

  saveSearch(query);

  results.innerHTML = `
    <div class="search-loading">
      <div class="loader">🦊</div>
      <h3>VoloX is searching...</h3>
      <p>Finding useful information for you.</p>
    </div>
  `;

  try {

    const response = await fetch(
      `${WORKER_URL}/api/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed.");
    }

    const answer =
      data.answer ||
      data.ai_answer ||
      "";

    const searchResults =
      Array.isArray(data.results)
        ? data.results
        : [];

    let html = "";

    if (answer) {
      html += `
        <section class="about-search">
          <div class="about-label">ABOUT THIS SEARCH</div>
          <div class="about-text">
            ${formatAIText(answer)}
          </div>
        </section>
      `;
    }

    html += `
      <div class="articles-heading">
        <h2>Articles</h2>
        <span>${searchResults.length} results</span>
      </div>
    `;

    if (!searchResults.length) {

      html += `
        <div class="empty-state">
          <h3>No results found</h3>
          <p>Try another search.</p>
        </div>
      `;

    } else {

      html += searchResults.map(item => {

        const title = item.title || "Untitled";
        const url = item.url || "#";
        const content =
          item.content ||
          item.description ||
          "Open the article to read more.";

        const domain = getDomain(url);

        return `
          <article class="result-card">

            <div class="result-domain">
              ${escapeHTML(domain)}
            </div>

            <a
              class="result-title"
              href="${escapeHTML(url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${escapeHTML(title)}
            </a>

            <p class="result-description">
              ${escapeHTML(content)}
            </p>

            <a
              class="read-link"
              href="${escapeHTML(url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read more ↗
            </a>

          </article>
        `;

      }).join("");
    }

    results.innerHTML = html;

    window.scrollTo({
      top: results.offsetTop - 20,
      behavior: "smooth"
    });

  } catch (error) {

    console.error(error);

    results.innerHTML = `
      <div class="error-state">
        <h3>Search couldn't load</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

function getDomain(url) {

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web";
  }
}

/* -----------------------------
   SEARCH HISTORY
----------------------------- */

function saveSearch(query) {

  searchHistory = searchHistory.filter(
    item => item.toLowerCase() !== query.toLowerCase()
  );

  searchHistory.unshift(query);

  searchHistory = searchHistory.slice(0, 50);

  localStorage.setItem(
    "volox_search_history",
    JSON.stringify(searchHistory)
  );
}

/* -----------------------------
   IMAGE SEARCH
----------------------------- */

function imageSearch() {

  const query = getQuery();

  if (!query) {
    searchInput?.focus();
    return;
  }

  localStorage.setItem(
    "volox_last_image_search",
    query
  );

  window.open(
    `images.html?q=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/* -----------------------------
   AI
----------------------------- */

function aiSearch() {

  aiMessages = [];

  results.innerHTML = `
    <section class="ai-panel">

      <div class="ai-top">
        <div>
          <h2>🤖 VoloX AI</h2>
          <p>Ask anything and continue the conversation.</p>
        </div>

        <button id="newChatButton" type="button">
          + New Chat
        </button>
      </div>

      <div id="aiAnswer" class="ai-answer">
        <div class="ai-empty">
          <div>🤖</div>
          <h3>How can I help?</h3>
          <p>Ask me anything and continue the conversation.</p>
        </div>
      </div>

      <form id="aiForm" class="ai-form">

        <input
          id="aiInput"
          type="text"
          placeholder="Ask VoloX AI..."
          autocomplete="off"
        >

        <button type="submit">Send</button>

      </form>

    </section>
  `;

  document
    .getElementById("aiForm")
    ?.addEventListener("submit", event => {
      event.preventDefault();
      askAI();
    });

  document
    .getElementById("newChatButton")
    ?.addEventListener("click", () => {

      aiMessages = [];

      document.getElementById("aiAnswer").innerHTML = `
        <div class="ai-empty">
          <div>✨</div>
          <h3>New conversation</h3>
          <p>Ask VoloX AI anything.</p>
        </div>
      `;

    });

  document.getElementById("aiInput")?.focus();
}

async function askAI() {

  const input = document.getElementById("aiInput");
  const answerBox = document.getElementById("aiAnswer");

  if (!input || !answerBox) return;

  const question = input.value.trim();

  if (!question) return;

  aiMessages.push({
    role: "user",
    text: question
  });

  answerBox.insertAdjacentHTML(
    "beforeend",
    `
      <div class="chat-message user-message">
        <div class="chat-label">You</div>
        <div>${escapeHTML(question)}</div>
      </div>
    `
  );

  input.value = "";

  answerBox.insertAdjacentHTML(
    "beforeend",
    `
      <div id="thinkingMessage" class="chat-message ai-message">
        <div class="chat-label">VoloX AI</div>
        <div>Thinking… 🤖</div>
      </div>
    `
  );

  answerBox.scrollTop = answerBox.scrollHeight;

  try {

    const response = await fetch(
      `${WORKER_URL}/api/ai`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: aiMessages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.promptFeedback?.blockReason ||
        "AI request failed."
      );
    }

    const text =
      data.text ||
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "Gemini returned no text.";

    aiMessages.push({
      role: "model",
      text
    });

    document.getElementById("thinkingMessage")?.remove();

    answerBox.insertAdjacentHTML(
      "beforeend",
      `
        <div class="chat-message ai-message">
          <div class="chat-label">VoloX AI 🤖</div>
          <div class="ai-text">${formatAIText(text)}</div>
        </div>
      `
    );

    answerBox.scrollTop = answerBox.scrollHeight;

  } catch (error) {

    document.getElementById("thinkingMessage")?.remove();

    answerBox.insertAdjacentHTML(
      "beforeend",
      `
        <div class="chat-message ai-message error-chat">
          <div class="chat-label">VoloX AI</div>
          <div>${escapeHTML(error.message)}</div>
        </div>
      `
    );
  }
}

/* -----------------------------
   DISCOVER
----------------------------- */

async function loadDiscover() {

  const grid = document.getElementById("discoverGrid");
  const updated = document.getElementById("discoverUpdated");

  if (!grid) return;

  grid.innerHTML = `
    <div class="discover-loading">
      🦊 Finding fresh stories…
    </div>
  `;

  try {

    const response = await fetch(
      `${WORKER_URL}/api/discover`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Discover failed.");
    }

    const categories = [
      "cricket",
      "news",
      "technology",
      "robotics",
      "sports",
      "entertainment",
      "science"
    ];

    const stories = [];

    categories.forEach(category => {

      const group = data[category];

      if (!group) return;

      const items =
        Array.isArray(group.results)
          ? group.results
          : [];

      const images =
        Array.isArray(group.images)
          ? group.images
          : [];

      items.forEach((item, index) => {

        const image =
          item.image ||
          item.thumbnail ||
          images[index] ||
          images[0] ||
          "";

        stories.push({
          category,
          title: item.title || "Untitled story",
          content:
            item.content ||
            item.description ||
            "Read the latest details.",
          url: item.url || "#",
          image
        });

      });

    });

    if (!stories.length) {

      grid.innerHTML = `
        <div class="discover-empty">
          <h3>No fresh stories right now</h3>
          <p>Try refreshing in a moment.</p>
        </div>
      `;

      return;
    }

    grid.innerHTML = stories
      .slice(0, 20)
      .map(story => {

        const safeCategory =
          story.category.toUpperCase();

        const imageHTML = story.image
          ? `
            <a
              class="discover-photo-link"
              href="${escapeHTML(story.url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                class="discover-photo"
                src="${escapeHTML(story.image)}"
                alt=""
                loading="lazy"
                onerror="this.parentElement.style.display='none'"
              >
            </a>
          `
          : "";

        const shortText =
          story.content.length > 190
            ? story.content.slice(0, 190) + "…"
            : story.content;

        return `
          <article class="discover-story">

            ${imageHTML}

            <div class="discover-story-content">

              <div class="discover-story-category">
                ${escapeHTML(safeCategory)}
              </div>

              <a
                class="discover-story-title"
                href="${escapeHTML(story.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHTML(story.title)}
              </a>

              <p class="discover-story-description">
                ${escapeHTML(shortText)}
                <a
                  href="${escapeHTML(story.url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  See more
                </a>
              </p>

              <div class="discover-story-source">
                ${escapeHTML(getDomain(story.url))}
              </div>

            </div>

          </article>
        `;

      })
      .join("");

    if (updated) {

      const now = new Date();

      updated.textContent =
        `Updated just now · ${now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
    }

  } catch (error) {

    console.error(error);

    grid.innerHTML = `
      <div class="discover-empty">
        <h3>Discover couldn't load</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

/* -----------------------------
   SPORTS TICKER
----------------------------- */

async function loadCricketTicker() {

  const track = document.getElementById("cricketTrack");

  if (!track) return;

  try {

    const response = await fetch(
      `${WORKER_URL}/api/cricket`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Sports update failed.");
    }

    const items =
      Array.isArray(data.results)
        ? data.results
        : [];

    if (!items.length) {

      track.innerHTML = `
        <div class="cricket-placeholder">
          🏏 No latest sports updates available.
        </div>
      `;

      return;
    }

    const cards = items.slice(0, 10).map(item => {

      const title = item.title || "Latest cricket update";

      const text =
        item.content ||
        item.description ||
        "Open for the latest details.";

      const url = item.url || "#";

      return `
        <a
          class="cricket-card"
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <div class="cricket-card-top">
            <span>🏏 SPORTS</span>
            <span class="update-tag">UPDATE</span>
          </div>

          <h3>${escapeHTML(title)}</h3>

          <p>
            ${escapeHTML(
              text.length > 85
                ? text.slice(0, 85) + "…"
                : text
            )}
          </p>

        </a>
      `;
    }).join("");

    track.innerHTML = cards + cards;

    startTicker();

  } catch (error) {

    console.error(error);

    track.innerHTML = `
      <div class="cricket-placeholder">
        🏏 Sports updates couldn't load.
      </div>
    `;
  }
}

let tickerAnimation;

function startTicker() {

  const wrap = document.getElementById("cricketTicker");
  const track = document.getElementById("cricketTrack");

  if (!wrap || !track) return;

  let position = 0;
  let paused = false;

  function animate() {

    if (!paused) {

      position -= 0.35;

      const halfWidth = track.scrollWidth / 2;

      if (Math.abs(position) >= halfWidth) {
        position = 0;
      }

      track.style.transform =
        `translateX(${position}px)`;
    }

    tickerAnimation = requestAnimationFrame(animate);
  }

  wrap.addEventListener("mouseenter", () => {
    paused = true;
  });

  wrap.addEventListener("mouseleave", () => {
    paused = false;
  });

  wrap.addEventListener("touchstart", () => {
    paused = true;
  }, { passive: true });

  wrap.addEventListener("touchend", () => {
    paused = false;
  }, { passive: true });

  animate();
}

/* -----------------------------
   MENU
----------------------------- */

const menuBtn = document.getElementById("menuBtn");
const closeMenu = document.getElementById("closeMenu");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");

function openMenu() {
  sideMenu?.classList.add("open");
  menuOverlay?.classList.add("open");
}

function closeSideMenu() {
  sideMenu?.classList.remove("open");
  menuOverlay?.classList.remove("open");
}

menuBtn?.addEventListener("click", openMenu);
closeMenu?.addEventListener("click", closeSideMenu);
menuOverlay?.addEventListener("click", closeSideMenu);

/* -----------------------------
   START
----------------------------- */

loadCricketTicker();
loadDiscover();

document
  .getElementById("refreshDiscover")
  ?.addEventListener("click", loadDiscover);
