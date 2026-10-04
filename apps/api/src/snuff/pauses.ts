import type { Slice } from "./slice";

// Placeholder. Owned by the pauses subagent.
export const pauses: Slice = {
  name: "pauses",
  async setup() {},
  async reset() {},
  async read() {
    return {};
  },
  actions: {},
};
