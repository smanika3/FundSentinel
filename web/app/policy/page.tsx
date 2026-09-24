import PolicyScreen from "@/components/screens/PolicyScreen";
import { getPolicy } from "@/lib/policy";

export default function PolicyPage() {
  return <PolicyScreen policy={getPolicy()} />;
}
