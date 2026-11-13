import { ConnectorsPage } from "@/components/dashboard/ConnectorsPage";

// The authenticated workspace shell renders this route after loading the signed-in user.
export const instant = false;

export default function ConnectorsRoute() {
  return <ConnectorsPage />;
}
