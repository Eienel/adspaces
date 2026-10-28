import { CreateAdForm } from "@/components/create-ad-form";
import { SignInLink } from "@/components/user-menu";
import { currentUserId } from "@/lib/session";

export default async function NewAd() {
  if (!(await currentUserId())) return <div className="panel text-center"><SignInLink next="/business/ads/new" /></div>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post an ad</h1>
        <p className="text-sm muted">Your ad goes on the public ad board. Creators with a matching slot within your budget can offer it; you pick who to accept.</p>
      </div>
      <div className="panel">
        <CreateAdForm />
      </div>
    </div>
  );
}
