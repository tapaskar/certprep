import {
  AWSWordmark,
  AzureWordmark,
  GoogleCloudWordmark,
  CompTIAWordmark,
  NvidiaWordmark,
  RedHatWordmark,
} from "./provider-wordmarks";

/**
 * "We cover certifications from these providers" strip.
 * Lives directly under the hero so visitors instantly see scope.
 */
export function ProviderTrustStrip() {
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="text-center mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
            Cert prep for
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-14">
          <AWSWordmark />
          <AzureWordmark />
          <GoogleCloudWordmark />
          <CompTIAWordmark />
          <NvidiaWordmark />
          <RedHatWordmark />
        </div>
      </div>
    </section>
  );
}
