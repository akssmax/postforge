import { redirect } from "next/navigation";
import { createDesignId } from "@/lib/design/ids";

export default function ToolRoute() {
  redirect(`/design/${createDesignId()}`);
}
