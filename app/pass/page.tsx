import { redirect } from "next/navigation";

// My Pass moved into the My page.
export default function Pass() {
  redirect("/me");
}
