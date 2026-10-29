import { describe, expect, it } from "vitest";
import { readCoachRequest } from "../../supabase/functions/activity-coach/request";
const valid = { contractVersion: 1, requestId: "333838aa-cc3b-4789-a707-b8f50f918c25", sourceKind: "assignment", sourceId: "12251bd3-d260-4108-bc35-bcf478e483e6", itemOrder: 1, studentResponse: "conditional", attemptNo: 1 };
describe("source-bound coach request", () => {
  it("accepts identity and answer data only", () => expect(readCoachRequest(JSON.stringify(valid))).toEqual(valid));
  it.each(["creditedAnswers", "statement", "coach", "explanation", "ideas", "ownerId"])("rejects client authority %s", key => expect(readCoachRequest(JSON.stringify({ ...valid, [key]: "forged" }))).toBeNull());
  it.each([{ contractVersion: 0 }, { requestId: "bad" }, { sourceKind: "owned" }, { sourceId: "bad" }, { itemOrder: 0 }, { attemptNo: 3 }, { studentResponse: " " }, { studentResponse: "x".repeat(10001) }])("rejects invalid input %j", change => expect(readCoachRequest(JSON.stringify({ ...valid, ...change }))).toBeNull());
  it("rejects invalid JSON", () => expect(readCoachRequest("{" )).toBeNull());
  it("bounds UTF8 body size", () => expect(readCoachRequest(JSON.stringify({ ...valid, studentResponse: "x".repeat(70000) }))).toBeNull());
});
