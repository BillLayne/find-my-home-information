export const onRequestGet: PagesFunction = async () => {
  return Response.json({ ok: true, service: "find-my-home-information" }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
};

