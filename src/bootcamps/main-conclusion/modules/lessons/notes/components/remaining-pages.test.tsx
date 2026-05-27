import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PremiseSupportCheck } from "./PremiseSupportCheck";
import { RoleSpotlightSequence } from "./RoleSpotlightSequence";
import { TwoPartConclusionCheckMachine } from "./TwoPartConclusionCheckMachine";

describe("remaining intro note interactions", () => {
  it("reveals which sentence is doing the support work on the premises page", () => {
    render(<PremiseSupportCheck />);

    fireEvent.click(
      screen.getByRole("radio", {
        name: /residents now report using those parks more often after dark/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reveal the support/i }));

    expect(screen.getByText(/that sentence is doing the support work/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this is the reason offered for the city's recommendation/i),
    ).toBeInTheDocument();
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
});
