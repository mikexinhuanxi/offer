import assert from "node:assert/strict";
import type { Job } from "./types.js";
import { selectDetailedJobsByCategory } from "./tencentJobCache.js";

function job(id: string, type: string): Job {
  return {
    id,
    company: "腾讯",
    title: `${type}岗位 ${id}`,
    city: "深圳",
    type,
    description: "岗位描述",
    requirements: "岗位要求",
    bonus: "加分项",
    link: "https://join.qq.com",
    deadline: ""
  };
}

const jobs = [
  ...Array.from({ length: 7 }, (_, index) => job(`intern-${index + 1}`, "实习")),
  ...Array.from({ length: 6 }, (_, index) => job(`campus-${index + 1}`, "校招"))
];

const selected = selectDetailedJobsByCategory(jobs);

assert.equal(selected.filter((item) => item.type === "实习").length, 5);
assert.equal(selected.filter((item) => item.type === "校招").length, 5);
assert.deepEqual(
  selected.map((item) => item.id),
  [
    "intern-1",
    "intern-2",
    "intern-3",
    "intern-4",
    "intern-5",
    "campus-1",
    "campus-2",
    "campus-3",
    "campus-4",
    "campus-5"
  ]
);
