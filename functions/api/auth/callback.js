
const COOKIE_NAME = "lookmhee_oauth_state";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = request.headers.get("Cookie") || "";
  const savedState = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(COOKIE_NAME + "="))
    ?.slice(COOKIE_NAME.length + 1);

  const clearCookie =
    `${COOKIE_NAME}=; Path=/api/auth; HttpOnly; ` +
    `Secure; SameSite=Lax; Max-Age=0`;

  const headers = {
    "Set-Cookie": clearCookie,
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8"
  };

  if (!code || !state || !savedState || state !== savedState) {
    return new Response(
      "OAuth verification failed. Please try again.",
      { status: 403, headers }
    );
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response(
      "OAuth configuration missing.",
      { status: 500, headers }
    );
  }

  const response = await fetch(
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
        code
      })
    }
  );

  if (!response.ok) {
    return new Response(
      "GitHub authentication failed.",
      { status: 502, headers }
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    return new Response(
      "GitHub did not return an access token.",
      { status: 401, headers }
    );
  }

  // ยังไม่ส่ง Token ไปยังหน้า CMS
  // ต้องเพิ่มขั้นตอนตรวจสอบสิทธิ์และส่งผล
  // กลับไปยัง Decap CMS อย่างปลอดภัยก่อน
  return new Response(
    "GitHub OAuth callback verified. " +
    "CMS integration is not enabled yet.",
    { status: 200, headers }
  );
}
