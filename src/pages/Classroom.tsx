import OrientationCard from "@/components/classroom/OrientationCard";
import AnnouncementBanner from "@/components/classroom/AnnouncementBanner";
import ClassroomHome from "@/components/classroom/home/ClassroomHome";

/**
 * The classroom home: the student dashboard.
 *
 * One screen that answers, in order, what to do now, what is assigned, whether
 * the coach said anything, when the next session is, and what the week holds.
 * `ClassroomHome` owns all of that; the two cards above it are gates rather
 * than content — orientation runs once for a new student and renders nothing
 * afterwards, and the announcement strip renders nothing unless one is posted.
 */
export default function Classroom() {
  return (
    <>
      <OrientationCard />
      <AnnouncementBanner />
      <ClassroomHome />
    </>
  );
}
