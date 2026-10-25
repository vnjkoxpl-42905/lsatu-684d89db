import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";

const RECENT_DAYS = 30;

export function AnnouncementBannerView({
  announcement,
  onOpen,
}: {
  announcement: Pick<ClassroomItem, "id" | "title" | "description" | "created_at"> | null;
  onOpen: (id: string) => void;
}) {
  if (!announcement) return null;
  const posted = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
  }).format(new Date(announcement.created_at));

  return (
    <button
      type="button"
      className="classroom-announcement"
      onClick={() => onOpen(announcement.id)}
    >
      <span className="classroom-announcement-icon">
        <Megaphone size={16} />
      </span>
      <span className="classroom-announcement-text">
        <span className="classroom-announcement-title">{announcement.title}</span>
        {announcement.description ? (
          <span className="classroom-announcement-body">{announcement.description}</span>
        ) : null}
      </span>
      <time className="classroom-announcement-date">{posted}</time>
    </button>
  );
}

/**
 * The one platform-update slot on the homepage. Reads the newest live
 * announcement posted through the teacher tools (classroom_items of type
 * 'announcement'); renders nothing at all when there isn't one, so the page
 * never carries an empty shell.
 */
export default function AnnouncementBanner() {
  const navigate = useNavigate();
  const itemsQuery = useClassroomItems();

  const announcement = React.useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
    return (
      (itemsQuery.data ?? [])
        .filter(
          (item) =>
            item.type === "announcement" &&
            item.status !== "archived" &&
            item.status !== "draft" &&
            new Date(item.created_at).getTime() >= cutoff,
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0] ?? null
    );
  }, [itemsQuery.data]);

  if (itemsQuery.error) return null;

  return (
    <AnnouncementBannerView
      announcement={announcement}
      onOpen={(id) => navigate(`/classroom/item/${encodeURIComponent(id)}`)}
    />
  );
}
