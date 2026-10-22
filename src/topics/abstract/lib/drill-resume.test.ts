import { expect, it } from "vitest";
import { restoreDrillPosition } from "./drill-resume";
it("restores final feedback before retrying a failed module completion",()=>{
 expect(restoreDrillPosition(["one","two"],[{drillId:"one",selectedIndex:2},{drillId:"two",selectedIndex:1}] as any,false)).toEqual({index:1,picked:1});
});
it("starts a completed retake at the beginning without changing saved attempts",()=>{
 const attempts=[{drillId:"one",selectedIndex:2}] as any;
 expect(restoreDrillPosition(["one","two"],attempts,true)).toEqual({index:0,picked:null});
 expect(attempts).toHaveLength(1);
});
