
const CALLBACK_URL =
  "https://lookmhee-blog.pages.dev/api/auth/callback";

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("OAuth configuration missing", {
      status: 500
    });
  }

  const state = crypto.randomUUID();
  const secure = request.url.startsWith("https://");

  const cookie = [
    `lookmhee_oauth_state=${state}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/api/auth",
    "Max-Age=600"
  ].join("; ");

  const url = new URL(
    "https://github.com/login/oauth/authorize"
  );

  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", CALLBACK_URL);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "repo");

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookie,
      "Cache-Control": "no-store"
    }
  });
}
