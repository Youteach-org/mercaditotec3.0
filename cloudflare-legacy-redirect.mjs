export default {
  async fetch(request) {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "mercaditotec3-0.youteach-tk.workers.dev";
    target.port = "";
    return Response.redirect(target.toString(), 308);
  },
};
