import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useBootcampProgress } from "./useBootcampProgress";
const data=vi.hoisted(() => ({ user: {id:"a"}, item: {id:"assignment-a", metadata:{bootcamp_id:"abstract", instructions:"Keep these", progress:{extra:"keep"}}}, write:vi.fn(async (..._args:unknown[]) => {}) }));
vi.mock("@/contexts/AuthContext", () => ({useAuth: () => ({user:data.user})}));
vi.mock("@tanstack/react-query", () => ({useQuery: () => ({data:data.item})}));
vi.mock("@/lib/classroomItems", () => ({updateClassroomItem: (...args:unknown[]) => data.write(...args)}));
function Test({days,enabled=true}:{days:number[];enabled?:boolean}) {useBootcampProgress({bootcampId:"abstract",completedDays:days,totalDays:7,enabled});return null;}
afterEach(() => {vi.useRealTimers();data.write.mockClear();});
it("waits for hydration, avoids empty resets, preserves metadata and scopes saves by assignment/account", async () => {
 vi.useFakeTimers(); const view=render(<Test days={[]} />); await act(async () => {await vi.advanceTimersByTimeAsync(1100);}); expect(data.write).not.toHaveBeenCalled();
 view.rerender(<Test days={[1]} enabled={false}/>);await act(async () => {await vi.advanceTimersByTimeAsync(1100);});expect(data.write).not.toHaveBeenCalled();
 view.rerender(<Test days={[1]}/>);await act(async () => {await vi.advanceTimersByTimeAsync(1100);});
 expect(data.write).toHaveBeenLastCalledWith("assignment-a",expect.objectContaining({metadata_json:expect.objectContaining({instructions:"Keep these",progress:expect.objectContaining({extra:"keep",completedDays:[1]})})}));
 data.user={id:"b"}; data.item={...data.item,id:"assignment-b"}; view.rerender(<Test days={[1]}/>);await act(async () => {await vi.advanceTimersByTimeAsync(1100);});expect(data.write).toHaveBeenLastCalledWith("assignment-b",expect.anything());
 view.rerender(<Test days={[1,2,3,4,5,6,7,99]}/>);await act(async () => {await vi.advanceTimersByTimeAsync(1100);});expect(data.write).toHaveBeenLastCalledWith("assignment-b",expect.objectContaining({status:"completed",metadata_json:expect.objectContaining({progress:expect.objectContaining({percent:100,completedDays:[1,2,3,4,5,6,7]})})}));
});
