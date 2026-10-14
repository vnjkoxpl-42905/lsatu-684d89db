import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ModuleDrill } from "./ModuleView";
import { DRILLS } from "../../data/drills";
import { getModule } from "../../data/modules";
const state = vi.hoisted(() => ({ loading: false, progressOwnerId: "qa", bootcampState: { drillAttempts: [] as any[], moduleProgress: {} as any }, markDrillComplete: vi.fn(), markModuleDrillComplete: vi.fn(), addXp: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: {id:"qa"} }) }));
vi.mock("../../store/AppContext", () => ({useApp:()=>state}));
beforeEach(()=>{
  state.loading=false; state.bootcampState={drillAttempts:[],moduleProgress:{}};
  state.markDrillComplete.mockReset(); state.addXp.mockReset();
  state.markDrillComplete.mockImplementation(async (drillId,drillType,correct,selectedIndex)=>{state.bootcampState.drillAttempts.push({drillId,drillType,correct,selectedIndex,completedAt:new Date().toISOString()}); return {ok:true};});
});
it("resumes question two after a saved question one and remount without resubmitting the first",async()=>{
  const ids=getModule("m1")!.drillIds;
  const first=DRILLS.find(d=>d.id===ids[0])!;
  const view=render(<ModuleDrill moduleId="m1" onDone={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:first.options[first.correctOptionIndex].text}));
  await waitFor(()=>expect(screen.getByRole("button",{name:/Next question/})).toBeEnabled());
  view.unmount();
  render(<ModuleDrill moduleId="m1" onDone={vi.fn()}/>);
  expect(screen.getByText(`Question 2 of ${ids.length}`)).toBeInTheDocument();
  expect(state.markDrillComplete).toHaveBeenCalledTimes(1);
});
it("waits for account hydration before choosing a resume position",()=>{
  state.loading=true;
  const view=render(<ModuleDrill moduleId="m1" onDone={vi.fn()}/>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your saved practice");
  state.bootcampState.drillAttempts=[{drillId:getModule("m1")!.drillIds[0], selectedIndex:0}]; state.loading=false;
  view.rerender(<ModuleDrill moduleId="m1" onDone={vi.fn()}/>);
  expect(screen.getByText(/Question 2 of/)).toBeInTheDocument();
});
it("does not advance or award XP for an unsaved answer",async()=>{
  state.markDrillComplete.mockResolvedValue({ok:false});
  const first=DRILLS.find(d=>d.id===getModule("m1")!.drillIds[0])!;
  render(<ModuleDrill moduleId="m1" onDone={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:first.options[first.correctOptionIndex].text}));
  await screen.findByRole("alert");
  expect(screen.getByRole("button",{name:/Next question/})).toBeDisabled();
  expect(state.addXp).not.toHaveBeenCalled();
});
