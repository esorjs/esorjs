import { createFilter } from "rollup/pluginutils";

export default function esorPlugin(options = {}) {
  const filter = createFilter(options.include || ["**/*.js"], options.exclude);
  const isProduction = process.env.NODE_ENV === "production";

  return {
    name: "vite-plugin-esor",
    async transform(code, id) {
      if (!filter(id)) return null;

      let transformed = code;
      let map = null;

      if (isProduction) {
        const result = await minify(code, { sourceMap: { filename: id } });
        transformed = result.code;
        map = result.map;
      }

      return { code: transformed, map };
    },
  };
}
