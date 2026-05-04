export function GET() {
  return new Response("This route has been removed.", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
