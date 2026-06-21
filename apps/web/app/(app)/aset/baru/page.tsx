import { Eyebrow, H1 } from "@warisly/ui";
import { copy } from "@warisly/lib";
import { AssetForm } from "@/components/AssetForm";

export default function BaruPage() {
  return (
    <div>
      <Eyebrow>{copy.brand}</Eyebrow>
      <H1>{copy.actions.addAsset}</H1>
      <AssetForm />
    </div>
  );
}
