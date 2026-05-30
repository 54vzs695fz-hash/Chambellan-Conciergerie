import "./planner-luxury.css";
import "./planner-admin.css";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="lux-planner-root">{children}</div>;
}
