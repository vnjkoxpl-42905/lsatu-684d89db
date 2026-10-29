import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppProvider, useApp, moduleCacheKey } from "./AppContext";
const write=vi.hoisted(() => ({ insert:vi.fn(async (..._args:unknown[]) => ({ok:false,error:new Error("save failed")})) }));
const auth=vi.hoisted(() => ({ user: { id: "a" } as {id:string} | null, authReady: true }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/cloudMirror", () => ({ mirroredSetItem: (key:string,value:string) => localStorage.setItem(key,value) }));
vi.mock("../lib/supabase-progress", () => ({ fetchLessonProgress: async (id:string) => id === "a" ? [{lessonId:"why_hard"}] : [], fetchDrillAttempts: async () => [], fetchGauntletAttempts: async () => [], fetchTranslatorAttempts: async () => [], fetchLatestFinalSetScore: async () => null, insertDrillAttempt: (...args:unknown[]) => write.insert(...args), isSessionDeadError: () => false }));
let value: ReturnType<typeof useApp>;
function Read() { value=useApp(); return null; }
beforeEach(() => {localStorage.clear(); auth.user={id:"a"};});
it("ignores legacy global cache and resets module state between accounts", async () => {
 localStorage.setItem("lsatu_abstract_v3_modules", JSON.stringify({ moduleProgress:{m7:{drillComplete:true}}, xpTotal:999 }));
 const view=render(<AppProvider><Read/></AppProvider>);
 await waitFor(() => expect(value.loading).toBe(false));
 expect(value.bootcampState.xpTotal).toBe(0); expect(value.bootcampState.moduleProgress.m1.noteComplete).toBe(true);
 auth.user={id:"b"}; view.rerender(<AppProvider><Read/></AppProvider>);
 await waitFor(() => { expect(value.progressOwnerId).toBe("b"); expect(value.loading).toBe(false); });
 expect(value.bootcampState.completedLessons).toEqual([]); expect(value.bootcampState.moduleProgress.m1.noteComplete).toBe(false);
 expect(moduleCacheKey("a")).not.toBe(moduleCacheKey("b")); expect(moduleCacheKey(null)).not.toBe(moduleCacheKey("b"));
});

it("does not record a graded question in completion until its backend write succeeds", async () => {
 render(<AppProvider><Read/></AppProvider>); await waitFor(() => expect(value.loading).toBe(false));
 await act(async () => { const result=await value.markDrillComplete("source_pt103_s1_q18", "method", true); expect(result.ok).toBe(false); });
 expect(value.bootcampState.completedDrills).not.toContain("source_pt103_s1_q18"); expect(value.bootcampState.drillAttempts).toEqual([]);
});
