// @ts-check
import { test, expect } from "@playwright/test";
import { parseAttributeValue } from "../src/props.js";

test("Parseo de diferentes tipos", () => {
  expect(parseAttributeValue("123e5")).toBe(12300000);
  expect(parseAttributeValue('{"a":1}')).toEqual({ a: 1 });
  expect(parseAttributeValue("[1,2]")).toEqual([1, 2]);
  expect(parseAttributeValue("simple")).toBe("simple");
  expect(parseAttributeValue("true")).toBe(true);
});
