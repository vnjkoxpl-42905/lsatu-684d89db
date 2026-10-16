// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReadingCenterHome from "./ReadingCenterHome";
import { RC_HOME_PATH, RC_LIBRARY_PATH, RC_RRC_PATH, rcReaderPath } from "../lib/routes";

const permissions = vi.hoisted(() => ({ is_admin: false }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));

let node: HTMLDivElement;
let root: Root;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  permissions.is_admin = false;
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); });

function renderHub() {
  act(() => root.render(
    <MemoryRouter initialEntries={[RC_HOME_PATH]}>
      <Routes>
        <Route path={RC_HOME_PATH} element={<ReadingCenterHome />} />
        <Route path={RC_RRC_PATH} element={<h1>RRC collection</h1>} />
        <Route path={RC_LIBRARY_PATH} element={<h1>Speed Reading collection</h1>} />
      </Routes>
    </MemoryRouter>,
  ));
}

describe("Reading Center activity hub", () => {
  it.each([
    ["Open RRC", "RRC collection"],
    ["Open Speed Reading", "Speed Reading collection"],
  ])("opens the independent activity through %s", (label, destination) => {
    renderHub();
    const link = [...node.querySelectorAll("a")].find((a) => a.textContent === label)!;
    act(() => link.click());
    expect(node.querySelector("h1")?.textContent).toBe(destination);
  });

  it("keeps the hub free of Speed Reading library controls and gives students a home link", () => {
    renderHub();
    expect(node.querySelectorAll("section")).toHaveLength(2);
    expect(node.querySelector('a[href="/classroom"]')?.textContent).toContain("LSAT U Home");
    expect(node.querySelector("input")).toBeNull();
    expect(node.textContent).not.toContain("Add Text");
    expect(rcReaderPath("my passage")).toBe("/reading-center/read/my%20passage");
  });

  it("gives teachers a workspace return link", () => {
    permissions.is_admin = true;
    renderHub();
    expect(node.querySelector('a[href="/teacher/tools"]')?.textContent).toContain("Teacher Workspace");
  });
});
