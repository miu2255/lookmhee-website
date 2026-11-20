
const OWNER = "miu2255";
const SITE_ORIGIN = "https://lookmhee-blog.pages.dev";
const COOKIE_NAME = "lookmhee_oauth_state";

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const entry = cookies.split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(name + "="));

  return entry ? entry.slice(name.length + 1) : null;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = getCookie(request, COOKIE_NAME);

  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Set-Cookie":
      `${COOKIE_NAME}=; Path=/api/auth; ` +
      "HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  };

  function error(message, status) {
    return new Response(message, {
      status,
      headers: {
        ...headers,
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }

  if (!code || !state || !savedState ||
      state !== savedState) {
    return error("OAuth verification failed. Please try again.", 403);
  }

  if (!env.GITHUB_CLIENT_ID ||
      !env.GITHUB_CLIENT_SECRET) {
    return error("OAuth configuration missing.", 500);
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: SITE_ORIGIN + "/api/auth/callback"
        })
      }
    );

    if (!tokenResponse.ok) {
      return error("GitHub authentication failed.", 502);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    if (!token) {
      return error("GitHub did not return an access token.", 401);
    }

    const userResponse = await fetch(
      "https://api.github.com/user",
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "Lookmhee-CMS"
        }
      }
    );

    if (!userResponse.ok) {
      return error("Cannot verify GitHub user.", 403);
    }

    const user = await userResponse.json();

    if (user.login !== OWNER) {
      return error("Access denied: unauthorized account.", 403);
    }

    const payload = {
      token,
      provider: "github"
    };

    const message =
      "authorization:github:success:" +
      JSON.stringify(payload);

    const safeMessage = JSON.stringify(message)
      .replace(/</g, "\\u003c");

    const safeOrigin = JSON.stringify(SITE_ORIGIN);

    const nonce = crypto.randomUUID().replace(/-/g, "");

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Lookmhee CMS Login</title>
</head>
<body>
<p>Completing GitHub login...</p>
<script nonce="${nonce}">
(function () {
  const origin = ${safeOrigin};
  const message = ${safeMessage};

  if (!window.opener) {
    document.body.textContent =
      "Login window not found. Please return to CMS.";
    return;
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.source !== window.opener) return;

    window.opener.postMessage(message, origin);
    window.close();
  });

  window.opener.postMessage("authorizing:github", origin);
})();
</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          `default-src 'none'; script-src 'nonce-${nonce}'; ` +
          "base-uri 'none'; form-action 'none'"
      }
    });

  } catch (err) {
    return error("OAuth service temporarily unavailable.", 502);
  }
}
