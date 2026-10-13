import { useSearchParams } from "react-router-dom";
import ProfileSection from "@/components/classroom/account/ProfileSection";
import RailLayoutEditor from "@/components/classroom/account/RailLayoutEditor";

type AccountSection = "profile" | "layout";

// The Account stage: native classroom surfaces for identity/preferences and
// sidebar layout. Both are built on classroom tokens — the old standalone
// /profile and /settings/layout pages are gone.
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
        {section === "profile" ? <ProfileSection /> : <RailLayoutEditor />}
      </div>
    </div>
  );
}
