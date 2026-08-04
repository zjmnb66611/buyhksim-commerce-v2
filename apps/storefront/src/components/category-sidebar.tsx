"use client";
import { AirplaneTilt, CaretRight, DeviceMobile, GlobeHemisphereEast, Headset, Question, SimCard } from "@phosphor-icons/react";
import { useTranslations } from "@/hooks/use-translations";

const regions = ["热门目的地", "亚洲", "欧洲", "北美洲", "大洋洲", "中东与非洲"];
export function CategorySidebar({ onCategory }: { onCategory: (value: string) => void }) {
  const { t } = useTranslations();
  return <aside className="hidden w-[238px] shrink-0 lg:block">
    <div className="surface overflow-hidden rounded-xl">
      <h2 className="border-b border-[var(--line)] px-4 py-3 text-sm font-bold">{t("按目的地 / 卡类型")}</h2>
      <div className="py-1">{regions.map((region, index) => <button key={region} onClick={() => onCategory(region)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[var(--forest-wash)] hover:text-[var(--forest)]">{index === 0 ? <AirplaneTilt size={17} weight="fill" className="text-orange-500" /> : <GlobeHemisphereEast size={17} />}<span className="flex-1">{t(region)}</span><CaretRight size={14} /></button>)}</div>
      <div className="border-t border-[var(--line)] py-1">
        <button onClick={() => onCategory("ESIM")} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--forest-wash)]"><DeviceMobile size={18} />eSIM<CaretRight className="ml-auto" size={14} /></button>
        <button onClick={() => onCategory("PHYSICAL_SIM")} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--forest-wash)]"><SimCard size={18} />{t("实体卡 (SIM)")}<CaretRight className="ml-auto" size={14} /></button>
      </div>
    </div>
    <div className="surface mt-4 rounded-xl p-4">
      <h2 className="mb-3 text-sm font-bold">{t("新手购买指南")}</h2>
      <ul className="space-y-3 text-sm quiet"><li className="flex gap-2"><DeviceMobile size={17} />{t("如何选择套餐")}</li><li className="flex gap-2"><SimCard size={17} />{t("激活与使用说明")}</li><li className="flex gap-2"><Question size={17} />{t("设备兼容性查询")}</li><li className="flex gap-2"><Headset size={17} />{t("常见问题解答")}</li></ul>
      <a href="#support" className="mt-4 inline-block text-sm font-semibold text-[var(--forest)]">{t("查看全部指南 →")}</a>
    </div>
  </aside>;
}
