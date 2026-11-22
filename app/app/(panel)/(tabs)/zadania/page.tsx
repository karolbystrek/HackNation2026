import { redirect } from "next/navigation";

// The task list now lives inside the timeline on /plan; keep old links working.
export default function Tasks() {
  redirect("/plan");
}
