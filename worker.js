 export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (url.pathname === "/api/search") {
      return handleSearch(url, env);
    }

    if (url.pathname === "/api/ai") {
      return handleAI(request, env);
    }

    if (url.pathname === "/api/discover") {
      return handleDiscover(env);
    }

    if (url.pathname === "/api/cricket") {
      return handleCricket(env);
    }

    return env.ASSETS.fetch(request);
  }
};


/* --------------------------------
   TAVILY SEARCH
-------------------------------- */

async function tavilySearch(query, env, maxResults = 5) {

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        api_key: env.SEARCH_API_KEY,
        query,
        search_depth: "advanced",
        max_results: maxResults,
        include_answer: true,
        include_images: true
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {

    throw new Error(
      data.message ||
      data.error ||
      "Search provider request failed."
    );
  }

  return data;
}


/* --------------------------------
   NORMAL SEARCH
-------------------------------- */

async function handleSearch(url, env) {

  if (!env.SEARCH_API_KEY) {

    return json({
      error: "SEARCH_API_KEY secret is not configured."
    }, 500);
  }

  const query =
    url.searchParams.get("q")?.trim();

  if (!query) {

    return json({
      error: "Missing search query."
    }, 400);
  }

  try {

    const data =
      await tavilySearch(
        query,
        env,
        8
      );

    return json(data);

  } catch (error) {

    console.error(
      "VoloX search:",
      error
    );

    return json({
      error:
        error.message ||
        "Search failed."
    }, 502);
  }
}


/* --------------------------------
   AI
-------------------------------- */

async function handleAI(request, env) {

  if (request.method !== "POST") {

    return json({
      error: "AI endpoint requires POST."
    }, 405);
  }

  if (!env.GEMINI_API_KEY) {

    return json({
      error:
        "GEMINI_API_KEY secret is not configured."
    }, 500);
  }

  try {

    const body =
      await request.json();

    const messages =
      Array.isArray(body.messages)
        ? body.messages
        : [];

    const contents = messages
      .filter(message =>
        message &&
        ["user", "model"].includes(message.role)
      )
      .map(message => {

        if (
          Array.isArray(message.parts)
        ) {

          return {
            role: message.role,
            parts: message.parts
          };
        }

        return {
          role: message.role,
          parts: [
            {
              text:
                typeof message.text === "string"
                  ? message.text
                  : ""
            }
          ]
        };
      })
      .filter(message =>
        message.parts?.some(
          part =>
            typeof part.text === "string" &&
            part.text.trim()
        )
      );

    if (!contents.length) {

      return json({
        error:
          "No valid conversation messages."
      }, 400);
    }

    /*
      Keep your configured Gemini model here.
      If your current Gemini model is different,
      replace this model name.
    */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key":
            env.GEMINI_API_KEY
        },

        body: JSON.stringify({
          contents
        })
      }
    );

    const data =
      await response.json();

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    return json(
      {
        ...data,
        text
      },
      response.ok
        ? 200
        : response.status
    );

  } catch (error) {

    console.error(
      "VoloX AI:",
      error
    );

    return json({
      error:
        error.message ||
        "Gemini provider request failed."
    }, 502);
  }
}


/* --------------------------------
   DISCOVER
-------------------------------- */

async function handleDiscover(env) {

  if (!env.SEARCH_API_KEY) {

    return json({
      error:
        "SEARCH_API_KEY secret is not configured."
    }, 500);
  }

  /*
    These are NOT fixed stories.

    Every request searches the web for
    current stories.
  */

  const topics = {

    cricket:
      "latest cricket news scores matches India IPL international cricket today",

    news:
      "latest major India and world news today",

    technology:
      "latest technology AI smartphone gadget internet technology news today",

    robotics:
      "latest robotics robots engineering automation humanoid robot news today",

    sports:
      "latest sports news football tennis basketball Formula 1 sports today",

    entertainment:
      "latest entertainment movie music celebrity streaming news today",

    science:
      "latest science space NASA astronomy research discovery news today"
  };

  const output = {};

  await Promise.all(
    Object.entries(topics).map(
      async ([category, query]) => {

        try {

          output[category] =
            await tavilySearch(
              query,
              env,
              5
            );

        } catch (error) {

          console.error(
            `VoloX Discover ${category}:`,
            error
          );

          output[category] = {
            results: [],
            images: [],
            error: error.message
          };
        }
      }
    )
  );

  return json({
    updatedAt:
      new Date().toISOString(),

    ...output
  });
}


/* --------------------------------
   SPORTS / CRICKET STRIP
-------------------------------- */

async function handleCricket(env) {

  if (!env.SEARCH_API_KEY) {

    return json({
      error:
        "SEARCH_API_KEY secret is not configured."
    }, 500);
  }

  try {

    const data =
      await tavilySearch(
        "latest live cricket scores current matches cricket news India IPL international cricket today",
        env,
        10
      );

    return json({
      updatedAt:
        new Date().toISOString(),

      answer:
        data.answer || "",

      results:
        data.results || []
    });

  } catch (error) {

    console.error(
      "VoloX cricket:",
      error
    );

    return json({
      error:
        error.message ||
        "Cricket search failed."
    }, 502);
  }
}


/* --------------------------------
   CORS
-------------------------------- */

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}


/* --------------------------------
   JSON
-------------------------------- */

function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders()
      }
    }
  );
}
