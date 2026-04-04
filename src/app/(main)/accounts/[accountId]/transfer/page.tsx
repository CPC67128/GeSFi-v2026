import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { TransferForm, type AccountSection } from "./transfer-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function TransferPage({ params }: Props) {
  const { accountId } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const userFirstName = (session!.user.name ?? "").split(" ")[0] || "Moi";
  const t = await getTranslations("TransferPage");

  // Find partner (first other user in the system)
  const partner = await prisma.bf_user.findFirst({
    where: { user_id: { not: userId } },
    select: { user_id: true, name: true },
  });
  const partnerFirstName = partner ? (partner.name ?? "").split(" ")[0] || "Partenaire" : null;

  // Sort preferences
  const [userPrefs, partnerPrefs] = await Promise.all([
    prisma.bf_account_user_preference.findMany({ where: { user_id: userId } }),
    partner
      ? prisma.bf_account_user_preference.findMany({ where: { user_id: partner.user_id } })
      : Promise.resolve([]),
  ]);
  const userSort = new Map(userPrefs.map((p) => [p.account_id, p.sort_order]));
  const partnerSort = new Map(partnerPrefs.map((p) => [p.account_id, p.sort_order]));

  // Fetch all relevant accounts
  const raw = await prisma.bf_account.findMany({
    where: { type: { in: [1, 3] }, marked_as_closed: false },
    select: { account_id: true, name: true, type: true, owner_user_id: true, CALC_balance: true },
  });

  function sorted<T extends { account_id: string }>(list: T[], map: Map<string, number>) {
    return [...list].sort((a, b) => (map.get(a.account_id) ?? 999) - (map.get(b.account_id) ?? 999));
  }

  const duoAccounts = sorted(raw.filter((a) => a.type === 3), userSort);
  const userAccounts = sorted(raw.filter((a) => a.type === 1 && a.owner_user_id === userId), userSort);
  const partnerAccounts = partner
    ? sorted(raw.filter((a) => a.type === 1 && a.owner_user_id === partner.user_id), partnerSort)
    : [];

  const sections: AccountSection[] = [
    {
      label: "Comptes Duo",
      options: duoAccounts.map((a) => ({
        account_id: a.account_id,
        name: a.name,
        CALC_balance: Number(a.CALC_balance),
        virtual: false,
      })),
    },
    {
      label: userFirstName,
      options: [
        {
          account_id: "__unknown_user__",
          name: `${userFirstName} / Compte inconnu`,
          CALC_balance: 0,
          virtual: true,
        },
        ...userAccounts.map((a) => ({
          account_id: a.account_id,
          name: a.name,
          CALC_balance: Number(a.CALC_balance),
          virtual: false,
        })),
      ],
    },
    ...(partnerFirstName
      ? [
          {
            label: partnerFirstName,
            options: [
              {
                account_id: "__unknown_partner__",
                name: `${partnerFirstName} / Compte inconnu`,
                CALC_balance: 0,
                virtual: true,
              },
              ...partnerAccounts.map((a) => ({
                account_id: a.account_id,
                name: a.name,
                CALC_balance: Number(a.CALC_balance),
                virtual: false,
              })),
            ],
          },
        ]
      : []),
  ];

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

      <TransferForm accountId={accountId} sections={sections} />
    </div>
  );
}
