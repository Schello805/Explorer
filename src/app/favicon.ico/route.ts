export function GET(request: Request) {
  return Response.redirect(new URL("/icons/platzguide-logo.png", request.url), 307);
}
