import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import { useClassroomHome } from "./useClassroomHome";
import ClassroomHomeView from "./ClassroomHomeView";
import "./home.css";

/**
 * Classroom Home. Reads the student's own record and renders the dashboard;
 * every route it opens already exists in the rail, so this page is a shortcut
 * into the classroom rather than a second navigation.
 */
export default function ClassroomHome() {
  const navigate = useNavigate();
  const { openSection } = useClassroomLayout();
  const { model, loading, markDone, clearMessage, completingKey } = useClassroomHome();

  return (
    <ClassroomHomeView
      model={model}
      loading={loading}
      onOpen={(route) => navigate(route)}
      onSeeAllWork={() => openSection("work")}
      onMarkDone={markDone}
      onClearMessage={async (conversationId) => {
        try {
          await clearMessage(conversationId);
        } catch {
          toast.error("Could not clear that message. Try again.");
        }
      }}
      completingKey={completingKey}
    />
  );
}
