import { useSearchParams } from "react-router-dom";
import Profile from "@/pages/Profile";
import SettingsLayout from "@/pages/SettingsLayout";

type AccountSection = "profile" | "layout";

// The Account stage hosts the profile/settings surfaces inside the classroom
// frame, so opening them no longer swaps the user into a different shell.
export default function ClassroomAccountView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section: AccountSection =
    searchParams.get("section") === "layout" ? "layout" : "profile";

  const setSection = (next: AccountSection) => {
    setSearchParams(next === "profile" ? {} : { section: next }, {
      replace: true,
    });
  };

  return (
    <div className="classroom-account">
      <div className="classroom-account-heading">
        <h1 className="classroom-title">Account</h1>
        <div
          className="classroom-account-tabs"
          role="tablist"
          aria-label="Account sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === "profile"}
            className={section === "profile" ? "classroom-account-tab-active" : ""}
            onClick={() => setSection("profile")}
          >
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "layout"}
            className={section === "layout" ? "classroom-account-tab-active" : ""}
            onClick={() => setSection("layout")}
          >
            Customize layout
          </button>
        </div>
      </div>

      <div className="classroom-account-body">
        {section === "profile" ? (
          <Profile embedded />
        ) : (
          <SettingsLayout embedded />
        )}
      </div>
    </div>
  );
}
