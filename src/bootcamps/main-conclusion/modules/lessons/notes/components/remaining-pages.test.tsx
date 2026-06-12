import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";

import { PremiseSupportCheck } from "./PremiseSupportCheck";
import { RoleSpotlightSequence } from "./RoleSpotlightSequence";
import { TwoPartConclusionCheckMachine } from "./TwoPartConclusionCheckMachine";
import { IntroLessonPage } from "../IntroLessonPage";

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe("remaining intro note interactions", () => {
  it("reveals which sentence is doing the support work on the premises page", () => {
    render(<PremiseSupportCheck />);

    fireEvent.click(
      screen.getByRole("radio", {
        name: /residents now report using those lit parks more often after dark/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reveal the support/i }));

    expect(screen.getByText(/that sentence is doing the support work/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this is the reason offered for the recommendation/i),
    ).toBeInTheDocument();
  });

  it("renders the premises page as one integrated teaching system with are and are-not summaries", () => {
    window.scrollTo = () => {};

    render(
      <MemoryRouter initialEntries={["/bootcamp/intro-to-lr/lessons/notes/premises"]}>
        <IntroLessonPage pageId="premises" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/the facts\. the evidence\. accept them as true\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/not questionable\. don't depend on the conclusion\. don't depend on each other\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/premise-indicator lab/i)).toBeInTheDocument();
    expect(screen.getAllByText(/the park is flooded/i).length).toBeGreaterThan(0);
  });

  it("walks students through separating background, other views, the turn, and the author's point", () => {
    render(<RoleSpotlightSequence />);

    expect(screen.getByText(/first, find the background sentence/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /therefore, independent bookstores can remain valuable/i,
      }),
    );

    expect(screen.getByText(/that one is the author's point, not the setup/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /large online retailers often sell books at lower prices/i,
      }),
    );
    expect(screen.getByText(/now find the sentence that gives someone else's view/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /it is often assumed that local bookstores cannot compete/i,
      }),
    );
    expect(screen.getByText(/now find the sentence where the author turns/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /but local bookstores host community events/i,
      }),
    );
    expect(screen.getByText(/last step: find the author's conclusion/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /therefore, independent bookstores can remain valuable/i,
      }),
    );

    expect(
      screen.getByText(/you separated the author's argument from everything around it/i),
    ).toBeInTheDocument();
  });

  it("confirms when a claim passes both parts of the conclusion check", () => {
    render(<TwoPartConclusionCheckMachine />);

    fireEvent.click(screen.getByRole("button", { name: /claim b/i }));
    fireEvent.click(screen.getByRole("radio", { name: /question 1 yes/i }));
    fireEvent.click(screen.getByRole("radio", { name: /question 2 yes/i }));
    fireEvent.click(screen.getByRole("button", { name: /check this claim/i }));

    expect(screen.getByText(/claim b passes both questions/i)).toBeInTheDocument();
    expect(screen.getByText(/that makes claim b the main conclusion/i)).toBeInTheDocument();
  });

  it("corrects a bad read when a claim fails the two-part check", () => {
    render(<TwoPartConclusionCheckMachine />);

    fireEvent.click(screen.getByRole("button", { name: /claim a/i }));
    fireEvent.click(screen.getByRole("radio", { name: /question 1 yes/i }));
    fireEvent.click(screen.getByRole("radio", { name: /question 2 yes/i }));
    fireEvent.click(screen.getByRole("button", { name: /check this claim/i }));

    expect(screen.getByText(/claim a does not pass the check/i)).toBeInTheDocument();
    expect(screen.getByText(/it belongs to some paleontologists, not to the author/i)).toBeInTheDocument();
  });

  it("renders interactive applied examples on the beyond-premises page", () => {
    window.scrollTo = () => {};

    render(
      <MemoryRouter initialEntries={["/bootcamp/intro-to-lr/lessons/notes/beyond-premises-and-conclusions"]}>
        <IntroLessonPage pageId="beyond-premises-and-conclusions" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/a compact guide to background, opposing viewpoint, concession, and pivot\./i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Background" })).toBeInTheDocument();
    expect(screen.getByText(/although vegetarian diets require careful planning, they can still provide complete nutrition\./i)).toBeInTheDocument();
  });

  it("uses student-facing hero copy for the conclusion placement lesson", () => {
    window.scrollTo = () => {};

    render(
      <MemoryRouter initialEntries={["/bootcamp/intro-to-lr/lessons/notes/first-sentence-vs-rebuttal-structures"]}>
        <IntroLessonPage pageId="first-sentence-vs-rebuttal-structures" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/the main conclusion usually appears in one of two places\./i)).toBeInTheDocument();
    expect(screen.getAllByText("Place")).toHaveLength(2);
    expect(screen.getAllByText("1")).toHaveLength(1);
    expect(screen.getAllByText("2")).toHaveLength(1);
    expect(screen.queryByText(/learn the read before you touch the lab\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/then carry that pattern into the lab\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/learn the two most common places the main conclusion appears\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/read the pattern/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/but \/ yet \/ however/i)).not.toBeInTheDocument();
    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    expect(screen.getByText(/first check whether the author states the point up front or turns into it later\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/conclusion first/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/turn later/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/if the opening sounds like a setup or someone else's view, wait for the turn\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lesson notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^read 1$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^read 2$/i)).not.toBeInTheDocument();
  });
});
