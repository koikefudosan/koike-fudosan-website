export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "koike-fudosan-website.pages.dev") {
    url.protocol = "https:";
    url.hostname = "koike-fudousan.com";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
