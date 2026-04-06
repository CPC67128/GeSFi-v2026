import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { ValorisationForm } from "./valorisation-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function ValorisationPage({ params }: Props) {
  const { accountId } = await params;
  await auth();
  const t = await getTranslations("ValorisationPage");

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/${accountId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{t("title")}</h2>
      </div>

      <ValorisationForm placementAccountId={accountId} />
    </div>
  );
}
