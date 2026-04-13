import { cn } from '@/lib/utils';

interface ItemSlotProps {
  url?: string;
  count?: number;
  empty?: boolean;
  large?: boolean;
  className?: string;
  imgClassName?: string;
}

export const ItemSlot = ({ url, count, empty, large, className, imgClassName }: ItemSlotProps) => (
  <div className={cn(
    "bg-black-bg border rounded-lg flex items-center justify-center relative overflow-hidden",
    large ? "w-14 h-14 sm:w-20 sm:h-20" : "w-10 h-10 sm:w-14 sm:h-14",
    empty ? "border-black-border bg-black-bg/50" : "border-black-border bg-black-bg shadow-inner",
    className
  )}>
    {url && <img src={url} alt="item" className={cn("object-contain drop-shadow-md", large ? "w-12 h-12 sm:w-[4.5rem] sm:h-[4.5rem]" : "w-9 h-9 sm:w-12 sm:h-12", imgClassName)} />}
    {count && count > 1 && (
      <span className="absolute bottom-0 right-0 text-[10px] font-black bg-black text-white px-1.5 rounded-tl">
        {count}
      </span>
    )}
  </div>
);

interface EquipmentGridProps {
  eq: { slot: string, url: string }[];
}

export const EquipmentGrid = ({ eq }: EquipmentGridProps) => {
  // Check if eq is available, otherwise use empty array
  const equipment = eq || [];
  // Slots in order from mapEquipmentToArray: 
  // 0:Bag, 1:Head, 2:Cape, 3:MainHand, 4:Armor, 5:OffHand, 6:Potion, 7:Shoes, 8:Food, 9:Mount
  const getItem = (idx: number) => equipment[idx]?.url;
  
  const mainHandUrl = getItem(3);
  const is2H = mainHandUrl && mainHandUrl.includes('_2H_');
  const offHandUrl = is2H ? mainHandUrl : getItem(5);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot url={getItem(0)} empty={!getItem(0)} large /> {/* Bag */}
        <ItemSlot url={getItem(3)} empty={!getItem(3)} large /> {/* Weapon */}
        <ItemSlot url={getItem(6)} empty={!getItem(6)} large /> {/* Potion */}
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot url={getItem(1)} empty={!getItem(1)} large /> {/* Head */}
        <ItemSlot url={getItem(4)} empty={!getItem(4)} large /> {/* Armor */}
        <ItemSlot url={getItem(7)} empty={!getItem(7)} large /> {/* Shoes */}
        <ItemSlot url={getItem(9)} empty={!getItem(9)} large /> {/* Mount */}
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot url={getItem(2)} empty={!getItem(2)} large /> {/* Cape */}
        <ItemSlot 
          url={offHandUrl} 
          empty={!is2H && !getItem(5)} 
          large 
          imgClassName={is2H ? "opacity-30" : ""} 
        /> {/* Offhand */}
        <ItemSlot url={getItem(8)} empty={!getItem(8)} large /> {/* Food */}
      </div>
    </div>
  );
};
