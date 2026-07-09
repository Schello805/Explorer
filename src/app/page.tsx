import { ConsentBanner } from "@/components/consent-banner";
import { ExplorerApp } from "@/components/explorer-app";
import { Footer } from "@/components/footer";
import { PwaRegister } from "@/components/pwa-register";
import { getTenant } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await getTenant();
  return <>
    <PwaRegister />
    <ExplorerApp tenant={tenant} />
    <Footer tenant={tenant} />
    <ConsentBanner />
  </>;
}
